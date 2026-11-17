import http.client
import importlib.util
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest

ROOT=Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('blog_test_auth',ROOT/'server/auth_server.py')
auth=importlib.util.module_from_spec(spec);spec.loader.exec_module(auth)


class BlogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp=tempfile.TemporaryDirectory();cls.db=Path(cls.temp.name)/'test.sqlite3'
        cls.server=auth.AuthServer(('127.0.0.1',0),cls.db,ROOT/'frontend')
        cls.port=cls.server.server_port
        for name in ('관리자','유저1','유저2'):auth.create_user(cls.db,name,'Blog-test-password-123!')
        with auth.connect(cls.db) as db:db.execute("UPDATE users SET role='admin' WHERE username='관리자'")
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.cookies={}
        for name in ('관리자','유저1','유저2'):
            status,headers,_=cls.request('POST','/api/login',{'username':name,'password':'Blog-test-password-123!'})
            assert status==200
            cls.cookies[name]=headers['Set-Cookie'].split(';')[0]

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join();cls.temp.cleanup()

    @classmethod
    def request(cls,method,path,data=None,user=None,origin=True):
        c=http.client.HTTPConnection('127.0.0.1',cls.port,timeout=10)
        headers={'Content-Type':'application/json'}
        if origin:headers['Origin']=f'http://127.0.0.1:{cls.port}'
        if user:headers['Cookie']=cls.cookies[user]
        c.request(method,path,json.dumps(data,ensure_ascii=False).encode() if data is not None else None,headers)
        r=c.getresponse();body=r.read();result=(r.status,dict(r.getheaders()),json.loads(body));c.close();return result

    def setUp(self):
        with auth.connect(self.db) as db:
            db.execute('DELETE FROM blog_attachments');db.execute('DELETE FROM blog_comments');db.execute('DELETE FROM blog_posts')
            db.execute("UPDATE users SET role='admin',approved=1 WHERE username='관리자'")

    def post(self,user='관리자',category='tech',**extra):
        data={'category':category,'title':'글 제목','summary':'소개','content':'## 내용\n본문','tags':'Python, 회고, Python'};data.update(extra)
        return self.request('POST','/api/blog/posts',data,user)

    def test_anonymous_and_csrf(self):
        self.assertEqual(self.request('GET','/api/blog/posts')[0],401)
        self.assertEqual(self.post(user=None)[0],401)
        for method in ('POST','PATCH','DELETE'):
            self.assertEqual(self.request(method,'/api/blog/posts',{},'관리자',origin=False)[0],403)

    def test_admin_only_categories_and_untrusted_role(self):
        for category in ('tech','achievement'):
            self.assertEqual(self.post('유저1',category,role='admin',author_id='관리자')[0],403)
            status,_,data=self.post(category=category);self.assertEqual(status,201);path='/api/blog/posts/'+data['id']
            for method in ('PATCH','DELETE'):
                self.assertEqual(self.request(method,path,{'title':'탈취','content':'본문','category':category},'유저1')[0],403)
            self.assertEqual(self.request('PATCH',path,{'title':'수정','content':'본문','category':category},'관리자')[0],200)
            self.assertEqual(self.request('DELETE',path,{},'관리자')[0],200)

    def test_qna_owner_and_category_escalation(self):
        status,_,data=self.post('유저1','qna');self.assertEqual(status,201);path='/api/blog/posts/'+data['id']
        payload={'title':'새 제목','content':'새 본문','category':'qna'}
        self.assertEqual(self.request('PATCH',path,payload,'유저2')[0],403)
        self.assertEqual(self.request('DELETE',path,{},'유저2')[0],403)
        self.assertEqual(self.request('PATCH',path,{**payload,'category':'tech'},'유저1')[0],403)
        self.assertEqual(self.request('PATCH',path,payload,'유저1')[0],200)
        self.assertTrue(self.request('GET',path,user='유저1')[2]['post']['canEdit'])
        self.assertFalse(self.request('GET',path,user='유저2')[2]['post']['canEdit'])
        self.assertEqual(self.request('DELETE',path,{},'유저1')[0],200)
        self.assertEqual(self.request('GET',path,user='유저1')[0],404)

    def test_comments_ownership_and_cascade(self):
        path='/api/blog/posts/'+self.post()[2]['id']
        status,_,data=self.request('POST',path+'/comments',{'content':'답변'},'유저1');self.assertEqual(status,201)
        comment='/api/blog/comments/'+data['id']
        self.assertEqual(self.request('PATCH',comment,{'content':'변경'},'유저2')[0],403)
        self.assertEqual(self.request('DELETE',comment,{},'유저2')[0],403)
        self.assertEqual(self.request('PATCH',comment,{'content':'변경'},'유저1')[0],200)
        self.assertEqual(self.request('GET',path,user='유저1')[2]['comments'][0]['content'],'변경')
        self.assertEqual(self.request('DELETE',comment,{},'관리자')[0],200)
        self.request('POST',path+'/comments',{'content':'두번째'},'유저2')
        self.assertEqual(self.request('DELETE',path,{},'관리자')[0],200)
        with auth.connect(self.db) as db:self.assertEqual(db.execute('SELECT count(*) FROM blog_comments').fetchone()[0],0)

    def test_fresh_role_and_approval_on_existing_session(self):
        path='/api/blog/posts/'+self.post()[2]['id']
        with auth.connect(self.db) as db:db.execute("UPDATE users SET role='member' WHERE username='관리자'")
        self.assertEqual(self.request('GET','/api/me',user='관리자')[2]['role'],'member')
        self.assertEqual(self.request('DELETE',path,{},'관리자')[0],403)
        self.assertEqual(self.post()[0],403)
        with auth.connect(self.db) as db:db.execute("UPDATE users SET approved=0 WHERE username='관리자'")
        self.assertEqual(self.request('GET',path,user='관리자')[0],401)
        self.assertEqual(self.post()[0],401)

    def test_validation_search_pagination_and_persistence(self):
        for bad in ({'category':[]},{'title':''},{'content':'x'*20001},{'tags':['bad']}):
            self.assertEqual(self.post(**bad)[0],400)
        for i in range(13):self.assertEqual(self.post(title=f'기록 {i}',content='검색 100% _ 값')[0],201)
        result=self.request('GET','/api/blog/posts?category=tech',user='유저1')[2]
        self.assertEqual(result['total'],13);self.assertEqual(len(result['posts']),12)
        self.assertEqual(result['posts'][0]['tags'],['Python','회고'])
        self.assertEqual(len(self.request('GET','/api/blog/posts?category=tech&page=2',user='유저1')[2]['posts']),1)
        self.assertEqual(self.request('GET','/api/blog/posts?q=100%25',user='유저1')[2]['total'],13)
        self.assertEqual(self.request('GET','/api/blog/posts?q=missing',user='유저1')[2]['total'],0)
        self.assertEqual(self.request('GET','/api/blog/posts?page=0',user='유저1')[0],400)
        auth.initialize(self.db)
        self.assertEqual(self.request('GET','/api/blog/posts',user='유저1')[2]['total'],13)

    def test_operator_role_migration_only_once(self):
        dbfile=Path(self.temp.name)/'old.sqlite3'
        with auth.connect(dbfile) as db:
            db.execute('CREATE TABLE users (id TEXT PRIMARY KEY,username TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL)')
            db.execute("INSERT INTO users VALUES ('1','admin','salt','hash')")
        auth.initialize(dbfile)
        with auth.connect(dbfile) as db:
            self.assertEqual(db.execute('SELECT role FROM users').fetchone()[0],'admin')
            db.execute("UPDATE users SET role='member'")
        auth.initialize(dbfile)
        with auth.connect(dbfile) as db:self.assertEqual(db.execute('SELECT role FROM users').fetchone()[0],'member')

    def transfer(self,method,path,body=b'',user='관리자',filename='보고서.pdf',origin=True,length=None):
        from urllib.parse import quote
        c=http.client.HTTPConnection('127.0.0.1',self.port,timeout=10)
        headers={'Content-Type':'application/octet-stream','X-File-Name':quote(filename),'Content-Length':str(len(body) if length is None else length)}
        if user:headers['Cookie']=self.cookies[user]
        if origin:headers['Origin']=f'http://127.0.0.1:{self.port}'
        c.request(method,path,body if method=='POST' else None,headers)
        r=c.getresponse();result=(r.status,dict(r.getheaders()),r.read());c.close();return result

    def test_attachment_10mb_boundary_and_authenticated_download(self):
        path='/api/blog/posts/'+self.post()[2]['id']
        self.assertEqual(self.transfer('POST',path+'/attachments',b'x',user=None)[0],401)
        self.assertEqual(self.transfer('POST',path+'/attachments',b'x',user='유저1')[0],403)
        self.assertEqual(self.transfer('POST',path+'/attachments',b'x',origin=False)[0],403)
        self.assertEqual(self.transfer('POST',path+'/attachments',b'x',length=10*1024*1024+1)[0],413)
        self.assertEqual(self.transfer('POST',path+'/attachments',b'')[0],413)
        payload=b'A'*(10*1024*1024)
        status,_,raw=self.transfer('POST',path+'/attachments',payload);self.assertEqual(status,201)
        file=json.loads(raw);url='/api/blog/attachments/'+file['id']
        self.assertEqual(file['size'],len(payload))
        self.assertEqual(self.transfer('GET',url,user=None)[0],401)
        status,headers,download=self.transfer('GET',url,user='유저1');self.assertEqual(status,200);self.assertEqual(download,payload)
        self.assertEqual(headers['Content-Type'],'application/octet-stream');self.assertEqual(headers['X-Content-Type-Options'],'nosniff')
        self.assertIn('attachment;',headers['Content-Disposition']);self.assertIn("filename*=UTF-8''",headers['Content-Disposition'])
        self.assertEqual(self.request('GET',path,user='유저1')[2]['attachments'][0]['id'],file['id'])
        self.assertEqual(self.request('DELETE',url,{},'유저1')[0],403)
        self.assertEqual(self.request('DELETE',path,{},'관리자')[0],200)
        self.assertEqual(self.transfer('GET',url)[0],404)

    def test_attachment_qna_owner_filename_and_retry(self):
        path='/api/blog/posts/'+self.post('유저1','qna')[2]['id']
        self.assertEqual(self.transfer('POST',path+'/attachments',b'x',user='유저2')[0],403)
        self.assertEqual(self.transfer('POST',path+'/attachments',b'x',user='유저1',filename='bad\r\nname')[0],400)
        status,_,raw=self.transfer('POST',path+'/attachments',b'hello',user='유저1',filename='..\\한글 자료.txt');self.assertEqual(status,201)
        data=json.loads(raw);self.assertEqual(data['filename'],'한글 자료.txt')
        duplicate=json.loads(self.transfer('POST',path+'/attachments',b'hello',user='유저1',filename='한글 자료.txt')[2])
        self.assertEqual(duplicate['id'],data['id'])
        url='/api/blog/attachments/'+data['id']
        self.assertEqual(self.request('DELETE',url,{},'유저2')[0],403)
        self.assertEqual(self.request('DELETE',url,{},'유저1')[0],200)
        self.assertEqual(self.transfer('GET',url)[0],404)



if __name__=='__main__':unittest.main()
