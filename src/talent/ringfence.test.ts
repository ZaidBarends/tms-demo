import { describe, it, expect } from 'vitest'
import { buildSeed } from '../shared/seed'
import { recruiterVisibleProfiles, ringfenceStats } from './ringfence'

describe('talent ringfencing', () => {
  it('never shows an employer-paid or internal learner, even if opted in', () => {
    const data = buildSeed()
    const employerLearners = data.learners.filter(l => l.type !== 'b2c').map(l => l.id)
    // Force every employer-paid / internal learner to be "opted in"
    employerLearners.forEach(id => data.talent.push({ learnerId: id, optedIn: true, summary: 'x', code: 'TL-' + id, region: 'x' }))
    const visible = recruiterVisibleProfiles(data).map(p => p.learnerId)
    employerLearners.forEach(id => expect(visible).not.toContain(id))
  })

  it('only lists self-paid courses on a mixed-history profile', () => {
    const data = buildSeed()
    const lin = data.learners.find(l => l.name === 'Lindiwe Mahlangu')!
    const p = recruiterVisibleProfiles(data).find(x => x.learnerId === lin.id)!
    const employerPaid = data.enrolments.filter(e => e.learnerId === lin.id && e.payer !== 'self').map(e => e.courseId)
    expect(p.courses).toHaveLength(2)
    p.courses.forEach(c => expect(employerPaid).not.toContain(c.id))
  })

  it('hides opted-out learners and reports a live exclusion count', () => {
    const data = buildSeed()
    const zan = data.learners.find(l => l.name === 'Zanele Ndlovu')!
    expect(recruiterVisibleProfiles(data).some(p => p.learnerId === zan.id)).toBe(false)
    data.talent.find(t => t.learnerId === zan.id)!.optedIn = true
    expect(recruiterVisibleProfiles(data).some(p => p.learnerId === zan.id)).toBe(true)
    expect(ringfenceStats(data).excludedLearners).toBe(22)
  })
})
