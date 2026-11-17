import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from public_notice_apis import collect_other, parse_page, normalize_item, PROVIDERS, iso_date, load_keys
from refresh_notices import application_period, category, relevant


class PublicApiTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.path=Path(self.temp.name)/'keys.json'
        self.path.write_text(json.dumps({p['key']:'test-only-secret' for p in PROVIDERS}),encoding='utf-8')
        self.env=patch.dict(os.environ,{p['key']:'test-only-secret' for p in PROVIDERS})
        self.env.start()

    def tearDown(self):
        self.env.stop();self.temp.cleanup()

    def collect(self,previous=None,**kwargs):
        return collect_other(previous,self.path,'2026-11-16T09:00:00+09:00',application_period,category,relevant,sleep=lambda _:None,**kwargs)

    def row(self,id):
        if id=='kstartup':return {'biz_pbanc_nm':'2026 AI 창업 경진대회 모집','biz_aply_url':'https://example.org/notice?id=1','pbanc_rcpt_bgng_dt':'20261101','pbanc_rcpt_end_dt':'20261201','rcrt_prgs_yn':'Y'}
        if id=='mss':return {'title':'2026 반도체 지원사업 모집','viewUrl':'https://example.org/notice?id=2','applicationStartDate':'2026-11-01','applicationEndDate':'2026-12-02'}
        return {'subject':'2026 인공지능 연구개발 사업공고','viewUrl':'https://example.org/notice?id=3','pressDt':'2026-11-12'}

    def test_common_key_reaches_all_three_apis(self):
        self.path.write_text(json.dumps({"DATA_GO_KR_SERVICE_KEY":"common-test-key"}),encoding='utf-8')
        with patch.dict(os.environ,{},clear=True):
            self.assertEqual(set(load_keys(self.path).values()),{'common-test-key'})
            received=[]
            def fetch(provider,key,page):
                received.append((provider['id'],key))
                return [self.row(provider['id'])],1
            result=self.collect(fetch=fetch)
        self.assertEqual(len(received),3)
        self.assertTrue(all(key=='common-test-key' for _,key in received))
        self.assertEqual(result['status'],'verified')
        self.assertNotIn('common-test-key',json.dumps(result))

    def test_provider_override_and_environment_precedence(self):
        self.path.write_text(json.dumps({'DATA_GO_KR_SERVICE_KEY':'file-common','MSS_SERVICE_KEY':'file-mss','MSIT_SERVICE_KEY':'   '}),encoding='utf-8')
        with patch.dict(os.environ,{'DATA_GO_KR_SERVICE_KEY':'env-common','KSTARTUP_SERVICE_KEY':'env-kstartup'},clear=True):
            keys=load_keys(self.path)
        self.assertEqual(keys['KSTARTUP_SERVICE_KEY'],'env-kstartup')
        self.assertEqual(keys['MSS_SERVICE_KEY'],'file-mss')
        self.assertEqual(keys['MSIT_SERVICE_KEY'],'env-common')

    def test_all_providers_and_unknown_period(self):
        result=self.collect(fetch=lambda p,k,n:([self.row(p['id'])],1))
        self.assertEqual(result['status'],'verified')
        self.assertEqual(len(result['notices']),3)
        by={x['providerId']:x for x in result['notices']}
        self.assertEqual(by['kstartup']['endsAt'],'2026-12-01')
        self.assertEqual(by['mss']['endsAt'],'2026-12-02')
        self.assertIsNone(by['msit']['endsAt'])
        self.assertEqual(by['msit']['status'],'unknown')
        self.assertEqual(by['msit']['dateNote'],'모집기간 확인 필요')
        self.assertNotIn('test-only-secret',json.dumps(result))

    def test_missing_keys_do_not_make_requests(self):
        with patch.dict(os.environ,{p['key']:'' for p in PROVIDERS}):
            def forbidden(*args):raise AssertionError('must not fetch')
            result=self.collect(fetch=forbidden)
        self.assertEqual(result['status'],'pending')
        self.assertEqual(len(result['apiProviders']),3)
        self.assertTrue(all(p['status']=='missing-key' for p in result['apiProviders']))

    def test_failure_preserves_unexpired_previous_and_redacts_key(self):
        previous={'notices':[{'title':'기존 AI 모집','providerId':'kstartup','endsAt':'2026-12-01'}, {'title':'마감 공지','providerId':'mss','endsAt':'2026-01-01'}]}
        def failed(*args):raise RuntimeError('URL?serviceKey=test-only-secret')
        result=self.collect(previous,fetch=failed)
        self.assertEqual(len(result['notices']),1)
        self.assertEqual(result['status'],'partial')
        self.assertNotIn('test-only-secret',json.dumps(result))
        self.assertEqual(len(result['errors']),3)

    def test_pagination_and_missing_dates_never_use_registration_date(self):
        calls=[]
        def fetch(p,k,page):
            calls.append((p['id'],page))
            return [self.row(p['id'])],51
        result=self.collect(fetch=fetch,max_pages=2)
        self.assertEqual(len(calls),6)
        self.assertEqual([x['pageCount'] for x in result['apiProviders']],[2,2,2])
        self.assertTrue(all(not x['endsAt'] for x in result['notices'] if x['providerId']=='msit'))

    def test_api_actual_page_size_overrides_requested_page_size(self):
        def fetch(provider,key,page):
            return [self.row(provider['id'])]*10,30
        result=self.collect(fetch=fetch)
        self.assertEqual([p['pageCount'] for p in result['apiProviders']],[3,3,3])
        self.assertEqual([p['scannedCount'] for p in result['apiProviders']],[30,30,30])
        self.assertTrue(all(not p.get('limitReached') for p in result['apiProviders']))

    def test_parsers_empty_and_authentication_errors(self):
        self.assertEqual(parse_page('{"data":[],"matchCount":0}'),([],0))
        rows,total=parse_page('<response><header><resultCode>00</resultCode></header><body><items><item><title>AI 모집</title><viewUrl>https://example.org/1</viewUrl></item></items><totalCount>1</totalCount></body></response>')
        self.assertEqual(total,1);self.assertEqual(rows[0]['title'],'AI 모집')
        self.assertEqual(parse_page('<response><header><resultCode>00</resultCode></header><body><items/><totalCount>0</totalCount></body></response>'),([],0))
        for payload in ['{"error":"bad key"}', '{"error":"bad key","data":[]}', '{"status_code":401,"data":[]}', '<response><header><resultCode>30</resultCode></header></response>', '<html>Access denied</html>']:
            with self.assertRaises(ValueError):parse_page(payload)

    def test_invalid_expired_dates_and_unsafe_links(self):
        for bad in ['20260230','2026-13-01','2026111']:
            self.assertIsNone(iso_date(bad))
        row=self.row('kstartup');row['pbanc_rcpt_end_dt']='20260101'
        # Contradictory ranges remain unknown, rather than inventing a corrected date.
        item=normalize_item(PROVIDERS[0],row,application_period,category,relevant,'2026-11-16')
        self.assertEqual(item['status'],'unknown')
        row['pbanc_rcpt_bgng_dt']='20250101'
        self.assertIsNone(normalize_item(PROVIDERS[0],row,application_period,category,relevant,'2026-11-16'))
        row=self.row('kstartup');row['biz_aply_url']='javascript:alert(1)'
        self.assertIsNone(normalize_item(PROVIDERS[0],row,application_period,category,relevant,'2026-11-16'))


if __name__=='__main__':unittest.main()
