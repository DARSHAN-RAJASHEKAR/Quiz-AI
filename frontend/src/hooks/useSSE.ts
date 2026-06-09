import { useEffect, useRef, useState } from 'react'
import { createJobSSE } from '../api/sse'
import type { SSEStatusPayload } from '../api/sse'
import type { Question } from '../types/quiz'

interface UseSSEOptions {
  quizId: string
  enabled?: boolean
  onCompleted?: () => void
  onFailed?: (message: string) => void
}

interface UseSSEResult {
  status: string
  progress: number
  message: string
  chunksTotal: number
  chunksCompleted: number
  /** Questions streamed so far — grows as each chunk finishes */
  liveQuestions: Question[]
}

export function useSSE({
  quizId,
  enabled = true,
  onCompleted,
  onFailed,
}: UseSSEOptions): UseSSEResult {
  const [status, setStatus]               = useState<string>('pending')
  const [progress, setProgress]           = useState(0)
  const [message, setMessage]             = useState('Queued...')
  const [chunksTotal, setChunksTotal]     = useState(1)
  const [chunksCompleted, setChunksCompleted] = useState(0)
  const [liveQuestions, setLiveQuestions] = useState<Question[]>([])

  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    // Always read from localStorage — the Axios refresh interceptor updates
    // localStorage but not the Zustand store, so the store can hold a stale token.
    const accessToken = localStorage.getItem('access_token')
    if (!enabled || !quizId || !accessToken) return

    esRef.current?.close()
    setLiveQuestions([])

    esRef.current = createJobSSE(quizId, accessToken, {
      onStatus: (payload: SSEStatusPayload) => {
        setStatus(payload.status)
        setProgress(payload.progress)
        setMessage(payload.message)
        setChunksTotal(payload.chunks_total ?? 1)
        setChunksCompleted(payload.chunks_completed ?? 0)

        if (payload.status === 'completed') {
          esRef.current?.close()
          onCompleted?.()
        } else if (payload.status === 'failed') {
          esRef.current?.close()
          onFailed?.(payload.message)
        }
      },

      onQuestions: (newQuestions: Question[]) => {
        // Append arriving questions — each chunk delivers its batch
        setLiveQuestions((prev) => {
          const existingIds = new Set(prev.map((q) => q.id))
          const fresh = newQuestions.filter((q) => !existingIds.has(q.id))
          return [...prev, ...fresh].sort((a, b) => a.question_number - b.question_number)
        })
      },

      onError: (msg) => {
        esRef.current?.close()
        onFailed?.(msg)
      },
    })

    return () => esRef.current?.close()
  }, [quizId, enabled])

  return { status, progress, message, chunksTotal, chunksCompleted, liveQuestions }
}
