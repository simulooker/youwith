import http.client
import importlib.util
import json
from pathlib import Path
import tempfile
import threading
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('notice_api_auth',ROOT/'server/auth_server.py')
auth=importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth)


class NoticeApiTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.root=Path(self.temp.name)
        self.frontend=self.root/'frontend'
        self.frontend.mkdir()
        self.snapshot=self.root/'notices.json'
        self.data={'checkedAt':'2026-11-16T09:00:00+09:00','sources':[{'id':str(i),'notices':[]} for i in range(12)]}
        self.snapshot.write_text(json.dumps(self.data),encoding='utf-8')
        self.server=auth.AuthServer(('127.0.0.1',0),self.root/'accounts.sqlite3',self.frontend,notice_data=self.snapshot)
        auth.create_user(self.root/'accounts.sqlite3','api-user','test-password-12345')
        self.thread=threading.Thread(target=self.server.serve_forever)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self,method,path,cookie=None):
        c=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=10)
        headers={'Cookie':cookie} if cookie else {}
        body=None
        if method=='POST':
            body=json.dumps({'username':'api-user','password':'test-password-12345'})
            headers.update({'Origin':f'http://127.0.0.1:{self.server.server_port}','Content-Type':'application/json'})
        c.request(method,path,body,headers)
        response=c.getresponse()
        result=response.status,dict(response.getheaders()),response.read()
        c.close()
        return result

    def login(self):
        status,headers,_=self.request('POST','/api/login')
        self.assertEqual(status,200)
        return headers['Set-Cookie'].split(';')[0]

    def test_authentication_and_persistent_snapshot(self):
        self.assertEqual(self.request('GET','/api/notices')[0],401)
        status,headers,body=self.request('GET','/api/notices',self.login())
        self.assertEqual(status,200)
        self.assertEqual(json.loads(body),self.data)
        self.assertEqual(headers['Cache-Control'],'no-store')

    def test_invalid_primary_uses_previous_frontend_snapshot(self):
        self.snapshot.write_text('{unfinished',encoding='utf-8')
        (self.frontend/'notices.json').write_text(json.dumps(self.data),encoding='utf-8')
        status,_,body=self.request('GET','/api/notices',self.login())
        self.assertEqual(status,200)
        self.assertEqual(json.loads(body),self.data)

    def test_no_valid_snapshot_returns_service_error(self):
        self.snapshot.write_text(json.dumps({'sources':[]}),encoding='utf-8')
        self.assertEqual(self.request('GET','/api/notices',self.login())[0],503)


if __name__=='__main__': unittest.main()
