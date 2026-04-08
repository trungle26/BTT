package com.trung.myapplication.game.ui.section


import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import com.trung.myapplication.R
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.QuestionKind
import com.trung.myapplication.game.ui.component.MultipleChoiceItem
import com.trung.myapplication.game.ui.component.VideoPlayer
import com.trung.myapplication.game.ui.theme.GameUiColors

@Composable
fun QuestionSection(
    card: QuestionCard,
    isRevealed: Boolean,
    selectedChoiceIndex: Int?,
    isTimeout: Boolean,
    isDiscussionPhase: Boolean,
    onSelectChoice: (Int) -> Unit,
    onStartTimer: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .fillMaxHeight()
            .padding(12.dp)
            .clickable { onStartTimer() },
        shape = RoundedCornerShape(24.dp),
        color = GameUiColors.SurfaceCard.copy(alpha = 0.85f),
        shadowElevation = 12.dp,
        border = androidx.compose.foundation.BorderStroke(
            2.dp,
            GameUiColors.NeonCyan.copy(alpha = 0.5f)
        )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            val index = card.id.split("_").lastOrNull()?.toIntOrNull() ?: ""

            // Question Title
            Text(
                text = "Ô $index: " + when {
                    card.kind == QuestionKind.REAL_WORLD_CHALLENGE -> "THỬ THÁCH"
                    card.kind == QuestionKind.ESSAY -> "CÂU HỎI TỰ LUẬN"
                    else -> "CÂU HỎI TRẮC NGHIỆM"
                },
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                color = GameUiColors.LabelPrimary,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center,
                letterSpacing = 4.sp
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Question Text
            Text(
                text = card.text,
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold,
                color = GameUiColors.TextPrimary,
                textAlign = TextAlign.Center,
                lineHeight = 56.sp,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(40.dp))

            if (card.kind == QuestionKind.ESSAY || card.kind == QuestionKind.REAL_WORLD_CHALLENGE) {
                if (card.kind == QuestionKind.ESSAY && isRevealed) {
                    Surface(
                        color = GameUiColors.BannerBar.copy(alpha = 0.1f),
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "ĐÁP ÁN ĐÚNG",
                                fontSize = 24.sp,
                                fontWeight = FontWeight.Bold,
                                color = GameUiColors.BannerBar,
                                textAlign = TextAlign.Center
                            )

                            Spacer(modifier = Modifier.height(12.dp))

                            Text(
                                text = card.correctAnswerText ?: "",
                                fontSize = 42.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = Color.White,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            } else {
                // Choices (A, B, C, D)
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    card.choices.forEachIndexed { idx, choice ->
                        val letter = when (idx) {
                            0 -> "A"
                            1 -> "B"
                            2 -> "C"
                            else -> "D"
                        }

                        MultipleChoiceItem(
                            letter = letter,
                            text = choice,
                            isRevealed = isRevealed,
                            selectedChoiceIndex = selectedChoiceIndex,
                            thisChoiceIndex = idx,
                            isTimeout = isTimeout,
                            isCorrectChoice = idx == card.correctChoiceIndex,
                            onClick = { onSelectChoice(idx) }
                        )
                    }
                }
            }

            // Extra spacer at bottom to ensure scrolling feels good
            Spacer(modifier = Modifier.height(16.dp))
        }
        if (isDiscussionPhase) {
            Box(
                modifier = Modifier
                    .fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                VideoPlayer(
                    videoResId = R.raw.get_help,
                    modifier = Modifier
                        .size(400.dp)
                        .align(Alignment.BottomEnd)
                )
            }
        }
    }
}

