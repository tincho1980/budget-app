import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearToken, setToken } from '../api/auth'
import type { Project } from '../api/projects'
import { AppRoutes } from '../routes/AppRoutes'

const fetchMock = vi.fn<typeof fetch>()

const project = {
  id: 12,
  name: 'Sitio institucional',
  description: 'Rediseño del sitio del club',
  status: 'in_progress',
  started_on: '2026-03-12',
  closed_on: null,
  current_budget: { id: 20, version: 2, status: 'sent', total: '4800000.00', pending_approval: true },
} satisfies Project

function renderPortal(path = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return userEvent.setup()
}

describe('Mis proyectos', () => {
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

  it('avisa sobre un presupuesto por aprobar y permite abrir el detalle del proyecto', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ projects: [project] }))
    fetchMock.mockResolvedValueOnce(Response.json({
      project: {
        ...project,
        budgets: [{ id: 19, version: 1, status: 'rejected', total: '4400000.00' }, project.current_budget],
      },
    }))
    const user = renderPortal()

    expect(await screen.findByText('Tenés un presupuesto esperando tu aprobación.')).toBeInTheDocument()
    expect(screen.getByText('En curso')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Sitio institucional' }))

    expect(await screen.findByRole('heading', { name: project.name })).toBeInTheDocument()
    expect(screen.getByText(project.description)).toBeInTheDocument()
    const current = screen.getByRole('region', { name: 'Presupuesto vigente' })
    expect(within(current).getByText('Pendiente de aprobación')).toBeInTheDocument()
    expect(within(current).getByText(/4\.800\.000,00/)).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Versiones anteriores' })).getByText('Rechazado')).toBeInTheDocument()

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/v1/projects', '/api/v1/projects/12'])
    for (const [, options] of fetchMock.mock.calls) {
      expect(new Headers(options?.headers).get('Authorization')).toBe('Bearer token-de-prueba')
    }
  })

  it('muestra la carga y el error, y permite reintentar hasta obtener un listado vacío', async () => {
    let respondToList!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { respondToList = resolve }))
    fetchMock.mockResolvedValueOnce(Response.json({ projects: [] }))
    const user = renderPortal()

    expect(screen.getByRole('status')).toHaveTextContent('Cargando proyectos…')
    respondToList(Response.json({ error: { status: 503, message: 'Servicio no disponible.' } }, { status: 503 }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('heading', { name: 'Todavía no hay proyectos' })).toBeInTheDocument()
  })

  it('permite volver al listado si Rails no encuentra el proyecto', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: { status: 404, message: 'Recurso no encontrado.' } }, { status: 404 }))
    const user = renderPortal('/projects/9999')

    expect(await screen.findByRole('heading', { name: 'Proyecto no encontrado' })).toBeInTheDocument()
    fetchMock.mockResolvedValueOnce(Response.json({ projects: [] }))
    await user.click(within(screen.getByRole('main')).getByRole('link', { name: 'Mis proyectos' }))
    expect(await screen.findByRole('heading', { name: 'Todavía no hay proyectos' })).toBeInTheDocument()
  })
})
