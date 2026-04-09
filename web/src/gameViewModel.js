import { generateFallbackCards } from "./cardsGenerator.js";
import { createEffectInstance, createTeam, EffectType, QuestionKind } from "./models.js";

function modulo(value, n) {
  return ((value % n) + n) % n;
}

function cloneTeams(teams) {
  return teams.map((team) => ({
    ...team,
    effectCards: team.effectCards.map((effect) => ({ ...effect })),
  }));
}

function cloneCards(cards) {
  return cards.map((card) => ({ ...card }));
}

function createTurnsRemaining(teamCount, roundsPerTeam) {
  return Array.from({ length: teamCount }, () => roundsPerTeam);
}

function normalizeTurnsRemaining(state, roundsPerTeam) {
  if (Array.isArray(state.turnsRemainingByTeam) && state.turnsRemainingByTeam.length === state.teams.length) {
    return [...state.turnsRemainingByTeam];
  }
  return createTurnsRemaining(state.teams.length, state.roundsPerTeam ?? roundsPerTeam);
}

function totalRemainingTurns(state, roundsPerTeam) {
  return normalizeTurnsRemaining(state, roundsPerTeam).reduce((sum, turns) => sum + turns, 0);
}

function findNextEligibleTeamIndex(turnsRemainingByTeam, currentIndex) {
  for (let offset = 1; offset <= turnsRemainingByTeam.length; offset += 1) {
    const index = modulo(currentIndex + offset, turnsRemainingByTeam.length);
    if (turnsRemainingByTeam[index] > 0) return index;
  }
  return null;
}

function effectOwnerIndex(effect) {
  const raw = Number.parseInt(String(effect?.id ?? "").split("_")[0], 10);
  return Number.isNaN(raw) ? null : raw - 1;
}

export class GameViewModel {
  constructor(options = {}) {
    this.initialCards = options.initialCards ?? null;
    this.listeners = new Set();
    this.timerInterval = null;
    this.remainingTimeMs = 20_999;
    this.isDoublePoint = false;
    this.isOneMoreTurn = false;
    this.roundsPerTeam = 5;
    this.state = this.createInitialState();
    this.startNewGame();
  }

  createPersistenceSnapshot() {
    return {
      version: 2,
      state: this.state,
      runtime: {
        remainingTimeMs: this.remainingTimeMs,
        isDoublePoint: this.isDoublePoint,
        isOneMoreTurn: this.isOneMoreTurn,
      },
    };
  }

  restoreFromSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return false;

    const nextState = snapshot.state ?? snapshot;
    if (!nextState || !Array.isArray(nextState.cards) || !Array.isArray(nextState.teams)) return false;

    this.cancelCurrentTimer();
    this.remainingTimeMs = snapshot.runtime?.remainingTimeMs ?? nextState.timerMs ?? 20_999;
    this.isDoublePoint = Boolean(snapshot.runtime?.isDoublePoint);
    this.isOneMoreTurn = Boolean(snapshot.runtime?.isOneMoreTurn);

    const restoredState = {
      ...this.createInitialState(),
      ...nextState,
      turnsRemainingByTeam:
        Array.isArray(nextState.turnsRemainingByTeam) && nextState.turnsRemainingByTeam.length === nextState.teams.length
          ? [...nextState.turnsRemainingByTeam]
          : createTurnsRemaining(nextState.teams.length, nextState.roundsPerTeam ?? this.roundsPerTeam),
      turnOwnerTeamIndex: nextState.turnOwnerTeamIndex ?? null,
      timerMs: nextState.timerMs ?? null,
      isTimerRunning: false,
      isDiscussionPhase: false,
      showEffectSheet: false,
    };

    this.setState(restoredState);
    return true;
  }

  createInitialState() {
    return {
      cards: [],
      teams: [],
      activeTeamIndex: 0,
      stolenTurnTeamIndex: null,
      activeEffect: null,
      timerMs: null,
      roundsPerTeam: this.roundsPerTeam,
      gameOver: false,
      showingStandings: false,
      winner: null,
      showingPresentationScreen: false,
      selectedCardIndex: null,
      selectedChoiceIndex: null,
      answerTimedOut: false,
      showingRules: true,
      isRevealingAnswer: false,
      isEffectNegated: false,
      isDiscussionPhase: false,
      isTimerRunning: false,
      showEffectSheet: false,
      rulesPage: 0,
      turnsRemainingByTeam: [],
      turnOwnerTeamIndex: null,
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  setState(updater) {
    const next = typeof updater === "function" ? updater(this.state) : updater;
    this.state = next;
    this.listeners.forEach((listener) => listener(this.state));
  }

  startNewGame(seed = null) {
    const cards = cloneCards(this.initialCards ?? generateFallbackCards(seed));
    const effectTypes = Object.values(EffectType);
    const pool = [];
    effectTypes.forEach((type) => {
      for (let i = 0; i < 3; i += 1) pool.push(type);
    });

    const teams = [];
    const teamNames = ["Giuse", "Don Bosco", "Đaminh Savio", "Gioan Tông đồ", "Mẹ Vô Nhiễm", "Phaolo Trở Lại", "Phanxico Assisi","Anton Padua"]
    for (let i = 1; i <= 8; i += 1) {
      const hand = [];
      for (let h = 0; h < 3; h += 1) {
        const pick = Math.floor(Math.random() * pool.length);
        hand.push(createEffectInstance(`${i}_${h}`, pool.splice(pick, 1)[0]));
      }
      teams.push(createTeam(i - 1, teamNames[i - 1], hand, 100));
    }

    this.cancelTimer();
    this.isDoublePoint = false;
    this.isOneMoreTurn = false;

    this.setState({
      ...this.createInitialState(),
      cards,
      teams,
      activeTeamIndex: 0,
      roundsPerTeam: this.roundsPerTeam,
      rulesPage: 0,
      showingRules: true,
      turnsRemainingByTeam: createTurnsRemaining(teams.length, this.roundsPerTeam),
    });
  }

  markEffectCardUsed(teamId, effectId) {
    this.setState((state) => {
      const teams = cloneTeams(state.teams);
      const team = teams[teamId];
      const idx = team.effectCards.findIndex((effect) => effect.id === effectId);
      if (idx !== -1) {
        team.effectCards[idx] = {
          ...team.effectCards[idx],
          used: true,
        };
      }
      return { ...state, teams };
    });
  }

  useEffectCard(teamId, effectId) {
    const team = this.state.teams[teamId];
    if (!team) return;
    const effectCard = team.effectCards.find((item) => item.id === effectId);
    if (!effectCard || effectCard.used) return;

    this.markEffectCardUsed(teamId, effectId);

    if (effectCard.type === EffectType.NOPE) {
      this.resetTimer();
      const currentEffect = this.state.activeEffect;
      if (currentEffect) {
        const nowNegated = !this.state.isEffectNegated;
        this.setState((state) => ({ ...state, isEffectNegated: nowNegated }));
        if (nowNegated) this.negateActiveEffect(currentEffect);
        else this.restoreActiveEffect(currentEffect);
      }
      return;
    }

    this.setState((state) => ({
      ...state,
      activeEffect: effectCard,
      isEffectNegated: false,
    }));
    this.applyEffect(effectCard, teamId);
  }

  applyEffect(effect, teamId) {
    switch (effect.type) {
      case EffectType.GET_HELP:
        this.startGetHelpTimer();
        break;
      case EffectType.STEAL:
        this.setState((state) => ({
          ...state,
          stolenTurnTeamIndex: teamId,
        }));
        this.resetTimer();
        this.isDoublePoint = false;
        break;
      case EffectType.DOUBLE_POINTS:
        this.isDoublePoint = true;
        break;
      case EffectType.ADD_ONE_TURN:
        this.isOneMoreTurn = true;
        this.setState((state) => {
          const turnsRemainingByTeam = normalizeTurnsRemaining(state, this.roundsPerTeam);
          turnsRemainingByTeam[teamId] += 1;
          return { ...state, turnsRemainingByTeam };
        });
        break;
      case EffectType.SKIP:
        this.advanceTurn();
        break;
      default:
        break;
    }
  }

  negateActiveEffect(effect) {
    switch (effect.type) {
      case EffectType.GET_HELP:
        this.resetTimer();
        break;
      case EffectType.STEAL:
        this.setState((state) => ({ ...state, stolenTurnTeamIndex: null }));
        break;
      case EffectType.DOUBLE_POINTS:
        this.isDoublePoint = false;
        break;
      case EffectType.ADD_ONE_TURN:
        this.isOneMoreTurn = false;
        this.setState((state) => {
          const ownerIndex = effectOwnerIndex(effect);
          if (ownerIndex == null) return state;
          const turnsRemainingByTeam = normalizeTurnsRemaining(state, this.roundsPerTeam);
          if (turnsRemainingByTeam[ownerIndex] > 0) {
            turnsRemainingByTeam[ownerIndex] -= 1;
          }
          return { ...state, turnsRemainingByTeam };
        });
        break;
      case EffectType.SKIP:
        this.resetTimer();
        this.setState((state) => ({
          ...state,
          activeTeamIndex: modulo(state.activeTeamIndex - 1, state.teams.length),
        }));
        break;
      default:
        break;
    }
  }

  restoreActiveEffect(effect) {
    switch (effect.type) {
      case EffectType.GET_HELP:
        this.startGetHelpTimer();
        break;
      case EffectType.STEAL: {
        const originalTeamId = Number.parseInt(effect.id.split("_")[0], 10) - 1;
        if (!Number.isNaN(originalTeamId)) {
          this.setState((state) => ({
            ...state,
            stolenTurnTeamIndex: originalTeamId,
          }));
          this.resetTimer();
          this.isDoublePoint = false;
        }
        break;
      }
      case EffectType.DOUBLE_POINTS:
        this.isDoublePoint = true;
        break;
      case EffectType.ADD_ONE_TURN:
        this.isOneMoreTurn = true;
        this.setState((state) => {
          const ownerIndex = effectOwnerIndex(effect);
          if (ownerIndex == null) return state;
          const turnsRemainingByTeam = normalizeTurnsRemaining(state, this.roundsPerTeam);
          turnsRemainingByTeam[ownerIndex] += 1;
          return { ...state, turnsRemainingByTeam };
        });
        break;
      case EffectType.SKIP:
        this.resetTimer();
        this.advanceTurn();
        break;
      default:
        break;
    }
  }

  replaceCardIfMustBeChallenge(index) {
    const state = this.state;
    const remainingTurns = totalRemainingTurns(state, this.roundsPerTeam);
    const selectedCard = state.cards[index];
    const selectedIsChallenge =
      selectedCard?.type === "QUESTION" && selectedCard.kind === QuestionKind.REAL_WORLD_CHALLENGE;
    const hiddenChallenges = state.cards.filter((card, cardIndex) => {
      return (
        cardIndex !== index &&
        !card.isRevealed &&
        card.type === "QUESTION" &&
        card.kind === QuestionKind.REAL_WORLD_CHALLENGE
      );
    });

    if (remainingTurns > hiddenChallenges.length + (selectedIsChallenge ? 1 : 0)) return;
    if (selectedIsChallenge) return;

    const challengeIndex = state.cards.findIndex((card) => {
      return (
        !card.isRevealed &&
        card.type === "QUESTION" &&
        card.kind === QuestionKind.REAL_WORLD_CHALLENGE
      );
    });

    if (challengeIndex === -1) return;

    this.setState((current) => {
      const cards = cloneCards(current.cards);
      const temp = cards[index];
      cards[index] = cards[challengeIndex];
      cards[challengeIndex] = temp;
      return { ...current, cards };
    });
  }

  onCardClicked(index) {
    this.replaceCardIfMustBeChallenge(index);

    this.setState((state) => ({
      ...state,
      showingPresentationScreen: true,
      selectedCardIndex: index,
      turnOwnerTeamIndex: state.activeTeamIndex,
      selectedChoiceIndex: null,
      answerTimedOut: false,
      isRevealingAnswer: false,
      showEffectSheet: false,
    }));

    const card = this.state.cards[index];
    if (!card) return;

    if (card.type === "BOMB") {
      this.applyScoreToActive(-20);
      this.markRevealed(index);
      return;
    }

    if (card.kind === QuestionKind.MULTIPLE_CHOICE || card.kind === QuestionKind.ESSAY) {
      this.remainingTimeMs = 20_999;
      this.setState((state) => ({
        ...state,
        timerMs: 20_999,
        isTimerRunning: false,
        isDiscussionPhase: false,
      }));
      return;
    }

    this.cancelCurrentTimer();
    this.markRevealed(index);
  }

  markRevealed(index) {
    this.setState((state) => {
      const cards = state.cards.map((card, cardIndex) =>
        cardIndex === index ? { ...card, isRevealed: true } : card,
      );
      const gameOver = cards.every((card) => card.isRevealed);
      return {
        ...state,
        cards,
        gameOver,
        showingStandings: gameOver,
      };
    });
  }

  showStandings() {
    this.setState((state) => ({ ...state, showingStandings: true }));
  }

  hideStandings() {
    if (this.state.gameOver) return;
    this.setState((state) => ({ ...state, showingStandings: false }));
  }

  applyScoreToActive(delta) {
    this.setState((state) => {
      const teams = cloneTeams(state.teams);
      const index =
        state.stolenTurnTeamIndex == null ? state.activeTeamIndex : state.stolenTurnTeamIndex;
      teams[index].score += delta;
      return { ...state, teams };
    });
  }

  advanceTurn() {
    this.cancelTimer();
    this.setState((state) => {
      const turnsRemainingByTeam = normalizeTurnsRemaining(state, this.roundsPerTeam);
      const nextActiveTeamIndex = findNextEligibleTeamIndex(turnsRemainingByTeam, state.activeTeamIndex);

      if (nextActiveTeamIndex == null) {
        return {
          ...state,
          activeTeamIndex: state.activeTeamIndex,
        };
      }

      return {
        ...state,
        activeTeamIndex: nextActiveTeamIndex,
      };
    });
  }

  startQuestionTimer() {
    this.cancelCurrentTimer();
    this.remainingTimeMs = 20_999;
    this.setState((state) => ({
      ...state,
      timerMs: 20_999,
      isTimerRunning: true,
      isDiscussionPhase: false,
    }));

    this.timerInterval = setInterval(() => {
      if (this.remainingTimeMs > 0) {
        this.setState((state) => ({
          ...state,
          timerMs: this.remainingTimeMs,
          isTimerRunning: true,
        }));
        this.remainingTimeMs -= 200;
        return;
      }

      this.cancelCurrentTimer();
      this.setState((state) => ({
        ...state,
        timerMs: 0,
        isTimerRunning: false,
      }));
      this.onAnswerTimeout();
    }, 200);
  }

  startTimerManually() {
    const state = this.state;
    if (state.isTimerRunning || state.isDiscussionPhase) return;
    const index = state.selectedCardIndex;
    if (index == null) return;
    const card = state.cards[index];
    if (!card || card.type !== "QUESTION" || card.isRevealed) return;
    if (card.kind !== QuestionKind.MULTIPLE_CHOICE && card.kind !== QuestionKind.ESSAY) return;
    this.startQuestionTimer();
  }

  startGetHelpTimer() {
    this.cancelCurrentTimer();
    this.remainingTimeMs = 32_000;
    let inDiscussionPhase = true;

    this.setState((state) => ({
      ...state,
      timerMs: this.remainingTimeMs,
      isDiscussionPhase: true,
      isTimerRunning: true,
    }));

    this.timerInterval = setInterval(() => {
      if (this.remainingTimeMs > 0) {
        this.setState((state) => ({
          ...state,
          timerMs: this.remainingTimeMs,
          isDiscussionPhase: inDiscussionPhase,
          isTimerRunning: true,
        }));
        this.remainingTimeMs -= 200;
        return;
      }

      if (inDiscussionPhase) {
        inDiscussionPhase = false;
        this.remainingTimeMs = 20_999;
        this.setState((state) => ({
          ...state,
          timerMs: this.remainingTimeMs,
          isDiscussionPhase: false,
          isTimerRunning: true,
        }));
        return;
      }

      this.cancelCurrentTimer();
      this.setState((state) => ({
        ...state,
        timerMs: 0,
        isDiscussionPhase: false,
        isTimerRunning: false,
      }));
      this.onAnswerTimeout();
    }, 200);
  }

  cancelCurrentTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTimer() {
    this.cancelCurrentTimer();
    this.remainingTimeMs = 20_999;
    this.setState((state) => ({
      ...state,
      timerMs: 20_999,
      isDiscussionPhase: false,
      isTimerRunning: false,
    }));
  }

  cancelTimer() {
    this.cancelCurrentTimer();
    this.remainingTimeMs = 20_999;
    this.setState((state) => ({
      ...state,
      isDiscussionPhase: false,
      isTimerRunning: false,
    }));
  }

  submitAnswer(choiceIndex) {
    const state = this.state;
    if (state.selectedChoiceIndex != null) return;
    const selectedCardIndex = state.selectedCardIndex;
    if (selectedCardIndex == null) return;
    const card = state.cards[selectedCardIndex];
    if (!card || card.type !== "QUESTION") return;

    const selectedChoice = choiceIndex >= 0 ? choiceIndex : null;
    this.setState((current) => ({
      ...current,
      selectedChoiceIndex: selectedChoice,
      answerTimedOut: choiceIndex < 0,
    }));
  }

  onAnswerTimeout() {
    const state = this.state;
    const selectedCardIndex = state.selectedCardIndex;
    if (selectedCardIndex == null) return;
    const card = state.cards[selectedCardIndex];
    if (!card || card.type !== "QUESTION") return;

    const choiceIndex = state.selectedChoiceIndex ?? -1;
    const didTimeout = choiceIndex < 0;

    if (card.kind === QuestionKind.MULTIPLE_CHOICE) {
      let points = choiceIndex === card.correctChoiceIndex ? 10 : -5;
      if (this.isDoublePoint && points > 0) points *= 2;
      this.applyScoreToActive(points);
    }

    this.setState((current) => ({
      ...current,
      answerTimedOut: didTimeout,
      isRevealingAnswer: false,
      isTimerRunning: false,
      isDiscussionPhase: false,
    }));
    this.markRevealed(selectedCardIndex);
  }

  closePresentationScreen() {
    this.cancelTimer();
    const shouldConsumeTurn =
      this.state.selectedCardIndex != null &&
      this.state.cards[this.state.selectedCardIndex]?.isRevealed;
    const keepCurrentTeam = this.isOneMoreTurn;
    this.isOneMoreTurn = false;

    this.setState((state) => {
      const turnsRemainingByTeam = normalizeTurnsRemaining(state, this.roundsPerTeam);
      let activeTeamIndex = state.activeTeamIndex;
      let gameOver = state.gameOver;
      let showingStandings = state.showingStandings;

      if (shouldConsumeTurn) {
        const turnOwnerTeamIndex = state.turnOwnerTeamIndex ?? state.activeTeamIndex;
        if (turnsRemainingByTeam[turnOwnerTeamIndex] > 0) {
          turnsRemainingByTeam[turnOwnerTeamIndex] -= 1;
        }

        const hiddenCardsRemain = state.cards.some((card) => !card.isRevealed);
        if (!hiddenCardsRemain) {
          gameOver = true;
          showingStandings = true;
        } else if (keepCurrentTeam && turnsRemainingByTeam[turnOwnerTeamIndex] > 0) {
          activeTeamIndex = turnOwnerTeamIndex;
        } else {
          const nextActiveTeamIndex = findNextEligibleTeamIndex(turnsRemainingByTeam, turnOwnerTeamIndex);
          if (nextActiveTeamIndex == null) {
            activeTeamIndex = turnOwnerTeamIndex;
          } else {
            activeTeamIndex = nextActiveTeamIndex;
          }
        }
      }

      return {
        ...state,
        activeTeamIndex,
        gameOver,
        showingStandings,
        showingPresentationScreen: false,
        selectedCardIndex: null,
        turnOwnerTeamIndex: null,
        selectedChoiceIndex: null,
        answerTimedOut: false,
        stolenTurnTeamIndex: null,
        timerMs: null,
        isRevealingAnswer: false,
        isDiscussionPhase: false,
        isTimerRunning: false,
        showEffectSheet: false,
        turnsRemainingByTeam,
      };
    });
  }

  addPointsManually(delta, teamId) {
    this.setState((state) => {
      const teams = cloneTeams(state.teams);
      teams[teamId].score += delta;
      return { ...state, teams };
    });
  }

  shiftActiveTeam(delta) {
    this.setState((state) => ({
      ...state,
      activeTeamIndex: modulo(state.activeTeamIndex + delta, state.teams.length),
      stolenTurnTeamIndex: null,
    }));
  }

  closeRulesScreen() {
    this.setState((state) => ({ ...state, showingRules: false }));
  }

  endGame() {
    this.cancelTimer();
    this.setState((state) => ({
      ...state,
      gameOver: true,
      showingStandings: true,
      showingPresentationScreen: false,
      selectedCardIndex: null,
      turnOwnerTeamIndex: null,
      selectedChoiceIndex: null,
      answerTimedOut: false,
      stolenTurnTeamIndex: null,
      timerMs: null,
      isRevealingAnswer: false,
      isDiscussionPhase: false,
      isTimerRunning: false,
      showEffectSheet: false,
    }));
  }

  setShowEffectSheet(show) {
    this.setState((state) => ({ ...state, showEffectSheet: show }));
  }
}
