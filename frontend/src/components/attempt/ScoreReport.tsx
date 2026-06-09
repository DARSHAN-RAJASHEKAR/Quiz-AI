import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'
import type { AttemptResponse } from '../../types/attempt'
import { Button } from '../ui/Button'
import { Card, CardBody } from '../ui/Card'

export function ScoreReport({ attempt, quizId }: { attempt: AttemptResponse; quizId: string }) {
  const pct = Math.round(attempt.score)
  const isPassing = pct >= 70

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Score circle */}
      <Card>
        <CardBody className="text-center py-10">
          <div className={clsx(
            'inline-flex items-center justify-center w-32 h-32 rounded-full border-4 mb-6',
            isPassing ? 'border-green-500 bg-green-50' : 'border-orange-400 bg-orange-50',
          )}>
            <div>
              <p className={clsx('text-4xl font-bold', isPassing ? 'text-green-700' : 'text-orange-700')}>
                {pct}%
              </p>
              <p className="text-xs text-gray-500 mt-1">Score</p>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-1">
            {isPassing ? '🎉 Great job!' : '📚 Keep studying!'}
          </h2>
          <p className="text-gray-600">
            You got <strong>{attempt.correct}</strong> out of <strong>{attempt.total_questions}</strong> questions correct.
          </p>

          <div className="flex gap-3 justify-center mt-6">
            <Link to={`/quiz/${quizId}/attempt`}>
              <Button variant="primary">Try Again</Button>
            </Link>
            <Link to="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </div>
        </CardBody>
      </Card>

      {/* Per-question breakdown */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Question Review</h3>
        {attempt.per_question.map((q) => (
          <QuestionReviewItem key={q.question_id} item={q} />
        ))}
      </div>
    </div>
  )
}

function QuestionReviewItem({ item }: { item: AttemptResponse['per_question'][0] }) {
  const [open, setOpen] = useState(false)

  return (
    <Card>
      <CardBody>
        <button
          type="button"
          className="w-full text-left"
          onClick={() => setOpen(!open)}
        >
          <div className="flex items-start gap-3">
            {item.is_correct
              ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              : <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 mb-0.5">Question {item.question_number}</p>
              <p className="text-sm font-medium text-gray-900 leading-relaxed">{item.question_text}</p>
            </div>
            <ChevronDown className={clsx('h-4 w-4 text-gray-400 flex-shrink-0 transition-transform', open && 'rotate-180')} />
          </div>
        </button>

        {open && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 pl-8">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-gray-500">Your answer: </span>
                <span className={item.is_correct ? 'text-green-700 font-medium' : 'text-red-600 font-medium'}>
                  {item.user_answer || <em>None</em>}
                </span>
              </div>
              {!item.is_correct && (
                <div>
                  <span className="text-gray-500">Correct: </span>
                  <span className="text-green-700 font-medium">{item.correct_answer}</span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
              <span className="font-medium text-blue-800">Explanation: </span>
              {item.explanation}
            </p>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
