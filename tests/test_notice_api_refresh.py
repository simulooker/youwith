import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'server'))
import refresh_notices as refresh


class ApiOnlyRefreshTests(unittest.TestCase):
    def test_api_only_refresh_preserves_twelve_institution_snapshots(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            (root/'db').mkdir();(root/'frontend').mkdir()
            sources=[{'id':source['id'],'notices':[],'checkedAt':'2026-11-15T09:00:00+09:00','status':'existing'} for source in refresh.audit.SOURCES]
            previous={'checkedAt':'2026-11-15T09:00:00+09:00','sources':sources+[{'id':'other','notices':[],'status':'pending'}]}
            (root/'db/notice-refresh.json').write_text(json.dumps(previous),encoding='utf-8')
            updated={'id':'other','status':'verified','notices':[{'title':'AI 모집'}]}
            with patch.object(refresh,'ROOT',root),patch.object(refresh,'collect') as institutions,patch.object(refresh,'collect_other',return_value=updated) as api:
                refresh.main(apis_only=True)
                institutions.assert_not_called()
                self.assertEqual(api.call_args.args[0]['status'],'pending')
            saved=json.loads((root/'db/notice-refresh.json').read_text(encoding='utf-8'))
            self.assertEqual(saved['sources'][:12],sources)
            self.assertEqual(saved['sources'][-1],updated)
            self.assertEqual(json.loads((root/'frontend/notices.json').read_text(encoding='utf-8')),saved)

    def test_missing_base_snapshots_do_not_replace_existing_data(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'db').mkdir();(root/'frontend').mkdir()
            original=json.dumps({'sources':[]})
            path=root/'db/notice-refresh.json';path.write_text(original,encoding='utf-8')
            with patch.object(refresh,'ROOT',root),patch.object(refresh,'collect_other') as api:
                with self.assertRaises(RuntimeError):refresh.main(apis_only=True)
                api.assert_not_called()
            self.assertEqual(path.read_text(encoding='utf-8'),original)


if __name__=='__main__':unittest.main()
