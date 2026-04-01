package com.trung.myapplication.game.data

import com.trung.myapplication.game.model.BombCard
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.Card
import kotlin.random.Random

object DeckGenerator {
    // Generate a deck of 48 cards: 36 questions, 8 bombs, 4 challenges
    fun generateDeck(seed: Long? = null): List<Card> {
        val rnd = seed?.let { Random(it) } ?: Random.Default
        val cards = mutableListOf<Card>()

        // create 36 normal questions
        for (i in 1..36) {
            val q = QuestionCard(
                id = "q_$i",
                text = "Question #$i: What is the answer?",
                choices = listOf("A", "B", "C", "D"),
                correctIndex = rnd.nextInt(4),
                isChallenge = false
            )
            cards += q
        }

        // create 4 challenge questions (treat as special question)
        for (i in 1..4) {
            val idx = 36 + i
            val q = QuestionCard(
                id = "c_$idx",
                text = "Challenge #$i: Special question",
                choices = listOf("A", "B", "C", "D"),
                correctIndex = rnd.nextInt(4),
                isChallenge = true
            )
            cards += q
        }

        // add 8 bombs
        for (i in 1..8) cards += BombCard

        cards.shuffle(rnd)

        // ensure deck size is exactly 48
        return cards.take(48)
    }
}

