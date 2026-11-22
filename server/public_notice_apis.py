"""Official data.go.kr notice adapters. Keys never leave the server as output."""
from datetime import date, datetime
from notice_window import within_window
import html
import json
import os
from pathlib import Path
import re
import time
from urllib.parse import urlencode, urlsplit, unquote
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

PROVIDERS = [
    {"id":"kstartup", "name":"K-Startup", "key":"KSTARTUP_SERVICE_KEY", "keyParam":"serviceKey", "url":"https://www.k-startup.go.kr/", "endpoint":"https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01"},
    {"id":"mss", "name":"중소벤처기업부", "key":"MSS_SERVICE_KEY", "keyParam":"serviceKey", "url":"https://www.mss.go.kr/", "endpoint":"https://apis.data.go.kr/1421000/mssBizService_v2/getbizList_v2"},
    {"id":"msit", "name":"과기정통부", "key":"MSIT_SERVICE_KEY", "keyParam":"ServiceKey", "url":"https://www.msit.go.kr/", "endpoint":"https://apis.data.go.kr/1721000/msitannouncementinfo/businessAnnouncMentList"},
]
OTHER_NAME = "기타(K-Startup, 중소벤처기업부, 과기정통부)"


def empty_other():
    return {"id":"other", "name":OTHER_NAME, "url":"https://www.data.go.kr/", "kind":"공식 API 공고",
            "collectionScope":"official-api", "method":"공식 API", "status":"pending", "checkedAt":None,
            "notices":[], "errors":[], "coverage":"", "note":"공식 API 연결을 준비 중이에요.",
            "apiProviders":[{"id":p["id"],"name":p["name"],"status":"missing-key"} for p in PROVIDERS]}


def load_keys(path):
    values = json.loads(Path(path).read_text(encoding="utf-8-sig")) if Path(path).exists() else {}
    if not isinstance(values, dict): raise ValueError("Invalid settings")
    common = os.environ.get("DATA_GO_KR_SERVICE_KEY", values.get("DATA_GO_KR_SERVICE_KEY", ""))
    if not isinstance(common, str): raise ValueError("Invalid common key")
    keys = {}
    for provider in PROVIDERS:
        value = os.environ.get(provider["key"], values.get(provider["key"], ""))
        if not isinstance(value, str): raise ValueError("Invalid provider key")
        keys[provider["key"]] = value.strip() or common.strip()
    return keys


def fetch_page(provider, key, page):
    params = {provider["keyParam"]:unquote(key.strip())}
    if provider["id"] == "kstartup":
        params.update(page=page, perPage=50, returnType="json")
        params["cond[rcrt_prgs_yn::EQ]"] = "Y"
    else:
        params.update(pageNo=page, numOfRows=50)
    request=Request(provider["endpoint"] + "?" + urlencode(params), headers={"User-Agent":"YouWith-NoticeCollector/1.0"})
    with urlopen(request, timeout=25) as response:
        payload=response.read(5_000_001)
        if len(payload)>5_000_000: raise ValueError("API response too large")
    return parse_page(payload)


def parse_page(payload):
    text=payload.decode("utf-8-sig") if isinstance(payload, bytes) else payload
    if text.lstrip().startswith(("{", "[")):
        data=json.loads(text)
        if not isinstance(data,dict): raise ValueError("Unexpected JSON")
        if data.get("error") or data.get("status_code",0) not in (0,200,"0","200"):
            raise ValueError("API rejected request")
        if "data" not in data or not isinstance(data["data"],list): raise ValueError("Missing API data")
        total=data.get("matchCount",data.get("totalCount"))
        return data["data"], int(total) if total is not None else None
    root=ET.fromstring(text)
    tag=lambda node:node.tag.rsplit("}",1)[-1]
    codes=[(node.text or "").strip() for node in root.iter() if tag(node)=="resultCode"]
    if not codes or any(code not in {"00","0","0000"} for code in codes): raise ValueError("API rejected request")
    items=[{tag(child):"".join(child.itertext()).strip() for child in node}
           for node in root.iter() if tag(node)=="item"]
    total=next((node.text for node in root.iter() if tag(node)=="totalCount"),None)
    return items,int(total) if total else None


def text(value):
    return re.sub(r"\s+"," ",html.unescape(re.sub(r"<[^>]*>"," ",str(value or "")))).strip()


def iso_date(value):
    value=str(value or "").strip()
    for candidate,fmt,pattern in ((value[:8],"%Y%m%d",r"\d{8}"),(value[:10],"%Y-%m-%d",r"\d{4}-\d{2}-\d{2}"),(value[:10],"%Y.%m.%d",r"\d{4}\.\d{2}\.\d{2}")):
        if not re.fullmatch(pattern,candidate):continue
        try:return datetime.strptime(candidate,fmt).date().isoformat()
        except ValueError:pass
    return None


def safe_url(value):
    value=html.unescape(str(value or "")).strip()
    if value.startswith("www."):value="https://"+value
    try:
        parsed=urlsplit(value)
        if parsed.scheme in {"http","https"} and parsed.hostname and not parsed.username and not parsed.password:
            return value
    except ValueError:pass
    return None


def normalize_item(provider, row, period_parser, category, relevant, today):
    if not isinstance(row,dict):return None
    kind=provider["id"]
    title=text(row.get("biz_pbanc_nm") if kind=="kstartup" else row.get("title") if kind=="mss" else row.get("subject"))
    content=str(row.get("pbanc_ctnt") if kind=="kstartup" else row.get("dataContents") if kind=="mss" else "")
    # These endpoints already provide opportunities; relevance checks still exclude unrelated fields.
    if not title or not relevant({"id":kind},title+" 모집",text(content)):
        return None
    if kind=="kstartup" and str(row.get("rcrt_prgs_yn","")).upper()=="N":return None
    urls=[row.get("biz_aply_url"),row.get("detl_pg_url")] if kind=="kstartup" else [row.get("viewUrl")]
    url=next((valid for value in urls if (valid:=safe_url(value))),None)
    if not url:return None
    start=iso_date(row.get("pbanc_rcpt_bgng_dt") if kind=="kstartup" else row.get("applicationStartDate"))
    end=iso_date(row.get("pbanc_rcpt_end_dt") if kind=="kstartup" else row.get("applicationEndDate"))
    published=iso_date(row.get("pressDt") if kind=="msit" else row.get("pbanc_noti_dt") if kind=="kstartup" else row.get("regDate"))
    if published and not within_window(published,today):return None
    period={"startsAt":start,"endsAt":end,"dateNote":"","dateEvidence":"공식 API의 신청기간"}
    if start and end and start>end:
        period={"startsAt":None,"endsAt":None,"dateNote":"모집기간 확인 필요","dateEvidence":""}
    elif not end:
        # Only API-provided text is examined; linked web pages and attachments are not crawled.
        period=period_parser({"title":title,"publishedAt":published or ""},content)
        if not period.get("startsAt"):period["startsAt"]=start
    if period.get("endsAt") and period["endsAt"]<today:return None
    return {"title":title,"url":url,**period,"category":category(title),
            "status":"unknown" if not period.get("endsAt") else "upcoming" if period.get("startsAt") and period["startsAt"]>today else "open",
            "providerId":kind,"providerName":provider["name"],"publishedAt":published,
            "externalId":str(row.get("pbanc_sn") or row.get("itemId") or "")}


def collect_other(previous, settings_path, checked_at, period_parser, category, relevant, cached=False,
                  fetch=fetch_page, sleep=time.sleep, max_pages=200):
    result=empty_other()
    previous=previous or {}
    today=checked_at[:10]
    prior=[item for item in previous.get("notices",[]) if not item.get("endsAt") or item["endsAt"]>=today]
    if cached:
        result.update({key:previous[key] for key in result if key in previous})
        result["notices"]=prior
        return result
    try:keys=load_keys(settings_path)
    except (OSError,ValueError,TypeError):
        result.update(status="unverified",notices=prior,errors=["공지 API 설정 파일 형식을 확인해주세요."])
        return result
    result["apiProviders"]=[]
    successful=0
    for provider in PROVIDERS:
        record={"id":provider["id"],"name":provider["name"],"status":"missing-key","pageCount":0,"scannedCount":0,"checkedAt":None}
        key=keys.get(provider["key"],"")
        selected=[]
        print(provider["name"] + ": 연결 확인", flush=True)
        if isinstance(key,str) and key.strip():
            try:
                for page in range(1,max_pages+1):
                    if page>1:sleep(1.2)
                    rows,total=fetch(provider,key,page)
                    record["pageCount"]=page
                    record["scannedCount"]+=len(rows)
                    record["totalCount"]=total
                    for row in rows:
                        item=normalize_item(provider,row,period_parser,category,relevant,today)
                        if item:selected.append(item)
                    if not rows or (total is not None and record["scannedCount"]>=total) or (total is None and len(rows)<50):break
                else:
                    record["limitReached"]=True
                record.update(status="verified",checkedAt=checked_at)
                successful+=1
            except Exception:
                # Never expose exception text: provider errors can contain a request URL with the key.
                record["status"]="failed"
                record["error"]="API 응답을 확인하지 못했어요. 인증키·승인 상태·호출 한도를 확인해주세요."
                result["errors"].append(provider["name"]+": API 수집 실패")
                selected=[item for item in prior if item.get("providerId")==provider["id"]]
                record["checkedAt"]=next((p.get("checkedAt") for p in previous.get("apiProviders",[]) if p.get("id")==provider["id"]),None)
        else:
            selected=[item for item in prior if item.get("providerId")==provider["id"]]
        result["notices"].extend(selected)
        result["apiProviders"].append(record)
        print(provider["name"] + ": " + record["status"] + " / " + str(len(selected)) + "건", flush=True)
    result["status"]="verified" if successful==3 else "partial" if successful or prior else "pending"
    result["checkedAt"]=checked_at if successful else previous.get("checkedAt")
    waiting=[p["name"] for p in result["apiProviders"] if p["status"]=="missing-key"]
    result["note"]=("연결 대기: "+", ".join(waiting)) if waiting else "일부 API를 갱신하지 못했어요." if result["errors"] else ""
    result["coverage"]=f"공식 API {successful}/3곳 갱신 · 확인 {sum(p['scannedCount'] for p in result['apiProviders'])}건"
    return result
