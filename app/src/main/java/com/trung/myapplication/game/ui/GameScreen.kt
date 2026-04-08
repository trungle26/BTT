package com.trung.myapplication.game.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.paint
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.R
import com.trung.myapplication.game.model.BombCard
import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.EffectInstance
import com.trung.myapplication.game.model.EffectType
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.QuestionKind
import com.trung.myapplication.game.model.Team
import com.trung.myapplication.game.ui.component.CardView
import com.trung.myapplication.game.ui.section.AllTeamsEffectCardSection
import com.trung.myapplication.game.ui.section.TeamScoreSection
import com.trung.myapplication.game.ui.theme.GameUiColors
import com.trung.myapplication.game.ui.util.SfxPlayer

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GameScreen(
    teams: List<Team>,
    cards: List<Card>,
    activeTeamIndex: Int,
    onCardClicked: (Int) -> Unit,
    onMarkEffectUsed: (teamId: Int, effectId: String) -> Unit = { _, _ -> },
    onAddPoints: (delta: Int, teamId: Int) -> Unit = { _, _ -> },
    onShiftTeam: (delta: Int) -> Unit = {},
    onShowStandings: () -> Unit = {},
) {
    val showEffectCardsSheet = remember { mutableStateOf(false) }
    val context = LocalContext.current


    Box(modifier = Modifier.fillMaxSize().paint(
        painter = painterResource(R.drawable.background),
        contentScale = ContentScale.FillBounds
    )) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp, vertical = 14.dp)
        ) {
            // Header Section
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp),
                shape = RoundedCornerShape(12.dp),
                color = GameUiColors.SurfaceHeader,
                shadowElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = "BẢNG XẾP HẠNG",
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Bold,
                            color = GameUiColors.LabelPrimary,
                            modifier = Modifier.padding(bottom = 12.dp)
                        )
                        
                        IconButton(
                            onClick = onShowStandings,
                            modifier = Modifier
                                .background(GameUiColors.BannerBar, RoundedCornerShape(10.dp))
                        ) {
                            Icon(
                                imageVector = Icons.Default.Star,
                                contentDescription = "Standings",
                                tint = GameUiColors.TitleGold,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                    }

                    // Teams row with scores
                    TeamScoreSection(modifier = Modifier.fillMaxWidth(), teams, activeTeamIndex)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Board Title
            Text(
                text = "THẺ",
                fontSize = 30.sp,
                fontWeight = FontWeight.Bold,
                color = GameUiColors.TitleGold,
                modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
            )

            // Board 6 rows x 8 columns
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(8.dp),
                shape = RoundedCornerShape(12.dp),
                color = GameUiColors.SurfaceBoard,
                shadowElevation = 4.dp
            ) {
                LazyVerticalGrid(
                    columns = GridCells.Fixed(12),
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    itemsIndexed(cards) { index, card ->
                        CardView(
                            card = card,
                            index = index,
                            onClick = {
                                SfxPlayer.playByName(context, "sfx_card_flip")
                                onCardClicked(index)
                            },
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Full-width View Effect Cards Button
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp)
                    .clickable {
                        SfxPlayer.playByName(context, "sfx_open_sheet")
                        showEffectCardsSheet.value = true
                    },
                shape = RoundedCornerShape(12.dp),
                color = GameUiColors.CtaBar,
                shadowElevation = 4.dp
            ) {
                Text(
                    text = "📋 CÁC THẺ CHỨC NĂNG CỦA TỪNG ĐỘI CÒN LẠI",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = GameUiColors.TextOnAccent,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    textAlign = TextAlign.Center
                )
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
            horizontalAlignment = Alignment.End
        ) {
            FloatingActionButton(
                onClick = {
                    onShiftTeam(-1)
                },
                containerColor = GameUiColors.FabTeam,
                contentColor = Color.White,
                modifier = Modifier.size(48.dp)
            ) {
                Text(text = "T-", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
            FloatingActionButton(
                onClick = {
                    onShiftTeam(1)
                },
                containerColor = GameUiColors.FabTeam,
                contentColor = Color.White,
                modifier = Modifier.size(48.dp)
            ) {
                Text(text = "T+", fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
            FloatingActionButton(
                onClick = {
                    onAddPoints(-5, activeTeamIndex)
                },
                containerColor = GameUiColors.FabMinus,
                contentColor = Color.White,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(imageVector = Icons.Filled.KeyboardArrowDown, contentDescription = "-5")
            }
            FloatingActionButton(
                onClick = {
                    onAddPoints(5, activeTeamIndex)
                },
                containerColor = GameUiColors.FabPlus,
                contentColor = Color.Black,
                modifier = Modifier.size(48.dp)
            ) {
                Icon(imageVector = Icons.Filled.Add, contentDescription = "+5")
            }
        }
    }

    if (showEffectCardsSheet.value) {
        ModalBottomSheet(
            onDismissRequest = { showEffectCardsSheet.value = false },
            sheetMaxWidth = Dp.Unspecified,
            containerColor = GameUiColors.SheetBackground,
            tonalElevation = 8.dp
        ) {
            AllTeamsEffectCardSection(
                teams = teams,
                activeTeamIndex = activeTeamIndex,
                onMarkEffectUsed = onMarkEffectUsed,
                cardWidthDp = 148,
                cardHeightDp = 196,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1000.dp)
                    .padding(bottom = 18.dp)
            )
        }
    }
}

@Preview(device = "spec:width=1920dp,height=1080dp,orientation=landscape", showSystemUi = true)
@Composable
fun GameScreenPreview() {
    val sampleTeams = (1..8).map {
        Team(
            id = it,
            name = "Team $it",
            score = 100 + it * 10,
            effectCards = mutableListOf(
                EffectInstance("e1", EffectType.SEE_FUTURE),
                EffectInstance("e2", EffectType.ADD_ONE_TURN, used = true),
                EffectInstance("e3", EffectType.SKIP)
            )
        )
    }

    val sampleCards = (0..47).map { i ->
        when {
            i % 10 == 0 -> BombCard(id = "bomb_$i", isRevealed = i < 5)
            i % 5 == 0 -> QuestionCard(
                id = "q_$i",
                text = "Question $i",
                choices = listOf("A", "B", "C", "D"),
                correctChoiceIndex = 0,
                kind = QuestionKind.MULTIPLE_CHOICE,
                isRevealed = false
            )

            else -> QuestionCard(
                id = "q_$i",
                text = "Question $i",
                choices = listOf("A", "B", "C", "D"),
                correctChoiceIndex = 0,
                kind = QuestionKind.MULTIPLE_CHOICE,
                isRevealed = i < 15
            )
        }
    }

    GameScreen(
        teams = sampleTeams,
        cards = sampleCards,
        activeTeamIndex = 0,
        onCardClicked = {},
        onMarkEffectUsed = { _, _ -> },
        onAddPoints = { _, _ -> },
        onShiftTeam = {}
    )
}
