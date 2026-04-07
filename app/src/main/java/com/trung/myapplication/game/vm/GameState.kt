package com.trung.myapplication.game.vm

import com.trung.myapplication.game.model.Card
import com.trung.myapplication.game.model.EffectInstance
import com.trung.myapplication.game.model.EffectType
import com.trung.myapplication.game.model.Team

data class GameState(
    val cards: List<Card> = emptyList(),
    val teams: List<Team> = emptyList(),
    val activeTeamIndex: Int = 0,
    val stolenTurnTeamIndex: Int? = null,
    val activeEffect: EffectInstance? = null,
    val timerMs: Long? = null,
    val roundsPerTeam: Int = 6,
    val gameOver: Boolean = false,
    val winner: Team? = null,
    val showingPresentationScreen: Boolean = false,
    val selectedCardIndex: Int? = null,
    val selectedChoiceIndex: Int? = null,
    val answerTimedOut: Boolean = false,
    val showingRules: Boolean = true,
)

