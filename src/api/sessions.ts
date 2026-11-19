import { apiRequest } from './client'

type LoginCredentials = {
  email_address: string
  password: string
}

export async function createSession(credentials: LoginCredentials): Promise<string> {
  const session = await apiRequest<{ token: string }>('/login', {
    method: 'POST',
    body: credentials,
    requiresAuth: false,
  })

  if (typeof session?.token !== 'string' || !session.token.trim()) {
    throw new Error('La API no devolvió un token de acceso. Intentá de nuevo.')
  }

  return session.token
}

export function destroySession(): Promise<void> {
  return apiRequest<void>('/logout', { method: 'DELETE' })
}
