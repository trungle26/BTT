package com.trung.myapplication.game.ui.section

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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


@Composable
fun ControlPanel(onAddPoints: (Int) -> Unit) {
    Surface(
        modifier = Modifier
            .width(100.dp)
            .padding(end = 24.dp, bottom = 24.dp)
            .heightIn(min = 120.dp),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFF1A1F3A),
        shadowElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                "SCORE",
                fontSize = 9.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF999999),
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            // Compact point buttons
            CompactPointButton(
                label = "-10",
                onClick = { onAddPoints(-10) },
                backgroundColor = Color(0xFFFF6B6B)
            )
            CompactPointButton(
                label = "+10",
                onClick = { onAddPoints(+10) },
                backgroundColor = Color(0xFF4CAF50)
            )
            CompactPointButton(
                label = "+20",
                onClick = { onAddPoints(+20) },
                backgroundColor = Color(0xFF2196F3)
            )
        }
    }
}

@Composable
fun CompactPointButton(
    label: String,
    onClick: () -> Unit,
    backgroundColor: Color,
    modifier: Modifier = Modifier
) {
    Button(
        onClick = onClick,
        modifier = modifier
            .fillMaxWidth()
            .height(32.dp),
        colors = ButtonDefaults.buttonColors(containerColor = backgroundColor),
        shape = RoundedCornerShape(8.dp),
        elevation = ButtonDefaults.buttonElevation(
            defaultElevation = 4.dp,
            pressedElevation = 6.dp
        ),
        contentPadding = PaddingValues(0.dp)
    ) {
        Text(
            label,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
        )
    }
}