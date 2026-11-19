import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { accountKey } from '../api/account'
import { ApiError } from '../api/client'
import { paymentMethods, reportPayment, type PaymentInput, type PaymentMethod } from '../api/payments'
import { PageTitle } from '../components/PageTitle'
import { PaymentStatusBadge } from '../components/StatusBadges'
import { Button } from '../components/ui/Button'
import { formatDate, formatMoney } from '../lib/format'

const fieldLabels = {
  amount: 'Monto',
  paid_on: 'Fecha de pago',
  payment_method: 'Medio de pago',
  receipt: 'Comprobante',
  notes: 'Notas',
} as const

type PaymentField = keyof typeof fieldLabels
type PaymentErrors = Partial<Record<PaymentField, string[]>>

const fieldNames = Object.keys(fieldLabels) as PaymentField[]
const receiptTypes = ['application/pdf', 'image/jpeg', 'image/png']
const maximumReceiptSize = 5 * 1024 * 1024
const amountHint = 'Usá coma o punto para los decimales, sin separador de miles.'
const receiptHint = 'PDF, JPG o PNG de hasta 5 MB.'

const controlClass = 'w-full rounded-control border border-border-strong bg-surface px-3 py-3 text-base text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-invalid:border-state-overdue'
const primaryLinkClass = 'inline-flex rounded-control bg-primary px-5 py-3 font-semibold text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function isPaymentMethod(value: string): value is PaymentMethod {
  return Object.hasOwn(paymentMethods, value)
}

function validateReceipt(file: File): string | undefined {
  if (file.size === 0) return 'El comprobante está vacío.'
  if (file.size > maximumReceiptSize) return 'El comprobante no puede pesar más de 5 MB.'

  const typeUnknown = !file.type || file.type === 'application/octet-stream'
  if (receiptTypes.includes(file.type) || (typeUnknown && /\.(pdf|jpe?g|png)$/i.test(file.name))) return
  return 'El comprobante debe ser PDF, JPG o PNG.'
}

function readPayment(form: HTMLFormElement, receipt?: File): { errors: PaymentErrors; payment?: PaymentInput } {
  const fields = new FormData(form)
  const amount = String(fields.get('amount') ?? '').trim().replace(',', '.')
  const paidOn = String(fields.get('paid_on') ?? '')
  const method = String(fields.get('payment_method') ?? '')
  const paymentMethod = isPaymentMethod(method) ? method : null
  const notes = String(fields.get('notes') ?? '').trim()
  const errors: PaymentErrors = {}

  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    errors.amount = ['Ingresá un monto mayor que cero, con hasta diez dígitos enteros y dos decimales.']
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn)) errors.paid_on = ['Ingresá la fecha de pago.']
  if (!paymentMethod) errors.payment_method = ['Seleccioná un medio de pago.']

  const receiptError = receipt && validateReceipt(receipt)
  if (receiptError) errors.receipt = [receiptError]
  if (!paymentMethod || Object.keys(errors).length > 0) return { errors }

  return { errors, payment: { amount, paid_on: paidOn, payment_method: paymentMethod, notes: notes || undefined, receipt } }
}

function readApiErrors(error: Error | null) {
  const fields: PaymentErrors = {}
  const general: string[] = []
  if (!(error instanceof ApiError)) return { fields, general }

  for (const [name, messages] of Object.entries(error.errors)) {
    const field = fieldNames.find((item) => item === name)
    if (field) fields[field] = [...messages]
    else general.push(...messages)
  }

  // Rails devuelve los mensajes completos, con la etiqueta del atributo al comienzo.
  for (const message of error.details) {
    const field = fieldNames.find((item) => message.startsWith(`${fieldLabels[item]} `))
    if (field) (fields[field] ??= []).push(message)
    else general.push(message)
  }

  return { fields, general }
}

function PaymentField({ name, optional, hint, messages, children }: {
  name: PaymentField
  optional?: boolean
  hint?: string
  messages?: string[]
  children: (attributes: { id: string; name: PaymentField; 'aria-invalid'?: true; 'aria-describedby'?: string }) => ReactNode
}) {
  const id = `payment-${name}`
  const hasError = Boolean(messages?.length)
  const describedBy = [hint && `${id}-hint`, hasError && `${id}-errors`].filter(Boolean).join(' ')

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block font-medium">
        {fieldLabels[name]}
        {optional && <span className="text-sm font-normal text-text-muted">{' (opcional)'}</span>}
      </label>
      {children({ id, name, 'aria-invalid': hasError ? true : undefined, 'aria-describedby': describedBy || undefined })}
      {hint && <p id={`${id}-hint`} className="text-sm text-text-muted">{hint}</p>}
      {hasError && (
        <ul id={`${id}-errors`} className="space-y-1 text-state-overdue">
          {[...new Set(messages)].map((message) => <li key={message}>{message}</li>)}
        </ul>
      )}
    </div>
  )
}

export function ReportPayment() {
  const queryClient = useQueryClient()
  const formRef = useRef<HTMLFormElement>(null)
  const receiptRef = useRef<HTMLInputElement>(null)
  const feedbackRef = useRef<HTMLHeadingElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  const [receipt, setReceipt] = useState<File>()
  const [validationErrors, setValidationErrors] = useState<PaymentErrors>({})
  const submission = useMutation({
    mutationFn: reportPayment,
    networkMode: 'always',
    retry: false,
    gcTime: 0,
    onSuccess: () => {
      setReceipt(undefined)
      void queryClient.invalidateQueries({ queryKey: accountKey })
    },
  })

  const { data: payment, error, isPending, mutate, reset } = submission
  const apiErrors = readApiErrors(error)
  const fieldErrors = { ...apiErrors.fields, ...validationErrors }
  const uncertainResult = error instanceof ApiError && (error.isNetworkError || error.status >= 500)

  useEffect(() => {
    if (!error) return
    const { fields } = readApiErrors(error)
    const firstField = fieldNames.find((field) => fields[field]?.length)
    const field = firstField && formRef.current?.elements.namedItem(firstField)
    if (field instanceof HTMLElement) field.focus()
    else alertRef.current?.focus()
  }, [error])

  useEffect(() => {
    if (payment) feedbackRef.current?.focus()
  }, [payment])

  function clearError(name: PaymentField) {
    if (validationErrors[name]) setValidationErrors((current) => ({ ...current, [name]: undefined }))
    if (error) reset()
  }

  function clearReceipt() {
    setReceipt(undefined)
    if (receiptRef.current) {
      receiptRef.current.value = ''
      receiptRef.current.focus()
    }
    clearError('receipt')
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return

    const { errors, payment } = readPayment(event.currentTarget, receipt)
    setValidationErrors(errors)
    if (payment) {
      mutate(payment)
      return
    }

    reset()
    const firstField = fieldNames.find((field) => errors[field]?.length)
    const field = firstField && event.currentTarget.elements.namedItem(firstField)
    if (field instanceof HTMLElement) field.focus()
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/account" className="mb-4 inline-flex gap-2 rounded-control text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <span aria-hidden="true">←</span>
        Estado de cuenta
      </Link>
      <PageTitle>Informar pago</PageTitle>

      {payment ? (
        <section className="space-y-5 rounded-card border border-border-subtle bg-surface p-5 sm:p-6" aria-labelledby="payment-confirmed">
          <div role="status" className="space-y-3">
            <h2 id="payment-confirmed" ref={feedbackRef} tabIndex={-1} className="text-xl font-semibold">Pago informado</h2>
            <PaymentStatusBadge status={payment.status} />
            <p className="font-mono text-xl font-semibold tabular-nums">{formatMoney(payment.amount)}</p>
            <p className="text-text-muted">Pago del <time dateTime={payment.paid_on}>{formatDate(payment.paid_on)}</time>. El saldo se actualiza cuando Adavra confirme el pago.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/account" className={primaryLinkClass}>Ver estado de cuenta</Link>
            <Button variant="secondary" onClick={() => reset()}>Informar otro pago</Button>
          </div>
        </section>
      ) : (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onChange={(event) => {
            const name = event.target instanceof HTMLElement ? event.target.getAttribute('name') : null
            const field = fieldNames.find((item) => item === name)
            if (field) clearError(field)
          }}
          noValidate
          className="space-y-5 rounded-card border border-border-subtle bg-surface p-5 sm:p-6"
        >
          <p className="text-text-muted">El pago queda en revisión y se aplica a las cuotas impagas más antiguas cuando Adavra lo confirma.</p>

          <fieldset disabled={isPending} className="min-w-0 space-y-5">
            <PaymentField name="amount" hint={amountHint} messages={fieldErrors.amount}>
              {(attributes) => <input {...attributes} type="text" inputMode="decimal" placeholder="15000,00" required className={controlClass} />}
            </PaymentField>
            <div className="grid gap-5 sm:grid-cols-2">
              <PaymentField name="paid_on" messages={fieldErrors.paid_on}>
                {(attributes) => <input {...attributes} type="date" required className={`${controlClass} scheme-dark`} />}
              </PaymentField>
              <PaymentField name="payment_method" messages={fieldErrors.payment_method}>
                {(attributes) => (
                  <select {...attributes} defaultValue="" required className={controlClass}>
                    <option value="" disabled>Seleccioná un medio</option>
                    {Object.entries(paymentMethods).map(([method, label]) => <option key={method} value={method}>{label}</option>)}
                  </select>
                )}
              </PaymentField>
            </div>
            <PaymentField name="receipt" optional hint={receiptHint} messages={fieldErrors.receipt}>
              {(attributes) => (
                <div className="space-y-2">
                  <input
                    {...attributes}
                    ref={receiptRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                    onChange={(event) => setReceipt(event.currentTarget.files?.[0])}
                    className={`${controlClass} cursor-pointer file:mr-3 file:rounded-control file:border-0 file:bg-surface-hover file:px-3 file:py-1 file:font-medium file:text-text`}
                  />
                  {receipt && <Button variant="ghost" className="px-2 py-1" onClick={clearReceipt}>Quitar comprobante</Button>}
                </div>
              )}
            </PaymentField>
            <PaymentField name="notes" optional messages={fieldErrors.notes}>
              {(attributes) => <textarea {...attributes} rows={3} className={controlClass} />}
            </PaymentField>
          </fieldset>

          {error && (
            <div ref={alertRef} role="alert" tabIndex={-1} className="space-y-2 rounded-control border border-state-overdue/30 bg-state-overdue/10 px-4 py-3 text-state-overdue">
              <p>{error.message}</p>
              {apiErrors.general.length > 0 && (
                <ul className="list-disc space-y-1 pl-4">
                  {[...new Set(apiErrors.general)].map((message) => <li key={message}>{message}</li>)}
                </ul>
              )}
              {uncertainResult && <p>Revisá tus pagos en el estado de cuenta antes de volver a enviarlo.</p>}
            </div>
          )}

          <Button type="submit" busy={isPending} className="w-full sm:w-auto">
            {isPending ? 'Enviando…' : 'Enviar pago'}
          </Button>
        </form>
      )}
    </div>
  )
}
