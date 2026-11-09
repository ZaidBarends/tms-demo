import { VAT_RATE } from '../shared/format'

export interface Coupon { code: string; pct: number; label: string }
export const COUPONS: Coupon[] = [
  { code: 'WELCOME10', pct: 10, label: 'Welcome offer, 10% off' },
  { code: 'DEMO15', pct: 15, label: 'Demo discount, 15% off' },
  { code: 'STUDENT5', pct: 5, label: 'Learner community, 5% off' },
]
export const findCoupon = (code: string): Coupon | null => COUPONS.find(c => c.code === code.trim().toUpperCase()) ?? null

export interface Priced { price: number; discount: number; net: number; vat: number; total: number }
/** Price an order: the discount comes off the ex-VAT price, then 15% VAT is added to the discounted amount. */
export function priceOrder(price: number, pct = 0): Priced {
  const discount = Math.round(price * (pct / 100) * 100) / 100
  const net = price - discount
  const vat = Math.round(net * VAT_RATE * 100) / 100
  return { price, discount, net, vat, total: Math.round((net + vat) * 100) / 100 }
}

/** Refund share when a booking is cancelled: full more than 7 days out, half within 7 days, none once started. */
export function refundPct(daysToStart: number): number {
  return daysToStart > 7 ? 100 : daysToStart >= 0 ? 50 : 0
}
