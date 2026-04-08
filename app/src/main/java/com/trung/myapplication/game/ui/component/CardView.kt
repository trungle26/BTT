package com.trung.myapplication.game.ui.component

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import com.trung.myapplication.game.ui.theme.GameUiColors
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.game.model.BombCard
import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.ui.theme.CardGradients

@Composable
fun CardView(card: Card, index: Int, onClick: () -> Unit) {
    val revealed = card.isRevealed

    val bgBrush = when {
        !revealed -> CardGradients.BlueBg
        card is BombCard -> CardGradients.RedBg
        else -> CardGradients.OrangeBg
    }

    val borderBrush = when {
        !revealed -> CardGradients.BlueBorder
        card is BombCard -> CardGradients.RedBorder
        else -> CardGradients.OrangeBorder
    }

    val neonColor = when {
        !revealed -> GameUiColors.CardNeonUnrevealed
        card is BombCard -> GameUiColors.CardNeonBomb
        else -> GameUiColors.CardNeonRevealed
    }

    Box(
        modifier = Modifier
            .padding(4.dp)
            .aspectRatio(1f)
            .clickable { onClick() }
            .shadow(
                elevation = 20.dp,
                shape = RoundedCornerShape(12.dp),
                ambientColor = neonColor,
                spotColor = neonColor
            )
            .background(bgBrush, RoundedCornerShape(12.dp))
            .border(
                width = 3.dp,
                brush = borderBrush,
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
                    brush = borderBrush,
                    shape = RoundedCornerShape(10.dp)
                )
                .alpha(0.3f)
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
                        text = "X",
                        color = Color.Red,
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
                        kind = com.trung.myapplication.game.model.QuestionKind.MULTIPLE_CHOICE,
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
                        kind = com.trung.myapplication.game.model.QuestionKind.MULTIPLE_CHOICE,
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
