import { Button } from '../ui/Button'

type ErrorStateProps = {
  message?: string
  onRetry?: () => void
  retrying?: boolean
}

export function ErrorState({
  message = 'No pudimos cargar la información.',
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-card border border-[rgb(239_68_68/0.3)] bg-[rgb(239_68_68/0.08)] p-6 text-center"
    >
      <p className="text-state-overdue">{message}</p>
      {onRetry && (
        <Button
          variant="secondary"
          className="mt-4"
          onClick={onRetry}
          busy={retrying}
        >
          Reintentar
        </Button>
      )}
    </div>
  )
}
