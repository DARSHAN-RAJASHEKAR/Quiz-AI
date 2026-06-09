import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { PageWrapper } from '../components/layout/PageWrapper'
import { SourceInput } from '../components/quiz/SourceInput'
import { QuizConfigForm } from '../components/quiz/QuizConfigForm'
import { Button } from '../components/ui/Button'
import { Card, CardBody, CardHeader } from '../components/ui/Card'
import { quizzesApi } from '../api/quizzes'
import type { Difficulty, QuizType, SourceType } from '../types/quiz'

const STEPS = ['Source', 'Configuration', 'Confirm']

export function CreateQuizPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [validatingPdf, setValidatingPdf] = useState(false)

  // Source state
  const [sourceType, setSourceType] = useState<SourceType>('topic')
  const [sourceContent, setSourceContent] = useState('')
  const [file, setFile] = useState<File | null>(null)

  // Config state
  const [title, setTitle] = useState('')
  const [quizType, setQuizType] = useState<QuizType>('mcq')
  const [numQuestions, setNumQuestions] = useState(10)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')

  const canProceedStep0 = () => {
    if (sourceType === 'pdf') return !!file
    return sourceContent.trim().length > 0
  }

  const canProceedStep1 = () => title.trim().length > 0

  const handleContinue = async () => {
    // For PDF source on step 0, validate before advancing
    if (step === 0 && sourceType === 'pdf' && file) {
      setValidatingPdf(true)
      try {
        await quizzesApi.validatePdf(file)
        setStep(1)
      } catch (err: any) {
        const detail = err?.response?.data?.detail
        toast.error(detail || 'Could not read this PDF. Please upload a digital PDF with selectable text.')
        // Stay on step 0 — don't advance
      } finally {
        setValidatingPdf(false)
      }
      return
    }
    setStep(step + 1)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('title', title)
      formData.append('source_type', sourceType)
      formData.append('quiz_type', quizType)
      formData.append('num_questions', String(numQuestions))
      formData.append('difficulty', difficulty)

      if (sourceType === 'pdf' && file) {
        formData.append('file', file)
      } else {
        formData.append('source_content', sourceContent)
      }

      const quiz = await quizzesApi.create(formData)
      navigate(`/quiz/${quiz.id}/generating`)
      toast.success('Quiz queued! Generating questions...')
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to create quiz')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto">
        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? '✓' : i + 1}
              </div>
              <span className={`ml-2 text-sm font-medium ${i === step ? 'text-blue-600' : 'text-gray-500'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="mx-4 h-px w-12 bg-gray-200" />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 0 && 'Choose your content source'}
              {step === 1 && 'Configure your quiz'}
              {step === 2 && 'Review & generate'}
            </h2>
          </CardHeader>
          <CardBody>
            {step === 0 && (
              <SourceInput
                sourceType={sourceType}
                onSourceTypeChange={setSourceType}
                sourceContent={sourceContent}
                onSourceContentChange={setSourceContent}
                file={file}
                onFileChange={setFile}
              />
            )}

            {step === 1 && (
              <QuizConfigForm
                title={title}
                onTitleChange={setTitle}
                quizType={quizType}
                onQuizTypeChange={setQuizType}
                numQuestions={numQuestions}
                onNumQuestionsChange={setNumQuestions}
                difficulty={difficulty}
                onDifficultyChange={setDifficulty}
              />
            )}

            {step === 2 && (
              <div className="space-y-4 text-sm">
                <div className="bg-gray-50 rounded-xl p-5 space-y-3">
                  <Row label="Source" value={sourceType === 'pdf' ? `📄 ${file?.name}` : sourceType === 'text' ? '📝 Pasted text' : `💡 Topic: ${sourceContent}`} />
                  <Row label="Title" value={title} />
                  <Row label="Type" value={quizType.replace('_', ' ')} />
                  <Row label="Questions" value={String(numQuestions)} />
                  <Row label="Difficulty" value={difficulty} />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Generation typically takes 15–60 seconds depending on content length.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              {step > 0 ? (
                <Button variant="secondary" onClick={() => setStep(step - 1)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : <div />}

              {step < 2 ? (
                <Button
                  onClick={handleContinue}
                  loading={validatingPdf}
                  disabled={step === 0 ? !canProceedStep0() : !canProceedStep1()}
                >
                  {validatingPdf ? 'Checking PDF...' : 'Continue'}
                  {!validatingPdf && <ChevronRight className="h-4 w-4 ml-1" />}
                </Button>
              ) : (
                <Button onClick={handleSubmit} loading={submitting}>
                  🚀 Generate Quiz
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 font-medium">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  )
}
