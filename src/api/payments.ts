import { apiRequest } from './client'

export const paymentMethods = {
  transfer: 'Transferencia',
  cash: 'Efectivo',
  check: 'Cheque',
} as const

export type PaymentMethod = keyof typeof paymentMethods
export type PaymentStatus = 'pending_review' | 'confirmed' | 'rejected'

export type Payment = {
  id: number
  paid_on: string
  payment_method: PaymentMethod
  status: PaymentStatus
  notes: string | null
  created_at: string
  amount: string
  receipt: { filename: string; content_type: string; byte_size: number; url: string } | null
}

export type PaymentInput = {
  amount: string
  paid_on: string
  payment_method: PaymentMethod
  notes?: string
  receipt?: File
}

export async function reportPayment({ receipt, ...fields }: PaymentInput): Promise<Payment> {
  let body: typeof fields | FormData = fields

  if (receipt) {
    const multipart = new FormData()
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) multipart.set(key, value)
    }
    multipart.set('receipt', receipt)
    body = multipart
  }

  const { payment } = await apiRequest<{ payment: Payment }>('/payments', { method: 'POST', body })
  return payment
}
