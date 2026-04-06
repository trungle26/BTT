package com.trung.myapplication.game.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.trung.myapplication.R
import com.trung.myapplication.game.model.EffectType
import com.trung.myapplication.game.ui.section.getEffectDrawable
import com.trung.myapplication.game.ui.section.getEffectName
import kotlinx.coroutines.launch

@Composable
fun RulesIntroductionScreen(onStartGame: () -> Unit) {
    val pagerState = rememberPagerState(pageCount = { 4 })
    val coroutineScope = rememberCoroutineScope()

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0F1525))
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
            ) { page ->
                when (page) {
                    0 -> Intro()
                    1 -> RulePageGameplay()
                    2 -> RulePagePowerUps()
                    3 -> RulePageSummary()
                }
            }

            // Navigation Bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Button(
                    onClick = {
                        coroutineScope.launch {
                            if (pagerState.currentPage > 0) {
                                pagerState.animateScrollToPage(pagerState.currentPage - 1)
                            }
                        }
                    },
                    enabled = pagerState.currentPage > 0,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.Transparent,
                        contentColor = Color.White
                    ),
                    modifier = Modifier.size(width = 100.dp, height = 48.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = if (pagerState.currentPage > 0) Color.White else Color.Gray,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.size(8.dp))
                    Text(text = "Back", fontSize = 16.sp, fontWeight = FontWeight.Bold)
                }

                Text(
                    text = "${pagerState.currentPage + 1} / 4",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFF00D4FF)
                )

                if (pagerState.currentPage < 3) {
                    Button(
                        onClick = {
                            coroutineScope.launch {
                                pagerState.animateScrollToPage(pagerState.currentPage + 1)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF00D4FF)),
                        modifier = Modifier.size(width = 120.dp, height = 48.dp)
                    ) {
                        Text(
                            text = "Next",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = Color.Black
                        )
                        Spacer(modifier = Modifier.size(8.dp))
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowForward,
                            contentDescription = "Next",
                            tint = Color.Black
                        )
                    }
                } else {
                    Button(
                        onClick = onStartGame,
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF4CAF50)),
                        modifier = Modifier.size(width = 160.dp, height = 48.dp)
                    ) {
                        Text(
                            text = "🎮 START",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.Black
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun Intro(modifier: Modifier = Modifier) {
    Image(
        painter = painterResource(id = R.drawable.intro),
        contentDescription = null,
        modifier = modifier.fillMaxSize(),
        contentScale = ContentScale.Crop
    )
}

@Composable
private fun RulePageGameplay() {
    Surface(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFF1A1F3A),
        shadowElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(32.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text(
                text = "1. Quy tắc trò chơi",
                fontSize = 64.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF00D4FF)
            )
            Text(
                text = "Màn hình sẽ hiển thị 48 ô vuông chứa bí mật ngẫu nhiên.",
                fontSize = 58.sp,
                color = Color.White
            )
            Text(
                text = "Mỗi ô vuông có thể là:",
                fontSize = 58.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF00D4FF)
            )
            Row(
                modifier = Modifier.height(300.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                RuleItem(modifier = Modifier.weight(1f), "❓ Câu hỏi", "Trả lời đúng để ghi điểm.")
                RuleItem(
                    modifier = Modifier.weight(1f),
                    "⭐ Thử thách",
                    "Thực hiện thử thách từ quản trò."
                )
                RuleItem(
                    modifier = Modifier.weight(1f),
                    "💣 Bomb",
                    "Bị trừ trực tiếp 20 điểm và mất lượt."
                )
            }
            Text(
                text = "Hệ thống điểm số:",
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFF00D4FF)
            )
            Row(
                modifier = Modifier.height(300.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                RuleItem(modifier = Modifier.weight(1f), "🎯 Điểm khởi đầu", "100 điểm")
                RuleItem(modifier = Modifier.weight(1f), "✅ Trả lời đúng", "+10 điểm")
                RuleItem(modifier = Modifier.weight(1f), "❌ Trả lời sai", "-5 điểm")
                RuleItem(modifier = Modifier.weight(1f), "💥 Gặp Bomb", "-20 điểm")
            }
        }
    }
}

@Composable
private fun RulePagePowerUps() {
    Surface(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFF1A1F3A),
        shadowElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "2. Hệ thống Lá bài Chức năng",
                fontSize = 44.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF00D4FF)
            )
            Text(
                text = "Mỗi đội nhận 3 thẻ ngẫu nhiên. Sử dụng 1 lần duy nhất.",
                fontSize = 24.sp,
                color = Color(0xFFFFD700),
                fontWeight = FontWeight.SemiBold
            )

            val powerUps = listOf(
                PowerUpInfo(EffectType.SEE_FUTURE, "Nhìn nội dung ô", "Trước khi chọn ô"),
                PowerUpInfo(EffectType.GET_HELP, "Xin quyền trợ giúp", "Sau khi mở ô"),
                PowerUpInfo(EffectType.STEAL, "Cướp quyền trả lời", "Khi đội khác sai"),
                PowerUpInfo(EffectType.NOPE, "Vô hiệu hóa thẻ", "Khi thẻ kích hoạt"),
                PowerUpInfo(EffectType.ASSIGN, "Chỉ định đội mở ô", "Trong lượt mình"),
                PowerUpInfo(EffectType.DOUBLE_POINTS, "Nhân đôi điểm", "Trước khi trả lời"),
                PowerUpInfo(EffectType.ADD_ONE_TURN, "Thêm 1 lượt chơi", "Trong lượt mình"),
                PowerUpInfo(EffectType.SKIP, "Bỏ qua lượt chơi", "Trước/Sau mở ô")
            )

            LazyVerticalGrid(
                columns = GridCells.Fixed(4),
                modifier = Modifier.fillMaxSize(),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                items(powerUps) { info ->
                    PowerUpGridItem(info)
                }
            }
        }
    }
}

data class PowerUpInfo(val type: EffectType, val desc: String, val timing: String)

@Composable
private fun PowerUpGridItem(info: PowerUpInfo) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp),
        modifier = Modifier
            .background(Color(0xFF2A3A5A), RoundedCornerShape(12.dp))
            .padding(12.dp)
    ) {
        Surface(
            modifier = Modifier.size(width = 280.dp, height = 392.dp), // Large size for audience
            shape = RoundedCornerShape(8.dp),
            color = Color.Black
        ) {
            Image(
                painter = painterResource(id = getEffectDrawable(info.type)),
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Fit // Optimized loading
            )
        }
        Text(
            text = getEffectName(info.type),
            fontSize = 32.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF00D4FF),
            textAlign = TextAlign.Center
        )
        Text(text = "Chức năng: " + info.desc, fontSize = 30.sp, color = Color.White, textAlign = TextAlign.Center)
        Text(
            text = "Thời điểm: " + info.timing,
            fontSize = 25.sp,
            color = Color(0xFFB0BEC5),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun RulePageSummary() {
    Surface(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        shape = RoundedCornerShape(12.dp),
        color = Color(0xFF1A1F3A),
        shadowElevation = 4.dp
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Text(
                text = "Các bạn đã sẵn sàng chưa?",
                fontSize = 68.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFF00D4FF),
                textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(20.dp))
            Surface(
                modifier = Modifier
                    .fillMaxWidth(0.85f)
                    .padding(24.dp), color = Color.Transparent
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    SummaryPoint("8 đội chơi", "💪")
                    SummaryPoint("48 ô bí ẩn", "🎲")
                    SummaryPoint("35 câu hỏi", "🧠")
                    SummaryPoint("8 loại thẻ chức năng", "✨")
                }
            }
            Text(
                text = "Các đội hãy chơi một cách công bằng và vui vẻ nhé!",
                fontSize = 46.sp,
                color = Color(0xFFFFD700),
                textAlign = TextAlign.Center,
                fontWeight = FontWeight.SemiBold
            )
        }
    }
}

@Composable
private fun RuleItem(modifier: Modifier, title: String, description: String) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(Color(0xFF2A3A5A), RoundedCornerShape(8.dp))
            .padding(6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = title,
            fontSize = 54.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFF00D4FF),
            textAlign = TextAlign.Center
        )
        Text(
            text = description,
            fontSize = 50.sp,
            color = Color.White,
            modifier = Modifier.padding(top = 4.dp),
            textAlign = TextAlign.Center
        )
    }
}

@Composable
private fun SummaryPoint(text: String, emoji: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF2A3A5A), RoundedCornerShape(8.dp))
            .padding(20.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = emoji,
            fontSize = 68.sp,
            textAlign = TextAlign.Center
        )
        Text(text = text, fontSize = 68.sp, color = Color.White, fontWeight = FontWeight.SemiBold)
    }
}


@Preview(device = "spec:width=1920dp,height=1080dp,orientation=landscape", showSystemUi = true)
@Composable
private fun RulesIntroductionScreenPreview() {
    RulePagePowerUps()
}