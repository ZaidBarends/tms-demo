const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const VAT_RATE = 0.15

export function iso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function parse(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function today(): string { return iso(new Date()) }
export function addDays(base: string | Date, n: number): string {
  const d = typeof base === 'string' ? parse(base) : new Date(base)
  d.setDate(d.getDate() + n)
  return iso(d)
}
export function daysBetween(a: string, b: string): number {
  return Math.round((parse(b).getTime() - parse(a).getTime()) / 86400000)
}
export function fmtDate(s?: string): string {
  if (!s) return '–'
  const d = parse(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}
export function fmtShort(s: string): string {
  const d = parse(s)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
export function fmtDateTime(s: string): string {
  const d = new Date(s)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${p(d.getHours())}:${p(d.getMinutes())}`
}
export function money(n: number): string {
  const whole = Math.abs(n % 1) < 0.005
  const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })
  return `${n < 0 ? '-' : ''}R${s}`
}
export function monthKey(s: string): string { return s.slice(0, 7) }
export function monthLabel(k: string): string { return `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}` }

export interface Totals { subtotal: number; discount: number; net: number; vat: number; total: number }
export function totals(lines: { qty: number; unit: number }[], discountPct: number): Totals {
  const subtotal = lines.reduce((a, l) => a + (Number(l.qty) || 0) * (Number(l.unit) || 0), 0)
  const discount = subtotal * ((Number(discountPct) || 0) / 100)
  const net = subtotal - discount
  const vat = net * VAT_RATE
  return { subtotal, discount, net, vat, total: net + vat }
}
