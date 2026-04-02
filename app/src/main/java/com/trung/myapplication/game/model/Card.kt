package com.trung.myapplication.game.model

// Card models for the game
sealed class Card {
    abstract val id: String
    abstract val isRevealed: Boolean
}

data class QuestionCard(
    override val id: String,
    val text: String,
    val choices: List<String>,
    val correctChoiceIndex: Int,
    override val isRevealed: Boolean,
    val isChallenge: Boolean = false
) : Card()

data class BombCard(
    override val id: String = "bomb",
    override val isRevealed: Boolean = false
) : Card()

enum class EffectType {
    SEE_FUTURE,
    SKIP,
    ASSIGN,
    STEAL,
    DOUBLE_POINTS,
    ADD_ONE_TURN,
    NOPE,
    GET_HELP
}

data class EffectInstance(
    val id: String,
    val type: EffectType,
    var used: Boolean = false
)

