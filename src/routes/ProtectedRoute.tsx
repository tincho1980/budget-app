import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getToken } from '../api/auth'

export function ProtectedRoute() {
  const { pathname, search, hash } = useLocation()

  if (getToken()) return <Outlet />

  return <Navigate to="/login" replace state={{ from: `${pathname}${search}${hash}` }} />
}
