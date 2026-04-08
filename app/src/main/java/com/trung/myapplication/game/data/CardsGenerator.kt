package com.trung.myapplication.game.data

import com.trung.myapplication.game.model.BombCard
import com.trung.myapplication.game.model.QuestionCard
import com.trung.myapplication.game.model.QuestionKind
import com.trung.myapplication.game.model.Card
import kotlin.random.Random

object CardsGenerator {
    fun generate(seed: Long? = null): List<Card> {
        val rnd = seed?.let { Random(it) } ?: Random.Default
        val cards = mutableListOf<Card>()

        // Danh sách câu hỏi mẫu (Hardcoded)
        val sampleQuestions = mutableListOf(
            // --- Trắc nghiệm (Multiple Choice) ---
            QuestionCard(
                id = "q_1",
                text = "Hành tinh nào gần Mặt Trời nhất?",
                choices = listOf("Sao Kim", "Sao Thủy", "Sao Hỏa", "Trái Đất"),
                correctChoiceIndex = 1,
                isRevealed = false
            ),
            QuestionCard(
                id = "q_2",
                text = "Ai là tác giả của tác phẩm 'Truyện Kiều'?",
                choices = listOf("Nguyễn Khuyến", "Nguyễn Du", "Chu Văn An", "Tú Xương"),
                correctChoiceIndex = 1,
                isRevealed = false
            ),
            QuestionCard(
                id = "q_3",
                text = "Loại thẻ nào trong game có thể giúp bạn nhìn trước nội dung ô?",
                choices = listOf("See Future", "Skip", "Double", "Nope"),
                correctChoiceIndex = 0,
                isRevealed = false
            ),
            QuestionCard(
                id = "q_4",
                text = "Đâu là tên một loại ngôn ngữ lập trình?",
                choices = listOf("Python", "Lion", "Tiger", "Eagle"),
                correctChoiceIndex = 0,
                isRevealed = false
            ),
            
            // --- Tự luận (Essay) ---
            QuestionCard(
                id = "e_1",
                text = "Tự luận: Kể tên 5 quốc gia tại khu vực Đông Nam Á.",
                choices = emptyList(),
                correctChoiceIndex = -1,
                correctAnswerText = "Việt Nam, Lào, Campuchia, Thái Lan, Singapore, Indonesia, Malaysia, Philippines, Brunei, Myanmar, Timor-Leste.",
                kind = QuestionKind.ESSAY,
                isRevealed = false
            ),
            QuestionCard(
                id = "e_2",
                text = "Tự luận: Nêu ý nghĩa của ngày 2/9 tại Việt Nam.",
                choices = emptyList(),
                correctChoiceIndex = -1,
                correctAnswerText = "Ngày Quốc khánh Việt Nam, ngày Bác Hồ đọc bản Tuyên ngôn Độc lập khai sinh ra nước Việt Nam Dân chủ Cộng hòa.",
                kind = QuestionKind.ESSAY,
                isRevealed = false
            ),
            QuestionCard(
                id = "e_3",
                text = "Tự luận: Trong toán học, số Pi (π) xấp xỉ bằng bao nhiêu?",
                choices = emptyList(),
                correctChoiceIndex = -1,
                correctAnswerText = "3.14159...",
                kind = QuestionKind.ESSAY,
                isRevealed = false
            ),

            // --- Thử thách (Real World Challenge) ---
            QuestionCard(
                id = "rw_1",
                text = "🔥 THỬ THÁCH: Cả đội hãy cùng nhảy 1 điệu Tiktok bất kỳ trong 15 giây.",
                choices = emptyList(),
                correctChoiceIndex = -1,
                correctAnswerText = "Hoàn thành thử thách để nhận điểm từ quản trò.",
                kind = QuestionKind.REAL_WORLD_CHALLENGE,
                isRevealed = false
            ),
            QuestionCard(
                id = "rw_2",
                text = "🔥 THỬ THÁCH: Tìm một vật dụng màu đỏ trong phòng trong vòng 10 giây.",
                choices = emptyList(),
                correctChoiceIndex = -1,
                correctAnswerText = "Quản trò xác nhận kết quả.",
                kind = QuestionKind.REAL_WORLD_CHALLENGE,
                isRevealed = false
            )
        )

        cards.addAll(sampleQuestions)

        // Bổ sung thêm câu hỏi mẫu cho đủ 40 ô (Câu hỏi + Thử thách)
        var qIdx = cards.size
        while (cards.size < 40) {
            val isEssay = rnd.nextBoolean()
            if (isEssay) {
                cards += QuestionCard(
                    id = "q_$qIdx",
                    text = "Câu hỏi tự luận mẫu #$qIdx?",
                    choices = emptyList(),
                    correctChoiceIndex = -1,
                    correctAnswerText = "Đáp án mẫu cho câu hỏi #$qIdx.",
                    kind = QuestionKind.ESSAY,
                    isRevealed = false
                )
            } else {
                cards += QuestionCard(
                    id = "q_$qIdx",
                    text = "Câu hỏi trắc nghiệm mẫu #$qIdx?",
                    choices = listOf("Đáp án 1", "Đáp án 2", "Đáp án 3", "Đáp án 4"),
                    correctChoiceIndex = rnd.nextInt(4),
                    isRevealed = false
                )
            }
            qIdx++
        }

        // Thêm 8 ô Bomb
        repeat(8) {
            cards += BombCard(id = "bomb_${rnd.nextInt(1000)}")
        }

        // Trộn ngẫu nhiên (Shuffle)
        return cards.shuffled(rnd)
    }
}
