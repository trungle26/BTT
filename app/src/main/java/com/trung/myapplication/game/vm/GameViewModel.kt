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
    private var isPaused = false
    private var isDoublePoint = false
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
        _state.update {
            it.copy(activeEffect = effectCard)
        }

        when (effectCard.type) {
            EffectType.SEE_FUTURE -> {
            }
            EffectType.GET_HELP -> {
                pauseTimer()
            }
            EffectType.STEAL -> {
                _state.update {
                    it.copy(stolenTurnTeamIndex = teamId)
                }
                resetTimer()
                isDoublePoint = false
            }
            EffectType.NOPE -> {
            }
            EffectType.ASSIGN -> {
            }
            EffectType.DOUBLE_POINTS -> {
                isDoublePoint = true
            }
            EffectType.ADD_ONE_TURN -> {

            }
            EffectType.SKIP -> {
                // Skip turn
                advanceTurn()
            }
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
            timerMs = 0L,
            roundsPerTeam = roundsPerTeam
        )
    }

    fun onCardClicked(index: Int) {
        _state.update {
            it.copy(
                showingPresentationScreen = true,
                selectedCardIndex = index,
            )
        }

        when (_state.value.cards[index]) {
            is BombCard -> {
                // immediate -10
                applyScoreToActive(-10)
                advanceTurn()
            }

            is QuestionCard -> {
                startQuestionTimer()
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
            val idx = st.activeTeamIndex
            val t = teams[idx]
            teams[idx] = t.copy(score = t.score + delta)
            st.copy(teams = teams)
        }
    }

    private fun advanceTurn() {
        timerJob?.cancel()
        _state.update { st ->
            val next = (st.activeTeamIndex + 1) % st.teams.size
            // increment rounds implicitly via resolved cards; we just rotate turn
            st.copy(
                activeTeamIndex = next,
            )
        }
    }

    private fun startQuestionTimer() {
        timerJob?.cancel()
        isPaused = false

        timerJob = viewModelScope.launch {
            while (remainingTimeMs > 0) {
                if (!isPaused) {
                    // Update the state
                    _state.update { it.copy(timerMs = remainingTimeMs) }

                    // Decrement and wait
                    delay(200L)
                    remainingTimeMs -= 200L
                } else {
                    // When paused, we "yield" to keep the coroutine alive
                    // but inactive until isPaused becomes false
                    delay(500L)
                }
            }

            if (remainingTimeMs <= 0) {
                _state.update { it.copy(timerMs = 0) }
                onAnswerTimeout()
            }
        }
    }

    fun pauseTimer() {
        isPaused = true
    }

    fun resumeTimer() {
        isPaused = false
    }

    fun resetTimer() {
        timerJob?.cancel()
        remainingTimeMs = 20_000L
        startQuestionTimer()
    }

    fun submitAnswer(choiceIndex: Int) {
        val selectedCardIndex = _state.value.selectedCardIndex ?: return
        val currentCard = _state.value.cards[selectedCardIndex]
        if (currentCard !is QuestionCard) return

        timerJob?.cancel()
        val activeTeam = _state.value.teams[_state.value.activeTeamIndex]
        val doubleFlagIdx = activeTeam.effectCards.indexOfFirst { it.id.startsWith("__double_next_") }
        var points = if (choiceIndex == currentCard.correctChoiceIndex) 10 else -10
        if (doubleFlagIdx != -1) {
            points *= 2
            // Remove the double flag after use
            val teams = _state.value.teams.toMutableList()
            val t = teams[_state.value.activeTeamIndex]
            val hand = t.effectCards.toMutableList()
            hand.removeAt(doubleFlagIdx)
            teams[_state.value.activeTeamIndex] = t.copy(effectCards = hand)
            _state.update { it.copy(teams = teams) }
        }
        applyScoreToActive(points)
        markRevealed(selectedCardIndex)
        advanceTurn()
    }

    private fun onAnswerTimeout() {
        applyScoreToActive(-10)
        _state.value.selectedCardIndex?.let { markRevealed(it) }
        advanceTurn()
    }

    fun closePresentationScreen() {
        timerJob?.cancel()
        state.value.selectedCardIndex?.let{
            if(_state.value.cards[it] is BombCard){
                markRevealed(it)
            }
        }
        _state.update { it.copy(showingPresentationScreen = false, selectedCardIndex = null) }
        commitState()
    }

    fun addPointsManually(delta: Int, teamId: Int) {
        _state.update { st ->
            val teams = st.teams.toMutableList()
            val t = teams[teamId]
            teams[teamId] = t.copy(score = t.score + delta)
            st.copy(teams = teams)
        }
    }

    fun markEffectCardUsed(teamId: Int, effectId: String) {
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
