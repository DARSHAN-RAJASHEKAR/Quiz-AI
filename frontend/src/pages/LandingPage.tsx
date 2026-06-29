import { Link } from 'react-router-dom'
import { FileText, Lightbulb, Upload, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'

const FEATURES = [
  { icon: Upload, title: 'Upload PDFs', desc: 'Drop a textbook, lecture notes, or any PDF and get an instant quiz.' },
  { icon: FileText, title: 'Paste text', desc: 'Copy any passage or article and turn it into study material.' },
  { icon: Lightbulb, title: 'Describe a topic', desc: 'Just name a subject — Claude generates questions from its knowledge.' },
  { icon: CheckCircle, title: 'Mix question types', desc: 'MCQ, true/false, and short answer — pick one or blend them.' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[68px]">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="font-semibold text-[17px] tracking-tight text-gray-900">QuizAI</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/register"><Button>Get started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-16 sm:pt-24 text-center">
        <div className="inline-flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-full px-3.5 py-1.5 mb-6">
          <span className="w-1.5 h-1.5 bg-blue-600 rounded-[1px] rotate-45" />
          <span className="text-[12.5px] font-medium text-gray-600">Powered by Claude</span>
        </div>
        <h1 className="text-[40px] sm:text-[58px] font-semibold text-gray-900 leading-[1.04] tracking-[-0.035em] mb-5">
          Turn any content into<br className="hidden sm:block" /> an instant quiz
        </h1>
        <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-xl mx-auto">
          Upload a PDF, paste text, or just name a topic. QuizAI writes multiple-choice,
          true/false, and short-answer questions in seconds.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/register"><Button size="lg" className="w-full sm:w-auto">Start for free</Button></Link>
          <Link to="/login"><Button variant="secondary" size="lg" className="w-full sm:w-auto">Sign in</Button></Link>
        </div>
      </section>

      {/* Product preview */}
      <section className="max-w-3xl mx-auto px-4 mt-16">
        <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-[0_40px_80px_-40px_rgba(0,0,0,0.25)]">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
            <span className="w-2.5 h-2.5 rounded-full bg-gray-200" />
          </div>
          <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
            <div className="flex items-end justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-gray-900">Your library</h3>
                <p className="text-xs text-gray-400 mt-1">12 quizzes · 8 completed this month</p>
              </div>
              <span className="bg-ink text-white rounded-lg px-3 py-2 text-xs font-medium">+ New quiz</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-4 py-3">
                <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-600">OC</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">Organic Chemistry — Alkenes</p>
                  <p className="text-xs text-gray-400 mt-0.5">24 questions · scored 88%</p>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-green-600 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-600" />Completed
                </span>
              </div>
              <div className="flex items-center gap-3 border border-blue-200 bg-blue-50/40 rounded-xl px-4 py-3">
                <span className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-xs font-semibold text-blue-600">WH</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">World History: The Cold War</p>
                  <div className="h-1 max-w-[160px] bg-blue-100 rounded-full overflow-hidden mt-1.5">
                    <div className="w-[35%] h-full bg-blue-600" />
                  </div>
                </div>
                <span className="text-xs text-blue-600 font-medium whitespace-nowrap">Generating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 py-20 sm:py-28">
        <p className="text-xs font-mono uppercase tracking-[0.06em] text-gray-400 text-center mb-2.5">Three ways in</p>
        <h2 className="text-2xl sm:text-[32px] font-semibold tracking-tight text-gray-900 text-center mb-10">
          From source to quiz in seconds
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border border-gray-200 rounded-2xl p-6">
              <div className="w-9 h-9 bg-blue-50 rounded-[10px] flex items-center justify-center mb-4">
                <Icon className="h-[18px] w-[18px] text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
