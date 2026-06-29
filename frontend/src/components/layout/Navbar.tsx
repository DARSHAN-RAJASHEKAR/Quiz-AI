import { Link, useNavigate } from 'react-router-dom'
import { LogOut, LayoutDashboard, PlusCircle } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api/auth'
import { Logo } from '../ui/Logo'
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
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-semibold text-[15px] tracking-tight text-gray-900">QuizAI</span>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500 hidden sm:block">Library</span>
          </Link>

          {/* Nav links */}
          <div className="hidden sm:flex items-center gap-1">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              to="/quiz/create"
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              New Quiz
            </Link>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-gray-600 hidden sm:block">{user.full_name}</span>
                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
                  {user.full_name?.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </span>
              </div>
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
