import hashlib
import http.client
import importlib.util
import json
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import parse_qs, urlencode, urlsplit

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("auth_kakao_test", ROOT / "server/auth_server.py")
auth = importlib.util.module_from_spec(spec)
spec.loader.exec_module(auth)
import kakao_login


class KakaoTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.database = Path(self.temp.name) / "accounts.sqlite3"
        self.server = auth.AuthServer(("127.0.0.1", 0), self.database, ROOT / "frontend")
        self.port = self.server.server_port
        self.server.kakao = auth.KakaoConfig("test-public-id", "test-secret-only", f"http://127.0.0.1:{self.port}/auth/kakao/callback")
        self.thread = threading.Thread(target=self.server.serve_forever)
        self.thread.start()

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def request(self, path, cookie=None):
        c = http.client.HTTPConnection("127.0.0.1", self.port, timeout=10)
        c.request("GET", path, headers={"Cookie":cookie} if cookie else {})
        response = c.getresponse()
        result = response.status, response.getheaders(), response.read()
        c.close()
        return result

    def start(self):
        status, headers, _ = self.request("/auth/kakao")
        self.assertEqual(status, 303)
        headers = dict(headers)
        location = urlsplit(headers["Location"])
        self.assertEqual(location.netloc, "kauth.kakao.com")
        query = parse_qs(location.query)
        self.assertNotIn("client_secret", query)
        self.assertNotIn("scope", query)
        self.assertIn("SameSite=Lax", headers["Set-Cookie"])
        state = query["state"][0]
        return state, headers["Set-Cookie"].split(";")[0]

    def callback(self, state, cookie, code="test-code"):
        return self.request("/auth/kakao/callback?" + urlencode({"state":state,"code":code}), cookie)

    def test_missing_settings_fails_closed(self):
        self.server.kakao = auth.KakaoConfig()
        status, headers, _ = self.request("/auth/kakao")
        self.assertEqual(status, 303)
        self.assertIn("unavailable", dict(headers)["Location"])
        self.assertEqual(json.loads(self.request("/api/auth-config")[2]), {"kakao":False})
        self.assertEqual(self.request("/app.js")[0], 303)

    def test_state_cookie_expiry_replay_and_cancellation(self):
        state, cookie = self.start()
        with patch.object(auth, "fetch_identity") as provider:
            self.assertIn("expired", dict(self.callback(state, None)[1])["Location"])
            self.assertIn("expired", dict(self.callback("a"*43, cookie)[1])["Location"])
            provider.assert_not_called()
        status, headers, _ = self.request("/auth/kakao/callback?"+urlencode({"state":state,"error":"access_denied"}),cookie)
        self.assertIn("cancelled", dict(headers)["Location"])
        self.assertIn("Max-Age=0", dict(headers)["Set-Cookie"])
        self.assertIn("expired", dict(self.callback(state,cookie)[1])["Location"])
        state, cookie = self.start()
        with auth.connect(self.database) as db:
            db.execute("UPDATE oauth_states SET expires = ?", (time.time()-1,))
        self.assertIn("expired", dict(self.callback(state,cookie)[1])["Location"])

    def test_pending_approval_relogin_revoke(self):
        state, cookie = self.start()
        with patch.object(auth, "fetch_identity", return_value="12345"):
            status, headers, _ = self.callback(state,cookie)
        self.assertIn("pending", dict(headers)["Location"])
        self.assertFalse(any("youwith_session=" in value and "Max-Age=0" not in value for key,value in headers if key=="Set-Cookie"))
        with auth.connect(self.database) as db:
            member = db.execute("SELECT * FROM users").fetchone()
            self.assertEqual(member["approved"],0)
            self.assertEqual(db.execute("SELECT count(*) FROM sessions").fetchone()[0],0)
        auth.set_approval(self.database, member["id"], True)
        state, cookie = self.start()
        with patch.object(auth, "fetch_identity", return_value="12345"):
            status, headers, _ = self.callback(state,cookie)
        self.assertEqual(dict(headers)["Location"],"/")
        session = next(v.split(";")[0] for k,v in headers if k=="Set-Cookie" and v.startswith("youwith_session="))
        self.assertEqual(self.request("/api/me",session)[0],200)
        self.assertEqual(self.request("/",session)[0],200)
        with auth.connect(self.database) as db:
            self.assertEqual(db.execute("SELECT count(*) FROM users").fetchone()[0],1)
        auth.set_approval(self.database, member["id"], False)
        self.assertEqual(self.request("/api/me",session)[0],401)
        self.assertEqual(self.request("/app.js",session)[0],303)

    def test_provider_failure_no_session_or_secret_in_logs(self):
        state, cookie = self.start()
        with patch.object(auth, "fetch_identity", side_effect=ValueError("secret provider response")), patch.object(auth.Handler,"log_message") as log:
            status, headers, _ = self.callback(state,cookie, "sensitive-code")
        self.assertIn("failed", dict(headers)["Location"])
        logged=str(log.call_args_list)
        self.assertNotIn("sensitive-code", logged)
        self.assertNotIn(state, logged)

    def test_provider_requests_and_no_extra_personal_data(self):
        with patch.object(kakao_login,"fetch_json",side_effect=[{"access_token":"test-token"},{"id":12345,"kakao_account":{"email":"unused"}}]) as provider:
            self.assertEqual(kakao_login.fetch_identity(self.server.kakao,"code"),"12345")
        requests = [call.args[0] for call in provider.call_args_list]
        self.assertEqual(requests[0].full_url,"https://kauth.kakao.com/oauth/token")
        self.assertEqual(parse_qs(requests[0].data.decode())["client_secret"],["test-secret-only"])
        self.assertEqual(requests[1].full_url,"https://kapi.kakao.com/v2/user/me")
        self.assertEqual(requests[1].headers["Authorization"],"Bearer test-token")
        for identity in [True,0,"123",None]:
            with patch.object(kakao_login,"fetch_json",side_effect=[{"access_token":"token"},{"id":identity}]):
                with self.assertRaises(ValueError): kakao_login.fetch_identity(self.server.kakao,"code")

    def test_existing_password_database_migrates_without_data_loss(self):
        legacy=Path(self.temp.name)/'legacy.sqlite3'
        with auth.connect(legacy) as db:
            db.execute("CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password_hash TEXT NOT NULL)")
            db.execute("INSERT INTO users VALUES ('old-id','old-name','salt','hash')")
        auth.initialize(legacy)
        auth.initialize(legacy)
        with auth.connect(legacy) as db:
            member=db.execute("SELECT * FROM users").fetchone()
            self.assertEqual(member['id'],'old-id')
            self.assertEqual(member['password_hash'],'hash')
            self.assertEqual(member['approved'],1)
            self.assertIsNone(member['kakao_id'])


if __name__ == "__main__": unittest.main()
