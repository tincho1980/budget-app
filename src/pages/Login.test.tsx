import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getToken } from '../api/auth'
import { AppRoutes } from '../routes/AppRoutes'

const fetchMock = vi.fn<typeof fetch>()

function renderPortal(initialPath = '/login') {
  const queryClient = new QueryClient()
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  return { queryClient, user: userEvent.setup() }
}

async function enterCredentials(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Correo electrónico'), 'cliente@example.test')
  await user.type(screen.getByLabelText('Contraseña'), 'contraseña-de-prueba')
}

describe('Login del portal', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubEnv('VITE_API_URL', '/api/v1')
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    onlineManager.setOnline(true)
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('protege la ruta, retoma el destino después del login y revoca la sesión al salir', async () => {
    let respondToLogin!: (response: Response) => void
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { respondToLogin = resolve }))
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const { queryClient, user } = renderPortal('/account')
    await screen.findByRole('heading', { name: 'Ingresar' })
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()

    await enterCredentials(user)
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('button', { name: 'Ingresando…' })).toBeDisabled()

    respondToLogin(Response.json({ token: 'token-de-prueba' }, { status: 201 }))
    expect(await screen.findByRole('heading', { name: 'Estado de cuenta' })).toBeInTheDocument()
    expect(getToken()).toBe('token-de-prueba')
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email_address: 'cliente@example.test', password: 'contraseña-de-prueba' }),
    }))
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has('Authorization')).toBe(false)

    queryClient.setQueryData(['account'], { debt: '123.00' })
    await user.click(screen.getByRole('button', { name: 'Salir' }))
    expect(await screen.findByRole('heading', { name: 'Ingresar' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/logout', expect.objectContaining({ method: 'DELETE' }))
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('Authorization')).toBe('Bearer token-de-prueba')
    expect(getToken()).toBeNull()
    expect(queryClient.getQueryData(['account'])).toBeUndefined()
  })

  it('marca campos obligatorios y no llama a la API si están vacíos', async () => {
    const { user } = renderPortal()
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(screen.getByLabelText('Correo electrónico')).toHaveAccessibleDescription('Ingresá tu correo electrónico.')
    expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription('Ingresá tu contraseña.')
    expect(screen.getByLabelText('Correo electrónico')).toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('muestra el mensaje de Rails para credenciales inválidas', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({
      error: { status: 401, message: 'Email o contraseña incorrectos.' },
    }, { status: 401 }))
    const { user } = renderPortal()
    await enterCredentials(user)
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.')
    expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
    expect(getToken()).toBeNull()
  })

  it('permite reintentar si falla la conexión con la API', async () => {
    onlineManager.setOnline(false)
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    fetchMock.mockResolvedValueOnce(Response.json({ token: 'token-de-prueba' }, { status: 201 }))
    const { user } = renderPortal()
    await enterCredentials(user)
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo conectar con el servidor.')
    onlineManager.setOnline(true)
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(await screen.findByRole('heading', { name: 'Mis proyectos' })).toBeInTheDocument()
  })
})
