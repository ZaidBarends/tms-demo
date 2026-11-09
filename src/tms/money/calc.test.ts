import { describe, it, expect } from 'vitest'
import { ageing, bucketOfDays, dso, validateCredit, pipeline, toCsv, buildLedger, monthlySeries, deltaPct } from './calc'
import { buildSeed } from '../../shared/seed'
import { today } from '../../shared/format'
import { invTotal } from '../../shared/calc'

describe('receivables ageing', () => {
  it('buckets by days past due', () => {
    expect(bucketOfDays(-3)).toBe('Current'); expect(bucketOfDays(1)).toBe('1-30'); expect(bucketOfDays(30)).toBe('1-30')
    expect(bucketOfDays(31)).toBe('31-60'); expect(bucketOfDays(61)).toBe('61+')
  })
  it('sums every unpaid invoice exactly once', () => {
    const d = buildSeed(); const now = today()
    const total = ageing(d.invoices, now).reduce((a, b) => a + b.amount, 0)
    const unpaid = d.invoices.filter(i => i.status !== 'Paid').reduce((a, i) => a + invTotal(i), 0)
    expect(total).toBeCloseTo(unpaid)
  })
  it('computes DSO', () => { expect(dso(300000, 600000, 90)).toBe(45); expect(dso(1, 0)).toBe(0) })
})

describe('credit notes', () => {
  const inv = buildSeed().invoices.find(i => i.number === 'INV-0042')!
  it('rejects bad amounts and missing reasons', () => {
    expect(validateCredit(inv, '', 'x').ok).toBe(false)
    expect(validateCredit(inv, '-5', 'x').errors.amount).toBeTruthy()
    expect(validateCredit(inv, '99999999', 'x').errors.amount).toMatch(/Cannot exceed/)
    expect(validateCredit(inv, '100', '').errors.reason).toBeTruthy()
  })
  it('accepts a valid credit', () => { const v = validateCredit(inv, '1500.50', 'Pricing error'); expect(v.ok).toBe(true); expect(v.amount).toBe(1500.5) })
})

describe('forecast and ledger', () => {
  it('weights the open pipeline by stage', () => {
    const p = pipeline(buildSeed().opportunities)
    expect(p.weighted).toBeGreaterThan(0); expect(p.weighted).toBeLessThan(p.openValue)
    expect(p.funnel[0].conversion).toBe(100)
  })
  it('builds a 12 month series and escapes CSV', () => {
    const d = buildSeed(); const s = monthlySeries(buildLedger(d), today(), 12)
    expect(s).toHaveLength(12); expect(s.every(m => m.invoiced > 0)).toBe(true)
    expect(toCsv([['a,b', 'c"d', 1]])).toBe('"a,b","c""d",1')
    expect(deltaPct(110, 100)).toBe(10)
  })
})
