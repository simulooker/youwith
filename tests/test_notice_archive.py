import sys,json,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
from notice_archive import retain

class ArchiveTests(unittest.TestCase):
 def test_disappearing_homepage_post_survives_restart_and_dates_are_not_erased(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);source={'id':'eceng','collection':'public-home-list'}
   def result(items,stamp='2099-01-01',status='partial'):return {'notices':items,'checkedAt':stamp,'status':status}
   first={'title':'AI 교육 모집','url':'https://x/bbs/eceng/1/2/artclView.do?layout=unknown','endsAt':'2099-01-10','publishedAt':'2099-01-01'}
   r=retain(root,source,result([first]),None,'2099-01-01')
   self.assertEqual(r['notices'][0]['publishedAt'],'2099-01-01')
   r=retain(root,source,result([],'2099-01-02'),None,'2099-01-02')
   self.assertEqual(len(r['notices']),1)
   self.assertEqual(r['notices'][0]['lastSeenAt'],'2099-01-01')
   new=dict(first,url='https://x/bbs/eceng/1/2/artclView.do',endsAt=None)
   r=retain(root,source,result([new],'2099-01-03'),None,'2099-01-03')
   self.assertEqual(len(r['notices']),1)
   self.assertEqual(r['notices'][0]['endsAt'],'2099-01-10')
   self.assertEqual(r['notices'][0]['firstSeenAt'],'2099-01-01')
   r=retain(root,source,result([],'2099-01-10'),None,'2099-01-10')
   self.assertEqual(r['notices'][0]['status'],'open')
   r=retain(root,source,result([],'2099-01-11'),None,'2099-01-11')
   self.assertEqual(r['notices'],[])
   self.assertEqual(json.loads((root/'db/notice-archive/eceng.json').read_text())[0]['status'],'closed')
 def test_failure_does_not_advance_observation_and_link_only_is_not_exported(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory);source={'id':'eceng'}
   old={'checkedAt':'2099-01-01','notices':[{'title':'AI 모집','url':'https://x/1','endsAt':None,'publishedAt':'2099-01-01'}]}
   r=retain(root,source,{'status':'unverified','checkedAt':'2099-01-02','notices':old['notices']},old,'2099-01-02')
   self.assertEqual(r['notices'][0]['lastSeenAt'],'2099-01-01')
   r=retain(root,{'id':'eceng','collection':'link-only'},r,old,'2099-01-02')
   self.assertEqual(r['notices'],[])
 def test_round_parameters_remain_distinct(self):
  with tempfile.TemporaryDirectory() as directory:
   r=retain(Path(directory),{'id':'grow'},{'status':'partial','checkedAt':'2099-01-01','notices':[{'title':'AI 모집','url':f'https://x/program?id={i}','publishedAt':'2099-01-01'} for i in [1,2]]},None,'2099-01-01')
   self.assertEqual(len(r['notices']),2)

class UndatedArchiveTests(unittest.TestCase):
 def test_recent_observation_does_not_make_an_unknown_publication_recent(self):
  with tempfile.TemporaryDirectory() as directory:
   root=Path(directory)
   result={'status':'partial','checkedAt':'2099-01-01','notices':[{'title':'AI 모집','url':'https://x/unknown','publishedAt':None}]}
   retain(root,{'id':'grow'},result,None,'2099-01-01')
   self.assertEqual(result['notices'],[])
   self.assertIsNone(json.loads((root/'db/notice-archive/grow.json').read_text())[0]['publishedAt'])
