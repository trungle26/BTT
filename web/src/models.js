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
  [EffectType.SEE_FUTURE]: { name: "Nhìn Trước Tương Lai", image: "nhin_trc_tuong_lai.jpg" },
  [EffectType.SKIP]: { name: "Bỏ Lượt Chơi", image: "bo_luot_choi.jpg" },
  [EffectType.ASSIGN]: { name: "Tấn Công", image: "tan_cong.jpg" },
  [EffectType.STEAL]: { name: "Giành Quyền Trả Lời", image: "gianh_quyen_tra_loi.jpg" },
  [EffectType.DOUBLE_POINTS]: { name: "Ngôi Sao Hy Vọng", image: "ngoi_sao_hy_vong.jpg" },
  [EffectType.ADD_ONE_TURN]: { name: "Thêm Lượt", image: "them_luot.jpg" },
  [EffectType.NOPE]: { name: "Vô Hiệu", image: "vo_hieu_hoa.jpg" },
  [EffectType.GET_HELP]: { name: "Xin Quyền Trợ Giúp", image: "xin_quyen_tro_giup.jpg" },
};

export function createTeam(id, name, effectCards, score = 0) {
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
