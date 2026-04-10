import { generateFallbackCards } from "./cardsGenerator.js";
import { createTeam, QuestionKind } from "./models.js";

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

export class GameViewModel {
  constructor(options = {}) {
    this.initialCards = options.initialCards ?? null;
    this.listeners = new Set();
    this.timerInterval = null;
    this.remainingTimeMs = 20_999;
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
      },
    };
  }

  restoreFromSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return false;

    const nextState = snapshot.state ?? snapshot;
    if (!nextState || !Array.isArray(nextState.cards) || !Array.isArray(nextState.teams)) return false;

    this.cancelCurrentTimer();
    this.remainingTimeMs = snapshot.runtime?.remainingTimeMs ?? nextState.timerMs ?? 20_999;

    const restoredState = {
      ...this.createInitialState(),
      ...nextState,
      turnsRemainingByTeam:
        Array.isArray(nextState.turnsRemainingByTeam) && nextState.turnsRemainingByTeam.length === nextState.teams.length
          ? [...nextState.turnsRemainingByTeam]
          : createTurnsRemaining(nextState.teams.length, nextState.roundsPerTeam ?? this.roundsPerTeam),
      turnOwnerTeamIndex: nextState.turnOwnerTeamIndex ?? null,
      timerMs: nextState.timerMs ?? null,
      supportVideoForcedClosed: Boolean(nextState.supportVideoForcedClosed),
      isTimerRunning: false,
      isDiscussionPhase: false,
    };

    this.setState(restoredState);
    return true;
  }

  createInitialState() {
    return {
      cards: [],
      teams: [],
      activeTeamIndex: 0,
      timerMs: null,
      roundsPerTeam: this.roundsPerTeam,
      gameOver: false,
      showingStandings: false,
      winner: null,
      showingPresentationScreen: false,
      selectedCardIndex: null,
      selectedChoiceIndex: null,
      answerTimedOut: false,
      supportVideoForcedClosed: false,
      showingRules: true,
      isRevealingAnswer: false,
      isDiscussionPhase: false,
      isTimerRunning: false,
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
    const teams = [];
    const teamNames = ["Giuse", "Don Bosco", "Đaminh Savio", "Gioan Tông đồ", "Mẹ Vô Nhiễm", "Phaolo Trở Lại", "Phanxico Assisi", "Anton Padua"];
    for (let i = 1; i <= 8; i += 1) {
      teams.push(createTeam(i - 1, teamNames[i - 1], [], 100));
    }

    this.cancelTimer();

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
      supportVideoForcedClosed: false,
      isRevealingAnswer: false,
    }));

    const card = this.state.cards[index];
    if (!card) return;

    if (card.type === "BOMB") {
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
      teams[state.activeTeamIndex].score += delta;
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
    this.remainingTimeMs = 30_999;
    let inDiscussionPhase = true;

    this.setState((state) => ({
      ...state,
      timerMs: this.remainingTimeMs,
      supportVideoForcedClosed: false,
      isDiscussionPhase: true,
      isTimerRunning: true,
    }));

    this.timerInterval = setInterval(() => {
      if (this.remainingTimeMs > 0) {
        this.setState((state) => ({
          ...state,
          timerMs: this.remainingTimeMs,
          supportVideoForcedClosed: false,
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
          supportVideoForcedClosed: false,
          isDiscussionPhase: false,
          isTimerRunning: true,
        }));
        return;
      }

      this.cancelCurrentTimer();
      this.setState((state) => ({
        ...state,
        timerMs: 0,
        supportVideoForcedClosed: false,
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
      supportVideoForcedClosed: false,
      isDiscussionPhase: false,
      isTimerRunning: false,
    }));
  }

  cancelTimer() {
    this.cancelCurrentTimer();
    this.remainingTimeMs = 20_999;
    this.setState((state) => ({
      ...state,
      supportVideoForcedClosed: false,
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
      supportVideoForcedClosed: false,
      isRevealingAnswer: false,
    }));
  }

  onAnswerTimeout() {
    const state = this.state;
    const selectedCardIndex = state.selectedCardIndex;
    if (selectedCardIndex == null) return;
    const card = state.cards[selectedCardIndex];
    if (!card || card.type !== "QUESTION") return;
    const didTimeoutWithoutChoice = state.selectedChoiceIndex == null;

    this.setState((current) => ({
      ...current,
      answerTimedOut: didTimeoutWithoutChoice,
      supportVideoForcedClosed: false,
      isRevealingAnswer: false,
      isTimerRunning: false,
      isDiscussionPhase: false,
    }));
    this.markRevealed(selectedCardIndex);
  }

  revealCorrectAnswer() {
    const state = this.state;
    const selectedCardIndex = state.selectedCardIndex;
    if (selectedCardIndex == null) return;
    const card = state.cards[selectedCardIndex];
    if (!card || card.type !== "QUESTION") return;

    this.cancelCurrentTimer();
    this.setState((current) => ({
      ...current,
      answerTimedOut: false,
      supportVideoForcedClosed: false,
      isRevealingAnswer: true,
      isTimerRunning: false,
      isDiscussionPhase: false,
      timerMs: current.timerMs ?? 0,
    }));
    this.markRevealed(selectedCardIndex);
  }

  forceTimeout() {
    const state = this.state;
    if (state.selectedCardIndex == null) return;
    const didTimeoutWithoutChoice = state.selectedChoiceIndex == null;
    this.cancelCurrentTimer();
    this.setState((current) => ({
      ...current,
      answerTimedOut: didTimeoutWithoutChoice,
      supportVideoForcedClosed: false,
      isRevealingAnswer: false,
      isTimerRunning: false,
      isDiscussionPhase: false,
      timerMs: 0,
    }));
    this.onAnswerTimeout();
  }

  closeGetHelpState() {
    this.cancelCurrentTimer();
    this.remainingTimeMs = 20_999;
    this.setState((state) => ({
      ...state,
      timerMs: 20_999,
      supportVideoForcedClosed: true,
      isDiscussionPhase: false,
      isTimerRunning: false,
    }));
  }

  closePresentationScreen() {
    this.cancelTimer();
    const shouldConsumeTurn =
      this.state.selectedCardIndex != null &&
      this.state.cards[this.state.selectedCardIndex]?.isRevealed;

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
        supportVideoForcedClosed: false,
        timerMs: null,
        isRevealingAnswer: false,
        isDiscussionPhase: false,
        isTimerRunning: false,
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
    }));
  }

  selectActiveTeam(teamId) {
    this.setState((state) => {
      if (teamId < 0 || teamId >= state.teams.length) return state;
      return {
        ...state,
        activeTeamIndex: teamId,
        turnOwnerTeamIndex: state.showingPresentationScreen ? teamId : state.turnOwnerTeamIndex,
      };
    });
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
      supportVideoForcedClosed: false,
      timerMs: null,
      isRevealingAnswer: false,
      isDiscussionPhase: false,
      isTimerRunning: false,
    }));
  }
}
