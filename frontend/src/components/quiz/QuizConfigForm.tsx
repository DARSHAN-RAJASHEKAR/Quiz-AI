import type { Difficulty, QuizType } from '../../types/quiz'

interface QuizConfigFormProps {
  title: string
  onTitleChange: (v: string) => void
  quizType: QuizType
  onQuizTypeChange: (v: QuizType) => void
  numQuestions: number
  onNumQuestionsChange: (v: number) => void
  difficulty: Difficulty
  onDifficultyChange: (v: Difficulty) => void
}

const QUIZ_TYPES: { value: QuizType; label: string; desc: string }[] = [
  { value: 'mcq', label: 'Multiple Choice', desc: '4 options, one correct answer' },
  { value: 'true_false', label: 'True / False', desc: 'Simple binary statements' },
  { value: 'short_answer', label: 'Short Answer', desc: 'Free-text responses' },
  { value: 'mixed', label: 'Mixed', desc: '50% MCQ + 30% T/F + 20% Short Answer' },
]

const DIFFICULTIES: { value: Difficulty; label: string; desc: string }[] = [
  { value: 'easy', label: 'Easy', desc: 'Factual recall' },
  { value: 'medium', label: 'Medium', desc: 'Understanding' },
  { value: 'hard', label: 'Hard', desc: 'Synthesis' },
]

export function QuizConfigForm({
  title, onTitleChange,
  quizType, onQuizTypeChange,
  numQuestions, onNumQuestionsChange,
  difficulty, onDifficultyChange,
}: QuizConfigFormProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Quiz title</label>
        <input
          type="text"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Give your quiz a title..."
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </div>

      {/* Quiz type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Question type</label>
        <div className="grid grid-cols-2 gap-2">
          {QUIZ_TYPES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => onQuizTypeChange(value)}
              className={`text-left p-3 rounded-lg border-2 transition-colors ${
                quizType === value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Number of questions */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Number of questions: <span className="text-blue-600 font-semibold">{numQuestions}</span>
        </label>
        <div className="grid grid-cols-6 gap-2">
          {[10, 20, 40, 60, 80, 100].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onNumQuestionsChange(n)}
              className={`py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                numQuestions === n
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
        <div className="flex gap-2">
          {DIFFICULTIES.map(({ value, label, desc }) => (
            <button
              key={value}
              type="button"
              onClick={() => onDifficultyChange(value)}
              className={`flex-1 py-2 px-3 rounded-lg border-2 text-center transition-colors ${
                difficulty === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
