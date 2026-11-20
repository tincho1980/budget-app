import { NavLink, Outlet } from 'react-router-dom'
import { getSessionIdentity } from '../api/auth'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/Button'

const links = [
  { to: '/', label: 'Mis proyectos', end: true },
  { to: '/account', label: 'Estado de cuenta', end: false },
  { to: '/payments/new', label: 'Informar pago', end: false },
]

export function Layout() {
  const { logout, isLoggingOut } = useAuth()
  const identity = getSessionIdentity()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:flex-nowrap">
          <span className="shrink-0 text-base font-semibold tracking-tight">Adavra</span>
          <nav aria-label="Principal" className="order-last flex w-full gap-1 overflow-x-auto lg:order-0 lg:w-auto lg:flex-1">
            {links.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap rounded-control px-2.5 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent sm:px-3 ${
                    isActive
                      ? 'bg-surface text-text'
                      : 'text-text-muted hover:bg-surface-hover hover:text-text'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3 lg:max-w-[42%] lg:flex-initial">
            {identity && (
              <div role="group" aria-label="Sesión actual" className="min-w-0 text-right leading-tight">
                <p className="truncate font-semibold" title={identity.name}>{identity.name}</p>
                <p className="truncate text-xs text-text-muted" title={identity.businessName}>{identity.businessName}</p>
                <p className="truncate text-xs text-text-subtle" title={identity.email}>{identity.email}</p>
              </div>
            )}
            <Button variant="ghost" className="shrink-0 px-3 py-2" busy={isLoggingOut} onClick={() => logout()}>
              {isLoggingOut ? 'Saliendo…' : 'Salir'}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
