package com.trung.myapplication.game.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.game.model.BombCard
import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.QuestionCard

@Composable
fun CardView(card: Card, index: Int, onClick: () -> Unit) {
    val revealed = card.isRevealed

    // High-intensity neon colors
    val neonColor = when {
        !revealed -> Color(0xFF00FBFF)  // Brighter Electric Cyan
        card is BombCard -> Color(0xFFFF0055)  // Intense Neon Pink
        else -> Color(0xFF39FF14)  // Classic Neon Green
    }

    Box(
        modifier = Modifier
            .padding(4.dp)
            .aspectRatio(1f)
            .clickable { onClick() }
            .background(Color(0xFF02040A), RoundedCornerShape(12.dp))
            .border(
                width = 3.dp,
                color = neonColor,
                shape = RoundedCornerShape(12.dp)
            )
    ) {
        // Inner Glow effect using a translucent border
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(2.dp)
                .border(
                    width = 2.dp,
                    color = neonColor.copy(alpha = 0.3f),
                    shape = RoundedCornerShape(10.dp)
                )
        )

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center
        ) {
            if (!revealed) {
                // Large, glowing index for TV visibility
                Text(
                    text = "#${index + 1}",
                    color = neonColor,
                    fontSize = 48.sp, // Large size
                    fontWeight = FontWeight.ExtraBold,
                    style = TextStyle(
                        shadow = Shadow(
                            color = neonColor,
                            blurRadius = 30f // Strong glow
                        )
                    )
                )
            } else {
                when (card) {
                    is QuestionCard -> Text(
                        text = "Q",
                        color = Color.White,
                        fontSize = 60.sp,
                        fontWeight = FontWeight.Black,
                        style = TextStyle(
                            shadow = Shadow(
                                color = neonColor,
                                blurRadius = 20f
                            )
                        )
                    )
                    is BombCard -> Text(
                        text = "💣",
                        fontSize = 64.sp
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true, backgroundColor = 0xFF0A0E27, widthDp = 800, heightDp = 400)
@Composable
fun CardViewPreview() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            // Unrevealed Card
            Box(modifier = Modifier.size(160.dp)) {
                CardView(
                    card = QuestionCard(
                        id = "1",
                        text = "",
                        choices = listOf(),
                        correctChoiceIndex = 0,
                        isRevealed = false
                    ),
                    index = 1,
                    onClick = {}
                )
            }
            
            // Revealed Question Card
            Box(modifier = Modifier.size(160.dp)) {
                CardView(
                    card = QuestionCard(
                        id = "2",
                        text = "What is Kotlin?",
                        choices = listOf(),
                        correctChoiceIndex = 0,
                        isRevealed = true
                    ),
                    index = 2,
                    onClick = {}
                )
            }

            // Revealed Bomb Card
            Box(modifier = Modifier.size(160.dp)) {
                CardView(
                    card = BombCard(id = "bomb", isRevealed = true),
                    index = 3,
                    onClick = {}
                )
            }
        }
    }
}
