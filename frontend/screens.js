// 화면별 HTML입니다. 공통 화면 조각을 위에, 각 화면을 아래에 둡니다.
function heading(title, copy) {
  return /* HTML */ `<div class="page-title">
    <h1>${title}</h1>
    <p>${copy}</p>
  </div>`;
}
function projectRows(list = projects.slice(0, 2)) {
  return list
    .map((p) => {
      const idx = projects.indexOf(p);
      return /* HTML */ `<button class="project-row" data-project="${idx}">
        <span class="project-icon">${icon(p.icon)}</span
        ><span class="project-copy"
          ><strong>${escapeHTML(p.title)}</strong>
          <p>${escapeHTML(p.desc)}</p></span
        ><span class="tag">${p.ownerId === LOCAL_MEMBER_ID ? "내 모집글" : myApplication(p) ? applicationLabels[myApplication(p).status] : p.type}</span
        >${icon("arrow", "row-arrow")}
      </button>`;
    })
    .join("");
}
function rankPanel() {
  return /* HTML */ `<section class="panel">
    <div class="section-heading">
      <h2>함께 달리는 공부 랭킹</h2>
      ${icon("cup")}
    </div>
    <div class="tabs" aria-label="공부 랭킹 기간">
      ${[
        ["day", "일간"],
        ["week", "주간"],
        ["month", "월간"],
      ]
        .map(
          ([key, label]) =>
            `<button data-period="${key}" class="${period === key ? "selected" : ""}" aria-pressed="${period === key}">${label}</button>`,
        )
        .join("")}
    </div>
    ${ranks[period]
      .map(
        (r, i) =>
          `<div class="rank-row"><span class="rank-number">${i + 1}</span><span class="rank-avatar">${r[0]}</span><span class="rank-name">${r[1]}</span><span class="rank-time">${r[2]}</span></div>`,
      )
      .join("")}
    <div class="my-rank">
      <span>나의 순위 · 8위</span
      ><span
        >${{ day: "1시간 24분", week: "12시간 24분", month: "42시간 16분" }[
          period
        ]}</span
      >
    </div>
  </section>`;
}
function timerText() {
  const total = 5040 + seconds;
  return /* HTML */ `${Math.floor(total / 3600)}<small>시간</small>${String(
      Math.floor((total % 3600) / 60),
    ).padStart(2, "0")}<small>분</small>${String(total % 60).padStart(
      2,
      "0",
    )}<small>초</small>`;
}
function focusPanel() {
  return /* HTML */ `<section class="panel focus-panel">
    <div class="focus-content">
      <h2>오늘도 한 걸음, 함께</h2>
      <div class="timer" id="home-timer">${timerText()}</div>
      <p class="timer-note">
        ${running
          ? "지금, 나의 성장이 쌓이고 있어요"
          : "오늘 내가 쌓은 공부시간이에요"}
      </p>
      <button class="primary" data-timer>
        ${icon(running ? "pause" : "play")}<span
          >${running
            ? "잠깐 쉬기"
            : seconds
              ? "계속 공부하기"
              : "공부 시작하기"}</span
        >
      </button>
    </div>
    <img
      class="logo-art"
      src="assets/clover.png"
      alt="초록색 YouWith 네잎클로버 로고"
    />
  </section>`;
}
function home() {
  return /* HTML */ `<div class="intro">
      <div class="intro-copy">
        <h1>함께라서 더 자라는 오늘</h1>
        <p>YouWith에서 나의 가능성을 넓혀보세요.</p>
      </div>
      <span class="date"
        >${new Intl.DateTimeFormat("ko-KR", {
          timeZone: "Asia/Seoul",
          month: "long",
          day: "numeric",
          weekday: "long",
        }).format(new Date())}</span
      >
    </div>
    <div class="grid">
      <div class="stack">
        ${focusPanel()}

        <section class="panel">
          <div class="section-heading">
            <h2>같이 하면 더 좋은 프로젝트</h2>
            <button class="text-button" data-filter-nav="팀원 모집">
              모두 보기 ${icon("arrow")}
            </button>
          </div>
          ${projectRows()}
        </section>
      </div>
      <div class="stack">
        ${rankPanel()}<section class="panel meal-preview"><div class="section-heading"><h2>식사 메뉴 추천</h2><span class="tag">예정</span></div><p>오늘 뭐 먹을지, 함께 골라봐요.</p><p class="small-muted">메뉴 추천 기능을 준비하고 있어요.</p></section><button class="game-banner" data-page="game">
          <span class="apple-symbol">${icon("apple")}</span
          ><span
            ><h2>잠깐, 사과 한 판 어때요?</h2>
            <p>공부 사이 쉬는 시간도 즐겁게</p></span
          >${icon("arrow", "banner-arrow")}
        </button>
      </div>
    </div>`;
}
function study() {
  return /* HTML */ `${heading(
      "나의 공부",
      "작은 몰입을 쌓아, 더 큰 가능성으로.",
    )}
    <div class="grid">
      <div class="stack">
        <section class="panel wide-timer">
          <h2>지금은 나에게 집중하는 시간</h2>
          <p class="small-muted">오늘 공부한 시간</p>
          <div class="timer" id="study-timer">${clock(5040 + seconds)}</div>
          <button class="primary" data-timer>
            ${icon(running ? "pause" : "play")}${running
              ? "일시정지"
              : seconds
                ? "계속 공부하기"
                : "공부 시작하기"}
          </button>
          <p class="small-muted">
            화면을 끄거나 다른 앱으로 이동하면 일시정지돼요.
          </p>
        </section>
        <section class="panel">
          <div class="section-heading">
            <h2>이번 주의 꾸준함</h2>
            <span class="small-muted">시간:분</span>
          </div>
          ${studyWeekChart()}
        </section>
      </div>
      ${rankPanel()}
    </div>`;
}
function clock(total) {
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
function activity() {
  const tabs = `<div class="filters">${["팀원 모집", "공모전"].map((f) => `<button class="filter ${activityFilter === f ? "selected" : ""}" data-filter="${f}" aria-pressed="${activityFilter === f}">${f}</button>`).join("")}</div>`;
  const content =
    activityFilter === "공모전"
      ? noticeBoard()
      : `<div class="grid"><section class="panel"><div class="section-heading"><h2>함께할 프로젝트를 찾아요</h2><button class="text-button" id="create-project">모집글 쓰기 +</button></div>${recruitmentSections()}</section><section class="panel"><h2>어떤 역할이 나와 맞을까?</h2><p class="small-muted">관심 분야와 할 수 있는 일을 알려주세요.<br>내게 어울리는 프로젝트 역할을 찾아드려요.</p><button class="primary" data-page="fit">내 역할 찾기 ${icon("arrow")}</button></section></div>`;
  return (
    heading("함께 만드는 다음", "새로운 도전도, 함께할 사람도 여기에서.") +
    tabs +
    content
  );
}
function profile() {
  return /* HTML */ `${heading("내 정보", "YouWith에서 함께하는 나의 이야기.")}
    <div class="grid">
      <section class="panel">
        <div class="profile-line">
          <span class="avatar">나</span>
          <div>
            <h2>${escapeHTML(globalThis.currentMember?.username || "YouWith 부원")}</h2>
            <p>전남대학교 전자컴퓨터공학부</p>
          </div>
        </div>
        <div class="info-row">
          <span>로그인 계정</span><span class="tag">로그인됨</span>
        </div>
        <div class="info-row">
          <span>나의 참가 신청</span><strong>${applied.size}건</strong>
        </div>
        <div class="info-row">
          <span>관심 분야와 기술</span
          ><button class="text-button" data-page="fit">
            입력하기 ${icon("arrow")}
          </button>
        </div>

      </section>
      <section class="panel">
        <h2 style="margin-top:0">우리, YouWith</h2>
        <p>
          함께 배우고 함께 성장하는<br />전남대학교 전자컴퓨터공학부<br />학술동아리입니다.
        </p>
        <a
          class="text-button desktop-only"
          href="${SITE.instagram}"
          target="_blank"
          rel="noopener"
          >활동 소식은 인스타그램에서 ↗</a
        >
      </section>
    </div>`;
}
function fit() {
  return /* HTML */ `${heading("나에게 어울리는 역할 찾기", "잘하는 것과 좋아하는 것, 그 사이에서 시작해요.")}<section class="panel" style="max-width:640px"><form id="fit-form" class="form-grid"><label>어떤 일이 가장 재미있나요?<select name="interest"><option value="front">사용자에게 보이는 화면 만들기</option value="back">데이터와 서비스의 동작 만들기</option><option value="design">사용하기 편한 경험 디자인하기</option><option value="data">데이터에서 의미 찾아내기</option></select></label><label>해본 기술이나 활동이 있나요?<input name="skills" placeholder="예: Python, React, Figma · 없어도 괜찮아요" maxlength="120"></label><label>팀에서 선호하는 역할은?<select name="role"><option>직접 만들고 구현하기</option><option>아이디어를 정리하고 기획하기</option><option>사람들과 조율하고 이끌기</option></select></label><label>MBTI (선택)<select name="mbti"><option>모르겠어요 / 입력하지 않을래요</option>INTJ</option><option>INTP</option><option>ENTJ</option><option>ENTP</option><option>INFJ</option><option>INFP</option><option>ENFJ</option><option>ENFP</option><option>ISTJ</option><option>ISFJ</option><option>ESTJ</option><option>ESFJ</option><option>ISTP</option><option>ISFP</option><option>ESTP</option><option>ESFP</option></select></label><p class="small-muted">관심 분야를 기준으로 역할을 추천해요. MBTI는 적성을 결정하지 않아요.</p><button class="primary" type="submit">나의 추천 역할 보기 ${icon("spark")}</button></form><div id="fit-result" hidden></div></section>`;
}
function game() {
  const tabs=typeof playgroundTabs==='function' ? playgroundTabs() : '';
  if(typeof playgroundGame!=='undefined' && playgroundGame==='tetris')return heading('놀이터','잠깐 쉬어가도 괜찮아요.')+tabs+tetrisScreen();
  return /* HTML */ `${heading(
      "사과 한 판, 기분 전환",
      "잠깐 쉬어가도 괜찮아요.",
    )}${tabs}
    <div class="grid">
      <section class="panel">
        <div class="game-meta">
          <strong>사과게임</strong>
          <span class="game-time-display"><span id="game-time">${gameRemaining}</span>초</span>
          <div class="game-score-display"><span>점수</span><strong id="game-score">${gameScore}</strong></div>
        </div>
        <div
          id="game-progress"
          class="game-progress"
          role="progressbar"
          aria-label="게임 남은 시간"
          aria-valuemin="0"
          aria-valuemax="60"
          aria-valuenow="${gameRemaining}"
        >
          <span style="transform:scaleX(${gameRemaining / 60})"></span>
        </div>
        <div id="apple-board" class="apple-grid" aria-label="사과게임 영역">
          ${gameValues.length ? appleBoard() : ""}
        </div>
        <button class="primary" id="start-game">
          ${gameStarted ? "새로 시작" : "게임 시작하기"}
        </button>
      </section>
      <section class="panel">
        <div class="section-heading">
          <h2>사과게임 랭킹</h2>
          ${icon("cup")}
        </div>
        ${[
          ["유저1", 132],
          ["유저3", 118],
          ["유저2", 106],
        ]
          .map(
            (r, i) =>
              `<div class="rank-row"><span class="rank-number">${i + 1}</span><span class="rank-name">${r[0]}</span><strong>${r[1]}점</strong></div>`,
          )
          .join("")}
        <p class="small-muted">
          플레이 기록은 새로고침하면 초기화돼요.
        </p>
      </section>
    </div>`;
}
function appleBoard() {
  return (
    gameValues
      .map(
        (n, i) =>
          `<button class="apple ${n === 0 ? "cleared" : ""} ${selectedApples.includes(i) ? "picked" : ""}" data-apple="${i}" ${!gameStarted || n === 0 ? "disabled" : ""} aria-label="사과 ${n}" aria-pressed="${selectedApples.includes(i)}">${n}</button>`,
      )
      .join("") + `<div class="selection-box" hidden aria-hidden="true"></div>`
  );
}

function recruitmentSections() {
  const own = ownedProjects(), others = projects.filter(p => p.ownerId !== LOCAL_MEMBER_ID);
  return `<section class="project-section" aria-labelledby="owned-projects-title"><h3 id="owned-projects-title">내가 만든 프로젝트 <span>${own.length}</span></h3>${own.length ? projectRows(own) : '<p class="small-muted">아직 만든 프로젝트가 없어요. 모집글을 등록해보세요.</p>'}</section><section class="project-section" aria-labelledby="other-projects-title"><h3 id="other-projects-title">참여할 프로젝트</h3>${projectRows(others)}</section>`;
}
function studyWeekValues() {
  const values = [5040, 8760, 6300, 10680, 7320, 4740, 0];
  const weekday = new Intl.DateTimeFormat("en-US", {timeZone:"Asia/Seoul",weekday:"short"}).format(new Date());
  const today = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].indexOf(weekday);
  values[today] = 5040 + seconds;
  return values;
}
function studyWeekChart() {
  const values = studyWeekValues(), max = Math.max(...values,1);
  return `<div class="bar-chart" id="study-week" aria-label="요일별 공부시간, 시간과 분">${values.map((value,i) => `<div class="bar-day"><span class="bar-time">${Math.floor(value/3600)}:${String(Math.floor(value%3600/60)).padStart(2,"0")}</span><div class="bar" style="--height:${Math.max(value/max*110,3)}px"></div><span>${["월","화","수","목","금","토","일"][i]}</span></div>`).join("")}</div>`;
}
function updateStudyWeekChart() {
  const values=studyWeekValues(), max=Math.max(...values,1);
  document.querySelectorAll("#study-week .bar-day").forEach((day,i) => {
    day.querySelector(".bar-time").textContent = `${Math.floor(values[i]/3600)}:${String(Math.floor(values[i]%3600/60)).padStart(2,"0")}`;
    day.querySelector(".bar").style.setProperty("--height", `${Math.max(values[i]/max*110,3)}px`);
  });
}
