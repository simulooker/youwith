import sys,http.client,json,tempfile,threading,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import auth_server as auth

class GameScoresTests(unittest.TestCase):
 def test_auth_validation_high_score_and_account_identity(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);server=auth.AuthServer(('127.0.0.1',0),root/'test.sqlite3',root)
   auth.create_user(root/'test.sqlite3','user1','test-password-12345')
   auth.create_user(root/'test.sqlite3','user2','test-password-12345')
   thread=threading.Thread(target=server.serve_forever);thread.start()
   def request(method,path,data=None,cookie=None,origin=True):
    c=http.client.HTTPConnection('127.0.0.1',server.server_port,timeout=10)
    headers={'Content-Type':'application/json'}
    if origin:headers['Origin']=f'http://127.0.0.1:{server.server_port}'
    if cookie:headers['Cookie']=cookie
    c.request(method,path,None if data is None else json.dumps(data),headers)
    r=c.getresponse();status=r.status;token=r.getheader('Set-Cookie');body=json.loads(r.read());c.close();return status,body,token
   try:
    self.assertEqual(request('GET','/api/games/tetris/ranking')[0],401)
    cookie=request('POST','/api/login',{'username':'user1','password':'test-password-12345'})[2].split(';')[0]
    self.assertEqual(request('POST','/api/games/tetris/score',{'score':10})[0],401)
    self.assertEqual(request('POST','/api/games/tetris/score',{'score':True},cookie)[0],400)
    self.assertEqual(request('POST','/api/games/tetris/score',{'score':-1},cookie)[0],400)
    self.assertEqual(request('POST','/api/games/tetris/score',{'score':10},cookie,False)[0],403)
    r=request('POST','/api/games/tetris/score',{'score':100,'username':'user2'},cookie)[1]
    self.assertEqual(r['rows'][0]['username'],'user1')
    request('POST','/api/games/tetris/score',{'score':50},cookie)
    self.assertEqual(request('GET','/api/games/tetris/ranking',cookie=cookie)[1]['me']['score'],100)
    self.assertEqual(request('GET','/api/games/2048/ranking',cookie=cookie)[1]['rows'],[])
    cookie2=request('POST','/api/login',{'username':'user2','password':'test-password-12345'})[2].split(';')[0]
    request('POST','/api/games/tetris/score',{'score':200},cookie2)
    self.assertEqual(request('GET','/api/games/tetris/ranking',cookie=cookie)[1]['me']['rank'],2)
    with auth.connect(root/'test.sqlite3') as db:db.execute("UPDATE users SET approved=0 WHERE username='user2'")
    self.assertEqual(len(request('GET','/api/games/tetris/ranking',cookie=cookie)[1]['rows']),1)
   finally:server.shutdown();server.server_close();thread.join()
