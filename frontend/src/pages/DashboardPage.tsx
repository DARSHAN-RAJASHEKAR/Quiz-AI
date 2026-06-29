import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PlusCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { quizzesApi } from '../api/quizzes'
import { QuizCard } from '../components/quiz/QuizCard'
import { Button } from '../components/ui/Button'
import { PageWrapper } from '../components/layout/PageWrapper'
import { PageSpinner } from '../components/ui/Spinner'
import { useAuthStore } from '../store/authStore'

export function DashboardPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['quizzes'],
    queryFn: () => quizzesApi.list({ size: 50 }),
    refetchInterval: 10_000, // auto-refresh every 10s to pick up status changes
  })

  const deleteMutation = useMutation({
    mutationFn: quizzesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      toast.success('Quiz deleted')
    },
    onError: () => toast.error('Failed to delete quiz'),
  })

  const total = data?.total ?? 0
  const firstName = user?.full_name?.split(' ')[0]

  return (
    <PageWrapper>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[26px] font-semibold tracking-[-0.025em] text-gray-900">Your library</h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Welcome back{firstName ? `, ${firstName}` : ''} · {total} quiz{total !== 1 ? 'zes' : ''}
          </p>
        </div>
        <Link to="/quiz/create" className="flex-none">
          <Button>
            <PlusCircle className="h-4 w-4 mr-1.5" />
            New quiz
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !data?.items.length ? (
        <div className="border border-dashed border-gray-300 rounded-2xl text-center py-20 px-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <PlusCircle className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1.5">No quizzes yet</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
            Upload a PDF, paste text, or describe a topic to generate your first quiz.
          </p>
          <Link to="/quiz/create">
            <Button>Create your first quiz</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.items.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
