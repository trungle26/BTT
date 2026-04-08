package com.trung.myapplication.game.ui

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.paint
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.R
import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.QuestionKind
import com.trung.myapplication.game.model.Team
import com.trung.myapplication.game.ui.section.BombSection
import com.trung.myapplication.game.ui.section.QuestionSection
import com.trung.myapplication.game.ui.section.TeamScoreSection
import com.trung.myapplication.game.ui.section.getEffectName
import com.trung.myapplication.game.ui.theme.GameUiColors
import com.trung.myapplication.game.ui.util.SfxPlayer

@OptIn(
    ExperimentalMaterial3Api::class,
    androidx.compose.foundation.layout.ExperimentalLayoutApi::class
)
@Composable
fun QuestionPresentationScreen(
    card: Card,
    isRevealed: Boolean,
    isDiscussionPhase: Boolean,
    teams: List<Team>,
    activeTeamIndex: Int,
    timerMs: Long?,
    selectedChoiceIndex: Int?,
    answerTimedOut: Boolean,
    onClose: () -> Unit,
    onAddPoints: (delta: Int) -> Unit,
    onSelectChoice: (Int) -> Unit,
    onStartTimer: () -> Unit,
    onShiftTeam: (delta: Int) -> Unit,
    onMarkEffectUsed: (teamId: Int, effectId: String) -> Unit,
    onShowStandings: () -> Unit
) {
    val context = LocalContext.current

    Box(
        modifier = Modifier
            .fillMaxSize()
            .paint(
                painter = painterResource(R.drawable.background),
                contentScale = ContentScale.FillBounds
            )
    ) {
        Column(
            modifier = Modifier.fillMaxSize()
        ) {
            // --- TOP HEADER ---
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Back Button
                IconButton(
                    onClick = onClose,
                    modifier = Modifier
                        .size(56.dp)
                        .background(
                            color = Color.Black.copy(alpha = 0.3f),
                            shape = RoundedCornerShape(12.dp)
                        )
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Quay lại",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                }

                // Timer - Larger and centered
                Box(
                    modifier = Modifier.weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    timerMs?.let { ms ->
                        val seconds = (ms / 1000).toInt()
                        val pulseScale = animateFloatAsState(
                            targetValue = if (seconds <= 5 && seconds % 2 == 0) 1.25f else 1f,
                            animationSpec = tween(220),
                            label = "timerBadgeScale"
                        ).value

                        Surface(
                            modifier = Modifier
                                .scale(pulseScale)
                                .shadow(
                                    elevation = if (seconds <= 5) 20.dp else 10.dp,
                                    shape = RoundedCornerShape(24.dp),
                                    ambientColor = if (seconds <= 5) GameUiColors.TimerUrgent else GameUiColors.TimerBorderOk,
                                    spotColor = if (seconds <= 5) GameUiColors.TimerUrgent else GameUiColors.TimerBorderOk
                                ),
                            shape = RoundedCornerShape(24.dp),
                            color = if (seconds <= 5) GameUiColors.TimerUrgent else GameUiColors.TimerBg,
                            border = androidx.compose.foundation.BorderStroke(
                                3.dp,
                                if (seconds <= 5) GameUiColors.TimerBorderUrgent else GameUiColors.TimerBorderOk
                            )
                        ) {
                            Text(
                                text = "$seconds",
                                fontSize = 80.sp,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                modifier = Modifier.padding(horizontal = 32.dp, vertical = 4.dp)
                            )
                        }
                    }
                }

                // Placeholder for balance
                Spacer(modifier = Modifier.size(56.dp))
            }

            // --- MAIN CONTENT ---
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp)
            ) {
                when (card) {
                    is QuestionCard -> {
                        QuestionSection(
                            card = card,
                            isRevealed = isRevealed,
                            selectedChoiceIndex = selectedChoiceIndex,
                            isTimeout = answerTimedOut,
                            onSelectChoice = {
                                onSelectChoice(it)
                            },
                            onStartTimer = onStartTimer,
                            isDiscussionPhase = isDiscussionPhase,
                        )
                    }

                    else -> {
                        BombSection()
                    }
                }
            }

            // --- BOTTOM SECTION: ALL TEAMS EFFECTS & SCOREBOARD ---
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // All Teams' Available Effects
                if (card is QuestionCard) Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color.Black.copy(alpha = 0.45f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        Color.White.copy(alpha = 0.15f)
                    )
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text(
                            text = "Thẻ hiệu ứng có thể dùng",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = GameUiColors.LabelPrimary,
                            modifier = Modifier.padding(bottom = 12.dp, start = 8.dp)
                        )

                        FlowRow(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp),
                            maxItemsInEachRow = 4,
                        ) {
                            teams.forEach { team ->
                                val unusedEffects = team.effectCards.filter { !it.used }
                                if (unusedEffects.isNotEmpty()) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        modifier = Modifier
                                            .background(
                                                color = if (team.id == activeTeamIndex) GameUiColors.TeamActive.copy(
                                                    alpha = 0.2f
                                                ) else Color.Transparent,
                                                shape = RoundedCornerShape(8.dp)
                                            )
                                            .padding(horizontal = 6.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = "${team.name}:",
                                            fontSize = 16.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (team.id == activeTeamIndex) GameUiColors.NeonCyan else Color.White.copy(
                                                alpha = 0.8f
                                            )
                                        )
                                        Spacer(modifier = Modifier.size(8.dp))
                                        unusedEffects.forEach { effect ->
                                            Surface(
                                                modifier = Modifier.clickable {
                                                    SfxPlayer.playByName(context, "sfx_open_sheet")
                                                    onMarkEffectUsed(team.id, effect.id)
                                                },
                                                shape = RoundedCornerShape(6.dp),
                                                color = GameUiColors.BannerBar,
                                                contentColor = GameUiColors.TextOnAccent,
                                                shadowElevation = 4.dp
                                            ) {
                                                Text(
                                                    text = getEffectName(effect.type).uppercase(),
                                                    fontSize = 14.sp,
                                                    fontWeight = FontWeight.Black,
                                                    modifier = Modifier.padding(
                                                        horizontal = 10.dp,
                                                        vertical = 6.dp
                                                    )
                                                )
                                            }
                                            Spacer(modifier = Modifier.size(6.dp))
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                // Scoreboard
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(16.dp),
                    color = Color.Black.copy(alpha = 0.4f),
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        Color.White.copy(alpha = 0.1f)
                    )
                ) {
                    Column(
                        modifier = Modifier.padding(12.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(16.dp)
                        ) {
                            Text(
                                text = "BẢNG XẾP HẠNG",
                                fontSize = 20.sp,
                                fontWeight = FontWeight.Bold,
                                color = GameUiColors.LabelPrimary,
                                modifier = Modifier.padding(bottom = 8.dp, start = 8.dp)
                            )
                            
                            IconButton(
                                onClick = onShowStandings,
                                modifier = Modifier
                                    .size(32.dp)
                                    .background(GameUiColors.BannerBar, RoundedCornerShape(8.dp))
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Star,
                                    contentDescription = "Standings",
                                    tint = GameUiColors.TitleGold,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                        TeamScoreSection(modifier = Modifier.fillMaxWidth(), teams, activeTeamIndex)
                    }
                }
            }
        }


        // --- FLOATING ACTION BUTTONS ---

        // Manual override controls (Bottom Right)
        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(32.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            horizontalAlignment = Alignment.End
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                FloatingActionButton(
                    onClick = {
                        SfxPlayer.playByName(context, "sfx_score_down")
                        onAddPoints(-5)
                    },
                    containerColor = GameUiColors.FabMinus,
                    contentColor = Color.White,
                    modifier = Modifier.size(52.dp)
                ) {
                    Icon(imageVector = Icons.Filled.KeyboardArrowDown, contentDescription = "-5")
                }

                FloatingActionButton(
                    onClick = {
                        SfxPlayer.playByName(context, "sfx_score_up")
                        onAddPoints(10)
                    },
                    containerColor = GameUiColors.FabPlus,
                    contentColor = Color.Black,
                    modifier = Modifier.size(52.dp)
                ) {
                    Icon(imageVector = Icons.Filled.KeyboardArrowUp, contentDescription = "+10")
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                FloatingActionButton(
                    onClick = { onShiftTeam(-1) },
                    containerColor = GameUiColors.FabTeam,
                    contentColor = Color.White,
                    modifier = Modifier.size(52.dp)
                ) {
                    Text(text = "T-", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }

                FloatingActionButton(
                    onClick = { onShiftTeam(1) },
                    containerColor = GameUiColors.FabTeam,
                    contentColor = Color.White,
                    modifier = Modifier.size(52.dp)
                ) {
                    Text(text = "T+", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }
            }

        }
    }
}
