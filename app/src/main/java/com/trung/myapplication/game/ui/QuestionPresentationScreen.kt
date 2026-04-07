package com.trung.myapplication.game.ui

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.trung.myapplication.game.ui.theme.GameUiColors
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.QuestionKind
import com.trung.myapplication.game.model.Team
import com.trung.myapplication.game.ui.section.AllTeamsEffectCardSection
import com.trung.myapplication.game.ui.section.BombSection
import com.trung.myapplication.game.ui.section.QuestionSection
import com.trung.myapplication.game.ui.section.TeamScoreSection
import com.trung.myapplication.game.ui.util.SfxPlayer
import androidx.compose.ui.platform.LocalContext

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuestionPresentationScreen(
    card: Card,
    isAnswered: Boolean,
    teams: List<Team>,
    activeTeamIndex: Int,
    timerMs: Long?,
    selectedChoiceIndex: Int?,
    answerTimedOut: Boolean,
    onClose: () -> Unit,
    onAddPoints: (delta: Int) -> Unit,
    onSelectChoice: (Int) -> Unit,
    onShiftTeam: (delta: Int) -> Unit,
    onMarkEffectUsed: (teamId: Int, effectId: String) -> Unit
) {
    val showEffectCardsSheet = remember { mutableStateOf(false) }
    val context = LocalContext.current

    LaunchedEffect(card.id) {
        val q = card as? QuestionCard
        if (q == null || (q.kind != QuestionKind.MULTIPLE_CHOICE && q.kind != QuestionKind.ESSAY)) {
            SfxPlayer.stopTimeoutTicking()
            return@LaunchedEffect
        }
        try {
            snapshotFlow { timerMs to isAnswered }
                .collect { (ms, answered) ->
                    if (!answered && ms != null && ms > 0) {
                        SfxPlayer.startTimeoutTicking(context.applicationContext)
                    } else {
                        SfxPlayer.stopTimeoutTicking()
                    }
                }
        } finally {
            SfxPlayer.stopTimeoutTicking()
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = GameUiColors.Background
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Header with back button and score
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
                            .weight(1f)
                            .padding(16.dp)
                    ) {
                        Text(
                            text = "ĐIỂM SỐ",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = GameUiColors.LabelPrimary,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )

                        // Teams row with scores
                        TeamScoreSection(modifier = Modifier.fillMaxWidth(), teams, activeTeamIndex)
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
                                selectedChoiceIndex = selectedChoiceIndex,
                                isTimeout = answerTimedOut,
                                onSelectChoice = {
                                    onSelectChoice(it)
                                }
                            )
                            Spacer(modifier = Modifier.height(24.dp))
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp),
                                shape = RoundedCornerShape(12.dp),
                                color = GameUiColors.BannerBar
                            ) {
                                Text(
                                    text = "📋 THẺ CHỨC NĂNG (BOTTOM SHEET)",
                                    color = GameUiColors.TextOnAccent,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 14.dp),
                                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                                )
                            }
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Chạm để mở thẻ chức năng",
                                color = Color.White.copy(alpha = 0.75f),
                                fontSize = 18.sp,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 18.dp)
                                    .border(1.dp, Color.Transparent)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Surface(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 16.dp)
                                    .border(1.dp, GameUiColors.SheetRowBorder, RoundedCornerShape(10.dp))
                                    .clickable {
                                    SfxPlayer.playByName(context, "sfx_open_sheet")
                                    showEffectCardsSheet.value = true
                                    },
                                shape = RoundedCornerShape(10.dp),
                                color = GameUiColors.SheetRow
                            ) {
                                Text(
                                    text = "MỞ ALL TEAMS EFFECT CARD",
                                    color = GameUiColors.SheetHint,
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(vertical = 12.dp),
                                    textAlign = TextAlign.Center
                                )
                            }
                        }

                        else -> {
                            BombSection()
                        }
                    }
                }
            }

            timerMs?.let {
                val seconds = (timerMs / 1000).toInt()
                val pulseScale = animateFloatAsState(
                    targetValue = if (seconds <= 5 && seconds % 2 == 0) 1.18f else 1f,
                    animationSpec = tween(220),
                    label = "timerBadgeScale"
                ).value
                Surface(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 10.dp)
                        .scale(pulseScale),
                    shape = RoundedCornerShape(22.dp),
                    color = if (seconds <= 5) GameUiColors.TimerUrgent else GameUiColors.TimerBg,
                    shadowElevation = 12.dp
                ) {
                    Text(
                        text = "⏱ $seconds s",
                        fontSize = if (seconds <= 5) 44.sp else 38.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = Color.White,
                        modifier = Modifier
                            .border(
                                2.dp,
                                if (seconds <= 5) GameUiColors.TimerBorderUrgent else GameUiColors.TimerBorderOk,
                                RoundedCornerShape(22.dp)
                            )
                            .padding(horizontal = 20.dp, vertical = 8.dp)
                    )
                }
            }

            // Manual override controls (bottom-right)
            Column(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                horizontalAlignment = Alignment.End
            ) {
                FloatingActionButton(
                    onClick = {
                        onShiftTeam(-1)
                    },
                    containerColor = GameUiColors.FabTeam,
                    contentColor = Color.White,
                    modifier = Modifier.size(48.dp)
                ) {
                    Text(text = "T-", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }

                FloatingActionButton(
                    onClick = {
                        onShiftTeam(1)
                    },
                    containerColor = GameUiColors.FabTeam,
                    contentColor = Color.White,
                    modifier = Modifier.size(48.dp)
                ) {
                    Text(text = "T+", fontSize = 14.sp, fontWeight = FontWeight.Bold)
                }

                FloatingActionButton(
                    onClick = {
                        SfxPlayer.playByName(context, "sfx_score_down")
                        onAddPoints(-5)
                    },
                    containerColor = GameUiColors.FabMinus,
                    contentColor = Color.White,
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(imageVector = Icons.Filled.KeyboardArrowDown, contentDescription = "-5")
                }

                FloatingActionButton(
                    onClick = {
                        SfxPlayer.playByName(context, "sfx_score_up")
                        onAddPoints(5)
                    },
                    containerColor = GameUiColors.FabPlus,
                    contentColor = Color.Black,
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(imageVector = Icons.Filled.KeyboardArrowUp, contentDescription = "+5")
                }
            }
        }
    }

    if (showEffectCardsSheet.value) {
        ModalBottomSheet(
            onDismissRequest = { showEffectCardsSheet.value = false },
            sheetMaxWidth = Dp.Unspecified,
            containerColor = GameUiColors.SheetBackground,
            tonalElevation = 8.dp
        ) {
            AllTeamsEffectCardSection(
                teams = teams,
                activeTeamIndex = activeTeamIndex,
                onMarkEffectUsed = onMarkEffectUsed,
                cardWidthDp = 128,
                cardHeightDp = 176,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(560.dp)
                    .padding(bottom = 18.dp)
            )
        }
    }
}
