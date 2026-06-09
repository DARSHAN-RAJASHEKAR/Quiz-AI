import { apiClient } from './client'
import type { AttemptResponse, AttemptSubmitRequest } from '../types/attempt'

export const attemptsApi = {
  submit: async (data: AttemptSubmitRequest): Promise<AttemptResponse> => {
    const res = await apiClient.post<AttemptResponse>('/attempts', data)
    return res.data
  },

  list: async (params?: { quiz_id?: string; page?: number; size?: number }) => {
    const res = await apiClient.get('/attempts', { params })
    return res.data
  },

  get: async (attemptId: string): Promise<AttemptResponse> => {
    const res = await apiClient.get<AttemptResponse>(`/attempts/${attemptId}`)
    return res.data
  },
}
