package com.trung.myapplication.game.ui.section

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
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
import com.trung.myapplication.game.model.EffectInstance
import com.trung.myapplication.game.model.EffectType
import com.trung.myapplication.game.model.Team

@Composable
fun AllTeamsEffectCardSection(
    teams: List<Team>,
    activeTeamIndex: Int,
    onMarkEffectUsed: (teamId: Int, effectId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFF1A1F3A),
        shadowElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "THẺ CHỨC NĂNG",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF00D4FF),
                modifier = Modifier.padding(bottom = 8.dp)
            )

            LazyVerticalGrid(
                columns = GridCells.Fixed(4),
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(teams.size) { teamIndex ->
                    val team = teams[teamIndex]
                    TeamEffectCardsCard(
                        team = team,
                        isActive = teamIndex == activeTeamIndex,
                        onMarkEffectUsed = { effectId ->
                            onMarkEffectUsed(team.id, effectId)
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun TeamEffectCardsCard(
    team: Team,
    isActive: Boolean,
    onMarkEffectUsed: (String) -> Unit = {}
) {
    val borderColor = if (isActive) Color(0xFF4CAF50) else Color(0xFF00D4FF)
    val borderWidth = if (isActive) 3.dp else 1.dp

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .border(borderWidth, borderColor, RoundedCornerShape(10.dp)),
        shape = RoundedCornerShape(10.dp),
        color = Color(0xFF0F1525),
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = team.name,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = borderColor,
                textAlign = TextAlign.Center
            )

            // Effect cards display
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                team.hand.forEach { effect ->
                    EffectCardBadge(
                        effect = effect,
                        onClicked = { onMarkEffectUsed(effect.id) }
                    )
                }
            }
        }
    }
}

@Composable
fun EffectCardBadge(
    effect: EffectInstance,
    onClicked: () -> Unit = {}
) {
    val bgColor = if (effect.used) Color(0xFF3A3A3A) else Color(0xFF2A4F6F)
    val textColor = if (effect.used) Color(0xFF666666) else Color(0xFF00D4FF)

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(enabled = !effect.used) { onClicked() },
        shape = RoundedCornerShape(20.dp),
        color = bgColor,
        shadowElevation = if (effect.used) 0.dp else 1.dp
    ) {
        val text = when (effect.type){
            EffectType.SEE_FUTURE -> "XEM TRƯỚC"
            EffectType.ADD_ONE_TURN -> "THÊM LƯỢT"
            EffectType.SKIP -> "QUA LƯỢT"
            EffectType.NOPE -> "VÔ HIỆU"
            EffectType.DOUBLE_POINTS -> "NGÔI SAO HY VỌNG"
            EffectType.ASSIGN -> "CHỈ ĐỊNH"
            EffectType.STEAL -> "CƯỚP LƯỢT"
            EffectType.GET_HELP -> "TRỢ GIÚP"

        }
        Text(
            text = text,
            fontSize = 15.sp,
            fontWeight = FontWeight.SemiBold,
            color = textColor,
        )
    }
}


