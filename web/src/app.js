import { GameViewModel } from "./gameViewModel.js";
import { loadConfiguredCards } from "./cardsGenerator.js";
import { EFFECT_META, QuestionKind } from "./models.js";
import { SfxPlayer } from "./sfxPlayer.js";

const app = document.getElementById("app");
const urlParams = new URLSearchParams(window.location.search);
const APP_MODE = urlParams.get("mode") === "display" ? "display" : "control";
const IS_DISPLAY_MODE = APP_MODE === "display";
const STATE_STORAGE_KEY = "btt:web:shared-state";
const STATE_CHANNEL_NAME = "btt:web:sync";
const PREVIEW_MESSAGE_TYPE = "preview_card";
const preloadedCards = IS_DISPLAY_MODE ? null : await loadConfiguredCards();
const vm = IS_DISPLAY_MODE ? null : new GameViewModel({ initialCards: preloadedCards });
const sfx = IS_DISPLAY_MODE ? new SfxPlayer() : null;
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(STATE_CHANNEL_NAME) : null;
app.dataset.mode = APP_MODE;
let mediaSnapshot = new Map();
let previousState = null;
let discussionVideoPendingEnd = false;
let currentState = loadSharedState();
let lastActionNode = null;
let lastActionAt = 0;
let displayTransitionCardIndex = null;
let previewedCardIndex = null;
let lastPublishedPreviewCardIndex = null;
let presentationMediaRetryTimer = null;
const persistentBombShell = document.createElement("div");
persistentBombShell.className = "bomb-video-shell";
persistentBombShell.innerHTML = `
  <video
    class="bomb-video"
    data-persistent-media="bomb-video"
    src="./assets/media/explosion.mp4"
    autoplay
    playsinline
    preload="auto"
  ></video>
`;
const persistentBombVideo = persistentBombShell.querySelector("video");
const persistentDiscussionShell = document.createElement("div");
persistentDiscussionShell.className = "discussion-shell";
persistentDiscussionShell.innerHTML = `
  <div class="discussion-shell-badge">SUPPORT FEED</div>
  <video
    class="discussion-video"
    data-persistent-media="discussion-video"
    src="./assets/media/get_help.mp4"
    autoplay
    muted
    playsinline
    preload="auto"
  ></video>
`;
const persistentDiscussionVideo = persistentDiscussionShell.querySelector("video");
persistentDiscussionVideo.defaultMuted = true;
persistentDiscussionVideo.muted = true;
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
  renderIncomingDisplayState(state);
}

function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderChallengeImage(card) {
  if (card.kind !== QuestionKind.REAL_WORLD_CHALLENGE) return "";

  return `
    <figure class="challenge-image-frame">
      <img
        class="challenge-image"
        src="./assets/media/${encodeURIComponent(card.id)}.png"
        alt="Challenge image ${esc(card.id)}"
        loading="eager"
        onerror="this.closest('.challenge-image-frame')?.remove()"
      >
    </figure>
  `;
}

function activeTeamIndexOf(state) {
  return state.activeTeamIndex;
}

function resolveActionNode(target) {
  const element =
    target instanceof Element ? target : target?.parentElement instanceof Element ? target.parentElement : null;
  return element?.closest("[data-action]") ?? null;
}

function shouldSkipDuplicateAction(actionNode) {
  const now = performance.now();
  if (actionNode === lastActionNode && now - lastActionAt < 250) {
    return true;
  }
  lastActionNode = actionNode;
  lastActionAt = now;
  return false;
}

function publishPreviewCardIndex(index) {
  if (IS_DISPLAY_MODE || lastPublishedPreviewCardIndex === index) return;
  lastPublishedPreviewCardIndex = index;
  syncChannel?.postMessage({
    type: PREVIEW_MESSAGE_TYPE,
    payload: index,
  });
}

function rememberPreviousState(state) {
  previousState = state
    ? {
        ...state,
        teams: state.teams.map((team) => ({ ...team })),
      }
    : null;
}

function shouldAnimateDisplayCardOpen(nextState) {
  return (
    IS_DISPLAY_MODE &&
    typeof document.startViewTransition === "function" &&
    previousState != null &&
    !previousState.showingPresentationScreen &&
    nextState.showingPresentationScreen &&
    nextState.selectedCardIndex != null
  );
}

function renderIncomingDisplayState(state) {
  currentState = state;

  if (!shouldAnimateDisplayCardOpen(state)) {
    render(state);
    rememberPreviousState(state);
    return;
  }

  const cardIndex = state.selectedCardIndex;
  const sourceCard = app.querySelector(`[data-action="open-card"][data-index="${cardIndex}"]`);
  if (!sourceCard) {
    render(state);
    rememberPreviousState(state);
    return;
  }

  sourceCard.style.viewTransitionName = "opened-card";
  displayTransitionCardIndex = cardIndex;

  const transition = document.startViewTransition(() => {
    render(state);
  });

  transition.finished.finally(() => {
    sourceCard.style.viewTransitionName = "";
    displayTransitionCardIndex = null;
    if (currentState) render(currentState);
  });

  rememberPreviousState(state);
}

function renderOpenedCardTargetAttr(state) {
  return IS_DISPLAY_MODE &&
    displayTransitionCardIndex != null &&
    state.selectedCardIndex === displayTransitionCardIndex
    ? 'style="view-transition-name: opened-card;"'
    : "";
}

function syncPreviewCardHighlight(state = currentState) {
  const cards = app.querySelectorAll('.game-card[data-index]');
  if (cards.length === 0) return;

  const canPreview =
    IS_DISPLAY_MODE &&
    state &&
    !state.showingRules &&
    !state.showingStandings &&
    !state.showingPresentationScreen;

  cards.forEach((card) => {
    const cardIndex = Number(card.dataset.index);
    const isPreviewed =
      canPreview &&
      Number.isInteger(cardIndex) &&
      cardIndex === previewedCardIndex &&
      card.classList.contains("hidden");
    card.classList.toggle("previewed", isPreviewed);
  });
}

function scoreRow(state) {
  const activeIdx = activeTeamIndexOf(state);
  return `
    <div class="score-row">
      ${state.teams
        .map(
          (team) => {
            const content = `
              <div class="team-name">${esc(team.name)}</div>
              <div class="team-score">${team.score}</div>
              ${
                !IS_DISPLAY_MODE
                  ? `<div class="team-turns">Lượt còn: <strong>${state.turnsRemainingByTeam?.[team.id] ?? state.roundsPerTeam ?? 0}</strong></div>`
                  : ""
              }
            `;

            if (IS_DISPLAY_MODE) {
              return `<div class="team-card ${team.id === activeIdx ? "active" : ""}">${content}</div>`;
            }

            return `
              <button class="team-card control-team-card ${team.id === activeIdx ? "active" : ""}" data-action="select-team" data-team="${team.id}">
                ${content}
              </button>
            `;
          },
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
      <button class="start-btn end-game-btn" data-action="end-game">End Game</button>
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
  try {
    persistentBombVideo.pause();
    persistentBombVideo.currentTime = 0;
  } catch {
    // Ignore media shutdown issues during screen transitions.
  }
  if (persistentBombShell.parentElement) {
    persistentBombShell.parentElement.removeChild(persistentBombShell);
  }
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
    const isPersistentBomb = video === persistentBombVideo;
    const isPersistentDiscussion = video === persistentDiscussionVideo;
    const shouldKeep = keepBombVideo && video.dataset.mediaKey === "bomb-video";
    if (shouldKeep || (isPersistentBomb && keepBombVideo) || (isPersistentDiscussion && keepDiscussionVideo)) return;

    try {
      video.pause();
      if ((!isPersistentDiscussion || !keepDiscussionVideo) && (!isPersistentBomb || !keepBombVideo)) {
        video.currentTime = 0;
      }
    } catch {
      // Ignore teardown errors from browser media internals.
    }

    if (!isPersistentDiscussion && !isPersistentBomb) {
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

function attemptVideoPlayback(video) {
  if (!video) return;

  const startPlayback = () => {
    video.play().catch(() => {
      video.defaultMuted = true;
      video.muted = true;
      video.play().catch(() => {});
    });
  };

  if (video.readyState >= 2) startPlayback();
  else video.addEventListener("canplay", startPlayback, { once: true });
}

function shouldShowDiscussionVideo(state) {
  return !state.supportVideoForcedClosed && (state.isDiscussionPhase || discussionVideoPendingEnd);
}

function syncPersistentBombVideo(state) {
  const host = app.querySelector("[data-support-host='bomb']");

  if (IS_DISPLAY_MODE && isBombPresentation(state) && host) {
    if (persistentBombShell.parentElement !== host) {
      host.appendChild(persistentBombShell);
      try {
        persistentBombVideo.currentTime = 0;
      } catch {
        // Ignore seek errors before metadata is ready.
      }
    }
    attemptVideoPlayback(persistentBombVideo);
    return;
  }

  stopBombVideoPlayback();
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

    attemptVideoPlayback(video);
    return;
  }

  if (state.supportVideoForcedClosed || !state.showingPresentationScreen) {
    discussionVideoPendingEnd = false;
  }
  video.pause();
  if (persistentDiscussionShell.parentElement) {
    persistentDiscussionShell.parentElement.removeChild(persistentDiscussionShell);
  }
}

function syncPresentationMediaPlayback(state = currentState) {
  if (!IS_DISPLAY_MODE || !state) return;

  syncPersistentBombVideo(state);
  syncPersistentDiscussionVideo(state);
}

function ensurePresentationMediaRetryLoop() {
  if (!IS_DISPLAY_MODE) return;
  if (presentationMediaRetryTimer) return;

  presentationMediaRetryTimer = window.setInterval(() => {
    if (!currentState) return;

    const shouldRetryDiscussion =
      shouldShowDiscussionVideo(currentState) &&
      persistentDiscussionShell.parentElement &&
      persistentDiscussionVideo.paused;
    const shouldRetryBomb =
      isBombPresentation(currentState) &&
      persistentBombShell.parentElement &&
      persistentBombVideo.paused;

    if (shouldRetryDiscussion) attemptVideoPlayback(persistentDiscussionVideo);
    if (shouldRetryBomb) attemptVideoPlayback(persistentBombVideo);
  }, 1000);
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

function renderManualControlPanel(state, card = null) {
  if (IS_DISPLAY_MODE) return "";

  const activeTeam = state.teams[activeTeamIndexOf(state)];
  const isQuestionCard = card?.type === "QUESTION";
  const supportsTimer =
    isQuestionCard &&
    [QuestionKind.MULTIPLE_CHOICE, QuestionKind.ESSAY].includes(card.kind);
  const canRunQuestionActions = supportsTimer && !card.isRevealed;
  const canRevealCorrectAnswer =
    isQuestionCard &&
    !state.isRevealingAnswer;

  return `
    <section class="panel manual-control-panel">
      <div class="panel-heading">
        <h3 class="section-title">BẢNG ĐIỀU KHIỂN</h3>
        <div class="control-team-indicator">Đội đang chọn: <strong>${esc(activeTeam?.name ?? "")}</strong></div>
      </div>
      <div class="manual-control-grid">
        <div class="manual-group">
          <div class="manual-label">Điểm số</div>
          <div class="manual-buttons">
            <button class="control-btn control-btn-negative" data-action="adjust-score" data-delta="-5">-5</button>
            <button class="control-btn control-btn-negative" data-action="adjust-score" data-delta="-20">-20</button>
            <button class="control-btn" data-action="adjust-score" data-delta="10">+10</button>
            <button class="control-btn" data-action="adjust-score" data-delta="20">+20</button>
          </div>
        </div>
        <div class="manual-group">
          <div class="manual-label">Câu hỏi</div>
          <div class="manual-buttons">
            <button class="control-btn" data-action="start-question-timer" ${canRunQuestionActions && !state.isTimerRunning && !state.isDiscussionPhase ? "" : "disabled"}>Begin Timer</button>
            <button class="control-btn" data-action="reset-question-timer" ${supportsTimer && !card?.isRevealed ? "" : "disabled"}>Reset Timer</button>
            <button class="control-btn" data-action="start-get-help" ${canRunQuestionActions ? "" : "disabled"}>Show Get Help</button>
            <button class="control-btn" data-action="close-get-help" ${state.isDiscussionPhase ? "" : "disabled"}>Close Get Help</button>
            <button class="control-btn control-btn-warn" data-action="timeout-question" ${canRunQuestionActions ? "" : "disabled"}>Timeout</button>
            <button class="control-btn control-btn-accent" data-action="show-correct-answer" ${canRevealCorrectAnswer ? "" : "disabled"}>Show Correct Answer</button>
          </div>
        </div>
      </div>
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
          if (isSelected && (!card.isRevealed || !state.isRevealingAnswer)) classes += " selected";
          if (card.isRevealed && state.answerTimedOut && isCorrect && !isAnswered) classes += " timeout";
          if (card.isRevealed && state.isRevealingAnswer && isCorrect) classes += " correct";
          if (card.isRevealed && state.isRevealingAnswer && isSelected && !isCorrect) classes += " wrong";

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
                      : state.isRevealingAnswer && isCorrect
                        ? "✓"
                        : state.isRevealingAnswer && isSelected && !isCorrect
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
    <section class="panel question-stage ${state.isTimerRunning || card.isRevealed ? "" : "ready"}">
      <div class="question-shell">
        <h2 class="question-kind">${esc(titleIndex)}${title}</h2>
        <p class="question-text">${esc(card.text)}</p>
        ${renderChallengeImage(card)}
        ${renderQuestionChoices(card, state)}
        ${
          card.kind === QuestionKind.ESSAY && card.isRevealed && state.isRevealingAnswer
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
        <div
          class="question-primary question-primary-wide question-primary-shell"
          ${renderOpenedCardTargetAttr(state)}
        >
          ${renderQuestionBody(card, state)}
        </div>
        <div class="question-sidebar">
          ${renderSupportFeedPanel(state)}
          ${renderManualControlPanel(state, card)}
          <section class="panel score-panel compact-score-panel">
            <div class="panel-heading">
              <h3 class="section-title">BẢNG XẾP HẠNG</h3>
              ${rankingsButton()}
            </div>
            ${scoreRow(state)}
          </section>
        </div>
      </div>
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
      <section
        class="panel bomb-wrap"
        ${renderOpenedCardTargetAttr(state)}
      >
        ${
          IS_DISPLAY_MODE
            ? `<div class="bomb-video-host" data-support-host="bomb"></div>`
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
      ${renderManualControlPanel(state, null)}
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
      ${renderManualControlPanel(state, null)}
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
      <p>Mỗi đội nhận 3 thẻ ngẫu nhiên. Các lá bài vẫn được giới thiệu trên màn hình để người chơi nắm luật.</p>
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
        <div class="tile">🎛 Quản trò điều khiển trực tiếp</div>
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
  syncPresentationMediaPlayback(state);
  syncPreviewCardHighlight(state);
}

function handleAction(target) {
  if (IS_DISPLAY_MODE || !vm) return;

  const actionNode = resolveActionNode(target);
  if (!actionNode) return;
  if (shouldSkipDuplicateAction(actionNode)) return;

  const action = actionNode.dataset.action;
  const state = vm.state;

  if (action === "open-card") {
    sfx?.playByName("sfx_card_flip");
    publishPreviewCardIndex(null);
    vm.onCardClicked(Number(actionNode.dataset.index));
    return;
  }

  if (action === "select-team") {
    vm.selectActiveTeam(Number(actionNode.dataset.team));
    return;
  }

  if (action === "adjust-score") {
    const delta = Number(actionNode.dataset.delta);
    const teamId = activeTeamIndexOf(state);
    vm.addPointsManually(delta, teamId);
    sfx?.playByName(delta > 0 ? "sfx_score_up" : "sfx_score_down");
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

  if (action === "start-question-timer") {
    vm.startTimerManually();
    return;
  }

  if (action === "reset-question-timer") {
    vm.resetTimer();
    return;
  }

  if (action === "start-get-help") {
    vm.startGetHelpTimer();
    return;
  }

  if (action === "close-get-help") {
    discussionVideoPendingEnd = false;
    vm.closeGetHelpState();
    return;
  }

  if (action === "timeout-question") {
    vm.forceTimeout();
    return;
  }

  if (action === "show-correct-answer") {
    vm.revealCorrectAnswer();
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
    return;
  }

  if (action === "end-game") {
    vm.endGame();
  }
}

if (!IS_DISPLAY_MODE) {
  app.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    handleAction(event.target);
  });
  app.addEventListener("click", (event) => {
    handleAction(event.target);
  });
  app.addEventListener("pointerover", (event) => {
    if (event.pointerType !== "mouse" || !vm) return;
    if (vm.state.showingRules || vm.state.showingStandings || vm.state.showingPresentationScreen) {
      publishPreviewCardIndex(null);
      return;
    }
    const cardNode = event.target instanceof Element ? event.target.closest('[data-action="open-card"]') : null;
    publishPreviewCardIndex(cardNode ? Number(cardNode.dataset.index) : null);
  });
  app.addEventListener("pointerleave", () => {
    publishPreviewCardIndex(null);
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

  if (message.type === PREVIEW_MESSAGE_TYPE && IS_DISPLAY_MODE) {
    previewedCardIndex = Number.isInteger(message.payload) ? message.payload : null;
    syncPreviewCardHighlight();
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
  ensurePresentationMediaRetryLoop();
  window.addEventListener("focus", () => {
    syncPresentationMediaPlayback();
  });
  window.addEventListener("pageshow", () => {
    syncPresentationMediaPlayback();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncPresentationMediaPlayback();
  });

  if (currentState) {
    syncAudioForState(currentState);
    render(currentState);
    rememberPreviousState(currentState);
  } else {
    render(null);
  }
  syncChannel?.postMessage({ type: "request_state" });
} else if (vm) {
  vm.subscribe((state) => {
    currentState = state;
    render(state);
    publishState(state);
    rememberPreviousState(state);
  });
}
