import { clsx } from 'clsx'
import type { Question } from '../../types/quiz'

interface MCQQuestionProps {
  question: Question
  selectedAnswer: string | undefined
  onAnswer: (answer: string) => void
  showResult?: boolean
}

export function MCQQuestion({ question, selectedAnswer, onAnswer, showResult }: MCQQuestionProps) {
  return (
    <div className="space-y-4">
      <p className="text-lg font-medium text-gray-900 leading-relaxed">{question.question_text}</p>
      <div className="space-y-2">
        {question.options?.map((opt) => {
          const isSelected = selectedAnswer === opt.label
          const isCorrect = showResult && opt.label === question.correct_answer
          const isWrong = showResult && isSelected && !isCorrect

          return (
            <button
              key={opt.label}
              type="button"
              disabled={!!showResult}
              onClick={() => onAnswer(opt.label)}
              className={clsx(
                'w-full text-left flex items-start gap-3 p-4 rounded-xl border-2 transition-all',
                showResult
                  ? isCorrect
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : isWrong
                    ? 'border-red-400 bg-red-50 text-red-900'
                    : 'border-gray-200 text-gray-600'
                  : isSelected
                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-400 text-gray-700',
              )}
            >
              <span className={clsx(
                'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold',
                isSelected && !showResult ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600',
              )}>
                {opt.label}
              </span>
              <span className="pt-0.5">{opt.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
