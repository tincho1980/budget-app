const TOKEN_KEY = 'budget-app.token'

export type SessionIdentity = {
  name: string
  email: string
  businessName: string
}

export type PortalSession = {
  token: string
  identity?: SessionIdentity
}

export function isSessionIdentity(value: unknown): value is SessionIdentity {
  if (typeof value !== 'object' || value === null) return false

  const identity = value as Partial<SessionIdentity>
  return typeof identity.name === 'string' && typeof identity.email === 'string'
    && typeof identity.businessName === 'string'
}

function readSession(): PortalSession | null {
  const stored = localStorage.getItem(TOKEN_KEY)
  if (!stored) return null

  // Existing sessions stored the Bearer token as a plain string.
  if (!stored.startsWith('{')) return { token: stored }

  try {
    const { token, identity } = JSON.parse(stored) as Partial<PortalSession>
    return typeof token === 'string' && token
      ? { token, identity: isSessionIdentity(identity) ? identity : undefined }
      : null
  } catch {
    return null
  }
}

export function getToken(): string | null {
  return readSession()?.token ?? null
}

export function getSessionIdentity(): SessionIdentity | null {
  return readSession()?.identity ?? null
}

export function setToken(token: string, identity?: SessionIdentity): void {
  localStorage.setItem(TOKEN_KEY, identity ? JSON.stringify({ token, identity }) : token)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

export function isSessionStorageUpdate(event: StorageEvent): boolean {
  return event.storageArea === localStorage && (event.key === TOKEN_KEY || event.key === null)
}
