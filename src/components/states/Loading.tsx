import { Spinner } from '../ui/Spinner'

type LoadingProps = {
  label?: string
}

export function Loading({ label = 'Cargando…' }: LoadingProps) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 py-12 text-text-muted"
    >
      <Spinner className="size-5 text-accent" />
      <span>{label}</span>
    </div>
  )
}
