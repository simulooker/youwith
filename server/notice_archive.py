"""Server-side accumulated notice metadata; never downloads remote content."""
import json
from notice_window import within_window
from urllib.parse import urlsplit, urlunsplit, parse_qsl, urlencode

def identity(item):
    parts=urlsplit(item['url'])
    # Only discard the known K2Web presentation parameter, never routing/program ids.
    query=urlencode([(k,v) for k,v in parse_qsl(parts.query,keep_blank_values=True) if k!='layout'])
    return urlunsplit((parts.scheme,parts.netloc,parts.path,query,''))

def retain(root, source, result, previous, today):
    if source.get('collection')=='link-only':
        result['notices']=[]
        return result
    path=root/'db'/'notice-archive'/(source['id']+'.json')
    saved=[]
    if path.exists():
        # Do not silently overwrite an unreadable archive.
        saved=json.loads(path.read_text(encoding='utf-8'))
    merged={identity(item):dict(item) for item in saved}
    for item in (previous or {}).get('notices',[]):
        key=identity(item)
        if key not in merged:
            merged[key]=dict(item,firstSeenAt=item.get('firstSeenAt') or previous.get('checkedAt'),lastSeenAt=item.get('lastSeenAt') or previous.get('checkedAt'))
    if result.get('status') not in ('unverified','failed','missing-key','pending'):
        for item in result['notices']:
            key=identity(item);old=merged.get(key,{})
            updated=old | {k:v for k,v in item.items() if v is not None and v!=''}
            for field in ('publishedAt','startsAt','endsAt'):updated.setdefault(field,None)
            updated['firstSeenAt']=old.get('firstSeenAt') or result['checkedAt']
            updated['lastSeenAt']=result['checkedAt']
            # Observation dates are deliberately separate from the original publication date.
            merged[key]=updated
    archived=list(merged.values())
    for item in archived:
        end=item.get('endsAt');start=item.get('startsAt')
        item['status']='closed' if end and end<today else 'upcoming' if end and start and start>today else 'open' if end else 'unknown'
    path.parent.mkdir(parents=True,exist_ok=True)
    temporary=path.with_suffix('.tmp')
    temporary.write_text(json.dumps(archived,ensure_ascii=False,indent=2),encoding='utf-8');temporary.replace(path)
    result['notices']=[item for item in archived if item['status']!='closed' and within_window(item.get('publishedAt'),today)]
    result['archivedCount']=len(archived)
    return result
