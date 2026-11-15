import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('notices', ROOT / 'server/check_notice_sources.py')
notices = importlib.util.module_from_spec(spec)
spec.loader.exec_module(notices)


class NoticeParsingTests(unittest.TestCase):
    def test_image_link_does_not_hide_the_actual_title(self):
        source = {'id': 'allcon'}
        links = [{'title': '', 'url': 'https://www.all-con.co.kr/hit/contest/123'}, {'title': 'AI 공모전', 'url': 'https://www.all-con.co.kr/hit/contest/123'}]
        entries = notices.entries_for(source, 'https://www.all-con.co.kr/', '', links)
        self.assertEqual(len(entries), 1)
        self.assertEqual(entries[0]['title'], 'AI 공모전')

    def test_javascript_board_link_is_resolved_without_running_javascript(self):
        html = '<tr><td><a href="javascript:movePageView(390);"><strong class="cutText">ETRI 견학 &amp; 교육</strong></a><input id="b_link_390" value="0"></td></tr>'
        entries = notices.entries_for({'id': 'nccoss'}, 'https://jnu.nccoss.kr/www/notice/', html, [])
        self.assertEqual(entries[0], {'title': 'ETRI 견학 & 교육', 'url': 'https://jnu.nccoss.kr/www/notice/view/390'})

    def test_application_deadline_is_not_confused_with_event_date(self):
        html = '<a href="/ko/program/intro/view/1"><b class="title">AI 교육</b><small><time datetime="2026-12-10">운영</time></small><small><span class="date_title">신청:</span><time datetime="2026-10-01">시작</time><time datetime="2026-11-15">끝</time></small></a>'
        entry = notices.entries_for({'id': 'grow'}, 'https://grow.jnu.ac.kr/', html, [])[0]
        self.assertEqual(entry['deadline'], '2026-11-15')

    def test_login_messages_for_optional_actions_do_not_hide_public_content(self):
        entry = {'title': 'AI 경진대회 참가 모집'}
        public = '<h1>AI 경진대회 참가 모집</h1><p>공개 모집 요강</p><script>function bookmark(){alert("로그인 후 이용해주세요")}</script>'
        self.assertFalse(notices.detail_access(entry, 200, 'https://example.org/view/1', public)['loginRequired'])
        blocked = '<form id="iModuleErrorForm"><h1>회원로그인이 필요합니다.</h1></form>'
        self.assertTrue(notices.detail_access(entry, 200, 'https://example.org/view/1', blocked)['loginRequired'])


if __name__ == '__main__':
    unittest.main()
