import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
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
      setAuth(user, tokens.access_token)
      navigate('/dashboard')
      toast.success(`Welcome back, ${user.full_name}!`)
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[392px]">
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <Logo size={28} />
          <span className="text-[17px] font-semibold tracking-tight text-gray-900">QuizAI</span>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.2)] p-8">
          <h1 className="text-[22px] font-semibold tracking-tight text-gray-900 text-center mb-1">Welcome back</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Sign in to your QuizAI account</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        <p className="text-sm text-gray-500 text-center mt-5">
          New to QuizAI?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
