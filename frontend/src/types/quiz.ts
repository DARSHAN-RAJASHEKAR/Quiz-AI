export type SourceType = 'pdf' | 'text' | 'topic'
export type QuizStatus = 'pending' | 'processing' | 'completed' | 'failed'
export type QuizType = 'mcq' | 'true_false' | 'short_answer' | 'mixed'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type QuestionType = 'mcq' | 'true_false' | 'short_answer'

export interface QuestionOption {
  label: string
  text: string
}

export interface Question {
  id: string
  question_number: number
  question_type: QuestionType
  question_text: string
  options: QuestionOption[] | null
  correct_answer: string
  explanation: string
}

export interface QuizSummary {
  id: string
  title: string
  status: QuizStatus
  quiz_type: QuizType
  num_questions: number
  difficulty: Difficulty
  source_type: SourceType
  created_at: string
  completed_at: string | null
}

export interface QuizDetail extends QuizSummary {
  error_message: string | null
  questions: Question[]
}

export interface QuizListResponse {
  items: QuizSummary[]
  total: number
  page: number
  size: number
  pages: number
}

export interface JobStatusEvent {
  quiz_id: string
  status: QuizStatus
  progress: number
  message: string
}

export interface QuizCreateRequest {
  title: string
  source_type: SourceType
  source_content?: string
  quiz_type: QuizType
  num_questions: number
  difficulty: Difficulty
}
