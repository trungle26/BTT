package com.trung.myapplication.game.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.Team
import com.trung.myapplication.game.ui.section.AllTeamsEffectCardSection
import com.trung.myapplication.game.ui.section.BombSection
import com.trung.myapplication.game.ui.section.QuestionSection
import com.trung.myapplication.game.ui.section.TeamScoreSection

@Composable
fun QuestionPresentationScreen(
    card: Card,
    isAnswered: Boolean,
    teams: List<Team>,
    activeTeamIndex: Int,
    timerMs: Long?,
    onClose: () -> Unit,
    onAddPoints: (delta: Int) -> Unit,
    onSelectChoice: (Int) -> Unit,
    onMarkEffectUsed: (teamId: Int, effectId: String) -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF0A0E27)  // Deep dark blue background
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // Header with back button and timer
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
                    .padding(bottom = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(
                    onClick = onClose,
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Quay lại",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }

                Column(
                    modifier = Modifier
                        .weight(1f  )
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

                // Timer display (right side)
                timerMs?.let {
                    Box(
                        contentAlignment = Alignment.Center
                    ) {
                        val seconds = (timerMs / 1000).toInt()
                        Text(
                            text = "${seconds}s",
                            fontSize = 36.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (seconds <= 5) Color.Red else Color(0xFF00D4FF),
                            modifier = Modifier
                                .border(
                                    2.dp,
                                    if (seconds <= 5) Color.Red else Color(0xFF00D4FF),
                                    RoundedCornerShape(12.dp)
                                )
                                .padding(horizontal = 12.dp, vertical = 4.dp)
                        )
                    }
                }
            }

            // Main content area
            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(start = 24.dp, end = 12.dp, bottom = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Question or Bomb Display
                when (card) {
                    is QuestionCard -> {
                        QuestionSection(
                            card = card,
                            isAnswered = isAnswered,
                            onSelectChoice = onSelectChoice
                        )
                        Spacer(modifier = Modifier.height(24.dp))

                        // All Teams Effect Cards Display
                        AllTeamsEffectCardSection(
                            teams = teams,
                            activeTeamIndex = activeTeamIndex,
                            onMarkEffectUsed = onMarkEffectUsed,
                            modifier = Modifier.weight(1f)
                        )
                    }

                    else -> {
                        BombSection()
                    }
                }
            }
        }
    }
}
