import { SfxPlayer } from "./sfxPlayer.js";

const app = document.getElementById("app");
const params = new URLSearchParams(window.location.search);
const APP_MODE = params.get("mode") === "display" ? "display" : "control";
const IS_DISPLAY_MODE = APP_MODE === "display";
const STORAGE_KEY = "btt:minigame2:shared-state:v2";
const CHANNEL_NAME = "btt:minigame2:sync";
const AVAILABLE_ROUNDS = [1, 2, 3];
const COVER_SCREEN = "cover";
const INTRO_SCREEN_BY_ROUND = {
  1: "intro_1",
  2: "intro_2",
  3: "intro_3",
};
const ROUND_BY_INTRO_SCREEN = {
  intro_1: 1,
  intro_2: 2,
  intro_3: 3,
};
const NAVIGATOR_SEQUENCE = [
  COVER_SCREEN,
  INTRO_SCREEN_BY_ROUND[1],
  1,
  INTRO_SCREEN_BY_ROUND[2],
  2,
  INTRO_SCREEN_BY_ROUND[3],
  3,
];
const QUESTION_TIMER_SECONDS = 20;
const ROUND2_ROW_COUNT = 8;
const CLIENT_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `client-${Math.random().toString(36).slice(2)}`;
const syncChannel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

const ROUND_META = {
  [COVER_SCREEN]: {
    short: "Cover",
    title: "Cover Screen",
    subtitle: "Man hinh mo dau toan man hinh truoc khi vao chuong trinh.",
  },
  [INTRO_SCREEN_BY_ROUND[1]]: {
    short: "Intro Round 1",
    title: "Intro Round 1",
    subtitle: "Phat video dieu huong truoc khi vao Round 1.",
  },
  [INTRO_SCREEN_BY_ROUND[2]]: {
    short: "Intro Round 2",
    title: "Intro Round 2",
    subtitle: "Phat video dieu huong truoc khi vao Round 2.",
  },
  [INTRO_SCREEN_BY_ROUND[3]]: {
    short: "Intro Round 3",
    title: "Intro Round 3",
    subtitle: "Phat video dieu huong truoc khi vao Round 3.",
  },
  1: {
    short: "Round 1",
    title: "Vượt biên",
    subtitle: "Người chơi chọn 1 ô bất kì để trả lời câu hỏi",
  },
  2: {
    short: "Round 2",
    title: "Bước vào tân thế giới",
    subtitle: "Các đội chơi lần lượt tìm ra đáp án các ô hàng ngang để suy ra đáp án ô hàng dọc",
  },
  3: {
    short: "Round 3",
    title: "Dấn thân",
    subtitle: "Mỗi đội chơi chọn 1 gói câu hỏi theo độ khó, tăng tốc để đạt được điểm trước khi về đích",
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

const ROUND3_PACK_TYPES = [
  { id: "easy", label: "De" },
  { id: "medium", label: "Trung binh" },
  { id: "hard", label: "Kho" },
];
const ROUND3_PACK_VARIANTS = 4;

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

function createManualContent(label, timerSeconds = QUESTION_TIMER_SECONDS) {
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

function createRoundIntroVideo(roundNumber) {
  return {
    src: `./assets/media/round${roundNumber}.mp4`,
    label: `Round ${roundNumber} intro`,
  };
}

function createRoundIntroState() {
  return {
    videos: {
      1: createRoundIntroVideo(1),
      2: createRoundIntroVideo(2),
      3: createRoundIntroVideo(3),
    },
  };
}

function createCoverState() {
  return {
    imageSrc: "./assets/media/background.jpg",
    label: "Show cover",
  };
}

function createIntroPlaybackState() {
  return {
    screen: null,
    token: null,
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
    timer: createTimer(QUESTION_TIMER_SECONDS * 1000),
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
    typeVisible: false,
    caption: "",
    content: createManualContent(`O ${index + 1}`, QUESTION_TIMER_SECONDS),
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
    content: createManualContent(`Hang ${index + 1}`, QUESTION_TIMER_SECONDS),
  };
}

function createRound3Question(index) {
  return {
    id: `q_${index + 1}`,
    label: `Cau ${index + 1}`,
    status: "pending",
    trap: null,
    content: createManualContent(`Cau ${index + 1}`, QUESTION_TIMER_SECONDS),
  };
}

function createRound3PackId(typeId, slot) {
  return `${typeId}_${slot}`;
}

function normalizeRound3PackTypeId(typeId) {
  return ROUND3_PACK_TYPES.some((packType) => packType.id === typeId) ? typeId : ROUND3_PACK_TYPES[0].id;
}

function getRound3PackTypeId(packId) {
  return normalizeRound3PackTypeId(String(packId ?? "").split("_")[0]);
}

function getRound3PackSlot(packId) {
  return clampInteger(String(packId ?? "").split("_")[1], 1, ROUND3_PACK_VARIANTS, 1);
}

function createRound3Pack(type, slot) {
  return {
    id: createRound3PackId(type.id, slot),
    typeId: type.id,
    slot,
    label: type.label,
    questions: Array.from({ length: 7 }, (_, index) => createRound3Question(index)),
  };
}

function createDefaultRound3Packs() {
  return ROUND3_PACK_TYPES.flatMap((type) =>
    Array.from({ length: ROUND3_PACK_VARIANTS }, (_, index) => createRound3Pack(type, index + 1)),
  );
}

function normalizeRound3PackId(currentStateOrPacks, packId) {
  const packs = Array.isArray(currentStateOrPacks)
    ? currentStateOrPacks
    : currentStateOrPacks?.round3?.packs ?? state?.round3?.packs ?? [];
  const exactId = String(packId ?? "").trim();
  if (packs.some((pack) => pack.id === exactId)) return exactId;

  const typeId = getRound3PackTypeId(exactId);
  const slot = getRound3PackSlot(exactId);
  return (
    packs.find((pack) => pack.typeId === typeId && Number(pack.slot) === slot)?.id ??
    packs.find((pack) => pack.typeId === typeId)?.id ??
    packs[0]?.id ??
    createRound3PackId(ROUND3_PACK_TYPES[0].id, 1)
  );
}

function buildRound3Packs(sourcePacks, options = {}) {
  const { preserveQuestionState = false } = options;
  const basePacks = createDefaultRound3Packs();
  const parsedPacks = Array.isArray(sourcePacks) ? sourcePacks : [];

  const packsById = new Map();
  const packsByType = new Map();

  parsedPacks.forEach((pack, index) => {
    if (!pack || typeof pack !== "object") return;
    const rawId = typeof pack.id === "string" && pack.id ? pack.id : null;
    const typeId = rawId ? getRound3PackTypeId(rawId) : ROUND3_PACK_TYPES[index]?.id ?? ROUND3_PACK_TYPES[0].id;

    if (rawId) packsById.set(rawId, pack);
    if (!packsByType.has(typeId)) packsByType.set(typeId, []);
    packsByType.get(typeId).push(pack);
  });

  return basePacks.map((basePack) => {
    const typeCandidates = packsByType.get(basePack.typeId) ?? [];
    const sourcePack =
      packsById.get(basePack.id) ??
      typeCandidates.find((pack) => Number(pack?.slot) === basePack.slot) ??
      typeCandidates[basePack.slot - 1] ??
      typeCandidates[0] ??
      null;

    return {
      ...basePack,
      label: typeof sourcePack?.label === "string" && sourcePack.label.trim() ? sourcePack.label : basePack.label,
      questions: basePack.questions.map((question, index) => {
        const sourceQuestion = sourcePack?.questions?.[index] ?? null;
        return {
          ...question,
          label: sourceQuestion?.label ?? question.label,
          status: preserveQuestionState ? sourceQuestion?.status ?? question.status : question.status,
          trap: preserveQuestionState ? sourceQuestion?.trap ?? question.trap : question.trap,
          content: {
            ...question.content,
            ...(sourceQuestion?.content ?? {}),
          },
        };
      }),
    };
  });
}

function createDefaultState() {
  return {
    schemaVersion: 7,
    currentRound: COVER_SCREEN,
    currentTeamId: "team_1",
    lastSoundCue: null,
    showStandings: false,
    teams: Array.from({ length: 4 }, (_, index) => createTeam(index)),
    cover: createCoverState(),
    roundIntro: createRoundIntroState(),
    introPlayback: createIntroPlaybackState(),
    presentation: createPresentationState(),
    round1: {
      cells: Array.from({ length: 16 }, (_, index) => createRound1Cell(index)),
      activeEffect: null,
    },
    round2: {
      rows: Array.from({ length: ROUND2_ROW_COUNT }, (_, index) => createRound2Row(index)),
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
      selectedPack: createRound3PackId("easy", 1),
      activeTeamId: "team_1",
      correctPoints: 10,
      wrongPoints: 10,
      packs: createDefaultRound3Packs(),
      armedTrap: null,
      lastTrapAnnouncement: null,
      timer: createTimer(120_000),
    },
  };
}

function createResetStatePreservingContent(currentState) {
  const base = createDefaultState();

  const teams = base.teams.map((team, index) => ({
    ...team,
    name: currentState.teams?.[index]?.name ?? team.name,
  }));

  const round1Cells = base.round1.cells.map((cell, index) => ({
    ...cell,
    revealType: currentState.round1?.cells?.[index]?.revealType ?? cell.revealType,
    caption: currentState.round1?.cells?.[index]?.caption ?? cell.caption,
    content: {
      ...cell.content,
      ...(currentState.round1?.cells?.[index]?.content ?? {}),
      timerSeconds: QUESTION_TIMER_SECONDS,
    },
  }));

  const round2Rows = base.round2.rows.map((row, index) => ({
    ...row,
    clue: currentState.round2?.rows?.[index]?.clue ?? row.clue,
    answerWord: currentState.round2?.rows?.[index]?.answerWord ?? row.answerWord,
    startColumn: currentState.round2?.rows?.[index]?.startColumn ?? row.startColumn,
    content: {
      ...row.content,
      ...(currentState.round2?.rows?.[index]?.content ?? {}),
      timerSeconds: QUESTION_TIMER_SECONDS,
    },
  }));

  const round3Packs = buildRound3Packs(currentState.round3?.packs).map((pack) => ({
    ...pack,
    questions: pack.questions.map((question) => ({
      ...question,
      content: {
        ...question.content,
        timerSeconds: QUESTION_TIMER_SECONDS,
      },
    })),
  }));

  return {
    ...base,
    teams,
    cover: {
      ...base.cover,
      ...(currentState.cover ?? {}),
    },
    roundIntro: clone(currentState.roundIntro ?? base.roundIntro),
    round1: {
      ...base.round1,
      activeEffect: null,
      cells: round1Cells,
    },
    round2: {
      ...base.round2,
      gridColumns: currentState.round2?.gridColumns ?? base.round2.gridColumns,
      highlightColumn: currentState.round2?.highlightColumn ?? base.round2.highlightColumn,
      centerAnswer: currentState.round2?.centerAnswer ?? base.round2.centerAnswer,
      centerHints: Array.isArray(currentState.round2?.centerHints)
        ? [...currentState.round2.centerHints]
        : [...base.round2.centerHints],
      seeFuture: {
        ...base.round2.seeFuture,
        teamId: currentState.round2?.seeFuture?.teamId ?? base.round2.seeFuture.teamId,
        hint: currentState.round2?.seeFuture?.hint ?? base.round2.seeFuture.hint,
      },
      rows: round2Rows,
    },
    round3: {
      ...base.round3,
      correctPoints: currentState.round3?.correctPoints ?? base.round3.correctPoints,
      wrongPoints: currentState.round3?.wrongPoints ?? base.round3.wrongPoints,
      packs: round3Packs,
    },
  };
}

function createQuestionBankExport(currentState) {
  return {
    type: "btt:minigame2:question-bank",
    version: 1,
    exportedAt: new Date().toISOString(),
    schemaVersion: currentState.schemaVersion ?? createDefaultState().schemaVersion,
    roundIntro: clone(currentState.roundIntro),
    round1: {
      cells: currentState.round1.cells.map((cell) => ({
        revealType: cell.revealType,
        caption: cell.caption,
        content: clone(cell.content),
      })),
    },
    round2: {
      gridColumns: currentState.round2.gridColumns,
      highlightColumn: currentState.round2.highlightColumn,
      centerAnswer: currentState.round2.centerAnswer,
      centerHints: clone(currentState.round2.centerHints),
      rows: currentState.round2.rows.map((row) => ({
        clue: row.clue,
        answerWord: row.answerWord,
        startColumn: row.startColumn,
        content: clone(row.content),
      })),
      seeFuture: {
        teamId: currentState.round2.seeFuture.teamId,
        hint: currentState.round2.seeFuture.hint,
      },
    },
    round3: {
      correctPoints: currentState.round3.correctPoints,
      wrongPoints: currentState.round3.wrongPoints,
      packs: currentState.round3.packs.map((pack) => ({
        id: pack.id,
        typeId: pack.typeId,
        slot: pack.slot,
        label: pack.label,
        questions: pack.questions.map((question) => ({
          label: question.label,
          content: clone(question.content),
        })),
      })),
    },
  };
}

function applyImportedQuestionBank(currentState, importedData) {
  const payload =
    importedData?.type === "btt:minigame2:question-bank" && importedData
      ? importedData
      : importedData?.questionBank?.type === "btt:minigame2:question-bank"
        ? importedData.questionBank
        : null;

  if (!payload) {
    throw new Error("Invalid question bank file.");
  }

  const base = createDefaultState();
  const nextState = clone(currentState);
  const round1Cells = base.round1.cells.map((cell, index) => ({
    ...nextState.round1.cells[index],
    ...cell,
    revealType: payload.round1?.cells?.[index]?.revealType ?? cell.revealType,
    typeVisible: false,
    caption: payload.round1?.cells?.[index]?.caption ?? cell.caption,
    content: {
      ...cell.content,
      ...(payload.round1?.cells?.[index]?.content ?? {}),
      timerSeconds: Math.max(
        5,
        Number(payload.round1?.cells?.[index]?.content?.timerSeconds || QUESTION_TIMER_SECONDS),
      ),
    },
  }));

  const round2Rows = base.round2.rows.map((row, index) => ({
    ...nextState.round2.rows[index],
    ...row,
    clue: payload.round2?.rows?.[index]?.clue ?? row.clue,
    answerWord: payload.round2?.rows?.[index]?.answerWord ?? row.answerWord,
    startColumn: payload.round2?.rows?.[index]?.startColumn ?? row.startColumn,
    content: {
      ...row.content,
      ...(payload.round2?.rows?.[index]?.content ?? {}),
      timerSeconds: Math.max(
        5,
        Number(payload.round2?.rows?.[index]?.content?.timerSeconds || QUESTION_TIMER_SECONDS),
      ),
    },
  }));

  const importedRound3Packs = buildRound3Packs(payload.round3?.packs).map((pack, packIndex) => ({
    ...pack,
    questions: pack.questions.map((question, questionIndex) => ({
      ...question,
      status: nextState.round3.packs[packIndex]?.questions?.[questionIndex]?.status ?? question.status,
      trap: nextState.round3.packs[packIndex]?.questions?.[questionIndex]?.trap ?? question.trap,
      content: {
        ...question.content,
        timerSeconds: Math.max(5, Number(question.content?.timerSeconds || QUESTION_TIMER_SECONDS)),
      },
    })),
  }));

  nextState.schemaVersion = Math.max(Number(nextState.schemaVersion || 0), 7);
  nextState.roundIntro = {
    ...base.roundIntro,
    ...(payload.roundIntro ?? {}),
    videos: {
      ...base.roundIntro.videos,
      ...(payload.roundIntro?.videos ?? {}),
    },
  };
  nextState.round1 = {
    ...nextState.round1,
    cells: round1Cells,
  };
  nextState.round2 = {
    ...nextState.round2,
    gridColumns: payload.round2?.gridColumns ?? base.round2.gridColumns,
    highlightColumn: payload.round2?.highlightColumn ?? base.round2.highlightColumn,
    centerAnswer: payload.round2?.centerAnswer ?? base.round2.centerAnswer,
    centerHints: Array.isArray(payload.round2?.centerHints) ? [...payload.round2.centerHints] : [...base.round2.centerHints],
    rows: round2Rows,
    seeFuture: {
      ...nextState.round2.seeFuture,
      teamId: payload.round2?.seeFuture?.teamId ?? nextState.round2.seeFuture.teamId,
      hint: payload.round2?.seeFuture?.hint ?? base.round2.seeFuture.hint,
      visible: nextState.round2.seeFuture.visible,
    },
  };
  nextState.round3 = {
    ...nextState.round3,
    correctPoints: payload.round3?.correctPoints ?? nextState.round3.correctPoints,
    wrongPoints: payload.round3?.wrongPoints ?? nextState.round3.wrongPoints,
    packs: importedRound3Packs,
  };
  nextState.presentation = createPresentationState();
  nextState.introPlayback = createIntroPlaybackState();
  nextState.showStandings = false;

  return nextState;
}

function downloadQuestionBank() {
  const exportData = createQuestionBankExport(state);
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `btt-minigame2-question-bank-${stamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function normalizeRoundNumber(roundNumber) {
  const parsed = Number(roundNumber);
  return AVAILABLE_ROUNDS.includes(parsed) ? parsed : AVAILABLE_ROUNDS[0];
}

function normalizeScreenValue(screen) {
  if (NAVIGATOR_SEQUENCE.includes(screen)) return screen;
  if (screen === "navigation") return INTRO_SCREEN_BY_ROUND[1];
  return normalizeRoundNumber(screen);
}

function isIntroScreen(screen) {
  return typeof screen === "string" && screen in ROUND_BY_INTRO_SCREEN;
}

function isCoverScreen(screen) {
  return screen === COVER_SCREEN;
}

function getRoundNumberForScreen(screen) {
  if (isCoverScreen(screen)) return 1;
  if (isIntroScreen(screen)) return ROUND_BY_INTRO_SCREEN[screen];
  return normalizeRoundNumber(screen);
}

function applyQuestionTimerMigration(items) {
  return items.map((item) => ({
    ...item,
    content: {
      ...(item.content ?? {}),
      timerSeconds: QUESTION_TIMER_SECONDS,
    },
  }));
}

function hydrateState(parsed) {
  const base = createDefaultState();
  if (!parsed || typeof parsed !== "object") return base;
  const requiresTimerMigration = Number(parsed.schemaVersion || 0) < 5;

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

  let round1Cells = Array.isArray(parsed.round1?.cells)
    ? base.round1.cells.map((cell, index) => ({
        ...cell,
        ...(parsed.round1.cells[index] ?? {}),
        typeVisible:
          typeof parsed.round1.cells[index]?.typeVisible === "boolean"
            ? parsed.round1.cells[index].typeVisible
            : Boolean(parsed.round1.cells[index]?.revealType),
        content: {
          ...cell.content,
          ...(parsed.round1.cells[index]?.content ?? {}),
        },
      }))
    : base.round1.cells;

  let round2Rows = Array.isArray(parsed.round2?.rows)
    ? base.round2.rows.map((row, index) => ({
        ...row,
        ...(parsed.round2.rows[index] ?? {}),
        content: {
          ...row.content,
          ...(parsed.round2.rows[index]?.content ?? {}),
        },
      }))
    : base.round2.rows;

  let round3Packs = buildRound3Packs(parsed.round3?.packs, { preserveQuestionState: true });

  if (requiresTimerMigration) {
    round1Cells = applyQuestionTimerMigration(round1Cells);
    round2Rows = applyQuestionTimerMigration(round2Rows);
    round3Packs = round3Packs.map((pack) => ({
      ...pack,
      questions: applyQuestionTimerMigration(pack.questions),
    }));
  }

  return {
    ...base,
    ...parsed,
    currentRound: normalizeScreenValue(
      parsed.currentRound === "navigation"
        ? INTRO_SCREEN_BY_ROUND[normalizeRoundNumber(parsed.roundIntro?.round ?? 1)]
        : parsed.currentRound,
    ),
    showStandings: Boolean(parsed.showStandings),
    teams,
    cover: {
      ...base.cover,
      ...(parsed.cover ?? {}),
    },
    roundIntro: {
      ...base.roundIntro,
      ...(parsed.roundIntro ?? {}),
      videos: {
        ...base.roundIntro.videos,
        ...(parsed.roundIntro?.videos ?? {}),
      },
    },
    introPlayback: {
      ...base.introPlayback,
      ...(parsed.introPlayback ?? {}),
    },
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
      selectedPack: normalizeRound3PackId(round3Packs, parsed.round3?.selectedPack ?? base.round3.selectedPack),
      packs: round3Packs,
      timer: {
        ...base.round3.timer,
        ...(parsed.round3?.timer ?? {}),
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
let displayIntroAudioUnlocked = false;
const editorState = {
  round1Index: 0,
  round2Index: 0,
  round3PackId: normalizeRound3PackId(state, state.round3?.selectedPack),
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

  for (const timer of [nextState.round3.timer, nextState.presentation.timer]) {
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
  return ROUND_META[normalizeScreenValue(state.currentRound)] ?? ROUND_META[1];
}

function getVisibleRoundNumber(currentState = state) {
  const ref = currentState.presentation?.ref;
  if (!currentState.presentation?.open || !ref) return normalizeScreenValue(currentState.currentRound);
  if (ref.scope === "round1-cell") return 1;
  if (ref.scope === "round2-row") return 2;
  if (ref.scope === "round3-question") return 3;
  return normalizeScreenValue(currentState.currentRound);
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
  const normalizedPackId = normalizeRound3PackId(state, packId);
  return state.round3.packs.find((pack) => pack.id === normalizedPackId) ?? state.round3.packs[0];
}

function getRound3PacksByType(typeId, currentState = state) {
  const normalizedTypeId = normalizeRound3PackTypeId(typeId);
  return currentState.round3.packs.filter((pack) => pack.typeId === normalizedTypeId);
}

function getRound3TypeLabel(typeId) {
  return ROUND3_PACK_TYPES.find((packType) => packType.id === normalizeRound3PackTypeId(typeId))?.label ?? "";
}

function getRound3PackControlLabel(pack) {
  if (!pack) return "";
  return `${pack.label} · Goi ${Number(pack.slot)}`;
}

function getScopedItem(currentState, scope, index, packId = null) {
  if (scope === "round1-cell") return currentState.round1.cells[index] ?? null;
  if (scope === "round2-row") return currentState.round2.rows[index] ?? null;
  if (scope === "round3-question") {
    const pack =
      currentState.round3.packs.find((item) => item.id === normalizeRound3PackId(currentState, packId)) ??
      currentState.round3.packs[0];
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
  return getRound3Pack(editorState.round3PackId);
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
  ref.packId = normalizeRound3PackId(draft, ref.packId);
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
  draft.showStandings = false;
  draft.presentation.selectedChoiceIndex = -1;
  draft.presentation.typedResponse = "";
  draft.presentation.scoreTeamId = draft.currentTeamId;
}

function getNextRound3QuestionRef(currentState, packId = currentState.round3.selectedPack, fromIndex = -1) {
  const pack =
    currentState.round3.packs.find((item) => item.id === normalizeRound3PackId(currentState, packId)) ??
    currentState.round3.packs[0];
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
  if (field === "content.timerSeconds") return Math.max(5, Number(value || QUESTION_TIMER_SECONDS));
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
    editorState.round3PackId = normalizeRound3PackId(state, packId || editorState.round3PackId);
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

  draft.showStandings = false;
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
  draft.presentation.timer = createTimer(Math.max(5, Number(item.content?.timerSeconds || QUESTION_TIMER_SECONDS)) * 1000);
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

  if (currentState.presentation.open && currentState.presentation.ref?.scope !== "round3-question") {
    return getTimerSnapshot(currentState.presentation.timer).running;
  }

  return false;
}

function getTickingAudioName(currentState = state) {
  if (currentState.currentRound === 3 && getCurrentRound3PresentationRef(currentState)) {
    return "sfx_time_ticking_2min";
  }

  if (currentState.presentation.open && currentState.presentation.ref?.scope !== "round3-question") {
    return "sfx_time_ticking";
  }

  return null;
}

function syncTimerAudio(currentState = state) {
  if (!IS_DISPLAY_MODE || !sfx) return;

  const shouldTick = shouldPlayTickingAudio(currentState);
  const tickingAudioName = getTickingAudioName(currentState);
  if (shouldTick && !tickingAudioActive) {
    tickingAudioActive = true;
    sfx.startTimeoutTicking(tickingAudioName ?? "sfx_time_ticking");
    return;
  }

  if (shouldTick && tickingAudioActive) {
    sfx.startTimeoutTicking(tickingAudioName ?? "sfx_time_ticking");
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
    if (node.dataset.introScreen) return;
    if (node.dataset.autoPlay !== "true") return;
    node.defaultMuted = false;
    node.muted = false;
    node.volume = 1;
    if (node.paused) {
      node.play().catch(() => {});
    }
  });

  document.querySelectorAll(".round-intro-video").forEach((node) => {
    if (!(node instanceof HTMLVideoElement)) return;
    const introScreen = node.dataset.introScreen;
    const token = state.introPlayback?.screen === introScreen ? state.introPlayback.token : null;
    const renderedToken = node.dataset.introToken || "";

    if (!token || renderedToken !== token || node.dataset.playbackToken === token) return;

    node.dataset.playbackToken = token;
    node.defaultMuted = !displayIntroAudioUnlocked;
    node.muted = !displayIntroAudioUnlocked;
    node.pause();
    try {
      node.currentTime = 0;
    } catch {}

    const tryPlay = () => {
      const autoplayAttempt = node.play();
      if (typeof autoplayAttempt?.catch === "function") {
        autoplayAttempt.catch(() => {});
      }
    };

    if (node.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
      return;
    }

    const handleReady = () => {
      tryPlay();
    };

    node.addEventListener("loadeddata", handleReady, { once: true });
    node.addEventListener("canplay", handleReady, { once: true });
    node.load();
  });
}

function unlockDisplayIntroAudio() {
  if (!IS_DISPLAY_MODE) return;
  displayIntroAudioUnlocked = true;

  document.querySelectorAll(".round-intro-video").forEach((node) => {
    if (!(node instanceof HTMLVideoElement)) return;
    node.defaultMuted = false;
    node.muted = false;
    const autoplayAttempt = node.play();
    if (typeof autoplayAttempt?.catch === "function") {
      autoplayAttempt.catch(() => {});
    }
  });

  render();
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

function getCurrentRoundIntroVideo(currentState = state) {
  const roundNumber = getRoundNumberForScreen(currentState.currentRound);
  const configuredVideo = currentState.roundIntro?.videos?.[roundNumber];
  return {
    ...createRoundIntroVideo(roundNumber),
    ...(configuredVideo ?? {}),
    src: String(configuredVideo?.src ?? "").trim() || `./assets/media/round${roundNumber}.mp4`,
  };
}

function getCurrentCover(currentState = state) {
  return {
    ...createCoverState(),
    ...(currentState.cover ?? {}),
    imageSrc: String(currentState.cover?.imageSrc ?? "").trim() || "./assets/media/background.jpg",
  };
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
          <input class="number-input" type="number" min="5" value="${Number(content.timerSeconds || QUESTION_TIMER_SECONDS)}" data-action="set-item-field" data-field="content.timerSeconds" ${dataAttrs}>
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
        <button class="toolbar-btn" data-action="export-question-bank">Export Bank</button>
        <button class="toolbar-btn" data-action="import-question-bank">Import Bank</button>
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
        <input id="question-bank-import-input" type="file" accept=".json,application/json" data-action="import-question-bank-file" hidden>
      </div>
    `;
  }

  return `
    <div class="control-shell">
      ${topbar}
      ${renderQuestionBankWorkspace()}
      <input id="question-bank-import-input" type="file" accept=".json,application/json" data-action="import-question-bank-file" hidden>
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
  const activeScreen = normalizeScreenValue(state.currentRound);

  return `
    <section class="admin-card round-switcher-card compact-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Show control</div>
          <h2 class="panel-title">Round Navigator</h2>
        </div>
      </div>
      <div class="round-switcher">
        ${NAVIGATOR_SEQUENCE.map(
          (screenKey) => `
            <button
              class="round-tab ${screenKey === activeScreen ? "active" : ""}"
              data-action="switch-round"
              data-round="${screenKey}"
            >
              <span>${esc(ROUND_META[screenKey].short)}</span>
              <strong>${esc(ROUND_META[screenKey].title)}</strong>
            </button>
          `,
        ).join("")}
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
            <div class="inline-action-row">
              <button class="small-btn ${state.showStandings ? "active" : ""}" data-action="show-standings-screen">
                Show standings
              </button>
              <button class="small-btn subtle" data-action="hide-standings-screen">
                Return to round
              </button>
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
  const activeScreen = normalizeScreenValue(state.currentRound);
  const roundMeta = getVisibleRoundMeta();
  const isNavigationScreen =
    (isCoverScreen(activeScreen) || isIntroScreen(activeScreen)) &&
    !state.showStandings &&
    (!state.presentation.open || !state.presentation.ref);

  if (isNavigationScreen) {
    return `
      <div class="projector-shell ${embedded ? "embedded" : "fullscreen"} navigation-screen-shell">
        <main class="projector-main navigation-screen-main">
          ${isCoverScreen(activeScreen) ? renderCoverScreen() : renderRoundIntroScreen()}
        </main>
      </div>
    `;
  }

  if (state.showStandings) {
    return `
      <div class="projector-shell ${embedded ? "embedded" : "fullscreen"} standings-screen-shell">
        <main class="projector-main standings-screen-main">
          ${renderStandingsScreen()}
        </main>
      </div>
    `;
  }

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
        ${
          state.presentation.open && state.presentation.ref?.scope !== "round3-question"
              ? renderPresentationScreen()
              : renderRoundDisplay()
        }
      </main>

      <footer class="score-dock">
        ${getVisibleTeams()
          .map((team) => renderProjectorTeamCard(team))
          .join("")}
      </footer>
    </div>
  `;
}

function renderStandingsScreen() {
  const rankedTeams = [...getVisibleTeams()].sort((left, right) => {
    if (right.score !== left.score) return Number(right.score) - Number(left.score);
    return String(left.name).localeCompare(String(right.name));
  });

  return `
    <section class="round-display standings-display">
      <div class="standings-hero">
        <div class="standings-hero-title">Bảng xếp hạng hiện tại</div>
      </div>

      <div class="standings-grid enhanced">
        ${rankedTeams
          .map(
            (team, index) => `
              <article class="standings-card ${state.currentTeamId === team.id ? "active" : ""} ${index === 0 ? "leader" : ""}">
                <div class="standings-rank">#${index + 1}</div>
                <div class="standings-name">${esc(team.name)}</div>
                <div class="standings-score">${Number(team.score)}</div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderRoundIntroScreen() {
  const screen = normalizeScreenValue(state.currentRound);
  const roundNumber = getRoundNumberForScreen(screen);
  const introVideo = getCurrentRoundIntroVideo();
  const src = String(introVideo.src ?? "").trim();
  const playbackToken = state.introPlayback?.screen === screen ? state.introPlayback.token ?? "" : "";

  if (!IS_DISPLAY_MODE) {
    return `
      <section class="presentation-stage round-intro-stage">
        <div class="round-intro-placeholder">
          <div class="banner-label">Projector intro</div>
          <div class="banner-value">Click the intro tab in Round Navigator to play ./assets/media/round${roundNumber}.mp4 on the projector.</div>
        </div>
      </section>
    `;
  }

  return `
    <section class="presentation-stage round-intro-stage full-intro-video-stage">
      ${
        src
          ? `
            <div class="presentation-video-frame round-intro-video-frame">
              <video
                class="presentation-video round-intro-video"
                src="${esc(src)}"
                autoplay
                ${displayIntroAudioUnlocked ? "" : "muted"}
                playsinline
                preload="auto"
                data-intro-screen="${esc(screen)}"
                data-intro-token="${esc(playbackToken)}"
              ></video>
              ${
                displayIntroAudioUnlocked
                  ? ""
                  : `
                    <button class="intro-audio-unlock" type="button" data-action="unlock-intro-audio">
                      Enable intro audio
                    </button>
                  `
              }
            </div>
          `
          : `
            <div class="round-intro-placeholder">
              <div class="banner-label">Video missing</div>
              <div class="banner-value">Expected file: ./assets/media/round${roundNumber}.mp4</div>
            </div>
          `
      }
    </section>
  `;
}

function renderCoverScreen() {
  const cover = getCurrentCover();
  const src = String(cover.imageSrc ?? "").trim();

  return `
    <section class="presentation-stage cover-stage">
      ${
        src
          ? `
            <div class="cover-screen-frame">
              <img class="cover-screen-image" src="${esc(src)}" alt="${esc(cover.label || "Cover")}">
            </div>
          `
          : `
            <div class="round-intro-placeholder">
              <div class="banner-label">Cover missing</div>
              <div class="banner-value">Expected file: ./assets/media/background.jpg</div>
            </div>
          `
      }
    </section>
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
    </article>
  `;
}

function renderProjectorTeamCard(team) {
  return `
    <article class="score-team-card ${state.currentTeamId === team.id ? "active" : ""}">
      <div class="score-team-name">${esc(team.name)}</div>
      <div class="score-team-points">${Number(team.score)}</div>
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
            playsinline
            preload="auto"
            data-auto-play="true"
          ></video>
        </div>
      </section>
    `;
  }

  if (state.presentation.media === "explosion") {
    return `
      <section class="presentation-stage media-stage bomb-stage full-video-stage">
        <div class="presentation-video-frame bomb-video-frame">
          <video
            class="presentation-video bomb-video"
            src="./assets/media/explosion.mp4"
            playsinline
            preload="auto"
            data-auto-play="true"
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
          ${ROUND3_PACK_TYPES
            .map(
              (roundPack) => `
                <article class="pack-card ${roundPack.id === pack.typeId ? "active" : ""}">
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

function renderNavigationAdmin() {
  const activeScreen = normalizeScreenValue(state.currentRound);
  const roundNumber = getRoundNumberForScreen(activeScreen);
  const isCover = isCoverScreen(activeScreen);

  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">${isCover ? "Cover screen" : "Intro screen"}</div>
          <h2 class="panel-title">${esc(ROUND_META[activeScreen]?.title ?? (isCover ? "Cover" : "Intro"))}</h2>
        </div>
      </div>

      <div class="stacked-block">
        <div class="status-empty">
          ${
            isCover
              ? `Clicking this screen in Round Navigator will show <strong>./assets/media/background.jpg</strong> fullscreen on the projector.`
              : `Clicking this intro tab in Round Navigator will play <strong>./assets/media/round${roundNumber}.mp4</strong> on the projector.`
          }
        </div>
      </div>
    </section>
  `;
}

function renderLiveRoundAdminPanel() {
  if (isCoverScreen(state.currentRound) || isIntroScreen(state.currentRound)) return renderNavigationAdmin();
  if (state.currentRound === 1) return renderRound1LiveAdmin();
  if (state.currentRound === 2) return renderRound2LiveAdmin();
  if (state.currentRound === 3) return renderRound3LiveAdmin();
  return renderRound1LiveAdmin();
}

function renderQuestionBankPanel() {
  if (isCoverScreen(state.currentRound) || isIntroScreen(state.currentRound)) return renderNavigationAdmin();
  if (state.currentRound === 1) return renderRound1Admin();
  if (state.currentRound === 2) return renderRound2Admin();
  if (state.currentRound === 3) return renderRound3Admin();
  return renderRound1Admin();
}

function renderRoundDisplay() {
  if (isCoverScreen(state.currentRound)) return renderCoverScreen();
  if (isIntroScreen(state.currentRound)) return renderRoundIntroScreen();
  if (state.currentRound === 1) return renderRound1Display();
  if (state.currentRound === 2) return renderRound2Display();
  if (state.currentRound === 3) return renderRound3Display();
  return renderRound1Display();
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
                class="live-round-card ${cell.typeVisible && cell.revealType ? "revealed" : "hidden-card"}"
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
                  ${
                    cell.revealType
                      ? `
                        <button
                          class="small-btn subtle"
                          data-action="${cell.typeVisible ? "round1-hide-type" : "round1-show-type"}"
                          data-index="${index}"
                        >
                          ${cell.typeVisible ? "Hide type" : "Show type"}
                        </button>
                      `
                      : ""
                  }
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
            const reveal = cell.typeVisible && cell.revealType ? ROUND1_REVEALS[cell.revealType] : null;
            return `
              <article class="r1-cell ${reveal ? `revealed ${cell.revealType}` : ""}">
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
  const selectedTypeId = pack?.typeId ?? getRound3PackTypeId(state.round3.selectedPack);

  return `
    <section class="admin-card">
      <div class="panel-heading">
        <div>
          <div class="eyebrow">Round 3 control</div>
          <h2 class="panel-title">Quickfire packages</h2>
        </div>
      </div>

      <div class="pack-button-row">
        ${ROUND3_PACK_TYPES
          .map(
            (roundPack) => `
              <button
                class="pack-pill ${roundPack.id === selectedTypeId ? "active" : ""}"
                data-action="round3-select-pack-type"
                data-pack-type="${roundPack.id}"
              >
                ${esc(roundPack.label)}
              </button>
            `,
          )
          .join("")}
      </div>

      <div class="pack-button-row">
        ${getRound3PacksByType(selectedTypeId)
          .map(
            (roundPack) => `
              <button
                class="pack-pill ${roundPack.id === pack.id ? "active" : ""}"
                data-action="round3-select-pack"
                data-pack-id="${roundPack.id}"
              >
                Goi ${Number(roundPack.slot)}
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
  const activeTypeId = pack?.typeId ?? getRound3PackTypeId(state.round3.selectedPack);

  return `
    <section class="round-display round-three-display">
      <div class="round-three-top">
        ${ROUND3_PACK_TYPES
          .map(
            (roundPack) => `
              <article class="pack-card ${roundPack.id === activeTypeId ? "active" : ""}">
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
  const selectedTypeId = pack?.typeId ?? getRound3PackTypeId(state.round3.selectedPack);

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
        ${ROUND3_PACK_TYPES
          .map(
            (roundPack) => `
              <button
                class="pack-pill ${roundPack.id === selectedTypeId ? "active" : ""}"
                data-action="round3-select-pack-type"
                data-pack-type="${roundPack.id}"
              >
                ${esc(roundPack.label)}
              </button>
            `,
          )
          .join("")}
      </div>

      <div class="pack-button-row">
        ${getRound3PacksByType(selectedTypeId)
          .map(
            (roundPack) => `
              <button
                class="pack-pill ${roundPack.id === pack.id ? "active" : ""}"
                data-action="round3-select-pack"
                data-pack-id="${roundPack.id}"
              >
                Goi ${Number(roundPack.slot)}
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

function syncTimerBindings() {
  const bindings = {
    round3: getTimerSnapshot(state.round3.timer),
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

  if (action === "unlock-intro-audio") {
    unlockDisplayIntroAudio();
    return;
  }

  if (action === "open-display") {
    openDisplayWindow();
    return;
  }

  if (action === "export-question-bank") {
    downloadQuestionBank();
    return;
  }

  if (action === "import-question-bank") {
    const input = document.getElementById("question-bank-import-input");
    if (input instanceof HTMLInputElement) {
      input.value = "";
      input.click();
    }
    return;
  }

  if (action === "reset-state") {
    if (window.confirm("Reset to a fresh Minigame 2 state?")) {
      editorState.round1Index = 0;
      editorState.round2Index = 0;
      editorState.round3PackId = createRound3PackId("easy", 1);
      editorState.round3Index = 0;
      applyState(createResetStatePreservingContent(state));
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
    });
    return;
  }

  if (action === "switch-round") {
    const screen = normalizeScreenValue(actionNode.dataset.round);
    if (NAVIGATOR_SEQUENCE.includes(screen)) {
      updateState((draft) => {
        draft.currentRound = screen;
        pauseTimer(draft.round3.timer);
        draft.showStandings = false;
        draft.introPlayback = isIntroScreen(screen)
          ? {
              screen,
              token: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            }
          : createIntroPlaybackState();
        draft.presentation = createPresentationState();
      });
    }
    return;
  }

  if (action === "show-standings-screen") {
    updateState((draft) => {
      pauseTimer(draft.round3.timer);
      draft.showStandings = true;
      draft.introPlayback = createIntroPlaybackState();
      draft.presentation = createPresentationState();
    });
    return;
  }

  if (action === "hide-standings-screen") {
    updateState((draft) => {
      draft.showStandings = false;
    });
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
      if (!cell) return;
      cell.revealType = actionNode.dataset.kind || null;
      if (!cell.revealType) {
        cell.typeVisible = false;
      }
    });
    return;
  }

  if (action === "round1-clear") {
    updateState((draft) => {
      const cell = draft.round1.cells[Number(actionNode.dataset.index)];
      if (!cell) return;
      cell.revealType = null;
      cell.typeVisible = false;
    });
    return;
  }

  if (action === "round1-show-type") {
    updateState((draft) => {
      const cell = draft.round1.cells[Number(actionNode.dataset.index)];
      if (!cell || !cell.revealType) return;
      cell.typeVisible = true;
    });
    return;
  }

  if (action === "round1-hide-type") {
    updateState((draft) => {
      const cell = draft.round1.cells[Number(actionNode.dataset.index)];
      if (!cell) return;
      cell.typeVisible = false;
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
    editorState.round3PackId = normalizeRound3PackId(state, actionNode.dataset.packId || editorState.round3PackId);
    editorState.round3Index = 0;
    updateState((draft) => {
      draft.round3.selectedPack = normalizeRound3PackId(draft, actionNode.dataset.packId || draft.round3.selectedPack);
    });
    return;
  }

  if (action === "round3-select-pack-type") {
    const selectedSlot = getRound3PackSlot(editorState.round3PackId || state.round3.selectedPack);
    const nextPackId = createRound3PackId(actionNode.dataset.packType, selectedSlot);

    editorState.round3PackId = normalizeRound3PackId(state, nextPackId);
    editorState.round3Index = 0;
    updateState((draft) => {
      draft.round3.selectedPack = normalizeRound3PackId(draft, nextPackId);
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
      const ref = createPresentationRef(
        "round3-question",
        Number(actionNode.dataset.index),
        normalizeRound3PackId(draft, actionNode.dataset.packId || draft.round3.selectedPack),
      );
      setRound3LiveQuestion(draft, ref);
    });
    return;
  }

  if (action === "round3-open-next") {
    updateState((draft) => {
      const currentRef = getCurrentRound3PresentationRef(draft);
      const fromIndex = currentRef?.packId === draft.round3.selectedPack ? currentRef.index : -1;
      const nextRef = getNextRound3QuestionRef(draft, draft.round3.selectedPack, fromIndex);
      if (nextRef) {
        setRound3LiveQuestion(draft, nextRef);
        return;
      }
      pauseTimer(draft.round3.timer);
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

      pauseTimer(draft.round3.timer);
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
    editorState.round3PackId = normalizeRound3PackId(state, actionNode.dataset.packId || editorState.round3PackId);
    editorState.round3Index = Number(actionNode.dataset.index);
    updateState((draft) => {
      const pack = draft.round3.packs.find(
        (item) => item.id === normalizeRound3PackId(draft, actionNode.dataset.packId),
      );
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
      const timer = actionNode.dataset.timer === "presentation" ? draft.presentation.timer : draft.round3.timer;
      startTimer(timer);
      if (actionNode.dataset.timer === "round3" && !getCurrentRound3PresentationRef(draft)) {
        const firstRef = getNextRound3QuestionRef(draft, draft.round3.selectedPack, -1);
        if (firstRef) {
          setRound3LiveQuestion(draft, firstRef);
          return;
        }
        pauseTimer(draft.round3.timer);
      }
    });
    return;
  }

  if (action === "timer-pause") {
    updateState((draft) => {
      const timer = actionNode.dataset.timer === "presentation" ? draft.presentation.timer : draft.round3.timer;
      pauseTimer(timer);
    });
    return;
  }

  if (action === "timer-reset") {
    updateState((draft) => {
      if (actionNode.dataset.timer === "presentation") {
        const item = getCurrentPresentationItem(draft);
        resetTimer(draft.presentation.timer, Math.max(5, Number(item?.content?.timerSeconds || QUESTION_TIMER_SECONDS)) * 1000);
      } else {
        resetTimer(draft.round3.timer, 120_000);
      }
    });
    return;
  }
}

function handleChange(target) {
  const action = target.dataset.action;
  if (!action || IS_DISPLAY_MODE) return;

  if (action === "import-question-bank-file") {
    const file = target.files?.[0];
    if (!file) return;

    file
      .text()
      .then((raw) => {
        const parsed = JSON.parse(raw);
        const nextState = applyImportedQuestionBank(state, parsed);
        editorState.round1Index = 0;
        editorState.round2Index = 0;
        editorState.round3PackId = normalizeRound3PackId(nextState, nextState.round3?.selectedPack);
        editorState.round3Index = 0;
        applyState(nextState);
        window.alert("Question bank imported successfully.");
      })
      .catch((error) => {
        console.error(error);
        window.alert("Import failed. Please use a valid question bank JSON file.");
      })
      .finally(() => {
        target.value = "";
      });
    return;
  }

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
