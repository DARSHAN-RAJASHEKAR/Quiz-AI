import type { Question } from '../../types/quiz'

interface ShortAnswerQuestionProps {
  question: Question
  answer: string | undefined
  onAnswer: (v: string) => void
  showResult?: boolean
}

export function ShortAnswerQuestion({ question, answer, onAnswer, showResult }: ShortAnswerQuestionProps) {
  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-900 leading-relaxed">{question.question_text}</p>
      {showResult ? (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Your answer</p>
            <p className="p-3 bg-gray-50 rounded-lg text-sm text-gray-800 border border-gray-200">
              {answer || <em className="text-gray-400">No answer provided</em>}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-green-600 mb-1">Expected answer</p>
            <p className="p-3 bg-green-50 rounded-lg text-sm text-green-900 border border-green-200">
              {question.correct_answer}
            </p>
          </div>
        </div>
      ) : (
        <textarea
          className="w-full h-32 rounded-xl border-2 border-gray-200 p-4 text-sm focus:outline-none focus:border-blue-500 resize-none transition-colors"
          placeholder="Type your answer here..."
          value={answer || ''}
          onChange={(e) => onAnswer(e.target.value)}
        />
      )}
    </div>
  )
}
