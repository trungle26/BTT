package com.trung.myapplication.game.ui.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.game.model.BombCard
import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.QuestionCard

@Composable
fun CardView(card: Card, onClick: () -> Unit) {
    val revealed = card.isRevealed

    val backgroundColor = when {
        !revealed -> Color(0xFF2A3F5F)  // Blue-ish unrevealed
        card is BombCard -> Color(0xFFFF5252)  // Red bomb
        else -> Color(0xFF4CAF50)  // Green question
    }

    Box(
        modifier = Modifier
            .padding(6.dp)
            .aspectRatio(4f / 3f)
            .clickable { onClick() }
    ) {
        Card(
            modifier = Modifier.fillMaxSize(),
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = backgroundColor),
            elevation = CardDefaults.cardElevation(
                defaultElevation = 4.dp,
                pressedElevation = 8.dp
            )
        ) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                if (!revealed) {
                    Text(
                        text = "?",
                        color = Color(0xFF00D4FF),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.ExtraBold
                    )
                } else {
                    when (card) {
                        is QuestionCard -> Text(
                            text = "Q",
                            color = Color.White,
                            fontSize = 32.sp,
                            fontWeight = FontWeight.ExtraBold
                        )
                        is BombCard -> Text(
                            text = "💣",
                            fontSize = 40.sp
                        )
                    }
                }
            }
        }
    }
}
