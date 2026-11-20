import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getToken, setToken } from '../api/auth'
import { createSession } from '../api/sessions'
import { Button } from '../components/ui/Button'

type LoginFieldName = 'email_address' | 'password'
type LoginErrors = Partial<Record<LoginFieldName, string>>

type LoginFieldProps = {
  name: LoginFieldName
  label: string
  type: 'email' | 'password'
  autoComplete: 'username' | 'current-password'
  error?: string
}

function LoginField({ name, label, type, autoComplete, error }: LoginFieldProps) {
  return (
    <div className="space-y-2">
      <label className="block font-medium" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="w-full rounded-control border border-border-strong bg-surface px-3 py-3 text-base text-text outline-none focus-visible:border-accent focus-visible:ring-1 focus-visible:ring-accent aria-invalid:border-state-overdue"
      />
      {error && <p id={`${name}-error`} className="text-state-overdue">{error}</p>}
    </div>
  )
}

export function Login() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const from: unknown = state?.from
  const destination = typeof from === 'string' && /^\/(?![/\\])/.test(from) ? from : '/'
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({})
  const login = useMutation({
    mutationFn: createSession,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: ({ token, identity }) => {
      setToken(token, identity)
      navigate(destination, { replace: true })
    },
  })

  if (getToken()) return <Navigate to={destination} replace />

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (login.isPending) return

    const form = event.currentTarget
    const emailInput = form.elements.namedItem('email_address') as HTMLInputElement
    const passwordInput = form.elements.namedItem('password') as HTMLInputElement
    const email = emailInput.value.trim()
    const password = passwordInput.value
    const errors: LoginErrors = {}

    if (!email) errors.email_address = 'Ingresá tu correo electrónico.'
    else if (emailInput.validity.typeMismatch) errors.email_address = 'Ingresá un correo electrónico válido.'
    if (!password) errors.password = 'Ingresá tu contraseña.'
    setFieldErrors(errors)

    if (errors.email_address || errors.password) {
      login.reset()
      const firstInvalidField = errors.email_address ? emailInput : passwordInput
      firstInvalidField.focus()
      return
    }

    login.mutate({ email_address: email, password })
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-[1440px] grid-rows-[auto_1fr] md:grid-cols-[53%_47%] md:grid-rows-1">
      <div className="flex flex-col px-6 pt-8 md:border-r md:border-border-subtle md:bg-surface md:p-12 lg:p-[72px]">
        <div className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <span aria-hidden="true" className="grid size-7 place-items-center rounded-control bg-primary text-white">a</span>
          adavra
        </div>
        <div className="my-auto hidden max-w-md space-y-6 py-12 md:block">
          <div aria-hidden="true" className="h-[3px] w-10 rounded-full bg-accent" />
          <p className="text-[40px] leading-tight font-semibold tracking-[-0.025em]">
            Tus proyectos, presupuestos y pagos en un solo lugar.
          </p>
          <p className="text-base text-text-muted">
            Aprobá un presupuesto, mirá qué cuota vence y adjuntá el comprobante.
          </p>
        </div>
      </div>
      <section className="flex items-center justify-center px-6 py-10 md:px-10" aria-labelledby="login-title">
        <div className="w-full max-w-[380px]">
          <p className="text-xs font-medium tracking-[0.12em] text-text-muted uppercase">Portal del cliente</p>
          <h1 id="login-title" className="mt-2 text-[32px] font-semibold tracking-[-0.025em]">Ingresar</h1>
          <p className="mt-2 text-text-muted">Usá el email con el que te dimos de alta.</p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <fieldset className="min-w-0 space-y-5" disabled={login.isPending}>
              <LoginField name="email_address" label="Correo electrónico" type="email" autoComplete="username" error={fieldErrors.email_address} />
              <LoginField name="password" label="Contraseña" type="password" autoComplete="current-password" error={fieldErrors.password} />
            </fieldset>
            {login.error && (
              <p role="alert" className="rounded-control border border-state-overdue/30 bg-state-overdue/10 px-3 py-2 text-state-overdue">
                {login.error.message}
              </p>
            )}
            <Button type="submit" className="w-full" busy={login.isPending}>
              {login.isPending ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
