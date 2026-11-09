import { describe, it, expect, vi } from 'vitest'

const mem: Record<string, string> = {}
vi.hoisted(() => {
  const m: Record<string, string> = {}
  ;(globalThis as any).localStorage = { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => { m[k] = v }, removeItem: (k: string) => { delete m[k] } }
})
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { SCREENS, PERSONAS } from './shared/access'
import { useStore } from './shared/store'
import { totals } from './shared/format'
import App from './App'
import { recruiterVisibleProfiles } from './talent/ringfence'

const st = () => useStore.getState()

describe('every screen renders for every persona', () => {
  for (const p of PERSONAS) {
    it(`persona ${p.id}`, () => {
      st().setPersona(p.id)
      for (const s of SCREENS) {
        const html = renderToString(<MemoryRouter initialEntries={[s.path]}><App /></MemoryRouter>)
        expect(html.length).toBeGreaterThan(500)
      }
    })
  }
})

describe('acceptance flows', () => {
  it('quote totals', () => {
    const t = totals([{ qty: 2, unit: 1000 }, { qty: 1, unit: 500 }], 10)
    expect(t.total).toBeCloseTo(2500 * 0.9 * 1.15)
  })
  it('checkout, completion, opt-in, intro, audit, resend, reset', () => {
    st().reset()
    const d0 = st().data
    const zan = d0.learners.find(l => l.name === 'Zanele Ndlovu')!.id
    const course = d0.courses.find(c => c.code === 'SFT-140')!.id
    const before = d0.enrolments.filter(e => e.learnerId === zan).length
    st().checkout(zan, course, undefined, 'Card')
    expect(st().data.enrolments.filter(e => e.learnerId === zan).length).toBe(before + 1)
    expect(st().data.receipts.some(r => r.learnerId === zan && r.courseId === course)).toBe(true)
    const e = st().data.enrolments.find(x => x.learnerId === zan && x.courseId === course)!
    st().completeCourse(e.id)
    expect(st().data.certificates.some(c => c.learnerId === zan && c.courseId === course)).toBe(true)
    expect(recruiterVisibleProfiles(st().data).some(p => p.learnerId === zan)).toBe(false)
    st().setOptIn(zan, true)
    expect(recruiterVisibleProfiles(st().data).some(p => p.learnerId === zan)).toBe(true)
    st().auditView('r1', zan); st().requestIntro('r1', zan, 'Hello there, role for you')
    const intro = st().data.intros.find(i => i.learnerId === zan)!
    expect(intro.status).toBe('Pending')
    st().decideIntro(intro.id, true)
    expect(st().data.intros.find(i => i.id === intro.id)!.status).toBe('Approved')
    expect(st().data.audit.filter(a => a.actor.startsWith('Marcus')).length).toBeGreaterThan(2)
    st().setOptIn(zan, false)
    expect(recruiterVisibleProfiles(st().data).some(p => p.learnerId === zan)).toBe(false)
    expect(st().data.invoices.find(i => i.number === 'INV-0042')!.wb).toBe('Failed')
    st().resendWb('INV-0042')
    expect(st().data.invoices.find(i => i.number === 'INV-0042')!.wb).toBe('Synced')
    st().reset()
    expect(st().data.invoices.find(i => i.number === 'INV-0042')!.wb).toBe('Failed')
  })
})
