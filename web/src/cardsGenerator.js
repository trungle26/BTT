import { createBombCard, createQuestionCard, QuestionKind } from "./models.js";

const DATA_SOURCES = [
  { path: "./data/questions.xlsx", kind: "xlsx" },
  { path: "./data/questions.csv", kind: "csv" },
];

function random(seed) {
  let s = seed ?? Math.floor(Math.random() * 2147483647);
  return () => {
    s = (s * 48271) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function shuffled(list, rnd) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function normalizeRow(row) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      String(key).trim().toLowerCase(),
      typeof value === "string" ? value.trim() : value,
    ]),
  );
}

function parseKind(rawType) {
  const type = String(rawType ?? "")
    .trim()
    .toUpperCase();

  if (!type) return QuestionKind.MULTIPLE_CHOICE;
  if (type === "BOMB") return "BOMB";
  if (type === "ESSAY") return QuestionKind.ESSAY;
  if (type === "REAL_WORLD_CHALLENGE" || type === "CHALLENGE") return QuestionKind.REAL_WORLD_CHALLENGE;
  return QuestionKind.MULTIPLE_CHOICE;
}

function parseChoiceIndex(value) {
  if (value == null || value === "") return -1;

  const raw = String(value).trim().toUpperCase();
  if (["A", "B", "C", "D"].includes(raw)) {
    return ["A", "B", "C", "D"].indexOf(raw);
  }

  const numeric = Number.parseInt(raw, 10);
  if (Number.isNaN(numeric)) return -1;
  if (numeric >= 1 && numeric <= 4) return numeric - 1;
  if (numeric >= 0 && numeric <= 3) return numeric;
  return -1;
}

function parseRows(rows) {
  const cards = rows
    .map(normalizeRow)
    .filter((row) => row.id || row.type || row.text)
    .map((row, index) => {
      const kind = parseKind(row.type);
      const id = row.id || `row_${index + 1}`;

      if (kind === "BOMB") {
        return createBombCard(id);
      }

      const choices = [row.choicea, row.choiceb, row.choicec, row.choiced].filter(
        (choice) => choice != null && String(choice).trim() !== "",
      );

      return createQuestionCard({
        id,
        text: row.text ?? "",
        choices,
        correctChoiceIndex: parseChoiceIndex(row.correctchoiceindex),
        correctAnswerText: row.correctanswertext || null,
        kind,
        isChallenge: kind === QuestionKind.REAL_WORLD_CHALLENGE,
      });
    });

  if (cards.length !== 48) {
    throw new Error(`Expected 48 board rows in spreadsheet, received ${cards.length}.`);
  }

  return cards;
}

async function fetchSpreadsheetRows() {
  if (!window.XLSX) return null;

  for (const source of DATA_SOURCES) {
    const response = await fetch(source.path, { cache: "no-store" }).catch(() => null);
    if (!response || !response.ok) continue;

    let workbook;
    if (source.kind === "xlsx") {
      const buffer = await response.arrayBuffer();
      workbook = window.XLSX.read(buffer, { type: "array" });
    } else {
      const text = await response.text();
      workbook = window.XLSX.read(text, { type: "string" });
    }

    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) continue;
    const sheet = workbook.Sheets[firstSheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, {
      raw: false,
      defval: "",
      blankrows: false,
    });

    return parseRows(rows);
  }

  return null;
}

export async function loadConfiguredCards(seed = null) {
  try {
    const loadedCards = await fetchSpreadsheetRows();
    if (loadedCards) return loadedCards;
  } catch (error) {
    console.error("Failed to load spreadsheet data, falling back to sample cards.", error);
  }

  return generateFallbackCards(seed);
}

export function generateFallbackCards(seed = null) {
  const rnd = random(seed ?? Date.now());
  const cards = [];

  const sampleQuestions = [
    createQuestionCard({
      id: "q_1",
      text: "Hành tinh nào gần Mặt Trời nhất?",
      choices: ["Sao Kim", "Sao Thủy", "Sao Hỏa", "Trái Đất"],
      correctChoiceIndex: 1,
    }),
    createQuestionCard({
      id: "q_2",
      text: "Ai là tác giả của tác phẩm 'Truyện Kiều'?",
      choices: ["Nguyễn Khuyến", "Nguyễn Du", "Chu Văn An", "Tú Xương"],
      correctChoiceIndex: 1,
    }),
    createQuestionCard({
      id: "q_3",
      text: "Loại thẻ nào trong game có thể giúp bạn nhìn trước nội dung ô?",
      choices: ["See Future", "Skip", "Double", "Nope"],
      correctChoiceIndex: 0,
    }),
    createQuestionCard({
      id: "q_4",
      text: "Đâu là tên một loại ngôn ngữ lập trình?",
      choices: ["Python", "Lion", "Tiger", "Eagle"],
      correctChoiceIndex: 0,
    }),
    createQuestionCard({
      id: "e_1",
      text: "Tự luận: Kể tên 5 quốc gia tại khu vực Đông Nam Á.",
      choices: [],
      correctChoiceIndex: -1,
      correctAnswerText:
        "Việt Nam, Lào, Campuchia, Thái Lan, Singapore, Indonesia, Malaysia, Philippines, Brunei, Myanmar, Timor-Leste.",
      kind: QuestionKind.ESSAY,
    }),
    createQuestionCard({
      id: "e_2",
      text: "Tự luận: Nêu ý nghĩa của ngày 2/9 tại Việt Nam.",
      choices: [],
      correctChoiceIndex: -1,
      correctAnswerText:
        "Ngày Quốc khánh Việt Nam, ngày Bác Hồ đọc bản Tuyên ngôn Độc lập khai sinh ra nước Việt Nam Dân chủ Cộng hòa.",
      kind: QuestionKind.ESSAY,
    }),
    createQuestionCard({
      id: "e_3",
      text: "Tự luận: Trong toán học, số Pi (π) xấp xỉ bằng bao nhiêu?",
      choices: [],
      correctChoiceIndex: -1,
      correctAnswerText: "3.14159...",
      kind: QuestionKind.ESSAY,
    }),
    createQuestionCard({
      id: "rw_1",
      text: "🔥 THỬ THÁCH: Cả đội hãy cùng nhảy 1 điệu Tiktok bất kỳ trong 15 giây.",
      choices: [],
      correctChoiceIndex: -1,
      correctAnswerText: "Hoàn thành thử thách để nhận điểm từ quản trò.",
      kind: QuestionKind.REAL_WORLD_CHALLENGE,
      isChallenge: true,
    }),
    createQuestionCard({
      id: "rw_2",
      text: "🔥 THỬ THÁCH: Tìm một vật dụng màu đỏ trong phòng trong vòng 10 giây.",
      choices: [],
      correctChoiceIndex: -1,
      correctAnswerText: "Quản trò xác nhận kết quả.",
      kind: QuestionKind.REAL_WORLD_CHALLENGE,
      isChallenge: true,
    }),
  ];

  cards.push(...sampleQuestions);

  let idx = cards.length;
  while (cards.length < 40) {
    const isEssay = rnd() > 0.5;
    if (isEssay) {
      cards.push(
        createQuestionCard({
          id: `q_${idx}`,
          text: `Câu hỏi tự luận mẫu #${idx}?`,
          choices: [],
          correctChoiceIndex: -1,
          correctAnswerText: `Đáp án mẫu cho câu hỏi #${idx}.`,
          kind: QuestionKind.ESSAY,
        }),
      );
    } else {
      cards.push(
        createQuestionCard({
          id: `q_${idx}`,
          text: `Câu hỏi trắc nghiệm mẫu #${idx}?`,
          choices: ["Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"],
          correctChoiceIndex: Math.floor(rnd() * 4),
        }),
      );
    }
    idx += 1;
  }

  for (let i = 0; i < 8; i += 1) {
    cards.push(createBombCard(`bomb_${Math.floor(rnd() * 1000)}`));
  }

  return shuffled(cards, rnd);
}
