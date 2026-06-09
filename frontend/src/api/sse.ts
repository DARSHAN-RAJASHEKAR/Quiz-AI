import type { Question } from '../types/quiz'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export type SSEEventType = 'status' | 'questions' | 'error'

export interface SSEStatusPayload {
  quiz_id: string
  status: string
  progress: number
  message: string
  chunks_total: number
  chunks_completed: number
  questions_ready: number
}

export interface SSECallbacks {
  onStatus?: (payload: SSEStatusPayload) => void
  /** Called every time a new batch of questions arrives from a chunk */
  onQuestions?: (questions: Question[]) => void
  onError?: (msg: string) => void
  onConnectionError?: (err: Event) => void
}

export function createJobSSE(
  quizId: string,
  token: string,
  callbacks: SSECallbacks,
): EventSource {
  const url = `${BASE_URL}/api/v1/jobs/${quizId}/status/stream?token=${encodeURIComponent(token)}`
  const es = new EventSource(url)

  es.addEventListener('status', (e: MessageEvent) => {
    try {
      callbacks.onStatus?.(JSON.parse(e.data) as SSEStatusPayload)
    } catch { /* ignore */ }
  })

  es.addEventListener('questions', (e: MessageEvent) => {
    try {
      callbacks.onQuestions?.(JSON.parse(e.data) as Question[])
    } catch { /* ignore */ }
  })

  es.addEventListener('error', (e: MessageEvent) => {
    try {
      const payload = JSON.parse(e.data) as SSEStatusPayload
      callbacks.onError?.(payload.message || 'Generation failed')
    } catch {
      callbacks.onConnectionError?.(e)
    }
  })

  es.onerror = (e) => callbacks.onConnectionError?.(e)

  return es
}
