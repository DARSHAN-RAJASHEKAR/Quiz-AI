interface LogoProps {
  size?: number
  className?: string
}

/**
 * QuizAI brand mark — a near-black rounded square with a white diamond.
 * Purely presentational; safe to drop anywhere the wordmark appears.
 */
export function Logo({ size = 28, className }: LogoProps) {
  const inner = Math.round(size * 0.4)
  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: '#1c1b18',
        flex: 'none',
      }}
    >
      <span
        style={{
          width: inner,
          height: inner,
          borderRadius: 2,
          background: '#fff',
          transform: 'rotate(45deg)',
        }}
      />
    </span>
  )
}
