import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import { getProject, projectKeys, type ProjectDetail as ProjectDetailData } from '../api/projects'
import { PageTitle } from '../components/PageTitle'
import { BudgetStatusBadge, ProjectStatusBadge } from '../components/StatusBadges'
import { Empty } from '../components/states/Empty'
import { ErrorState } from '../components/states/ErrorState'
import { Loading } from '../components/states/Loading'
import { formatDate, formatMoney } from '../lib/format'

function ProjectContent({ project }: { project: ProjectDetailData }) {
  const current = project.current_budget
  const previous = project.budgets.filter((budget) => budget.id !== current?.id).reverse()

  return (
    <>
      <PageTitle>{project.name}</PageTitle>
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <ProjectStatusBadge status={project.status} />
          {project.started_on && <p className="text-text-muted">Inicio: <time dateTime={project.started_on}>{formatDate(project.started_on)}</time></p>}
          {project.closed_on && <p className="text-text-muted">Cierre: <time dateTime={project.closed_on}>{formatDate(project.closed_on)}</time></p>}
        </div>
        {project.description && <p className="max-w-prose whitespace-pre-wrap wrap-break-word text-text-muted">{project.description}</p>}
      </div>

      {current ? (
        <section aria-labelledby="current-budget" className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-border-subtle bg-surface p-6">
          <div className="space-y-2">
            <h2 id="current-budget" className="text-lg font-semibold">Presupuesto vigente</h2>
            <p className="text-text-muted">Versión {current.version}</p>
            <BudgetStatusBadge status={current.status} />
          </div>
          <div className="space-y-1 text-right">
            <p className="text-sm text-text-muted">Total</p>
            <p className="font-mono text-xl font-semibold tabular-nums">{formatMoney(current.total)}</p>
          </div>
        </section>
      ) : (
        <Empty title="Sin presupuesto vigente" description="Cuando Adavra te envíe un presupuesto para este proyecto, aparecerá acá." />
      )}

      {previous.length > 0 && (
        <section aria-labelledby="previous-budgets" className="mt-8 space-y-3">
          <h2 id="previous-budgets" className="text-lg font-semibold">Versiones anteriores</h2>
          <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
            {previous.map((budget) => (
              <li key={budget.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span>Versión {budget.version}</span>
                  <BudgetStatusBadge status={budget.status} />
                </div>
                <span className="font-mono tabular-nums">{formatMoney(budget.total)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

export function ProjectDetail() {
  const { id = '' } = useParams()
  const query = useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: ({ signal }) => getProject(id, signal),
  })

  return (
    <>
      <Link to="/" className="mb-4 inline-flex gap-2 rounded-control text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <span aria-hidden="true">←</span>
        Mis proyectos
      </Link>
      {query.isPending && <Loading label="Cargando proyecto…" />}
      {query.isLoadingError && (query.error instanceof ApiError && query.error.status === 404 ? (
        <Empty title="Proyecto no encontrado" description="Volvé al listado para ver tus proyectos disponibles." />
      ) : (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} retrying={query.isFetching} />
      ))}
      {query.data && <ProjectContent project={query.data} />}
    </>
  )
}
