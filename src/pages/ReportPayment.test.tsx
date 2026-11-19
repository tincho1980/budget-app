import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AccountData } from '../api/account'
import { clearToken, setToken } from '../api/auth'
import type { Payment } from '../api/payments'
import { AppRoutes } from '../routes/AppRoutes'

const fetchMock = vi.fn<typeof fetch>()

const account = {
  client: { id: 21, business_name: 'Club Social', tax_id: null },
  debt: '100000.00',
  overdue_charges: 0,
  unpaid_charges: [{
    id: 12, period: '2026-11', due_on: '2026-11-28', status: 'pending',
    amount: '100000.00', paid_amount: '0.00', balance: '100000.00', days_overdue: 0,
  }],
  recent_payments: [],
} satisfies AccountData

const payment = {
  id: 39,
  amount: '15000.50',
  paid_on: '2026-11-19',
  payment_method: 'transfer',
  status: 'pending_review',
  notes: null,
  created_at: '2026-11-19T11:00:00Z',
  receipt: null,
} satisfies Payment

function renderPortal(path = '/payments/new') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

function receiptInput() {
  return screen.getByLabelText('Comprobante (opcional)')
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Monto'), '15000,50')
  fireEvent.change(screen.getByLabelText('Fecha de pago'), { target: { value: '2026-11-19' } })
  await user.selectOptions(screen.getByLabelText('Medio de pago'), 'transfer')
}

describe('Informar pago', () => {
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

  it('envía el comprobante por multipart y actualiza el estado de cuenta con el pago en revisión', async () => {
    let respondToPayment!: (response: Response) => void
    const receipt = new File(['%PDF-1.4'], 'comprobante.pdf', { type: 'application/pdf' })
    const uploadedPayment = {
      ...payment,
      receipt: { filename: receipt.name, content_type: receipt.type, byte_size: receipt.size, url: 'https://api.example.test/comprobante.pdf' },
    } satisfies Payment
    fetchMock
      .mockResolvedValueOnce(Response.json({ account }))
      .mockImplementationOnce(() => new Promise((resolve) => { respondToPayment = resolve }))
      .mockResolvedValueOnce(Response.json({ account: { ...account, recent_payments: [uploadedPayment] } }))
    const user = renderPortal('/account')
    const debt = await screen.findByRole('region', { name: 'Deuda total' })
    await user.click(within(debt).getByRole('link', { name: 'Informar pago' }))
    await fillRequiredFields(user)

    await user.upload(receiptInput(), receipt)
    await user.click(screen.getByRole('button', { name: 'Enviar pago' }))
    expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeDisabled()

    const [url, options] = fetchMock.mock.calls[1]
    expect(url).toBe('/api/v1/payments')
    expect(options?.method).toBe('POST')
    expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer token-de-prueba')
    expect(new Headers(options?.headers).has('Content-Type')).toBe(false)
    expect(options?.body).toBeInstanceOf(FormData)
    const body = options?.body as FormData
    expect(body.get('amount')).toBe('15000.50')
    expect(body.get('paid_on')).toBe('2026-11-19')
    expect(body.get('payment_method')).toBe('transfer')
    expect(body.get('receipt')).toBe(receipt)

    respondToPayment(Response.json({ payment: uploadedPayment }, { status: 201 }))
    const success = await screen.findByRole('status')
    expect(success).toHaveTextContent('Pago informado')
    expect(success).toHaveTextContent('En revisión')
    await user.click(screen.getByRole('link', { name: 'Ver estado de cuenta' }))

    const payments = screen.getByRole('region', { name: 'Pagos recientes' })
    expect(await within(payments).findByText('En revisión')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Deuda total' })).getByText(/100\.000,00/)).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([requestUrl]) => requestUrl)).toEqual(['/api/v1/account', '/api/v1/payments', '/api/v1/account'])
  })

  it('muestra junto al comprobante el error 422 de Rails y conserva los datos del formulario', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      error: { status: 422, message: 'No se pudo guardar.', details: ['Comprobante debe ser PDF, JPG o PNG'] },
    }, { status: 422 }))
    const user = renderPortal()
    await fillRequiredFields(user)
    await user.upload(receiptInput(), new File(['texto con extensión PDF'], 'invalido.pdf', { type: 'application/pdf' }))
    await user.click(screen.getByRole('button', { name: 'Enviar pago' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar.')
    expect(receiptInput()).toHaveAccessibleDescription(/Comprobante debe ser PDF, JPG o PNG/)
    expect(receiptInput()).toHaveFocus()
    expect(screen.getByLabelText('Monto')).toHaveValue('15000,50')
    expect(screen.getByRole('button', { name: 'Enviar pago' })).toBeEnabled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rechaza archivos de más de 5 MB y permite enviar el pago sin comprobante', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ payment }, { status: 201 }))
    const user = renderPortal()
    await fillRequiredFields(user)
    const largeReceipt = new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' })
    await user.upload(receiptInput(), largeReceipt)
    await user.click(screen.getByRole('button', { name: 'Enviar pago' }))

    expect(receiptInput()).toHaveAccessibleDescription(/no puede pesar más de 5 MB/)
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Quitar comprobante' }))
    await user.click(screen.getByRole('button', { name: 'Enviar pago' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Pago informado')
    const [, options] = fetchMock.mock.calls[0]
    expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(options?.body as string)).toEqual({ amount: '15000.50', paid_on: '2026-11-19', payment_method: 'transfer' })
  })
})
