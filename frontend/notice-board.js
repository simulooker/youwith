// 수집·날짜 분석: server/refresh_notices.py / 화면·검색·달력: 이 파일
let enabledNoticeSources = null,
  enabledNoticeTypes = null,
  sourceFilterOpen = false,
  typeFilterOpen = false,
  majorFilterOpen = false,
  noticeSearch = "",
  noticeView = "list",
  noticeStatus = "active";
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
    return `${item.title} ${item.category} ${source.name}`
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
  return source.status === "verified" || (source.status === "partial" && source.collectionScope === "public-home-list");
}
function noticeSources() {
  if (enabledNoticeSources === null)
    enabledNoticeSources = new Set(
      NOTICE_DATA.sources.filter(sourceSupported).map((source) => source.id),
    );
  return NOTICE_DATA.sources.filter(
    (source) => sourceSupported(source) && enabledNoticeSources.has(source.id),
  );
}
function sourceCheckboxes() {
  noticeSources();
  return `<fieldset class="notice-institutions" id="notice-institutions"><legend class="sr-only">공지 기관 선택</legend><div class="institution-actions"><button type="button" data-sources="all">전체 켜기</button><button type="button" data-sources="none">전체 끄기</button></div><div class="institution-options">${NOTICE_DATA.sources.map((source) => (sourceSupported(source) ? `<label class="institution-option"><input type="checkbox" data-notice-source="${source.id}" ${enabledNoticeSources.has(source.id) ? "checked" : ""}><span>${escapeHTML(source.name)}${source.collectionScope === "public-home-list" ? " (목록만)" : ""}</span></label>` : `<div class="institution-unavailable"><a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.name)} <span class="unsupported-label">(미지원)</span></a></div>`)).join("")}</div></fieldset>`;
}
const NOTICE_MAJORS = [
  {id:"computer",label:"컴퓨터",keywords:["컴퓨터","소프트웨어","프로그래밍","코딩","개발자","해커톤","인공지능","데이터","보안","클라우드","파이썬","Python","SW","AI","웹개발","앱개발","백엔드","프론트엔드"]},
  {id:"electronics",label:"전자",keywords:["전자공학","전자전기","전자회로","회로","임베디드","센서","제어","로봇","통신","신호처리","MCU","FPGA","RF","IoT"]},
  {id:"semiconductor",label:"반도체",keywords:["반도체","공정","소자","집적회로","칩설계","칩 설계","패키징","VLSI","Verilog","RTL","EDA"]}
];
const selectedNoticeMajors = new Set();
function noticeMajorMatches(item, major) {
  const title=String(item.title || "");
  return major.keywords.filter(word=>/^[A-Za-z]+$/.test(word) ? new RegExp(`(^|[^a-z0-9])${word}(?=$|[^a-z0-9])`,"i").test(title) : title.toLowerCase().includes(word.toLowerCase()));
}
function noticeMatchesMajor(item) {
  return selectedNoticeMajors.size===0 || NOTICE_MAJORS.some(major=>selectedNoticeMajors.has(major.id) && noticeMajorMatches(item,major).length>0);
}
function majorCheckboxes() {
  return `<fieldset id="notice-majors"><legend class="sr-only">전공 선택</legend><p class="small-muted major-help">공지 제목의 키워드로 추천해요. 선택하지 않으면 전체, 여러 전공을 선택하면 하나라도 맞는 공지를 보여줘요. 지원 자격은 원문에서 확인해주세요.</p><div class="major-options">${NOTICE_MAJORS.map(major=>`<label class="major-option"><input type="checkbox" data-notice-major="${major.id}" ${selectedNoticeMajors.has(major.id) ? "checked" : ""}><span><strong>${major.label}</strong><small>추천 키워드: ${major.keywords.join(" · ")}</small></span></label>`).join("")}</div></fieldset>`;
}
function allconSearchLinks() {
  return `<details class="allcon-search"><summary>올콘 공식 사이트에서 검색하기</summary><p class="small-muted">자동 수집은 이용 허락 확인 전까지 보류하고 있어요. 아래 링크는 올콘 원문 검색을 새 탭으로 엽니다.</p><div class="allcon-search-links">${[["컴퓨터","소프트웨어"],["전자","전자"],["반도체","반도체"]].map(([label,query])=>`<a class="text-button" href="https://www.all-con.co.kr/list/search?stx=${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer">${label} 공모전 찾기 ↗</a>`).join("")}</div></details>`;
}
function filterPanels() {
  return `<section class="notice-filter-shell" aria-label="공지 필터"><div class="notice-filter-buttons"><button type="button" data-filter-panel="sources" aria-expanded="${sourceFilterOpen}" aria-controls="institution-drawer">${icon("arrow", "filter-chevron")}공지 기관</button><button type="button" data-filter-panel="types" aria-expanded="${typeFilterOpen}" aria-controls="type-drawer">${icon("arrow", "filter-chevron")}게시글 유형</button><button type="button" data-filter-panel="majors" aria-expanded="${majorFilterOpen}" aria-controls="major-drawer">${icon("arrow", "filter-chevron")}전공 선택</button></div><div id="institution-drawer" class="notice-filter-drawer" ${sourceFilterOpen ? "" : "hidden"}>${sourceCheckboxes()}</div><div id="type-drawer" class="notice-filter-drawer" ${typeFilterOpen ? "" : "hidden"}>${typeCheckboxes()}</div><div id="major-drawer" class="notice-filter-drawer" ${majorFilterOpen ? "" : "hidden"}>${majorCheckboxes()}</div>${allconSearchLinks()}</section>`;
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
  return `<a class="notice-row" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer"><span class="notice-row-copy"><span class="notice-category">${escapeHTML(sourceName || item.category)}</span><strong>${escapeHTML(item.title)}</strong>${item.detailNotCollected ? "<small>공개 목록 기준 · 상세 내용은 원문에서 확인해주세요.</small>" : item.loginRequired ? "<small>원문 확인에 학교 로그인이 필요해요.</small>" : ""}</span><span class="notice-period"><span class="tag">${status}</span><span>${escapeHTML(periodText(item))}</span></span>${icon("arrow", "row-arrow")}</a>`;
}
function noticeGroups() {
  return (
    noticeSources()
      .map((source) => {
        const notices = filteredNotices(source).sort((a, b) =>
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
  const seen = new Set();
  return noticeSources()
    .flatMap((source) =>
      filteredNotices(source)
        .filter((item) => item.endsAt)
        .map((item) => ({ ...item, sourceName: source.name })),
    )
    .filter((item) => {
      const key = item.title.replace(/\s+/g, "") + item.endsAt;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
function noticesOnDay(items, day) {
  return items.filter((item) =>
    item.startsAt
      ? item.startsAt <= day && item.endsAt >= day
      : item.endsAt === day,
  );
}
function noticeBoard() {
  return `${filterPanels()}<div class="notice-toolbar"><div class="tabs" role="group" aria-label="공지 보기 방식"><button data-notice-view="list" class="${noticeView === "list" ? "selected" : ""}" aria-pressed="${noticeView === "list"}">모집 목록</button><button data-notice-view="calendar" class="${noticeView === "calendar" ? "selected" : ""}" aria-pressed="${noticeView === "calendar"}">지원 달력</button></div><small class="small-muted">최근 갱신 ${escapeHTML(NOTICE_DATA.checkedAt.slice(0, 16).replace("T", " "))}</small></div><div class="notice-controls"><div class="notice-field"><label for="notice-search">공지 검색</label><input type="search" id="notice-search" value="${escapeHTML(noticeSearch)}" placeholder="AI, 해커톤, 반도체, 서포터즈" maxlength="100"></div><div class="notice-field"><label for="notice-status-filter">모집 상태</label><select id="notice-status-filter"><option value="active" ${noticeStatus === "active" ? "selected" : ""}>모집 중·예정</option><option value="unknown" ${noticeStatus === "unknown" ? "selected" : ""}>기간 확인 필요</option></select></div></div><p class="small-muted notice-results-hint">${noticeView === "calendar" ? "확인된 모집 기간만 달력에 표시해요." : "마감이 확인된 공지는 제외했어요. 지원 자격과 변경된 일정은 원문에서 확인해주세요."}</p><div class="notice-results" id="notice-results">${noticeView === "calendar" ? noticeCalendar() : noticeGroups()}</div>`;
}
function bindNoticeBoard(root) {
  if (!root.querySelector("#notice-results")) return;
  const results = () => {
    root.querySelector("#notice-results").innerHTML =
      noticeView === "calendar" ? noticeCalendar() : noticeGroups();
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
  root.querySelectorAll("[data-notice-view]").forEach(
    (button) =>
      (button.onclick = () => {
        noticeView = button.dataset.noticeView;
        if (noticeView === "calendar") noticeStatus = "active";
        render();
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
            ? NOTICE_DATA.sources
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
