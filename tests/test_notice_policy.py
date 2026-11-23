import sys,unittest,tempfile
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from robots_policy import RobotsPolicy
import refresh_notices as refresh

class RobotsTests(unittest.TestCase):
    def policy(self,text):
        p=RobotsPolicy();p.parse(text.splitlines());return p
    def test_bom_does_not_hide_disallow(self):
        p=self.policy('\ufeffUser-agent: *\nDisallow: /\nAllow: /$')
        self.assertTrue(p.can_fetch('YouWith-NoticeCheck','https://example.org/'))
        self.assertFalse(p.can_fetch('YouWith-NoticeCheck','https://example.org/bbs/eceng/rssList.do'))
    def test_terminal_anchor_and_wildcard(self):
        p=self.policy('User-agent: *\nDisallow: /\nAllow: /sites/*/index.do$')
        self.assertTrue(p.can_fetch('bot','https://x/sites/demo/index.do'))
        self.assertFalse(p.can_fetch('bot','https://x/sites/demo/index.do/private'))
    def test_specific_groups_merge_and_ignore_wildcard_group(self):
        p=self.policy('User-agent: *\nDisallow: /\nUser-agent: YouWith\nAllow: /public\nUser-agent: YouWith\nDisallow: /private\nCrawl-delay: 3')
        self.assertTrue(p.can_fetch('YouWith-NoticeCheck','https://x/public/1'))
        self.assertFalse(p.can_fetch('YouWith-NoticeCheck','https://x/private/1'))
        self.assertEqual(p.crawl_delay('YouWith-NoticeCheck'),3)
    def test_longest_rule_allow_tie_and_percent_normalization(self):
        p=self.policy('User-agent: *\nDisallow: /public\nAllow: /public/abc\nDisallow: /same\nAllow: /same')
        self.assertTrue(p.can_fetch('bot','https://x/public/a%62c'))
        self.assertFalse(p.can_fetch('bot','https://x/public/no'))
        self.assertTrue(p.can_fetch('bot','https://x/same'))
    def test_html_robots_response_is_not_an_allow(self):
        with self.assertRaisesRegex(RuntimeError,'HTML'):
            self.policy('<!doctype html><html>login</html>')
    def test_reader_does_not_request_blocked_body_even_if_cached(self):
        calls=[]
        def get(url):
            calls.append(url)
            return (200,url,'\ufeffUser-agent: *\nDisallow: /','text/plain')
        with patch.object(refresh.audit,'get',get):
            with self.assertRaises(PermissionError):refresh.Reader().read('https://blocked.test/detail')
        self.assertEqual(calls,['https://blocked.test/robots.txt'])

class DirectOnlyTests(unittest.TestCase):
    def test_homepage_fallback_never_requests_network(self):
        source={'id':'grow','name':'Grow','url':'https://grow.example/','kind':'program','collection':'public-home-list'}
        with patch.object(refresh.Reader,'read') as read:
            result=refresh.collect(source,None)
        read.assert_not_called()
        self.assertEqual(result['status'],'link-only')
        self.assertEqual(result['notices'],[])

    def test_old_homepage_archive_cannot_restore_unsupported_notices(self):
        from notice_archive import retain
        source={'id':'grow','collection':'public-home-list'}
        result={'status':'partial','notices':[{'title':'AI 모집','url':'https://example.org/1'}]}
        with tempfile.TemporaryDirectory() as directory:
            data=retain(Path(directory),source,result,result,'2026-11-23')
        self.assertEqual(data['status'],'link-only')
        self.assertEqual(data['notices'],[])

if __name__=='__main__':unittest.main()
