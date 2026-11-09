import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  const m = new Map<string, string>()
  ;(globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) }, clear: () => m.clear(), key: () => null, length: 0 }
})

import { useStore } from '../../shared/store'
import { buildSeed } from '../../shared/seed'
import { moveStage } from '../ops/mutate'
import { createClientLead, requestView } from './clientOpp'
import { buildClientSeed } from './clientSeed'

describe('client requests reach the staff pipeline', () => {
  it('creates an enquiry for the client org and tracks its stage', () => {
    useStore.setState({ data: buildSeed() })
    const before = useStore.getState().data.opportunities.length
    const id = createClientLead({ orgId: 'o1', courseId: 'k6', people: 6, kind: 'booking', preferredDate: '2099-01-01', delivery: 'On site', notes: 'Two intakes' })!
    const d = useStore.getState().data
    const o = d.opportunities.find(x => x.id === id)!
    expect(d.opportunities.length).toBe(before + 1)
    expect(o.orgId).toBe('o1')
    expect(o.stage).toBe('enquiry')
    expect(o.value).toBeGreaterThan(0)
    expect(o.notes).toContain('client portal')

    const req = { status: 'Requested' as const, oppId: id }
    expect(requestView(req, d).status).toBe('Requested')
    moveStage(id, 'quoted')
    expect(requestView(req, useStore.getState().data)).toMatchObject({ status: 'Requested' })
    expect(requestView(req, useStore.getState().data).note).toMatch(/quote/i)
    moveStage(id, 'won')
    expect(requestView(req, useStore.getState().data).status).toBe('Confirmed')
  })

  it('the seeded request is linked to a real Cape Freight opportunity', () => {
    const d = buildSeed()
    const r = buildClientSeed().bookingRequests[0]
    const o = d.opportunities.find(x => x.id === r.oppId)
    expect(o?.orgId).toBe('o1')
  })

  it('falls back to the stored status when the opportunity is gone', () => {
    const d = buildSeed()
    expect(requestView({ status: 'Confirmed', oppId: 'nope' }, d).status).toBe('Confirmed')
  })
})
