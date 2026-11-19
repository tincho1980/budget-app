import { apiRequest } from './client'

export type BudgetStatus = 'sent' | 'approved' | 'rejected'
export type BudgetDecision = 'approve' | 'reject'

export type BudgetSummary = {
  id: number
  version: number
  status: BudgetStatus
  total: string
}

type BudgetModule = {
  name: string
  items: { description: string; estimated_hours: string }[]
}

export type Budget = BudgetSummary & {
  sent_at: string | null
  approved_at: string | null
  notes: string | null
  signed_document_url: string | null
  project: { id: number; name: string }
  estimated_hours: string
  modules: BudgetModule[]
}

export const budgetKeys = {
  detail: (id: string) => ['budgets', id] as const,
}

export async function getBudget(id: string, signal?: AbortSignal): Promise<Budget> {
  const { budget } = await apiRequest<{ budget: Budget }>(`/budgets/${encodeURIComponent(id)}`, { signal })
  return budget
}

export async function decideBudget(id: string, decision: BudgetDecision): Promise<Budget> {
  const { budget } = await apiRequest<{ budget: Budget }>(`/budgets/${encodeURIComponent(id)}/${decision}`, {
    method: 'POST',
  })
  return budget
}
