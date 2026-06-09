import { create } from 'zustand'

interface AttemptState {
  quizId: string | null
  answers: Record<string, string>
  currentQuestion: number
  setQuizId: (id: string) => void
  setAnswer: (questionId: string, answer: string) => void
  setCurrentQuestion: (n: number) => void
  resetAttempt: () => void
}

export const useAttemptStore = create<AttemptState>((set) => ({
  quizId: null,
  answers: {},
  currentQuestion: 0,

  setQuizId: (id) => set({ quizId: id }),
  setAnswer: (questionId, answer) =>
    set((state) => ({ answers: { ...state.answers, [questionId]: answer } })),
  setCurrentQuestion: (n) => set({ currentQuestion: n }),
  resetAttempt: () => set({ quizId: null, answers: {}, currentQuestion: 0 }),
}))
