import { Link, useNavigate } from 'react-router-dom'
import { BrainCircuit, LogOut, LayoutDashboard, PlusCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/auth'
import toast from 'react-hot-toast'

export function Navbar() {
  const { user, clearAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await authApi.logout()
    } finally {
      clearAuth()
      navigate('/login')
      toast.success('Logged out successfully')
    }
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/dashboard" className="flex items-center gap-2 text-blue-600 font-bold text-lg">
            <BrainCircuit className="h-6 w-6" />
            <span>QuizAI</span>
          </Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link to="/quiz/create" className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900">
              <PlusCircle className="h-4 w-4" />
              New Quiz
            </Link>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sm text-gray-600 hidden sm:block">{user.full_name}</span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
