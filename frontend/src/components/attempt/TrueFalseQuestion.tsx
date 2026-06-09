import { clsx } from 'clsx'
import type { Question } from '../../types/quiz'

interface TrueFalseQuestionProps {
  question: Question
  selectedAnswer: string | undefined
  onAnswer: (answer: string) => void
  showResult?: boolean
}

export function TrueFalseQuestion({ question, selectedAnswer, onAnswer, showResult }: TrueFalseQuestionProps) {
  return (
    <div className="space-y-6">
      <p className="text-lg font-medium text-gray-900 leading-relaxed">{question.question_text}</p>
      <div className="flex gap-4">
        {['True', 'False'].map((opt) => {
          const isSelected = selectedAnswer === opt
          const isCorrect = showResult && opt === question.correct_answer
          const isWrong = showResult && isSelected && !isCorrect

          return (
            <button
              key={opt}
              type="button"
              disabled={!!showResult}
              onClick={() => onAnswer(opt)}
              className={clsx(
                'flex-1 py-6 rounded-xl border-2 font-semibold text-lg transition-all',
                showResult
                  ? isCorrect
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : isWrong
                    ? 'border-red-400 bg-red-50 text-red-700'
                    : 'border-gray-200 text-gray-400'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-blue-300 text-gray-700',
              )}
            >
              {opt === 'True' ? '✓ True' : '✗ False'}
            </button>
          )
        })}
      </div>
    </div>
  )
}
