"""Conservative robots rules for this notice collector (BOM, * and terminal $)."""
import re
import math
from urllib.parse import urlsplit, quote

def _normalize(value):
    value=quote(value,safe="/%?=&:*$+;,@!()'~.-_")
    def percent(match):
        char=chr(int(match[1],16))
        return char if re.fullmatch(r'[A-Za-z0-9._~-]',char) else '%'+match[1].upper()
    return re.sub(r'%([0-9A-Fa-f]{2})',percent,value)

class RobotsPolicy:
    def __init__(self):
        self.groups=[]

    def parse(self,lines):
        text='\n'.join(lines).lstrip('\ufeff')
        if re.search(r'<!doctype\s+html|<html\b',text,re.I):
            raise RuntimeError('robots.txt 대신 HTML이 반환됨 · 정책 확인 필요')
        self.groups=[]
        group=None
        directives=False
        for line in text.splitlines():
            line=line.split('#',1)[0].strip()
            if ':' not in line:continue
            key,value=[x.strip() for x in line.split(':',1)]
            key=key.lower()
            if key=='user-agent':
                if not value:continue
                if group is None or directives:
                    group={'agents':[],'rules':[],'delays':[]}
                    self.groups.append(group)
                    directives=False
                group['agents'].append(value.lower())
            elif key in ('allow','disallow','crawl-delay'):
                if group is None:
                    raise RuntimeError('robots.txt User-agent 그룹 확인 불가')
                directives=True
                if key=='crawl-delay':
                    try:
                        number=float(value)
                        if math.isfinite(number) and number>=0:group['delays'].append(number)
                    except ValueError:pass
                elif value:
                    group['rules'].append((key=='allow',_normalize(value)))

    def _selected(self,agent):
        agent=agent.lower()
        scored=[]
        for group in self.groups:
            score=max((0 if name=='*' else len(name) for name in group['agents'] if name=='*' or name in agent),default=-1)
            if score>=0:scored.append((score,group))
        best=max((score for score,_ in scored),default=-1)
        return [group for score,group in scored if score==best]

    def can_fetch(self,agent,url):
        split=urlsplit(url)
        target=_normalize((split.path or '/')+('?' + split.query if split.query else ''))
        matches=[]
        for group in self._selected(agent):
            for allow,pattern in group['rules']:
                anchored=pattern.endswith('$')
                raw=pattern[:-1] if anchored else pattern
                regex='^'+re.escape(raw).replace(r'\*','.*')+('$' if anchored else '')
                if re.search(regex,target):matches.append((len(raw.replace('*','').encode('utf-8')),allow))
        return max(matches,default=(0,True))[1]

    def crawl_delay(self,agent):
        return max((delay for group in self._selected(agent) for delay in group['delays']),default=None)
