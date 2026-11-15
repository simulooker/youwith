// 사과게임 상태, 타이머, 드래그 입력을 관리합니다.
let gameStarted = false,
  gameScore = 0,
  gameRemaining = 60,
  selectedApples = [],
  gameValues = [],
  gameInterval;
let selectionDrag = null;
function startGame() {
  clearInterval(gameInterval);
  gameStarted = true;
  gameScore = 0;
  gameRemaining = 60;
  selectedApples = [];
  selectionDrag = null;

  gameValues = Array.from(
    { length: 9 * 16 },
    () => 1 + Math.floor(Math.random() * 9),
  );
  render();
  gameInterval = setInterval(() => {
    if (document.hidden) return;
    gameRemaining--;
    const el = document.querySelector("#game-time");
    if (el) el.textContent = gameRemaining;
    const progress = document.querySelector("#game-progress");
    if (progress) {
      progress.setAttribute("aria-valuenow", String(gameRemaining));
      progress.querySelector("span").style.transform =
        `scaleX(${gameRemaining / 60})`;
    }
    if (gameRemaining <= 0) {
      clearInterval(gameInterval);
      gameStarted = false;
      selectedApples = [];
      selectionDrag = null;

      if (page === "game") render();
      toast(`게임 종료! ${gameScore}점을 기록했어요.`);
    }
  }, 1000);
}
function appleCells(board) {
  const bounds = board.getBoundingClientRect();
  return [...board.querySelectorAll("[data-apple]")].map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      index: Number(el.dataset.apple),
      x: rect.left - bounds.left + rect.width / 2,
      y: rect.top - bounds.top + rect.height / 2,
    };
  });
}
function previewRectangle(board, from, to, cells) {
  const selection = selectAppleRectangle(cells, from, to, gameValues);
  selectedApples = selection.indices;
  board.querySelectorAll("[data-apple]").forEach((el) => {
    const picked = selectedApples.includes(Number(el.dataset.apple));
    el.classList.toggle("picked", picked);
    el.setAttribute("aria-pressed", String(picked));
  });
  const box = board.querySelector(".selection-box");
  box.hidden = false;
  Object.assign(box.style, {
    left: selection.left + "px",
    top: selection.top + "px",
    width: selection.width + "px",
    height: selection.height + "px",
  });
  box.classList.toggle("valid", selection.sum === 10);
  return selection;
}
function cancelAppleSelection(board) {
  selectionDrag = null;

  selectedApples = [];
  board.querySelectorAll(".picked").forEach((el) => {
    el.classList.remove("picked");
    el.setAttribute("aria-pressed", "false");
  });
  const box = board.querySelector(".selection-box");
  if (box) box.hidden = true;
}
function finishRectangle(board, selection) {
  if (!gameStarted) {
    cancelAppleSelection(board);
    return;
  }
  const count = selection.indices.length;
  if (selection.sum === 10 && count) {
    board.querySelectorAll("[data-apple]").forEach((el) => {
      if (selection.indices.includes(Number(el.dataset.apple)))
        dropApple(board, el);
    });
    gameScore += count;
    selection.indices.forEach((i) => (gameValues[i] = 0));
    document.querySelector("#game-score").textContent = gameScore;
    // Keep cleared cells in place: later rectangles can include the empty spaces.
    board.querySelectorAll("[data-apple]").forEach((el) => {
      if (!gameValues[Number(el.dataset.apple)]) {
        el.classList.add("cleared");
        el.disabled = true;
        el.setAttribute("aria-label", "빈 칸");
        el.textContent = "";
      }
    });
    if (gameValues.every((v) => v === 0)) {
      gameStarted = false;
      clearInterval(gameInterval);
      toast("모든 사과를 찾았어요!");
    }
  }
  cancelAppleSelection(board);
}
function dropApple(board, apple) {
  if (
    document.documentElement?.dataset.reducedMotion === "true" ||
    (typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches)
  )
    return;
  if (!apple.cloneNode || typeof apple.animate !== "function") return;
  const boardRect = board.getBoundingClientRect(),
    rect = apple.getBoundingClientRect();
  const falling = apple.cloneNode(true);
  falling.removeAttribute("data-apple");
  falling.removeAttribute("aria-pressed");
  falling.setAttribute("aria-hidden", "true");
  falling.tabIndex = -1;
  falling.disabled = true;
  falling.classList.remove("picked");
  falling.classList.add("falling-apple");
  Object.assign(falling.style, {
    left: `${rect.left - boardRect.left}px`,
    top: `${rect.top - boardRect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  });
  board.appendChild(falling);
  const animation = falling.animate(
    [
      { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
      {
        transform: `translate(${Math.round((Math.random() - 0.5) * 90)}px, ${boardRect.bottom - rect.top + 70}px) rotate(${Math.round((Math.random() - 0.5) * 150)}deg)`,
        opacity: 0,
      },
    ],
    { duration: 620, easing: "cubic-bezier(.35,0,.85,.45)", fill: "forwards" },
  );
  animation.finished.then(
    () => falling.remove(),
    () => falling.remove(),
  );
}
function bindAppleSelection(root) {
  const board = root.querySelector("#apple-board");
  if (!board) return;
  const point = (e) => {
    const r = board.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(r.width, e.clientX - r.left)),
      y: Math.max(0, Math.min(r.height, e.clientY - r.top)),
    };
  };
  board.onpointerdown = (e) => {
    if (!gameStarted || !e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    cancelAppleSelection(board);
    selectionDrag = {
      pointerId: e.pointerId,
      from: point(e),
      cells: appleCells(board),
    };
    board.setPointerCapture(e.pointerId);
    previewRectangle(
      board,
      selectionDrag.from,
      selectionDrag.from,
      selectionDrag.cells,
    );
  };
  board.onpointermove = (e) => {
    if (selectionDrag?.pointerId === e.pointerId)
      previewRectangle(
        board,
        selectionDrag.from,
        point(e),
        selectionDrag.cells,
      );
  };
  board.onpointerup = (e) => {
    if (selectionDrag?.pointerId !== e.pointerId) return;
    const { from, cells } = selectionDrag,
      to = point(e);
    const selection = previewRectangle(board, from, to, cells);
    if (board.hasPointerCapture(e.pointerId))
      board.releasePointerCapture(e.pointerId);
    if (Math.hypot(to.x - from.x, to.y - from.y) < 5) {
      cancelAppleSelection(board);
      return;
    }
    finishRectangle(board, selection);
  };
  board.onpointercancel = () => {
    cancelAppleSelection(board);
  };
  board.onlostpointercapture = () => {
    if (selectionDrag) cancelAppleSelection(board);
  };
}
