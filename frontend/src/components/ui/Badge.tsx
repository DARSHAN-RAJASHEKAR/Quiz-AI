import { clsx } from 'clsx'
import type { QuizStatus, Difficulty } from '../../types/quiz'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray'

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  gray: 'bg-gray-100 text-gray-700',
}

export function Badge({ label, variant = 'gray' }: { label: string; variant?: BadgeVariant }) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantClasses[variant])}>
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: QuizStatus }) {
  const config: Record<QuizStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Pending', variant: 'gray' },
    processing: { label: 'Generating...', variant: 'warning' },
    completed: { label: 'Ready', variant: 'success' },
    failed: { label: 'Failed', variant: 'danger' },
  }
  const { label, variant } = config[status]
  return <Badge label={label} variant={variant} />
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const config: Record<Difficulty, { variant: BadgeVariant }> = {
    easy: { variant: 'success' },
    medium: { variant: 'warning' },
    hard: { variant: 'danger' },
  }
  return <Badge label={difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} variant={config[difficulty].variant} />
}
