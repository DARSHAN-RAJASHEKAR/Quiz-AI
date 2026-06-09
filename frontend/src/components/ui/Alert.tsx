import { clsx } from 'clsx'
import { AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

type AlertType = 'success' | 'error' | 'warning' | 'info'

const config: Record<AlertType, { icon: typeof Info; classes: string }> = {
  success: { icon: CheckCircle, classes: 'bg-green-50 border-green-200 text-green-800' },
  error: { icon: XCircle, classes: 'bg-red-50 border-red-200 text-red-800' },
  warning: { icon: AlertCircle, classes: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  info: { icon: Info, classes: 'bg-blue-50 border-blue-200 text-blue-800' },
}

export function Alert({ type = 'info', children }: { type?: AlertType; children: ReactNode }) {
  const { icon: Icon, classes } = config[type]
  return (
    <div className={clsx('flex gap-3 items-start p-4 rounded-lg border', classes)}>
      <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
      <div className="text-sm">{children}</div>
    </div>
  )
}
