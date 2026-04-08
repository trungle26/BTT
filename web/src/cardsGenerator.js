import { createBombCard, createQuestionCard, QuestionKind } from "./models.js";

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

export function generateCards(seed = null) {
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
