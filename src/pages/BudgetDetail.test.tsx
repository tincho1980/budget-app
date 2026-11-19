import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken } from '../api/auth'
import type { Budget } from '../api/budgets'
import type { ProjectDetail } from '../api/projects'
import { AppRoutes } from '../routes/AppRoutes'

const fetchMock = vi.fn<typeof fetch>()

const sentBudget = {
  id: 20,
  version: 2,
  status: 'sent',
  total: '4800000.00',
  sent_at: '2026-10-24T12:00:00Z',
  approved_at: null,
  signed_document_url: null,
  notes: null,
  project: { id: 12, name: 'Sitio institucional' },
  estimated_hours: '3.50',
  modules: [{ name: 'Diseño', items: [{ description: 'Sistema visual', estimated_hours: '3.50' }] }],
} satisfies Budget

const approvedBudget = { ...sentBudget, status: 'approved', approved_at: '2026-10-26T12:00:00Z' } satisfies Budget

function projectResponse(budget: Budget) {
  const { id, version, total, status } = budget
  const summary = { id, version, total, status }
  const project = {
    ...budget.project,
    status: 'in_progress',
    description: null,
    started_on: null,
    closed_on: null,
    current_budget: { ...summary, pending_approval: status === 'sent' },
    budgets: [summary],
  } satisfies ProjectDetail
  return Response.json({ project })
}

function renderPortal(path: string) {
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

const dialogPrototype = HTMLDialogElement.prototype
const shimDialog = typeof dialogPrototype.showModal !== 'function'

beforeAll(() => {
  if (!shimDialog) return
  // jsdom does not implement the modal dialog methods.
  Object.defineProperties(dialogPrototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false } },
  })
})

afterAll(() => {
  if (shimDialog) {
    Reflect.deleteProperty(dialogPrototype, 'showModal')
    Reflect.deleteProperty(dialogPrototype, 'close')
  }
})

describe('Decisión sobre un presupuesto', () => {
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

  it('permite cancelar, aprueba solo tras confirmar y actualiza el proyecto al volver', async () => {
    let respondToDecision!: (response: Response) => void
    fetchMock
      .mockResolvedValueOnce(projectResponse(sentBudget))
      .mockResolvedValueOnce(Response.json({ budget: sentBudget }))
      .mockImplementationOnce(() => new Promise((resolve) => { respondToDecision = resolve }))
      .mockResolvedValueOnce(projectResponse(approvedBudget))
    const user = renderPortal('/projects/12')
    await user.click(await screen.findByRole('link', { name: 'Ver presupuesto' }))

    expect(await screen.findByText('Sistema visual')).toBeInTheDocument()
    expect(screen.getByText('3,5 h')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aprobar' }))
    const firstDialog = await screen.findByRole('dialog', { name: '¿Aprobar el presupuesto?' })
    await user.click(within(firstDialog).getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await user.click(screen.getByRole('button', { name: 'Aprobar' }))
    const dialog = await screen.findByRole('dialog', { name: '¿Aprobar el presupuesto?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar aprobación' }))
    expect(await within(dialog).findByRole('button', { name: 'Registrando…' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/budgets/20/approve', expect.objectContaining({ method: 'POST' }))
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get('Authorization')).toBe('Bearer token-de-prueba')

    respondToDecision(Response.json({ budget: approvedBudget }))
    expect(await screen.findByRole('status')).toHaveTextContent('El presupuesto quedó aprobado.')
    expect(screen.getByText('Aprobado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Aprobar' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Sitio institucional' }))
    expect(await within(screen.getByRole('region', { name: 'Presupuesto vigente' })).findByText('Aprobado')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/v1/projects/12', '/api/v1/budgets/20', '/api/v1/budgets/20/approve', '/api/v1/projects/12',
    ])
  })

  it('registra un rechazo y muestra el nuevo estado', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ budget: sentBudget }))
      .mockResolvedValueOnce(Response.json({ budget: { ...sentBudget, status: 'rejected' } }))
    const user = renderPortal('/budgets/20')

    await user.click(await screen.findByRole('button', { name: 'Rechazar' }))
    await user.click(await screen.findByRole('button', { name: 'Confirmar rechazo' }))

    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/budgets/20/reject', expect.objectContaining({ method: 'POST' }))
    expect(await screen.findByRole('status')).toHaveTextContent('El presupuesto quedó rechazado.')
    expect(screen.getByText('Rechazado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument()
  })

  it('muestra el detalle del 422 y bloquea la confirmación si alguien ya decidió el presupuesto', async () => {
    fetchMock
      .mockResolvedValueOnce(Response.json({ budget: sentBudget }))
      .mockResolvedValueOnce(Response.json({
        error: {
          status: 422,
          message: 'No se pudo registrar la decisión.',
          details: ['Sólo se puede aprobar o rechazar un presupuesto enviado.'],
        },
      }, { status: 422 }))
      .mockResolvedValueOnce(Response.json({ budget: approvedBudget }))
    const user = renderPortal('/budgets/20')

    await user.click(await screen.findByRole('button', { name: 'Rechazar' }))
    const dialog = await screen.findByRole('dialog', { name: '¿Rechazar el presupuesto?' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar rechazo' }))

    const error = await within(dialog).findByRole('alert')
    expect(error).toHaveTextContent('No se pudo registrar la decisión.')
    expect(error).toHaveTextContent('Sólo se puede aprobar o rechazar un presupuesto enviado.')
    expect(within(dialog).getByRole('button', { name: 'Confirmar rechazo' })).toBeDisabled()
    expect(screen.queryByText('El presupuesto quedó rechazado.')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/budgets/20', expect.anything())
  })
})
