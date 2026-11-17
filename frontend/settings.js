// 새 화면 설정은 DEFAULT_SETTINGS, settingsScreen, theme.css 순서로 추가합니다.
const SETTINGS_KEY = "youwith.preferences";
const DEFAULT_SETTINGS = {
  darkMode: false,
  showBackground: true,
  reduceMotion: false,
};

function loadSettings(storage) {
  try {
    const saved = JSON.parse(storage.getItem(SETTINGS_KEY));
    return Object.fromEntries(
      Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => [
        key,
        typeof saved?.[key] === "boolean" ? saved[key] : fallback,
      ]),
    );
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// Storage may be unavailable in private/restricted browser sessions.
let preferences = loadSettings({ getItem: (key) => localStorage.getItem(key) });

function applySettings() {
  const root = document.documentElement;
  root.dataset.theme = preferences.darkMode ? "dark" : "light";
  root.dataset.background = String(preferences.showBackground);
  root.dataset.reducedMotion = String(preferences.reduceMotion);
  document.querySelector('meta[name="theme-color"]').content =
    preferences.darkMode ? "#17201b" : "#e2e4df";
}

function saveSettings() {
  applySettings();
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

function settingToggle(key, title) {
  return `<label class="setting-row"><span><strong>${title}</strong></span><input class="setting-switch" type="checkbox" role="switch" data-setting="${key}" aria-label="${title}" ${preferences[key] ? "checked" : ""}></label>`;
}

function settingsScreen() {
  return `${heading("설정", "나에게 편한 YouWith로 바꿔보세요.")}
    <div class="panel settings-layout">
      <section class="settings-panel" aria-labelledby="appearance-title">
        <h2 id="appearance-title">화면</h2>
        ${settingToggle("darkMode", "다크모드")}
        ${settingToggle("showBackground", "배경사진 표시")}
        ${settingToggle("reduceMotion", "화면 움직임 줄이기")}
      </section>
        <section class="settings-panel" aria-labelledby="help-title">
          <h2 id="help-title">알림과 도움말</h2>
          <button class="setting-row setting-action" data-settings-info="notifications"><span><strong>알림 및 권한 안내</strong><small>참가 신청과 승인 결과 알림</small></span>${icon("arrow")}</button>
          <button class="setting-row setting-action" data-settings-info="guide"><span><strong>사용 안내</strong><small>공부 기록과 팀원 모집 이용하기</small></span>${icon("arrow")}</button>
          <a class="setting-row setting-action" href="${SITE.instagram}" target="_blank" rel="noopener noreferrer"><span><strong>YouWith 인스타그램</strong><small>@ece_uwith · 활동 소식 보기</small></span>${icon("instagram")}</a>
        </section>
        <section class="settings-panel" aria-labelledby="app-info-title">
          <h2 id="app-info-title">앱 정보</h2>
          <div class="setting-row"><span><strong>YouWith</strong><small>버전 ${SITE.version}</small></span></div>
          <button class="setting-row setting-action" data-settings-info="privacy"><span><strong>데이터 저장 안내</strong><small>이 브라우저에 저장되는 내용</small></span>${icon("arrow")}</button>
          <button class="setting-row setting-action" id="reset-settings"><span><strong>화면 설정 초기화</strong><small>다크모드·배경·움직임 설정만 되돌려요.</small></span>${icon("reset")}</button>
        </section>
      ${globalThis.YOUWITH_PUBLIC_PREVIEW?'':`<section class="settings-panel"><h2>계정</h2><button class="setting-row setting-action" id="logout"><strong>로그아웃</strong>${icon("arrow")}</button></section>`}
    </div>`;
}

function bindSettings(root) {
  root.querySelector("#logout")?.addEventListener("click", async event => {
    event.currentTarget.disabled = true;
    try { await globalThis.logout(); }
    catch (error) { event.target.closest("button").disabled = false; toast(error.message); }
  });
  root.querySelectorAll("[data-setting]").forEach((input) => {
    input.onchange = () => {
      preferences[input.dataset.setting] = input.checked;
      if (!saveSettings())
        toast(
          "설정을 적용했어요. 이 브라우저에서는 새로고침 후 저장이 유지되지 않을 수 있어요.",
        );
    };
  });
  const help = {
    notifications:
      "<h2>알림 및 권한 안내</h2><p>참가 신청과 승인·거절 결과는 알림함에서 확인할 수 있어요.</p><p>휴대폰 푸시 알림은 아직 지원하지 않아요.</p>",
    guide:
      "<h2>YouWith 사용 안내</h2><p><strong>공부</strong>에서 타이머를 시작하고, 쉬는 시간에는 일시정지해주세요. 화면을 끄거나 다른 앱으로 이동하면 자동으로 일시정지돼요.</p><p><strong>활동</strong>에서 함께할 프로젝트를 찾아 참가를 신청하세요. <strong>알림함</strong>에서는 신청·승인 결과를 확인할 수 있어요.</p><p><strong>놀이터</strong>에서는 사각형으로 사과를 드래그해 합이 10인 영역을 없애보세요.</p>",
    privacy:
      "<h2>데이터 저장 안내</h2><p>화면 설정과 직접 작성한 모집글·지원 정보는 이 브라우저에 저장돼요.</p><p>공부·게임 기록은 새로고침하면 초기화돼요. 모집글·지원 정보는 이 브라우저에 남으며, 브라우저의 사이트 데이터를 지우면 삭제됩니다. 모집글·지원 정보는 계정별로 이 브라우저에만 저장되며 다른 부원과 공유되지 않아요. 로그인 계정과 비밀번호 해시·세션은 서버에 저장돼요.</p>",
  };
  root.querySelectorAll("[data-settings-info]").forEach((button) => {
    button.onclick = () => showDialog(help[button.dataset.settingsInfo]);
  });
  root
    .querySelector("#reset-settings")
    ?.addEventListener("click", () =>
      showDialog(
        '<h2>화면 설정을 초기화할까요?</h2><p>다크모드는 끄고, 배경사진은 표시하고, 화면 움직임은 기본 상태로 되돌려요.</p><p>공부 중인 타이머나 참가 신청에는 영향을 주지 않아요.</p><button class="primary" id="confirm-reset-settings">화면 설정 초기화</button>',
      ),
    );
  root
    .querySelector("#confirm-reset-settings")
    ?.addEventListener("click", () => {
      preferences = { ...DEFAULT_SETTINGS };
      const saved = saveSettings();
      dialog.close();
      render();
      toast(
        saved
          ? "화면 설정을 초기화했어요."
          : "화면 설정을 초기화했어요. 브라우저에 저장할 수는 없어요.",
      );
    });
}

applySettings();
