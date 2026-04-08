package com.trung.myapplication.game.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * Arcade / TV-show palette — nền tím đậm + neon cyan / magenta / vàng.
 */
object GameUiColors {
    val Background = Color(0xFF0D0221)
    val BackgroundDeep = Color(0xFF080414)

    val SurfaceHeader = Color(0xFF2D1B69)
    val SurfaceBoard = Color(0xFF1A0A42)
    val SurfacePanel = Color(0xFF3D2066)
    val SurfaceElevated = Color(0xFF4E2A8C)
    val SurfaceCard = Color(0xFF2D1B69)

    val NeonCyan = Color(0xFF00F5FF)
    val NeonMagenta = Color(0xFFFF00E5)
    val NeonYellow = Color(0xFFFFEA00)
    val NeonLime = Color(0xFFB2FF59)
    val NeonPink = Color(0xFFFF4081)
    val NeonOrange = Color(0xFFFF9100)

    val TitleGold = Color(0xFFFFEA00)
    val LabelPrimary = NeonCyan
    val TextPrimary = Color(0xFFFFFDE7)
    val TextMuted = Color(0xFFE1BEE7)
    val TextOnAccent = Color(0xFF1A0033)

    val CtaBar = NeonCyan
    val CtaBarAlt = Color(0xFF00E676)

    val TimerBg = Color(0xFF4A148C)
    val TimerUrgent = Color(0xFFFF1744)
    val TimerBorderOk = NeonCyan
    val TimerBorderUrgent = Color(0xFFFF8A80)

    val FabTeam = Color(0xFF5E35B1)
    val FabMinus = Color(0xFFFF5252)
    val FabPlus = Color(0xFF69F0AE)

    val SheetBackground = Color(0xFF1A0A3E)

    val BannerBar = NeonYellow
    val SheetRow = Color(0xFF2D1B69)
    val SheetRowBorder = Color(0xFF7C4DFF)
    val SheetHint = Color(0xFFD1C4E9)

    val ChoiceDefault = Color(0xFF6A1B9A)
    val ChoiceCorrect = Color(0xFF00E676)
    val ChoiceWrong = Color(0xFFFF1744)
    val ChoiceTimeout = Color(0xFFFFEB3B)
    val ChoiceClicked = Color(0xFF00BCD4)

    val TeamActive = Color(0xFFE040FB)
    val TeamInactive = Color(0xFF4A148C)
    val TeamScoreInactive = NeonCyan
    val TeamNameOnActive = TextOnAccent

    val EffectSectionBg = Color(0xFF2D1B69)
    val EffectTitle = NeonCyan
    val EffectBorderActive = NeonLime
    val EffectBorderIdle = NeonCyan
    val EffectTeamInner = Color(0xFF1A0A3E)
    val EffectBadgeBorder = NeonCyan

    val CardNeonUnrevealed = NeonCyan
    val CardNeonBomb = NeonPink
    val CardNeonRevealed = NeonLime
    val CardInnerBg = Color(0xFF0A0418)

    val RulesSurface = Color(0xFF1E1048)
    val RulesTile = Color(0xFF3D2066)
    val RulesMuted = Color(0xFFB39DDB)
}
object CardGradients {

    val BlueBg = Brush.linearGradient(
        listOf(
            Color(0xFF0D1B2A),
            Color(0xFF1B4965),
            Color(0xFF00B4D8)
        )
    )

    val BlueBorder = Brush.linearGradient(
        listOf(
            Color(0xFF00E5FF),
            Color(0xFF0077B6)
        )
    )

    val OrangeBg = Brush.linearGradient(
        listOf(
            Color(0xFF3A1C00),
            Color(0xFFB45309),
            Color(0xFFFFB703)
        )
    )

    val OrangeBorder = Brush.linearGradient(
        listOf(
            Color(0xFFFFD166),
            Color(0xFFFF6A00)
        )
    )

    val RedBg = Brush.linearGradient(
        listOf(
            Color(0xFF2B0000),
            Color(0xFF7F1D1D),
            Color(0xFFFF3B3B)
        )
    )

    val RedBorder = Brush.linearGradient(
        listOf(
            Color(0xFFFF6B6B),
            Color(0xFFFF0000)
        )
    )

    val DarkBg = Brush.linearGradient(
        listOf(
            Color(0xFF0A0A0A),
            Color(0xFF1A1A1A)
        )
    )
}
