package com.trung.myapplication.game.vm

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.trung.myapplication.game.data.CardsGenerator
import com.trung.myapplication.game.model.BombCard
import com.trung.myapplication.game.model.EffectInstance
import com.trung.myapplication.game.model.EffectType
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.QuestionKind
import com.trung.myapplication.game.model.Team
import com.trung.myapplication.game.ui.util.SfxPlayer
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

        if (effectCard.type == EffectType.NOPE) {
            resetTimer()
            val currentEffect = _state.value.activeEffect
            if (currentEffect != null) {
                val wasNegated = _state.value.isEffectNegated
                val nowNegated = !wasNegated
                _state.update { it.copy(isEffectNegated = nowNegated) }

                if (nowNegated) {
                    negateActiveEffect(currentEffect)
                } else {
                    restoreActiveEffect(currentEffect)
                }
            }
        } else {
            // New effect card being played - clear any previous nope chain
            _state.update {
                it.copy(
                    activeEffect = effectCard,
                    isEffectNegated = false
                )
            }
            applyEffect(effectCard, teamId)
        }
    }

    private fun applyEffect(effect: EffectInstance, teamId: Int) {
        when (effect.type) {
            EffectType.SEE_FUTURE -> {}

            EffectType.GET_HELP -> {
                startGetHelpTimer()
            }

            EffectType.STEAL -> {
                _state.update {
                    it.copy(stolenTurnTeamIndex = teamId)
                }
                resetTimer()
                isDoublePoint = false
            }

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

            else -> {}
        }
    }

    private fun negateActiveEffect(effect: EffectInstance) {
        when (effect.type) {
            EffectType.SEE_FUTURE -> {}

            EffectType.GET_HELP -> {
                _state.update { it.copy(isDiscussionPhase = false) }
                resetTimer()
            }

            EffectType.STEAL -> {
                _state.update { it.copy(stolenTurnTeamIndex = null) }
            }

            EffectType.DOUBLE_POINTS -> {
                isDoublePoint = false
            }

            EffectType.ADD_ONE_TURN -> {
                isOneMoreTurn = false
            }

            EffectType.SKIP -> {
                resetTimer()
                // Undo the turn advancement
                _state.update { st ->
                    val n = st.teams.size
                    val prev = (st.activeTeamIndex - 1 + n) % n
                    st.copy(activeTeamIndex = prev)
                }
            }

            else -> {}
        }
    }

    private fun restoreActiveEffect(effect: EffectInstance) {
        // Find the team that played the effect (the active effect was played by someone)
        // Since we don't store the player ID in activeEffect, let's assume it was the 
        // person who triggered it originally.
        // For some effects, we need to know who played it (like STEAL).
        // Let's modify useEffectCard slightly to store the effect's player index.

        // For now, let's just re-apply the effect.
        // Note: For STEAL, it's tricky because we don't know who "stole" it without extra state.
        // I'll skip re-applying STEAL accurately unless I add stolenTurnTeamIndex back.
        // Actually, stolenTurnTeamIndex is the team that stole the turn.

        when (effect.type) {
            EffectType.SEE_FUTURE -> {}

            EffectType.GET_HELP -> {
                startGetHelpTimer()
            }

            EffectType.STEAL -> {
                // To restore STEAL, we need to know which team stole it.
                // For now, let's assume the effect's ID prefix contains the team ID.
                val originalTeamId =
                    effect.id.split("_").firstOrNull()?.toIntOrNull()?.let { it - 1 }
                if (originalTeamId != null) {
                    _state.update {
                        it.copy(stolenTurnTeamIndex = originalTeamId)
                    }
                    resetTimer()
                    isDoublePoint = false
                }
            }

            EffectType.DOUBLE_POINTS -> {
                isDoublePoint = true
            }

            EffectType.ADD_ONE_TURN -> {
                isOneMoreTurn = true
            }

            EffectType.SKIP -> {
                resetTimer()
                advanceTurn()
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
            roundsPerTeam = 5
        )
    }

    fun onCardClicked(index: Int) {
        val st = _state.value
        val revealedCount = st.cards.count { it.isRevealed }
        val remainingTurns = 40 - revealedCount

        val hiddenChallenges = st.cards.filterIndexed { i, c ->
            i != index && !c.isRevealed && c is QuestionCard && c.kind == QuestionKind.REAL_WORLD_CHALLENGE
        }

        // If remaining turns are less than or equal to hidden challenges, 
        // the current card must be a challenge if it isn't one already.
        if (remainingTurns <= hiddenChallenges.size + (if (st.cards[index] is QuestionCard && (st.cards[index] as QuestionCard).kind == QuestionKind.REAL_WORLD_CHALLENGE) 1 else 0)) {
            val currentCard = st.cards[index]
            if (!(currentCard is QuestionCard && currentCard.kind == QuestionKind.REAL_WORLD_CHALLENGE)) {
                // Swap this card with a hidden challenge
                val challengeIndex =
                    st.cards.indexOfFirst { !it.isRevealed && it is QuestionCard && it.kind == QuestionKind.REAL_WORLD_CHALLENGE }
                if (challengeIndex != -1) {
                    _state.update { s ->
                        val newCards = s.cards.toMutableList()
                        val temp = newCards[index]
                        newCards[index] = newCards[challengeIndex]
                        newCards[challengeIndex] = temp
                        s.copy(cards = newCards)
                    }
                }
            }
        }

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
                    // Do not start timer automatically, wait for manual click
                    _state.update { st -> st.copy(timerMs = 20_000L) }
                } else {
                    timerJob?.cancel()
                    markRevealed(index)
                }
            }
        }
    }

    private fun markRevealed(index: Int) {
        _state.update { st ->
            val newCards = st.cards.mapIndexed { i, c ->
                if (i == index) {
                    when (c) {
                        is QuestionCard -> c.copy(isRevealed = true)
                        is BombCard -> c.copy(isRevealed = true)
                    }
                } else {
                    c
                }
            }

            val revealedCount = newCards.count { it.isRevealed }
            val isGameOver = revealedCount >= 40

            st.copy(
                cards = newCards,
                gameOver = isGameOver,
                showingStandings = isGameOver
            )
        }
    }

    fun showStandings() {
        _state.update { it.copy(showingStandings = true) }
    }

    fun hideStandings() {
        _state.update { it.copy(showingStandings = false) }
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

    private fun startQuestionTimer(context: Context) {
        timerJob?.cancel()
        SfxPlayer.stopTimeoutTicking()
        remainingTimeMs = 20_000L

        timerJob = viewModelScope.launch {
            SfxPlayer.startTimeoutTicking(context = context)
            while (remainingTimeMs > 0) {
                _state.update { it.copy(timerMs = remainingTimeMs) }

                // Decrement and wait
                delay(200L)
                remainingTimeMs -= 200L
            }

            _state.update { it.copy(timerMs = 0) }
            onAnswerTimeout()
        }
    }

    fun startTimerManually(context: Context) {
        if (timerJob?.isActive == true) return
        startQuestionTimer(context)
    }

    fun resetTimer() {
        SfxPlayer.stopTimeoutTicking()
        timerJob?.cancel()
        remainingTimeMs = 20_000L
        _state.update { it.copy(isDiscussionPhase = false) }
    }

    private fun startGetHelpTimer() {
        SfxPlayer.stopTimeoutTicking()
        timerJob?.cancel()
        remainingTimeMs = 30_999L
        _state.update { it.copy(isDiscussionPhase = true) }

        timerJob = viewModelScope.launch {
            // Discussion phase (30s)
            while (remainingTimeMs > 0) {
                _state.update { it.copy(timerMs = remainingTimeMs) }
                delay(200L)
                remainingTimeMs -= 200L
            }

            // Countdown phase (20s)
            remainingTimeMs = 20_000L
            _state.update { it.copy(isDiscussionPhase = false) }
            while (remainingTimeMs > 0) {
                _state.update { it.copy(timerMs = remainingTimeMs) }
                delay(200L)
                remainingTimeMs -= 200L
            }

            _state.update { it.copy(timerMs = 0) }
            onAnswerTimeout()
        }
    }

    fun cancelTimer() {
        SfxPlayer.stopTimeoutTicking()
        timerJob?.cancel()
        remainingTimeMs = 20_000L
    }

    fun submitAnswer(choiceIndex: Int) {
        val st = _state.value
        if (st.selectedChoiceIndex != null) return // Already submitted

        val selectedCardIndex = st.selectedCardIndex ?: return
        val currentCard = st.cards[selectedCardIndex]
        if (currentCard !is QuestionCard) return

        val selectedChoice = if (choiceIndex >= 0) choiceIndex else null

        _state.update { s ->
            s.copy(
                selectedChoiceIndex = selectedChoice,
                answerTimedOut = choiceIndex < 0
            )
        }
    }

    private fun onAnswerTimeout() {
        val st = _state.value
        val selectedCardIndex = st.selectedCardIndex ?: return
        val currentCard = st.cards.getOrNull(selectedCardIndex) as? QuestionCard ?: return

        // Calculate points and reveal
        val choiceIndex = st.selectedChoiceIndex ?: -1
        val didTimeout = choiceIndex < 0
        
        if (currentCard.kind == QuestionKind.MULTIPLE_CHOICE) {
            var points = if (choiceIndex == currentCard.correctChoiceIndex) 10 else -5
            if (isDoublePoint) points *= 2
            applyScoreToActive(points)
        }

        _state.update { s ->
            s.copy(
                answerTimedOut = didTimeout,
                isRevealingAnswer = false,
            )
        }
        markRevealed(selectedCardIndex)
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
                isRevealingAnswer = false,
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
