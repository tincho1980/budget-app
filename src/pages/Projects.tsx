import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getProjects, projectKeys, type Project } from '../api/projects'
import { PageTitle } from '../components/PageTitle'
import { ProjectStatusBadge } from '../components/StatusBadges'
import { Empty } from '../components/states/Empty'
import { ErrorState } from '../components/states/ErrorState'
import { Loading } from '../components/states/Loading'
import { formatDate } from '../lib/format'

function ProjectRow({ project }: { project: Project }) {
  const pendingApproval = project.current_budget?.pending_approval
  const date = project.closed_on
    ? `Cerrado el ${formatDate(project.closed_on)}`
    : project.started_on && `Iniciado el ${formatDate(project.started_on)}`

  return (
    <li>
      <Link
        to={`/projects/${project.id}`}
        aria-labelledby={`project-name-${project.id}`}
        aria-describedby={pendingApproval ? `project-pending-${project.id}` : undefined}
        className="flex items-center justify-between gap-4 rounded-card border border-border-subtle bg-surface p-5 transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:p-6"
      >
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 id={`project-name-${project.id}`} className="text-base font-semibold wrap-break-word">{project.name}</h2>
            <ProjectStatusBadge status={project.status} />
          </div>
          {date && <p className="text-text-muted">{date}</p>}
          {pendingApproval && (
            <p id={`project-pending-${project.id}`} className="text-state-pending">Presupuesto pendiente de aprobación</p>
          )}
        </div>
        <span aria-hidden="true" className="shrink-0 text-xl text-text-muted">›</span>
      </Link>
    </li>
  )
}

function ProjectList({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <Empty
        title="Todavía no hay proyectos"
        description="Cuando Adavra cargue un proyecto a tu nombre, lo vas a ver acá."
      />
    )
  }

  const pending = projects.filter((project) => project.current_budget?.pending_approval)

  return (
    <div className="space-y-5">
      {pending.length > 0 && (
        <aside className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-state-pending/30 bg-state-pending/10 px-5 py-4 text-state-pending">
          <p>
            {pending.length === 1
              ? 'Tenés un presupuesto esperando tu aprobación.'
              : `Tenés ${pending.length} presupuestos esperando tu aprobación.`}
          </p>
          {pending.length === 1 && (
            <Link
              to={`/projects/${pending[0].id}`}
              className="rounded-control font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-state-pending"
            >
              Revisar proyecto
            </Link>
          )}
        </aside>
      )}
      <ul aria-label="Proyectos" className="space-y-3">
        {projects.map((project) => <ProjectRow key={project.id} project={project} />)}
      </ul>
    </div>
  )
}

export function Projects() {
  const query = useQuery({
    queryKey: projectKeys.list,
    queryFn: ({ signal }) => getProjects(signal),
  })

  return (
    <>
      <PageTitle>Mis proyectos</PageTitle>
      {query.isPending && <Loading label="Cargando proyectos…" />}
      {query.isLoadingError && (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} retrying={query.isFetching} />
      )}
      {query.data && <ProjectList projects={query.data} />}
    </>
  )
}
