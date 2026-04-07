package com.trung.myapplication.game.ui.section

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import com.trung.myapplication.game.ui.theme.GameUiColors
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.QuestionKind
import com.trung.myapplication.game.ui.component.MultipleChoiceItem


@Composable
fun QuestionSection(
    card: QuestionCard,
    isAnswered: Boolean,
    selectedChoiceIndex: Int?,
    isTimeout: Boolean,
    onSelectChoice: (Int) -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        shape = RoundedCornerShape(12.dp),
        color = GameUiColors.SurfaceCard,
        shadowElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Question Title
            Text(
                text = when {
                    card.kind == QuestionKind.REAL_WORLD_CHALLENGE -> "🔥 THỬ THÁCH"
                    card.isChallenge -> "⭐ CHALLENGE"
                    else -> "❓ QUESTION"
                },
                fontSize = 40.sp,
                fontWeight = FontWeight.Bold,
                color = GameUiColors.LabelPrimary,
                modifier = Modifier.fillMaxWidth(),
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Question Text
            Text(
                text = card.text,
                fontSize = 44.sp,
                fontWeight = FontWeight.SemiBold,
                color = GameUiColors.TextPrimary,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
            )

            Spacer(modifier = Modifier.height(32.dp))

            if (card.kind == QuestionKind.ESSAY || card.kind == QuestionKind.REAL_WORLD_CHALLENGE) {
                if (card.kind == QuestionKind.ESSAY && isAnswered) {
                    Text(
                        text = "ĐÁP ÁN ĐÚNG",
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Bold,
                        color = GameUiColors.LabelPrimary,
                        modifier = Modifier.fillMaxWidth(),
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(12.dp))

                    Text(
                        text = card.correctAnswerText ?: "",
                        fontSize = 40.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = GameUiColors.TextPrimary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp)
                    )
                }
            } else {
                // Choices (A, B, C, D)
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
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
                            isAnswered = isAnswered,
                            selectedChoiceIndex = selectedChoiceIndex,
                            thisChoiceIndex = idx,
                            isTimeout = isTimeout,
                            isCorrectChoice = idx == card.correctChoiceIndex,
                            onClick = { onSelectChoice(idx) }
                        )
                    }
                }
            }
        }
    }
}
