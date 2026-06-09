import { apiClient } from './client'
import type { RegisterRequest, TokenResponse, User } from '../types/auth'

export const authApi = {
  register: async (data: RegisterRequest): Promise<User> => {
    const res = await apiClient.post<User>('/auth/register', data)
    return res.data
  },

  login: async (email: string, password: string): Promise<TokenResponse> => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)

    const res = await apiClient.post<TokenResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return res.data
  },

  me: async (): Promise<User> => {
    const res = await apiClient.get<User>('/auth/me')
    return res.data
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  },
}
