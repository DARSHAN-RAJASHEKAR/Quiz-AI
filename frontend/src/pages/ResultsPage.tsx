import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { attemptsApi } from '../api/attempts'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ScoreReport } from '../components/attempt/ScoreReport'
import { PageSpinner } from '../components/ui/Spinner'

export function ResultsPage() {
  const { quizId, attemptId } = useParams<{ quizId: string; attemptId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => attemptsApi.get(attemptId!),
    enabled: !!attemptId,
  })

  if (isLoading) return <PageWrapper><PageSpinner /></PageWrapper>
  if (!data) return <PageWrapper><p>Attempt not found.</p></PageWrapper>

  return (
    <PageWrapper>
      <ScoreReport attempt={data} quizId={quizId!} />
    </PageWrapper>
  )
}
