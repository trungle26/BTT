package com.trung.myapplication.game.ui

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.paint
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.R
import com.trung.myapplication.game.model.Team
import com.trung.myapplication.game.ui.theme.GameUiColors

@Composable
fun StandingsScreen(
    teams: List<Team>,
    isGameOver: Boolean,
    onClose: () -> Unit
) {
    val sortedTeams = remember(teams) {
        teams.sortedByDescending { it.score }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .paint(
                painter = painterResource(id = R.drawable.background),
                contentScale = ContentScale.FillBounds
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Text(
                text = if (isGameOver) "FINAL STANDINGS" else "CURRENT STANDINGS",
                fontSize = 48.sp,
                fontWeight = FontWeight.Black,
                color = GameUiColors.TitleGold,
                modifier = Modifier.padding(bottom = 32.dp)
            )

            // Standings List
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(0.8f)
                    .clip(RoundedCornerShape(24.dp))
                    .border(2.dp, GameUiColors.NeonCyan.copy(alpha = 0.5f), RoundedCornerShape(24.dp)),
                color = Color.Black.copy(alpha = 0.6f)
            ) {
                LazyColumn(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    itemsIndexed(sortedTeams) { index, team ->
                        StandingRow(index + 1, team)
                    }
                }
            }

            // Close Button
            if (!isGameOver) {
                Button(
                    onClick = onClose,
                    modifier = Modifier
                        .padding(top = 32.dp)
                        .height(64.dp)
                        .width(200.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = GameUiColors.BannerBar,
                        contentColor = GameUiColors.TextOnAccent
                    ),
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = null)
                        Text(text = "CLOSE", fontSize = 20.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
fun StandingRow(rank: Int, team: Team) {
    val neonColor = when (rank) {
        1 -> GameUiColors.TitleGold
        2 -> Color(0xFFC0C0C0) // Silver
        3 -> Color(0xFFCD7F32) // Bronze
        else -> GameUiColors.NeonCyan
    }

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .shadow(
                elevation = if (rank == 1) 12.dp else 4.dp,
                shape = RoundedCornerShape(16.dp),
                ambientColor = neonColor,
                spotColor = neonColor
            ),
        shape = RoundedCornerShape(16.dp),
        color = Color.Black.copy(alpha = 0.4f),
        border = androidx.compose.foundation.BorderStroke(
            if (rank == 1) 3.dp else 1.dp,
            neonColor.copy(alpha = 0.6f)
        )
    ) {
        Row(
            modifier = Modifier
                .padding(horizontal = 24.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Rank
                Text(
                    text = "#$rank",
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    color = neonColor
                )

                // Team Name
                Text(
                    text = team.name,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )

                if (rank == 1) {
                    Icon(
                        imageVector = Icons.Default.Star,
                        contentDescription = null,
                        tint = GameUiColors.TitleGold,
                        modifier = Modifier.size(28.dp)
                    )
                }
            }

            // Score
            Text(
                text = "${team.score} PTS",
                fontSize = 28.sp,
                fontWeight = FontWeight.Black,
                color = neonColor
            )
        }
    }
}
