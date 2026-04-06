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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun MultipleChoiceItem(
    letter: String, text: String, isAnswered: Boolean, isCorrectChoice: Boolean,
    onClick: () -> Unit
) {
    var isClicked by remember { mutableStateOf(false) }
    val backgroundColor = when {
        isAnswered && isCorrectChoice -> Color(0xFF4CAF50)  // Green for correct
        isClicked && !isCorrectChoice -> Color(0xFFD32F2F)  // Red for wrong
        else -> Color(0xFF2A3F5F)  // Blue default
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
                    text = if (isCorrectChoice) "✓" else "✗",
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}