import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { budgetKeys, decideBudget, getBudget, type Budget, type BudgetDecision } from '../api/budgets'
import { ApiError } from '../api/client'
import { projectKeys } from '../api/projects'
import { PageTitle } from '../components/PageTitle'
import { BudgetStatusBadge } from '../components/StatusBadges'
import { Empty } from '../components/states/Empty'
import { ErrorState } from '../components/states/ErrorState'
import { Loading } from '../components/states/Loading'
import { Button } from '../components/ui/Button'
import { formatDate, formatHours, formatMoney } from '../lib/format'

const decisionCopy = {
  approve: {
    title: '¿Aprobar el presupuesto?',
    verb: 'aprobar',
    confirm: 'Confirmar aprobación',
    success: 'El presupuesto quedó aprobado.',
  },
  reject: {
    title: '¿Rechazar el presupuesto?',
    verb: 'rechazar',
    confirm: 'Confirmar rechazo',
    success: 'El presupuesto quedó rechazado.',
  },
}

const backLinkClass = 'mb-4 inline-flex gap-2 rounded-control text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent'

function BudgetScope({ budget }: { budget: Budget }) {
  return (
    <section aria-labelledby="budget-scope" className="space-y-4">
      <h2 id="budget-scope" className="text-lg font-semibold">Alcance del presupuesto</h2>
      {budget.modules.length === 0 && <Empty title="No hay tareas detalladas" />}
      {budget.modules.map((module) => (
        <div key={module.name} className="rounded-card border border-border-subtle bg-surface">
          <h3 className="border-b border-border-subtle px-5 py-3 font-semibold wrap-break-word">{module.name}</h3>
          <ul className="divide-y divide-border-subtle">
            {module.items.map((item, index) => (
              <li key={index} className="flex items-baseline justify-between gap-4 px-5 py-3">
                <span className="min-w-0 wrap-break-word">{item.description}</span>
                <span className="shrink-0 font-mono tabular-nums text-text-muted">{formatHours(item.estimated_hours)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {budget.notes && (
        <div className="rounded-card border border-border-subtle bg-surface p-5">
          <h3 className="font-semibold">Notas</h3>
          <p className="mt-2 whitespace-pre-wrap wrap-break-word text-text-muted">{budget.notes}</p>
        </div>
      )}
    </section>
  )
}

function BudgetContent({ budget, routeId }: { budget: Budget; routeId: string }) {
  const queryClient = useQueryClient()
  const queryKey = budgetKeys.detail(routeId)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const confirmationRef = useRef<HTMLParagraphElement>(null)
  const [decision, setDecision] = useState<BudgetDecision | null>(null)
  const canDecide = budget.status === 'sent'

  function closeDialog() {
    dialogRef.current?.close()
    setDecision(null)
  }

  const mutation = useMutation({
    mutationFn: (action: BudgetDecision) => decideBudget(routeId, action),
    networkMode: 'always',
    onSuccess: async (updated) => {
      closeDialog()
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, updated)
      void queryClient.invalidateQueries({ queryKey: projectKeys.list })
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status === 422) {
        await queryClient.invalidateQueries({ queryKey })
        void queryClient.invalidateQueries({ queryKey: projectKeys.list })
      }
    },
  })

  useEffect(() => {
    if (decision) dialogRef.current?.showModal()
  }, [decision])

  useEffect(() => {
    if (mutation.isSuccess) confirmationRef.current?.focus()
  }, [mutation.isSuccess])

  function openDialog(action: BudgetDecision) {
    mutation.reset()
    setDecision(action)
  }

  const copy = decision ? decisionCopy[decision] : null
  const confirmation = mutation.isSuccess ? decisionCopy[mutation.variables].success : null
  const details = mutation.error instanceof ApiError ? mutation.error.details : []

  return (
    <>
      <Link to={`/projects/${budget.project.id}`} className={backLinkClass}>
        <span aria-hidden="true">←</span>
        {budget.project.name}
      </Link>
      <PageTitle>Presupuesto</PageTitle>
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
        <BudgetStatusBadge status={budget.status} />
        <p className="text-text-muted">Versión {budget.version}</p>
        {budget.sent_at && (
          <p className="text-text-muted">Enviado el <time dateTime={budget.sent_at}>{formatDate(budget.sent_at)}</time></p>
        )}
        {budget.approved_at && (
          <p className="text-text-muted">Aprobado el <time dateTime={budget.approved_at}>{formatDate(budget.approved_at)}</time></p>
        )}
      </div>

      {confirmation && (
        <p
          ref={confirmationRef}
          role="status"
          tabIndex={-1}
          className="mb-6 rounded-control border border-border-strong bg-surface px-4 py-3"
        >
          {confirmation}
        </p>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <BudgetScope budget={budget} />
        <section aria-labelledby="budget-total" className="rounded-card border border-border-subtle bg-surface p-6">
          <h2 id="budget-total" className="font-semibold">Total del presupuesto</h2>
          <p className="mt-2 font-mono text-[28px] font-semibold tabular-nums">{formatMoney(budget.total)}</p>
          <p className="mt-2 text-text-muted">Horas estimadas: {formatHours(budget.estimated_hours)}</p>
          {budget.signed_document_url && (
            <a
              href={budget.signed_document_url}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block rounded-control underline underline-offset-4 hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Abrir PDF firmado
            </a>
          )}
          {canDecide && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button disabled={mutation.isPending} onClick={() => openDialog('approve')}>Aprobar</Button>
              <Button variant="danger" disabled={mutation.isPending} onClick={() => openDialog('reject')}>Rechazar</Button>
            </div>
          )}
        </section>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="budget-dialog-title"
        aria-describedby="budget-dialog-description"
        className="m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-card border border-border-strong bg-surface p-6 text-text backdrop:bg-black/70"
        onCancel={(event) => {
          event.preventDefault()
          if (!mutation.isPending) closeDialog()
        }}
      >
        {copy && (
          <>
            <h2 id="budget-dialog-title" className="text-xl font-semibold">{copy.title}</h2>
            <p id="budget-dialog-description" className="mt-3 text-text-muted">
              Vas a {copy.verb} la versión {budget.version} por {formatMoney(budget.total)}. Una vez registrada, la decisión no se puede cambiar desde el portal.
            </p>
            {mutation.error && (
              <div role="alert" className="mt-4 space-y-2 rounded-control border border-state-overdue/30 bg-state-overdue/10 p-3 text-state-overdue">
                <p>{mutation.error.message}</p>
                {details.length > 0 && (
                  <ul className="list-disc space-y-1 pl-4">
                    {[...new Set(details)].map((detail) => <li key={detail}>{detail}</li>)}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" disabled={mutation.isPending} onClick={closeDialog}>Cancelar</Button>
              <Button
                variant={decision === 'approve' ? 'primary' : 'danger'}
                busy={mutation.isPending}
                disabled={!canDecide}
                onClick={() => {
                  if (decision && canDecide && !mutation.isPending) mutation.mutate(decision)
                }}
              >
                {mutation.isPending ? 'Registrando…' : copy.confirm}
              </Button>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}

export function BudgetDetail() {
  const { id = '' } = useParams()
  const query = useQuery({
    queryKey: budgetKeys.detail(id),
    queryFn: ({ signal }) => getBudget(id, signal),
  })

  if (query.data) return <BudgetContent key={id} budget={query.data} routeId={id} />

  return (
    <>
      <Link to="/" className={backLinkClass}>
        <span aria-hidden="true">←</span>
        Mis proyectos
      </Link>
      <PageTitle>Presupuesto</PageTitle>
      {query.isPending && <Loading label="Cargando presupuesto…" />}
      {query.isLoadingError && (query.error instanceof ApiError && query.error.status === 404 ? (
        <Empty title="Presupuesto no encontrado" description="Volvé al listado para ver tus proyectos disponibles." />
      ) : (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} retrying={query.isFetching} />
      ))}
    </>
  )
}
