// 화면 이동, 공부 타이머, 공통 이벤트를 연결하는 시작 파일입니다.
// 화면 설정과 직접 작성한 모집글·지원 정보는 이 브라우저에 저장합니다.
let page = location.hash.slice(1) || "home",
  period = "week",
  activityFilter =
    new URLSearchParams(location.search).get("tab") === "contests"
      ? "공모전"
      : "팀원 모집",
  running = false,
  seconds = 0,
  startedAt = 0,
  elapsed = 0,
  applied = new Set();
syncAppliedProjects();
const main = document.querySelector("main");
const dialog = document.querySelector("dialog");
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("visible"), 3200);
}
function navigate(next) {
  const target = screens[next] ? next : "home";
  if (target !== page) location.hash = target;
}
const screens = {
  home,
  study,
  game,
  activity,
  profile,
  fit,
  settings: settingsScreen,
};
function renderNavigation() {
  const links = menu
    .map(
      ([key, label]) =>
        `<button class="nav-item ${key === page || (key === "activity" && page === "fit") || (key === "profile" && page === "settings") ? "active" : ""}" data-page="${key}" ${key === page ? 'aria-current="page"' : ""}>${icon(key)}<span>${label}</span></button>`,
    )
    .join("");
  const instagram = `<a class="nav-item instagram-link" href="${SITE.instagram}" target="_blank" rel="noopener noreferrer" aria-label="YouWith 인스타그램 새 탭에서 열기">${icon("instagram")}<span>인스타</span></a>`;
  for (const id of ["desktop-nav", "mobile-nav"])
    document.getElementById(id).innerHTML =
      links + (id === "desktop-nav" ? instagram : "");
}
function render() {
  main.className = page === "home" ? "home" : "";
  main.innerHTML = (screens[page] || home)();
  renderNavigation();
  bind();
}
function toggleTimer() {
  if (running) {
    seconds = Math.floor((Date.now() - startedAt) / 1000) + elapsed;
    elapsed = seconds;
    running = false;
  } else {
    startedAt = Date.now();
    running = true;
  }
  render();
}
setInterval(() => {
  if (!running) return;
  seconds = elapsed + Math.floor((Date.now() - startedAt) / 1000);
  const homeEl = document.querySelector("#home-timer"),
    studyEl = document.querySelector("#study-timer");
  if (homeEl) homeEl.innerHTML = timerText();
  if (studyEl) { studyEl.textContent = clock(5040 + seconds); updateStudyWeekChart(); }
}, 250);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && running) {
    toggleTimer();
    toast("공부 기록을 일시정지했어요. 돌아오면 다시 시작해주세요.");
  }
});
function showDialog(html) {
  document.querySelector("#dialog-content").innerHTML = html;
  if (!dialog.open) dialog.showModal();
  bind(dialog);
}
function openProject(idx) { showRecruitmentProject(idx); }
function notices() { showRecruitmentNotifications(); }
function bind(root = document) {
  root
    .querySelectorAll("[data-page]")
    .forEach((el) => (el.onclick = () => navigate(el.dataset.page)));
  root
    .querySelectorAll("[data-timer]")
    .forEach((el) => (el.onclick = toggleTimer));
  root.querySelectorAll("[data-period]").forEach(
    (el) =>
      (el.onclick = () => {
        period = el.dataset.period;
        render();
      }),
  );
  root.querySelectorAll("[data-filter-nav]").forEach(
    (el) =>
      (el.onclick = () => {
        activityFilter = el.dataset.filterNav;
        navigate("activity");
      }),
  );
  root.querySelectorAll("[data-filter]").forEach(
    (el) =>
      (el.onclick = () => {
        activityFilter = el.dataset.filter;
        render();
      }),
  );
  root
    .querySelectorAll("[data-project]")
    .forEach(
      (el) => (el.onclick = () => openProject(Number(el.dataset.project))),
    );
  root
    .querySelector("#push-info")
    ?.addEventListener("click", () =>
      showDialog(
        "<h2>놓치지 않게, 푸시 알림</h2><p>실제 서비스에서는 참가 신청과 처리 결과를 휴대폰으로 알려드려요.</p><p>현재는 미리보기 단계로, 알림 권한을 요청하거나 실제 푸시를 보내지 않아요. 기기별 PWA 설치와 지원 조건은 서비스 연결 시 확인합니다.</p>",
      ),
    );
  root.querySelector("#fit-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    const labels = {
      front: [
        "프론트엔드 개발",
        "화면을 만들고 사용자의 반응을 살피는 역할이에요.",
        "React · HTML/CSS",
      ],
      back: [
        "백엔드 개발",
        "데이터와 서비스의 동작을 설계하는 역할이에요.",
        "Python · API",
      ],
      design: [
        "프로덕트 디자인",
        "문제를 정리하고 편리한 사용 경험을 만드는 역할이에요.",
        "Figma · UX",
      ],
      data: [
        "데이터 분석",
        "데이터 속 패턴을 발견하고 의미를 전달하는 역할이에요.",
        "Python · 데이터 시각화",
      ],
    };
    const [name, desc, skills] = labels[data.get("interest")];
    e.target.hidden = true;
    const result = document.querySelector("#fit-result");
    result.hidden = false;
    result.innerHTML = `<span class="activity-icon">${icon("spark")}</span><h2>${name}부터 시작해보세요</h2><p>${desc}</p><span class="pill">${skills}</span><p class="small-muted">관심 분야에 따른 예시 결과예요. 해보면서 나에게 맞는 역할을 찾아가면 돼요.</p><button class="primary" data-page="activity">함께할 프로젝트 찾아보기</button><button class="text-button" data-page="fit" style="display:block">다시 찾아보기</button>`;
    bind(result);
  });
  root.querySelector("#start-game")?.addEventListener("click", startGame);
  bindAppleSelection(root);
  bindSettings(root);
  bindRecruitment(root);
  bindNoticeBoard(root);
}
// Escaping keeps user-entered prototype titles from becoming HTML when rendered.
const escapeHTML = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
document.querySelectorAll(".brand-clover").forEach((el) => {
  el.innerHTML = icon("clover", "clover-mark");
});
document.querySelector("#open-settings").innerHTML = icon("settings");
document.querySelector("#notifications").innerHTML = icon("bell");
document.querySelector("#notifications").onclick = notices;
document.querySelector(".close-dialog").onclick = () => dialog.close();
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    )
      dialog.close();
  }
});
let pageTransition;
function navigationDirection(from, to) {
  const position = (key) =>
    menu.findIndex(
      ([id]) => id === ({ settings: "profile", fit: "activity" }[key] || key),
    );
  return position(to) < position(from) ? "backward" : "forward";
}
window.addEventListener("hashchange", () => {
  const next = location.hash.slice(1) || "home";
  const target = screens[next] ? next : "home";
  if (target === page) return;
  const direction = navigationDirection(page, target);
  document.documentElement.dataset.pageDirection = direction;
  const update = () => {
    page = target;
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    const title = main.querySelector("h1");
    if (title) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
  };
  const reduced =
    document.documentElement.dataset.reducedMotion === "true" ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  pageTransition?.skipTransition();
  if (!reduced && document.startViewTransition) {
    pageTransition = document.startViewTransition(update);
    pageTransition.ready.catch(() => {});
    pageTransition.finished.catch(() => {});
  } else {
    update();
    if (!reduced)
      main.animate(
        [
          {
            transform:
              direction === "backward"
                ? "translateX(-100%)"
                : "translateX(100%)",
          },
          { transform: "translateX(0)" },
        ],
        { duration: 440, easing: "cubic-bezier(.22,1,.36,1)" },
      );
  }
});
if (!screens[page]) page = "home";
render();

// 열린 화면에도 갱신 결과를 반영합니다. 외부 기관은 예약 수집기만 요청합니다.
async function refreshNoticeData() {
  if (page !== "activity") return;
  try {
    const response = await fetch("notices.json", { cache: "no-store" });
    if (!response.ok) return;
    const next = await response.json();
    if (
      !Array.isArray(next.sources) ||
      next.sources.length !== 12 ||
      !next.sources.every((source) => Array.isArray(source.notices))
    )
      return;
    if (next.checkedAt !== NOTICE_DATA.checkedAt) {
      NOTICE_DATA = next;
      if (activityFilter === "공모전") render();
    }
  } catch {
    /* Keep the last verified data while offline. */
  }
}
refreshNoticeData();
setInterval(refreshNoticeData, 60000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshNoticeData();
});
