export interface PerQuestionResult {
  question_id: string
  question_number: number
  question_text: string
  user_answer: string | null
  correct_answer: string
  is_correct: boolean
  explanation: string
}

export interface AttemptResponse {
  id: string
  quiz_id: string
  score: number
  total_questions: number
  correct: number
  incorrect: number
  per_question: PerQuestionResult[]
  completed_at: string
}

export interface AttemptSummary {
  id: string
  quiz_id: string
  score: number | null
  completed_at: string
}

export interface AttemptSubmitRequest {
  quiz_id: string
  answers: Record<string, string>
}
