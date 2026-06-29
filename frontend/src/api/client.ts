import axios from 'axios'
import type { AxiosInstance } from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  // Include HttpOnly refresh-token cookie on same-origin requests
  withCredentials: true,
})

// ── Request interceptor: attach Bearer token ────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response interceptor: handle 401 → silent refresh or logout ─────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      try {
        // Refresh token is in the HttpOnly cookie — no body needed.
        // withCredentials ensures the cookie is sent.
        const { data } = await axios.post(
          `${BASE_URL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        )
        localStorage.setItem('access_token', data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return apiClient(original)
      } catch {
        // Refresh failed — cookie expired or revoked; send to login
        localStorage.removeItem('access_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  },
)
