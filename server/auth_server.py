"""YouWith: authenticated static files and account sessions, standard library only."""
import argparse
import getpass
import hashlib
import hmac
import json
import re
import secrets
import sqlite3
import time
import sys
from urllib.error import URLError
from contextlib import contextmanager
from http import cookies
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit, parse_qs, urlencode, quote

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "server"))
from kakao_login import KakaoConfig, fetch_identity
import blog
SESSION_SECONDS = 12 * 3600
ITERATIONS = 600_000
PUBLIC = {"/login.html", "/login.js", "/login.css", "/assets/clover.png"}


@contextmanager
def connect(path):
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    try:
        with db:
            yield db
    finally:
        db.close()


def initialize(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with connect(path) as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL,
                salt TEXT NOT NULL, password_hash TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS oauth_states (
                state_hash TEXT PRIMARY KEY, expires REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS attempts (
                key TEXT PRIMARY KEY, failures INTEGER NOT NULL, expires REAL NOT NULL);
        """)
        columns = {row["name"] for row in db.execute("PRAGMA table_info(users)")}
        if "kakao_id" not in columns:
            db.execute("ALTER TABLE users ADD COLUMN kakao_id TEXT")
        if "approved" not in columns:
            db.execute("ALTER TABLE users ADD COLUMN approved INTEGER NOT NULL DEFAULT 1")
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS users_kakao_id ON users(kakao_id)")
        if "role" not in columns:
            db.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member'")
            # Migrate only the already existing operator-issued admin account, once.
            db.execute("UPDATE users SET role='admin' WHERE username='admin' AND kakao_id IS NULL")
        blog.initialize(db)


def set_approval(path, member_id, approved):
    with connect(path) as db:
        result = db.execute("UPDATE users SET approved = ? WHERE id = ?", (int(approved), member_id))
        if not result.rowcount:
            raise ValueError("회원 ID를 확인해주세요.")
        if not approved:
            db.execute("DELETE FROM sessions WHERE user_id = ?", (member_id,))


def password_hash(password, salt):
    return hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), ITERATIONS).hex()


def create_user(path, username, password):
    if not re.fullmatch(r"[\w.-]{2,40}", username, flags=re.UNICODE):
        raise ValueError("아이디는 2~40자의 한글·영문·숫자·밑줄·점·하이픈만 사용할 수 있어요.")
    if not 12 <= len(password) <= 256:
        raise ValueError("비밀번호는 12~256자로 입력해주세요.")
    salt = secrets.token_hex(16)
    with connect(path) as db:
        db.execute("INSERT INTO users (id, username, salt, password_hash) VALUES (?, ?, ?, ?)",
                   (secrets.token_hex(16), username, salt, password_hash(password, salt)))


class AuthServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, database, frontend, secure_cookie=False, kakao=None, notice_data=None):
        self.database = database
        self.frontend = Path(frontend).resolve()
        self.notice_data = Path(notice_data) if notice_data else self.frontend.parent / "db" / "notice-refresh.json"
        self.secure_cookie = secure_cookie
        self.kakao = kakao or KakaoConfig()
        initialize(database)
        super().__init__(address, Handler)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(args[2].frontend), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("X-Frame-Options", "DENY")
        super().end_headers()

    def respond(self, status, data, cookie=None):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.end_headers()
        self.wfile.write(body)

    def session(self):
        jar = cookies.SimpleCookie()
        try:
            jar.load(self.headers.get("Cookie", ""))
            token = jar["youwith_session"].value
        except (cookies.CookieError, KeyError):
            return None
        if not re.fullmatch(r"[a-zA-Z0-9_-]{43}", token):
            return None
        with connect(self.server.database) as db:
            return db.execute("""SELECT users.id, users.username, users.role FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE token_hash = ? AND expires > ? AND users.approved = 1""",
                (hashlib.sha256(token.encode()).hexdigest(), time.time())).fetchone()

    def do_HEAD(self):
        self.get(head=True)

    def do_GET(self):
        self.get()

    def get(self, head=False):
        path = urlsplit(self.path).path
        if path in {"/auth/kakao", "/auth/kakao/callback"}:
            if head:
                self.send_error(405)
                return
            self.kakao_route(path)
            return
        if path == "/api/auth-config":
            self.respond(200, {"kakao": self.server.kakao.ready})
            return
        member = self.session()
        if path == "/api/me":
            if head:
                self.send_error(405)
                return
            self.respond(200 if member else 401, dict(member) if member else {"error": "로그인이 필요해요."})
            return
        if path.startswith("/api/blog"):
            if not member:
                self.respond(401, {"error":"로그인이 필요해요."})
                return
            if head:
                self.send_error(405)
                return
            file_match=re.fullmatch(r"/api/blog/attachments/([a-f0-9]{32})",path)
            if file_match:
                try:
                    with connect(self.server.database) as db:row=blog.attachment(db,file_match[1])
                    self.send_response(200)
                    self.send_header("Content-Type","application/octet-stream")
                    self.send_header("Content-Length",str(row["size"]))
                    self.send_header("Content-Disposition","attachment; filename=download; filename*=UTF-8''"+quote(row["filename"],safe=""))
                    self.end_headers()
                    self.wfile.write(row["data"])
                except blog.BlogError as error:self.respond(error.status,{"error":str(error)})
                return
            try:
                with connect(self.server.database) as db:
                    result=blog.read(db,member,path,parse_qs(urlsplit(self.path).query))
                self.respond(200,result)
            except blog.BlogError as error:
                self.respond(error.status,{"error":str(error)})
            except sqlite3.Error:
                self.respond(500,{"error":"글을 불러오지 못했어요. 잠시 뒤 다시 시도해주세요."})
            return
        if path == "/api/notices":
            if not member:
                self.respond(401, {"error":"로그인이 필요해요."})
                return
            if head:
                self.send_error(405)
                return
            # A local snapshot only: visitors never trigger remote collection.
            for snapshot in (self.server.notice_data, self.server.frontend / "notices.json"):
                try:
                    data = json.loads(snapshot.read_text(encoding="utf-8"))
                    if not isinstance(data, dict) or not isinstance(data.get("sources"), list) or len(data["sources"]) < 12:
                        continue
                    if not all(isinstance(source, dict) and isinstance(source.get("notices"), list) for source in data["sources"]):
                        continue
                    self.respond(200, data)
                    return
                except (OSError, ValueError, TypeError):
                    continue
            self.respond(503, {"error":"공지 데이터를 준비 중이에요. 잠시 뒤 다시 확인해주세요."})
            return
        if path.startswith("/api/"):
            self.respond(404, {"error": "찾을 수 없는 주소예요."})
            return
        if not member and path not in PUBLIC:
            self.send_response(303)
            self.send_header("Location", "/login.html")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        decoded = unquote(path)
        target = (self.server.frontend / decoded.lstrip("/")).resolve()
        if (not target.is_relative_to(self.server.frontend)
                or any(part.startswith(".") for part in Path(decoded).parts)
                or (target.is_dir() and decoded != "/")):
            self.send_error(404)
            return
        if decoded == "/":
            self.path = "/index.html"
        super().do_HEAD() if head else super().do_GET()

    def upload_blog_attachment(self,post_id):
        self.close_connection=True
        scheme="https" if self.server.secure_cookie else "http"
        if self.headers.get("Origin")!=f"{scheme}://{self.headers.get('Host','')}" or self.headers.get("Content-Type")!="application/octet-stream":
            self.respond(403,{"error":"사이트에서 다시 시도해주세요."});return
        member=self.session()
        if not member:
            self.respond(401,{"error":"로그인이 필요해요."});return
        try:
            with connect(self.server.database) as db:
                if not blog.can_edit(blog.get_post(db,post_id),member):raise blog.BlogError(403,"파일을 첨부할 권한이 없어요.")
            try:size=int(self.headers.get("Content-Length","0"))
            except ValueError:raise blog.BlogError(400,"파일 크기를 확인해주세요.")
            if not 0<size<=blog.MAX_ATTACHMENT_BYTES:raise blog.BlogError(413,"파일당 10MB 이하로 첨부해주세요.")
            filename=unquote(self.headers.get("X-File-Name",""),errors="strict")
            self.connection.settimeout(30)
            body=self.rfile.read(size)
            if len(body)!=size:raise blog.BlogError(400,"파일 전송이 완료되지 않았어요.")
            member=self.session()
            if not member:raise blog.BlogError(401,"로그인이 필요해요.")
            with connect(self.server.database) as db:result=blog.add_attachment(db,member,post_id,filename,body)
            self.respond(201,result)
        except blog.BlogError as error:self.respond(error.status,{"error":str(error)})
        except TimeoutError:self.respond(408,{"error":"파일 전송 시간이 초과됐어요."})
        except (UnicodeError,ValueError):self.respond(400,{"error":"파일 이름을 확인해주세요."})
        except sqlite3.Error:self.respond(500,{"error":"파일을 저장하지 못했어요."})

    def do_PATCH(self):
        self.do_POST()

    def do_DELETE(self):
        self.do_POST()

    def do_POST(self):
        path=urlsplit(self.path).path
        if self.command!="POST" and not path.startswith("/api/blog"):
            self.respond(405,{"error":"지원하지 않는 요청이에요."})
            return
        upload=re.fullmatch(r"/api/blog/posts/([a-f0-9]{32})/attachments",path)
        if upload and self.command=="POST":
            self.upload_blog_attachment(upload[1])
            return
        # Require same-origin JSON; ordinary forms and cross-site fetches cannot pass.
        origin = self.headers.get("Origin")
        host = self.headers.get("Host", "")
        scheme = "https" if self.server.secure_cookie else "http"
        if (origin != f"{scheme}://{host}" or self.headers.get("Content-Type", "").split(";")[0] != "application/json"):
            self.respond(403, {"error": "사이트에서 다시 시도해주세요."})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if not 0 < size <= (128000 if path.startswith("/api/blog") else 4096):
                raise ValueError()
            data = json.loads(self.rfile.read(size))
            if not isinstance(data, dict):
                raise ValueError()
        except (ValueError, UnicodeError):
            self.respond(400, {"error": "입력 내용을 확인해주세요."})
            return
        path = urlsplit(self.path).path
        if path.startswith("/api/blog"):
            member=self.session()
            if not member:
                self.respond(401,{"error":"로그인이 필요해요."})
                return
            try:
                with connect(self.server.database) as db:
                    status,result=blog.write(db,member,self.command,path,data)
                self.respond(status,result)
            except blog.BlogError as error:
                self.respond(error.status,{"error":str(error)})
            except sqlite3.Error:
                self.respond(500,{"error":"저장하지 못했어요. 잠시 뒤 다시 시도해주세요."})
            return
        if path == "/api/logout":
            jar = cookies.SimpleCookie()
            try:
                jar.load(self.headers.get("Cookie", ""))
                token = jar["youwith_session"].value
            except (cookies.CookieError, KeyError):
                token = ""
            with connect(self.server.database) as db:
                db.execute("DELETE FROM sessions WHERE token_hash = ?", (hashlib.sha256(token.encode()).hexdigest(),))
            self.respond(200, {"ok": True}, self.cookie("", 0))
            return
        if path != "/api/login":
            self.respond(404, {"error": "찾을 수 없는 주소예요."})
            return
        username, password = data.get("username"), data.get("password")
        if not isinstance(username, str) or not isinstance(password, str) or len(username) > 40 or len(password) > 256:
            self.respond(400, {"error": "아이디와 비밀번호를 확인해주세요."})
            return
        now = time.time()
        # IP-wide throttling also bounds attempts against changing usernames.
        key = self.client_address[0]
        with connect(self.server.database) as db:
            attempt = db.execute("SELECT * FROM attempts WHERE key = ? AND expires > ?", (key, now)).fetchone()
            if attempt and attempt["failures"] >= 10:
                self.respond(429, {"error": "로그인 시도가 많아요. 5분 뒤 다시 시도해주세요."})
                return
            member = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
            candidate = password_hash(password, member["salt"] if member else "00" * 16)
            if not member or not member["approved"] or not hmac.compare_digest(candidate, member["password_hash"]):
                count = attempt["failures"] + 1 if attempt else 1
                until = attempt["expires"] if attempt else now + 300
                db.execute("INSERT OR REPLACE INTO attempts VALUES (?, ?, ?)", (key, count, until))
                self.respond(401, {"error": "아이디 또는 비밀번호가 올바르지 않아요."})
                return
            token = secrets.token_urlsafe(32)
            db.execute("DELETE FROM sessions WHERE expires <= ?", (now,))
            db.execute("DELETE FROM attempts WHERE key = ? OR expires <= ?", (key, now))
            db.execute("INSERT INTO sessions VALUES (?, ?, ?)",
                       (hashlib.sha256(token.encode()).hexdigest(), member["id"], now + SESSION_SECONDS))
        self.respond(200, {"id": member["id"], "username": member["username"], "role": member["role"]}, self.cookie(token, SESSION_SECONDS))

    def log_request(self, code="-", size="-"):
        # Never put OAuth authorization codes or state in the access log.
        self.log_message('"%s %s" %s %s', self.command, urlsplit(self.path).path, str(code), str(size))

    def redirect(self, target, *cookies_to_set):
        self.send_response(303)
        self.send_header("Location", target)
        self.send_header("Content-Length", "0")
        self.send_header("Referrer-Policy", "no-referrer")
        for value in cookies_to_set:
            self.send_header("Set-Cookie", value)
        self.end_headers()

    def state_cookie(self, state, age):
        return f"youwith_kakao_state={state}; Path=/; HttpOnly; SameSite=Lax; Max-Age={age}" + ("; Secure" if self.server.secure_cookie else "")

    def kakao_route(self, path):
        config = self.server.kakao
        clear = self.state_cookie("", 0)
        if not config.ready:
            self.redirect("/login.html?status=unavailable", clear)
            return
        parsed = urlsplit(config.redirect_uri)
        if self.headers.get("Host") != parsed.netloc or self.server.secure_cookie != (parsed.scheme == "https"):
            self.redirect("/login.html?status=address", clear)
            return
        if path == "/auth/kakao":
            state = secrets.token_urlsafe(32)
            with connect(self.server.database) as db:
                db.execute("DELETE FROM oauth_states WHERE expires <= ?", (time.time(),))
                db.execute("INSERT INTO oauth_states VALUES (?, ?)", (hashlib.sha256(state.encode()).hexdigest(), time.time() + 300))
            self.redirect(config.authorize_url(state), self.state_cookie(state, 300))
            return
        query = parse_qs(urlsplit(self.path).query)
        state_values = query.get("state", [])
        jar = cookies.SimpleCookie()
        try:
            jar.load(self.headers.get("Cookie", ""))
            state_cookie = jar["youwith_kakao_state"].value
        except (cookies.CookieError, KeyError):
            state_cookie = ""
        state = state_values[0] if len(state_values) == 1 else ""
        if not re.fullmatch(r"[a-zA-Z0-9_-]{43}", state) or not hmac.compare_digest(state, state_cookie):
            self.redirect("/login.html?status=expired", clear)
            return
        with connect(self.server.database) as db:
            consumed = db.execute("DELETE FROM oauth_states WHERE state_hash = ? AND expires > ?", (hashlib.sha256(state.encode()).hexdigest(), time.time())).rowcount
        if not consumed:
            self.redirect("/login.html?status=expired", clear)
            return
        if "error" in query:
            self.redirect("/login.html?status=cancelled", clear)
            return
        codes = query.get("code", [])
        if len(codes) != 1 or not 0 < len(codes[0]) <= 2048:
            self.redirect("/login.html?status=failed", clear)
            return
        try:
            kakao_id = fetch_identity(config, codes[0])
        except (URLError, TimeoutError, OSError, ValueError, KeyError, TypeError, AttributeError):
            self.redirect("/login.html?status=failed", clear)
            return
        with connect(self.server.database) as db:
            # One identity, one member, including simultaneous first logins.
            db.execute("INSERT OR IGNORE INTO users (id, username, salt, password_hash, kakao_id, approved) VALUES (?, ?, ?, ?, ?, 0)",
                       (secrets.token_hex(16), "부원-" + secrets.token_hex(6), "", "", kakao_id))
            member = db.execute("SELECT * FROM users WHERE kakao_id = ?", (kakao_id,)).fetchone()
            if member["approved"]:
                token = secrets.token_urlsafe(32)
                db.execute("DELETE FROM sessions WHERE expires <= ?", (time.time(),))
                db.execute("INSERT INTO sessions VALUES (?, ?, ?)", (hashlib.sha256(token.encode()).hexdigest(), member["id"], time.time() + SESSION_SECONDS))
            else:
                token = None
        if not token:
            self.redirect("/login.html?" + urlencode({"status":"pending", "ref":member["username"]}), clear, self.cookie("", 0))
        else:
            self.redirect("/", clear, self.cookie(token, SESSION_SECONDS))

    def cookie(self, token, age):
        return f"youwith_session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={age}" + ("; Secure" if self.server.secure_cookie else "")


def main():
    parser = argparse.ArgumentParser(description="YouWith 로그인 서버 / 계정 관리")
    parser.add_argument("command", choices=["serve", "create-user", "reset-password", "members", "approve", "revoke", "grant-admin", "revoke-admin"], nargs="?", default="serve")
    parser.add_argument("username", nargs="?")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=4174)
    parser.add_argument("--database", type=Path, default=ROOT / "db" / "accounts.sqlite3")
    parser.add_argument("--secure-cookie", action="store_true", help="HTTPS 역방향 프록시 뒤에서 운영할 때 사용")
    parser.add_argument("--auth-settings", type=Path, default=ROOT / "db" / "auth-settings.json")
    args = parser.parse_args()
    initialize(args.database)
    if args.command == "serve":
        with AuthServer((args.host, args.port), args.database, ROOT / "frontend", args.secure_cookie, KakaoConfig.load(args.auth_settings)) as server:
            print(f"YouWith: http://{args.host}:{args.port} (종료: Ctrl+C)", flush=True)
            server.serve_forever()
        return
    if args.command == "members":
        with connect(args.database) as db:
            for member in db.execute("SELECT id, username, approved, role FROM users ORDER BY approved, username"):
                print(f"{member['id']} | {member['username']} | {'승인' if member['approved'] else '승인 대기'} | {member['role']}")
        return
    if args.command in {"grant-admin", "revoke-admin"}:
        if not args.username:
            parser.error("내부 회원 ID를 입력해주세요.")
        with connect(args.database) as db:
            result=db.execute("UPDATE users SET role=? WHERE id=?",("admin" if args.command=="grant-admin" else "member",args.username))
            if not result.rowcount:
                parser.error("회원 ID를 확인해주세요.")
        print("관리자 권한을 변경했어요.")
        return
    if args.command in {"approve", "revoke"}:
        if not args.username:
            parser.error("회원 목록에 표시된 내부 회원 ID를 입력해주세요.")
        try:
            set_approval(args.database, args.username, args.command == "approve")
        except ValueError as error:
            parser.error(str(error))
        print("승인 상태를 변경했어요.")
        return
    if not args.username:
        parser.error("아이디를 입력해주세요.")
    password = getpass.getpass("비밀번호 (12자 이상): ")
    if password != getpass.getpass("비밀번호 확인: "):
        parser.error("비밀번호가 일치하지 않아요.")
    try:
        if args.command == "create-user":
            create_user(args.database, args.username, password)
        else:
            if not 12 <= len(password) <= 256:
                raise ValueError("비밀번호는 12~256자로 입력해주세요.")
            salt = secrets.token_hex(16)
            with connect(args.database) as db:
                member = db.execute("SELECT id FROM users WHERE username = ?", (args.username,)).fetchone()
                if not member:
                    raise ValueError("등록된 아이디가 없어요.")
                db.execute("UPDATE users SET salt = ?, password_hash = ? WHERE id = ?", (salt, password_hash(password, salt), member["id"]))
                db.execute("DELETE FROM sessions WHERE user_id = ?", (member["id"],))
        print("계정 정보를 저장했어요.")
    except (ValueError, sqlite3.IntegrityError) as error:
        parser.error("이미 등록된 아이디예요." if isinstance(error, sqlite3.IntegrityError) else str(error))


if __name__ == "__main__":
    main()
