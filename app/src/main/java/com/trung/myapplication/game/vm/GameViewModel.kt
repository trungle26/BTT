package com.trung.myapplication.game.vm

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.trung.myapplication.game.data.CardsGenerator
import com.trung.myapplication.game.model.*
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.random.Random

class GameViewModel : ViewModel() {
    private val _state = MutableStateFlow(GameState())
    val state: StateFlow<GameState> = _state.asStateFlow()

    private var timerJob: Job? = null
    private var remainingTimeMs = 20_000L // Track state outside the job
    private var isDoublePoint = false
    private var isOneMoreTurn = false
    private val roundsPerTeam = 6 // each team plays 6 turns by default (8*6 = 48)

    init {
        startNewGame()
    }

    // --- Effect Card Handling ---
    fun useEffectCard(teamId: Int, effectId: String) {
        val user = _state.value.teams[teamId]
        val idx = user.effectCards.indexOfFirst { it.id == effectId }
        if (idx == -1) return
        val effectCard = user.effectCards[idx]
        if (effectCard.used) return
        markEffectCardUsed(teamId, effectId)

        if (effectCard.type != EffectType.NOPE){
            _state.update {
                it.copy(activeEffect = effectCard)
            }
        }

        when (effectCard.type) {
            EffectType.SEE_FUTURE -> {}

            EffectType.GET_HELP -> {
                timerJob?.cancel()
            }

            EffectType.STEAL -> {
                _state.update {
                    it.copy(stolenTurnTeamIndex = teamId)
                }
                resetTimer()
                isDoublePoint = false
            }

            EffectType.NOPE -> {
                handleNope()
            }

            EffectType.ASSIGN -> {}

            EffectType.DOUBLE_POINTS -> {
                isDoublePoint = true
            }

            EffectType.ADD_ONE_TURN -> {
                isOneMoreTurn = true
            }

            EffectType.SKIP -> {
                // Skip turn
                advanceTurn()
            }
        }
    }

    private fun handleNope() {
        when (_state.value.activeEffect?.type) {
            EffectType.SEE_FUTURE -> {}
            EffectType.GET_HELP -> {
                resetTimer()
            }

            EffectType.STEAL -> {
                _state.update { it.copy(stolenTurnTeamIndex = null) }
                resetTimer()
            }

            EffectType.ADD_ONE_TURN -> {
                isOneMoreTurn = false
            }

            EffectType.DOUBLE_POINTS -> {
                isDoublePoint = false
            }

            EffectType.SKIP -> {
                resetTimer()
                if (!isOneMoreTurn) {
                    _state.update { st ->
                        val next = (st.activeTeamIndex - 1) % st.teams.size
                        st.copy(
                            activeTeamIndex = next,
                        )
                    }
                }
            }

            else -> {}
        }
    }

    // --- Game Logic ---
    fun startNewGame(seed: Long? = null) {
        val cards = CardsGenerator.generate(seed)

        // create 8 teams and give each 8 effect cards (pool where each effect type duplicated 8 times)
        val pool = mutableListOf<EffectType>()
        EffectType.entries.forEach { t -> repeat(8) { pool += t } }
        val rnd = seed?.let { Random(it) } ?: Random.Default

        val teams = (1..8).map { id ->
            val hand = mutableListOf<EffectInstance>()
            repeat(3) {
                val pick = pool.removeAt(rnd.nextInt(pool.size))
                hand += EffectInstance(id = "${id}_$it", type = pick)
            }
            Team(id = id - 1, name = "Team ${id}", effectCards = hand, score = 0)
        }

        _state.value = GameState(
            cards = cards,
            teams = teams,
            activeTeamIndex = 0,
            selectedCardIndex = null,
            roundsPerTeam = roundsPerTeam
        )
    }

    fun onCardClicked(index: Int) {
        _state.update {
            it.copy(
                showingPresentationScreen = true,
                selectedCardIndex = index,
                selectedChoiceIndex = null,
            )
        }

        when (_state.value.cards[index]) {
            is BombCard -> {
                // immediate -10
                applyScoreToActive(-20)
                markRevealed(index)
            }

            is QuestionCard -> {
                val question = _state.value.cards[index] as QuestionCard
                if (question.kind == QuestionKind.MULTIPLE_CHOICE || question.kind == QuestionKind.ESSAY) {
                    startQuestionTimer()
                } else {
                    timerJob?.cancel()
                    _state.update { st -> st.copy(timerMs = null) }
                }
            }
        }
    }

    private fun markRevealed(index: Int) {
        _state.update {
            it.copy(
                cards = it.cards.mapIndexed { i, c ->
                    if (i == index) {
                        when (c) {
                            is QuestionCard -> c.copy(isRevealed = true)
                            is BombCard -> c.copy(isRevealed = true)
                        }
                    } else {
                        c
                    }
                }
            )
        }
    }

    private fun applyScoreToActive(delta: Int) {
        _state.update { st ->
            val teams = st.teams.toMutableList()
            val idx = st.stolenTurnTeamIndex ?: st.activeTeamIndex
            val t = teams[idx]
            teams[idx] = t.copy(score = t.score + delta)
            st.copy(teams = teams)
        }
    }

    private fun advanceTurn() {
        cancelTimer()
        if (!isOneMoreTurn) {
            _state.update { st ->
                val next = (st.activeTeamIndex + 1) % st.teams.size
                st.copy(
                    activeTeamIndex = next,
                )
            }
        }
    }

    private fun startQuestionTimer() {
        timerJob?.cancel()

        timerJob = viewModelScope.launch {
            while (remainingTimeMs > 0) {
                _state.update { it.copy(timerMs = remainingTimeMs) }

                // Decrement and wait
                delay(200L)
                remainingTimeMs -= 200L
            }

            if (remainingTimeMs <= 0) {
                _state.update { it.copy(timerMs = 0) }
                onAnswerTimeout()
            }
        }
    }

    fun resetTimer() {
        timerJob?.cancel()
        remainingTimeMs = 20_000L
        startQuestionTimer()
    }

    fun cancelTimer(){
        timerJob?.cancel()
        remainingTimeMs = 20_000L
    }

    fun submitAnswer(choiceIndex: Int) {
        val selectedCardIndex = _state.value.selectedCardIndex ?: return
        val currentCard = _state.value.cards[selectedCardIndex]
        if (currentCard !is QuestionCard) return

        timerJob?.cancel()
        val didTimeout = choiceIndex < 0
        val selectedChoice = if (choiceIndex >= 0) choiceIndex else null
        if (currentCard.kind == QuestionKind.MULTIPLE_CHOICE) {
            var points = if (choiceIndex == currentCard.correctChoiceIndex) 10 else -5
            if (isDoublePoint) points *= 2
            applyScoreToActive(points)
        }
        _state.update { st ->
            st.copy(
                selectedChoiceIndex = selectedChoice,
                answerTimedOut = didTimeout
            )
        }
        markRevealed(selectedCardIndex)
    }

    private fun onAnswerTimeout() {
        val selectedCardIndex = _state.value.selectedCardIndex ?: return
        val currentCard = _state.value.cards.getOrNull(selectedCardIndex)
        if (currentCard is QuestionCard && currentCard.kind == QuestionKind.ESSAY) {
            timerJob?.cancel()
            markRevealed(selectedCardIndex)
            return
        }
        submitAnswer(-1)
    }

    fun closePresentationScreen() {
        cancelTimer()
        _state.value.selectedCardIndex?.let {
            if (_state.value.cards[it].isRevealed) {
                if (isOneMoreTurn) {
                    isOneMoreTurn = false
                } else {
                    advanceTurn()
                }
            }
        }
        _state.update {
            it.copy(
                showingPresentationScreen = false,
                selectedCardIndex = null,
                selectedChoiceIndex = null,
                answerTimedOut = false,
                stolenTurnTeamIndex = null,
                timerMs = null,
            )
        }
    }

    fun addPointsManually(delta: Int, teamId: Int) {
        _state.update { st ->
            val teams = st.teams.toMutableList()
            val t = teams[teamId]
            teams[teamId] = t.copy(score = t.score + delta)
            st.copy(teams = teams)
        }
    }

    fun shiftActiveTeam(delta: Int) {
        _state.update { st ->
            if (st.teams.isEmpty()) return@update st
            val n = st.teams.size
            val next = ((st.activeTeamIndex + delta) % n + n) % n
            st.copy(activeTeamIndex = next, stolenTurnTeamIndex = null)
        }
    }

    fun closeRulesScreen() {
        _state.update {
            it.copy(showingRules = false)
        }
    }

    private fun markEffectCardUsed(teamId: Int, effectId: String) {
        _state.update { st ->
            val teams = st.teams.toMutableList()
            val team = teams[teamId]
            val hand = team.effectCards.toMutableList()
            val idx = hand.indexOfFirst { it.id == effectId }
            if (idx != -1) {
                hand[idx] = hand[idx].copy(used = true)
                teams[teamId] = team.copy(effectCards = hand)
            }
            st.copy(teams = teams)
        }
    }
}
