import { GameViewModel } from "./gameViewModel.js";
import { EFFECT_META, QuestionKind } from "./models.js";
import { SfxPlayer } from "./sfxPlayer.js";

const app = document.getElementById("app");
const urlParams = new URLSearchParams(window.location.search);
const APP_MODE = urlParams.get("mode") === "display" ? "display" : "control";
const IS_DISPLAY_MODE = APP_MODE === "display";
const STATE_STORAGE_KEY = "btt:web:shared-state";
const STATE_CHANNEL_NAME = "btt:web:sync";
const vm = IS_DISPLAY_MODE ? null : new GameViewModel();
const sfx = IS_DISPLAY_MODE ? new SfxPlayer() : null;
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(STATE_CHANNEL_NAME) : null;
let mediaSnapshot = new Map();
let previousState = null;
let discussionVideoPendingEnd = false;
let currentState = loadSharedState();
const persistentDiscussionShell = document.createElement("div");
persistentDiscussionShell.className = "discussion-shell";
persistentDiscussionShell.innerHTML = `
  <div class="discussion-shell-badge">SUPPORT FEED</div>
  <video
    class="discussion-video"
    data-persistent-media="discussion-video"
    src="./assets/media/get_help.mp4"
    autoplay
    playsinline
    preload="auto"
  ></video>
`;
const persistentDiscussionVideo = persistentDiscussionShell.querySelector("video");
persistentDiscussionVideo.addEventListener("ended", () => {
  discussionVideoPendingEnd = false;
  if (currentState) {
    render(currentState);
    syncPersistentDiscussionVideo(currentState);
  }
});

document.title = IS_DISPLAY_MODE ? "BTT Presentation" : "BTT Control";

function loadSharedState() {
  try {
    const raw = window.localStorage.getItem(STATE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function publishState(state) {
  currentState = state;
  try {
    window.localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota or privacy-mode failures.
  }

  syncChannel?.postMessage({
    type: "state_snapshot",
    payload: state,
  });
}

function applyIncomingState(state) {
  if (!state) return;
  currentState = state;
  render(state);
  previousState = {
    ...state,
    teams: state.teams.map((team) => ({ ...team })),
  };
}

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function activeTeamIndexOf(state) {
  return state.stolenTurnTeamIndex ?? state.activeTeamIndex;
}

function getEffectMeta(effectType) {
  const fallback = {
    name: effectType ?? "UNKNOWN EFFECT",
    image: "nhin_trc_tuong_lai.jpg",
    desc: "Chưa có mô tả.",
    timing: "Chưa xác định.",
    usability: "Chưa xác định.",
  };
  return { ...fallback, ...(EFFECT_META[effectType] ?? {}) };
}

function getEffectAvailability(state, teamId, effect) {
  void state;
  void teamId;
  if (effect.used) return { usable: false, reason: "Đã sử dụng" };
  return { usable: true };
}

function scoreRow(state) {
  const activeIdx = activeTeamIndexOf(state);
  return `
    <div class="score-row">
      ${state.teams
        .map(
          (team) => `
            <div class="team-card ${team.id === activeIdx ? "active" : ""}">
              <div class="team-name">${esc(team.name)}</div>
              <div class="team-score">${team.score}</div>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function rankingsButton() {
  if (IS_DISPLAY_MODE) return "";
  return `
    <button class="ghost-icon" data-action="show-standings" title="Standings">
      <span>★</span>
    </button>
  `;
}

function renderModeToolbar() {
  if (IS_DISPLAY_MODE) return "";
  return `
    <div class="mode-toolbar">
      <div class="mode-badge">CONTROL</div>
      <button class="ghost open-display-btn" data-action="open-display-tab">Open Display Tab</button>
    </div>
  `;
}

function renderDisplayWaitingScreen() {
  return `
    <div class="screen game-theme waiting-screen">
      <section class="panel waiting-panel">
        <h1 class="title">DISPLAY MODE</h1>
        <p>Open the control tab first to start syncing the presentation screen.</p>
        <p class="waiting-hint">Use <code>?mode=control</code> in another tab.</p>
      </section>
    </div>
  `;
}

function captureMediaSnapshot() {
  const snapshot = new Map();
  app.querySelectorAll("video[data-media-key]").forEach((video) => {
    snapshot.set(video.dataset.mediaKey, {
      currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
      paused: video.paused,
    });
  });
  return snapshot;
}

function stopBombVideoPlayback() {
  app.querySelectorAll(".bomb-video").forEach((video) => {
    try {
      video.pause();
      video.loop = false;
      video.muted = true;
      video.currentTime = 0;
      video.removeAttribute("src");
      video.load();
    } catch {
      // Ignore media shutdown issues during screen transitions.
    }
  });
  mediaSnapshot.delete("bomb-video");
}

function isBombPresentation(state) {
  return (
    state.showingPresentationScreen &&
    state.selectedCardIndex != null &&
    state.cards[state.selectedCardIndex]?.type === "BOMB"
  );
}

function teardownOutgoingMedia(nextState) {
  const keepBombVideo = isBombPresentation(nextState);
  const keepDiscussionVideo =
    nextState.showingPresentationScreen && shouldShowDiscussionVideo(nextState);
  if (!keepBombVideo) mediaSnapshot.delete("bomb-video");

  app.querySelectorAll("video").forEach((video) => {
    const isPersistentDiscussion = video === persistentDiscussionVideo;
    const shouldKeep = keepBombVideo && video.dataset.mediaKey === "bomb-video";
    if (shouldKeep || (isPersistentDiscussion && keepDiscussionVideo)) return;

    try {
      video.pause();
      if (!isPersistentDiscussion || !keepDiscussionVideo) {
        video.currentTime = 0;
      }
    } catch {
      // Ignore teardown errors from browser media internals.
    }

    if (!isPersistentDiscussion) {
      try {
        video.loop = false;
        video.muted = true;
        video.removeAttribute("src");
        video.load();
      } catch {
        // Ignore unload failures for detached media nodes.
      }
    }
  });
}

function restoreMediaSnapshot() {
  app.querySelectorAll("video[data-media-key]").forEach((video) => {
    const saved = mediaSnapshot.get(video.dataset.mediaKey);
    if (saved && Number.isFinite(saved.currentTime) && saved.currentTime > 0) {
      const applyTime = () => {
        try {
          video.currentTime = saved.currentTime;
        } catch {
          // Ignore seek timing errors while metadata is loading.
        }
      };

      if (video.readyState >= 1) applyTime();
      else video.addEventListener("loadedmetadata", applyTime, { once: true });
    }

    if (!saved || !saved.paused || video.autoplay) {
      const startPlayback = () => {
        video.play().catch(() => {});
      };

      if (video.readyState >= 2) startPlayback();
      else video.addEventListener("canplay", startPlayback, { once: true });
    }
  });
}

function shouldShowDiscussionVideo(state) {
  return state.isDiscussionPhase || discussionVideoPendingEnd;
}

function syncPersistentDiscussionVideo(state) {
  const host = app.querySelector("[data-support-host='discussion']");
  const video = persistentDiscussionVideo;

  if (state.showingPresentationScreen && shouldShowDiscussionVideo(state) && host) {
    if (persistentDiscussionShell.parentElement !== host) {
      host.appendChild(persistentDiscussionShell);
    }

    if (state.isDiscussionPhase && !previousState?.isDiscussionPhase) {
      discussionVideoPendingEnd = true;
      video.currentTime = 0;
    }

    if (video.paused) {
      video.play().catch(() => {});
    }
    return;
  }

  video.pause();
  if (persistentDiscussionShell.parentElement) {
    persistentDiscussionShell.parentElement.removeChild(persistentDiscussionShell);
  }
}

function renderCardsGrid(state) {
  return `
    <div class="grid">
      ${state.cards
        .map((card, index) => {
          const classes = [
            "game-card",
            !card.isRevealed ? "hidden" : "",
            card.isRevealed && card.type === "QUESTION" ? "solved" : "",
            card.isRevealed && card.type === "BOMB" ? "bomb" : "",
          ]
            .filter(Boolean)
            .join(" ");

          let content = `#${index + 1}`;
          if (card.isRevealed && card.type === "QUESTION") content = "X";
          if (card.isRevealed && card.type === "BOMB") content = "💣";

          return `
            <button class="${classes}" data-action="open-card" data-index="${index}">
              ${content}
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderEffectSheet(state) {
  if (!state.showEffectSheet) return "";
  const activeIdx = activeTeamIndexOf(state);
  return `
    <div class="modal-backdrop" data-action="close-sheet-bg">
      <div class="sheet" data-stop-click="1">
        <h3 class="sheet-title">THẺ CHỨC NĂNG</h3>
        <div class="effect-grid">
          ${state.teams
            .map(
              (team) => `
                <div class="effect-team ${team.id === activeIdx ? "active" : ""}">
                  <h4>${esc(team.name)}</h4>
                  <div class="effect-cards">
                    ${team.effectCards
                      .map((effect) => {
                        const meta = getEffectMeta(effect.type);
                        const availability = getEffectAvailability(state, team.id, effect);
                        return `
                          <div
                            class="effect-card ${effect.used ? "used" : ""} ${availability.usable ? "" : "disabled"}"
                            ${availability.usable ? `data-action="effect" data-team="${team.id}" data-effect="${effect.id}"` : ""}
                            title="${availability.usable ? `${meta.desc} - ${meta.timing}` : (availability.reason ?? "Khong kha dung")}"
                          >
                            <img src="./assets/effects/${meta.image}" alt="${meta.name}">
                            <div class="effect-card-name">${meta.name}</div>
                            <div class="effect-card-meta">${meta.timing}</div>
                          </div>
                        `;
                      })
                      .join("")}
                  </div>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderFloatingControls() {
  return `
    <div class="floating-controls">
      <button class="fab fab-team" data-action="shift-team" data-delta="-1">T-</button>
      <button class="fab fab-team" data-action="shift-team" data-delta="1">T+</button>
      <button class="fab fab-minus" data-action="add-score-active" data-delta="-5">-5</button>
      <button class="fab fab-plus" data-action="add-score-active" data-delta="5">+5</button>
    </div>
  `;
}

function renderAvailableEffects(state) {
  const activeIdx = activeTeamIndexOf(state);
  const rows = state.teams
    .map((team) => {
      const unused = team.effectCards.filter((effect) => !effect.used);
      if (unused.length === 0) return "";
      return `
        <div class="team-effect-card ${team.id === activeIdx ? "active" : ""}">
          <div class="team-effect-name">${esc(team.name)}</div>
          <div class="effects-flow">
            ${unused
              .map((effect) => {
                const meta = getEffectMeta(effect.type);
                const availability = getEffectAvailability(state, team.id, effect);
                return `
                  <button
                    class="effect-pill ${availability.usable ? "" : "disabled"}"
                    ${availability.usable ? "" : "disabled"}
                    ${
                      availability.usable
                        ? `data-action="effect" data-team="${team.id}" data-effect="${effect.id}"`
                        : `title="${availability.reason ?? "Không khả dụng"}"`
                    }
                  >
                    <span>${esc(String(meta.name).toUpperCase())}</span>
                    <small>${esc(meta.timing)}</small>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    })
    .filter(Boolean)
    .join("");

  if (!rows) return "";

  return `
    <section class="panel inline-effects">
      <div class="panel-heading">
        <h3 class="section-title">THẺ HIỆU ỨNG</h3>
        <div class="inline-hint">Bản rút gọn</div>
      </div>
      <div class="team-effects-grid">${rows}</div>
    </section>
  `;
}

function renderQuestionChoices(card, state) {
  if (card.kind !== QuestionKind.MULTIPLE_CHOICE) return "";

  const letters = ["A", "B", "C", "D"];
  return `
    <div class="choices">
      ${card.choices
        .map((choice, idx) => {
          const isSelected = state.selectedChoiceIndex === idx;
          const isAnswered = state.selectedChoiceIndex != null;
          const isCorrect = idx === card.correctChoiceIndex;
          let classes = "choice";
          if (!card.isRevealed && isSelected) classes += " selected";
          if (card.isRevealed && state.answerTimedOut && isCorrect && !isAnswered) classes += " timeout";
          if (card.isRevealed && isCorrect && isAnswered) classes += " correct";
          if (card.isRevealed && isSelected && !isCorrect && isAnswered) classes += " wrong";

          return `
            <button
              class="${classes}"
              data-action="pick-choice"
              data-choice="${idx}"
              ${card.isRevealed || isAnswered ? "disabled" : ""}
            >
              <span class="choice-letter">${letters[idx] ?? "D"}</span>
              <span class="choice-text">${esc(choice)}</span>
              <span class="choice-status">
                ${
                  card.isRevealed
                    ? state.answerTimedOut && isCorrect && !isAnswered
                      ? "⏱"
                      : isCorrect && isAnswered
                        ? "✓"
                        : isSelected && !isCorrect && isAnswered
                          ? "✕"
                          : ""
                    : ""
                }
              </span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderQuestionBody(card, state) {
  const cardIdParts = card.id.split("_");
  const cardIndex = Number.parseInt(cardIdParts[cardIdParts.length - 1], 10);
  const titleIndex = Number.isNaN(cardIndex) ? "" : `Ô ${cardIndex}: `;

  let title = "CÂU HỎI TRẮC NGHIỆM";
  if (card.kind === QuestionKind.ESSAY) title = "CÂU HỎI TỰ LUẬN";
  if (card.kind === QuestionKind.REAL_WORLD_CHALLENGE) title = "THỬ THÁCH";

  return `
    <section class="panel question-stage ${state.isTimerRunning || card.isRevealed ? "" : "ready"}" data-action="start-timer">
      <div class="question-shell">
        <h2 class="question-kind">${esc(titleIndex)}${title}</h2>
        <p class="question-text">${esc(card.text)}</p>
        ${
          !card.isRevealed &&
          !state.isTimerRunning &&
          !state.isDiscussionPhase &&
          [QuestionKind.MULTIPLE_CHOICE, QuestionKind.ESSAY].includes(card.kind)
            ? `<div class="start-hint">Bắt đầu đếm giờ</div>`
            : ""
        }
        ${renderQuestionChoices(card, state)}
        ${
          card.kind === QuestionKind.ESSAY && card.isRevealed
            ? `
              <div class="essay-answer">
                <div class="essay-label">ĐÁP ÁN ĐÚNG</div>
                <div class="essay-text">${esc(card.correctAnswerText ?? "")}</div>
              </div>
            `
            : ""
        }
      </div>
    </section>
  `;
}

function renderSupportFeedPanel(state) {
  if (!IS_DISPLAY_MODE) return "";
  if (!shouldShowDiscussionVideo(state)) return "";

  return `
    <section class="panel support-feed-panel">
      <div class="panel-heading">
        <h3 class="section-title">TRỢ GIÚP</h3>
        <div class="inline-hint">Video hỗ trợ</div>
      </div>
      <div class="support-feed-body">
        <div class="support-feed-copy">
          Đội chơi đang ở giai đoạn thảo luận.
        </div>
        <div class="support-feed-host" data-support-host="discussion"></div>
      </div>
    </section>
  `;
}

function renderQuestionScreen(state, card) {
  const seconds = state.timerMs == null ? null : Math.floor(state.timerMs / 1000);
  return `
    <div class="screen game-theme question-screen">
      ${renderModeToolbar()}
      <div class="top-bar">
        ${
          IS_DISPLAY_MODE
            ? `<div class="top-spacer"></div>`
            : `<button class="back-btn" data-action="close-presentation">←</button>`
        }
        ${
          seconds != null
            ? `
              <div class="timer-wrap">
                <div class="timer-badge ${seconds <= 5 && state.isTimerRunning ? "urgent" : ""}">
                  ${seconds}
                </div>
              </div>
            `
            : `<div class="timer-wrap"></div>`
        }
        <div class="top-spacer"></div>
      </div>
      <div class="question-layout">
        <div class="question-primary question-primary-wide">
          ${renderQuestionBody(card, state)}
        </div>
        <div class="question-sidebar">
          ${renderSupportFeedPanel(state)}
          ${!IS_DISPLAY_MODE && card.type === "QUESTION" ? renderAvailableEffects(state) : ""}
          <section class="panel score-panel compact-score-panel">
            <div class="panel-heading">
              <h3 class="section-title">BẢNG XẾP HẠNG</h3>
              ${rankingsButton()}
            </div>
            ${scoreRow(state)}
          </section>
        </div>
      </div>
      ${!IS_DISPLAY_MODE ? renderFloatingControls() : ""}
    </div>
  `;
}

function renderBombScreen(state) {
  return `
    <div class="screen game-theme bomb-screen">
      ${renderModeToolbar()}
      <div class="top-bar">
        ${
          IS_DISPLAY_MODE
            ? `<div class="top-spacer"></div>`
            : `<button class="back-btn" data-action="close-presentation">←</button>`
        }
        <div class="timer-wrap"></div>
        <div class="top-spacer"></div>
      </div>
      <section class="panel bomb-wrap">
        ${
          IS_DISPLAY_MODE
            ? `<video class="bomb-video" data-media-key="bomb-video" src="./assets/media/explosion.mp4" autoplay playsinline></video>`
            : `<div class="bomb-control-card"><div class="bomb-control-icon">💣</div><div class="bomb-control-copy">Bomb da mo</div></div>`
        }
      </section>
      <section class="panel score-panel">
        <div class="panel-heading">
          <h3 class="section-title">BẢNG XẾP HẠNG</h3>
          ${rankingsButton()}
        </div>
        ${scoreRow(state)}
      </section>
      ${!IS_DISPLAY_MODE ? renderFloatingControls() : ""}
    </div>
  `;
}

function renderGameScreen(state) {
  return `
    <div class="screen game-theme board-screen">
      ${renderModeToolbar()}
      <section class="panel header-card">
        <div class="panel-heading">
          <h2 class="title">BẢNG XẾP HẠNG</h2>
          ${rankingsButton()}
        </div>
        ${scoreRow(state)}
      </section>
      <section class="board-section">
        <h1 class="board-title">CARD BOARD</h1>
        <section class="panel board">${renderCardsGrid(state)}</section>
      </section>
      ${!IS_DISPLAY_MODE ? `<button class="cta" data-action="open-effect-sheet">CÁC THẺ CHỨC NĂNG CỦA TỪNG ĐỘI CÒN LẠI</button>` : ""}
      ${!IS_DISPLAY_MODE ? renderEffectSheet(state) : ""}
      ${!IS_DISPLAY_MODE ? renderFloatingControls() : ""}
    </div>
  `;
}

function renderStandingRows(teams) {
  return teams
    .slice()
    .sort((a, b) => b.score - a.score)
    .map((team, index) => {
      const rank = index + 1;
      const rankClass = rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "";
      return `
        <div class="standing-row ${rankClass}">
          <div class="standing-left">
            <div class="standing-rank">#${rank}</div>
            <div class="standing-name">${esc(team.name)} ${rank === 1 ? "★" : ""}</div>
          </div>
          <div class="standing-score">${team.score} PTS</div>
        </div>
      `;
    })
    .join("");
}

function renderStandingsScreen(state) {
  return `
    <div class="screen game-theme standings-screen">
      ${renderModeToolbar()}
      <div class="standings-title">${state.gameOver ? "KẾT QUẢ CHUNG CUỘC" : "BẢNG XẾP HẠNG"}</div>
      <section class="panel standings-panel">
        ${renderStandingRows(state.teams)}
      </section>
      ${
        !IS_DISPLAY_MODE && !state.gameOver
          ? `<button class="start-btn close-standings" data-action="close-standings">CLOSE</button>`
          : ""
      }
    </div>
  `;
}

function ruleGameplayPage() {
  return `
    <div class="rules-card panel">
      <h2 class="title">1. Quy tắc trò chơi</h2>
      <p>Màn hình sẽ hiển thị 48 ô vuông chứa bí mật ngẫu nhiên.</p>
      <p class="rules-subtitle">Mỗi ô vuông có thể là:</p>
      <div class="rule-grid cols-3">
        <div class="tile"><h3>❓ Câu hỏi</h3><p>Trả lời đúng để ghi điểm.</p></div>
        <div class="tile"><h3>⭐ Thử thách</h3><p>Thực hiện thử thách từ quản trò.</p></div>
        <div class="tile"><h3>💣 Bomb</h3><p>Bị trừ trực tiếp 20 điểm và mất lượt.</p></div>
      </div>
      <p class="rules-subtitle">Hệ thống điểm số:</p>
      <div class="rule-grid cols-4">
        <div class="tile">🎯 Điểm khởi đầu: 100</div>
        <div class="tile">✅ Trả lời đúng: +10</div>
        <div class="tile">❌ Trả lời sai: -5</div>
        <div class="tile">💥 Gặp Bomb: -20</div>
      </div>
    </div>
  `;
}

function rulePowerupPage() {
  return `
    <div class="rules-card panel">
      <h2 class="title">2. Hệ thống Lá bài Chức năng</h2>
      <p>Mỗi đội nhận 3 thẻ ngẫu nhiên. Sử dụng 1 lần duy nhất.</p>
      <div class="rule-grid cols-4">
        ${Object.values(EFFECT_META)
          .map(
            (meta) => `
              <div class="tile">
                <img src="./assets/effects/${meta.image}" alt="${meta.name}" class="rules-effect-image">
                <div class="rules-effect-name">${meta.name}</div>
                <div class="rules-effect-desc">Chức năng: ${meta.desc}</div>
                <div class="rules-effect-timing">Thời điểm: ${meta.timing}</div>
                <div class="rules-effect-usage">Khả dụng: ${meta.usability}</div>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function ruleSummaryPage() {
  return `
    <div class="rules-card panel">
      <h2 class="title">Các bạn đã sẵn sàng chưa?</h2>
      <div class="rule-grid">
        <div class="tile">💪 8 đội chơi</div>
        <div class="tile">🎲 48 ô bí ẩn</div>
        <div class="tile">🧠 40 câu hỏi và thử thách</div>
        <div class="tile">✨ 8 loại thẻ chức năng</div>
      </div>
      <p class="summary-copy">Các đội hãy chơi một cách công bằng và vui vẻ nhé!</p>
    </div>
  `;
}

function renderRulesScreen(state) {
  const page = state.rulesPage ?? 0;
  let pageHtml = `<img class="rules-intro-image panel" src="./assets/media/intro.jpg" alt="Intro">`;
  if (page === 1) pageHtml = ruleGameplayPage();
  if (page === 2) pageHtml = rulePowerupPage();
  if (page === 3) pageHtml = ruleSummaryPage();

  return `
    <div class="rules game-theme">
      ${renderModeToolbar()}
      <div class="rules-page rules-page-${page}">${pageHtml}</div>
      <div class="rules-nav">
        ${
          IS_DISPLAY_MODE
            ? `<div class="rules-nav-spacer"></div>`
            : `<button class="ghost" data-action="rules-prev" ${page === 0 ? "disabled" : ""}>Back</button>`
        }
        <div class="rules-counter">${page + 1} / 4</div>
        ${
          IS_DISPLAY_MODE
            ? `<div class="rules-nav-spacer"></div>`
            : page < 3
            ? `<button class="ghost" data-action="rules-next">Next</button>`
            : `<button class="start-btn" data-action="start-game">START</button>`
        }
      </div>
    </div>
  `;
}

function render(state) {
  if (!state) {
    app.innerHTML = renderDisplayWaitingScreen();
    return;
  }

  mediaSnapshot = captureMediaSnapshot();

  let html;
  if (state.showingRules) {
    html = renderRulesScreen(state);
  } else if (state.showingStandings) {
    html = renderStandingsScreen(state);
  } else if (state.showingPresentationScreen && state.selectedCardIndex != null) {
    const card = state.cards[state.selectedCardIndex];
    html = card?.type === "BOMB" ? renderBombScreen(state) : renderQuestionScreen(state, card);
  } else {
    html = renderGameScreen(state);
  }

  teardownOutgoingMedia(state);
  app.innerHTML = html;
  restoreMediaSnapshot();
  syncPersistentDiscussionVideo(state);
}

function handleAction(target) {
  if (IS_DISPLAY_MODE || !vm) return;

  const actionNode = target.closest("[data-action]");
  if (!actionNode) return;

  const action = actionNode.dataset.action;
  const state = vm.state;

  if (action === "open-card") {
    sfx?.playByName("sfx_card_flip");
    vm.onCardClicked(Number(actionNode.dataset.index));
    return;
  }

  if (action === "open-effect-sheet") {
    sfx?.playByName("sfx_open_sheet");
    vm.setShowEffectSheet(true);
    return;
  }

  if (action === "close-sheet-bg") {
    if (target.closest("[data-stop-click='1']")) return;
    vm.setShowEffectSheet(false);
    return;
  }

  if (action === "effect") {
    sfx?.playByName("sfx_open_sheet");
    vm.useEffectCard(Number(actionNode.dataset.team), actionNode.dataset.effect);
    return;
  }

  if (action === "shift-team") {
    vm.shiftActiveTeam(Number(actionNode.dataset.delta));
    return;
  }

  if (action === "add-score-active") {
    const delta = Number(actionNode.dataset.delta);
    const teamId = activeTeamIndexOf(state);
    vm.addPointsManually(delta, teamId);
    return;
  }

  if (action === "close-presentation") {
    stopBombVideoPlayback();
    vm.closePresentationScreen();
    return;
  }

  if (action === "pick-choice") {
    sfx?.playByName("sfx_answer_select");
    vm.submitAnswer(Number(actionNode.dataset.choice));
    return;
  }

  if (action === "start-timer") {
    vm.startTimerManually();
    return;
  }

  if (action === "show-standings") {
    vm.showStandings();
    return;
  }

  if (action === "close-standings") {
    vm.hideStandings();
    return;
  }

  if (action === "rules-prev") {
    vm.setState((current) => ({
      ...current,
      rulesPage: Math.max(0, current.rulesPage - 1),
    }));
    return;
  }

  if (action === "rules-next") {
    vm.setState((current) => ({
      ...current,
      rulesPage: Math.min(3, current.rulesPage + 1),
    }));
    return;
  }

  if (action === "start-game") {
    vm.closeRulesScreen();
    return;
  }

  if (action === "open-display-tab") {
    window.open(`${window.location.pathname}?mode=display`, "_blank", "noopener");
  }
}

if (!IS_DISPLAY_MODE) {
  app.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    handleAction(event.target);
  });
}

function syncAudioForState(state) {
  if (!IS_DISPLAY_MODE || !sfx || !state) return;

  const shouldPlayTicking =
    state.showingPresentationScreen &&
    state.selectedCardIndex != null &&
    state.cards[state.selectedCardIndex]?.type === "QUESTION" &&
    !state.cards[state.selectedCardIndex]?.isRevealed &&
    state.isTimerRunning &&
    !state.isDiscussionPhase;

  if (shouldPlayTicking) sfx.startTimeoutTicking();
  else sfx.stopTimeoutTicking();
}

syncChannel?.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;

  if (message.type === "request_state" && !IS_DISPLAY_MODE && vm) {
    publishState(vm.state);
    return;
  }

  if (message.type === "state_snapshot" && IS_DISPLAY_MODE) {
    syncAudioForState(message.payload);
    applyIncomingState(message.payload);
  }
});

window.addEventListener("storage", (event) => {
  if (!IS_DISPLAY_MODE || event.key !== STATE_STORAGE_KEY || !event.newValue) return;
  try {
    const nextState = JSON.parse(event.newValue);
    syncAudioForState(nextState);
    applyIncomingState(nextState);
  } catch {
    // Ignore malformed external storage payloads.
  }
});

if (IS_DISPLAY_MODE) {
  if (currentState) {
    syncAudioForState(currentState);
    render(currentState);
    previousState = {
      ...currentState,
      teams: currentState.teams.map((team) => ({ ...team })),
    };
  } else {
    render(null);
  }
  syncChannel?.postMessage({ type: "request_state" });
} else if (vm) {
  vm.subscribe((state) => {
    currentState = state;
    render(state);
    publishState(state);
    previousState = {
      ...state,
      teams: state.teams.map((team) => ({ ...team })),
    };
  });
}
