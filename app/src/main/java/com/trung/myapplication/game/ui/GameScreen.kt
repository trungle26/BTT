package com.trung.myapplication.game.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.clickable
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.game.model.BombCard
import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.EffectInstance
import com.trung.myapplication.game.model.EffectType
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.Team
import com.trung.myapplication.game.ui.component.CardView
import com.trung.myapplication.game.ui.section.AllTeamsEffectCardSection
import com.trung.myapplication.game.ui.section.TeamScoreCard
import com.trung.myapplication.game.ui.section.TeamScoreSection

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameScreen(
    teams: List<Team>,
    cards: List<Card>,
    activeTeamIndex: Int,
    onCardClicked: (Int) -> Unit,
    onMarkEffectUsed: (teamId: Int, effectId: String) -> Unit = { _, _ -> },
) {
    val showEffectCardsScreen = remember { mutableStateOf(false) }

    if (showEffectCardsScreen.value) {
        // Full-screen effect cards view
        EffectCardsFullScreen(
            teams = teams,
            activeTeamIndex = activeTeamIndex,
            onMarkEffectUsed = onMarkEffectUsed,
            onClose = { showEffectCardsScreen.value = false }
        )
    } else {
        // Main game screen
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = Color(0xFF0A0E27)  // Deep dark blue background
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                // Header Section
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF1A1F3A),
                    shadowElevation = 4.dp
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp)
                    ) {
                        Text(
                            text = "ĐIỂM SỐ",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color(0xFF00D4FF),
                            modifier = Modifier.padding(bottom = 12.dp)
                        )

                        // Teams row with scores
                        TeamScoreSection(modifier = Modifier.fillMaxWidth(),teams, activeTeamIndex)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Board Title
                Text(
                    text = "CARD BOARD",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF00D4FF),
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                )

                // Board 6 rows x 8 columns
                Surface(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxWidth()
                        .padding(8.dp),
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF1A1F3A),
                    shadowElevation = 4.dp
                ) {
                    LazyVerticalGrid(
                        columns = GridCells.Fixed(8),
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(8.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        itemsIndexed(cards) { index, card ->
                            CardView(
                                card = card,
                                index = index,
                                onClick = { onCardClicked(index) },
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Full-width View Effect Cards Button
                Surface(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 8.dp)
                        .clickable { showEffectCardsScreen.value = true },
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xFF00D4FF),
                    shadowElevation = 4.dp
                ) {
                    Text(
                        text = "📋 VIEW EFFECT CARDS",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}

@Composable
private fun EffectCardsFullScreen(
    teams: List<Team>,
    activeTeamIndex: Int,
    onMarkEffectUsed: (teamId: Int, effectId: String) -> Unit,
    onClose: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0A0E27)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(20.dp)
        ) {
            // Header with back button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                IconButton(
                    onClick = onClose,
                    modifier = Modifier.align(Alignment.CenterVertically)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White,
                        modifier = Modifier
                            .height(48.dp)
                            .fillMaxWidth()
                    )
                }

                Text(
                    text = "TEAM EFFECT CARDS",
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF00D4FF),
                    modifier = Modifier.weight(1f)
                )
            }

            // Effect Cards Section (full width)
            AllTeamsEffectCardSection(
                teams = teams,
                activeTeamIndex = activeTeamIndex,
                onMarkEffectUsed = onMarkEffectUsed,
                cardWidthDp = 256,
                cardHeightDp = 352,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            )
        }
    }
}

@Preview(device = "spec:width=1920dp,height=1080dp,orientation=landscape", showSystemUi = true)
@Composable
fun GameScreenPreview() {
    val sampleTeams = (1..8).map { 
        Team(
            id = it, 
            name = "Team $it", 
            score = 100 + it * 10,
            effectCards = mutableListOf(
                EffectInstance("e1", EffectType.SEE_FUTURE),
                EffectInstance("e2", EffectType.ADD_ONE_TURN, used = true),
                EffectInstance("e3", EffectType.SKIP)
            )
        ) 
    }
    
    val sampleCards = (0..47).map { i ->
        when {
            i % 10 == 0 -> BombCard(id = "bomb_$i", isRevealed = i < 5)
            i % 5 == 0 -> QuestionCard(
                id = "q_$i", 
                text = "Question $i", 
                choices = listOf("A", "B", "C", "D"), 
                correctChoiceIndex = 0, 
                isRevealed = false
            )
            else -> QuestionCard(
                id = "q_$i", 
                text = "Question $i", 
                choices = listOf("A", "B", "C", "D"), 
                correctChoiceIndex = 0, 
                isRevealed = i < 15
            )
        }
    }

    GameScreen(
        teams = sampleTeams,
        cards = sampleCards,
        activeTeamIndex = 0,
        onCardClicked = {},
        onMarkEffectUsed = { _, _ -> }
    )
}
