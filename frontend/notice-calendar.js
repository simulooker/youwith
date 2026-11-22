// 달력의 주별 기간 막대와 분류 색상을 관리합니다.
const NOTICE_CATEGORIES = [
  ["대회·공모전", "contest"],
  ["서포터즈", "supporter"],
  ["지원·장학", "grant"],
  ["교육·체험", "education"],
  ["인턴·취업", "career"],
  ["모집·프로그램", "program"],
];
function categoryClass(category) {
  return (
    NOTICE_CATEGORIES.find(([name]) => name === category)?.[1] || "program"
  );
}

function calendarWeekSegments(items, weekStart, weekEnd, monthStart, monthEnd) {
  const segments = items
    .map((item) => ({
      item,
      start: [item.startsAt || item.endsAt, weekStart, monthStart]
        .sort()
        .at(-1),
      end: [item.endsAt, weekEnd, monthEnd].sort()[0],
    }))
    .filter((segment) => segment.start <= segment.end)
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) ||
        b.end.localeCompare(a.end) ||
        a.item.title.localeCompare(b.item.title),
    );
  const laneEnds = [];
  return segments.map((segment) => {
    let lane = laneEnds.findIndex((end) => end < segment.start);
    if (lane < 0) lane = laneEnds.length;
    laneEnds[lane] = segment.end;
    return {
      ...segment,
      lane,
      column:
        Math.round(
          (Date.parse(segment.start) - Date.parse(weekStart)) / 86400000,
        ) + 1,
      span:
        Math.round(
          (Date.parse(segment.end) - Date.parse(segment.start)) / 86400000,
        ) + 1,
    };
  });
}

function noticeCalendar() {
  const items = calendarNotices(),
    [year, month] = noticeMonth.split("-").map(Number);
  const offset = new Date(year, month - 1, 1).getDay(),
    count = new Date(year, month, 0).getDate();
  const monthStart = `${noticeMonth}-01`,
    monthEnd = `${noticeMonth}-${String(count).padStart(2, "0")}`;
  const iso = (n) =>
    new Date(Date.UTC(year, month - 1, n)).toISOString().slice(0, 10);
  const weeks = [];
  for (let first = 1 - offset; first <= count; first += 7) {
    const days = Array.from({ length: 7 }, (_, column) => {
      const n = first + column,
        day = iso(n);
      return n < 1 || n > count
        ? '<span class="calendar-blank" aria-hidden="true"></span>'
        : `<button class="calendar-day ${day === noticeDay ? "selected" : ""} ${day === noticeToday() ? "today" : ""}" data-notice-day="${day}" aria-pressed="${day === noticeDay}" aria-label="${month}월 ${n}일, 지원 일정 ${noticesOnDay(items, day).length}건">${n}</button>`;
    });
    const segments = calendarWeekSegments(
      items,
      iso(first),
      iso(first + 6),
      monthStart,
      monthEnd,
    );
    const bars = segments.map(
      ({ item, start, end, lane, column, span }) =>
        `<a class="period-bar category-${categoryClass(item.category)} ${start > (item.startsAt || item.endsAt) ? "continues-before" : ""} ${end < item.endsAt ? "continues-after" : ""}" style="grid-column:${column} / span ${span};grid-row:${lane + 2}" href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHTML(item.title)} · ${escapeHTML(periodText(item))}" aria-label="${escapeHTML(item.category)} · ${escapeHTML(item.title)} · ${escapeHTML(periodText(item))}">${escapeHTML(item.startsAt ? item.title : "마감 · " + item.title)}</a>`,
    );
    weeks.push(
      `<div class="calendar-week-row">${days.join("")}${bars.join("")}</div>`,
    );
  }
  const periodSources=[...new Set(items.map(item=>item.sourceName).filter(Boolean))];
  const selected = noticesOnDay(items, noticeDay).sort((a, b) =>
    a.endsAt.localeCompare(b.endsAt),
  );
  return `<section class="panel application-calendar"><div class="calendar-heading"><h2>${year}년 ${month}월</h2><div class="calendar-actions"><button data-month-step="-1" aria-label="이전 달">${icon("arrow", "month-chevron previous")}</button><button data-month-step="1" aria-label="다음 달">${icon("arrow", "month-chevron")}</button></div><p class="calendar-period-sources">모집기간(달력 표시 가능) 기관: ${periodSources.length ? periodSources.map(escapeHTML).join(", ") : "현재 선택된 공지 없음"}</p></div><div class="calendar-legend">${NOTICE_CATEGORIES.map(([label, key]) => `<button type="button" class="category-${key}" data-calendar-type="${label}" aria-pressed="${enabledNoticeTypes.has(label)}">${label}<span class="calendar-type-state">${enabledNoticeTypes.has(label) ? "켜짐" : "꺼짐"}</span></button>`).join("")}</div><div class="calendar-layout"><div><div class="calendar-week" aria-hidden="true">${["일", "월", "화", "수", "목", "금", "토"].map((day) => `<span>${day}</span>`).join("")}</div><div class="calendar-period-grid">${weeks.join("")}</div><p class="small-muted calendar-help">매일 09:00 업데이트</p></div><div class="calendar-agenda"><h3>${Number(noticeDay.slice(5, 7))}월 ${Number(noticeDay.slice(8))}일 지원 일정</h3>${selected.length ? selected.map((item) => noticeRow(item, item.sourceName)).join("") : '<p class="empty-note">이날 확인된 지원 일정이 없어요. 다른 날짜를 선택해보세요.</p>'}</div></div></section>`;
}
