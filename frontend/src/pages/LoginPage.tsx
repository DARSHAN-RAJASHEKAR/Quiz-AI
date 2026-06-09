import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { BrainCircuit } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { authApi } from '../api/auth'
import { useAuthStore } from '../store/authStore'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      const tokens = await authApi.login(data.email, data.password)
      // Write token to localStorage BEFORE calling me(), so the Axios
      // request interceptor can attach it to the Authorization header.
      localStorage.setItem('access_token', tokens.access_token)
      const user = await authApi.me()
      setAuth(user, tokens.access_token, tokens.refresh_token)
      navigate('/dashboard')
      toast.success(`Welcome back, ${user.full_name}!`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BrainCircuit className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">QuizAI</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Sign in to your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />
            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
