import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from refresh_notices import application_period, relevant, article_html, post_key


class PeriodTests(unittest.TestCase):
    def test_application_range_and_event_date_are_separate(self):
        result = application_period({'title': '2026 AI 교육 모집'}, '<p>접수기간: 2026.11.01 ~ 11.20</p><p>교육기간: 2026.12.01 ~ 12.20</p>')
        self.assertEqual((result['startsAt'], result['endsAt']), ('2026-11-01', '2026-11-20'))

    def test_event_only_is_not_a_deadline(self):
        result = application_period({'title': '2026 AI 교육 모집(11.20)'}, '<p>교육일: 2026.11.20</p>')
        self.assertIsNone(result['endsAt'])

    def test_unknown_year_is_not_invented(self):
        self.assertIsNone(application_period({'title': 'AI 경진대회 모집'}, '<p>접수기간: 11.1 ~ 11.20</p>')['endsAt'])

    def test_two_digit_year_and_new_year(self):
        self.assertEqual(application_period({'title': 'SW 경진대회 모집'}, '<p>접수기간 26.12.10 ~ 27.01.05</p>')['endsAt'], '2027-01-05')

    def test_multiple_rounds_require_confirmation(self):
        self.assertIsNone(application_period({'title': '2026 AI 대회 모집'}, '<p>접수기간 2026.11.1 ~ 11.10</p><p>추가 모집기간 2026.11.12 ~ 11.15</p>')['endsAt'])

    def test_navigation_cannot_make_an_unrelated_notice_relevant(self):
        body = article_html('<nav>소프트웨어 공학</nav><div class="view_body"><p>간호학과 실습 모집</p></div>')
        self.assertNotIn('소프트웨어', body)
        self.assertFalse(relevant({'id':'jnu'}, '간호학과 실습 모집', body))

    def test_inline_date_spans_remain_together(self):
        body = article_html('<div class="view_body"><p>접수기간 <span>2026.11.1</span> ~ <span>11.20</span></p></div>')
        self.assertEqual(application_period({'title':'AI 교육 모집'}, body)['endsAt'], '2026-11-20')

    def test_scholarship_academic_year_does_not_shift_application_year(self):
        entry = {'title':'2027년도 장학생 모집(~11/19)', 'publishedAt':'2026-11-01'}
        result = application_period(entry, '<p>신청기간: ‘26. 11. 9.(월) ~11. 19.(목) 18:00</p>')
        self.assertEqual((result['startsAt'],result['endsAt']), ('2026-11-09','2026-11-19'))

    def test_title_body_disagreement_is_not_presented_as_confirmed(self):
        entry = {'title':'2026 AI 공모전(~12/25)', 'publishedAt':'2026-11-01'}
        self.assertIsNone(application_period(entry, '<p>접수기간 2026.11.01 ~ 12.15</p>')['endsAt'])

    def test_pinned_software_post_deduplicates_across_list_pages(self):
        source = {'id':'software'}
        first = post_key(source, {'url':'https://sojoong.kr/notice/notice-board/?pageid=1&mod=document&uid=123'})
        second = post_key(source, {'url':'https://sojoong.kr/notice/notice-board/?pageid=2&mod=document&uid=123'})
        self.assertEqual(first, second)

    def test_conflicting_starts_do_not_become_a_confirmed_range(self):
        result = application_period({'title':'AI 교육 모집'}, '<p>신청기간 2026.11.01 ~ 11.20</p><p>모집기간 2026.11.10 ~ 11.20</p>')
        self.assertIsNone(result['endsAt'])

    def test_deadline_only_and_matching_full_range_can_merge(self):
        entry = {'title':'AI 교육 모집', 'deadline':'2026-11-20'}
        result = application_period(entry, '<p>신청기간 2026.11.01 ~ 11.20</p>')
        self.assertEqual((result['startsAt'], result['endsAt']), ('2026-11-01', '2026-11-20'))


if __name__ == '__main__':
    unittest.main()
