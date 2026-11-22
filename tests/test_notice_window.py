import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from notice_window import cutoff,within_window,published_date
import check_notice_sources as audit

class WindowTests(unittest.TestCase):
 def test_calendar_months_boundary_leap_year_and_no_observation_fallback(self):
  self.assertEqual(str(cutoff('2026-11-21')),'2026-09-21')
  self.assertEqual(str(cutoff('2026-04-30')),'2026-02-28')
  self.assertEqual(str(cutoff('2024-04-30')),'2024-02-29')
  self.assertTrue(within_window('2026-09-21','2026-11-21'))
  for stamp in ['2026-09-20',None,'2026-02-30','2026-11-22']:
   self.assertFalse(within_window(stamp,'2026-11-21'))
  self.assertEqual(str(published_date('2026-09-20T16:00:00Z')),'2026-09-21')
 def test_dates_inside_title_cell_and_home_list(self):
  html='<tr><td><a href="/?uid=3&mod=document">AI 모집(~12/31)</a><div class="kboard-list-date"><span>2026.11.18</span></div></td></tr>'
  rows=audit.entries_for({'id':'software'},'https://x/',html,[{'url':'https://x/?uid=3&mod=document','title':'AI 모집(~12/31)'}])
  self.assertEqual(rows[0]['publishedAt'],'2026-11-18')
  html='<li><a href="/bbs/eceng/3287/123/artclView.do">AI 모집(~12/31)</a><span class="date">2026.11.20</span></li>'
  rows=audit.entries_for({'id':'eceng'},'https://x/',html,[{'url':'https://x/bbs/eceng/3287/123/artclView.do','title':'AI 모집(~12/31)'}])
  self.assertEqual(rows[0]['publishedAt'],'2026-11-20')
  html='<li><a href="/ko/learning/notice/view/1">AI 모집</a><time datetime="2026-10-15T11:00:00+09:00">10/15</time></li>'
  rows=audit.entries_for({'id':'education'},'https://x/',html,[{'url':'https://x/ko/learning/notice/view/1','title':'AI 모집'}])
  self.assertEqual(rows[0]['publishedAt'],'2026-10-15')
 def test_title_deadline_is_not_a_publication_date(self):
  self.assertIsNone(audit.row_publication_date('<li><a>2026-12-31 모집 마감</a></li>'))
  html='<a href="/ko/program/intro/view/1"><b class="title">AI 교육</b><small>신청:</span><time datetime="2026-10-01"></time><time datetime="2026-11-30"></time></small></a>'
  rows=audit.entries_for({'id':'grow'},'https://x/',html,[])
  self.assertNotIn('publishedAt',rows[0])
