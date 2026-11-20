import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { isSessionStorageUpdate } from '../api/auth'
import { Layout } from '../components/Layout.tsx'
import { Account } from '../pages/Account'
import { BudgetDetail } from '../pages/BudgetDetail'
import { Login } from '../pages/Login'
import { ProjectDetail } from '../pages/ProjectDetail'
import { Projects } from '../pages/Projects'
import { ReportPayment } from '../pages/ReportPayment'
import { ProtectedRoute } from './ProtectedRoute'

export function AppRoutes() {
  useEffect(() => {
    function syncSession(event: StorageEvent) {
      // Reload when another tab changes the session so its data cache starts empty.
      if (isSessionStorageUpdate(event)) window.location.reload()
    }

    window.addEventListener('storage', syncSession)
    return () => window.removeEventListener('storage', syncSession)
  }, [])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route index element={<Projects />} />
          <Route path="projects/:id" element={<ProjectDetail />} />
          <Route path="budgets/:id" element={<BudgetDetail />} />
          <Route path="account" element={<Account />} />
          <Route path="payments/new" element={<ReportPayment />} />
        </Route>
      </Route>
    </Routes>
  )
}
