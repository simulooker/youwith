const form = document.querySelector("#login-form");
form.addEventListener("submit", async event => {
  event.preventDefault();
  const button = form.querySelector("button"), error = document.querySelector("#login-error");
  button.disabled = true;
  button.textContent = "로그인 중…";
  error.textContent = "";
  try {
    const response = await fetch("/api/login", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify(Object.fromEntries(new FormData(form)))
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "로그인하지 못했어요. 다시 시도해주세요.");
    let destination = "#home";
    try {
      const saved = sessionStorage.getItem("youwith.returnHash");
      if (saved?.startsWith("#")) destination = saved;
      sessionStorage.removeItem("youwith.returnHash");
    } catch {}
    location.replace("/" + destination);
  } catch (failure) {
    error.textContent = failure instanceof SyntaxError || failure instanceof TypeError
      ? "로그인 서버에 연결할 수 없어요. 잠시 뒤 다시 시도해주세요." : failure.message;
  } finally {
    button.disabled = false;
    button.textContent = "로그인";
  }
});

const statusMessages = {
  pending: "가입 신청을 접수했어요. 운영진 승인 후 다시 로그인해주세요.",
  cancelled: "카카오 로그인을 취소했어요. 다시 시도할 수 있어요.",
  expired: "로그인 요청이 만료됐어요. 카카오 로그인을 다시 눌러주세요.",
  failed: "카카오 로그인에 실패했어요. 잠시 뒤 다시 시도해주세요.",
  unavailable: "카카오 로그인을 준비 중이에요. 운영진에게 문의해주세요.",
  address: "카카오에 등록된 사이트 주소로 접속해주세요. 운영진에게 주소를 확인할 수 있어요."
};
const loginStatus = new URLSearchParams(location.search).get("status");
const receipt = new URLSearchParams(location.search).get("ref");
document.querySelector("#kakao-status").textContent = (statusMessages[loginStatus] || "") +
  (loginStatus === "pending" && /^부원-[0-9a-f]{12}$/.test(receipt || "") ? ` 접수번호 ${receipt}를 운영진에게 알려주세요.` : "");
if (loginStatus) history.replaceState(null, "", "/login.html");
document.querySelector("#kakao-login").addEventListener("click", () => {
  try { sessionStorage.setItem("youwith.returnHash", "#home"); } catch {}
});
