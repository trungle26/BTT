package com.trung.myapplication.game.model

data class Team(
    val id: Int,
    val name: String,
    val effectCards: MutableList<EffectInstance> = mutableListOf(),
    var score: Int = 0
)

