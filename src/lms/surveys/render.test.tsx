import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  const m = new Map<string, string>()
  ;(globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) }, clear: () => m.clear(), key: () => null, length: 0 }
})
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { useStore } from '../../shared/store'
import { buildSeed } from '../../shared/seed'
import SurveyResults from '../admin/SurveyResults'
import SurveyStatus from './SurveyStatus'

describe('survey screens render', () => {
  it('results tab and learner status', () => {
    useStore.setState({ data: buildSeed() })
    const html = renderToString(<MemoryRouter><SurveyResults /></MemoryRouter>)
    expect(html).toContain('Pre-course response rate')
    expect(html).toContain('Microsoft Forms links')
    const e = useStore.getState().data.enrolments.find(x => x.status === 'Booked')!
    expect(renderToString(<SurveyStatus enrolId={e.id} />)).toMatch(/Pre-course survey|Pre/)
  })
})
