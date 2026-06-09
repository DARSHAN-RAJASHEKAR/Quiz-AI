import { Link } from 'react-router-dom'
import { BrainCircuit, FileText, Lightbulb, Upload, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'

const FEATURES = [
  { icon: Upload, title: 'Upload PDFs', desc: 'Upload textbooks, notes, or any PDF and get an instant quiz.' },
  { icon: FileText, title: 'Paste Text', desc: 'Copy-paste any text content and turn it into study material.' },
  { icon: Lightbulb, title: 'Describe a Topic', desc: 'Just name a topic — Claude generates questions from its knowledge.' },
  { icon: CheckCircle, title: 'MCQ, T/F, Short Answer', desc: 'Choose from multiple question types or mix them all.' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
            <BrainCircuit className="h-6 w-6" />
            <span>QuizAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/register"><Button>Get started</Button></Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <span>⚡</span> Powered by Claude AI
        </div>
        <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Turn any content into<br /><span className="text-blue-600">an instant quiz</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Upload a PDF, paste text, or describe a topic. Get AI-generated MCQs, true/false, and short answer questions in seconds.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/register"><Button size="lg">Start for free →</Button></Link>
          <Link to="/login"><Button variant="secondary" size="lg">Sign in</Button></Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-gray-50 rounded-2xl p-6">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
