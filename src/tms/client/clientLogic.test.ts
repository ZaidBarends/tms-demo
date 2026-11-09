import { describe, it, expect } from 'vitest'
import { buildSeed } from '../../shared/seed'
import { today } from '../../shared/format'
import { invTotal } from '../../shared/calc'
import { buildClientSeed } from './clientSeed'
import { aging, complianceMatrix, ledger, parseBulk } from './clientLogic'

describe('compliance matrix', () => {
  it('covers Cape Freight staff only and scores in-date certificates', () => {
    const d = buildSeed()
    const m = complianceMatrix(d, buildClientSeed(), 'o1', today())
    expect(m.rows.length).toBeGreaterThanOrEqual(9)
    expect(m.score).toBeGreaterThanOrEqual(0)
    expect(m.score).toBeLessThanOrEqual(100)
    expect(m.counts.expiring).toBeGreaterThan(0)
    expect(m.expiries.every(e => e.days >= 0 && e.days <= 90)).toBe(true)
    const names = m.rows.map(r => r.person.name)
    expect(names).not.toContain('Hendrik Louw')
  })
})

describe('bulk add parsing', () => {
  const d = buildSeed()
  it('validates lines, resolves courses and flags duplicates', () => {
    const rows = parseBulk('name,email,course\nAbe Lincoln,abe@capefreight.example,HSE-101\nBad,not-an-email,First Aid\nAbe Again,abe@capefreight.example,Time Management\nJo Lee,jo@capefreight.example,Nonsense', d.courses, [])
    expect(rows).toHaveLength(4)
    expect(rows[0].errors).toEqual([])
    expect(rows[0].courseId).toBe(d.courses.find(c => c.code === 'HSE-101')!.id)
    expect(rows[1].errors.length).toBeGreaterThan(0)
    expect(rows[2].errors).toContain('Email already used')
    expect(rows[3].errors).toContain('Course not found')
  })
})

describe('statement', () => {
  it('ends on the outstanding balance and buckets unpaid invoices', () => {
    const d = buildSeed()
    const inv = d.invoices.filter(i => i.orgId === 'o1')
    const lines = ledger(inv)
    const outstanding = inv.filter(i => i.status !== 'Paid').reduce((a, i) => a + invTotal(i), 0)
    expect(lines[lines.length - 1].balance).toBeCloseTo(outstanding, 2)
    const buckets = aging(inv, today())
    expect(buckets.reduce((a, b) => a + b.amount, 0)).toBeCloseTo(outstanding, 2)
  })
})
