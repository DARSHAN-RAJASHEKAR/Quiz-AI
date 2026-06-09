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

  return (
    <PageWrapper>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {data?.total ?? 0} quiz{data?.total !== 1 ? 'zes' : ''} created
          </p>
        </div>
        <Link to="/quiz/create">
          <Button size="lg">
            <PlusCircle className="h-5 w-5 mr-2" />
            New Quiz
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : !data?.items.length ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🧩</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No quizzes yet</h3>
          <p className="text-gray-500 mb-6">Upload a PDF, paste text, or describe a topic to get started.</p>
          <Link to="/quiz/create">
            <Button size="lg">Create your first quiz</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
