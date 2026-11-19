import type { ReactNode } from 'react'

type EmptyProps = {
  title: string
  description?: string
  action?: ReactNode
}

export function Empty({ title, description, action }: EmptyProps) {
  return (
    <div className="rounded-card border border-border-subtle bg-surface p-6 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      {description && <p className="mt-2 text-text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
