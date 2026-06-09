import { motion } from 'framer-motion'
import { ProgressBar } from '../ui/ProgressBar'
import { useSSE } from '../../hooks/useSSE'

interface GeneratingStateProps {
  quizId: string
  onCompleted: () => void
  onFailed: (msg: string) => void
}

export function GeneratingState({ quizId, onCompleted, onFailed }: GeneratingStateProps) {
  const { progress, message, chunksTotal, chunksCompleted } = useSSE({
    quizId,
    onCompleted,
    onFailed,
  })

  const isMultiChunk = chunksTotal > 1

  return (
    <div className="flex flex-col items-center justify-center min-h-64 py-16">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="mb-6"
      >
        <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
          <span className="text-4xl">🧠</span>
        </div>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-xl font-semibold text-gray-900 mb-2"
      >
        Generating your quiz...
      </motion.h2>

      <p className="text-sm text-gray-500 mb-8 text-center max-w-sm">{message}</p>

      <div className="w-full max-w-sm">
        <ProgressBar value={progress} />
      </div>

      {isMultiChunk && (
        <p className="text-xs text-gray-400 mt-3">
          Section {chunksCompleted} of {chunksTotal} complete
        </p>
      )}

      <p className="text-xs text-gray-400 mt-6">
        {isMultiChunk
          ? 'Large document detected — reading all sections in parallel.'
          : 'The AI is crafting your questions. This usually takes 15–60 seconds.'}
      </p>
    </div>
  )
}
