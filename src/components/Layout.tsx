import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Button } from './ui/Button'

const links = [
  { to: '/', label: 'Mis proyectos', end: true },
  { to: '/account', label: 'Estado de cuenta', end: false },
  { to: '/payments/new', label: 'Informar pago', end: false },
]

export function Layout() {
  const { logout, isLoggingOut } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b border-border-subtle">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 sm:px-6">
          <span className="text-base font-semibold tracking-tight">Adavra</span>
          <nav aria-label="Principal" className="flex flex-1 flex-wrap gap-1">
            {links.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `rounded-control px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
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
          <Button variant="ghost" className="px-3 py-2" busy={isLoggingOut} onClick={() => logout()}>
            {isLoggingOut ? 'Saliendo…' : 'Salir'}
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}
