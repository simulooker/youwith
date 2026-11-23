// 앱을 시작하기 전에 서버 세션과 계정을 확인합니다.
(async () => {
  const nativeFetch = window.fetch.bind(window);
  const goToLogin = () => {
    try {sessionStorage.setItem("youwith.returnHash", location.hash);} catch {}
    location.replace("/login.html");
  };
  try {
    if (window.YOUWITH_PUBLIC_PREVIEW) {
      window.currentMember = {id:"public-visitor",username:"방문자",role:"guest"};
    } else {
    const response = await nativeFetch("/api/me", {cache:"no-store"});
    if (response.status === 401) return goToLogin();
    if (!response.ok) throw Error("인증 서버에 연결할 수 없어요.");
    window.currentMember = await response.json();
    window.fetch = async (...args) => {
      const result = await nativeFetch(...args);
      if (result.status === 401) goToLogin();
      return result;
    };
    window.logout = async () => {
      const result = await nativeFetch("/api/logout", {method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
      if (!result.ok) throw Error("로그아웃하지 못했어요. 다시 시도해주세요.");
      location.replace("/login.html");
    };
    }
    for (const file of ["config.js", "notice-data.js", "notice-board.js", "notice-calendar.js", "recruitment.js", "screens.js", "apple-selection.js", "game.js", "tetris.js", "game2048.js", "game-ranking.js", "blog.js", "app.js"]) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = file + "?v=34";
        script.onload = resolve;
        script.onerror = reject;
        document.body.append(script);
      });
    }
    document.body.removeAttribute("data-auth-pending");
    if (window.YOUWITH_PUBLIC_PREVIEW) return;
    const checkSession = async () => {
      if (document.hidden) return;
      try {
        const check = await nativeFetch("/api/me", {cache:"no-store"});
        if (check.status === 401) goToLogin();
      } catch { /* A network outage does not revoke the session. */ }
    };
    document.addEventListener("visibilitychange", checkSession);
    setInterval(checkSession, 60000);
  } catch {
    document.body.innerHTML = '<main style="padding:32px"><h1>사이트를 열 수 없어요.</h1><p>로그인 서버 연결을 확인한 뒤 새로고침해주세요.</p><a href="/login.html">로그인으로 돌아가기</a></main>';
    document.body.removeAttribute("data-auth-pending");
  }
})();
