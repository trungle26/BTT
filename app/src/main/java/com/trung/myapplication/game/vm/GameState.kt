package com.trung.myapplication.game.vm

import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.EffectInstance
import com.trung.myapplication.game.model.Team

enum class GamePhase { AWAITING_ACTION, SHOWING_QUESTION }

data class CardState(
    val card: Card,
    val revealed: Boolean = false,
    val resolved: Boolean = false
)

data class GameState(
    val board: List<CardState> = emptyList(),
    val teams: List<Team> = emptyList(),
    val activeTeamIndex: Int = 0,
    val phase: GamePhase = GamePhase.AWAITING_ACTION,
    val selectedIndex: Int? = null,
    val timerMs: Long = 0L,
    val roundsPerTeam: Int = 6
)

