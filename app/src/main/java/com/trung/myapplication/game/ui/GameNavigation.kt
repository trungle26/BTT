package com.trung.myapplication.game.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.trung.myapplication.game.vm.GameViewModel

@Composable
fun GameNavigation() {
    val vm: GameViewModel = viewModel()
    val state by vm.state.collectAsState()
    val selectedCardIndex = state.selectedCardIndex
    val cards = state.cards
    val context = LocalContext.current

    when {
        state.showingRules -> {
            RulesIntroductionScreen(
                onStartGame = { vm.closeRulesScreen() }
            )
        }
        state.showingStandings -> {
            StandingsScreen(
                teams = state.teams,
                isGameOver = state.gameOver,
                onClose = { vm.hideStandings() }
            )
        }
        state.showingPresentationScreen && selectedCardIndex != null && selectedCardIndex >= 0 && selectedCardIndex < cards.size -> {
            val activeIdx = state.stolenTurnTeamIndex ?: state.activeTeamIndex
            QuestionPresentationScreen(
                card = cards[selectedCardIndex],
                teams = state.teams,
                activeTeamIndex = activeIdx,
                timerMs = state.timerMs,
                selectedChoiceIndex = state.selectedChoiceIndex,
                answerTimedOut = state.answerTimedOut,
                isDiscussionPhase = state.isDiscussionPhase,
                onClose = { vm.closePresentationScreen() },
                onAddPoints = { delta: Int -> vm.addPointsManually(delta, activeIdx) },
                onSelectChoice = { vm.submitAnswer(it) },
                onStartTimer = { vm.startTimerManually(context.applicationContext) },
                onShiftTeam = { delta: Int -> vm.shiftActiveTeam(delta) },
                onMarkEffectUsed = { teamId: Int, effectId: String ->
                    vm.useEffectCard(
                        teamId,
                        effectId
                    )
                },
                onShowStandings = { vm.showStandings() },
                isRevealed = cards[selectedCardIndex].isRevealed
            )
        }
        else -> {
            GameScreen(
                teams = state.teams,
                cards = state.cards,
                activeTeamIndex = state.stolenTurnTeamIndex ?: state.activeTeamIndex,
                onCardClicked = { index -> vm.onCardClicked(index) },
                onMarkEffectUsed = { teamId: Int, effectId: String ->
                    vm.useEffectCard(teamId, effectId)
                },
                onAddPoints = { delta, teamId -> vm.addPointsManually(delta, teamId) },
                onShiftTeam = { delta -> vm.shiftActiveTeam(delta) },
                onShowStandings = { vm.showStandings() }
            )
        }
    }
}
