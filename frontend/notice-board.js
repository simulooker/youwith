// 수집·날짜 분석: server/refresh_notices.py / 화면·검색·달력: 이 파일
let enabledNoticeSources = null,
  enabledNoticeTypes = null,
  sourceFilterOpen = false,
  typeFilterOpen = false,
  majorFilterOpen = false,
  noticeSearch = "",
  noticeView = "list",
  noticeGrouping = "source",
  noticeStatus = "all";
const collapsedNoticeSources = new Set();
const noticeToday = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(
    new Date(),
  );
let noticeMonth = noticeToday().slice(0, 7),
  noticeDay = noticeToday();

function filteredNotices(source) {
  if (enabledNoticeTypes === null)
    enabledNoticeTypes = new Set(NOTICE_CATEGORIES.map(([name]) => name));
  const query = noticeSearch.trim().toLowerCase();
  return source.notices.filter((item) => {
    if (!enabledNoticeTypes.has(item.category)) return false;
    if (!noticeMatchesMajor(item)) return false;
    if (item.endsAt && item.endsAt < noticeToday()) return false;
    if (noticeStatus === "active" && !item.endsAt) return false;
    if (noticeStatus === "unknown" && item.endsAt) return false;
    return `${item.title} ${item.category} ${item.providerName || ""} ${source.name}`
      .toLowerCase()
      .includes(query);
  });
}
function typeCheckboxes() {
  if (enabledNoticeTypes === null)
    enabledNoticeTypes = new Set(NOTICE_CATEGORIES.map(([name]) => name));
  return `<fieldset id="notice-types"><legend class="sr-only">게시글 유형</legend><div class="type-options">${NOTICE_CATEGORIES.map(([name, key]) => `<label class="institution-option"><input type="checkbox" data-notice-type="${name}" ${enabledNoticeTypes.has(name) ? "checked" : ""}><span>${name}</span></label>`).join("")}</div></fieldset>`;
}
function sourceSupported(source) {
  return source.collectionScope === "official-api" || source.status === "verified" || (source.status === "partial" && source.collectionScope === "public-home-list");
}
const NOTICE_SOURCE_GROUPS = [
  {id:"university",name:"전남대",sources:["jnu","eceng","engineering","grow","icee","career","education"]},
  {id:"programs",name:"사업단",sources:["nccoss","aicoss","semiconductor","software"]},
  {id:"external",name:"그 외",sources:["allcon","kstartup","mss","msit"]}
];
const NOTICE_API_SOURCES = [
  {id:"kstartup",name:"K-Startup",url:"https://www.k-startup.go.kr/"},
  {id:"mss",name:"중소벤처기업부",url:"https://www.mss.go.kr/"},
  {id:"msit",name:"과기정통부",url:"https://www.msit.go.kr/"}
];
function noticeSourceCatalog() {
  return NOTICE_DATA.sources.flatMap(source=>{
    if (source.id!=="other") return [source];
    return NOTICE_API_SOURCES.map(provider=>{
      const state=source.apiProviders?.find(item=>item.id===provider.id);
      const status=state?.status || source.status;
      return {
        ...provider,collectionScope:"official-api",status:status==="missing-key" ? "pending" : status,
        checkedAt:state?.checkedAt || source.checkedAt,
        notices:source.notices.filter(item=>item.providerId===provider.id || (!item.providerId && item.providerName===provider.name)),
        note:status==="missing-key" || status==="pending" ? "공식 API 연결 대기 중이에요." : status==="failed" ? "갱신하지 못해 이전에 확인한 공지를 표시해요." : "",
        coverage:state?.scannedCount!=null ? `공식 API · 확인 ${state.scannedCount}건${state.limitReached ? " · 탐색 상한 도달" : ""}` : "공식 API"
      };
    });
  });
}
function noticeSources() {
  const catalog=noticeSourceCatalog();
  if (enabledNoticeSources===null) enabledNoticeSources=new Set(catalog.filter(sourceSupported).map(source=>source.id));
  return catalog.filter(source=>sourceSupported(source) && enabledNoticeSources.has(source.id));
}
function sourceCheckbox(source) {
  if (!sourceSupported(source)) return `<div class="institution-unavailable"><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.name)} <span class="unsupported-label">(미지원)</span></a></div>`;
  const suffix=source.collectionScope==="public-home-list" ? " (목록만)" : source.status==="pending" ? " (연결 대기)" : "";
  return `<label class="institution-option"><input type="checkbox" data-notice-source="${source.id}" ${enabledNoticeSources.has(source.id) ? "checked" : ""}><span>${escapeHTML(source.name)}${suffix}</span></label>`;
}
function sourceCheckboxes() {
  noticeSources();
  const catalog=noticeSourceCatalog();
  const sections=NOTICE_SOURCE_GROUPS.map(group=>`<section class="notice-institution-group" data-source-group="${group.id}" aria-labelledby="notice-group-${group.id}"><h2 id="notice-group-${group.id}">${group.name}</h2><div class="institution-options">${group.sources.map(id=>catalog.find(source=>source.id===id)).filter(Boolean).map(sourceCheckbox).join("")}</div></section>`).join("");
  return `<fieldset class="notice-institutions" id="notice-institutions"><legend class="sr-only">공지 기관 선택</legend><div class="institution-actions"><button type="button" data-sources="all">전체 켜기</button><button type="button" data-sources="none">전체 끄기</button></div><div class="notice-institution-groups">${sections}</div></fieldset>`;
}
const NOTICE_MAJORS = [
  {
    "id": "computer",
    "label": "컴퓨터정보통신공학전공",
    "keywords": [
      "컴퓨터",
      "정보통신",
      "소프트웨어",
      "프로그래밍",
      "코딩",
      "개발자",
      "해커톤",
      "인공지능",
      "데이터",
      "보안",
      "클라우드",
      "파이썬",
      "Python",
      "SW",
      "AI",
      "ICT",
      "웹개발",
      "웹 개발",
      "앱개발",
      "앱 개발",
      "백엔드",
      "프론트엔드",
      "알고리즘",
      "운영체제",
      "데이터베이스",
      "머신러닝",
      "딥러닝",
      "컴퓨터비전",
      "자연어처리",
      "LLM",
      "네트워크",
      "통신",
      "무선",
      "5G",
      "6G",
      "위성통신",
      "IoT",
      "임베디드",
      "신호처리",
      "사이버보안",
      "정보보호",
      "C++",
      "Java",
      "JavaScript",
      "오픈소스",
      "가상현실",
      "증강현실"
    ]
  },
  {
    "id": "electronics",
    "label": "전자공학전공",
    "keywords": [
      "전자공학",
      "전자전기",
      "전자회로",
      "회로",
      "임베디드",
      "센서",
      "제어",
      "로봇",
      "정보통신",
      "통신",
      "네트워크",
      "무선",
      "5G",
      "6G",
      "위성통신",
      "안테나",
      "신호처리",
      "영상처리",
      "음성처리",
      "MCU",
      "FPGA",
      "RF",
      "IoT",
      "아날로그",
      "디지털회로",
      "집적회로",
      "전력전자",
      "전력반도체",
      "전자파",
      "광전자",
      "전자소자",
      "PCB",
      "마이크로프로세서",
      "마이크로컨트롤러",
      "DSP",
      "SoC",
      "반도체",
      "회로설계",
      "회로 설계",
      "인공지능",
      "자율주행"
    ]
  },
  {
    "id": "semiconductor",
    "label": "시스템반도체공학전공",
    "keywords": [
      "반도체",
      "시스템반도체",
      "시스템 반도체",
      "공정",
      "소자",
      "집적회로",
      "칩설계",
      "칩 설계",
      "패키징",
      "VLSI",
      "Verilog",
      "SystemVerilog",
      "RTL",
      "EDA",
      "SoC",
      "ASIC",
      "FPGA",
      "UVM",
      "반도체설계",
      "반도체 설계",
      "회로설계",
      "회로 설계",
      "디지털회로",
      "아날로그",
      "임베디드",
      "컴퓨터구조",
      "컴퓨터 구조",
      "메모리",
      "DRAM",
      "NAND",
      "파운드리",
      "팹리스",
      "웨이퍼",
      "리소그래피",
      "노광",
      "식각",
      "증착",
      "클린룸",
      "전력반도체",
      "AI 반도체",
      "인공지능 반도체",
      "인공지능",
      "센서",
      "신호처리",
      "TCAD"
    ]
  }
];
const selectedNoticeMajors = new Set();
function noticeMajorMatches(item, major) {
  const title=String(item.title || "");
  return major.keywords.filter(word=>/^[A-Za-z0-9]+$/.test(word) ? new RegExp(`(^|[^a-z0-9])${word}(?=$|[^a-z0-9])`,"i").test(title) : title.toLowerCase().includes(word.toLowerCase()));
}
function noticeMatchesMajor(item) {
  return selectedNoticeMajors.size===0 || NOTICE_MAJORS.some(major=>selectedNoticeMajors.has(major.id) && noticeMajorMatches(item,major).length>0);
}
function majorCheckboxes() {
  return `<fieldset id="notice-majors"><legend class="sr-only">전공 선택</legend><p class="small-muted major-help">공지 제목의 키워드로 추천해요. 선택하지 않으면 전체, 여러 전공을 선택하면 하나라도 맞는 공지를 보여줘요. 겹치는 키워드는 여러 전공에 함께 추천돼요. 지원 자격은 원문에서 확인해주세요.</p><div class="major-options">${NOTICE_MAJORS.map(major=>`<label class="major-option"><input type="checkbox" data-notice-major="${major.id}" ${selectedNoticeMajors.has(major.id) ? "checked" : ""}><span><strong>${major.label}</strong><small>추천 키워드: ${major.keywords.join(" · ")}</small></span></label>`).join("")}</div></fieldset>`;
}
function filterPanels() {
  return `<section class="notice-filter-shell" aria-label="공지 필터"><div class="notice-filter-buttons"><button type="button" data-filter-panel="sources" aria-expanded="${sourceFilterOpen}" aria-controls="institution-drawer">${icon("arrow", "filter-chevron")}공지 기관</button><button type="button" data-filter-panel="types" aria-expanded="${typeFilterOpen}" aria-controls="type-drawer">${icon("arrow", "filter-chevron")}게시글 유형</button><button type="button" data-filter-panel="majors" aria-expanded="${majorFilterOpen}" aria-controls="major-drawer">${icon("arrow", "filter-chevron")}전공 선택</button></div><div id="institution-drawer" class="notice-filter-drawer" ${sourceFilterOpen ? "" : "hidden"}>${sourceCheckboxes()}</div><div id="type-drawer" class="notice-filter-drawer" ${typeFilterOpen ? "" : "hidden"}>${typeCheckboxes()}</div><div id="major-drawer" class="notice-filter-drawer" ${majorFilterOpen ? "" : "hidden"}>${majorCheckboxes()}</div></section>`;
}
function periodText(item) {
  if (!item.endsAt) return item.dateNote || "모집기간 확인 필요";
  return item.startsAt
    ? `${item.startsAt.replaceAll("-", ".")} ~ ${item.endsAt.replaceAll("-", ".")}`
    : `시작일 미확인 · ${item.endsAt.replaceAll("-", ".")} 마감`;
}
function noticeRow(item, sourceName = "") {
  const status = !item.endsAt
    ? "기간 확인 필요"
    : item.startsAt && item.startsAt > noticeToday()
      ? "모집 예정"
      : "모집 중";
  return `<a class="notice-row" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer"><span class="notice-row-copy"><span class="notice-category">${escapeHTML(item.category)}</span><strong>${escapeHTML(item.title)}</strong>${sourceName ? `<small class="notice-published">${escapeHTML(item.providerName || sourceName)} · ${escapeHTML(noticePublishedLabel(item))}</small>` : ""}${item.detailNotCollected ? "<small>공개 목록 기준 · 상세 내용은 원문에서 확인해주세요.</small>" : item.loginRequired ? "<small>원문 확인에 학교 로그인이 필요해요.</small>" : ""}</span><span class="notice-period"><span class="tag">${status}</span><span>${escapeHTML(periodText(item))}</span></span>${icon("arrow", "row-arrow")}</a>`;
}

// Deduplicate only clear identities, keeping differently dated recruitment rounds.
function noticeCanonicalUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    if (url.pathname === "/" && !url.search) return "";
    const params = [...url.searchParams].filter(([key]) => !/^utm_|^(fbclid|gclid)$/i.test(key)).sort(([a,av],[b,bv])=>a.localeCompare(b)||av.localeCompare(bv));
    return url.hostname.toLowerCase().replace(/^www\./, "") + url.pathname.replace(/\/$/, "") + (params.length ? "?" + new URLSearchParams(params) : "");
  } catch { return ""; }
}
function deduplicateNoticeRows(rows) {
  const result=[], byUrl=new Map(), byTitle=new Map();
  for (const row of rows) {
    const item=row.item, url=noticeCanonicalUrl(item.url);
    const title=String(item.title || "").normalize("NFKC").toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, "");
    const titleKey=title.length>=10 && item.endsAt ? title+"|"+item.endsAt : "";
    const candidates=[...(url ? byUrl.get(url)||[] : []), ...(titleKey ? byTitle.get(titleKey)||[] : [])];
    const same=candidates.find(existing=>{
      const other=existing.item;
      if (item.startsAt && other.startsAt && item.startsAt!==other.startsAt) return false;
      if (item.endsAt && other.endsAt && item.endsAt!==other.endsAt) return false;
      return true;
    });
    let representative=same;
    if (!representative) {
      representative={source:row.source,item:{...item}};
      result.push(representative);
    } else {
      const current=representative.item;
      // Keep a confirmed period if another feed has only an unknown period.
      for (const field of ["startsAt","endsAt","providerName","providerId","publishedAt"]) if (!current[field] && item[field]) current[field]=item[field];
      if (current.endsAt) {current.dateNote="";current.status=current.startsAt && current.startsAt>noticeToday() ? "upcoming" : "open";}
    }
    if (url) {
      const bucket=byUrl.get(url)||[];
      if (!bucket.includes(representative)) bucket.push(representative);
      byUrl.set(url,bucket);
    }
    if (titleKey) {
      const bucket=byTitle.get(titleKey)||[];
      if (!bucket.includes(representative)) bucket.push(representative);
      byTitle.set(titleKey,bucket);
    }
  }
  return result;
}
function visibleNoticeGroups() {
  const sources=noticeSources();
  const unique=deduplicateNoticeRows(sources.flatMap(source=>filteredNotices(source).map(item=>({source,item}))));
  return sources.map(source=>({...source,notices:unique.filter(row=>row.source.id===source.id).map(row=>row.item)}));
}

function noticeGroups() {
  return (
    visibleNoticeGroups()
      .map((source) => {
        const notices = source.notices.sort((a, b) =>
          (a.endsAt || "9999").localeCompare(b.endsAt || "9999"),
        );
        if (!notices.length && (noticeSearch || noticeSources().length > 1))
          return "";
        return `<details class="panel notice-source" data-notice-group="${source.id}" ${collapsedNoticeSources.has(source.id) ? "" : "open"}><summary class="notice-source-heading">${icon("arrow", "notice-group-chevron")}<h2 id="notice-source-${source.id}">${escapeHTML(source.name)}</h2><span class="small-muted">${notices.length}건</span></summary><div class="notice-group-body">${source.note ? `<p class="notice-source-note">${escapeHTML(source.note)}</p>` : ""}<div class="notice-list">${notices.length ? notices.map((item) => noticeRow(item)).join("") : '<p class="empty-note">이 조건에 맞는 공지가 없어요. 기간 확인 필요 항목이나 원문 게시판을 살펴보세요.</p>'}</div><div class="notice-source-footer"><span>${escapeHTML(source.coverage || "")}</span><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">원문 게시판 열기 ↗</a></div></div></details>`;
      })
      .join("") ||
    '<section class="panel"><h2>조건에 맞는 공지가 없어요</h2><p class="small-muted">기관이나 검색어를 바꾸거나 ‘기간 확인 필요’를 선택해보세요.</p></section>'
  );
}
function calendarNotices() {
  return visibleNoticeGroups().flatMap(source=>source.notices.filter(item=>item.endsAt).map(item=>({...item,sourceName:item.providerName || source.name})));
}
function noticesOnDay(items, day) {
  return items.filter((item) =>
    item.startsAt
      ? item.startsAt <= day && item.endsAt >= day
      : item.endsAt === day,
  );
}
function noticePublishedTime(item) {
  const value=String(item.publishedAt || '').trim();
  if (!value) return null;
  const time=Date.parse(value);
  return Number.isFinite(time) ? time : null;
}
function noticesByPublishedDate() {
  return visibleNoticeGroups().flatMap(source=>source.notices.map(item=>({source,item})))
    .sort((a,b)=>(noticePublishedTime(b.item) ?? -Infinity)-(noticePublishedTime(a.item) ?? -Infinity) || 0);
}
function noticePublishedLabel(item) {
  const time=noticePublishedTime(item);
  return time===null ? '게시일 확인 필요' : '게시 '+new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(time).replaceAll('-','.');
}
function noticeChronologicalList() {
  const rows=noticesByPublishedDate();
  if (!rows.length) return '<section class="panel"><h2>조건에 맞는 공지가 없어요</h2><p class="small-muted">기관이나 게시글 유형, 검색어를 바꿔보세요.</p></section>';
  return `<section class="panel notice-chronological"><div class="notice-chronological-heading"><h2>최신 공지</h2><span class="small-muted">게시일 최신순 · ${rows.length}건</span></div><div class="notice-list">${rows.map(({source,item})=>noticeRow(item,source.name)).join('')}</div></section>`;
}
function noticeResults() {
  return noticeView==='calendar' ? noticeCalendar() : noticeGrouping==='type' ? noticeChronologicalList() : noticeGroups();
}
function noticeGroupingControls() {
  return `<div class="notice-list-options" ${noticeView==='calendar'?'hidden':''}><div class="notice-group-switch" data-grouping="${noticeGrouping}" role="group" aria-label="모집 목록 정리 방식"><button type="button" data-notice-grouping="source" aria-pressed="${noticeGrouping==='source'}">기관별로</button><button type="button" data-notice-grouping="type" aria-pressed="${noticeGrouping==='type'}">유형별로</button></div><span class="small-muted">유형별 보기는 선택한 게시글 유형을 최신순으로 모아요.</span></div>`;
}

function noticeBoard() {
  return `${filterPanels()}<div class="notice-toolbar"><div class="tabs" role="group" aria-label="공지 보기 방식"><button data-notice-view="list" class="${noticeView === "list" ? "selected" : ""}" aria-pressed="${noticeView === "list"}">모집 목록</button><button data-notice-view="calendar" class="${noticeView === "calendar" ? "selected" : ""}" aria-pressed="${noticeView === "calendar"}">지원 달력</button></div><small class="small-muted">최근 갱신 ${escapeHTML(NOTICE_DATA.checkedAt.slice(0, 16).replace("T", " "))}</small></div><div class="notice-controls"><div class="notice-field"><label for="notice-search">공지 검색</label><input type="search" id="notice-search" value="${escapeHTML(noticeSearch)}" placeholder="AI, 해커톤, 반도체, 서포터즈" maxlength="100"></div><div class="notice-field"><label for="notice-status-filter">모집 상태</label><select id="notice-status-filter"><option value="all" ${noticeStatus === "all" ? "selected" : ""}>전체 (마감 제외)</option><option value="active" ${noticeStatus === "active" ? "selected" : ""}>모집 중·예정</option><option value="unknown" ${noticeStatus === "unknown" ? "selected" : ""}>기간 확인 필요</option></select></div></div>${noticeGroupingControls()}<p class="small-muted notice-results-hint">${noticeView === "calendar" ? "확인된 모집 기간만 달력에 표시해요." : "마감이 확인된 공지는 제외했어요. 지원 자격과 변경된 일정은 원문에서 확인해주세요."}</p><div class="notice-results" id="notice-results">${noticeResults()}</div>`;
}
function bindNoticeBoard(root) {
  if (!root.querySelector("#notice-results")) return;
  const results = (animate = false) => {
    const container=root.querySelector("#notice-results");
    container.getAnimations?.().forEach(animation=>animation.cancel());
    container.innerHTML = noticeResults();
    const reduced=document.documentElement.dataset.reducedMotion==="true" || matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animate && !reduced && container.animate) container.animate(
      [{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"translateY(0)"}],
      {duration:240,easing:"cubic-bezier(.22,1,.36,1)"});
    bindCalendar();
    bindGroups();
  };
  const bindGroups = () => {
    root.querySelectorAll("[data-notice-group]").forEach(
      (group) =>
        (group.ontoggle = () => {
          if (group.open)
            collapsedNoticeSources.delete(group.dataset.noticeGroup);
          else collapsedNoticeSources.add(group.dataset.noticeGroup);
        }),
    );
  };
  const bindCalendar = () => {
    root.querySelectorAll("[data-notice-day]").forEach(
      (button) =>
        (button.onclick = () => {
          noticeDay = button.dataset.noticeDay;
          results();
        }),
    );
    root.querySelectorAll("[data-month-step]").forEach(
      (button) =>
        (button.onclick = () => {
          const step = Number(button.dataset.monthStep),
            [year, month] = noticeMonth.split("-").map(Number);
          noticeMonth = new Date(year, month - 1 + step, 1, 12)
            .toLocaleDateString("sv-SE")
            .slice(0, 7);
          noticeDay = `${noticeMonth}-01`;
          results();
        }),
    );
  };
  root.querySelectorAll("[data-notice-grouping]").forEach(button=>button.onclick=()=>{
    const next=button.dataset.noticeGrouping;
    if(next===noticeGrouping)return;
    noticeGrouping=next;
    root.querySelector(".notice-group-switch").dataset.grouping=next;
    root.querySelectorAll("[data-notice-grouping]").forEach(item=>item.setAttribute("aria-pressed",String(item.dataset.noticeGrouping===next)));
    results(true);
  });
  root.querySelectorAll("[data-notice-view]").forEach(
    (button) =>
      (button.onclick = () => {
        if(noticeView===button.dataset.noticeView)return;
        noticeView = button.dataset.noticeView;
        if (noticeView === "calendar") noticeStatus = "all";
        root.querySelector("#notice-status-filter").value=noticeStatus;
        root.querySelector(".notice-list-options").hidden=noticeView==="calendar";
        root.querySelectorAll("[data-notice-view]").forEach(item=>{
          item.classList.toggle("selected",item.dataset.noticeView===noticeView);
          item.setAttribute("aria-pressed",String(item.dataset.noticeView===noticeView));
        });
        root.querySelector(".notice-results-hint").textContent=noticeView==="calendar" ? "확인된 모집 기간만 달력에 표시해요." : "마감이 확인된 공지는 제외했어요. 지원 자격과 변경된 일정은 원문에서 확인해주세요.";
        results(true);
      }),
  );
  root.querySelectorAll("[data-notice-source]").forEach(
    (input) =>
      (input.onchange = () => {
        if (input.checked) enabledNoticeSources.add(input.dataset.noticeSource);
        else enabledNoticeSources.delete(input.dataset.noticeSource);
        results();
      }),
  );
  root.querySelectorAll("[data-sources]").forEach(
    (button) =>
      (button.onclick = () => {
        enabledNoticeSources = new Set(
          button.dataset.sources === "all"
            ? noticeSourceCatalog()
                .filter(sourceSupported)
                .map((source) => source.id)
            : [],
        );
        render();
      }),
  );
  root.querySelector("#notice-search").oninput = (event) => {
    noticeSearch = event.target.value;
    results();
  };
  root.querySelector("#notice-status-filter").onchange = (event) => {
    noticeStatus = event.target.value;
    if (noticeView === "calendar" && noticeStatus === "unknown") {
      noticeView = "list";
      render();
    } else results();
  };
  root.querySelectorAll("[data-notice-type]").forEach(
    (input) =>
      (input.onchange = () => {
        if (input.checked) enabledNoticeTypes.add(input.dataset.noticeType);
        else enabledNoticeTypes.delete(input.dataset.noticeType);
        results();
      }),
  );
  root.querySelectorAll("[data-notice-major]").forEach(input=>input.onchange=()=>{
    if(input.checked)selectedNoticeMajors.add(input.dataset.noticeMajor);
    else selectedNoticeMajors.delete(input.dataset.noticeMajor);
    results();
  });
  root.querySelectorAll("[data-filter-panel]").forEach(
    (button) =>
      (button.onclick = () => {
        const panel=button.dataset.filterPanel;
        const wasOpen=panel==="sources" ? sourceFilterOpen : panel==="types" ? typeFilterOpen : majorFilterOpen;
        sourceFilterOpen=panel==="sources" && !wasOpen;
        typeFilterOpen=panel==="types" && !wasOpen;
        majorFilterOpen=panel==="majors" && !wasOpen;
        render();
      }),
  );
  bindCalendar();
  bindGroups();
}
