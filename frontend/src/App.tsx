import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { CreateQuizPage } from './pages/CreateQuizPage'
import { GeneratingPage } from './pages/GeneratingPage'
import { QuizDetailPage } from './pages/QuizDetailPage'
import { AttemptPage } from './pages/AttemptPage'
import { ResultsPage } from './pages/ResultsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/quiz/create" element={<CreateQuizPage />} />
            <Route path="/quiz/:quizId/generating" element={<GeneratingPage />} />
            <Route path="/quiz/:quizId" element={<QuizDetailPage />} />
            <Route path="/quiz/:quizId/attempt" element={<AttemptPage />} />
            <Route path="/quiz/:quizId/results/:attemptId" element={<ResultsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '10px', fontSize: '14px' },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
