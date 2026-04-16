import { SfxPlayer } from "./sfxPlayer.js";

const app = document.getElementById("app");
const params = new URLSearchParams(window.location.search);
const APP_MODE = params.get("mode") === "display" ? "display" : "control";
const IS_DISPLAY_MODE = APP_MODE === "display";
const STORAGE_KEY = "btt:minigame2:shared-state:v2";
const CHANNEL_NAME = "btt:minigame2:sync";
const CLIENT_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `client-${Math.random().toString(36).slice(2)}`;
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

const ROUND_META = {
  1: {
    short: "Round 1",
    title: "Mo o chien thuat",
    subtitle: "Operator chon tung o de lat Question, Challenge hoac Bomb.",
  },
  2: {
    short: "Round 2",
    title: "Hang ngang va dap an trung tam",
    subtitle: "Mo hang ngang, tung goi y va cac trang thai dac biet theo nut dieu khien.",
  },
  3: {
    short: "Round 3",
    title: "Goi cau hoi Quickfire",
    subtitle: "Chon goi, dieu khien dong ho 120 giay va bay Bomb/X2 cho cau tiep theo.",
  },
  4: {
    short: "Round 4",
    title: "Hung bien Final",
    subtitle: "Chon 2 doi, dieu khien cac giai doan va nhap diem cham tay.",
  },
};

const TEAM_CARD_OPTIONS = [
  { id: "x2", label: "X2" },
  { id: "steal", label: "Cuop" },
  { id: "attack", label: "Tan cong" },
  { id: "shield", label: "La chan" },
  { id: "objection", label: "Phan doi" },
  { id: "seeFuture", label: "See the Future" },
];

const ROUND1_REVEALS = {
  question: { label: "Question", icon: "?" },
  challenge: { label: "Challenge", icon: "!" },
  bomb: { label: "Bomb", icon: "B" },
};

const ROUND3_PACKS = [
  { id: "easy", label: "De" },
  { id: "medium", label: "Trung binh" },
  { id: "hard", label: "Kho" },
];

const ROUND4_STAGE_META = {
  opening: { label: "Mo dau", durationMs: 90_000 },
  rebuttal: { label: "Phan bien", durationMs: 60_000 },
  questioning: { label: "Chat van", durationMs: 60_000 },
  closing: { label: "Ket luan", durationMs: 30_000 },
};

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clone(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function createTimer(durationMs) {
  return {
    durationMs,
    remainingMs: durationMs,
    running: false,
    startedAt: null,
  };
}

function createManualContent(label, timerSeconds = 30) {
  return {
    title: label,
    questionType: "text",
    prompt: "",
    answer: "",
    imageSrc: "",
    choices: ["", "", "", ""],
    timerSeconds,
  };
}

function createPresentationState() {
  return {
    open: false,
    ref: null,
    showAnswer: false,
    timerVisible: true,
    effect: null,
    media: null,
    selectedChoiceIndex: -1,
    typedResponse: "",
    scoreTeamId: "team_1",
    timer: createTimer(30_000),
  };
}

function createTeam(index) {
  const id = `team_${index + 1}`;
  return {
    id,
    name: `Doi ${index + 1}`,
    score: 0,
    hidden: false,
    cards: Object.fromEntries(TEAM_CARD_OPTIONS.map((card) => [card.id, false])),
  };
}

function createRound1Cell(index) {
  return {
    id: `r1_${index + 1}`,
    number: index + 1,
    revealType: null,
    caption: "",
    content: createManualContent(`O ${index + 1}`, 30),
  };
}

function createRound2Row(index) {
  return {
    id: `r2_row_${index + 1}`,
    number: index + 1,
    clue: `Goi y hang ngang ${index + 1}`,
    opened: false,
    answerWord: `HANG${index + 1}`,
    startColumn: Math.max(1, 7 - Math.floor(`HANG${index + 1}`.length / 2)),
    content: createManualContent(`Hang ${index + 1}`, 45),
  };
}

function createRound3Question(index) {
  return {
    id: `q_${index + 1}`,
    label: `Cau ${index + 1}`,
    status: "pending",
    trap: null,
    content: createManualContent(`Cau ${index + 1}`, 120),
  };
}

function createDefaultState() {
  return {
    schemaVersion: 4,
    currentRound: 1,
    currentTeamId: "team_1",
    lastSoundCue: null,
    teams: Array.from({ length: 4 }, (_, index) => createTeam(index)),
    presentation: createPresentationState(),
    round1: {
      cells: Array.from({ length: 16 }, (_, index) => createRound1Cell(index)),
      activeEffect: null,
    },
    round2: {
      rows: Array.from({ length: 10 }, (_, index) => createRound2Row(index)),
      gridColumns: 14,
      highlightColumn: 7,
      centerAnswer: "",
      centerHints: ["Goi y 1", "Goi y 2", "Goi y 3", "Goi y 4"],
      revealedHintCount: 0,
      showCenterAnswer: false,
      statuses: {
        team_1: { shield: false, objection: false },
        team_2: { shield: false, objection: false },
        team_3: { shield: false, objection: false },
        team_4: { shield: false, objection: false },
      },
      seeFuture: {
        teamId: "team_1",
        hint: "Nhap goi y dac biet tai day.",
        visible: false,
      },
    },
    round3: {
      selectedPack: "easy",
      activeTeamId: "team_1",
      correctPoints: 10,
      wrongPoints: 10,
      packs: ROUND3_PACKS.map((pack) => ({
        id: pack.id,
        label: pack.label,
        questions: Array.from({ length: 7 }, (_, index) => createRound3Question(index)),
      })),
      armedTrap: null,
      lastTrapAnnouncement: null,
      timer: createTimer(120_000),
    },
    round4: {
      finalists: ["team_1", "team_2"],
      currentStage: "opening",
      timer: createTimer(ROUND4_STAGE_META.opening.durationMs),
      scores: {
        team_1: { content: "", rebuttal: "", skill: "" },
        team_2: { content: "", rebuttal: "", skill: "" },
        team_3: { content: "", rebuttal: "", skill: "" },
        team_4: { content: "", rebuttal: "", skill: "" },
      },
    },
  };
}

function hydrateState(parsed) {
  const base = createDefaultState();
  if (!parsed || typeof parsed !== "object") return base;

  const teams = Array.isArray(parsed.teams)
    ? base.teams.map((team, index) => ({
        ...team,
        ...(parsed.teams[index] ?? {}),
        cards: {
          ...team.cards,
          ...(parsed.teams[index]?.cards ?? {}),
        },
      }))
    : base.teams;

  const round1Cells = Array.isArray(parsed.round1?.cells)
    ? base.round1.cells.map((cell, index) => ({
        ...cell,
        ...(parsed.round1.cells[index] ?? {}),
        content: {
          ...cell.content,
          ...(parsed.round1.cells[index]?.content ?? {}),
        },
      }))
    : base.round1.cells;

  const round2Rows = Array.isArray(parsed.round2?.rows)
    ? base.round2.rows.map((row, index) => ({
        ...row,
        ...(parsed.round2.rows[index] ?? {}),
        content: {
          ...row.content,
          ...(parsed.round2.rows[index]?.content ?? {}),
        },
      }))
    : base.round2.rows;

  const round3Packs = Array.isArray(parsed.round3?.packs)
    ? base.round3.packs.map((pack, packIndex) => ({
        ...pack,
        ...(parsed.round3.packs[packIndex] ?? {}),
        questions: base.round3.packs[packIndex].questions.map((question, index) => ({
          ...question,
          ...(parsed.round3.packs[packIndex]?.questions?.[index] ?? {}),
          content: {
            ...question.content,
            ...(parsed.round3.packs[packIndex]?.questions?.[index]?.content ?? {}),
          },
        })),
      }))
    : base.round3.packs;

  return {
    ...base,
    ...parsed,
    teams,
    presentation: {
      ...base.presentation,
      ...(parsed.presentation ?? {}),
      timer: {
        ...base.presentation.timer,
        ...(parsed.presentation?.timer ?? {}),
      },
    },
    round1: {
      ...base.round1,
      ...(parsed.round1 ?? {}),
      cells: round1Cells,
    },
    round2: {
      ...base.round2,
      ...(parsed.round2 ?? {}),
      rows: round2Rows,
      centerHints: Array.isArray(parsed.round2?.centerHints)
        ? parsed.round2.centerHints
        : Array.isArray(parsed.round2?.centerKeywords)
          ? parsed.round2.centerKeywords
          : base.round2.centerHints,
      revealedHintCount: Number.isFinite(parsed.round2?.revealedHintCount)
        ? parsed.round2.revealedHintCount
        : Number.isFinite(parsed.round2?.revealedKeywordCount)
          ? parsed.round2.revealedKeywordCount
          : base.round2.revealedHintCount,
      statuses: {
        ...base.round2.statuses,
        ...(parsed.round2?.statuses ?? {}),
      },
      seeFuture: {
        ...base.round2.seeFuture,
        ...(parsed.round2?.seeFuture ?? {}),
      },
    },
    round3: {
      ...base.round3,
      ...(parsed.round3 ?? {}),
      packs: round3Packs,
      timer: {
        ...base.round3.timer,
        ...(parsed.round3?.timer ?? {}),
      },
    },
    round4: {
      ...base.round4,
      ...(parsed.round4 ?? {}),
      timer: {
        ...base.round4.timer,
        ...(parsed.round4?.timer ?? {}),
      },
      scores: {
        ...base.round4.scores,
        ...(parsed.round4?.scores ?? {}),
      },
    },
  };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return hydrateState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

let state = loadState();
let renderTicker = null;
let controlViewMode = "live";
const sfx = IS_DISPLAY_MODE ? new SfxPlayer() : null;
let lastSoundCueToken = null;
let tickingAudioActive = false;
const editorState = {
  round1Index: 0,
  round2Index: 0,
  round3PackId: state.round3?.selectedPack ?? "easy",
  round3Index: 0,
};

function saveState(nextState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function publishState(nextState) {
  syncChannel?.postMessage({
    type: "state_snapshot",
    source: CLIENT_ID,
    payload: nextState,
  });
}

function applyState(nextState, options = {}) {
  const { broadcast = true } = options;
  state = nextState;
  saveState(state);
  render();
  if (broadcast) publishState(state);
}

function updateState(mutator, options = {}) {
  const draft = clone(state);
  mutator(draft);
  applyState(draft, options);
}

function getTimerSnapshot(timer) {
  if (!timer) return { remainingMs: 0, durationMs: 1, running: false };
  if (!timer.running || timer.startedAt == null) {
    return {
      remainingMs: Math.max(0, timer.remainingMs ?? timer.durationMs ?? 0),
      durationMs: Math.max(1, timer.durationMs ?? 1),
      running: false,
    };
  }

  const elapsed = Date.now() - timer.startedAt;
  const remainingMs = Math.max(0, (timer.remainingMs ?? timer.durationMs ?? 0) - elapsed);
  return {
    remainingMs,
    durationMs: Math.max(1, timer.durationMs ?? 1),
    running: remainingMs > 0,
  };
}

function startTimer(timer) {
  const snapshot = getTimerSnapshot(timer);
  timer.durationMs = timer.durationMs ?? snapshot.durationMs;
  timer.remainingMs = snapshot.remainingMs || timer.durationMs;
  timer.running = true;
  timer.startedAt = Date.now();
}

function pauseTimer(timer) {
  const snapshot = getTimerSnapshot(timer);
  timer.remainingMs = snapshot.remainingMs;
  timer.running = false;
  timer.startedAt = null;
}

function resetTimer(timer, durationOverride = null) {
  const durationMs = durationOverride ?? timer.durationMs;
  timer.durationMs = durationMs;
  timer.remainingMs = durationMs;
  timer.running = false;
  timer.startedAt = null;
}

function settleExpiredTimers() {
  const nextState = clone(state);
  let changed = false;

  for (const timer of [nextState.round3.timer, nextState.round4.timer, nextState.presentation.timer]) {
    const snapshot = getTimerSnapshot(timer);
    if (timer.running && snapshot.remainingMs <= 0) {
      timer.remainingMs = 0;
      timer.running = false;
      timer.startedAt = null;
      changed = true;
    }
  }

  if (changed) applyState(nextState);
}

function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function getCurrentRoundMeta() {
  return ROUND_META[state.currentRound] ?? ROUND_META[1];
}

function getVisibleRoundNumber(currentState = state) {
  const ref = currentState.presentation?.ref;
  if (!currentState.presentation?.open || !ref) return currentState.currentRound;
  if (ref.scope === "round1-cell") return 1;
  if (ref.scope === "round2-row") return 2;
  if (ref.scope === "round3-question") return 3;
  return currentState.currentRound;
}

function getVisibleRoundMeta(currentState = state) {
  return ROUND_META[getVisibleRoundNumber(currentState)] ?? ROUND_META[1];
}

function findTeam(teamId) {
  return state.teams.find((team) => team.id === teamId) ?? null;
}

function getVisibleTeams() {
  return state.teams.filter((team) => !team.hidden);
}

function getRound3Pack(packId = state.round3.selectedPack) {
  return state.round3.packs.find((pack) => pack.id === packId) ?? state.round3.packs[0];
}

function getRound4TeamScore(teamId) {
  return state.round4.scores[teamId] ?? { content: "", rebuttal: "", skill: "" };
}

function getRound4Total(teamId) {
  const score = getRound4TeamScore(teamId);
  return ["content", "rebuttal", "skill"].reduce((sum, key) => sum + Number(score[key] || 0), 0);
}

function getScopedItem(currentState, scope, index, packId = null) {
  if (scope === "round1-cell") return currentState.round1.cells[index] ?? null;
  if (scope === "round2-row") return currentState.round2.rows[index] ?? null;
  if (scope === "round3-question") {
    const pack = currentState.round3.packs.find((item) => item.id === packId) ?? currentState.round3.packs[0];
    return pack?.questions[index] ?? null;
  }
  return null;
}

function withScopedItem(currentState, scope, index, packId, updater) {
  const item = getScopedItem(currentState, scope, index, packId);
  if (!item) return;
  updater(item);
}

function getSelectedRound1Cell() {
  return state.round1.cells[editorState.round1Index] ?? state.round1.cells[0];
}

function getSelectedRound2Row() {
  return state.round2.rows[editorState.round2Index] ?? state.round2.rows[0];
}

function clampInteger(value, min, max, fallback = min) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function getRound2GridColumns(currentState = state) {
  return clampInteger(currentState.round2.gridColumns, 8, 20, 14);
}

function getRound2HighlightColumn(currentState = state) {
  return clampInteger(currentState.round2.highlightColumn, 1, getRound2GridColumns(currentState), 7);
}

function getRound2AnswerLetters(row) {
  return Array.from(String(row?.answerWord ?? "").trim().toUpperCase().replace(/\s+/g, ""));
}

function getRound2RowMetrics(row, currentState = state) {
  const gridColumns = getRound2GridColumns(currentState);
  const highlightColumn = getRound2HighlightColumn(currentState);
  const letters = getRound2AnswerLetters(row);
  const maxStart = Math.max(1, gridColumns - Math.max(letters.length - 1, 0));
  const startColumn = clampInteger(row?.startColumn, 1, maxStart, 1);
  const endColumn = startColumn + Math.max(letters.length - 1, 0);
  const crossIndex = highlightColumn - startColumn;
  const crossLetter = crossIndex >= 0 && crossIndex < letters.length ? letters[crossIndex] : "";

  return {
    letters,
    startColumn,
    endColumn,
    gridColumns,
    highlightColumn,
    crossLetter,
    crossesHighlight: Boolean(crossLetter),
  };
}

function getRound2DerivedCenterAnswer(currentState = state) {
  return currentState.round2.rows
    .map((row) => getRound2RowMetrics(row, currentState).crossLetter)
    .filter(Boolean)
    .join("");
}

function getRound2CenterAnswer(currentState = state) {
  const manual = String(currentState.round2.centerAnswer ?? "").trim().toUpperCase();
  return manual || getRound2DerivedCenterAnswer(currentState);
}

function renderRound2CrosswordBoard(options = {}) {
  const {
    currentState = state,
    revealAll = false,
    selectedIndex = -1,
    compact = false,
  } = options;
  const gridColumns = getRound2GridColumns(currentState);
  const highlightColumn = getRound2HighlightColumn(currentState);

  return `
    <div class="round2-crossword-board ${compact ? "compact" : ""}" style="--round2-grid-columns:${gridColumns};">
      ${currentState.round2.rows
        .map((row, index) => {
          const metrics = getRound2RowMetrics(row, currentState);
          return `
            <div class="round2-grid-track ${row.opened ? "opened" : ""} ${selectedIndex === index ? "selected" : ""}">
              <div class="round2-grid-row-number">${row.number}</div>
              <div class="round2-grid-cells">
                ${Array.from({ length: gridColumns }, (_, columnIndex) => {
                  const column = columnIndex + 1;
                  const relativeIndex = column - metrics.startColumn;
                  const active = relativeIndex >= 0 && relativeIndex < metrics.letters.length;
                  const highlight = column === highlightColumn;
                  const showLetter = active && (revealAll || row.opened);
                  const letter = showLetter ? metrics.letters[relativeIndex] : "";
                  const classes = [
                    "round2-grid-cell",
                    active ? "active" : "empty",
                    row.opened ? "opened" : "",
                    highlight ? "highlight" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return `
                    <div class="${classes}">
                      ${active && relativeIndex === 0 ? `<span class="round2-grid-order">${row.number}</span>` : ""}
                      <span class="round2-grid-letter">${esc(letter)}</span>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function getSelectedRound3Pack() {
  return state.round3.packs.find((pack) => pack.id === editorState.round3PackId) ?? state.round3.packs[0];
}

function getSelectedRound3Question() {
  return getSelectedRound3Pack()?.questions[editorState.round3Index] ?? getSelectedRound3Pack()?.questions[0] ?? null;
}

function getCurrentPresentationItem(currentState = state) {
  const ref = currentState.presentation?.ref;
  if (!ref) return null;
  return getScopedItem(currentState, ref.scope, ref.index, ref.packId);
}

function getCurrentRound3PresentationRef(currentState = state) {
  const ref = currentState.presentation?.ref;
  if (ref?.scope !== "round3-question") return null;
  return ref;
}

function setRound3LiveQuestion(draft, ref) {
  const pack = draft.round3.packs.find((entry) => entry.id === ref.packId);
  const question = pack?.questions[ref.index];
  if (!question) return;

  question.status = "live";
  if (draft.round3.armedTrap) {
    question.trap = draft.round3.armedTrap;
    draft.round3.lastTrapAnnouncement = {
      packId: pack.id,
      questionIndex: ref.index,
      type: draft.round3.armedTrap,
    };
    draft.round3.armedTrap = null;
  }

  draft.presentation.open = false;
  draft.presentation.ref = ref;
  draft.presentation.showAnswer = false;
  draft.presentation.timerVisible = true;
  draft.presentation.effect = null;
  draft.presentation.media = null;
  draft.presentation.selectedChoiceIndex = -1;
  draft.presentation.typedResponse = "";
  draft.presentation.scoreTeamId = draft.currentTeamId;
}

function getNextRound3QuestionRef(currentState, packId = currentState.round3.selectedPack, fromIndex = -1) {
  const pack = currentState.round3.packs.find((item) => item.id === packId) ?? currentState.round3.packs[0];
  if (!pack) return null;

  const total = pack.questions.length;
  for (let offset = 1; offset <= total; offset += 1) {
    const index = (fromIndex + offset + total) % total;
    const question = pack.questions[index];
    if (question && question.status !== "done") {
      return createPresentationRef("round3-question", index, pack.id);
    }
  }

  return null;
}

function getPresentationLabel(item, currentState = state) {
  const ref = currentState.presentation?.ref;
  if (!item || !ref) return "";
  if (ref.scope === "round1-cell") return `O ${item.number}`;
  if (ref.scope === "round2-row") return `Hang ${item.number}`;
  if (ref.scope === "round3-question") {
    const pack = currentState.round3.packs.find((entry) => entry.id === ref.packId);
    return `${pack?.label ?? "Pack"} · ${item.label}`;
  }
  return item.content?.title || "";
}

function setNestedValue(target, path, value) {
  const parts = path.split(".");
  let cursor = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    cursor = cursor[key];
    if (cursor == null) return;
  }

  cursor[parts[parts.length - 1]] = value;
}

function normalizeFieldValue(field, value) {
  if (field === "revealType") return value || null;
  if (field === "content.timerSeconds") return Math.max(5, Number(value || 30));
  if (field === "startColumn") return clampInteger(value, 1, 20, 1);
  if (field === "gridColumns") return clampInteger(value, 8, 20, 14);
  if (field === "highlightColumn") return clampInteger(value, 1, 20, 7);
  if (field === "answerWord") return String(value || "").toUpperCase().replace(/\s+/g, "");
  return value;
}

function createPresentationRef(scope, index, packId = null) {
  return {
    scope,
    index,
    packId,
  };
}

function queueSoundCue(draft, name) {
  if (!name) return;
  draft.lastSoundCue = {
    name,
    token: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
}

function setEditorSelection(scope, index, packId = null) {
  if (scope === "round1-cell") {
    editorState.round1Index = index;
    return;
  }
  if (scope === "round2-row") {
    editorState.round2Index = index;
    return;
  }
  if (scope === "round3-question") {
    editorState.round3PackId = packId || editorState.round3PackId;
    editorState.round3Index = index;
  }
}

function openPresentationForItem(draft, ref) {
  const item = getScopedItem(draft, ref.scope, ref.index, ref.packId);
  if (!item) return;

  if (ref.scope === "round2-row") {
    item.opened = true;
  }

  if (ref.scope === "round3-question") {
    setRound3LiveQuestion(draft, ref);
    return;
  }

  if (ref.scope === "round1-cell" && !item.revealType) {
    item.revealType = "question";
  }

  draft.presentation.open = true;
  draft.presentation.ref = ref;
  draft.presentation.showAnswer = false;
  draft.presentation.timerVisible = true;
  draft.presentation.effect = null;
  draft.presentation.media = ref.scope === "round1-cell" && item.revealType === "bomb" ? "explosion" : null;
  draft.presentation.selectedChoiceIndex = -1;
  draft.presentation.typedResponse = "";
  if (ref.scope === "round3-question") {
    draft.presentation.scoreTeamId = draft.currentTeamId;
  }
  draft.presentation.timer = createTimer(Math.max(5, Number(item.content?.timerSeconds || 30)) * 1000);
}

function syncDisplayAudio(currentState = state) {
  if (!IS_DISPLAY_MODE || !sfx) return;

  const cue = currentState.lastSoundCue;
  if (cue?.token && cue.token !== lastSoundCueToken) {
    lastSoundCueToken = cue.token;
    sfx.playByName(cue.name);
  }
}

function shouldPlayTickingAudio(currentState = state) {
  if (currentState.currentRound === 3 && getCurrentRound3PresentationRef(currentState)) {
    return getTimerSnapshot(currentState.round3.timer).running;
  }

  if (currentState.currentRound === 4) {
    return getTimerSnapshot(currentState.round4.timer).running;
  }

  if (currentState.presentation.open && currentState.presentation.ref?.scope !== "round3-question") {
    return getTimerSnapshot(currentState.presentation.timer).running;
  }

  return false;
}

function syncTimerAudio(currentState = state) {
  if (!IS_DISPLAY_MODE || !sfx) return;

  const shouldTick = shouldPlayTickingAudio(currentState);
  if (shouldTick && !tickingAudioActive) {
    tickingAudioActive = true;
    sfx.startTimeoutTicking();
    return;
  }

  if (!shouldTick && tickingAudioActive) {
    tickingAudioActive = false;
    sfx.stopTimeoutTicking();
  }
}

function syncPresentationMediaPlayback() {
  if (!IS_DISPLAY_MODE) return;

  document.querySelectorAll(".presentation-video").forEach((node) => {
    if (!(node instanceof HTMLVideoElement)) return;
    node.defaultMuted = false;
    node.muted = false;
    node.volume = 1;
    if (node.paused) {
      node.play().catch(() => {});
    }
  });
}

function renderQuickScoreButtons() {
  return `
    <div class="inline-action-row">
      <button class="small-btn" data-action="presentation-adjust-score" data-delta="10">+10</button>
      <button class="small-btn" data-action="presentation-adjust-score" data-delta="20">+20</button>
      <button class="small-btn danger" data-action="presentation-adjust-score" data-delta="-10">-10</button>
      <button class="small-btn danger" data-action="presentation-adjust-score" data-delta="-20">-20</button>
    </div>
  `;
}

function renderCurrentTeamSummary() {
  const team = findTeam(state.currentTeamId);
  return `
    <div class="current-team-summary">
      <span class="eyebrow">Current Team</span>
      <strong>${esc(team?.name ?? "Chua chon doi")}</strong>
    </div>
  `;
}

function renderPresentationResponseAdmin(item) {
  const content = item?.content ?? {};
  if (!item) return "";

  if (content.questionType === "multiple_choice") {
    const choices = content.choices.filter((choice) => choice.trim() !== "");
    if (choices.length === 0) return "";

    return `
      <div class="field-label">
        <span>Player answer</span>
        <div class="inline-action-row">
          <button class="small-btn ${state.presentation.selectedChoiceIndex < 0 ? "active" : ""}" data-action="presentation-clear-response">
            Clear
          </button>
          ${choices
            .map(
              (choice, index) => `
                <button
                  class="small-btn ${state.presentation.selectedChoiceIndex === index ? "active" : ""}"
                  data-action="presentation-select-choice"
                  data-choice-index="${index}"
                >
                  ${String.fromCharCode(65 + index)}
                </button>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  return `
    <label class="field-label">
      <span>Player answer text</span>
      <textarea
        class="textarea-input"
        rows="3"
        data-action="presentation-set-response-text"
      >${esc(state.presentation.typedResponse)}</textarea>
    </label>
  `;
}

function renderPresentationResponseDisplay(item) {
  const content = item?.content ?? {};

  if (content.questionType === "multiple_choice") {
    if (state.presentation.selectedChoiceIndex == null || state.presentation.selectedChoiceIndex < 0) return "";
    const choice = content.choices[state.presentation.selectedChoiceIndex];
    if (!choice || choice.trim() === "") return "";

    return `
      <div class="presentation-player-answer choice-response">
        <div class="answer-kicker">Player answer</div>
        <div class="player-answer-choice">
          <span>${String.fromCharCode(65 + state.presentation.selectedChoiceIndex)}</span>
          <strong>${esc(choice)}</strong>
        </div>
      </div>
    `;
  }

  if (!state.presentation.typedResponse.trim()) return "";

  return `
    <div class="presentation-player-answer">
      <div class="answer-kicker">Player answer</div>
      <div class="player-answer-text">${esc(state.presentation.typedResponse)}</div>
    </div>
  `;
}

function renderQuestionContentBlocks(item, showPlayerResponse = true) {
  const content = item.content;

  return `
    <div class="presentation-body">
      ${
        content.prompt
          ? `<div class="presentation-prompt ${content.questionType === "multiple_choice" ? "compact" : ""}">${esc(
              content.prompt,
            )}</div>`
          : ""
      }

      ${
        content.questionType === "image" || content.questionType === "text_image"
          ? `
            <div class="presentation-image-frame">
              ${
                content.imageSrc
                  ? `<img class="presentation-image" src="${esc(content.imageSrc)}" alt="${esc(content.title || getPresentationLabel(item))}">`
                  : `<div class="presentation-image-placeholder">No image path</div>`
              }
            </div>
          `
          : ""
      }

      ${
        content.questionType === "multiple_choice"
          ? `
            <div class="presentation-choices">
              ${content.choices
                .filter((choice) => choice.trim() !== "")
                .map(
                  (choice, choiceIndex) => `
                    <div class="presentation-choice ${state.presentation.selectedChoiceIndex === choiceIndex ? "selected" : ""}">
                      <span>${String.fromCharCode(65 + choiceIndex)}</span>
                      <strong>${esc(choice)}</strong>
                    </div>
                  `,
                )
                .join("")}
            </div>
          `
          : ""
      }

      ${showPlayerResponse ? renderPresentationResponseDisplay(item) : ""}
    </div>
  `;
}

function renderQuestionEditor(scope, index, item, packId = "") {
  const content = item.content;
  const dataAttrs = `data-scope="${scope}" data-index="${index}"${packId ? ` data-pack-id="${packId}"` : ""}`;

  return `
    <div class="question-editor">
      <div class="dual-form-grid compact">
        <label class="field-label">
          <span>Card title</span>
          <input class="text-input" type="text" value="${esc(content.title)}" data-action="set-item-field" data-field="content.title" ${dataAttrs}>
        </label>
        <label class="field-label">
          <span>Question type</span>
          <select class="select-input" data-action="set-item-field" data-field="content.questionType" ${dataAttrs}>
            ${[
              ["text", "Text"],
              ["multiple_choice", "Multiple choice"],
              ["image", "Image"],
              ["text_image", "Text + Image"],
            ]
              .map(
                ([value, label]) => `
                  <option value="${value}" ${content.questionType === value ? "selected" : ""}>${label}</option>
                `,
              )
              .join("")}
          </select>
        </label>
      </div>

      <label class="field-label">
        <span>Prompt</span>
        <textarea class="textarea-input" rows="4" data-action="set-item-field" data-field="content.prompt" ${dataAttrs}>${esc(
          content.prompt,
        )}</textarea>
      </label>

      <div class="dual-form-grid compact">
        <label class="field-label">
          <span>Image path / URL</span>
          <input class="text-input" type="text" value="${esc(content.imageSrc)}" placeholder="./assets/media/example.png" data-action="set-item-field" data-field="content.imageSrc" ${dataAttrs}>
        </label>
        <label class="field-label">
          <span>Timer seconds</span>
          <input class="number-input" type="number" min="5" value="${Number(content.timerSeconds || 30)}" data-action="set-item-field" data-field="content.timerSeconds" ${dataAttrs}>
        </label>
      </div>

      <div class="choice-editor ${content.questionType === "multiple_choice" ? "" : "muted-editor"}">
        <div class="panel-mini-title">Choices</div>
        <div class="stacked-block">
          ${content.choices
            .map(
              (choice, choiceIndex) => `
                <input class="text-input" type="text" value="${esc(choice)}" placeholder="Choice ${choiceIndex + 1}" data-action="set-item-field" data-field="content.choices.${choiceIndex}" ${dataAttrs}>
              `,
            )
            .join("")}
        </div>
      </div>

      <label class="field-label">
        <span>Correct answer / speaking key</span>
        <textarea class="textarea-input" rows="3" data-action="set-item-field" data-field="content.answer" ${dataAttrs}>${esc(
          content.answer,
        )}</textarea>
      </label>
    </div>
  `;
}

function openDisplayWindow() {
  const url = new URL(window.location.href);
  url.searchParams.set("mode", "display");
  window.open(url.toString(), "_blank", "noopener");
}

function render() {
  app.dataset.mode = APP_MODE;
  document.title = IS_DISPLAY_MODE ? "BTT Minigame 2 Projector" : "BTT Minigame 2 Admin";
  app.innerHTML = IS_DISPLAY_MODE ? renderProjectorApp(false) : renderControlApp();
  syncTimerBindings();
  syncDisplayAudio();
  syncTimerAudio();
  syncPresentationMediaPlayback();
}

function renderControlApp() {
  const roundMeta = getCurrentRoundMeta();
  const topbar = `
    <header class="control-topbar">
      <div>
        <div class="eyebrow">Manual-first operator panel</div>
        <h1 class="page-title">BTT Minigame 2</h1>
        <p class="page-subtitle">${esc(roundMeta.short)} Â· ${esc(roundMeta.title)}</p>
      </div>
      <div class="toolbar-actions">
        <div class="control-mode-switch">
          <button class="toolbar-btn ${controlViewMode === "live" ? "primary" : ""}" data-action="set-control-view" data-view="live">
            Live Control
          </button>
          <button class="toolbar-btn ${controlViewMode === "bank" ? "primary" : ""}" data-action="set-control-view" data-view="bank">
            Question Bank
          </button>
        </div>
        <button class="toolbar-btn primary" data-action="open-display">Open Projector</button>
        <button class="toolbar-btn" data-action="reset-state">Reset State</button>
      </div>
    </header>
  `;

  if (controlViewMode === "live") {
    return `
      <div class="control-shell">
        ${topbar}
        ${renderLiveWorkspace()}
      </div>
    `;
  }

  return `
    <div class="control-shell">
      ${topbar}
      ${renderQuestionBankWorkspace()}
    </div>
  `;
  /*

  return `
    <div class="control-shell">
      <header class="control-topbar">
        <div>
          <div class="eyebrow">Manual-first operator panel</div>
          <h1 class="page-title">BTT Minigame 2</h1>
          <p class="page-subtitle">${esc(roundMeta.short)} · ${esc(roundMeta.title)}</p>
        </div>
        <div class="toolbar-actions">
          <button class="toolbar-btn primary" data-action="open-display">Open Projector</button>
          <button class="toolbar-btn" data-action="reset-state">Reset State</button>
        </div>
      </header>

      <div class="control-main">
        <section class="preview-pane">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Live preview</div>
              <h2 class="panel-title">Projector Display</h2>
            </div>
            <div class="live-pill">SYNCED</div>
          </div>
          <div class="preview-frame">
            ${renderProjectorApp(true)}
          </div>
        </section>

        <aside class="admin-pane">
          <section class="admin-card round-switcher-card compact-card">
            <div class="panel-heading">
              <div>
                <div class="eyebrow">Show control</div>
                <h2 class="panel-title">Round Navigator</h2>
              </div>
            </div>
            <div class="round-switcher">
              ${Object.entries(ROUND_META)
                .map(
                  ([roundNumber, meta]) => `
                    <button
                      class="round-tab ${Number(roundNumber) === state.currentRound ? "active" : ""}"
                      data-action="switch-round"
                      data-round="${roundNumber}"
                    >
                      <span>${esc(meta.short)}</span>
                      <strong>${esc(meta.title)}</strong>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </section>

          <section class="admin-card team-manager-card compact-card">
            <div class="panel-heading">
              <div>
                <div class="eyebrow">Shared system</div>
                <h2 class="panel-title">Team Manager</h2>
              </div>
            </div>
            <div class="team-admin-grid">
              ${state.teams.map((team) => renderTeamAdminCard(team)).join("")}
            </div>
          </section>

          ${renderPresentationAdminPanel()}
          ${renderRoundAdminPanel()}
        </aside>
      </div>
    </div>
  `;
  */
}

function renderRoundSwitcherCard() {
  return `
    <section class="admin-card round-switcher-card compact-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Show control</div>
          <h2 class="panel-title">Round Navigator</h2>
        </div>
      </div>
      <div class="round-switcher">
        ${Object.entries(ROUND_META)
          .map(
            ([roundNumber, meta]) => `
              <button
                class="round-tab ${Number(roundNumber) === state.currentRound ? "active" : ""}"
                data-action="switch-round"
                data-round="${roundNumber}"
              >
                <span>${esc(meta.short)}</span>
                <strong>${esc(meta.title)}</strong>
              </button>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderLiveWorkspace() {
  return `
    <div class="control-main">
      <section class="preview-pane">
        <div class="panel-heading">
          <div>
            <div class="eyebrow">Live preview</div>
            <h2 class="panel-title">Projector Display</h2>
          </div>
          <div class="live-pill">SYNCED</div>
        </div>
        <div class="preview-frame">
          ${renderProjectorApp(true)}
        </div>
      </section>

      <aside class="admin-pane">
        ${renderRoundSwitcherCard()}

        <section class="admin-card team-manager-card compact-card">
          <div class="panel-heading">
            <div>
              <div class="eyebrow">Shared system</div>
              <h2 class="panel-title">Team Manager</h2>
            </div>
          </div>
          <div class="team-admin-grid">
            ${state.teams.map((team) => renderTeamAdminCard(team)).join("")}
          </div>
        </section>

        ${renderPresentationAdminPanel()}
        ${renderRoundAdminPanel()}
      </aside>
    </div>
  `;
}

function renderQuestionBankWorkspace() {
  return `
    <div class="question-bank-shell">
      ${renderRoundSwitcherCard()}
      <section class="admin-card question-bank-intro">
        <div class="panel-heading">
          <div>
            <div class="eyebrow">Editing mode</div>
            <h2 class="panel-title">Question Bank</h2>
          </div>
          <div class="live-pill">SEPARATE FROM LIVE CONTROL</div>
        </div>
        <p class="status-empty">
          Edit prompts, answers, images and choices here. Switch back to Live Control only when you are ready to operate the projector.
        </p>
      </section>
      ${renderQuestionBankPanel()}
    </div>
  `;
}

function renderProjectorApp(embedded) {
  const roundMeta = getVisibleRoundMeta();

  return `
    <div class="projector-shell ${embedded ? "embedded" : "fullscreen"}">
      <header class="projector-header">
        <div class="round-kicker">${esc(roundMeta.short)}</div>
        <div>
          <h2 class="projector-title">${esc(roundMeta.title)}</h2>
          <p class="projector-subtitle">${esc(roundMeta.subtitle)}</p>
        </div>
      </header>

      <main class="projector-main">
        ${state.presentation.open && state.presentation.ref?.scope !== "round3-question" ? renderPresentationScreen() : renderRoundDisplay()}
      </main>

      <footer class="score-dock">
        ${getVisibleTeams()
          .map((team) => renderProjectorTeamCard(team))
          .join("")}
      </footer>
    </div>
  `;
}

function renderPresentationAdminPanel() {
  const item = getCurrentPresentationItem();
  const timer = getTimerSnapshot(state.presentation.timer);
  const isRound1Item = item && state.presentation.ref?.scope === "round1-cell";
  const isRound3Item = item && state.presentation.ref?.scope === "round3-question";
  const canShowHelpVideo = isRound1Item && item.revealType !== "bomb";

  return `
    <section class="admin-card presentation-dock-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Live presentation</div>
          <h2 class="panel-title">Question Screen Controls</h2>
        </div>
        ${
          item
            ? `<div class="status-tag filled">${esc(getPresentationLabel(item))}</div>`
            : `<div class="status-tag">No screen opened</div>`
        }
      </div>

      ${
        item
          ? `
            <div class="stacked-block presentation-dock-body">
              <div class="inline-action-row">
                <button class="small-btn ${state.presentation.showAnswer ? "active" : ""}" data-action="presentation-toggle-answer">
                  ${state.presentation.showAnswer ? "Hide answer" : "Show answer"}
                </button>
                <button class="small-btn subtle" data-action="presentation-close">Close screen</button>
              </div>

              ${
                isRound3Item
                  ? `
                    <div class="timer-admin-card">
                      <div class="timer-readout">
                        <span>Round 3 timer</span>
                        <strong data-bind-timer="round3">${formatClock(getTimerSnapshot(state.round3.timer).remainingMs)}</strong>
                      </div>
                      <div class="inline-action-row">
                        <button class="small-btn success" data-action="round3-mark-result" data-result="correct">
                          Right +${Number(state.round3.correctPoints || 0)}
                        </button>
                        <button class="small-btn danger" data-action="round3-mark-result" data-result="wrong">
                          Wrong -${Number(state.round3.wrongPoints || 0)}
                        </button>
                        <button class="small-btn" data-action="round3-open-next">Next question</button>
                        <button class="small-btn subtle" data-action="round3-finish-turn">Finish turn</button>
                      </div>
                    </div>
                  `
                  : `
                    <div class="timer-admin-card">
                      <div class="timer-readout">
                        <span>Presentation timer</span>
                        <strong data-bind-timer="presentation">${formatClock(timer.remainingMs)}</strong>
                      </div>
                      <div class="inline-action-row">
                        <button class="small-btn" data-action="timer-start" data-timer="presentation">Start</button>
                        <button class="small-btn" data-action="timer-pause" data-timer="presentation">Pause</button>
                        <button class="small-btn subtle" data-action="timer-reset" data-timer="presentation">Reset item timer</button>
                      </div>
                    </div>
                  `
              }

              ${
                isRound1Item
                  ? `
                    <div class="field-label">
                      <span>Round 1 media</span>
                      <div class="inline-action-row">
                        ${
                          canShowHelpVideo
                            ? `
                              <button
                                class="small-btn ${state.presentation.media === "get_help" ? "active" : ""}"
                                data-action="presentation-set-media"
                                data-media="get_help"
                              >
                                Show Get Help
                              </button>
                            `
                            : ""
                        }
                        ${
                          item.revealType === "bomb"
                            ? `
                              <button
                                class="small-btn ${state.presentation.media === "explosion" ? "active" : ""}"
                                data-action="presentation-set-media"
                                data-media="explosion"
                              >
                                Replay Bomb
                              </button>
                            `
                            : ""
                        }
                        <button
                          class="small-btn ${state.presentation.media == null ? "active" : ""}"
                          data-action="presentation-set-media"
                          data-media=""
                        >
                          Show Question
                        </button>
                      </div>
                    </div>
                  `
                  : ""
              }

              ${renderPresentationResponseAdmin(item)}

              <div class="dual-form-grid compact">
                <div class="field-label">
                  <span>${isRound3Item ? "Playing team" : "Score target"}</span>
                  ${renderCurrentTeamSummary()}
                </div>
                ${
                  isRound3Item
                    ? `
                      <div class="dual-form-grid compact quickfire-score-grid">
                        <label class="field-label">
                          <span>Right points</span>
                          <input class="number-input" type="number" value="${Number(state.round3.correctPoints || 0)}" data-action="round3-set-score-value" data-kind="correct">
                        </label>
                        <label class="field-label">
                          <span>Wrong penalty</span>
                          <input class="number-input" type="number" value="${Number(state.round3.wrongPoints || 0)}" data-action="round3-set-score-value" data-kind="wrong">
                        </label>
                      </div>
                    `
                    : `
                      <div class="field-label">
                        <span>Add / deduct score</span>
                        ${renderQuickScoreButtons()}
                      </div>
                    `
                }
              </div>
            </div>
          `
          : `<div class="status-empty">Open a card or row from the round control panel to present it on the projector.</div>`
      }
    </section>
  `;
}

function renderTeamAdminCard(team) {
  return `
    <article class="team-admin-card ${team.hidden ? "team-hidden" : ""} ${state.currentTeamId === team.id ? "team-current" : ""}">
      <div class="team-admin-head">
        <input
          class="text-input"
          type="text"
          value="${esc(team.name)}"
          data-action="set-team-name"
          data-team-id="${team.id}"
        >
        <div class="inline-action-row">
          <button class="small-btn ${state.currentTeamId === team.id ? "active" : ""}" data-action="select-current-team" data-team-id="${team.id}">
            ${state.currentTeamId === team.id ? "Current team" : "Select team"}
          </button>
          <button class="small-btn danger" data-action="toggle-team-hidden" data-team-id="${team.id}">
            ${team.hidden ? "Khoi phuc doi" : "Loai doi"}
          </button>
        </div>
      </div>

      <label class="field-label">
        <span>Total score</span>
        <input
          class="number-input"
          type="number"
          value="${Number(team.score)}"
          data-action="set-team-score"
          data-team-id="${team.id}"
        >
      </label>

      <div class="checklist-grid">
        ${TEAM_CARD_OPTIONS.map(
          (card) => `
            <label class="check-pill ${team.cards[card.id] ? "active" : ""}">
              <input
                type="checkbox"
                ${team.cards[card.id] ? "checked" : ""}
                data-action="toggle-team-card"
                data-team-id="${team.id}"
                data-card-id="${card.id}"
              >
              <span>${esc(card.label)}</span>
            </label>
          `,
        ).join("")}
      </div>
    </article>
  `;
}

function renderProjectorTeamCard(team) {
  return `
    <article class="score-team-card ${state.currentTeamId === team.id ? "active" : ""}">
      <div class="score-team-name">${esc(team.name)}</div>
      <div class="score-team-points">${Number(team.score)}</div>
      <div class="score-team-functions">
        ${TEAM_CARD_OPTIONS.map(
          (card) => `
            <span class="function-chip ${team.cards[card.id] ? "active" : ""}">
              ${esc(card.label)}
            </span>
          `,
        ).join("")}
      </div>
    </article>
  `;
}

function renderPresentationScreen() {
  const item = getCurrentPresentationItem();
  if (!item) {
    return `
      <section class="presentation-stage empty">
        <div class="presentation-empty">No presentation item selected.</div>
      </section>
    `;
  }

  const timer = getTimerSnapshot(state.presentation.timer);
  const content = item.content;
  const revealType = item.revealType ?? "question";
  const effectLabelMap = {
    x2: "X2",
    steal: "Cuop",
    attack: "Tan cong",
    bomb: "Bomb",
    shield: "La chan",
    objection: "Phan doi",
    seeFuture: "See the Future",
  };

  if (state.presentation.media === "get_help") {
    return `
      <section class="presentation-stage media-stage get-help-stage">
        <div class="get-help-question-panel">
          <div class="presentation-topbar">
            <div>
              <div class="presentation-kicker">${esc(getPresentationLabel(item))}</div>
              <h2 class="presentation-title">${esc(content.title || getPresentationLabel(item))}</h2>
            </div>
            ${
              state.presentation.timerVisible
                ? `
                  <div class="presentation-timer-block">
                    <span>Timer</span>
                    <strong data-bind-timer="presentation">${formatClock(timer.remainingMs)}</strong>
                  </div>
                `
                : ""
            }
          </div>
          ${renderQuestionContentBlocks(item)}
          ${
            state.presentation.showAnswer
              ? `
                <div class="presentation-answer-card">
                  <div class="answer-kicker">Correct answer</div>
                  <div class="answer-value">${esc(content.answer || "Chua nhap dap an")}</div>
                </div>
              `
              : ""
          }
        </div>
        <div class="presentation-video-frame get-help-video-frame">
          <div class="presentation-kicker">Get Help</div>
          <video
            class="presentation-video"
            src="./assets/media/get_help.mp4"
            autoplay
            playsinline
            preload="auto"
          ></video>
        </div>
      </section>
    `;
  }

  if (state.presentation.media === "explosion") {
    return `
      <section class="presentation-stage media-stage bomb-stage full-video-stage">
        <div class="presentation-kicker">${esc(getPresentationLabel(item))}</div>
        <h2 class="presentation-title">Bomb</h2>
        <div class="presentation-video-frame bomb-video-frame">
          <video
            class="presentation-video bomb-video"
            src="./assets/media/explosion.mp4"
            autoplay
            playsinline
            preload="auto"
          ></video>
        </div>
      </section>
    `;
  }

  if (state.presentation.ref?.scope === "round3-question") {
    const pack = getRound3Pack(state.presentation.ref.packId);
    const round3Timer = getTimerSnapshot(state.round3.timer);
    return `
      <section class="presentation-stage round3-presentation-stage">
        <div class="round-three-top">
          ${state.round3.packs
            .map(
              (roundPack) => `
                <article class="pack-card ${roundPack.id === pack.id ? "active" : ""}">
                  <span>${esc(roundPack.label)}</span>
                </article>
              `,
            )
            .join("")}
        </div>

        <div class="hero-timer-card round3-live-timer">
          <div class="hero-timer-label">Quickfire Timer</div>
          <div class="hero-timer-value" data-bind-timer="round3">${formatClock(round3Timer.remainingMs)}</div>
          <div class="timer-bar">
            <div class="timer-bar-fill" data-bind-progress="round3"></div>
          </div>
          ${
            round3Timer.remainingMs <= 0
              ? `<div class="projector-banner danger compact-banner"><div class="banner-value">Time is up. Finish this turn from control.</div></div>`
              : ""
          }
        </div>

        ${
          item.trap
            ? `
              <div class="projector-banner ${item.trap === "bomb" ? "danger" : ""}">
                <div class="banner-label">Trap Triggered</div>
                <div class="banner-value">${esc(item.trap.toUpperCase())} · ${esc(getPresentationLabel(item))}</div>
              </div>
            `
            : ""
        }

        <div class="round3-question-stage">
          <div class="presentation-topbar">
            <div>
              <div class="presentation-kicker">${esc(getPresentationLabel(item))}</div>
              <h2 class="presentation-title">${esc(content.title || getPresentationLabel(item))}</h2>
            </div>
            <div class="status-tag filled">Team: ${esc(findTeam(state.round3.activeTeamId)?.name ?? "Team")}</div>
          </div>

          ${renderQuestionContentBlocks(item)}

          ${
            state.presentation.showAnswer
              ? `
                <div class="presentation-answer-card">
                  <div class="answer-kicker">Correct answer</div>
                  <div class="answer-value">${esc(content.answer || "Chua nhap dap an")}</div>
                </div>
              `
              : ""
          }
        </div>

        <div class="quickfire-track quickfire-track-live">
          ${pack.questions
            .map(
              (question, index) => `
                <article class="quickfire-chip ${question.status} ${question.trap ? `trap-${question.trap}` : ""} ${
                  state.presentation.ref.index === index ? "current" : ""
                }">
                  <div class="quickfire-chip-index">${index + 1}</div>
                  <div class="quickfire-chip-status">${esc(question.status)}</div>
                  ${question.trap ? `<div class="quickfire-chip-trap">${esc(question.trap.toUpperCase())}</div>` : ""}
                </article>
              `,
            )
            .join("")}
        </div>
      </section>
    `;
  }

  if (revealType === "bomb") {
    return `
      <section class="presentation-stage bomb-stage">
        <div class="presentation-kicker">${esc(getPresentationLabel(item))}</div>
        <h2 class="presentation-title">Bomb</h2>
        ${
          state.presentation.effect
            ? `<div class="presentation-effect-banner">${esc(effectLabelMap[state.presentation.effect] ?? state.presentation.effect)}</div>`
            : ""
        }
      </section>
    `;
  }

  return `
    <section class="presentation-stage">
      <div class="presentation-topbar">
        <div>
          <div class="presentation-kicker">${esc(getPresentationLabel(item))}</div>
          <h2 class="presentation-title">${esc(content.title || getPresentationLabel(item))}</h2>
        </div>
        ${
          state.presentation.timerVisible
            ? `
              <div class="presentation-timer-block">
                <span>Timer</span>
                <strong data-bind-timer="presentation">${formatClock(timer.remainingMs)}</strong>
              </div>
            `
            : ""
        }
      </div>

      ${
        state.presentation.effect
          ? `<div class="presentation-effect-banner">${esc(effectLabelMap[state.presentation.effect] ?? state.presentation.effect)}</div>`
          : ""
      }

      ${renderQuestionContentBlocks(item)}

      ${
        state.presentation.showAnswer
          ? `
            <div class="presentation-answer-card">
              <div class="answer-kicker">Correct answer</div>
              <div class="answer-value">${esc(content.answer || "Chua nhap dap an")}</div>
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderRoundAdminPanel() {
  if (controlViewMode === "bank") return renderQuestionBankPanel();
  return renderLiveRoundAdminPanel();
}

function renderLiveRoundAdminPanel() {
  if (state.currentRound === 1) return renderRound1LiveAdmin();
  if (state.currentRound === 2) return renderRound2LiveAdmin();
  if (state.currentRound === 3) return renderRound3LiveAdmin();
  return renderRound4Admin();
}

function renderQuestionBankPanel() {
  if (state.currentRound === 1) return renderRound1Admin();
  if (state.currentRound === 2) return renderRound2Admin();
  if (state.currentRound === 3) return renderRound3Admin();
  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Round 4 setup</div>
          <h2 class="panel-title">No question bank for this round</h2>
        </div>
      </div>
      <div class="status-empty">
        Round 4 is operated live only. Use Live Control to manage finalists, stage timer and judge scores.
      </div>
    </section>
  `;
}

function renderRoundDisplay() {
  if (state.currentRound === 1) return renderRound1Display();
  if (state.currentRound === 2) return renderRound2Display();
  if (state.currentRound === 3) return renderRound3Display();
  return renderRound4Display();
}

function renderRound1Admin() {
  const selectedCell = getSelectedRound1Cell();

  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Round 1 control</div>
          <h2 class="panel-title">Mo o chien thuat</h2>
        </div>
      </div>

      <div class="admin-round-grid r1-admin-grid">
        ${state.round1.cells
          .map(
            (cell, index) => `
              <article class="admin-r1-cell ${editorState.round1Index === index ? "selected-editor" : ""}">
                <div class="admin-r1-cell-head">
                  <strong>O ${index + 1}</strong>
                  <span class="status-tag ${cell.revealType ? "filled" : ""}">
                    ${cell.revealType ? esc(ROUND1_REVEALS[cell.revealType].label) : "Closed"}
                  </span>
                </div>
                <div class="inline-action-row">
                  <button class="small-btn" data-action="select-editor-item" data-scope="round1-cell" data-index="${index}">Edit</button>
                  <button class="small-btn active" data-action="open-item-screen" data-scope="round1-cell" data-index="${index}">Open screen</button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>

      <div class="admin-divider"></div>

      <div class="panel-heading">
        <div>
          <div class="eyebrow">Selected card</div>
          <h3 class="panel-title">O ${selectedCell.number}</h3>
        </div>
        <div class="inline-action-row">
          <button class="small-btn" data-action="open-item-screen" data-scope="round1-cell" data-index="${editorState.round1Index}">
            Present now
          </button>
          <button class="small-btn subtle" data-action="round1-clear" data-index="${editorState.round1Index}">Clear card</button>
        </div>
      </div>

      <div class="dual-form-grid compact">
        <div class="field-label">
          <span>Card type</span>
          <div class="inline-action-row">
            <button class="small-btn ${selectedCell.revealType == null ? "active" : ""}" data-action="round1-reveal" data-index="${editorState.round1Index}" data-kind="">
              Closed
            </button>
            <button class="small-btn ${selectedCell.revealType === "question" ? "active" : ""}" data-action="round1-reveal" data-index="${editorState.round1Index}" data-kind="question">
              Question
            </button>
            <button class="small-btn ${selectedCell.revealType === "challenge" ? "active" : ""}" data-action="round1-reveal" data-index="${editorState.round1Index}" data-kind="challenge">
              Challenge
            </button>
            <button class="small-btn danger ${selectedCell.revealType === "bomb" ? "active danger" : ""}" data-action="round1-reveal" data-index="${editorState.round1Index}" data-kind="bomb">
              Bomb
            </button>
          </div>
        </div>
        <label class="field-label">
          <span>Board caption</span>
          <input class="text-input" type="text" value="${esc(selectedCell.caption)}" data-action="set-item-field" data-scope="round1-cell" data-index="${editorState.round1Index}" data-field="caption">
        </label>
      </div>

      ${renderQuestionEditor("round1-cell", editorState.round1Index, selectedCell)}
    </section>
  `;
}

function renderRound1LiveAdmin() {
  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Round 1 live control</div>
          <h2 class="panel-title">Mo o chien thuat</h2>
        </div>
        <button class="small-btn" data-action="set-control-view" data-view="bank">Open Question Bank</button>
      </div>

      <div class="round1-live-grid">
        ${state.round1.cells
          .map(
            (cell, index) => `
              <article
                class="live-round-card ${cell.revealType ? "revealed" : "hidden-card"}"
                data-action="open-item-screen"
                data-scope="round1-cell"
                data-index="${index}"
              >
                <div class="live-round-card-head">
                  <strong>O ${cell.number}</strong>
                  <span class="status-tag ${cell.revealType ? "filled" : ""}">
                    ${cell.revealType ? esc(ROUND1_REVEALS[cell.revealType].label) : "Closed"}
                  </span>
                </div>
                <div class="inline-action-row">
                  <button class="small-btn" data-action="edit-bank-item" data-scope="round1-cell" data-index="${index}">Edit content</button>
                  ${cell.revealType ? `<button class="small-btn subtle" data-action="round1-clear" data-index="${index}">Hide type</button>` : ""}
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRound1Display() {
  return `
    <section class="round-display round-one-display">
      <div class="r1-grid">
        ${state.round1.cells
          .map((cell) => {
            const reveal = cell.revealType ? ROUND1_REVEALS[cell.revealType] : null;
            return `
              <article class="r1-cell ${cell.revealType ? `revealed ${cell.revealType}` : ""}">
                ${
                  reveal
                    ? `
                      <div class="r1-icon">${esc(reveal.icon)}</div>
                      <div class="r1-label">${esc(reveal.label)}</div>
                      ${cell.caption ? `<div class="r1-caption">${esc(cell.caption)}</div>` : ""}
                    `
                    : `
                      <div class="r1-number">${cell.number}</div>
                    `
                }
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderRound2Admin() {
  const seeFutureTeam = findTeam(state.round2.seeFuture.teamId);
  const centerHintsValue = state.round2.centerHints.join("\n");
  const selectedRow = getSelectedRound2Row();
  const selectedMetrics = getRound2RowMetrics(selectedRow);
  const derivedCenterAnswer = getRound2DerivedCenterAnswer();
  const centerAnswerPreview = getRound2CenterAnswer() || "CHUA CO";

  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Round 2 bank</div>
          <h2 class="panel-title">Grid layout va noi dung hang ngang</h2>
        </div>
        <button class="small-btn" data-action="set-control-view" data-view="live">Back to Live Control</button>
      </div>

      <div class="dual-form-grid compact">
        <label class="field-label">
          <span>So cot hien thi</span>
          <input class="text-input" type="number" min="8" max="20" value="${getRound2GridColumns()}" data-action="set-item-field" data-scope="round2-center" data-index="0" data-field="gridColumns">
        </label>
        <label class="field-label">
          <span>Cot dap an doc</span>
          <input class="text-input" type="number" min="1" max="${getRound2GridColumns()}" value="${getRound2HighlightColumn()}" data-action="set-item-field" data-scope="round2-center" data-index="0" data-field="highlightColumn">
        </label>
        <label class="field-label">
          <span>Dap an doc (de trong de tu suy ra tu grid)</span>
          <input class="text-input" type="text" value="${esc(state.round2.centerAnswer)}" data-action="set-item-field" data-scope="round2-center" data-index="0" data-field="centerAnswer">
        </label>
      </div>

      <label class="field-label">
        <span>Goi y dap an doc (moi dong 1 goi y)</span>
        <textarea class="textarea-input" rows="4" data-action="set-item-field" data-scope="round2-center" data-index="0" data-field="centerHintsText">${esc(centerHintsValue)}</textarea>
      </label>

      <div class="round2-bank-layout">
        <article class="admin-preview-card">
          <div class="panel-mini-title">Grid preview</div>
          ${renderRound2CrosswordBoard({ revealAll: true, selectedIndex: editorState.round2Index, compact: true })}
        </article>
        <article class="admin-preview-card">
          <div class="panel-mini-title">Dap an doc suy ra tu cot noi bat</div>
          <div class="round2-derived-answer">${esc(centerAnswerPreview)}</div>
          <div class="round2-derived-meta">Suy ra tu grid: ${esc(derivedCenterAnswer || "Khong co giao diem")}</div>
          <div class="round2-derived-meta">Cot noi bat: ${getRound2HighlightColumn()} / ${getRound2GridColumns()}</div>
        </article>
      </div>

      <div class="admin-divider"></div>

      <div class="panel-heading">
        <div>
          <div class="eyebrow">Rows</div>
          <h3 class="panel-title">Dat vi tri tung hang ngang</h3>
        </div>
      </div>

      <div class="round2-row-bank-list">
        ${state.round2.rows
          .map((row, index) => {
            const metrics = getRound2RowMetrics(row);
            return `
              <article class="round2-bank-row ${editorState.round2Index === index ? "selected-editor" : ""}">
                <div class="round2-bank-row-main">
                  <strong>Hang ${row.number}</strong>
                  <span>${esc(row.answerWord || "Chua nhap dap an")}</span>
                </div>
                <div class="round2-bank-row-meta">
                  <span>Cot ${metrics.startColumn}</span>
                  <span>Giao diem: ${esc(metrics.crossLetter || "-")}</span>
                  <span>${row.opened ? "Da mo" : "Dang an"}</span>
                </div>
                <div class="inline-action-row">
                  <button class="small-btn" data-action="select-editor-item" data-scope="round2-row" data-index="${index}">Edit</button>
                  <button class="small-btn ${row.opened ? "active" : ""}" data-action="round2-toggle-row" data-index="${index}">
                    ${row.opened ? "Hide row" : "Open row"}
                  </button>
                  <button class="small-btn" data-action="open-item-screen" data-scope="round2-row" data-index="${index}">Open screen</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>

      <div class="admin-divider"></div>

      <div class="panel-heading">
        <div>
          <div class="eyebrow">Selected row</div>
          <h3 class="panel-title">Hang ${selectedRow.number}</h3>
        </div>
      </div>

      <div class="dual-form-grid compact">
        <label class="field-label">
          <span>Dap an tren grid</span>
          <input class="text-input" type="text" value="${esc(selectedRow.answerWord)}" data-action="set-item-field" data-scope="round2-row" data-index="${editorState.round2Index}" data-field="answerWord">
        </label>
        <label class="field-label">
          <span>Bat dau tu cot</span>
          <input class="text-input" type="number" min="1" max="${getRound2GridColumns()}" value="${selectedMetrics.startColumn}" data-action="set-item-field" data-scope="round2-row" data-index="${editorState.round2Index}" data-field="startColumn">
        </label>
        <label class="field-label">
          <span>Chu cai giao voi dap an doc</span>
          <div class="static-field-value">${esc(selectedMetrics.crossLetter || "Khong cat cot noi bat")}</div>
        </label>
      </div>

      <div class="dual-form-grid compact">
        <label class="field-label">
          <span>Goi y tren bang</span>
          <input class="text-input" type="text" value="${esc(selectedRow.clue)}" data-action="set-item-field" data-scope="round2-row" data-index="${editorState.round2Index}" data-field="clue">
        </label>
        <div class="field-label">
          <span>Row screen</span>
          <div class="inline-action-row">
            <button class="small-btn ${selectedRow.opened ? "active" : ""}" data-action="round2-toggle-row" data-index="${editorState.round2Index}">
              ${selectedRow.opened ? "Hide row" : "Open row"}
            </button>
            <button class="small-btn" data-action="open-item-screen" data-scope="round2-row" data-index="${editorState.round2Index}">
              Present now
            </button>
          </div>
        </div>
      </div>

      ${renderQuestionEditor("round2-row", editorState.round2Index, selectedRow)}

      <div class="admin-divider"></div>

      <div class="inline-action-row">
        <button class="small-btn" data-action="round2-reveal-next-keyword">Mo goi y doc tiep</button>
        <button class="small-btn" data-action="round2-show-all-keywords">Mo tat ca goi y</button>
        <button class="small-btn" data-action="round2-toggle-answer">${state.round2.showCenterAnswer ? "An dap an doc" : "Hien dap an doc"}</button>
        <button class="small-btn subtle" data-action="round2-reset-center">Reset dap an doc</button>
      </div>

      <div class="admin-divider"></div>

      <div class="panel-heading">
        <div>
          <div class="eyebrow">Special cards</div>
          <h3 class="panel-title">La chan / Phan doi</h3>
        </div>
      </div>
      <div class="team-status-grid">
        ${state.teams
          .map(
            (team) => `
              <article class="team-status-card">
                <strong>${esc(team.name)}</strong>
                <div class="inline-action-row">
                  <button
                    class="small-btn ${state.round2.statuses[team.id]?.shield ? "active" : ""}"
                    data-action="round2-toggle-status"
                    data-team-id="${team.id}"
                    data-status="shield"
                  >
                    La chan
                  </button>
                  <button
                    class="small-btn ${state.round2.statuses[team.id]?.objection ? "active" : ""}"
                    data-action="round2-toggle-status"
                    data-team-id="${team.id}"
                    data-status="objection"
                  >
                    Phan doi
                  </button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>

      <div class="admin-divider"></div>

      <div class="panel-heading">
        <div>
          <div class="eyebrow">Manual purchase</div>
          <h3 class="panel-title">See the Future</h3>
        </div>
      </div>

      <div class="dual-form-grid compact">
        <label class="field-label">
          <span>Doi mua the</span>
          <select class="select-input" data-action="set-item-field" data-scope="round2-center" data-index="0" data-field="seeFuture.teamId">
            ${state.teams
              .map(
                (team) => `
                  <option value="${team.id}" ${team.id === state.round2.seeFuture.teamId ? "selected" : ""}>
                    ${esc(team.name)}
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>
        <label class="field-label">
          <span>Goi y dac biet</span>
          <textarea class="textarea-input" rows="3" data-action="set-item-field" data-scope="round2-center" data-index="0" data-field="seeFuture.hint">${esc(
            state.round2.seeFuture.hint,
          )}</textarea>
        </label>
      </div>

      <div class="inline-action-row">
        <button class="small-btn" data-action="round2-buy-see-future">
          Tru 20 diem va hien goi y ${seeFutureTeam ? `(${esc(seeFutureTeam.name)})` : ""}
        </button>
        <button class="small-btn subtle" data-action="round2-toggle-see-future">
          ${state.round2.seeFuture.visible ? "An goi y" : "Hien lai goi y"}
        </button>
      </div>
    </section>
  `;
}

function renderRound2Display() {
  const activeStatuses = state.teams.flatMap((team) => {
    const teamStatuses = state.round2.statuses[team.id] ?? {};
    return ["shield", "objection"]
      .filter((status) => teamStatuses[status])
      .map((status) => ({
        teamName: team.name,
        label: status === "shield" ? "La chan" : "Phan doi",
      }));
  });
  const visibleHints = state.round2.centerHints.slice(0, state.round2.revealedHintCount);
  const centerAnswer = getRound2CenterAnswer();
  const hiddenLength = Math.max(1, centerAnswer.length || state.round2.rows.length);
  const centerChars = Array.from(state.round2.showCenterAnswer ? centerAnswer || "?" : "?".repeat(hiddenLength));

  return `
    <section class="round-display round-two-display">
      <div class="round-two-grid crossword-layout">
        <div class="projector-panel r2-board-stage">
          <div class="panel-mini-title">Bang chu hang ngang</div>
          ${renderRound2CrosswordBoard()}
        </div>

        <div class="r2-side-stack">
          <div class="projector-panel r2-center-panel">
            <div class="center-label">Dap an doc</div>
            <div class="center-answer ${state.round2.showCenterAnswer ? "revealed" : ""}">
              ${centerChars.map((char) => `<span class="center-answer-cell">${esc(char)}</span>`).join("")}
            </div>
            ${
              visibleHints.length
                ? `
                  <div class="keyword-cloud">
                    ${visibleHints.map((hint) => `<span class="keyword-chip">${esc(hint)}</span>`).join("")}
                  </div>
                `
                : ""
            }

            ${
              state.round2.seeFuture.visible
                ? `
                  <div class="see-future-card">
                    <div class="see-future-kicker">See the Future</div>
                    <strong>${esc(findTeam(state.round2.seeFuture.teamId)?.name ?? "Doi")}</strong>
                    <p>${esc(state.round2.seeFuture.hint)}</p>
                  </div>
                `
                : ""
            }
          </div>

          <div class="projector-panel r2-status-panel">
            <div class="panel-mini-title">Trang thai dang kich hoat</div>
            ${
              activeStatuses.length
                ? activeStatuses
                    .map(
                      (item) => `
                        <div class="status-banner">
                          <span>${esc(item.teamName)}</span>
                          <strong>${esc(item.label)}</strong>
                        </div>
                      `,
                    )
                    .join("")
                : `<div class="status-empty">Chua co la dac biet nao dang hien thi.</div>`
            }
          </div>
        </div>
      </div>

      <div class="r2-clue-strip">
        ${state.round2.rows
          .map(
            (row) => `
              <article class="r2-clue-card ${row.opened ? "opened" : ""}">
                <div class="r2-clue-order">Hang ${row.number}</div>
                <div class="r2-clue-text">${row.opened ? esc(row.clue) : "..."}</div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRound2LiveAdmin() {
  const seeFutureTeam = findTeam(state.round2.seeFuture.teamId);

  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Round 2 live control</div>
          <h2 class="panel-title">Crossword layout va dieu khien mo hang</h2>
        </div>
        <button class="small-btn" data-action="set-control-view" data-view="bank">Open Question Bank</button>
      </div>

      <div class="round2-bank-layout">
        <article class="admin-preview-card">
          <div class="panel-mini-title">Grid live preview</div>
          ${renderRound2CrosswordBoard({ revealAll: true, compact: true })}
        </article>
        <article class="admin-preview-card">
          <div class="panel-mini-title">Dap an doc va goi y</div>
          <div class="round2-derived-answer">${esc(getRound2CenterAnswer() || "CHUA CO")}</div>
          <div class="inline-action-row">
            <button class="small-btn" data-action="round2-reveal-next-keyword">Mo goi y doc tiep</button>
            <button class="small-btn" data-action="round2-show-all-keywords">Mo tat ca goi y</button>
          </div>
          <div class="inline-action-row">
            <button class="small-btn" data-action="round2-toggle-answer">${state.round2.showCenterAnswer ? "An dap an doc" : "Hien dap an doc"}</button>
            <button class="small-btn subtle" data-action="round2-reset-center">Reset dap an doc</button>
          </div>
        </article>
      </div>

      <div class="admin-divider"></div>

      <div class="round2-row-bank-list">
        ${state.round2.rows
          .map((row, index) => {
            const metrics = getRound2RowMetrics(row);
            return `
              <article class="round2-bank-row">
                <div class="round2-bank-row-main">
                  <strong>Hang ${row.number}</strong>
                  <span>${esc(row.clue)}</span>
                </div>
                <div class="round2-bank-row-meta">
                  <span>Dap an: ${esc(row.answerWord || "...")}</span>
                  <span>Cot ${metrics.startColumn}</span>
                  <span>Giao diem: ${esc(metrics.crossLetter || "-")}</span>
                </div>
                <div class="inline-action-row">
                  <button class="small-btn ${row.opened ? "active" : ""}" data-action="round2-toggle-row" data-index="${index}">
                    ${row.opened ? "Hide row" : "Open row"}
                  </button>
                  <button class="small-btn" data-action="open-item-screen" data-scope="round2-row" data-index="${index}">Open screen</button>
                  <button class="small-btn" data-action="edit-bank-item" data-scope="round2-row" data-index="${index}">Edit content</button>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>

      <div class="panel-heading minor">
        <div>
          <div class="eyebrow">Special cards</div>
          <h3 class="panel-title">La chan / Phan doi</h3>
        </div>
      </div>
      <div class="team-status-grid">
        ${state.teams
          .map(
            (team) => `
              <article class="team-status-card">
                <strong>${esc(team.name)}</strong>
                <div class="inline-action-row">
                  <button
                    class="small-btn ${state.round2.statuses[team.id]?.shield ? "active" : ""}"
                    data-action="round2-toggle-status"
                    data-team-id="${team.id}"
                    data-status="shield"
                  >
                    La chan
                  </button>
                  <button
                    class="small-btn ${state.round2.statuses[team.id]?.objection ? "active" : ""}"
                    data-action="round2-toggle-status"
                    data-team-id="${team.id}"
                    data-status="objection"
                  >
                    Phan doi
                  </button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>

      <div class="panel-heading minor">
        <div>
          <div class="eyebrow">Manual purchase</div>
          <h3 class="panel-title">See the Future</h3>
        </div>
      </div>
      <div class="inline-action-row">
        <button class="small-btn" data-action="round2-buy-see-future">
          Tru 20 diem va hien goi y ${seeFutureTeam ? `(${esc(seeFutureTeam.name)})` : ""}
        </button>
        <button class="small-btn subtle" data-action="round2-toggle-see-future">
          ${state.round2.seeFuture.visible ? "An goi y" : "Hien lai goi y"}
        </button>
      </div>
    </section>
  `;
}

function renderRound3Admin() {
  const pack = getSelectedRound3Pack();
  const timer = getTimerSnapshot(state.round3.timer);
  const selectedQuestion = getSelectedRound3Question();

  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Round 3 control</div>
          <h2 class="panel-title">Quickfire packages</h2>
        </div>
      </div>

      <div class="pack-button-row">
        ${state.round3.packs
          .map(
            (roundPack) => `
              <button
                class="pack-pill ${roundPack.id === state.round3.selectedPack ? "active" : ""}"
                data-action="round3-select-pack"
                data-pack-id="${roundPack.id}"
              >
                ${esc(roundPack.label)}
              </button>
            `,
          )
          .join("")}
      </div>

      <div class="timer-admin-card">
        <div class="timer-readout">
          <span>Dong ho Round 3</span>
          <strong data-bind-timer="round3">${formatClock(timer.remainingMs)}</strong>
        </div>
        <div class="inline-action-row">
          <button class="small-btn" data-action="timer-start" data-timer="round3">Start</button>
          <button class="small-btn" data-action="timer-pause" data-timer="round3">Pause</button>
          <button class="small-btn subtle" data-action="timer-reset" data-timer="round3">Reset 120s</button>
        </div>
      </div>

      <div class="panel-heading minor">
        <div>
          <div class="eyebrow">Trap toggle</div>
          <h3 class="panel-title">Next Question Trap</h3>
        </div>
      </div>
      <div class="inline-action-row">
        <button
          class="small-btn ${state.round3.armedTrap === "bomb" ? "active danger" : ""}"
          data-action="round3-arm-trap"
          data-trap="bomb"
        >
          Bomb
        </button>
        <button
          class="small-btn ${state.round3.armedTrap === "x2" ? "active" : ""}"
          data-action="round3-arm-trap"
          data-trap="x2"
        >
          X2
        </button>
        <button class="small-btn subtle" data-action="round3-arm-trap" data-trap="">Clear arm</button>
        <button class="small-btn subtle" data-action="round3-clear-trap-alert">Clear projector alert</button>
      </div>

      <div class="admin-divider"></div>

      <div class="pack-button-row">
        ${pack.questions
          .map(
            (question, index) => `
              <button class="pack-pill ${editorState.round3Index === index ? "active" : ""}" data-action="select-editor-item" data-scope="round3-question" data-pack-id="${pack.id}" data-index="${index}">
                ${esc(question.label)}
              </button>
            `,
          )
          .join("")}
      </div>

      <div class="question-status-grid">
        ${pack.questions
          .map(
            (question, index) => `
              <article class="qf-question-row">
                <div class="qf-question-meta">
                  <strong>${esc(question.label)}</strong>
                  <span class="status-tag ${question.status !== "pending" ? "filled" : ""}">
                    ${esc(question.status)}
                    ${question.trap ? ` · ${esc(question.trap.toUpperCase())}` : ""}
                  </span>
                </div>
                <div class="inline-action-row">
                  <button
                    class="small-btn ${question.status === "live" ? "active" : ""}"
                    data-action="round3-set-question-status"
                    data-pack-id="${pack.id}"
                    data-index="${index}"
                    data-status="live"
                  >
                    Live
                  </button>
                  <button
                    class="small-btn ${question.status === "done" ? "active" : ""}"
                    data-action="round3-set-question-status"
                    data-pack-id="${pack.id}"
                    data-index="${index}"
                    data-status="done"
                  >
                    Done
                  </button>
                  <button
                    class="small-btn subtle"
                    data-action="round3-set-question-status"
                    data-pack-id="${pack.id}"
                    data-index="${index}"
                    data-status="pending"
                  >
                    Reset
                  </button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>

      <div class="admin-divider"></div>

      <div class="panel-heading">
        <div>
          <div class="eyebrow">Selected question</div>
          <h3 class="panel-title">${esc(pack.label)} · ${esc(selectedQuestion?.label ?? "")}</h3>
        </div>
        ${
          selectedQuestion
            ? `
              <button class="small-btn" data-action="open-item-screen" data-scope="round3-question" data-pack-id="${pack.id}" data-index="${editorState.round3Index}">
                Open screen
              </button>
            `
            : ""
        }
      </div>

      ${selectedQuestion ? renderQuestionEditor("round3-question", editorState.round3Index, selectedQuestion, pack.id) : ""}
    </section>
  `;
}

function renderRound3Display() {
  const currentRef = getCurrentRound3PresentationRef();
  const pack = getRound3Pack(currentRef?.packId ?? state.round3.selectedPack);
  const timer = getTimerSnapshot(state.round3.timer);
  const currentQuestion = currentRef ? getScopedItem(state, currentRef.scope, currentRef.index, currentRef.packId) : null;

  return `
    <section class="round-display round-three-display">
      <div class="round-three-top">
        ${state.round3.packs
          .map(
            (roundPack) => `
              <article class="pack-card ${roundPack.id === state.round3.selectedPack ? "active" : ""}">
                <span>${esc(roundPack.label)}</span>
              </article>
            `,
          )
          .join("")}
      </div>

      <div class="hero-timer-card">
        <div class="hero-timer-label">Quickfire Timer</div>
        <div class="hero-timer-value" data-bind-timer="round3">${formatClock(timer.remainingMs)}</div>
        <div class="timer-bar">
          <div class="timer-bar-fill" data-bind-progress="round3"></div>
        </div>
      </div>

      ${
        state.round3.lastTrapAnnouncement
          ? `
            <div class="projector-banner danger">
              <div class="banner-label">Trap Triggered</div>
              <div class="banner-value">
                ${esc(state.round3.lastTrapAnnouncement.type.toUpperCase())} · ${
                  esc(getRound3Pack(state.round3.lastTrapAnnouncement.packId)?.label ?? "")
                } · Cau ${state.round3.lastTrapAnnouncement.questionIndex + 1}
              </div>
            </div>
          `
          : state.round3.armedTrap
            ? `
              <div class="projector-banner">
                <div class="banner-label">Trap Armed</div>
                <div class="banner-value">Next question se kich hoat ${esc(state.round3.armedTrap.toUpperCase())}</div>
              </div>
            `
            : ""
      }

      <div class="round3-question-stage inline-stage">
        ${
          currentQuestion
            ? `
              <div class="presentation-topbar">
                <div>
                  <div class="presentation-kicker">${esc(getPresentationLabel(currentQuestion))}</div>
                  <h2 class="presentation-title">${esc(currentQuestion.content.title || getPresentationLabel(currentQuestion))}</h2>
                </div>
                <div class="status-tag filled">Team: ${esc(findTeam(state.round3.activeTeamId)?.name ?? "Team")}</div>
              </div>

              <div class="presentation-body">
                ${
                  currentQuestion.content.prompt
                    ? `<div class="presentation-prompt ${currentQuestion.content.questionType === "multiple_choice" ? "compact" : ""}">${esc(
                        currentQuestion.content.prompt,
                      )}</div>`
                    : ""
                }

                ${
                  currentQuestion.content.questionType === "image" || currentQuestion.content.questionType === "text_image"
                    ? `
                      <div class="presentation-image-frame">
                        ${
                          currentQuestion.content.imageSrc
                            ? `<img class="presentation-image" src="${esc(currentQuestion.content.imageSrc)}" alt="${esc(currentQuestion.content.title || getPresentationLabel(currentQuestion))}">`
                            : `<div class="presentation-image-placeholder">No image path</div>`
                        }
                      </div>
                    `
                    : ""
                }

                ${
                  currentQuestion.content.questionType === "multiple_choice"
                    ? `
                      <div class="presentation-choices">
                        ${currentQuestion.content.choices
                          .filter((choice) => choice.trim() !== "")
                          .map(
                            (choice, choiceIndex) => `
                              <div class="presentation-choice">
                                <span>${String.fromCharCode(65 + choiceIndex)}</span>
                                <strong>${esc(choice)}</strong>
                              </div>
                            `,
                          )
                          .join("")}
                      </div>
                    `
                    : ""
                }
              </div>

              ${
                state.presentation.showAnswer
                  ? `
                    <div class="presentation-answer-card">
                      <div class="answer-kicker">Correct answer</div>
                      <div class="answer-value">${esc(currentQuestion.content.answer || "Chua nhap dap an")}</div>
                    </div>
                  `
                  : ""
              }
            `
            : `
              <div class="presentation-empty">Ready for Quickfire. Use control to show the first question.</div>
            `
        }
      </div>

      <div class="quickfire-track">
        ${pack.questions
          .map(
            (question, index) => `
              <article class="quickfire-chip ${question.status} ${question.trap ? `trap-${question.trap}` : ""} ${
                currentRef?.packId === pack.id && currentRef?.index === index ? "current" : ""
              }">
                <div class="quickfire-chip-index">${index + 1}</div>
                <div class="quickfire-chip-status">${esc(question.status)}</div>
                ${question.trap ? `<div class="quickfire-chip-trap">${esc(question.trap.toUpperCase())}</div>` : ""}
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRound3LiveAdmin() {
  const pack = getRound3Pack();
  const timer = getTimerSnapshot(state.round3.timer);
  const currentRef = getCurrentRound3PresentationRef();
  const currentQuestion = currentRef ? getScopedItem(state, currentRef.scope, currentRef.index, currentRef.packId) : null;
  const currentPack = currentRef ? getRound3Pack(currentRef.packId) : pack;

  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Round 3 live control</div>
          <h2 class="panel-title">Quickfire packages</h2>
        </div>
        <button class="small-btn" data-action="set-control-view" data-view="bank">Open Question Bank</button>
      </div>

      <div class="pack-button-row">
        ${state.round3.packs
          .map(
            (roundPack) => `
              <button
                class="pack-pill ${roundPack.id === state.round3.selectedPack ? "active" : ""}"
                data-action="round3-select-pack"
                data-pack-id="${roundPack.id}"
              >
                ${esc(roundPack.label)}
              </button>
            `,
          )
          .join("")}
      </div>

      <div class="timer-admin-card">
        <div class="timer-readout">
          <span>Dong ho Round 3</span>
          <strong data-bind-timer="round3">${formatClock(timer.remainingMs)}</strong>
        </div>
        <div class="inline-action-row">
          <button class="small-btn" data-action="timer-start" data-timer="round3">Start</button>
          <button class="small-btn" data-action="timer-pause" data-timer="round3">Pause</button>
          <button class="small-btn subtle" data-action="timer-reset" data-timer="round3">Reset 120s</button>
          <button class="small-btn subtle" data-action="round3-finish-turn">Finish turn</button>
        </div>
      </div>

      <div class="dual-form-grid compact">
        <div class="field-label">
          <span>Playing team</span>
          ${renderCurrentTeamSummary()}
        </div>
        <div class="dual-form-grid compact quickfire-score-grid">
          <label class="field-label">
            <span>Right points</span>
            <input class="number-input" type="number" value="${Number(state.round3.correctPoints || 0)}" data-action="round3-set-score-value" data-kind="correct">
          </label>
          <label class="field-label">
            <span>Wrong penalty</span>
            <input class="number-input" type="number" value="${Number(state.round3.wrongPoints || 0)}" data-action="round3-set-score-value" data-kind="wrong">
          </label>
        </div>
      </div>

      <div class="timer-admin-card">
        <div class="timer-readout">
          <span>Current question</span>
          <strong>${esc(currentQuestion ? `${pack.label} · ${currentQuestion.label}` : "No question on screen")}</strong>
        </div>
        <div class="inline-action-row">
          <button class="small-btn" data-action="round3-open-next">Next question</button>
          <button class="small-btn success" data-action="round3-mark-result" data-result="correct">
            Right +${Number(state.round3.correctPoints || 0)}
          </button>
          <button class="small-btn danger" data-action="round3-mark-result" data-result="wrong">
            Wrong -${Number(state.round3.wrongPoints || 0)}
          </button>
        </div>
      </div>

      <div class="inline-action-row">
        <button
          class="small-btn ${state.round3.armedTrap === "bomb" ? "active danger" : ""}"
          data-action="round3-arm-trap"
          data-trap="bomb"
        >
          Bomb
        </button>
        <button
          class="small-btn ${state.round3.armedTrap === "x2" ? "active" : ""}"
          data-action="round3-arm-trap"
          data-trap="x2"
        >
          X2
        </button>
        <button class="small-btn subtle" data-action="round3-arm-trap" data-trap="">Clear arm</button>
        <button class="small-btn subtle" data-action="round3-clear-trap-alert">Clear projector alert</button>
      </div>

      <div class="question-status-grid compact-live-grid">
        ${pack.questions
          .map(
            (question, index) => `
              <article class="qf-question-row">
                <div class="qf-question-meta">
                  <strong>${esc(question.label)}</strong>
                  <span class="status-tag ${question.status !== "pending" ? "filled" : ""}">
                    ${esc(question.status)}
                    ${question.trap ? ` Â· ${esc(question.trap.toUpperCase())}` : ""}
                  </span>
                </div>
                <div class="inline-action-row">
                  <button class="small-btn active" data-action="round3-show-question" data-pack-id="${pack.id}" data-index="${index}">
                    Show now
                  </button>
                  <button class="small-btn" data-action="edit-bank-item" data-scope="round3-question" data-pack-id="${pack.id}" data-index="${index}">
                    Edit content
                  </button>
                  <button
                    class="small-btn ${question.status === "done" ? "active" : ""}"
                    data-action="round3-set-question-status"
                    data-pack-id="${pack.id}"
                    data-index="${index}"
                    data-status="${question.status === "done" ? "pending" : "done"}"
                  >
                    ${question.status === "done" ? "Reset" : "Done"}
                  </button>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRound4Admin() {
  const timer = getTimerSnapshot(state.round4.timer);

  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Round 4 control</div>
          <h2 class="panel-title">Hung bien final</h2>
        </div>
      </div>

      <div class="dual-form-grid compact">
        ${[0, 1]
          .map(
            (slot) => `
              <label class="field-label">
                <span>${slot === 0 ? "Doi A" : "Doi B"}</span>
                <select class="select-input" data-action="round4-set-finalist" data-slot="${slot}">
                  ${state.teams
                    .map(
                      (team) => `
                        <option value="${team.id}" ${state.round4.finalists[slot] === team.id ? "selected" : ""}>
                          ${esc(team.name)}
                        </option>
                      `,
                    )
                    .join("")}
                </select>
              </label>
            `,
          )
          .join("")}
      </div>

      <div class="panel-heading minor">
        <div>
          <div class="eyebrow">Stage control</div>
          <h3 class="panel-title">Chuyen giai doan</h3>
        </div>
      </div>
      <div class="pack-button-row">
        ${Object.entries(ROUND4_STAGE_META)
          .map(
            ([stageId, meta]) => `
              <button
                class="pack-pill ${state.round4.currentStage === stageId ? "active" : ""}"
                data-action="round4-set-stage"
                data-stage="${stageId}"
              >
                ${esc(meta.label)}
              </button>
            `,
          )
          .join("")}
      </div>

      <div class="timer-admin-card">
        <div class="timer-readout">
          <span>Dong ho stage</span>
          <strong data-bind-timer="round4">${formatClock(timer.remainingMs)}</strong>
        </div>
        <div class="inline-action-row">
          <button class="small-btn" data-action="timer-start" data-timer="round4">Start</button>
          <button class="small-btn" data-action="timer-pause" data-timer="round4">Pause</button>
          <button class="small-btn subtle" data-action="timer-reset" data-timer="round4">Reset stage</button>
        </div>
      </div>

      <div class="admin-divider"></div>

      <div class="final-score-grid">
        ${state.round4.finalists
          .map((teamId, slot) => {
            const team = findTeam(teamId);
            const score = getRound4TeamScore(teamId);
            return `
              <article class="final-score-card">
                <h3>${esc(team?.name ?? `Doi ${slot + 1}`)}</h3>
                ${["content", "rebuttal", "skill"]
                  .map(
                    (key) => `
                      <label class="field-label">
                        <span>${
                          key === "content" ? "Noi dung" : key === "rebuttal" ? "Phan bien" : "Ky nang"
                        }</span>
                        <input
                          class="number-input"
                          type="number"
                          value="${esc(score[key])}"
                          data-action="round4-set-score"
                          data-team-id="${teamId}"
                          data-score-key="${key}"
                        >
                      </label>
                    `,
                  )
                  .join("")}
                <div class="score-total-line">Tong hien thi: <strong>${getRound4Total(teamId)}</strong></div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderRound4Display() {
  const timer = getTimerSnapshot(state.round4.timer);
  const currentStageMeta = ROUND4_STAGE_META[state.round4.currentStage] ?? ROUND4_STAGE_META.opening;

  return `
    <section class="round-display round-four-display">
      <div class="hero-timer-card final">
        <div class="hero-timer-label">Giai doan hien tai</div>
        <div class="stage-name">${esc(currentStageMeta.label)}</div>
        <div class="hero-timer-value" data-bind-timer="round4">${formatClock(timer.remainingMs)}</div>
        <div class="timer-bar">
          <div class="timer-bar-fill" data-bind-progress="round4"></div>
        </div>
      </div>

      <div class="final-duel-grid">
        ${state.round4.finalists
          .map((teamId) => {
            const team = findTeam(teamId);
            const score = getRound4TeamScore(teamId);
            return `
              <article class="finalist-card">
                <div class="finalist-name">${esc(team?.name ?? teamId)}</div>
                <div class="final-score-list">
                  <div><span>Noi dung</span><strong>${Number(score.content || 0)}</strong></div>
                  <div><span>Phan bien</span><strong>${Number(score.rebuttal || 0)}</strong></div>
                  <div><span>Ky nang</span><strong>${Number(score.skill || 0)}</strong></div>
                </div>
                <div class="final-total">Tong: ${getRound4Total(teamId)}</div>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function syncTimerBindings() {
  const bindings = {
    round3: getTimerSnapshot(state.round3.timer),
    round4: getTimerSnapshot(state.round4.timer),
    presentation: getTimerSnapshot(state.presentation.timer),
  };

  Object.entries(bindings).forEach(([timerId, timer]) => {
    document.querySelectorAll(`[data-bind-timer="${timerId}"]`).forEach((node) => {
      node.textContent = formatClock(timer.remainingMs);
    });
    document.querySelectorAll(`[data-bind-progress="${timerId}"]`).forEach((node) => {
      const progress = timer.durationMs <= 0 ? 0 : (timer.remainingMs / timer.durationMs) * 100;
      node.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    });
  });
}

function ensureRenderTicker() {
  if (renderTicker) return;

  renderTicker = window.setInterval(() => {
    settleExpiredTimers();
    syncTimerBindings();
    syncTimerAudio();
  }, 250);
}

function handleClick(actionNode) {
  const action = actionNode.dataset.action;
  if (!action) return;

  if (action === "open-display") {
    openDisplayWindow();
    return;
  }

  if (action === "reset-state") {
    if (window.confirm("Reset to a fresh Minigame 2 state?")) {
      editorState.round1Index = 0;
      editorState.round2Index = 0;
      editorState.round3PackId = "easy";
      editorState.round3Index = 0;
      applyState(createDefaultState());
    }
    return;
  }

  if (IS_DISPLAY_MODE) return;

  if (action === "set-control-view") {
    controlViewMode = actionNode.dataset.view === "bank" ? "bank" : "live";
    render();
    return;
  }

  if (action === "select-editor-item") {
    const scope = actionNode.dataset.scope;
    const index = Number(actionNode.dataset.index);
    setEditorSelection(scope, index, actionNode.dataset.packId || null);
    render();
    return;
  }

  if (action === "edit-bank-item") {
    setEditorSelection(actionNode.dataset.scope, Number(actionNode.dataset.index), actionNode.dataset.packId || null);
    controlViewMode = "bank";
    render();
    return;
  }

  if (action === "open-item-screen") {
    updateState((draft) => {
      if (actionNode.dataset.scope === "round1-cell") {
        queueSoundCue(draft, "sfx_card_flip");
      }
      openPresentationForItem(
        draft,
        createPresentationRef(actionNode.dataset.scope, Number(actionNode.dataset.index), actionNode.dataset.packId || null),
      );
    });
    return;
  }

  if (action === "presentation-close") {
    updateState((draft) => {
      draft.presentation = createPresentationState();
    });
    return;
  }

  if (action === "presentation-toggle-answer") {
    updateState((draft) => {
      draft.presentation.showAnswer = !draft.presentation.showAnswer;
      queueSoundCue(draft, "sfx_answer_select");
    });
    return;
  }

  if (action === "presentation-toggle-timer") {
    updateState((draft) => {
      draft.presentation.timerVisible = !draft.presentation.timerVisible;
    });
    return;
  }

  if (action === "presentation-set-effect") {
    updateState((draft) => {
      draft.presentation.effect = actionNode.dataset.effect || null;
    });
    return;
  }

  if (action === "presentation-set-media") {
    updateState((draft) => {
      draft.presentation.media = actionNode.dataset.media || null;
      if (draft.presentation.media === "get_help") {
        queueSoundCue(draft, "sfx_open_sheet");
      }
    });
    return;
  }

  if (action === "presentation-select-choice") {
    updateState((draft) => {
      draft.presentation.selectedChoiceIndex = Number(actionNode.dataset.choiceIndex);
      draft.presentation.typedResponse = "";
    });
    return;
  }

  if (action === "presentation-clear-response") {
    updateState((draft) => {
      draft.presentation.selectedChoiceIndex = -1;
      draft.presentation.typedResponse = "";
    });
    return;
  }

  if (action === "presentation-adjust-score") {
    updateState((draft) => {
      const team = draft.teams.find((entry) => entry.id === draft.currentTeamId);
      if (team) team.score = Number(team.score) + Number(actionNode.dataset.delta || 0);
      queueSoundCue(draft, Number(actionNode.dataset.delta || 0) >= 0 ? "sfx_score_up" : "sfx_score_down");
    });
    return;
  }

  if (action === "switch-round") {
    const round = Number(actionNode.dataset.round);
    if (round >= 1 && round <= 4) {
      updateState((draft) => {
        draft.currentRound = round;
      });
    }
    return;
  }

  if (action === "toggle-team-hidden") {
    updateState((draft) => {
      const team = draft.teams.find((item) => item.id === actionNode.dataset.teamId);
      if (team) team.hidden = !team.hidden;
    });
    return;
  }

  if (action === "select-current-team") {
    updateState((draft) => {
      const teamId = actionNode.dataset.teamId;
      if (!draft.teams.some((item) => item.id === teamId)) return;
      draft.currentTeamId = teamId;
      draft.round3.activeTeamId = teamId;
      draft.presentation.scoreTeamId = teamId;
    });
    return;
  }

  if (action === "round1-reveal") {
    updateState((draft) => {
      const cell = draft.round1.cells[Number(actionNode.dataset.index)];
      if (cell) cell.revealType = actionNode.dataset.kind || null;
    });
    return;
  }

  if (action === "round1-clear") {
    updateState((draft) => {
      const cell = draft.round1.cells[Number(actionNode.dataset.index)];
      if (!cell) return;
      cell.revealType = null;
    });
    return;
  }

  if (action === "round1-set-effect") {
    updateState((draft) => {
      draft.round1.activeEffect = actionNode.dataset.effect || null;
    });
    return;
  }
  if (action === "round2-toggle-row") {
    updateState((draft) => {
      const row = draft.round2.rows[Number(actionNode.dataset.index)];
      if (row) row.opened = !row.opened;
    });
    return;
  }

  if (action === "round2-reveal-next-keyword") {
    updateState((draft) => {
      draft.round2.revealedHintCount = Math.min(
        draft.round2.centerHints.length,
        draft.round2.revealedHintCount + 1,
      );
    });
    return;
  }

  if (action === "round2-show-all-keywords") {
    updateState((draft) => {
      draft.round2.revealedHintCount = draft.round2.centerHints.length;
    });
    return;
  }

  if (action === "round2-toggle-answer") {
    updateState((draft) => {
      draft.round2.showCenterAnswer = !draft.round2.showCenterAnswer;
    });
    return;
  }

  if (action === "round2-reset-center") {
    updateState((draft) => {
      draft.round2.revealedHintCount = 0;
      draft.round2.showCenterAnswer = false;
    });
    return;
  }

  if (action === "round2-toggle-status") {
    updateState((draft) => {
      const teamId = actionNode.dataset.teamId;
      const status = actionNode.dataset.status;
      if (!teamId || !status) return;
      const current = draft.round2.statuses[teamId] ?? { shield: false, objection: false };
      current[status] = !current[status];
      draft.round2.statuses[teamId] = current;
    });
    return;
  }

  if (action === "round2-buy-see-future") {
    updateState((draft) => {
      const team = draft.teams.find((item) => item.id === draft.round2.seeFuture.teamId);
      if (team) team.score = Number(team.score) - 20;
      draft.round2.seeFuture.visible = true;
    });
    return;
  }

  if (action === "round2-toggle-see-future") {
    updateState((draft) => {
      draft.round2.seeFuture.visible = !draft.round2.seeFuture.visible;
    });
    return;
  }

  if (action === "round3-select-pack") {
    editorState.round3PackId = actionNode.dataset.packId || editorState.round3PackId;
    editorState.round3Index = 0;
    updateState((draft) => {
      draft.round3.selectedPack = actionNode.dataset.packId || draft.round3.selectedPack;
    });
    return;
  }

  if (action === "round3-arm-trap") {
    updateState((draft) => {
      draft.round3.armedTrap = actionNode.dataset.trap || null;
    });
    return;
  }

  if (action === "round3-clear-trap-alert") {
    updateState((draft) => {
      draft.round3.lastTrapAnnouncement = null;
    });
    return;
  }

  if (action === "round3-show-question") {
    updateState((draft) => {
      const ref = createPresentationRef("round3-question", Number(actionNode.dataset.index), actionNode.dataset.packId || draft.round3.selectedPack);
      setRound3LiveQuestion(draft, ref);
    });
    return;
  }

  if (action === "round3-open-next") {
    updateState((draft) => {
      const currentRef = getCurrentRound3PresentationRef(draft);
      const fromIndex = currentRef?.packId === draft.round3.selectedPack ? currentRef.index : -1;
      const nextRef = getNextRound3QuestionRef(draft, draft.round3.selectedPack, fromIndex);
      if (nextRef) setRound3LiveQuestion(draft, nextRef);
    });
    return;
  }

  if (action === "round3-mark-result") {
    updateState((draft) => {
      const currentRef = getCurrentRound3PresentationRef(draft);
      if (!currentRef) return;

      const pack = draft.round3.packs.find((item) => item.id === currentRef.packId);
      const question = pack?.questions[currentRef.index];
      if (!question) return;

      const isCorrect = actionNode.dataset.result === "correct";
      const team = draft.teams.find((entry) => entry.id === draft.round3.activeTeamId);
      if (team) {
        team.score = Number(team.score) + (isCorrect ? Number(draft.round3.correctPoints || 0) : -Number(draft.round3.wrongPoints || 0));
      }
      queueSoundCue(draft, isCorrect ? "sfx_score_up" : "sfx_score_down");

      question.status = "done";
      const round3Timer = getTimerSnapshot(draft.round3.timer);
      const nextRef =
        round3Timer.remainingMs > 0 ? getNextRound3QuestionRef(draft, currentRef.packId, currentRef.index) : null;

      if (nextRef) {
        setRound3LiveQuestion(draft, nextRef);
        return;
      }

      draft.presentation.ref = null;
      draft.presentation.showAnswer = false;
      draft.presentation.selectedChoiceIndex = -1;
      draft.presentation.typedResponse = "";
      draft.presentation.scoreTeamId = draft.round3.activeTeamId;
    });
    return;
  }

  if (action === "round3-finish-turn") {
    updateState((draft) => {
      pauseTimer(draft.round3.timer);
      draft.round3.lastTrapAnnouncement = null;
      draft.presentation.ref = null;
      draft.presentation.showAnswer = false;
      draft.presentation.selectedChoiceIndex = -1;
      draft.presentation.typedResponse = "";
      draft.presentation.scoreTeamId = draft.round3.activeTeamId;
    });
    return;
  }

  if (action === "round3-set-question-status") {
    editorState.round3PackId = actionNode.dataset.packId || editorState.round3PackId;
    editorState.round3Index = Number(actionNode.dataset.index);
    updateState((draft) => {
      const pack = draft.round3.packs.find((item) => item.id === actionNode.dataset.packId);
      const question = pack?.questions[Number(actionNode.dataset.index)];
      const nextStatus = actionNode.dataset.status;
      if (!question || !nextStatus) return;

      question.status = nextStatus;
      if (nextStatus === "pending") {
        question.trap = null;
        if (draft.presentation.ref?.scope === "round3-question" && draft.presentation.ref.packId === pack.id) {
          if (draft.presentation.ref.index === Number(actionNode.dataset.index)) {
            draft.presentation.ref = null;
            draft.presentation.showAnswer = false;
            draft.presentation.selectedChoiceIndex = -1;
            draft.presentation.typedResponse = "";
          }
        }
        return;
      }

      if (nextStatus === "live") {
        setRound3LiveQuestion(draft, createPresentationRef("round3-question", Number(actionNode.dataset.index), pack.id));
      }
    });
    return;
  }

  if (action === "timer-start") {
    updateState((draft) => {
      const timer =
        actionNode.dataset.timer === "round4"
          ? draft.round4.timer
          : actionNode.dataset.timer === "presentation"
            ? draft.presentation.timer
            : draft.round3.timer;
      startTimer(timer);
    });
    return;
  }

  if (action === "timer-pause") {
    updateState((draft) => {
      const timer =
        actionNode.dataset.timer === "round4"
          ? draft.round4.timer
          : actionNode.dataset.timer === "presentation"
            ? draft.presentation.timer
            : draft.round3.timer;
      pauseTimer(timer);
    });
    return;
  }

  if (action === "timer-reset") {
    updateState((draft) => {
      if (actionNode.dataset.timer === "round4") {
        const stageMeta = ROUND4_STAGE_META[draft.round4.currentStage] ?? ROUND4_STAGE_META.opening;
        resetTimer(draft.round4.timer, stageMeta.durationMs);
      } else if (actionNode.dataset.timer === "presentation") {
        const item = getCurrentPresentationItem(draft);
        resetTimer(draft.presentation.timer, Math.max(5, Number(item?.content?.timerSeconds || 30)) * 1000);
      } else {
        resetTimer(draft.round3.timer, 120_000);
      }
    });
    return;
  }

  if (action === "round4-set-stage") {
    updateState((draft) => {
      const stage = actionNode.dataset.stage;
      const meta = ROUND4_STAGE_META[stage];
      if (!meta) return;
      draft.round4.currentStage = stage;
      draft.round4.timer = createTimer(meta.durationMs);
    });
  }
}

function handleChange(target) {
  const action = target.dataset.action;
  if (!action || IS_DISPLAY_MODE) return;

  if (action === "presentation-set-score-team") {
    updateState((draft) => {
      draft.presentation.scoreTeamId = target.value;
    });
    return;
  }

  if (action === "round3-set-active-team") {
    updateState((draft) => {
      draft.round3.activeTeamId = target.value;
      draft.presentation.scoreTeamId = target.value;
    });
    return;
  }

  if (action === "round3-set-score-value") {
    updateState((draft) => {
      const nextValue = Math.max(0, Number(target.value || 0));
      if (target.dataset.kind === "wrong") {
        draft.round3.wrongPoints = nextValue;
        return;
      }
      draft.round3.correctPoints = nextValue;
    });
    return;
  }

  if (action === "presentation-set-response-text") {
    updateState((draft) => {
      draft.presentation.typedResponse = target.value;
      draft.presentation.selectedChoiceIndex = -1;
    });
    return;
  }

  if (action === "set-item-field") {
    updateState((draft) => {
      const scope = target.dataset.scope;
      const field = target.dataset.field;
      if (!scope || !field) return;

      if (scope === "round2-center") {
        if (field === "centerHintsText") {
          draft.round2.centerHints = target.value
            .split(/\r?\n/)
            .map((item) => item.trim())
            .filter(Boolean);
          draft.round2.revealedHintCount = Math.min(
            draft.round2.revealedHintCount,
            draft.round2.centerHints.length,
          );
          return;
        }
        setNestedValue(draft.round2, field, normalizeFieldValue(field, target.value));
        return;
      }

      const index = Number(target.dataset.index);
      const packId = target.dataset.packId || null;
      withScopedItem(draft, scope, index, packId, (item) => {
        setNestedValue(item, field, normalizeFieldValue(field, target.value));
      });
    });
    return;
  }

  if (action === "set-team-name") {
    updateState((draft) => {
      const team = draft.teams.find((item) => item.id === target.dataset.teamId);
      if (team) team.name = target.value.trim() || team.name;
    });
    return;
  }

  if (action === "set-team-score") {
    updateState((draft) => {
      const team = draft.teams.find((item) => item.id === target.dataset.teamId);
      if (team) team.score = Number(target.value || 0);
    });
    return;
  }

  if (action === "toggle-team-card") {
    updateState((draft) => {
      const team = draft.teams.find((item) => item.id === target.dataset.teamId);
      const cardId = target.dataset.cardId;
      if (team && cardId) team.cards[cardId] = Boolean(target.checked);
    });
    return;
  }

  if (action === "round4-set-finalist") {
    updateState((draft) => {
      draft.round4.finalists[Number(target.dataset.slot)] = target.value;
    });
    return;
  }

  if (action === "round4-set-score") {
    updateState((draft) => {
      const teamId = target.dataset.teamId;
      const scoreKey = target.dataset.scoreKey;
      if (!teamId || !scoreKey) return;
      draft.round4.scores[teamId][scoreKey] = target.value;
    });
  }
}

app.addEventListener("click", (event) => {
  const actionNode = event.target.closest("[data-action]");
  if (!actionNode) return;
  handleClick(actionNode);
});

app.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) {
    return;
  }
  handleChange(target);
});

syncChannel?.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || message.source === CLIENT_ID) return;

  if (message.type === "request_state" && !IS_DISPLAY_MODE) {
    publishState(state);
    return;
  }

  if (message.type === "state_snapshot" && message.payload) {
    state = hydrateState(message.payload);
    saveState(state);
    render();
  }
});

window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    const nextState = hydrateState(JSON.parse(event.newValue));
    state = nextState;
    render();
  } catch {
    // Ignore malformed storage payloads.
  }
});

if (IS_DISPLAY_MODE) {
  syncChannel?.postMessage({ type: "request_state", source: CLIENT_ID });
}

ensureRenderTicker();
render();
