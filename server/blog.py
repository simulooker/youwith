"""Authenticated club blog: role checks stay on the server."""
from datetime import datetime, timezone
import json
import re
import secrets

CATEGORIES={"tech":"Tech", "achievement":"성과공유", "qna":"문의사항"}


class BlogError(Exception):
    def __init__(self,status,message):
        self.status=status
        super().__init__(message)


def initialize(db):
    db.executescript("""
        CREATE TABLE IF NOT EXISTS blog_posts (
            id TEXT PRIMARY KEY, category TEXT NOT NULL, author_id TEXT NOT NULL,
            title TEXT NOT NULL, summary TEXT NOT NULL, content TEXT NOT NULL,
            tags TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS blog_category_date ON blog_posts(category,created_at DESC);
        CREATE TABLE IF NOT EXISTS blog_comments (
            id TEXT PRIMARY KEY, post_id TEXT NOT NULL, author_id TEXT NOT NULL,
            content TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS blog_attachments (
            id TEXT PRIMARY KEY, post_id TEXT NOT NULL, filename TEXT NOT NULL,
            size INTEGER NOT NULL, created_at TEXT NOT NULL, data BLOB NOT NULL);
        CREATE INDEX IF NOT EXISTS blog_attachment_post ON blog_attachments(post_id);
        CREATE INDEX IF NOT EXISTS blog_comment_post ON blog_comments(post_id,created_at);
    """)


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def field(data,key,maximum,required=True):
    value=data.get(key,"")
    if not isinstance(value,str) or len(value)>maximum or (required and not value.strip()):
        raise BlogError(400,"제목·본문과 글자 수를 확인해주세요.")
    return value.strip()


def category(value):
    if not isinstance(value,str) or value not in CATEGORIES:
        raise BlogError(400,"게시판을 확인해주세요.")
    return value


def admin(member):
    return member["role"]=="admin"


def can_edit(post,member):
    return admin(member) or (post["category"]=="qna" and post["author_id"]==member["id"])


def get_post(db,post_id):
    post=db.execute("SELECT p.*,u.username AS author FROM blog_posts p JOIN users u ON u.id=p.author_id WHERE p.id=?",(post_id,)).fetchone()
    if not post:raise BlogError(404,"글을 찾을 수 없어요. 삭제됐을 수 있어요.")
    return post


def serialize(post,member,full=False):
    result={key:post[key] for key in ("id","category","title","summary","author_id","author","created_at","updated_at")}
    result["tags"]=json.loads(post["tags"])
    result["canEdit"]=can_edit(post,member)
    result["content" if full else "excerpt"]=post["content"] if full else post["content"][:160]
    return result


def read(db,member,path,query):
    if path=="/api/blog/posts":
        selected=category(query.get("category",["tech"])[0])
        search=query.get("q",[""])[0].strip()[:100]
        try:page=int(query.get("page",["1"])[0])
        except ValueError:raise BlogError(400,"페이지를 확인해주세요.")
        if not 1<=page<=10000:raise BlogError(400,"페이지를 확인해주세요.")
        clauses=["p.category=?"];params=[selected]
        if search:
            escaped=search.replace("\\","\\\\").replace("%","\\%").replace("_","\\_")
            clauses.append("(p.title LIKE ? ESCAPE '\\' OR p.content LIKE ? ESCAPE '\\' OR p.tags LIKE ? ESCAPE '\\')")
            params.extend(["%"+escaped+"%"]*3)
        condition=" AND ".join(clauses)
        total=db.execute("SELECT count(*) FROM blog_posts p WHERE "+condition,params).fetchone()[0]
        posts=db.execute("SELECT p.*,u.username AS author FROM blog_posts p JOIN users u ON u.id=p.author_id WHERE "+condition+" ORDER BY p.created_at DESC,p.id DESC LIMIT 12 OFFSET ?",params+[(page-1)*12]).fetchall()
        return {"posts":[serialize(p,member) for p in posts],"total":total,"page":page,"pageSize":12}
    match=re.fullmatch(r"/api/blog/posts/([a-f0-9]{32})",path)
    if not match:raise BlogError(404,"찾을 수 없는 주소예요.")
    post=get_post(db,match[1])
    comments=db.execute("SELECT c.*,u.username AS author FROM blog_comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=? ORDER BY c.created_at DESC,c.id DESC LIMIT 200",(post["id"],)).fetchall()
    return {"attachments":[dict(row) for row in db.execute("SELECT id,filename,size,created_at FROM blog_attachments WHERE post_id=? ORDER BY created_at,id",(post["id"],))],"post":serialize(post,member,True),"comments":[{**dict(c),"canEdit":admin(member) or c["author_id"]==member["id"]} for c in reversed(comments)]}


MAX_ATTACHMENT_BYTES=10*1024*1024


def attachment(db,attachment_id):
    row=db.execute('SELECT * FROM blog_attachments WHERE id=?',(attachment_id,)).fetchone()
    if not row:raise BlogError(404,'첨부파일을 찾을 수 없어요.')
    return row


def add_attachment(db,member,post_id,filename,content):
    if not can_edit(get_post(db,post_id),member):raise BlogError(403,'이 글에 파일을 첨부할 권한이 없어요.')
    filename=re.split(r'[/\\]',filename)[-1].strip()
    if not filename or filename in {'.','..'} or len(filename)>255 or any(ord(c)<32 or ord(c)==127 for c in filename):
        raise BlogError(400,'파일 이름을 확인해주세요.')
    if not 0<len(content)<=MAX_ATTACHMENT_BYTES:raise BlogError(413,'파일은 0바이트 초과, 10MB 이하로 첨부해주세요.')
    existing=db.execute('SELECT id,filename,size,created_at FROM blog_attachments WHERE post_id=? AND filename=? AND size=? AND data=?',(post_id,filename,len(content),content)).fetchone()
    if existing:return dict(existing)
    file_id=secrets.token_hex(16);stamp=now()
    db.execute('INSERT INTO blog_attachments VALUES (?,?,?,?,?,?)',(file_id,post_id,filename,len(content),stamp,content))
    return {'id':file_id,'filename':filename,'size':len(content),'created_at':stamp}


def delete_attachment(db,member,file_id):
    row=attachment(db,file_id)
    if not can_edit(get_post(db,row['post_id']),member):raise BlogError(403,'첨부파일을 삭제할 권한이 없어요.')
    db.execute('DELETE FROM blog_attachments WHERE id=?',(file_id,))
    return 200,{'ok':True}


def write(db,member,method,path,data):
    file_match=re.fullmatch(r"/api/blog/attachments/([a-f0-9]{32})",path)
    if file_match and method=="DELETE":return delete_attachment(db,member,file_match[1])
    if path=="/api/blog/posts" and method=="POST":
        selected=category(data.get("category"))
        if selected!="qna" and not admin(member):raise BlogError(403,"Tech·성과공유 글은 관리자만 작성할 수 있어요.")
        title=field(data,"title",160);content=field(data,"content",20000);summary=field(data,"summary",240,False)
        tags=field(data,"tags",240,False)
        post_id=secrets.token_hex(16);stamp=now()
        db.execute("INSERT INTO blog_posts VALUES (?,?,?,?,?,?,?,?,?)",(post_id,selected,member["id"],title,summary,content,json.dumps(list(dict.fromkeys(t.strip() for t in tags.split(",") if t.strip()))[:8],ensure_ascii=False),stamp,stamp))
        return 201,{"id":post_id}
    match=re.fullmatch(r"/api/blog/posts/([a-f0-9]{32})(/comments)?",path)
    if match:
        post=get_post(db,match[1])
        if match[2]:
            if method!="POST":raise BlogError(405,"지원하지 않는 요청이에요.")
            body=field(data,"content",2000)
            comment_id=secrets.token_hex(16);stamp=now()
            db.execute("INSERT INTO blog_comments VALUES (?,?,?,?,?,?)",(comment_id,post["id"],member["id"],body,stamp,stamp))
            return 201,{"id":comment_id}
        if method not in {"PATCH","DELETE"}:raise BlogError(405,"지원하지 않는 요청이에요.")
        if not can_edit(post,member):raise BlogError(403,"이 글을 수정하거나 삭제할 권한이 없어요.")
        if method=="DELETE":
            db.execute("DELETE FROM blog_attachments WHERE post_id=?",(post["id"],))
            db.execute("DELETE FROM blog_comments WHERE post_id=?",(post["id"],))
            db.execute("DELETE FROM blog_posts WHERE id=?",(post["id"],))
            return 200,{"ok":True}
        selected=category(data.get("category",post["category"]))
        if selected!="qna" and not admin(member):raise BlogError(403,"Tech·성과공유 글은 관리자만 작성할 수 있어요.")
        title=field(data,"title",160);content=field(data,"content",20000);summary=field(data,"summary",240,False);tags=field(data,"tags",240,False)
        db.execute("UPDATE blog_posts SET category=?,title=?,summary=?,content=?,tags=?,updated_at=? WHERE id=?",(selected,title,summary,content,json.dumps(list(dict.fromkeys(t.strip() for t in tags.split(",") if t.strip()))[:8],ensure_ascii=False),now(),post["id"]))
        return 200,{"id":post["id"]}
    match=re.fullmatch(r"/api/blog/comments/([a-f0-9]{32})",path)
    if match:
        comment=db.execute("SELECT * FROM blog_comments WHERE id=?",(match[1],)).fetchone()
        if not comment:raise BlogError(404,"댓글을 찾을 수 없어요.")
        if not admin(member) and comment["author_id"]!=member["id"]:raise BlogError(403,"내 댓글만 수정하거나 삭제할 수 있어요.")
        if method=="DELETE":db.execute("DELETE FROM blog_comments WHERE id=?",(comment["id"],))
        elif method=="PATCH":db.execute("UPDATE blog_comments SET content=?,updated_at=? WHERE id=?",(field(data,"content",2000),now(),comment["id"]))
        else:raise BlogError(405,"지원하지 않는 요청이에요.")
        return 200,{"ok":True}
    raise BlogError(404,"찾을 수 없는 주소예요.")
