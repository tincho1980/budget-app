const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeZone: 'UTC',
})

const timestampFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeZone: 'America/Argentina/Buenos_Aires',
})

const amountFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
})

const hoursFormatter = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

export function formatDate(date: string): string {
  const formatter = date.length === 10 ? dateFormatter : timestampFormatter
  return formatter.format(new Date(date))
}

export function formatMoney(amount: string): string {
  return amountFormatter.format(Number(amount))
}

export function formatHours(hours: string): string {
  return `${hoursFormatter.format(Number(hours))} h`
}
