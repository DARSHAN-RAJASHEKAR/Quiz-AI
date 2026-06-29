import { fetchEventSource } from '@microsoft/fetch-event-source'
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
  onConnectionError?: (err: unknown) => void
}

/**
 * Open an SSE stream for job status.
 * Uses fetchEventSource so the Authorization header can be set —
 * the native EventSource API doesn't support custom headers.
 *
 * Returns an AbortController; call .abort() to close the stream.
 */
export function createJobSSE(
  quizId: string,
  token: string,
  callbacks: SSECallbacks,
): AbortController {
  const ctrl = new AbortController()
  const url = `${BASE_URL}/api/v1/jobs/${quizId}/status/stream`

  fetchEventSource(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/event-stream',
    },
    signal: ctrl.signal,

    onmessage(ev) {
      try {
        if (ev.event === 'status') {
          callbacks.onStatus?.(JSON.parse(ev.data) as SSEStatusPayload)
        } else if (ev.event === 'questions') {
          callbacks.onQuestions?.(JSON.parse(ev.data) as Question[])
        } else if (ev.event === 'error') {
          const payload = JSON.parse(ev.data) as SSEStatusPayload
          callbacks.onError?.(payload.message || 'Generation failed')
        }
      } catch { /* ignore parse errors */ }
    },

    onerror(err) {
      callbacks.onConnectionError?.(err)
      // Don't retry on error — throw so fetchEventSource stops
      throw err
    },

    // Don't auto-reconnect after the server closes the stream
    openWhenHidden: true,
  }).catch(() => { /* stream closed or aborted — expected */ })

  return ctrl
}
