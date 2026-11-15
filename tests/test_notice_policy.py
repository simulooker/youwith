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

class HomepageTests(unittest.TestCase):
    def test_partial_collection_never_follows_detail_url(self):
        html='<a href="/ko/program/intro/view/1"><b class="title">2099 AI 교육 모집</b><small><span>신청:</span><time datetime="2099-01-01"></time><time datetime="2099-01-30"></time></small></a>'
        class Reader:
            cached=False
            def __init__(self):self.calls=[]
            def read(self,url):self.calls.append(url);return 200,url,html,'text/html'
        reader=Reader();source={'id':'grow','url':'https://grow.example/','name':'Grow'}
        result={'checkedAt':'2026-11-15','notices':[],'errors':[]}
        with tempfile.TemporaryDirectory() as d,patch.object(refresh,'ROOT',Path(d)):
            data=refresh.collect_public_home(source,None,reader,result)
        self.assertEqual(reader.calls,[source['url']])
        self.assertEqual(data['status'],'partial')
        self.assertEqual(data['collectionScope'],'public-home-list')
        self.assertEqual(data['notices'][0]['endsAt'],'2099-01-30')
        self.assertTrue(data['notices'][0]['detailNotCollected'])

if __name__=='__main__':unittest.main()
