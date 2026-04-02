package com.trung.myapplication.game.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.Team
import com.trung.myapplication.game.ui.component.CardView

@Composable
fun GameScreen(
    teams: List<Team>,
    cards: List<Card>,
    activeTeamIndex: Int,
    onCardClicked: (Int) -> Unit,
) {
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
                        text = "TEAM STANDINGS",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF00D4FF),
                        modifier = Modifier.padding(bottom = 12.dp)
                    )

                    // Teams row with scores
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        teams.forEach { team ->
                            TeamScoreCard(
                                team = team,
                                isActive = team.id == activeTeamIndex,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Board Title
            Text(
                text = "CARD BOARD",
                fontSize = 18.sp,
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
                            onClick = { onCardClicked(index) },
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Active Team Footer
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                shape = RoundedCornerShape(12.dp),
                color = Color(0xFF4CAF50),
                shadowElevation = 4.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "🎮 ACTIVE TEAM:",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black
                    )

                    Text(
                        text = teams[activeTeamIndex].name.uppercase(),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.Black,
                        modifier = Modifier.weight(1f),
                        textAlign = TextAlign.End
                    )
                }
            }
        }
    }
}

@Composable
fun TeamScoreCard(
    team: Team,
    isActive: Boolean,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .height(80.dp),
        shape = RoundedCornerShape(10.dp),
        color = if (isActive) Color(0xFF00D4FF) else Color(0xFF2A2F4F),
        shadowElevation = if (isActive) 8.dp else 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = team.name,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = if (isActive) Color.Black else Color.White
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${team.score}",
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (isActive) Color.Black else Color(0xFF00D4FF)
            )
        }
    }
}



