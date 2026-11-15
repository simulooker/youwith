"""Daily public notice refresh: source adapters, explicit application dates, no login.

Run with Python 3.10+. No third-party packages. Schedule is managed by Codex.
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
import json
import hashlib
import argparse
from pathlib import Path
import re
import time
from urllib.error import HTTPError
from urllib.parse import urljoin, urlsplit, urlunsplit
from robots_policy import RobotsPolicy
import xml.etree.ElementTree as ET

import check_notice_sources as audit

ROOT = audit.ROOT
KST = timezone(timedelta(hours=9))
BOT = 'YouWith-NoticeCheck'
TECH = re.compile(r'\bAI\b|\bSW\b|\bIT\b|\bICT\b|소프트웨어|전자|컴퓨터|반도체|통신|프로그래밍|코딩|데이터|인공지능|로봇|임베디드|해커톤|캡스톤|정보보안|사이버|클라우드|자율주행|개발자|디지털|빅데이터|머신러닝|딥러닝|공학', re.I)
OPPORTUNITY = re.compile(r'모집|신청|접수|공모|경진|대회|해커톤|서포터즈|지원사업|인턴|교육|프로그램|장학|부트캠프|캡스톤|프로젝트')
EXCLUDE = re.compile(r'결과\s*발표|선정\s*결과|합격자|현황조|만족도|채용공고|교원|교수|조교|교육공무원|대학원생|대학원\s*신입|초중고|초등|중학생|고등학생|졸업|수강신청|학점교류|안전교육|폭력|백일장|전공배정')
CORE = {'eceng', 'nccoss', 'aicoss', 'semiconductor', 'software', 'icee', 'engineering'}
DATE = re.compile(r'(?:(20\d{2})\s*[.년/\-]\s*)?(\d{1,2})\s*[.월/\-]\s*(\d{1,2})\s*일?')
APPLICATION = re.compile(r'(?:(?:모집|접수|신청|지원|제출|공모)\s*(?:기간|일정|기한|마감)|원서\s*접수)')


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style', 'noscript'):
            self.hidden += 1
        if tag in ('p', 'div', 'tr', 'li', 'br', 'h1', 'h2', 'h3', 'dt', 'dd', 'label'):
            self.parts.append('\n')

    def handle_endtag(self, tag):
        if tag in ('script', 'style', 'noscript'):
            self.hidden = max(0, self.hidden - 1)
        if tag in ('p', 'div', 'tr', 'li', 'dt', 'dd'):
            self.parts.append('\n')

    def handle_data(self, value):
        if not self.hidden:
            self.parts.append(value)


class Article(HTMLParser):
    """Extract known article containers, excluding navigation and related notices."""
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.depth = 0
        self.parts = []

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        markers = set(values.get('class', '').split()) | {values.get('id', '')}
        roots = {'contest_field', 'contest_body', 'view-con', 'view_body', 'kboard-content', 'viewContainer-content', 'page_view', 'description'}
        if not self.depth and markers & roots:
            self.depth = 1
        elif self.depth and tag not in {'br','hr','img','input','meta','link','source','wbr'}:
            self.depth += 1
        if self.depth:
            self.parts.append(self.get_starttag_text())

    def handle_endtag(self, tag):
        if self.depth:
            self.parts.append(f'</{tag}>')
            self.depth -= 1

    def handle_data(self, value):
        if self.depth:
            self.parts.append(value)

    def handle_entityref(self, name):
        if self.depth:
            self.parts.append(f'&{name};')

    def handle_charref(self, name):
        if self.depth:
            self.parts.append(f'&#{name};')


def article_html(body):
    parser = Article()
    parser.feed(body)
    return ''.join(parser.parts)


def text_lines(body):
    # Only the article's date-bearing passages are exported, never its full body.
    parser = Text()
    parser.feed(body)
    return [re.sub(r'\s+', ' ', s).strip() for s in ''.join(parser.parts).splitlines() if s.strip()]


def dates_in(fragment, year=None):
    fragment = re.sub(r'(?<!\d)(2\d)\s*\.\s*(\d{1,2})\s*\.\s*(\d{1,2})(?!\d)', r'20\1.\2.\3', fragment)
    dates = []
    current_year = year
    for match in DATE.finditer(fragment):
        explicit, month, day = match.groups()
        if explicit:
            current_year = int(explicit)
        if not current_year:
            continue
        try:
            value = date(current_year, int(month), int(day))
            if dates and value < dates[-1] and not explicit and dates[-1].month == 12 and value.month == 1:
                value = date(current_year + 1, int(month), int(day))
            dates.append(value)
        except ValueError:
            continue
    return dates


def application_period(entry, body):
    title = entry['title']
    # Academic/scholarship year in a title is not necessarily the application year.
    year = None
    if entry.get('publishedAt'):
        try:
            year = parsedate_to_datetime(entry['publishedAt']).year
        except (ValueError, TypeError):
            published_year = re.search(r'20\d{2}', entry['publishedAt'])
            year = int(published_year[0]) if published_year else None
    found = []
    lines = text_lines(body)
    for index, line in enumerate(lines):
        label = APPLICATION.search(line)
        if not label:
            continue
        snippet = line[label.start():]
        # Tables often put the label and value on separate lines. Do not consume event dates.
        if not DATE.search(snippet):
            for next_line in lines[index + 1:index + 4]:
                if re.search(r'교육기간|운영기간|행사|발표|심사|교육일|운영일', next_line):
                    break
                snippet += ' ' + next_line
                if DATE.search(next_line):
                    break
        snippet = re.split(r'교육기간|운영기간|행사일|발표일|심사기간', snippet)[0][:260]
        values = dates_in(snippet, year)
        if values:
            found.append((values[0] if len(values) > 1 else None, values[-1], snippet))
    if entry.get('deadline'):
        try:
            found.insert(0, (date.fromisoformat(entry['startsAt']) if entry.get('startsAt') else None, date.fromisoformat(entry['deadline']), '공개 목록의 신청기간'))
        except ValueError:
            pass
    # Title shorthand is usable only when its year is explicitly known.
    if year and re.search(r'~|까지|마감', title):
        tail = re.search(r'(?:\([^)]*(?:~|까지)|접수|신청|~|마감)([^\n]{0,100})', title)
        values = dates_in(tail[0], year) if tail else []
        if values:
            found.append((values[0] if len(values) > 1 else None, values[-1], title))
    unique = {(start, end) for start, end, _ in found}
    if len(unique) > 1:
        # A notice with multiple rounds or contradictory dates needs human confirmation.
        ends = {end for _, end in unique}
        starts = {start for start, _ in unique if start is not None}
        if len(ends) > 1 or len(starts) > 1:
            return {'startsAt': None, 'endsAt': None, 'dateNote': '복수 일정 · 원문 확인', 'dateEvidence': ''}
    if found:
        start, end, evidence = max(found, key=lambda item: bool(item[0]))
        return {'startsAt': start.isoformat() if start else None, 'endsAt': end.isoformat(), 'dateNote': '', 'dateEvidence': evidence}
    return {'startsAt': None, 'endsAt': None, 'dateNote': '모집기간 확인 필요', 'dateEvidence': ''}


def relevant(source, title, body=''):
    if EXCLUDE.search(title) or not OPPORTUNITY.search(title):
        return False
    return bool(TECH.search(title) or (source['id'] in CORE) or TECH.search(body))


def category(title):
    for pattern, label in [('공모|경진|해커톤|대회', '대회·공모전'), ('서포터즈|기자단', '서포터즈'), ('인턴|채용', '인턴·취업'), ('장학|지원사업|지원금|장려금|마일리지', '지원·장학'), ('교육|강의|특강|견학|부트캠프', '교육·체험')]:
        if re.search(pattern, title):
            return label
    return '모집·프로그램'


class Reader:
    def __init__(self, cached=False):
        self.robots = {}
        self.last_request = {}
        self.requests = 0
        self.cached = cached
        self.oldest = time.time()

    def read(self, url):
        cache = ROOT / 'db/notice-cache' / (hashlib.sha256(url.encode()).hexdigest() + '.json')
        if self.cached:
            if not cache.exists():
                raise RuntimeError('보관 응답 없음 · 다음 수집 시 확인')
            self.oldest = min(self.oldest, cache.stat().st_mtime)
            return json.loads(cache.read_text(encoding='utf-8'))
        split = urlsplit(url)
        origin = f'{split.scheme}://{split.netloc}'
        if origin not in self.robots:
            robot = RobotsPolicy()
            try:
                status, _, text, _ = audit.get(origin + '/robots.txt')
                robot.parse(text.splitlines() if status == 200 else [])
            except HTTPError as error:
                if error.code not in (404, 410):
                    raise RuntimeError(f'robots.txt 확인 불가 ({error.code})') from error
                robot.parse([])
            except Exception as error:
                raise RuntimeError('robots.txt 확인 불가: ' + str(error)) from error
            self.robots[origin] = robot
            self.last_request[origin] = time.monotonic()
        robot = self.robots[origin]
        if not robot.can_fetch(BOT, url):
            raise PermissionError('robots.txt 수집 제한')
        cache = ROOT / 'db/notice-cache' / (hashlib.sha256(url.encode()).hexdigest() + '.json')
        if cache.exists() and time.time() - cache.stat().st_mtime < 1800:
            return json.loads(cache.read_text(encoding='utf-8'))
        wait = max(1.2, robot.crawl_delay(BOT) or 0)
        time.sleep(max(0, self.last_request.get(origin, 0) + wait - time.monotonic()))
        self.last_request[origin] = time.monotonic()
        self.requests += 1
        response = audit.get(url)
        cache.parent.mkdir(exist_ok=True)
        cache.write_text(json.dumps(response, ensure_ascii=False), encoding='utf-8')
        return response


def links_from(url, body):
    parser = audit.Links()
    parser.feed(body)
    return [{'title': row['text'], 'url': urljoin(url, row['url'])} for row in parser.links]


def post_key(source, entry):
    if source['id'] == 'software':
        match = re.search(r'[?&]uid=(\d+)', entry['url'])
        if match:
            return 'uid:' + match[1]
    return entry['url']


def collect_public_home(source, previous, reader, result):
    """Only the explicitly public homepage; never request detail links or pagination."""
    result.update(status='partial', collectionScope='public-home-list', method='공개 첫 화면 목록', note='공개 첫 화면 목록만 수집 · 상세 본문은 읽지 않아요.')
    try:
        status, final, text, _ = reader.read(source['url'])
        if status != 200:
            raise RuntimeError(f'공개 첫 화면 확인 실패 ({status})')
        parser = audit.Links()
        parser.feed(text)
        links = [{'title': item['text'], 'url': item['url']} for item in parser.links]
        entries = audit.entries_for(source, final, text, links)
        seen = set()
        today = datetime.now(KST).date().isoformat()
        for entry in entries:
            url = urljoin(final, entry['url'])
            if urlsplit(url).scheme not in ('http', 'https') or url in seen:
                continue
            seen.add(url)
            if not relevant(source, entry['title'], ''):
                continue
            period = application_period(entry, '')
            if period['endsAt'] and period['endsAt'] < today:
                continue
            item = {'title': entry['title'], 'url': url, **period, 'category': category(entry['title']), 'status': 'unknown', 'detailNotCollected': True}
            if item['endsAt']:
                item['status'] = 'upcoming' if item['startsAt'] and item['startsAt'] > today else 'open'
            result['notices'].append(item)
        result.update(pageCount=1, scannedCount=len(entries), coverage=f'공개 첫 화면 1페이지 · 목록 {len(entries)}건 확인 · 상세 미수집')
        if reader.cached:
            result['checkedAt'] = datetime.fromtimestamp(reader.oldest, KST).isoformat(timespec='seconds')
    except Exception as error:
        result.update(status='unverified', note='공개 첫 화면 갱신 실패', errors=[str(error)])
        if previous and previous.get('collectionScope') == 'public-home-list':
            result['notices'] = [item for item in previous.get('notices', []) if not item.get('endsAt') or item['endsAt'] >= datetime.now(KST).date().isoformat()]
            result['checkedAt'] = previous.get('checkedAt', result['checkedAt'])
    (ROOT / 'db').mkdir(parents=True, exist_ok=True)
    (ROOT / 'db' / f"notice-latest-{source['id']}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return result


def collect(source, previous, cached=False):
    reader = Reader(cached)
    checked = datetime.now(KST).isoformat(timespec='seconds')
    result = {key: source[key] for key in ('id', 'name', 'url', 'kind')}
    result.update(checkedAt=checked, notices=[], status='verified', note='', method='공개 게시판', coverage='', errors=[])
    if source.get('collection') == 'link-only':
        result.update(status='link-only', note=source['collectionNote'], coverage='자동 수집하지 않음')
        return result
    if source.get('collection') == 'public-home-list':
        return collect_public_home(source, previous, reader, result)
    seen, entries, queue = set(), {}, [source['url']]
    pages = 0
    # A bounded scan is explicit in coverage; it never claims to cover inaccessible archives.
    while queue and pages < 20:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        try:
            _, final, body, _ = reader.read(url)
            pages += 1
            links = links_from(final, body)
            for entry in audit.entries_for(source, final, body, links):
                entries.setdefault(post_key(source, entry), entry)
            feed = next((item['url'] for item in links if 'RSS' in item['title'].upper()), None)
            if feed and result['method'] != 'RSS':
                _, feed_final, xml, _ = reader.read(feed)
                items = ET.fromstring(xml).findall('.//item')
                for item in items:
                    entry = {'title': audit.plain(item.findtext('title', '')), 'url': urljoin(feed_final, item.findtext('link', '')), 'publishedAt': item.findtext('pubDate', '')}
                    entries[entry['url']] = entries.get(entry['url'], {}) | entry
                result['method'] = 'RSS'
            for link in links:
                target = link['url']
                # Follow only pagination visibly supplied by the same board, never invented URLs.
                if urlsplit(target).netloc != urlsplit(source['url']).netloc:
                    continue
                if (link['title'].isdigit() or re.search(r'다음페이지|다음|next|»', link['title'], re.I)) and re.search(r'[?&](?:page|pageid|pageIndex)=\d+', target, re.I):
                    if target not in seen and target not in queue:
                        queue.append(target)
        except Exception as error:
            result['errors'].append(str(error))
            break
    today = datetime.now(KST).date().isoformat()
    candidates = [entry for entry in entries.values() if urlsplit(entry['url']).scheme in ('http', 'https') and OPPORTUNITY.search(entry['title']) and not EXCLUDE.search(entry['title'])]
    current_year = datetime.now(KST).year
    candidates = [entry for entry in candidates if not re.findall(r'20\d{2}', entry['title']) or max(map(int, re.findall(r'20\d{2}', entry['title']))) >= current_year]
    if source['id'] not in CORE:
        candidates = [entry for entry in candidates if TECH.search(entry['title'])]
    # Read every candidate in the scanned sources, not a five-item sample.
    for entry in candidates:
        title_period = application_period(entry, '')
        if title_period['endsAt'] and title_period['endsAt'] < today:
            continue
        body, restricted = '', False
        try:
            _, final, body, _ = reader.read(entry['url'])
            restricted = audit.detail_access(entry, 200, final, body)['loginRequired']
            if restricted:
                result['status'] = 'partial'
        except Exception as error:
            result['errors'].append(entry['url'] + ': ' + str(error))
        body = article_html(body) if not restricted else ''
        article = '\n'.join(text_lines(body))
        if not relevant(source, entry['title'], article):
            continue
        period = application_period(entry, body if not restricted else '')
        if period['endsAt'] and period['endsAt'] < today:
            continue
        notice = {key: entry[key] for key in ('title', 'url')}
        notice.update(period, category=category(entry['title']), loginRequired=restricted, status='unknown')
        if period['endsAt']:
            notice['status'] = 'upcoming' if period['startsAt'] and period['startsAt'] > today else 'open'
        result['notices'].append(notice)
        if restricted:
            result['status'] = 'partial'
    result['scannedCount'] = len(entries)
    if cached:
        result['checkedAt'] = datetime.fromtimestamp(reader.oldest, KST).isoformat(timespec='seconds')
    result['pageCount'] = pages
    result['coverage'] = f'공개 목록 {pages}페이지 · 공지 {len(entries)}건 확인' + (' · 탐색 상한 도달' if queue and pages >= 20 else '')
    if result['errors']:
        result['status'] = 'partial' if pages else 'unverified'
        result['note'] = '일부 접근 제한 · 확인 가능한 공지만 표시'
    if not pages and previous:
        # A transient failure must not erase the last successful refresh or pretend it is fresh.
        result['notices'] = [item for item in previous.get('notices', []) if not item.get('endsAt') or item['endsAt'] >= today]
        result['checkedAt'] = previous.get('checkedAt', checked)
        result['note'] = '갱신 실패 · 이전에 확인한 자료'
    print(json.dumps({'id': source['id'], 'pages': pages, 'scanned': len(entries), 'notices': len(result['notices']), 'errors': len(result['errors'])}, ensure_ascii=False), flush=True)
    (ROOT / 'db' / f"notice-latest-{source['id']}.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    return result


def main(cached=False):
    (ROOT / 'db').mkdir(parents=True, exist_ok=True)
    output = ROOT / 'frontend/notice-data.js'
    previous = {}
    if output.exists():
        old = json.loads(output.read_text(encoding='utf-8').split('=', 1)[1].strip().rstrip(';'))
        previous = {s['id']: s for s in old['sources']}
    with ThreadPoolExecutor(max_workers=3) as pool:
        sources = list(pool.map(lambda source: collect(source, previous.get(source['id']), cached), audit.SOURCES))
    data = {'checkedAt': datetime.now(KST).isoformat(timespec='seconds'), 'schedule': '매일 09:00 · 한국 시간', 'sources': sources}
    temp = output.with_suffix('.tmp')
    temp.write_text('let NOTICE_DATA = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    temp.replace(output)
    json_output = ROOT / 'frontend/notices.json'
    json_temp = json_output.with_suffix('.tmp')
    json_temp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    json_temp.replace(json_output)
    (ROOT / 'db/notice-refresh.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cached', action='store_true', help='네트워크 요청 없이 보관 응답의 날짜 분석만 재검증')
    main(parser.parse_args().cached)
