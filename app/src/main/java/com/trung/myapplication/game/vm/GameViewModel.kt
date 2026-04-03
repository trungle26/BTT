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

    // --- Undo/NOPE support ---
    private val stateStack = mutableListOf<GameState>()
    private var timerJob: Job? = null
    private var timerPaused = false
    private val roundsPerTeam = 6 // each team plays 6 turns by default (8*6 = 48)

    init {
        startNewGame()
    }

    private fun pushStateForUndo() {
        // Deep copy all mutable lists
        val snapshot = _state.value.copy(
            teams = _state.value.teams.map { team ->
                team.copy(hand = team.hand.map { it.copy() }.toMutableList())
            },
            cards = _state.value.cards.map { card ->
                when (card) {
                    is QuestionCard -> card.copy()
                    is BombCard -> card.copy()
                    else -> card
                }
            }
        )
        stateStack.add(snapshot)
    }

    fun playNope(nopeTeamId: Int, nopeEffectId: String) {
        // Mark NOPE as used for the team
        _state.update { st ->
            val teams = st.teams.toMutableList()
            val team = teams[nopeTeamId]
            val hand = team.hand.toMutableList()
            val idx = hand.indexOfFirst { it.id == nopeEffectId }
            if (idx != -1) {
                hand[idx] = hand[idx].copy(used = true)
                teams[nopeTeamId] = team.copy(hand = hand)
            }
            st.copy(teams = teams)
        }
        // Revert to previous state
        if (stateStack.isNotEmpty()) {
            _state.value = stateStack.removeAt(stateStack.lastIndex)
        }
    }

    fun commitState() {
        stateStack.clear()
    }

    // --- Effect Card Handling ---
    fun useEffectCard(teamId: Int, effectId: String, targetTeamId: Int? = null) {
        val st = _state.value
        val team = st.teams[teamId]
        val idx = team.hand.indexOfFirst { it.id == effectId }
        if (idx == -1) return
        val inst = team.hand[idx]
        if (inst.used) return
        markEffectCardUsed(teamId, effectId)

        when (inst.type) {
            EffectType.SEE_FUTURE -> {
                // Only mark as used
            }
            EffectType.GET_HELP -> {
                // Mark as used and pause timer
                markEffectCardUsed(teamId, effectId)
                pushStateForUndo()
                timerPaused = true
                timerJob?.cancel()
            }
            EffectType.STEAL -> {
                markEffectCardUsed(teamId, effectId)
                // Take over: mark as used, push state, change active team
                pushStateForUndo()
                if (targetTeamId != null) {
                    assignQuestionTo(teamId)
                }
            }
            EffectType.NOPE -> {
                // NOPE handled via playNope()
            }
            EffectType.ASSIGN -> {
                markEffectCardUsed(teamId, effectId)
                // Attack: assign question to another team
                pushStateForUndo()
                if (targetTeamId != null) {
                    assignQuestionTo(targetTeamId)
                }
            }
            EffectType.DOUBLE_POINTS -> {
                // Double points for next answer
                pushStateForUndo()
                markEffectCardUsed(teamId, effectId)
                // Add a transient flag to team
                val teams = st.teams.toMutableList()
                val t = teams[teamId]
                teams[teamId] = t.copy(hand = t.hand + EffectInstance(id = "__double_next_${teamId}", type = EffectType.DOUBLE_POINTS, used = true))
                _state.update { it.copy(teams = teams) }
            }
            EffectType.ADD_ONE_TURN -> {
                // Add one more turn for this team
                pushStateForUndo()
                markEffectCardUsed(teamId, effectId)
                // You can implement logic to add a turn marker if needed
            }
            EffectType.SKIP -> {
                // Skip turn
                pushStateForUndo()
                markEffectCardUsed(teamId, effectId)
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
            Team(id = id - 1, name = "Team ${id}", hand = hand, score = 0)
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
        timerJob = viewModelScope.launch {
            val duration = 20_000L
            val start = System.currentTimeMillis()
            while (true) {
                val elapsed = System.currentTimeMillis() - start
                val remaining = (duration - elapsed).coerceAtLeast(0L)
                _state.update { it.copy(timerMs = remaining) }
                if (remaining <= 0L) {
                    onAnswerTimeout()
                    break
                }
                delay(200L)
            }
        }
    }

    // In submitAnswer, push state for undo and handle double points
    fun submitAnswer(choiceIndex: Int) {
        pushStateForUndo()
        val selectedCardIndex = _state.value.selectedCardIndex ?: return
        val currentCard = _state.value.cards[selectedCardIndex]
        if (currentCard !is QuestionCard) return

        timerJob?.cancel()
        val activeTeam = _state.value.teams[_state.value.activeTeamIndex]
        val doubleFlagIdx = activeTeam.hand.indexOfFirst { it.id.startsWith("__double_next_") }
        var points = if (choiceIndex == currentCard.correctChoiceIndex) 10 else -10
        if (doubleFlagIdx != -1 && points > 0) {
            points *= 2
            // Remove the double flag after use
            val teams = _state.value.teams.toMutableList()
            val t = teams[_state.value.activeTeamIndex]
            val hand = t.hand.toMutableList()
            hand.removeAt(doubleFlagIdx)
            teams[_state.value.activeTeamIndex] = t.copy(hand = hand)
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

    // Use effect: called when active team taps an effect button
    fun useEffect(effectId: String) {
        val s = _state.value
        val team = s.teams[s.activeTeamIndex]
        val idx = team.hand.indexOfFirst { it.id == effectId }
        if (idx == -1) return
        val inst = team.hand[idx]
        if (inst.used) return

        // mark used
        team.hand[idx] = inst.copy(used = true)

        when (inst.type) {
            EffectType.SEE_FUTURE -> {
                // will be handled in real world, only need to mark used
            }

            EffectType.SKIP -> {
                advanceTurn()
            }

            EffectType.ASSIGN -> {
                // handled when question showing: UI must call assignTo(teamId)
            }

            EffectType.STEAL -> {
                // handled when question showing: UI must call stealByActive()
            }

            EffectType.DOUBLE_POINTS -> {
                // set a simple marker on team by temporarily adding a special EffectInstance in team (we'll implement as negative id)
                // For simplicity: we will multiply next correct answer by 2 by checking this flag in submitAnswer
                // Here we add a transient flag via team.hand with id "__double_next"
                team.hand += EffectInstance(
                    id = "__double_next_${team.id}",
                    type = EffectType.DOUBLE_POINTS,
                    used = true
                )
            }

            EffectType.ADD_ONE_TURN -> {

            }

            EffectType.NOPE -> {
                // NOPE logic to be applied manually by other players when appropriate; here we'll just mark used
            }

            EffectType.GET_HELP -> {
                // tracked as used; real help is external
            }
        }

        // update teams in state
        _state.update { st ->
            val tms = st.teams.toMutableList()
            tms[st.activeTeamIndex] = team
            st.copy(teams = tms)
        }
    }

    fun assignQuestionTo(teamId: Int) {
        val s = _state.value
        val sel = s.selectedCardIndex ?: return

        // we will change activeTeamIndex to target, and wait for them to answer
        _state.update { it.copy(activeTeamIndex = teamId) }
        // question stays showing; timer continues
    }

    fun stealByActive() {
        // steal means current active already is stealer; if there is a question and selectedIndex exists,
        // we allow the active team to answer (this is already the case). This method may be used when a team plays steal while not active.
        // For simplicity, we'll no-op here because our UI uses activeTeamIndex to control who answers.
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
            val hand = team.hand.toMutableList()
            val idx = hand.indexOfFirst { it.id == effectId }
            if (idx != -1) {
                hand[idx] = hand[idx].copy(used = true)
                teams[teamId] = team.copy(hand = hand)
            }
            st.copy(teams = teams)
        }
    }
}
