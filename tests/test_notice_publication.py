import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import check_notice_sources as audit
from public_notice_apis import normalize_item,PROVIDERS
from refresh_notices import application_period,category,relevant

class PublicationTests(unittest.TestCase):
    def test_publication_cell_not_title_deadline(self):
        html='<tr><td><a href="/?uid=1&mod=document">AI 공모전 모집(~12/31)</a></td><td class="kboard-list-date">2026.11.16</td></tr>'
        entries=audit.entries_for({'id':'software'},'https://example.org/',html,[{'title':'AI 공모전 모집(~12/31)','url':'https://example.org/?uid=1&mod=document'}])
        self.assertEqual(entries[0]['publishedAt'],'2026-11-16')
        self.assertEqual(audit.row_publication_date('<tr><td><a>모집 2026-12-31</a></td></tr>'),None)
        self.assertEqual(audit.row_publication_date('<tr><td>2026-02-30</td></tr>'),None)
        self.assertEqual(audit.row_publication_date('<tr><td>2026-01-01</td><td>2026-02-01</td></tr>'),None)

    def test_api_publication_not_application_deadline(self):
        for provider in PROVIDERS[:2]:
            row=({'biz_pbanc_nm':'2026 AI 창업 경진대회 모집','biz_aply_url':'https://example.org/1','pbanc_noti_dt':'20261116'} if provider['id']=='kstartup' else {'title':'2026 반도체 지원사업 모집','viewUrl':'https://example.org/2','regDate':'2026-11-15'})
            item=normalize_item(provider,row,application_period,category,relevant,'2026-11-17')
            self.assertTrue(item['publishedAt'].startswith('2026-11-'))
            self.assertIsNone(item['endsAt'])
