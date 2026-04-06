package com.trung.myapplication.game.ui.section

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.game.model.Team


@Composable
fun TeamScoreSection(
    modifier: Modifier = Modifier,
    teams: List<Team>,
    activeTeamIndex: Int
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        teams.forEach { team ->
            TeamScoreCard(
                team = team,
                isActive = team.id == activeTeamIndex,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
fun TeamScoreCard(
    team: Team,
    isActive: Boolean,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .height(100.dp),
        shape = RoundedCornerShape(10.dp),
        color = if (isActive) Color(0xFF00D4FF) else Color(0xFF2A2F4F),
        shadowElevation = if (isActive) 8.dp else 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = team.name,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = if (isActive) Color.Black else Color.White
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${team.score}",
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                color = if (isActive) Color.Black else Color(0xFF00D4FF)
            )
        }
    }
}
