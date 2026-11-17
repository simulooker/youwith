import hashlib
import http.client
import importlib.util
import json
import tempfile
import threading
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("auth_server", ROOT / "server" / "auth_server.py")
auth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth)


class AuthTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.database = Path(cls.temp.name) / "accounts.sqlite3"
        cls.server = auth.AuthServer(("127.0.0.1", 0), cls.database, ROOT / "frontend")
        cls.port = cls.server.server_port
        auth.create_user(cls.database, "유저1", "Test-only-password-123!")
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.temp.cleanup()

    def setUp(self):
        with auth.connect(self.database) as db:
            db.execute("DELETE FROM attempts")

    def request(self, method, path, data=None, cookie=None, origin=True, content_type="application/json"):
        connection = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        headers = {}
        if origin:
            headers["Origin"] = f"http://127.0.0.1:{self.port}"
        if cookie:
            headers["Cookie"] = cookie
        if data is not None:
            headers["Content-Type"] = content_type
        connection.request(method, path, json.dumps(data) if data is not None else None, headers)
        response = connection.getresponse()
        result = (response.status, dict(response.getheaders()), response.read())
        connection.close()
        return result

    def login(self):
        status, headers, _ = self.request("POST", "/api/login", {"username":"유저1", "password":"Test-only-password-123!"})
        self.assertEqual(status, 200)
        return headers["Set-Cookie"].split(";")[0], headers["Set-Cookie"]

    def test_all_app_files_require_login(self):
        for path in ["/", "/index.html", "/app.js", "/config.js", "/notices.json", "/screens.js?x=1"]:
            with self.subTest(path=path):
                status, headers, body = self.request("GET", path)
                self.assertEqual(status, 303)
                self.assertEqual(headers["Location"], "/login.html")
                self.assertEqual(body, b"")
        self.assertEqual(self.request("HEAD", "/app.js")[0], 303)
        self.assertEqual(self.request("GET", "/api/me")[0], 401)
        for path in auth.PUBLIC:
            self.assertEqual(self.request("GET", path)[0], 200)

    def test_login_reload_and_logout_revoke_session(self):
        cookie, attributes = self.login()
        self.assertIn("HttpOnly", attributes)
        self.assertIn("SameSite=Lax", attributes)
        status, headers, body = self.request("GET", "/api/me", cookie=cookie)
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["username"], "유저1")
        self.assertEqual(headers["Cache-Control"], "no-store")
        for path in ["/", "/app.js", "/notices.json"]:
            self.assertEqual(self.request("GET", path, cookie=cookie)[0], 200)
        self.assertEqual(self.request("POST", "/api/logout", {}, cookie=cookie)[0], 200)
        self.assertEqual(self.request("GET", "/api/me", cookie=cookie)[0], 401)
        self.assertEqual(self.request("GET", "/app.js", cookie=cookie)[0], 303)

    def test_no_plaintext_password_or_session_token(self):
        cookie, _ = self.login()
        with auth.connect(self.database) as db:
            user = db.execute("SELECT * FROM users").fetchone()
            self.assertNotEqual(user["password_hash"], "Test-only-password-123!")
            self.assertEqual(len(user["salt"]), 32)
            token = cookie.split("=", 1)[1]
            row = db.execute("SELECT token_hash FROM sessions WHERE token_hash = ?", (hashlib.sha256(token.encode()).hexdigest(),)).fetchone()
            self.assertIsNotNone(row)
            self.assertNotEqual(row["token_hash"], token)

    def test_bad_credentials_and_login_throttle(self):
        for i in range(10):
            self.assertEqual(self.request("POST", "/api/login", {"username":f"unknown-{i}", "password":"incorrect"})[0], 401)
        self.assertEqual(self.request("POST", "/api/login", {"username":"유저1", "password":"Test-only-password-123!"})[0], 429)

    def test_csrf_invalid_payload_and_cookie(self):
        for origin, content_type in [(False, "application/json"), (True, "text/plain")]:
            self.assertEqual(self.request("POST", "/api/login", {}, origin=origin, content_type=content_type)[0], 403)
        for data in [[], {"username":12,"password":[]}, {"username":"a","password":"a"*257}]:
            self.assertEqual(self.request("POST", "/api/login", data)[0], 400)
        self.assertEqual(self.request("GET", "/api/me", cookie="youwith_session=invalid")[0], 401)

    def test_expiration_and_path_safety(self):
        cookie, _ = self.login()
        for path in ["/../db/accounts.sqlite3", "/%2e%2e/db/accounts.sqlite3", "/.secret", "/assets/", "/../frontend/index.html"]:
            self.assertEqual(self.request("GET", path, cookie=cookie)[0], 404)
        with auth.connect(self.database) as db:
            db.execute("UPDATE sessions SET expires = ?", (time.time()-1,))
        self.assertEqual(self.request("GET", "/api/me", cookie=cookie)[0], 401)

    def test_user_validation_and_secure_cookie(self):
        for username, password in [("a/b", "long-password"), ("ok", "short")]:
            with self.assertRaises(ValueError):
                auth.create_user(self.database, username, password)
        self.server.secure_cookie = True
        try:
            handler = object.__new__(auth.Handler)
            handler.server = self.server
            self.assertIn("; Secure", handler.cookie("token", 1))
        finally:
            self.server.secure_cookie = False


if __name__ == "__main__":
    unittest.main()
