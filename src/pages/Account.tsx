import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { accountKey, getAccount, type AccountCharge, type AccountData } from '../api/account'
import { paymentMethods, type Payment } from '../api/payments'
import { PageTitle } from '../components/PageTitle'
import { ChargeStatusBadge, PaymentStatusBadge } from '../components/StatusBadges'
import { Empty } from '../components/states/Empty'
import { ErrorState } from '../components/states/ErrorState'
import { Loading } from '../components/states/Loading'
import { formatDate, formatMoney, formatPeriod } from '../lib/format'

function ChargeRow({ charge }: { charge: AccountCharge }) {
  return (
    <li className="grid gap-4 px-4 py-4 sm:items-center sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold first-letter:uppercase"><time dateTime={charge.period}>{formatPeriod(charge.period)}</time></p>
          <ChargeStatusBadge status={charge.status} />
        </div>
        {charge.days_overdue > 0 && (
          <p className="text-sm text-state-overdue">{charge.days_overdue} {charge.days_overdue === 1 ? 'día' : 'días'} de atraso</p>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs text-text-muted">Vencimiento</dt>
          <dd className="mt-1"><time dateTime={charge.due_on}>{formatDate(charge.due_on)}</time></dd>
        </div>
        <div className="sm:text-right">
          <dt className="text-xs text-text-muted">Monto</dt>
          <dd className="mt-1 font-mono tabular-nums">{formatMoney(charge.amount)}</dd>
        </div>
        <div className="sm:text-right">
          <dt className="text-xs text-text-muted">Saldo</dt>
          <dd className="mt-1 font-mono font-semibold tabular-nums">{formatMoney(charge.balance)}</dd>
        </div>
      </dl>
    </li>
  )
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <div className="space-y-1">
        <p className="font-semibold"><time dateTime={payment.paid_on}>{formatDate(payment.paid_on)}</time></p>
        <p className="text-text-muted">{paymentMethods[payment.payment_method]}</p>
        {payment.receipt && (
          <a
            href={payment.receipt.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Ver comprobante: ${payment.receipt.filename}`}
            className="inline-block rounded-control underline underline-offset-4 hover:text-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Ver comprobante
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <PaymentStatusBadge status={payment.status} />
        <p className="min-w-28 text-right font-mono font-semibold tabular-nums">{formatMoney(payment.amount)}</p>
      </div>
    </li>
  )
}

function AccountContent({ account }: { account: AccountData }) {
  const overdueCount = account.overdue_charges

  return (
    <div className="space-y-7">
      <section aria-labelledby="account-debt" className="flex flex-wrap items-center justify-between gap-5 rounded-card border border-border-subtle bg-surface p-6">
        <div>
          <p className="text-sm text-text-muted">{account.client.business_name}</p>
          <h2 id="account-debt" className="mt-4 text-xs font-medium tracking-[0.12em] text-text-muted uppercase">Deuda total</h2>
          <p className="mt-2 font-mono text-[clamp(1.5rem,6vw,2rem)] font-semibold tabular-nums">{formatMoney(account.debt)}</p>
          <p className={`mt-2 ${overdueCount > 0 ? 'text-state-overdue' : 'text-text-muted'}`}>
            {overdueCount === 0 && 'Sin cuotas vencidas'}
            {overdueCount === 1 && '1 cuota vencida'}
            {overdueCount > 1 && `${overdueCount} cuotas vencidas`}
          </p>
        </div>
        <Link
          to="/payments/new"
          className="inline-flex rounded-control bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Informar pago
        </Link>
      </section>

      <section aria-labelledby="account-charges" className="space-y-3">
        <h2 id="account-charges" className="text-lg font-semibold">Cuotas impagas</h2>
        {account.unpaid_charges.length === 0 ? (
          <Empty title="No tenés cuotas impagas" />
        ) : (
          <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
            {account.unpaid_charges.map((charge) => <ChargeRow key={charge.id} charge={charge} />)}
          </ul>
        )}
      </section>

      <section aria-labelledby="account-payments" className="space-y-3">
        <h2 id="account-payments" className="text-lg font-semibold">Pagos recientes</h2>
        {account.recent_payments.length === 0 ? (
          <Empty title="Todavía no hay pagos registrados" />
        ) : (
          <ul className="divide-y divide-border-subtle rounded-card border border-border-subtle bg-surface">
            {account.recent_payments.map((payment) => <PaymentRow key={payment.id} payment={payment} />)}
          </ul>
        )}
      </section>
    </div>
  )
}

export function Account() {
  const query = useQuery({
    queryKey: accountKey,
    queryFn: ({ signal }) => getAccount(signal),
  })

  return (
    <>
      <PageTitle>Estado de cuenta</PageTitle>
      {query.isPending && <Loading label="Cargando estado de cuenta…" />}
      {query.isLoadingError && (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} retrying={query.isFetching} />
      )}
      {query.data && <AccountContent account={query.data} />}
    </>
  )
}
