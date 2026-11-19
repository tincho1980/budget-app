import { apiRequest } from './client'
import type { Payment } from './payments'

export type ChargeStatus = 'pending' | 'partial' | 'paid' | 'overdue'

export type AccountCharge = {
  id: number
  period: string
  due_on: string
  status: ChargeStatus
  amount: string
  paid_amount: string
  balance: string
  days_overdue: number
}

export type AccountData = {
  client: { id: number; business_name: string; tax_id: string | null }
  debt: string
  overdue_charges: number
  unpaid_charges: AccountCharge[]
  recent_payments: Payment[]
}

export const accountKey = ['account'] as const

export async function getAccount(signal?: AbortSignal): Promise<AccountData> {
  const { account } = await apiRequest<{ account: AccountData }>('/account', { signal })
  return account
}
