import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { ProgressBar } from '../components/ui/ProgressBar'
import { useSSE } from '../hooks/useSSE'

export function GeneratingPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()

  if (!quizId) return null

  const { progress, message, chunksTotal, liveQuestions } = useSSE({
    quizId,
    onCompleted: () => {
      // If somehow we're still here when everything finishes, go to attempt
      navigate(`/quiz/${quizId}/attempt`, { replace: true })
    },
    onFailed: (msg) => {
      toast.error(`Generation failed: ${msg}`)
      navigate('/dashboard', { replace: true })
    },
  })

  // As soon as the FIRST question arrives → go to attempt page
  // The attempt page will keep the SSE open and stream the rest
  useEffect(() => {
    if (liveQuestions.length > 0) {
      navigate(`/quiz/${quizId}/attempt`, { replace: true })
    }
  }, [liveQuestions.length])

  return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        {/* Spinner */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-blue-600" />
          </div>
        </motion.div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Generating your quiz...</h2>
          <p className="text-sm text-gray-500">{message}</p>
          {chunksTotal > 1 && (
            <p className="text-xs text-gray-400 mt-1">
              Reading {chunksTotal} sections of your document in parallel
            </p>
          )}
        </div>

        <div className="w-72">
          <ProgressBar value={progress} />
        </div>

        <p className="text-xs text-gray-400">
          You'll be taken to the quiz automatically when questions are ready
        </p>
      </div>
    </PageWrapper>
  )
}
