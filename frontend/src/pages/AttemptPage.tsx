import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'
import { Loader2, CheckCircle2, Lock } from 'lucide-react'
import { quizzesApi } from '../api/quizzes'
import { attemptsApi } from '../api/attempts'
import { useAttemptStore } from '../store/attemptStore'
import { useSSE } from '../hooks/useSSE'
import { PageWrapper } from '../components/layout/PageWrapper'
import { MCQQuestion } from '../components/attempt/MCQQuestion'
import { TrueFalseQuestion } from '../components/attempt/TrueFalseQuestion'
import { ShortAnswerQuestion } from '../components/attempt/ShortAnswerQuestion'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { PageSpinner } from '../components/ui/Spinner'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import type { Question } from '../types/quiz'

export function AttemptPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const [submitting, setSubmitting] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const { answers, setAnswer, resetAttempt } = useAttemptStore()
  const queryClient = useQueryClient()

  // Fetch quiz to check if it's already completed or still generating
  const { data: quiz, isLoading } = useQuery({
    queryKey: ['quiz', quizId],
    queryFn: () => quizzesApi.get(quizId!),
    enabled: !!quizId,
  })

  // Keep SSE open if quiz is still processing — streams new questions live
  const needsSSE = quiz?.status === 'processing' || quiz?.status === 'pending'
  const { liveQuestions, progress, chunksTotal, chunksCompleted, status: sseStatus } = useSSE({
    quizId: quizId!,
    enabled: !!quizId && needsSSE,
    onCompleted: () => {
      // Bust the cache so future visits (or page refresh) load all questions
      queryClient.invalidateQueries({ queryKey: ['quiz', quizId] })
    },
    onFailed: (msg) => {
      toast.error(`Generation failed: ${msg}`)
      navigate('/dashboard', { replace: true })
    },
  })

  if (isLoading) return <PageWrapper><PageSpinner /></PageWrapper>
  if (!quiz) return <PageWrapper><p>Quiz not found.</p></PageWrapper>

  // SSE reports completed before TanStack Query refetches — trust SSE first
  const isAllDone = !needsSSE || sseStatus === 'completed'
  const isStillGenerating = needsSSE && !isAllDone

  // Always prefer liveQuestions when SSE has delivered any —
  // the TanStack Query cache is stale until invalidation + refetch completes.
  // Fall back to quiz.questions only when SSE was never opened (quiz already done on load).
  const allQuestions: Question[] = liveQuestions.length > 0
    ? liveQuestions
    : (quiz.questions ?? [])

  const total    = quiz.num_questions  // expected total, even if not all loaded yet
  const currentQ = allQuestions[currentIdx] ?? null
  // isLast = user is on the FINAL expected question, not just the last loaded one.
  // Prevents Submit appearing on Q15 when Q16–30 are still loading.
  const isLast   = currentIdx === total - 1
  const answered = Object.keys(answers).length
  const canSubmit = isAllDone && answered > 0

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const attempt = await attemptsApi.submit({ quiz_id: quizId!, answers })
      resetAttempt()
      navigate(`/quiz/${quizId}/results/${attempt.id}`)
    } catch {
      toast.error('Failed to submit attempt')
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-3xl mx-auto">

        {/* Generating banner — shown while more questions are loading */}
        <AnimatePresence>
          {isStillGenerating && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-blue-700 font-medium">
                    {chunksTotal > 1
                      ? `Loading questions from section ${Math.min(chunksCompleted + 1, chunksTotal)} of ${chunksTotal}...`
                      : 'Generating remaining questions...'}
                  </p>
                  <p className="text-xs text-blue-500 mt-0.5">
                    {allQuestions.length} of {total} questions ready — keep answering!
                  </p>
                </div>
                <div className="w-24 flex-shrink-0">
                  <ProgressBar value={progress} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-6">
          {/* Question nav sidebar */}
          <div className="hidden sm:block w-36 flex-shrink-0">
            <div className="sticky top-24">
              <p className="text-xs text-gray-500 mb-2 font-medium">QUESTIONS</p>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: total }).map((_, i) => {
                  const q        = allQuestions[i]
                  const isLoaded = !!q
                  const isAnswered = q ? !!answers[q.id] : false
                  const isCurrent  = i === currentIdx

                  return (
                    <button
                      key={i}
                      onClick={() => isLoaded && setCurrentIdx(i)}
                      disabled={!isLoaded}
                      title={!isLoaded ? 'Not loaded yet' : undefined}
                      className={clsx(
                        'w-full aspect-square rounded text-xs font-medium transition-colors',
                        isCurrent && isLoaded
                          ? 'bg-blue-600 text-white'
                          : isAnswered
                          ? 'bg-green-100 text-green-700'
                          : isLoaded
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-gray-50 text-gray-300 cursor-not-allowed',
                      )}
                    >
                      {isLoaded ? i + 1 : <Lock className="h-2.5 w-2.5 mx-auto" />}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-400 mt-3">{answered}/{total} answered</p>
              {isStillGenerating && (
                <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </p>
              )}
            </div>
          </div>

          {/* Main question area */}
          <div className="flex-1">
            {currentQ ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 font-medium">
                          Question {currentIdx + 1} of {total}
                        </p>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {currentQ.question_type.replace('_', ' ')}
                        </span>
                      </div>
                    </CardHeader>
                    <CardBody>
                      {currentQ.question_type === 'mcq' && (
                        <MCQQuestion
                          question={currentQ}
                          selectedAnswer={answers[currentQ.id]}
                          onAnswer={(v) => setAnswer(currentQ.id, v)}
                        />
                      )}
                      {currentQ.question_type === 'true_false' && (
                        <TrueFalseQuestion
                          question={currentQ}
                          selectedAnswer={answers[currentQ.id]}
                          onAnswer={(v) => setAnswer(currentQ.id, v)}
                        />
                      )}
                      {currentQ.question_type === 'short_answer' && (
                        <ShortAnswerQuestion
                          question={currentQ}
                          answer={answers[currentQ.id]}
                          onAnswer={(v) => setAnswer(currentQ.id, v)}
                        />
                      )}

                      {/* Navigation */}
                      <div className="flex justify-between mt-8">
                        <Button
                          variant="secondary"
                          disabled={currentIdx === 0}
                          onClick={() => setCurrentIdx((i) => i - 1)}
                        >
                          Previous
                        </Button>

                        <div className="flex items-center gap-3">
                          {/* Next button — shows loading state if next question not ready yet */}
                          {!isLast && (
                            <Button
                              onClick={() => setCurrentIdx((i) => i + 1)}
                              disabled={!allQuestions[currentIdx + 1]}
                            >
                              {allQuestions[currentIdx + 1] ? (
                                'Next'
                              ) : (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Loading next...
                                </span>
                              )}
                            </Button>
                          )}

                          {/* Submit — only on last question, only when all done */}
                          {isLast && (
                            <Button
                              onClick={handleSubmit}
                              loading={submitting}
                              disabled={!canSubmit}
                              title={!isAllDone ? 'Wait for all questions to load' : undefined}
                            >
                              {isAllDone ? (
                                <span className="flex items-center gap-2">
                                  <CheckCircle2 className="h-4 w-4" />
                                  Submit ({answered}/{total} answered)
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Waiting for all questions...
                                </span>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              </AnimatePresence>
            ) : (
              /* Waiting for very first question */
              <Card>
                <CardBody>
                  <div className="flex flex-col items-center py-12 text-gray-400 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-sm">Loading your first question...</p>
                  </div>
                </CardBody>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}
