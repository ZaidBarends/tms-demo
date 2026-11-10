import { describe, it, expect } from 'vitest'
import { TOURS } from './tours'
import { SCREENS, PERSONAS } from './access'

describe('guided tours', () => {
  it('have unique ids and at least three steps', () => {
    expect(new Set(TOURS.map(t => t.id)).size).toBe(TOURS.length)
    TOURS.forEach(t => expect(t.steps.length).toBeGreaterThanOrEqual(3))
  })
  it('only visit screens the step persona may open', () => {
    for (const t of TOURS) for (const s of t.steps) {
      expect(PERSONAS.some(p => p.id === s.persona), `${t.id}: persona ${s.persona}`).toBe(true)
      if (s.persona === 'all' || t.id === 'access') continue // the access tour deliberately opens a screen the persona cannot use
      const path = s.path.split('?')[0]
      const scr = SCREENS.find(x => x.path === path || path.startsWith(x.path + '/'))
      expect(scr, `${t.id}: no screen for ${s.path}`).toBeTruthy()
      expect(scr!.roles.includes(s.persona as any), `${t.id}: ${s.persona} cannot open ${s.path}`).toBe(true)
    }
  })
})
