import { apiClient } from './client'
import type { QuizDetail, QuizListResponse, QuizSummary } from '../types/quiz'

export const quizzesApi = {
  create: async (formData: FormData): Promise<QuizSummary> => {
    const res = await apiClient.post<QuizSummary>('/quizzes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  },

  list: async (params?: {
    page?: number
    size?: number
    status?: string
    quiz_type?: string
  }): Promise<QuizListResponse> => {
    const res = await apiClient.get<QuizListResponse>('/quizzes', { params })
    return res.data
  },

  get: async (quizId: string): Promise<QuizDetail> => {
    const res = await apiClient.get<QuizDetail>(`/quizzes/${quizId}`)
    return res.data
  },

  delete: async (quizId: string): Promise<void> => {
    await apiClient.delete(`/quizzes/${quizId}`)
  },

  getStatus: async (quizId: string): Promise<{ status: string; error_message?: string }> => {
    const res = await apiClient.get(`/jobs/${quizId}/status`)
    return res.data
  },

  validatePdf: async (file: File): Promise<void> => {
    const formData = new FormData()
    formData.append('file', file)
    await apiClient.post('/quizzes/validate-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
