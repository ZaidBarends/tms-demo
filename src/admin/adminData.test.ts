import { describe, it, expect } from 'vitest'
import { buildSeed } from '../shared/seed'
import { people, orgMetrics, trail, activityCategory } from './adminData'

describe('admin directory data', () => {
  const d = buildSeed()
  it('lists every contact, learner, staff member and recruiter once', () => {
    expect(people(d)).toHaveLength(d.contacts.length + d.learners.length + d.staff.length + d.recruiters.length)
    expect(new Set(people(d).map(p => p.key)).size).toBe(people(d).length)
  })
  it('computes org spend and open invoices from invoices', () => {
    const m = orgMetrics(d, 'o1')
    expect(m.learners).toBe(9); expect(m.openInvoices).toBeGreaterThan(0); expect(m.spend).toBeGreaterThan(0)
  })
  it('merges activity and audit newest first', () => {
    const t = trail(d)
    expect(t).toHaveLength(d.activity.length + d.audit.length)
    expect(t[0].at >= t[t.length - 1].at).toBe(true)
    expect(activityCategory('Invoice INV-0042 failed to sync to Workbook')).toBe('Finance')
  })
})
