package com.trung.myapplication.game.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
// avoid lifecycle viewModel import to keep this MVP simple; instantiate ViewModel locally
import com.trung.myapplication.game.model.Card as GameCard
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.EffectInstance
import com.trung.myapplication.game.vm.GameViewModel
import com.trung.myapplication.game.vm.GamePhase

@Composable
fun GameScreen() {
    val vm = remember { GameViewModel() }
    val state by vm.state.collectAsState()

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(modifier = Modifier.fillMaxSize().padding(12.dp)) {
            // Teams row
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                state.teams.forEachIndexed { idx, team ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = team.name, style = MaterialTheme.typography.bodyLarge)
                        Text(text = "${team.score}", style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Board 6 rows x 8 columns (LazyVerticalGrid with 8 columns)
            Box(modifier = Modifier.weight(1f)) {
                LazyVerticalGrid(columns = GridCells.Fixed(8), modifier = Modifier.fillMaxSize()) {
                    itemsIndexed(state.board) { index, cardState ->
                        CardView(index = index, cardState.revealed, cardState.card, onClick = { vm.onCardClicked(index) })
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Active team and their effects
            val active = state.teams.getOrNull(state.activeTeamIndex)
            active?.let { team ->
                Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "Active: ${team.name}", modifier = Modifier.weight(1f))
                    Row {
                        team.hand.forEach { effect ->
                            Button(onClick = { vm.useEffect(effect.id) }, enabled = !effect.used, modifier = Modifier.padding(4.dp)) {
                                Text(text = effect.type.name, textAlign = TextAlign.Center)
                            }
                        }
                    }
                }
            }

            // Question dialog
            if (state.phase == GamePhase.SHOWING_QUESTION) {
                val sel = state.selectedIndex
                if (sel != null) {
                    val card = state.board[sel].card
                    if (card is QuestionCard) {
                        QuestionDialog(card = card, timeLeftMs = state.timerMs, onAnswer = { idx -> vm.submitAnswer(idx) })
                    }
                }
            }
        }
    }
}

@Composable
fun CardView(index: Int, revealed: Boolean, card: GameCard, onClick: () -> Unit) {
    Box(modifier = Modifier
        .padding(6.dp)
        .aspectRatio(3f / 4f)
        .clickable { onClick() }) {
        Card(modifier = Modifier.fillMaxSize()) {
            Box(modifier = Modifier.fillMaxSize().background(if (revealed) Color.White else Color.DarkGray), contentAlignment = Alignment.Center) {
                if (!revealed) Text(text = "Card", color = Color.White)
                else when (card) {
                    is QuestionCard -> Text(text = "Q", color = Color.Black)
                    is com.trung.myapplication.game.model.BombCard -> Text(text = "BOMB", color = Color.Red)
                    else -> Text(text = "?", color = Color.Black)
                }
            }
        }
    }
}

@Composable
fun QuestionDialog(card: QuestionCard, timeLeftMs: Long, onAnswer: (Int) -> Unit) {
    Surface(modifier = Modifier
        .fillMaxWidth()
        .padding(8.dp), color = Color(0xFFEEEEEE)) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(text = if (card.isChallenge) "Challenge" else "Question", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = card.text)
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = "Time left: ${timeLeftMs / 1000}s")
            Spacer(modifier = Modifier.height(8.dp))
            card.choices.forEachIndexed { idx, choice ->
                Button(onClick = { onAnswer(idx) }, modifier = Modifier.fillMaxWidth().padding(4.dp)) {
                    Text(text = choice)
                }
            }
        }
    }
}


