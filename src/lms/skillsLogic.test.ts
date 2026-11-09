import { describe, it, expect } from 'vitest'
import { gapAnalysis, areaScore } from './skillsLogic'

describe('skills gap', () => {
  it('computes coverage and sorts the biggest gaps first', () => {
    const have: Record<string, number> = { 'Data protection': 3, Compliance: 1, Communication: 2 }
    const g = gapAnalysis('Compliance analyst', s => have[s] ?? 0)
    // needs: 3 + 3 + 2 + 2 + 2 = 12; has min(3,3)+min(1,3)+0+0+min(2,2) = 6
    expect(g.coverage).toBe(50)
    expect(g.rows[0].gap).toBeGreaterThanOrEqual(g.rows[1].gap)
    expect(g.rows.find(r => r.skill === 'Compliance')!.gap).toBe(2)
  })
  it('returns zero for an unknown role and scores areas out of 100', () => {
    expect(gapAnalysis('Nope', () => 3).coverage).toBe(0)
    const skills = [{ name: 'A', category: 'X', soft: false, courseIds: [] }, { name: 'B', category: 'X', soft: false, courseIds: [] }]
    expect(areaScore(skills, 'X', s => (s === 'A' ? 3 : 0))).toBe(50)
  })
})
