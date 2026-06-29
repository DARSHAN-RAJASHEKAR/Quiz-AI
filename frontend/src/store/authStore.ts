import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types/auth'

interface AuthState {
  user: User | null
  accessToken: string | null
  // Refresh token is stored in an HttpOnly cookie set by the server —
  // NOT in localStorage, so XSS cannot read or exfiltrate it.
  setAuth: (user: User, accessToken: string) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      setAuth: (user, accessToken) => {
        localStorage.setItem('access_token', accessToken)
        set({ user, accessToken })
      },

      setAccessToken: (token) => {
        localStorage.setItem('access_token', token)
        set({ accessToken: token })
      },

      clearAuth: () => {
        localStorage.removeItem('access_token')
        set({ user: null, accessToken: null })
      },

      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
      }),
    },
  ),
)
