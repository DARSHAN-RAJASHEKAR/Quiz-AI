interface ProgressBarProps {
  value: number // 0–1
  label?: string
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const pct = Math.min(100, Math.round(value * 100))
  return (
    <div className="w-full">
      {label && <p className="text-sm text-gray-600 mb-1">{label}</p>}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">{pct}%</p>
    </div>
  )
}
