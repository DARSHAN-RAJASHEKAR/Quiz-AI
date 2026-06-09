import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowRight, Trash2 } from 'lucide-react'
import type { QuizSummary } from '../../types/quiz'
import { StatusBadge, DifficultyBadge } from '../ui/Badge'
import { Card, CardBody } from '../ui/Card'
import { Button } from '../ui/Button'

interface QuizCardProps {
  quiz: QuizSummary
  onDelete?: (id: string) => void
}

const TYPE_LABELS: Record<string, string> = {
  mcq: 'MCQ',
  true_false: 'True/False',
  short_answer: 'Short Answer',
  mixed: 'Mixed',
}

export function QuizCard({ quiz, onDelete }: QuizCardProps) {
  const targetPath = quiz.status === 'completed'
    ? `/quiz/${quiz.id}`
    : quiz.status === 'pending' || quiz.status === 'processing'
    ? `/quiz/${quiz.id}/generating`
    : `/quiz/${quiz.id}`

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardBody>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <StatusBadge status={quiz.status} />
              <DifficultyBadge difficulty={quiz.difficulty} />
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                {TYPE_LABELS[quiz.quiz_type]}
              </span>
            </div>

            <h3 className="font-semibold text-gray-900 truncate">{quiz.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {quiz.num_questions} questions ·{' '}
              {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(quiz.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Link to={targetPath}>
              <Button variant="secondary" size="sm">
                {quiz.status === 'completed' ? (
                  <><span>Open</span><ArrowRight className="h-4 w-4 ml-1" /></>
                ) : quiz.status === 'processing' || quiz.status === 'pending' ? (
                  <span>View progress</span>
                ) : (
                  <span>View</span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
