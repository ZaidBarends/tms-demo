import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  const m: Record<string, string> = {}
  ;(globalThis as any).localStorage = { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => { m[k] = v }, removeItem: (k: string) => { delete m[k] } }
})
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import { useStore } from '../../shared/store'

const paths: [string, string][] = [
  ['admin', '/quotes/q1'], ['admin', '/quotes/new'], ['admin', '/quotes/q2'], ['client', '/quotes/q1'], ['client', '/quotes/q3'],
  ['admin', '/sessions/x2'], ['admin', '/sessions/x1'], ['instructor', '/sessions/x2'], ['admin', '/course/k2'], ['admin', '/course/nope'],
  ['admin', '/course'], ['instructor', '/calendar'], ['admin', '/calendar'], ['instructor', '/my-schedule'], ['admin', '/resources'],
]

describe('deep routes render', () => {
  for (const [persona, path] of paths) {
    it(`${persona} ${path}`, () => {
      useStore.getState().setPersona(persona as 'admin')
      const html = renderToString(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)
      expect(html.length).toBeGreaterThan(500)
    })
  }
})
