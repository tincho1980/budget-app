import { isSessionIdentity, type PortalSession } from './auth'
import { apiRequest } from './client'

type LoginCredentials = {
  email_address: string
  password: string
}

type LoginResponse = {
  token: string
  user?: { name: string; email_address: string }
  client?: { business_name: string }
}

export async function createSession(credentials: LoginCredentials): Promise<PortalSession> {
  const session = await apiRequest<LoginResponse>('/login', {
    method: 'POST',
    body: credentials,
    requiresAuth: false,
  })

  if (typeof session?.token !== 'string' || !session.token.trim()) {
    throw new Error('La API no devolvió un token de acceso. Intentá de nuevo.')
  }

  const identity = {
    name: session.user?.name,
    email: session.user?.email_address,
    businessName: session.client?.business_name,
  }

  return { token: session.token, identity: isSessionIdentity(identity) ? identity : undefined }
}

export function destroySession(): Promise<void> {
  return apiRequest<void>('/logout', { method: 'DELETE' })
}
