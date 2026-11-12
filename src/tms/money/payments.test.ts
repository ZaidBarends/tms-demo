import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  const m: Record<string, string> = {}
  ;(globalThis as any).localStorage = { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => { m[k] = v }, removeItem: (k: string) => { delete m[k] } }
})
import { useStore } from '../../shared/store'
import { invTotal } from '../../shared/calc'
import { useMoney } from './store'
import { allocateUnmatched, applyNotification, classify, dismissPayment, needsAttention, nextInvoiceNumber, normaliseRef, owing, raiseCheckoutInvoice } from './payments'

const open = () => useStore.getState().data.invoices.find(i => i.status === 'Sent' && i.orgId)!
const inv = (n: string) => useStore.getState().data.invoices.find(i => i.number === n)!

beforeEach(() => { useStore.getState().reset() })

describe('payment reference matching', () => {
  it('normalises references typed by people', () => {
    expect(normaliseRef(' inv-0042 ')).toBe('INV-0042')
    expect(normaliseRef('inv-0042-a2')).toBe('INV-0042')
  })
  it('classifies by invoice and amount', () => {
    const i = open()
    const bal = invTotal(i)
    expect(classify(undefined, 0, 100)).toBe('Unmatched')
    expect(classify(i, bal, bal)).toBe('Matched')
    expect(classify(i, bal, bal - 100)).toBe('Part payment')
    expect(classify(i, bal, bal + 100)).toBe('Overpaid')
    expect(classify({ ...i, status: 'Paid' }, 0, bal)).toBe('Duplicate')
  })
  it('settles an invoice when the reference and amount match, and records who paid', () => {
    const i = open()
    const r = applyNotification({ reference: i.number.toLowerCase(), amount: invTotal(i), processor: 'PayGate', txId: 'PG-1' })
    expect(r.outcome).toBe('Matched')
    expect(inv(i.number).status).toBe('Paid')
    const rec = useMoney.getState().payments.find(p => p.txId === 'PG-1')!
    expect(rec.invoice).toBe(i.number); expect(rec.payer.length).toBeGreaterThan(0)
    expect(useMoney.getState().attempts.some(a => a.number === i.number && a.kind === 'Payment' && a.result === 'Queued')).toBe(true)
  })
  it('applies a notification once only', () => {
    const i = open()
    applyNotification({ reference: i.number, amount: invTotal(i), processor: 'SnapScan', txId: 'SS-9' })
    const before = useMoney.getState().payments.length
    expect(applyNotification({ reference: i.number, amount: invTotal(i), processor: 'SnapScan', txId: 'SS-9' }).outcome).toBe('Ignored')
    expect(useMoney.getState().payments.length).toBe(before)
  })
  it('keeps an invoice open on a part payment', () => {
    const i = open()
    const r = applyNotification({ reference: i.number, amount: 100, processor: 'SnapScan' })
    expect(r.outcome).toBe('Part payment')
    expect(inv(i.number).status).not.toBe('Paid')
    expect(owing(inv(i.number), useMoney.getState().payments)).toBeCloseTo(invTotal(i) - 100, 2)
  })
  it('flags a payment for an invoice that is already paid', () => {
    const paid = useStore.getState().data.invoices.find(i => i.status === 'Paid')!
    expect(applyNotification({ reference: paid.number, amount: 500, processor: 'PayGate' }).outcome).toBe('Duplicate')
  })
  it('holds an unknown reference in the unmatched queue and settles nothing', () => {
    const i = open()
    const r = applyNotification({ reference: 'INV-7777', amount: 500, processor: 'PayGate', txId: 'PG-2' })
    expect(r.outcome).toBe('Unmatched')
    expect(inv(i.number).status).toBe('Sent')
    expect(needsAttention(useMoney.getState().payments).some(p => p.txId === 'PG-2')).toBe(true)
  })
  it('rejects an invalid signature', () => {
    const i = open()
    expect(applyNotification({ reference: i.number, amount: invTotal(i), processor: 'PayGate', validSignature: false }).outcome).toBe('Rejected')
    expect(inv(i.number).status).toBe('Sent')
  })
  it('lets Finance dismiss a rejected payment, but not an unmatched one', () => {
    const i = open()
    const r = applyNotification({ reference: i.number, amount: invTotal(i), processor: 'PayGate', validSignature: false })
    expect(needsAttention(useMoney.getState().payments).some(p => p.id === r.payment!.id)).toBe(true)
    expect(dismissPayment(r.payment!.id)).toBe(true)
    expect(needsAttention(useMoney.getState().payments).some(p => p.id === r.payment!.id)).toBe(false)
    const unmatched = useMoney.getState().payments.find(p => p.status === 'Unmatched')!
    expect(dismissPayment(unmatched.id)).toBe(false)
  })
  it('lets Finance allocate the seeded unmatched payment to an invoice', () => {
    const seeded = useMoney.getState().payments.find(p => p.status === 'Unmatched')!
    const i = open()
    const r = allocateUnmatched(seeded.id, i.number)
    expect(r).not.toBeNull()
    expect(useMoney.getState().payments.find(p => p.id === seeded.id)!.invoice).toBe(i.number)
    expect(useMoney.getState().payments.find(p => p.id === seeded.id)!.status).not.toBe('Unmatched')
  })
})

describe('invoice first for online bookings', () => {
  it('raises the next invoice number before payment and matches the payment to it', () => {
    const d = useStore.getState().data
    const course = d.courses.find(c => c.status === 'Active')!
    const learner = d.learners.find(l => l.type === 'b2c')!
    const expected = nextInvoiceNumber(d)
    const no = raiseCheckoutInvoice(learner.id, course.id, course.price)
    expect(no).toBe(expected)
    const made = inv(no)
    expect(made.status).toBe('Sent'); expect(made.learnerId).toBe(learner.id)
    expect(applyNotification({ reference: no, amount: invTotal(made), processor: 'SnapScan' }).outcome).toBe('Matched')
    expect(inv(no).status).toBe('Paid')
    expect(nextInvoiceNumber()).not.toBe(no)
  })
})
