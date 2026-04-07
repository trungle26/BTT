package com.trung.myapplication.game.ui.section

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.text.font.FontWeight
import com.trung.myapplication.game.ui.theme.GameUiColors
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
    val bgColor = animateColorAsState(
        targetValue = if (isActive) GameUiColors.TeamActive else GameUiColors.TeamInactive,
        animationSpec = tween(240),
        label = "teamCardBg"
    )
    val scoreColor = animateColorAsState(
        targetValue = if (isActive) GameUiColors.TeamNameOnActive else GameUiColors.TeamScoreInactive,
        animationSpec = tween(240),
        label = "teamScoreColor"
    )
    val scale = animateFloatAsState(
        targetValue = if (isActive) 1.02f else 1f,
        animationSpec = tween(240),
        label = "teamCardScale"
    )

    Surface(
        modifier = modifier
            .scale(scale.value)
            .height(100.dp),
        shape = RoundedCornerShape(10.dp),
        color = bgColor.value,
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
                color = if (isActive) GameUiColors.TeamNameOnActive else GameUiColors.TextPrimary
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = "${team.score}",
                fontSize = 32.sp,
                fontWeight = FontWeight.ExtraBold,
                color = scoreColor.value
            )
        }
    }
}
