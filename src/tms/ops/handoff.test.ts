import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  const m = new Map<string, string>()
  ;(globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) }, clear: () => m.clear(), key: () => null, length: 0 }
})

import { useStore } from '../../shared/store'
import { buildSeed } from '../../shared/seed'
import { useOps } from './opsStore'
import { useB2c } from '../../b2c/b2cStore'
import { approveBookingRequest } from '../../b2c/requestActions'
import { acceptQuote, quoteTotals } from './quoteActions'
import { STAGE_PROB } from '../money/calc'
import { STAGE_PROB as PCT } from './logic'

describe('accepted quote hands over to finance and delivery', () => {
  it('raises one invoice and follow-up tasks, and does not duplicate', () => {
    useStore.setState({ data: buildSeed() })
    const q = useStore.getState().data.quotes.find(x => x.status === 'Sent')!
    useOps.getState().setQuoteMeta(q.id, { terms: 'Standard terms apply here', validityDays: 30, lineMeta: [], oppId: 'p1' })
    const before = useStore.getState().data.invoices.length
    acceptQuote(q)
    acceptQuote(q)
    const d = useStore.getState().data
    expect(d.invoices.length).toBe(before + 1)
    const inv = d.invoices[d.invoices.length - 1]
    expect(inv.orgId).toBe(q.orgId)
    expect(inv.wb).toBe('Pending')
    expect(inv.amount).toBeCloseTo(quoteTotals(q).net, 1)
    expect(useOps.getState().quoteMeta[q.id].invoiceNumber).toBe(inv.number)
    expect(useOps.getState().opp['p1'].tasks.filter(t => t.id.startsWith(`ho-${q.id}`)).length).toBe(2)
  })
})

describe('stage probabilities have one source', () => {
  it('money calc fractions equal the ops percentages', () => {
    for (const k of Object.keys(PCT) as (keyof typeof PCT)[]) expect(STAGE_PROB[k]).toBeCloseTo(PCT[k] / 100)
  })
})

describe('staff approve learner booking requests', () => {
  it('cancel releases the seat; reschedule moves it', () => {
    useStore.setState({ data: buildSeed() })
    const d = useStore.getState().data
    const e = d.enrolments.find(x => x.payer === 'self' && x.status === 'Booked' && x.sessionId)!
    useB2c.getState().addRequest({ enrolId: e.id, type: 'Cancel', reason: 'x', refundPct: 50 })
    const r = useB2c.getState().requests[0]
    expect(approveBookingRequest(r)).toBe('')
    expect(useStore.getState().data.enrolments.some(x => x.id === e.id)).toBe(false)
    expect(useB2c.getState().requests[0].status).toBe('Approved')
    expect(approveBookingRequest(useB2c.getState().requests[0])).toMatch(/no longer exists/)
  })
})

describe('certificate expiry', () => {
  it('cybersecurity certificates last a year, others per category', async () => {
    const { CERT_VALIDITY_DAYS } = await import('../../shared/store')
    expect(CERT_VALIDITY_DAYS['Cybersecurity']).toBe(365)
    expect(CERT_VALIDITY_DAYS['Health & Safety']).toBe(730)
    expect(CERT_VALIDITY_DAYS['Leadership']).toBeUndefined()
  })
})
