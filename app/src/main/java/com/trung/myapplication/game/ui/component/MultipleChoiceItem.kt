package com.trung.myapplication.game.ui.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import com.trung.myapplication.game.ui.theme.GameUiColors
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun MultipleChoiceItem(
    letter: String,
    text: String,
    isAnswered: Boolean,
    selectedChoiceIndex: Int?,
    thisChoiceIndex: Int,
    isTimeout: Boolean,
    isCorrectChoice: Boolean,
    onClick: () -> Unit
) {
    var isClicked by remember { mutableStateOf(false) }
    val isSelected = selectedChoiceIndex == thisChoiceIndex
    val backgroundColor = when {
        isAnswered && isTimeout && isCorrectChoice -> GameUiColors.ChoiceTimeout
        isAnswered && !isTimeout && isCorrectChoice -> GameUiColors.ChoiceCorrect
        isAnswered && isSelected && isCorrectChoice -> GameUiColors.ChoiceCorrect
        isAnswered && isSelected && !isCorrectChoice -> GameUiColors.ChoiceWrong
        isClicked && !isCorrectChoice -> GameUiColors.ChoiceClickWrong
        else -> GameUiColors.ChoiceDefault
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(4.dp),
        enabled = !isAnswered,
        colors = CardDefaults.cardColors(
            containerColor = backgroundColor,
            contentColor = Color.White,
            // This prevents the "gray out" effect:
            disabledContainerColor = backgroundColor,
            disabledContentColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 4.dp,
            pressedElevation = 8.dp,
            disabledElevation = 0.dp // Usually looks better flat once answered
        ),
        shape = RoundedCornerShape(12.dp),
        onClick = {
            isClicked = true
            onClick()
        }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Letter
            Text(
                text = letter,
                fontSize = 36.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color.White,
                modifier = Modifier.width(60.dp)
            )

            // Choice text
            Text(
                text = text,
                fontSize = 32.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
                modifier = Modifier.weight(1f)
            )

            // Status indicator
            if (isAnswered) {
                Text(
                    text = when {
                        isTimeout && isCorrectChoice -> "⏱"
                        isAnswered && !isTimeout && isCorrectChoice -> "✓"
                        isSelected && isCorrectChoice -> "✓"
                        isSelected && !isCorrectChoice -> "✗"
                        else -> ""
                    },
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}