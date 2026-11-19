import type { BudgetStatus, ProjectStatus } from '../api/projects'

const toneClasses = {
  neutral: 'bg-border-subtle text-text-muted',
  pending: 'bg-state-pending/15 text-state-pending',
  info: 'bg-state-partial/15 text-state-partial',
  success: 'bg-state-paid/15 text-state-paid',
  danger: 'bg-state-overdue/15 text-state-overdue',
}

type BadgeProps = {
  label: string
  tone: keyof typeof toneClasses
}

const projectStatuses = {
  survey: { label: 'En relevamiento', tone: 'neutral' },
  in_progress: { label: 'En curso', tone: 'info' },
  delivered: { label: 'Entregado', tone: 'success' },
  closed: { label: 'Cerrado', tone: 'neutral' },
} satisfies Record<ProjectStatus, BadgeProps>

const budgetStatuses = {
  sent: { label: 'Pendiente de aprobación', tone: 'pending' },
  approved: { label: 'Aprobado', tone: 'success' },
  rejected: { label: 'Rechazado', tone: 'danger' },
} satisfies Record<BudgetStatus, BadgeProps>

function Badge({ label, tone }: BadgeProps) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}>{label}</span>
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge {...projectStatuses[status]} />
}

export function BudgetStatusBadge({ status }: { status: BudgetStatus }) {
  return <Badge {...budgetStatuses[status]} />
}
