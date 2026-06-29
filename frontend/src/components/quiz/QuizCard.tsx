import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Trash2 } from 'lucide-react'
import type { QuizSummary } from '../../types/quiz'
import { StatusBadge, DifficultyBadge } from '../ui/Badge'

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

function initials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '??'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function QuizCard({ quiz, onDelete }: QuizCardProps) {
  const targetPath = quiz.status === 'completed'
    ? `/quiz/${quiz.id}`
    : quiz.status === 'pending' || quiz.status === 'processing'
    ? `/quiz/${quiz.id}/generating`
    : `/quiz/${quiz.id}`

  return (
    <Link
      to={targetPath}
      className="group flex items-center gap-4 bg-white border border-gray-200 rounded-2xl px-4 py-4 transition-all hover:border-gray-300 hover:shadow-[0_4px_16px_-8px_rgba(0,0,0,0.12)]"
    >
      <span className="w-10 h-10 rounded-[10px] bg-blue-50 flex items-center justify-center text-[13px] font-semibold text-blue-600 flex-shrink-0">
        {initials(quiz.title)}
      </span>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-[15px] tracking-tight text-gray-900 truncate">{quiz.title}</h3>
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          <StatusBadge status={quiz.status} />
          <DifficultyBadge difficulty={quiz.difficulty} />
          <span className="text-xs text-gray-400">
            {quiz.num_questions} questions · {TYPE_LABELS[quiz.quiz_type]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-gray-400 hidden sm:block">
          {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
        </span>
        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onDelete(quiz.id)
            }}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label="Delete quiz"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <span className="text-gray-300 group-hover:text-gray-400 transition-colors">›</span>
      </div>
    </Link>
  )
}
