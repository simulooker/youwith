import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('schedule', Path(__file__).resolve().parents[1] / 'server/notice_job.py')
schedule = importlib.util.module_from_spec(spec)
spec.loader.exec_module(schedule)


class ScheduledRefreshTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / 'frontend').mkdir()
        self.output = self.root / 'frontend/notices.json'
        self.output.write_text(json.dumps({'sources':[
            {'id':'public', 'status':'verified', 'errors':[], 'notices':[{'status':'open'},{'status':'upcoming'},{'status':'unknown'}]},
            {'id':'limited', 'status':'partial', 'errors':[], 'notices':[]},
            {'id':'held', 'status':'link-only', 'errors':[], 'notices':[]}
        ]}), encoding='utf-8')

    def tearDown(self):
        self.temp.cleanup()

    def status(self):
        return json.loads((self.root / 'db/notice-schedule-status.json').read_text(encoding='utf-8'))

    def test_direct_python_run_and_per_source_counts(self):
        with patch.object(schedule.subprocess, 'run', return_value=subprocess.CompletedProcess([],0)) as run:
            self.assertEqual(schedule.run(self.root),0)
        args=run.call_args
        self.assertEqual(args.args[0][1:3],['-X','utf8'])
        self.assertEqual(args.args[0][-1],str(self.root/'server/refresh_notices.py'))
        self.assertEqual(args.kwargs['cwd'],self.root)
        self.assertLess(args.kwargs['timeout'],3600)
        self.assertEqual(self.status()['status'],'success')
        self.assertEqual(self.status()['sources'][0]['counts'],{'open':1,'upcoming':1,'unknown':1})
        self.assertTrue((self.root / self.status()['log']).exists())

    def test_process_failure_preserves_previous_notices(self):
        original=self.output.read_bytes()
        with patch.object(schedule.subprocess,'run',return_value=subprocess.CompletedProcess([],2)):
            self.assertEqual(schedule.run(self.root),1)
        self.assertEqual(self.output.read_bytes(),original)
        self.assertEqual(self.status()['status'],'failed')
        self.assertIn('code 2',self.status()['error'])

    def test_timeout_records_failure_without_overwriting_notices(self):
        original=self.output.read_bytes()
        with patch.object(schedule.subprocess,'run',side_effect=subprocess.TimeoutExpired('collector',3300)):
            self.assertEqual(schedule.run(self.root),1)
        self.assertEqual(self.status()['status'],'failed')
        self.assertEqual(self.output.read_bytes(),original)

    def test_individual_source_errors_report_partial_run(self):
        self.output.write_text(json.dumps({'sources':[{'id':'public','status':'unverified','errors':['Unavailable'],'notices':[]}]}),encoding='utf-8')
        with patch.object(schedule.subprocess,'run',return_value=subprocess.CompletedProcess([],0)):
            self.assertEqual(schedule.run(self.root),1)
        self.assertEqual(self.status()['status'],'partial')
        self.assertEqual(self.status()['sources'][0]['errors'],['Unavailable'])


if __name__ == '__main__': unittest.main()
