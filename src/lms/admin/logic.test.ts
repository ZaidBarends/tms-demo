import { describe, it, expect } from 'vitest'
import { cellStatus, compliancePct } from './logic'
import type { Enrolment } from '../../shared/types'

const e = (p: Partial<Enrolment>): Enrolment => ({ id: 'e', learnerId: 'l1', courseId: 'k1', payer: 'employer', progress: 0, status: 'Booked', ...p })

describe('compliance matrix', () => {
  it('classifies a learner against a course', () => {
    expect(cellStatus([], 'l1', 'k1', '2026-11-09').status).toBe('none')
    expect(cellStatus([e({ deadline: '2026-11-01' })], 'l1', 'k1', '2026-11-09').status).toBe('overdue')
    expect(cellStatus([e({ deadline: '2026-12-01' })], 'l1', 'k1', '2026-11-09').status).toBe('assigned')
    expect(cellStatus([e({ status: 'In progress', progress: 40 })], 'l1', 'k1', '2026-11-09').status).toBe('progress')
    expect(cellStatus([e({ status: 'Completed', deadline: '2026-01-01' })], 'l1', 'k1', '2026-11-09').status).toBe('complete')
  })
  it('computes the share of mandatory courses completed', () => {
    const es = [e({ status: 'Completed', courseId: 'k1' }), e({ id: 'e2', courseId: 'k11' })]
    expect(compliancePct(es, 'l1', ['k1', 'k11'])).toBe(50)
    expect(compliancePct(es, 'l1', [])).toBe(100)
  })
})
