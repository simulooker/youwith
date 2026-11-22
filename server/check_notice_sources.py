"""Read-only, one-shot source audit. No login, credentials, or recurring jobs.

Usage: python server/check_notice_sources.py
Results: db/audit/notice-source-check.json, db/audit/notice-pages/<id>.html
"""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path
import json
import html
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCES = json.loads((ROOT / 'db/notice-sources.json').read_text(encoding='utf-8'))
OUT = ROOT / 'db/audit'
PAGES = OUT / 'notice-pages'
sys.stdout.reconfigure(encoding='utf-8')


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.active = []
        self.title = []
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'title':
            self.in_title = True
        if tag == 'a':
            self.active.append({'url': attrs.get('href', ''), 'text': [], 'label': attrs.get('title', '')})

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag == 'a' and self.active:
            item = self.active.pop()
            item['text'] = re.sub(r'\s+', ' ', ''.join(item['text'])).strip() or item.pop('label')
            self.links.append(item)

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)
        for item in self.active:
            item['text'].append(data)


def get(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'YouWith-NoticeCheck/0.1 (public-notice compatibility check)', 'Accept': 'text/html,application/xml,text/xml;q=0.9,*/*;q=0.5'})
    try:
        with urllib.request.urlopen(request, timeout=18) as response:
            raw = response.read(4_000_000)
            status, final_url, content_type = response.status, response.geturl(), response.headers.get('Content-Type', '')
            charset = response.headers.get_content_charset()
    except urllib.error.URLError as error:
        if 'CERTIFICATE_VERIFY_FAILED' not in str(error) or sys.platform != 'win32':
            raise
        # Windows curl uses the OS certificate store. Certificate verification stays enabled.
        run = subprocess.run(['curl.exe', '--location', '--fail', '--silent', '--show-error', '--max-time', '18', '--write-out', '\nYOUWITH_HTTP:%{http_code}\t%{url_effective}\t%{content_type}', url], capture_output=True, timeout=22)
        if run.returncode:
            raise RuntimeError(run.stderr.decode('utf-8', errors='replace').strip()) from error
        raw, meta = run.stdout.rsplit(b'\nYOUWITH_HTTP:', 1)
        status_text, final_url, content_type = meta.decode('utf-8').split('\t', 2)
        status, charset = int(status_text), None
    if not charset:
        match = re.search(br'charset\s*=\s*["\']?([\w-]+)', raw[:5000], re.I)
        charset = match.group(1).decode('ascii') if match else 'utf-8'
    return status, final_url, raw.decode(charset, errors='replace'), content_type


def plain(fragment):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', fragment))).strip()


DATE_NODE = re.compile(r'<(?:span|div|td)\b[^>]*class=["\'][^"\']*\b(?:date|kboard-list-date)\b[^"\']*["\'][^>]*>.*?</(?:span|div|td)>',re.S|re.I)

def row_publication_date(row,allow_time=False):
    # Explicit publication metadata may be inside the same cell/link as a title.
    values=[plain(match.group(0)) for match in DATE_NODE.finditer(row)]
    if allow_time:values+=re.findall(r'<time\b[^>]*datetime=["\']([^"\']+)',row,re.I)
    if not values:
        values=[plain(cell) for cell in re.findall(r'<td\b[^>]*>(.*?)</td>',row,re.S|re.I) if not re.search(r'<a\b|<strong\b',cell,re.I)]
    dates=[]
    for value in values:
        match=re.fullmatch(r'(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\.?\s*(?:(?:T| )?\d{1,2}:\d{2}(?::\d{2})?(?:[+-]\d{2}:\d{2}|Z)?)?',value)
        if not match:continue
        try:dates.append(date(*map(int,match.groups())).isoformat())
        except ValueError:continue
    return dates[0] if len(set(dates))==1 else None


def attach_publication_dates(entries,text,final_url='',source_id=None):
    if source_id=='grow':return entries  # Program/application timestamps are not publication dates.
    metadata={}
    for row in re.findall(r'<tr\b.*?</tr>|<li\b.*?</li>',text,re.S|re.I):
        stamp=row_publication_date(row,allow_time=source_id=='education')
        if not stamp:continue
        parser=Links();parser.feed(DATE_NODE.sub('',row))
        for link in parser.links:
            url=urllib.parse.urljoin(final_url,html.unescape(link['url']))
            if url in metadata and metadata[url][0]!=stamp:metadata[url]=(None,None)
            else:metadata[url]=(stamp,link['text'])
    for entry in entries:
        value=metadata.get(urllib.parse.urljoin(final_url,entry['url']))
        if value and value[0]:
            entry['publishedAt']=value[0]
            if value[1] and source_id in ('engineering','software'):entry['title']=value[1]
    return entries


def entries_for(source, final_url, text, links):
    """Small site adapters; preserve public source titles without guessing deadlines."""
    source_id = source['id']
    entries = []
    if source_id in ('nccoss', 'aicoss'):
        for row in re.findall(r'<tr\b.*?</tr>', text, re.S | re.I):
            post = re.search(r'movePageView\((\d+)\)', row)
            title = re.search(r'<strong\b[^>]*class="cutText"[^>]*>(.*?)</strong>', row, re.S)
            if not post or not title:
                continue
            hidden = re.search(r'id="b_link_\d+"\s+value="([^"]+)"', row)
            url = hidden.group(1) if hidden and hidden.group(1).startswith(('https://', 'http://')) else urllib.parse.urljoin(final_url, 'view/' + post.group(1))
            entries.append({'title': plain(title.group(1)), 'url': html.unescape(url)})
    elif source_id == 'grow':
        for block in re.findall(r'<a\b[^>]*href="[^"]*/program/intro/view/[^>]*>.*?</a>', text, re.S | re.I):
            href = re.search(r'href="([^"]+)"', block)
            title = re.search(r'<b\b[^>]*class="title"[^>]*>(.*?)</b>', block, re.S)
            if href and title:
                item = {'title': plain(title.group(1)), 'url': urllib.parse.urljoin(final_url, href.group(1))}
                apply_dates = re.search(r'신청:</span>(.*?)</small>', block, re.S)
                dates = re.findall(r'datetime="([^"]+)"', apply_dates.group(1)) if apply_dates else []
                if dates:
                    item['deadline'] = dates[-1][:10]
                    if len(dates) > 1:
                        item['startsAt'] = dates[0][:10]
                entries.append(item)
    else:
        patterns = {
            'allcon': r'/hit/(?:contest|event)/\d+',
            'jnu': r'boardID=5.*bbsMode=view',
            'eceng': r'/bbs/eceng/3287/\d+/artclView',
            'engineering': r'/bbs/eng/993/\d+/artclView',
            'semiconductor': r'menu=63.*mode=view',
            'software': r'uid=\d+.*mod=document|mod=document.*uid=\d+',
            'icee': r'/bbs/icee/2798/\d+/artclView',
            'career': r'/(?:Board/Board|RecrProgram/RegProgram\d*)\.aspx\?.*(?:Mode=View|mode=view)',
            'education': r'/ko/(?:learning|community|division|teaching)/notice/view/',
        }
        entries = [dict(link) for link in links if re.search(patterns[source_id], link['url'], re.I)]
    unique = {}
    for entry in entries:
        entry['title'] = re.sub(r'\s*새글\s*$', '', entry['title']).strip()
        if entry['title']:
            unique.setdefault(entry['url'], entry)
    return attach_publication_dates(list(unique.values()),text,final_url,source_id)


def detail_access(entry, status, url, body):
    observed = re.sub(r'\s+', '', entry['title'])[:12] in re.sub(r'\s+', '', plain(body))
    restricted = re.search(r'/(?:member/)?login(?:[./?]|$)', url, re.I) or (not observed and (
        re.search(r'alert\([^)]*(?:로그인|접근권한|접근 권한)', body, re.I)
        or re.search(r'회원\s*로그인[이가]?\s*필요', plain(body))
    ))
    return {'status': status, 'url': url, 'loginRequired': bool(restricted), 'titleObserved': observed}


def check(source):
    result = dict(source, checkedAt=datetime.now(timezone(timedelta(hours=9))).isoformat(timespec='seconds'))
    try:
        status, final_url, text, content_type = get(source['url'])
        (PAGES / f"{source['id']}.html").write_text(text, encoding='utf-8')
        parser = Links()
        parser.feed(text)
        links = []
        seen = set()
        for item in parser.links:
            href = urllib.parse.urljoin(final_url, item['url'])
            if not href.startswith(('https://', 'http://')) or (href, item['text']) in seen:
                continue
            seen.add((href, item['text']))
            links.append({'title': item['text'], 'url': href})
        result.update(httpStatus=status, finalUrl=final_url, pageTitle=''.join(parser.title).strip(), contentType=content_type, links=links)
        entries = entries_for(source, final_url, text, links)
        result['entries'] = entries
        result['entryCount'] = len(entries)
        if entries:
            try:
                detail_status, detail_url, detail_html, _ = get(entries[0]['url'])
                (PAGES / f"{source['id']}-detail.html").write_text(detail_html, encoding='utf-8')
                result['detail'] = detail_access(entries[0], detail_status, detail_url, detail_html)
            except Exception as error:
                result['detail'] = {'error': str(error)}
        feed = next((item['url'] for item in links if 'RSS' in item['title'].upper()), None)
        if feed:
            try:
                feed_status, feed_final, feed_text, _ = get(feed)
                tree = ET.fromstring(feed_text)
                items = tree.findall('.//item')
                result['rss'] = {'url': feed_final, 'status': feed_status, 'items': len(items), 'validXml': True}
                result['feedEntries'] = [{'title': plain(item.findtext('title', '')), 'url': item.findtext('link', ''), 'publishedAt': item.findtext('pubDate', '')} for item in items]
            except Exception as error:
                result['rss'] = {'url': feed, 'error': str(error)}
    except Exception as error:
        result['error'] = str(error)
    print(json.dumps({key: value for key, value in result.items() if key not in ('links', 'entries', 'feedEntries', 'contentType')}, ensure_ascii=False), flush=True)
    return result


def make_snapshot(results):
    sources = []
    include = re.compile(r'모집|공모|경진|대회|해커톤|서포터즈|장학|지원|인턴|교육|캡스톤|프로젝트|견학|부트캠프|AI', re.I)
    exclude = re.compile(r'폭력|안전교육|전공배정|졸업|학점교류|대학원|수강신청|선정\s*결과|결과\s*발표|본선진출|중간발표|합격자|신청\s*결과|교수|강사|AICOSS\s*레터|전세피해|만족도조사|현황조')
    for result in results:
        entries = [dict(entry, url=urllib.parse.urljoin(result['url'], entry['url'])) for entry in (result.get('feedEntries') or result.get('entries', []))]
        candidates = [entry for entry in entries if include.search(entry['title']) and not exclude.search(entry['title'])]
        if result['id'] in ('allcon', 'jnu'):
            # Broad portals: put ECE-relevant opportunities ahead of unrelated generic listings.
            candidates.sort(key=lambda entry: bool(re.search(r'AI|SW|소프트웨어|반도체|통신|데이터|보안|로봇|임베디드|창업|경진|공모|서포터즈', entry['title'], re.I)), reverse=True)
        seen_titles = set()
        unique_candidates = []
        for entry in candidates:
            normalized = entry['title'].casefold()
            if normalized not in seen_titles:
                unique_candidates.append(entry)
                seen_titles.add(normalized)
        candidates = unique_candidates
        notices = []
        for entry in candidates[:5]:
            title = entry['title']
            category = '모집·프로그램'
            for pattern, label in [('공모|경진|해커톤|대회', '대회·공모전'), ('서포터즈|기자단', '서포터즈'), ('인턴|채용', '인턴·취업'), ('장학|지원사업|지원금|장려금|마일리지', '지원·장학'), ('교육|강의|특강|견학|부트캠프', '교육·체험'), ('취업', '인턴·취업')]:
                if re.search(pattern, title):
                    category = label
                    break
            notices.append(dict(entry, category=category))
        detail = result.get('detail', {})
        verified = result.get('httpStatus') == 200 and result.get('entryCount', 0) > 0
        status = 'partial' if verified and detail.get('loginRequired') else 'verified' if verified and detail.get('titleObserved') else 'unverified'
        note = '공개 목록과 대표 게시글을 확인했어요.' if detail.get('titleObserved') else '공개 공지 목록을 확인했어요.'
        if status == 'partial':
            note = '제목 목록은 공개돼요. 확인한 본문은 학교 로그인이 필요해요.'
        if status == 'unverified':
            note = '접속 또는 게시글 추출을 추가 확인해야 해요.'
        if result['id'] == 'allcon':
            note += ' 정기 수집 전 이용조건·제휴 여부 확인이 필요해요.'
        sources.append({key: result[key] for key in ('id', 'name', 'url', 'kind')} | {
            'checkedAt': result['checkedAt'], 'status': status, 'note': note,
            'method': 'RSS' if result.get('rss', {}).get('validXml') else '공개 게시판',
            'sampleCount': result.get('entryCount', 0), 'feedCount': result.get('rss', {}).get('items', 0),
            'detailChecked': detail, 'notices': notices,
        })
    snapshot = {'checkedAt': max(result['checkedAt'] for result in results), 'sources': sources}
    # Keep user-visible data separate from the audit evidence and page implementation.
    (OUT / 'notice-audit-snapshot.js').write_text('const NOTICE_AUDIT = ' + json.dumps(snapshot, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    lines = ['# 12개 공지 출처 확인 결과', '', '확인 기준: ' + snapshot['checkedAt'], '', '기술적 공개 접근 검사이며 수집·재게시 이용허락 또는 공식 API 제공 확인을 뜻하지 않습니다. 대표 본문 1건 검사이며 모든 게시물·첨부파일 접근을 보장하지 않습니다.', '', '| 출처 | 공개 목록 | 대표 본문 | RSS | 방식 |', '|---|---|---|---|---|']
    for source in sources:
        detail = source['detailChecked']
        body = '로그인 필요' if detail.get('loginRequired') else '본문 제목 확인' if detail.get('titleObserved') else '추가 확인 필요'
        lines.append(f"| [{source['name']}]({source['url']}) | {source['sampleCount']}건 추출 | {body} | {str(source['feedCount']) + '건 확인' if source['feedCount'] else '미확인'} | {source['method']} |")
    lines += ['', '사이트 공모전 탭에는 관심 유형 키워드로 추린 최대 5건씩 표시합니다. 제목·원문 링크를 유지하며, 기한·지원 자격을 추정하지 않습니다. 자동 갱신 일정은 설정하지 않았습니다.', '', '취업진로포털의 로그인 제한은 우회하지 않았습니다. 올콘은 정기 수집·재게시 전 이용조건 또는 제휴 범위를 확인해야 합니다.']
    (OUT / 'notice-sources.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')


if __name__ == '__main__':
    PAGES.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(check, SOURCES))
    (OUT / 'notice-source-check.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    make_snapshot(results)
