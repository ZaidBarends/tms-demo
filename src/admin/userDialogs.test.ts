import { describe, it, expect } from 'vitest'
import { buildSeed } from '../shared/seed'
import { people } from './adminData'
import { blockers, isProtected } from './UserDialogs'

describe('user removal guards', () => {
  const d = buildSeed()
  const all = people(d)
  it('protects the identities the personas are built on', () => {
    for (const name of ['Thandi Mokoena', 'Naledi Dlamini', 'Ayesha Patel', 'Zanele Ndlovu']) {
      const p = all.find(x => x.name === name)!
      expect(isProtected(d, p)).toBe(true)
      expect(blockers(d, p).length).toBeGreaterThan(0)
    }
  })
  it('blocks removing a learner who has enrolments', () => {
    const p = all.find(x => x.source === 'learner' && d.enrolments.some(e => e.learnerId === x.id) && !isProtected(d, x))!
    expect(blockers(d, p).join(' ')).toMatch(/enrolment/)
  })
  it('lets a brand-new user be removed', () => {
    const p = { key: 'l:u-new', id: 'u-new', source: 'learner' as const, name: 'New Person', kind: 'B2C learner' as const, org: 'Self-paying', email: 'n@x.example', phone: '–', note: '' }
    expect(blockers(d, p)).toEqual([])
  })
})
