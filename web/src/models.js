export const QuestionKind = {
  MULTIPLE_CHOICE: "MULTIPLE_CHOICE",
  ESSAY: "ESSAY",
  REAL_WORLD_CHALLENGE: "REAL_WORLD_CHALLENGE",
};

export const EffectType = {
  SEE_FUTURE: "SEE_FUTURE",
  SKIP: "SKIP",
  ASSIGN: "ASSIGN",
  STEAL: "STEAL",
  DOUBLE_POINTS: "DOUBLE_POINTS",
  ADD_ONE_TURN: "ADD_ONE_TURN",
  NOPE: "NOPE",
  GET_HELP: "GET_HELP",
};

export const EFFECT_META = {
  [EffectType.SEE_FUTURE]: {
    name: "Nhìn Trước Tương Lai",
    image: "nhin_trc_tuong_lai.jpg",
    desc: "Nhìn thấy nội dung ô trước khi mở",
    timing: "Trước khi chọn ô",
    usability: "Dùng trước khi chọn ô của đội mình.",
  },
  [EffectType.SKIP]: {
    name: "Bỏ Lượt Chơi",
    image: "bo_luot_choi.jpg",
    desc: "Bỏ qua lượt chơi hiện tại",
    timing: "Trước hoặc sau khi mở ô",
    usability: "Dùng trước hoặc sau khi mở ô, nhưng chỉ trong lượt của đội mình.",
  },
  [EffectType.ASSIGN]: {
    name: "Tấn Công",
    image: "tan_cong.jpg",
    desc: "Chỉ định ô bắt buộc cho đội bạn mở",
    timing: "Khi đến lượt của đội bị chỉ định",
    usability: "Theo luật, đội bị chỉ định phải mở ô đã bị ép khi đến lượt. Ban web hiện tại chưa hỗ trợ thẻ này.",
  },
  [EffectType.STEAL]: {
    name: "Giành Quyền Trả Lời",
    image: "gianh_quyen_tra_loi.jpg",
    desc: "Cướp quyền trả lời của đội bạn",
    timing: "Trước khi đội bạn đưa ra đáp án",
    usability: "Đội khác có thể kích hoạt sau khi ô câu hỏi mở ra, miễn là đội đang trả lời chưa chốt đáp án.",
  },
  [EffectType.DOUBLE_POINTS]: {
    name: "Ngôi Sao Hy Vọng",
    image: "ngoi_sao_hy_vong.jpg",
    desc: "Nhân đôi số điểm nhận được",
    timing: "Trước khi nội dung câu hỏi hiện ra",
    usability: "Đội đang trả lời phải dùng ngay khi mở ô, trước khi bắt đầu phần câu hỏi.",
  },
  [EffectType.ADD_ONE_TURN]: {
    name: "Thêm Lượt",
    image: "them_luot.jpg",
    desc: "Thêm 1 lượt chọn ô",
    timing: "Khi đang trong lượt của đội mình",
    usability: "Chỉ dùng khi đội sở hữu đang ở trong lượt hiện tại.",
  },
  [EffectType.NOPE]: {
    name: "Vô Hiệu",
    image: "vo_hieu_hoa.jpg",
    desc: "Vô hiệu hóa lá bài của đội khác",
    timing: "Khi đội khác kích hoạt thẻ chức năng",
    usability: "Chỉ dùng để chặn một thẻ vừa được đội khác kích hoạt.",
  },
  [EffectType.GET_HELP]: {
    name: "Xin Quyền Trợ Giúp",
    image: "xin_quyen_tro_giup.jpg",
    desc: "Xin quyền trợ giúp từ người khác",
    timing: "Sau khi mở ô",
    usability: "Chỉ đội đang trả lời mới dùng được sau khi mở ô câu hỏi.",
  },
};

export function createTeam(id, name, effectCards, score = 100) {
  return { id, name, effectCards, score };
}

export function createEffectInstance(id, type, used = false) {
  return { id, type, used };
}

export function createQuestionCard({
  id,
  text,
  choices = [],
  correctChoiceIndex = -1,
  correctAnswerText = null,
  kind = QuestionKind.MULTIPLE_CHOICE,
  isRevealed = false,
  isChallenge = false,
}) {
  return {
    type: "QUESTION",
    id,
    text,
    choices,
    correctChoiceIndex,
    correctAnswerText,
    kind,
    isRevealed,
    isChallenge,
  };
}

export function createBombCard(id = "bomb", isRevealed = false) {
  return {
    type: "BOMB",
    id,
    isRevealed,
  };
}
