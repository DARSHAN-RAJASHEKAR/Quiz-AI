import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Play, Trash2, ArrowLeft } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { quizzesApi } from '../api/quizzes'
import { attemptsApi } from '../api/attempts'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { StatusBadge, DifficultyBadge } from '../components/ui/Badge'
import { PageSpinner } from '../components/ui/Spinner'
import { Alert } from '../components/ui/Alert'

export function QuizDetailPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: quiz, isLoading, error } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizzesApi.get(quizId!),
    enabled: !!quizId,
  })

  const { data: attemptsData } = useQuery({
    queryKey: ['attempts', { quiz_id: quizId }],
    queryFn: () => attemptsApi.list({ quiz_id: quizId }),
    enabled: !!quizId && quiz?.status === 'completed',
  })

  const deleteMutation = useMutation({
    mutationFn: () => quizzesApi.delete(quizId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
      navigate('/dashboard')
      toast.success('Quiz deleted')
    },
  })

  if (isLoading) return <PageWrapper><PageSpinner /></PageWrapper>
  if (!quiz || error) return <PageWrapper><Alert type="error"><span>Quiz not found.</span></Alert></PageWrapper>

  const bestScore = attemptsData?.items?.length
    ? Math.max(...attemptsData.items.map((a: any) => a.score ?? 0))
    : null

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        {/* Back */}
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex gap-2 mb-2">
                  <StatusBadge status={quiz.status} />
                  <DifficultyBadge difficulty={quiz.difficulty} />
                </div>
                <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {quiz.num_questions} questions · Created{' '}
                  {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteMutation.mutate()}
                className="text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {quiz.status === 'failed' && (
              <div className="mb-4">
                <Alert type="error">Generation failed: {quiz.error_message}</Alert>
              </div>
            )}

            {quiz.status === 'completed' && (
              <div className="space-y-4">
                {bestScore !== null && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
                    <span className="text-3xl">🏆</span>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Your best score</p>
                      <p className="text-2xl font-bold text-blue-900">{Math.round(bestScore)}%</p>
                    </div>
                  </div>
                )}
                <Link to={`/quiz/${quizId}/attempt`} className="block">
                  <Button className="w-full" size="lg">
                    <Play className="h-5 w-5 mr-2" />
                    {attemptsData?.items?.length ? 'Retake Quiz' : 'Start Quiz'}
                  </Button>
                </Link>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Past attempts */}
        {attemptsData?.items?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Past Attempts</h2>
            <div className="space-y-2">
              {attemptsData.items.map((attempt: any) => (
                <Link key={attempt.id} to={`/quiz/${quizId}/results/${attempt.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardBody className="flex items-center justify-between py-3">
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(attempt.completed_at), { addSuffix: true })}
                      </p>
                      <span className={`text-lg font-bold ${
                        (attempt.score ?? 0) >= 70 ? 'text-green-600' : 'text-orange-500'
                      }`}>
                        {Math.round(attempt.score ?? 0)}%
                      </span>
                    </CardBody>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
