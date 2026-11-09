import { describe, it, expect } from 'vitest'
import { priceOrder, findCoupon, refundPct } from './pricing'

describe('checkout pricing', () => {
  it('adds 15% VAT with no coupon', () => {
    const p = priceOrder(2400)
    expect(p.vat).toBe(360); expect(p.total).toBe(2760)
  })
  it('applies the coupon before VAT', () => {
    const c = findCoupon(' welcome10 ')!
    expect(c.pct).toBe(10)
    const p = priceOrder(2400, c.pct)
    expect(p.discount).toBe(240); expect(p.net).toBe(2160); expect(p.vat).toBe(324); expect(p.total).toBe(2484)
    expect(priceOrder(9800, findCoupon('DEMO15')!.pct).total).toBeCloseTo(9800 * 0.85 * 1.15, 2)
  })
  it('rejects unknown coupons and sets refund tiers', () => {
    expect(findCoupon('NOPE')).toBeNull()
    expect(refundPct(14)).toBe(100); expect(refundPct(3)).toBe(50); expect(refundPct(-1)).toBe(0)
  })
})
