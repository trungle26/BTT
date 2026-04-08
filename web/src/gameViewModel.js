import { generateCards } from "./cardsGenerator.js";
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

export class GameViewModel {
  constructor() {
    this.listeners = new Set();
    this.timerInterval = null;
    this.remainingTimeMs = 20_000;
    this.isDoublePoint = false;
    this.isOneMoreTurn = false;
    this.roundsPerTeam = 5;
    this.state = this.createInitialState();
    this.startNewGame();
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
    const cards = generateCards(seed);
    const effectTypes = Object.values(EffectType);
    const pool = [];
    effectTypes.forEach((type) => {
      for (let i = 0; i < 8; i += 1) pool.push(type);
    });

    const teams = [];
    for (let i = 1; i <= 8; i += 1) {
      const hand = [];
      for (let h = 0; h < 3; h += 1) {
        const pick = Math.floor(Math.random() * pool.length);
        hand.push(createEffectInstance(`${i}_${h}`, pool.splice(pick, 1)[0]));
      }
      teams.push(createTeam(i - 1, `Team ${i}`, hand, 0));
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
    const revealedCount = state.cards.filter((card) => card.isRevealed).length;
    const remainingTurns = 40 - revealedCount;
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
      this.remainingTimeMs = 20_000;
      this.setState((state) => ({
        ...state,
        timerMs: 20_000,
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
      const revealedCount = cards.filter((card) => card.isRevealed).length;
      const gameOver = revealedCount >= 40;
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
    if (!this.isOneMoreTurn) {
      this.setState((state) => ({
        ...state,
        activeTeamIndex: modulo(state.activeTeamIndex + 1, state.teams.length),
      }));
    }
  }

  startQuestionTimer() {
    this.cancelCurrentTimer();
    this.remainingTimeMs = 20_000;
    this.setState((state) => ({
      ...state,
      timerMs: 20_000,
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
    this.remainingTimeMs = 31_500;
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
        this.remainingTimeMs = 20_000;
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
    this.remainingTimeMs = 20_000;
    this.setState((state) => ({
      ...state,
      timerMs: 20_000,
      isDiscussionPhase: false,
      isTimerRunning: false,
    }));
  }

  cancelTimer() {
    this.cancelCurrentTimer();
    this.remainingTimeMs = 20_000;
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
      if (this.isDoublePoint) points *= 2;
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
    const selectedCardIndex = this.state.selectedCardIndex;
    if (selectedCardIndex != null && this.state.cards[selectedCardIndex]?.isRevealed) {
      if (this.isOneMoreTurn) {
        this.isOneMoreTurn = false;
      } else {
        this.advanceTurn();
      }
    }

    this.setState((state) => ({
      ...state,
      showingPresentationScreen: false,
      selectedCardIndex: null,
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

  setShowEffectSheet(show) {
    this.setState((state) => ({ ...state, showEffectSheet: show }));
  }
}
