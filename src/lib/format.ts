const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

const amountFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

export function formatDate(date: string): string {
  return dateFormatter.format(new Date(date))
}

export function formatMoney(amount: string): string {
  return amountFormatter.format(Number(amount))
}
