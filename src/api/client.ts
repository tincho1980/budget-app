import { clearToken, getToken } from './auth'

export type FieldErrors = Record<string, string[]>

const GENERIC_MESSAGE = 'Ocurrió un error inesperado. Intentá de nuevo.'
const NETWORK_MESSAGE = 'No se pudo conectar con el servidor. Revisá tu conexión.'

export class ApiError extends Error {
  readonly status: number
  readonly errors: FieldErrors
  readonly details: string[]

  constructor(message: string, status: number, errors: FieldErrors = {}, details: string[] = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
    this.details = details
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  requiresAuth?: boolean
}

function isFieldErrors(value: unknown): value is FieldErrors {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  return Object.values(value).every(
    (messages) =>
      Array.isArray(messages) && messages.every((m) => typeof m === 'string'),
  )
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function toApiError(status: number, body: unknown): ApiError {
  if (typeof body === 'object' && body !== null && 'errors' in body) {
    const { errors } = body
    if (isFieldErrors(errors)) {
      const first = Object.values(errors).flat()[0]
      return new ApiError(first ?? GENERIC_MESSAGE, status, errors)
    }
  }
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const { error } = body
    if (typeof error === 'string') return new ApiError(error, status)
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const message = typeof error.message === 'string' ? error.message : GENERIC_MESSAGE
      const details = 'details' in error && Array.isArray(error.details)
        ? error.details.filter((detail): detail is string => typeof detail === 'string')
        : []
      return new ApiError(message, status, {}, details)
    }
  }
  return new ApiError(GENERIC_MESSAGE, status)
}

function redirectToLogin(): void {
  if (window.location.pathname !== '/login') {
    window.location.assign('/login')
  }
}

export async function apiRequest<T>(
  path: string,
  { body, headers, requiresAuth = true, ...init }: RequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers)
  requestHeaders.set('Accept', 'application/json')

  const token = requiresAuth ? getToken() : null
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`)

  let payload: BodyInit | undefined
  if (body instanceof FormData) {
    payload = body
  } else if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
    payload = JSON.stringify(body)
  }

  let response: Response
  try {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1'
    response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      ...init,
      headers: requestHeaders,
      body: payload,
    })
  } catch {
    throw new ApiError(NETWORK_MESSAGE, 0)
  }

  const data = await parseBody(response)

  if (response.status === 401 && token && getToken() === token) {
    clearToken()
    redirectToLogin()
  }

  if (!response.ok) throw toApiError(response.status, data)

  return data as T
}
