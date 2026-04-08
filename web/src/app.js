import { GameViewModel } from "./gameViewModel.js";
import { EFFECT_META, QuestionKind } from "./models.js";
import { SfxPlayer } from "./sfxPlayer.js";

const app = document.getElementById("app");
const vm = new GameViewModel();
const sfx = new SfxPlayer();

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
  return `
    <button class="ghost-icon" data-action="show-standings" title="Standings">
      <span>★</span>
    </button>
  `;
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
                        const meta = EFFECT_META[effect.type];
                        return `
                          <div
                            class="effect-card ${effect.used ? "used" : ""}"
                            data-action="effect"
                            data-team="${team.id}"
                            data-effect="${effect.id}"
                          >
                            <img src="./assets/effects/${meta.image}" alt="${meta.name}">
                            <div class="effect-card-name">${meta.name}</div>
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
        <div class="team-effect-row ${team.id === activeIdx ? "active" : ""}">
          <div class="team-effect-name">${esc(team.name)}:</div>
          <div class="effects-flow">
            ${unused
              .map((effect) => {
                const meta = EFFECT_META[effect.type];
                return `
                  <button
                    class="effect-pill"
                    data-action="effect"
                    data-team="${team.id}"
                    data-effect="${effect.id}"
                  >
                    ${esc(meta.name.toUpperCase())}
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
      <h3 class="section-title">Thẻ hiệu ứng có thể dùng</h3>
      ${rows}
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
            ? `<div class="start-hint">Chạm vào thẻ để bắt đầu đếm giờ</div>`
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
        ${
          state.isDiscussionPhase
            ? `
              <div class="discussion-video-wrap">
                <video
                  class="discussion-video"
                  src="./assets/media/get_help.mp4"
                  autoplay
                  muted
                  loop
                  playsinline
                ></video>
              </div>
            `
            : ""
        }
      </div>
    </section>
  `;
}

function renderQuestionScreen(state, card) {
  const seconds = state.timerMs == null ? null : Math.floor(state.timerMs / 1000);
  return `
    <div class="screen game-theme">
      <div class="top-bar">
        <button class="back-btn" data-action="close-presentation">←</button>
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
        ${renderQuestionBody(card, state)}
      </div>
      <div class="presentation-bottom">
        ${card.type === "QUESTION" ? renderAvailableEffects(state) : ""}
        <section class="panel score-panel">
          <div class="panel-heading">
            <h3 class="section-title">BẢNG XẾP HẠNG</h3>
            ${rankingsButton()}
          </div>
          ${scoreRow(state)}
        </section>
      </div>
      ${renderFloatingControls()}
    </div>
  `;
}

function renderBombScreen(state) {
  return `
    <div class="screen game-theme">
      <div class="top-bar">
        <button class="back-btn" data-action="close-presentation">←</button>
        <div class="timer-wrap"></div>
        <div class="top-spacer"></div>
      </div>
      <section class="panel bomb-wrap">
        <video class="bomb-video" src="./assets/media/explosion.mp4" autoplay muted loop playsinline></video>
      </section>
      <section class="panel score-panel">
        <div class="panel-heading">
          <h3 class="section-title">BẢNG XẾP HẠNG</h3>
          ${rankingsButton()}
        </div>
        ${scoreRow(state)}
      </section>
      ${renderFloatingControls()}
    </div>
  `;
}

function renderGameScreen(state) {
  return `
    <div class="screen game-theme">
      <section class="panel header-card">
        <div class="panel-heading">
          <h2 class="title">BẢNG XẾP HẠNG</h2>
          ${rankingsButton()}
        </div>
        ${scoreRow(state)}
      </section>
      <h1 class="board-title">CARD BOARD</h1>
      <section class="panel board">${renderCardsGrid(state)}</section>
      <button class="cta" data-action="open-effect-sheet">CÁC THẺ CHỨC NĂNG CỦA TỪNG ĐỘI CÒN LẠI</button>
      ${renderEffectSheet(state)}
      ${renderFloatingControls()}
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
      <div class="standings-title">${state.gameOver ? "FINAL STANDINGS" : "CURRENT STANDINGS"}</div>
      <section class="panel standings-panel">
        ${renderStandingRows(state.teams)}
      </section>
      ${
        !state.gameOver
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
        <div class="tile">🎯 Điểm khởi đầu: 0</div>
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
      <div class="rules-page">${pageHtml}</div>
      <div class="rules-nav">
        <button class="ghost" data-action="rules-prev" ${page === 0 ? "disabled" : ""}>Back</button>
        <div class="rules-counter">${page + 1} / 4</div>
        ${
          page < 3
            ? `<button class="ghost" data-action="rules-next">Next</button>`
            : `<button class="start-btn" data-action="start-game">START</button>`
        }
      </div>
    </div>
  `;
}

function render(state) {
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

  app.innerHTML = html;
}

function handleAction(target) {
  const actionNode = target.closest("[data-action]");
  if (!actionNode) return;

  const action = actionNode.dataset.action;
  const state = vm.state;

  if (action === "open-card") {
    sfx.playByName("sfx_card_flip");
    vm.onCardClicked(Number(actionNode.dataset.index));
    return;
  }

  if (action === "open-effect-sheet") {
    sfx.playByName("sfx_open_sheet");
    vm.setShowEffectSheet(true);
    return;
  }

  if (action === "close-sheet-bg") {
    if (target.closest("[data-stop-click='1']")) return;
    vm.setShowEffectSheet(false);
    return;
  }

  if (action === "effect") {
    sfx.playByName("sfx_open_sheet");
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
    if (delta > 0) sfx.playByName("sfx_score_up");
    if (delta < 0) sfx.playByName("sfx_score_down");
    vm.addPointsManually(delta, teamId);
    return;
  }

  if (action === "close-presentation") {
    vm.closePresentationScreen();
    return;
  }

  if (action === "pick-choice") {
    sfx.playByName("sfx_answer_select");
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
  }
}

app.addEventListener("click", (event) => {
  handleAction(event.target);
});

vm.subscribe((state) => {
  const shouldPlayTicking =
    state.showingPresentationScreen &&
    state.selectedCardIndex != null &&
    state.cards[state.selectedCardIndex]?.type === "QUESTION" &&
    !state.cards[state.selectedCardIndex]?.isRevealed &&
    state.isTimerRunning &&
    !state.isDiscussionPhase;

  if (shouldPlayTicking) sfx.startTimeoutTicking();
  else sfx.stopTimeoutTicking();

  render(state);
});
