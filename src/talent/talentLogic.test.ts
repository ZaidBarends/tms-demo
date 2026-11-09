import { describe, it, expect } from 'vitest'
import { buildSeed } from '../shared/seed'
import { buildCandidates, extractSkills, matchScore, rankCandidates, recruiterFunnel } from './talentLogic'
import { EMPTY_FILTERS } from './talentTypes'

describe('match score', () => {
  it('weights required skills 3x and lists matched and missing', () => {
    const m = matchScore(['Budgeting', 'Communication'], { required: ['Budgeting', 'Financial literacy'], nice: ['Communication', 'Cost control'] })
    expect(m.matched).toEqual(['Budgeting'])
    expect(m.missing).toEqual(['Financial literacy'])
    expect(m.score).toBe(Math.round((100 * (3 + 1)) / 8))
  })
  it('finds skills in a pasted brief', () => {
    const found = extractSkills('We need someone good at budgeting and agile projects', ['Budgeting', 'Agile delivery', 'First aid'])
    expect(found).toEqual(expect.arrayContaining(['Budgeting', 'Agile delivery']))
    expect(found).not.toContain('First aid')
  })
})

describe('candidates and ranking', () => {
  it('never includes employer-paid courses on a mixed-history candidate', () => {
    const d = buildSeed()
    const lin = d.learners.find(l => l.name === 'Lindiwe Mahlangu')!
    const c = buildCandidates(d).find(x => x.learnerId === lin.id)!
    const employerCourses = d.enrolments.filter(e => e.learnerId === lin.id && e.payer !== 'self').map(e => e.courseId)
    c.timeline.forEach(t => expect(employerCourses).not.toContain(t.courseId))
  })
  it('hides what the learner switches off and sorts by match', () => {
    const d = buildSeed()
    const all = buildCandidates(d)
    const first = all[0]
    const hidden = buildCandidates(d, { [first.learnerId]: { region: false, titles: false, skills: false, summary: false } }).find(x => x.learnerId === first.learnerId)!
    expect(hidden.skills).toHaveLength(0)
    expect(hidden.region).toBe('Not disclosed')
    const ranked = rankCandidates(all, EMPTY_FILTERS, { required: ['Budgeting'], nice: [] })
    expect(ranked[0].m!.score).toBeGreaterThanOrEqual(ranked[ranked.length - 1].m!.score)
  })
  it('funnel never shrinks the wrong way', () => {
    const d = buildSeed()
    const f = recruiterFunnel(d, 'r1', ['TL-4830'], ['TL-4837'])
    for (let i = 1; i < f.length; i++) expect(f[i].value).toBeLessThanOrEqual(f[0].value)
    expect(f[4].value).toBe(1)
  })
})
