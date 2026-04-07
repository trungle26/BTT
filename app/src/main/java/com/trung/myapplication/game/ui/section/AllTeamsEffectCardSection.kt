package com.trung.myapplication.game.ui.section

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import com.trung.myapplication.game.ui.theme.GameUiColors
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.R
import com.trung.myapplication.game.model.EffectInstance
import com.trung.myapplication.game.model.EffectType
import com.trung.myapplication.game.model.Team

@Composable
fun AllTeamsEffectCardSection(
    teams: List<Team>,
    cardWidthDp: Int = 128,
    cardHeightDp: Int = 176,
    activeTeamIndex: Int,
    onMarkEffectUsed: (teamId: Int, effectId: String) -> Unit,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier
            .fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = GameUiColors.EffectSectionBg,
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
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = GameUiColors.EffectTitle,
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
                        cardWidthDp = cardWidthDp,
                        cardHeightDp = cardHeightDp,
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
    cardWidthDp: Int = 128,
    cardHeightDp: Int = 176,
    isActive: Boolean,
    onMarkEffectUsed: (String) -> Unit = {}
) {
    val borderColor = if (isActive) GameUiColors.EffectBorderActive else GameUiColors.EffectBorderIdle
    val borderWidth = if (isActive) 3.dp else 1.dp
    val cardScale = animateFloatAsState(
        targetValue = if (isActive) 1.02f else 1f,
        animationSpec = tween(durationMillis = 300),
        label = "teamEffectScale"
    )

    Surface(
        modifier = Modifier
            .scale(cardScale.value)
            .fillMaxWidth()
            .border(borderWidth, borderColor, RoundedCornerShape(10.dp)),
        shape = RoundedCornerShape(10.dp),
        color = GameUiColors.EffectTeamInner,
        shadowElevation = 2.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = team.name,
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = borderColor,
                textAlign = TextAlign.Center
            )

            // Effect cards display
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                team.effectCards.forEach { effect ->
                    EffectCardBadge(
                        effect = effect,
                        onClicked = { onMarkEffectUsed(effect.id) },
                        widthDp = cardWidthDp,
                        heightDp = cardHeightDp,
                    )
                }
            }
        }
    }
}

@Composable
fun EffectCardBadge(
    effect: EffectInstance,
    widthDp: Int = 128,
    heightDp: Int = 176,
    onClicked: () -> Unit = {}
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.padding(2.dp)
    ) {
        Box(
            modifier = Modifier
                .size(width = widthDp.dp, height = heightDp.dp)
                .clickable(enabled = !effect.used) { onClicked() }
                .alpha(if (effect.used) 0.3f else 1f)
                .background(Color.Black, RoundedCornerShape(4.dp))
                .border(
                    width = 1.dp,
                    color = if (effect.used) Color.Gray else GameUiColors.EffectBadgeBorder,
                    shape = RoundedCornerShape(4.dp)
                ),
            contentAlignment = Alignment.Center,
        ) {
            Image(
                painter = painterResource(id = getEffectDrawable(effect.type)),
                contentDescription = effect.type.name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit
            )
            
            if (effect.used) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.4f)),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "ĐÃ DÙNG",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
        
        // Show card name for clarity in QuestionPresentationScreen context
        Text(
            text = getEffectName(effect.type),
            fontSize = 20.sp,
            color = GameUiColors.TextPrimary.copy(alpha = 0.85f),
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            modifier = Modifier.width(64.dp).padding(top = 2.dp)
        )
    }
}

fun getEffectName(type: EffectType): String {
    return when (type) {
        EffectType.SEE_FUTURE -> "Nhìn Tương Lai"
        EffectType.SKIP -> "Bỏ Lượt"
        EffectType.ASSIGN -> "Tấn Công"
        EffectType.STEAL -> "Giành Quyền"
        EffectType.DOUBLE_POINTS -> "Sao Hy Vọng"
        EffectType.ADD_ONE_TURN -> "Thêm Lượt"
        EffectType.NOPE -> "Vô Hiệu"
        EffectType.GET_HELP -> "Trợ Giúp"
    }
}

fun getEffectDrawable(type: EffectType): Int {
    return when (type) {
        EffectType.SEE_FUTURE -> R.drawable.nhin_trc_tuong_lai
        EffectType.SKIP -> R.drawable.bo_luot_choi
        EffectType.ASSIGN -> R.drawable.tan_cong
        EffectType.STEAL -> R.drawable.gianh_quyen_tra_loi
        EffectType.DOUBLE_POINTS -> R.drawable.ngoi_sao_hy_vong
        EffectType.ADD_ONE_TURN -> R.drawable.them_luot
        EffectType.NOPE -> R.drawable.vo_hieu_hoa
        EffectType.GET_HELP -> R.drawable.xin_quyen_tro_giup
    }
}
