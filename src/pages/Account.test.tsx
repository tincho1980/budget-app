import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountData } from '../api/account'
import { clearToken, setToken } from '../api/auth'
import { AppRoutes } from '../routes/AppRoutes'

const fetchMock = vi.fn<typeof fetch>()

const emptyAccount = {
  client: { id: 21, business_name: 'Club Social', tax_id: null },
  debt: '0.00',
  overdue_charges: 0,
  unpaid_charges: [],
  recent_payments: [],
} satisfies AccountData

function renderAccount() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/account']}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

describe('Estado de cuenta', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubEnv('VITE_API_URL', '/api/v1')
    vi.stubGlobal('fetch', fetchMock)
    setToken('token-de-prueba')
  })

  afterEach(() => {
    cleanup()
    clearToken()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('muestra el saldo y el atraso del servidor junto con el pago en revisión y su comprobante', async () => {
    const receiptUrl = 'https://api.example.test/rails/active_storage/blobs/redirect/example/comprobante.pdf'
    const account = {
      ...emptyAccount,
      debt: '180000.00',
      overdue_charges: 1,
      unpaid_charges: [
        { id: 1, period: '2026-10', due_on: '2026-10-21', amount: '100000.00', paid_amount: '0.00', balance: '100000.00', status: 'overdue', days_overdue: 29 },
        { id: 2, period: '2026-11', due_on: '2026-11-28', amount: '100000.00', paid_amount: '20000.00', balance: '80000.00', status: 'partial', days_overdue: 0 },
      ],
      recent_payments: [{
        id: 5,
        paid_on: '2026-11-14',
        created_at: '2026-11-14T12:00:00Z',
        amount: '40000.00',
        payment_method: 'transfer',
        status: 'pending_review',
        notes: null,
        receipt: { filename: 'comprobante.pdf', url: receiptUrl, content_type: 'application/pdf', byte_size: 1536 },
      }],
    } satisfies AccountData

    fetchMock.mockResolvedValueOnce(Response.json({ account }))
    renderAccount()

    const debt = await screen.findByRole('region', { name: 'Deuda total' })
    expect(within(debt).getByText(/180\.000,00/)).toBeInTheDocument()
    expect(within(debt).getByText('1 cuota vencida')).toBeInTheDocument()

    const charges = screen.getByRole('region', { name: 'Cuotas impagas' })
    expect(within(charges).getByText('octubre de 2026')).toBeInTheDocument()
    expect(within(charges).getByText('29 días de atraso')).toBeInTheDocument()
    expect(within(charges).getByText('Vencida')).toBeInTheDocument()
    expect(within(charges).getByText('Parcial')).toBeInTheDocument()
    expect(within(charges).getByText(/80\.000,00/)).toBeInTheDocument()

    const payments = screen.getByRole('region', { name: 'Pagos recientes' })
    expect(within(payments).getByText('En revisión')).toBeInTheDocument()
    expect(within(payments).getByText('Transferencia')).toBeInTheDocument()
    expect(within(payments).getByRole('link', { name: 'Ver comprobante: comprobante.pdf' })).toHaveAttribute('href', receiptUrl)
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/account', expect.anything())
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe('Bearer token-de-prueba')
  })

  it('permite reintentar un error y muestra los estados vacíos cuando la cuenta está al día', async () => {
    let respondToAccount!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { respondToAccount = resolve }))
    fetchMock.mockResolvedValueOnce(Response.json({ account: emptyAccount }))
    const user = renderAccount()

    expect(screen.getByRole('status')).toHaveTextContent('Cargando estado de cuenta…')
    respondToAccount(Response.json({ error: { status: 503, message: 'Servicio no disponible.' } }, { status: 503 }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible.')

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'No tenés cuotas impagas' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Todavía no hay pagos registrados' })).toBeInTheDocument()
    expect(screen.getByText('Sin cuotas vencidas')).toBeInTheDocument()
  })
})
