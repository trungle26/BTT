package com.trung.myapplication.game.ui.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Surface
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

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border

@Composable
fun MultipleChoiceItem(
    letter: String,
    text: String,
    isRevealed: Boolean,
    selectedChoiceIndex: Int?,
    thisChoiceIndex: Int,
    isTimeout: Boolean,
    isCorrectChoice: Boolean,
    onClick: () -> Unit
) {
    var isClicked by remember { mutableStateOf(false) }
    val isSelected = selectedChoiceIndex == thisChoiceIndex
    val isAnswered = selectedChoiceIndex != null
    
    val backgroundColor by animateColorAsState(
        targetValue = when {
            isRevealed && isTimeout && isCorrectChoice && !isAnswered -> GameUiColors.ChoiceTimeout
            isRevealed && isCorrectChoice && isAnswered -> GameUiColors.ChoiceCorrect
            isRevealed && isSelected && !isCorrectChoice && isAnswered -> GameUiColors.ChoiceWrong
            !isRevealed && isSelected -> GameUiColors.ChoiceClicked
            !isRevealed && isClicked -> GameUiColors.ChoiceClicked
            else -> GameUiColors.ChoiceDefault
        },
        animationSpec = tween(durationMillis = 300),
        label = "choiceBgColor"
    )

    val borderColor = when {
        isRevealed && isCorrectChoice -> GameUiColors.NeonLime
        isRevealed && isSelected -> GameUiColors.NeonPink
        isSelected -> GameUiColors.NeonCyan
        else -> Color.White.copy(alpha = 0.2f)
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(4.dp)
            .border(
                width = if (isRevealed || isSelected) 3.dp else 1.dp,
                color = borderColor,
                shape = RoundedCornerShape(16.dp)
            ),
        enabled = !isRevealed && !isAnswered,
        colors = CardDefaults.cardColors(
            containerColor = backgroundColor,
            contentColor = Color.White,
            disabledContainerColor = backgroundColor,
            disabledContentColor = Color.White
        ),
        elevation = CardDefaults.cardElevation(
            defaultElevation = 6.dp,
            pressedElevation = 12.dp,
            disabledElevation = 2.dp
        ),
        shape = RoundedCornerShape(16.dp),
        onClick = {
            isClicked = true
            onClick()
        }
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 16.dp, horizontal = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Letter Circle
            Surface(
                modifier = Modifier.size(56.dp),
                shape = RoundedCornerShape(28.dp),
                color = Color.White.copy(alpha = 0.15f),
                border = androidx.compose.foundation.BorderStroke(2.dp, Color.White.copy(alpha = 0.5f))
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        text = letter,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }
            }

            // Choice text
            Text(
                text = text,
                fontSize = 30.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White,
                modifier = Modifier.weight(1f)
            )

            // Status indicator
            if (isRevealed) {
                Text(
                    text = when {
                        isTimeout && isCorrectChoice -> "⏱"
                        isCorrectChoice -> "✓"
                        isSelected && !isCorrectChoice -> "✕"
                        else -> ""
                    },
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}
