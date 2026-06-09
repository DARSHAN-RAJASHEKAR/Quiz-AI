import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { BrainCircuit } from 'lucide-react'
import toast from 'react-hot-toast'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { authApi } from '../api/auth'

const schema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

type FormData = z.infer<typeof schema>

export function RegisterPage() {
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      await authApi.register({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
      })
      toast.success('Account created! Please sign in.')
      navigate('/login')
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      toast.error(typeof detail === 'string' ? detail : 'Registration failed')
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
          <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Full name"
              placeholder="Jane Smith"
              error={errors.full_name?.message}
              {...register('full_name')}
            />
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
              placeholder="Min. 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="Re-enter password"
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />
            <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
              Create account
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
