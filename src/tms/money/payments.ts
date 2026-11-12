import { useStore } from '../../shared/store'
import { clientName, invTotal } from '../../shared/calc'
import { money, today } from '../../shared/format'
import type { Data, Invoice } from '../../shared/types'
import { formatNumber, useSettings } from '../../admin/settingsStore'
import { useMoney, type PaymentRecord, type PaymentResult, type Processor } from './store'

/**
 * Payments through PayGate and SnapScan (simulated in this demo). The invoice number is the payment reference:
 * it goes out with the payment request and comes back with the notification, so every payment finds its invoice.
 */
export const PROCESSORS: Processor[] = ['PayGate', 'SnapScan', 'Bank transfer']
const COUNTED: PaymentResult[] = ['Matched', 'Part payment', 'Overpaid']
const r2 = (n: number) => Math.round(n * 100) / 100

/** Reference as typed by a payer or returned by a processor: trimmed, upper case, no spaces, retry suffix removed. */
export const normaliseRef = (ref: string) => ref.trim().toUpperCase().replace(/\s+/g, '').replace(/-A\d+$/, '')

export const receivedFor = (payments: PaymentRecord[], number: string) =>
  r2(payments.filter(p => p.invoice === number && COUNTED.includes(p.status)).reduce((a, p) => a + p.amount, 0))

/** What is still owed on an invoice after payments received and credit notes. */
export const owing = (inv: Invoice, payments: PaymentRecord[]) => (inv.status === 'Paid' ? 0 : Math.max(0, r2(invTotal(inv) - receivedFor(payments, inv.number))))

/** The decision made for a notification once its invoice is known. */
export function classify(inv: Invoice | undefined, balance: number, amount: number): PaymentResult {
  if (!inv) return 'Unmatched'
  if (inv.status === 'Paid') return 'Duplicate'
  if (amount < balance - 0.005) return 'Part payment'
  if (amount > balance + 0.005) return 'Overpaid'
  return 'Matched'
}

export const nextInvoiceNumber = (d: Data = useStore.getState().data) => {
  const n = useSettings.getState().settings.numbering
  const top = d.invoices.reduce((m, i) => Math.max(m, Number(/(\d+)$/.exec(i.number)?.[1] ?? 0)), 0)
  return formatNumber(n.invoicePrefix, n.invoicePad, top + 1)
}

/** Raise the invoice for an online booking before payment, so its number can be the payment reference. */
export function raiseCheckoutInvoice(learnerId: string, courseId: string, net: number): string {
  const st = useStore.getState()
  const course = st.data.courses.find(c => c.id === courseId)
  const number = nextInvoiceNumber(st.data)
  useStore.setState(s => {
    const data = structuredClone(s.data)
    data.invoices.push({ number, learnerId, description: `${course?.title ?? 'Course'}: online booking`, amount: r2(net), status: 'Sent', issued: today(), due: today(), wb: 'Pending' })
    return { data }
  })
  useMoney.getState().addEvent({ invoice: number, kind: 'note', text: 'Invoice raised at booking; its number is the payment reference' })
  useMoney.getState().addAttempt({ number, kind: 'Invoice', result: 'Queued', message: 'Waiting for the next sync window' })
  return number
}

function applyToInvoice(inv: Invoice, rec: PaymentRecord) {
  const st = useStore.getState(); const m = useMoney.getState()
  m.addEvent({ invoice: inv.number, kind: 'payment', text: `${money(rec.amount)} received through ${rec.processor} (transaction ${rec.txId}): ${rec.status.toLowerCase()}` })
  if (rec.status === 'Matched' || rec.status === 'Overpaid') {
    st.setInvoiceStatus(inv.number, 'Paid')
    m.addAttempt({ number: inv.number, kind: 'Payment', result: 'Queued', message: 'Payment queued for the next Workbook sync, under the same invoice number' })
  }
  st.log(`${money(rec.amount)} from ${rec.payer} matched to ${inv.number} (${rec.processor}, ${rec.status.toLowerCase()})`)
}

export interface NotificationResult { outcome: PaymentResult | 'Ignored'; payment?: PaymentRecord; invoice?: Invoice; message: string }

/** Handle one payment notification, as the platform would when PayGate or SnapScan calls its endpoint. */
export function applyNotification(n: { reference: string; amount: number; processor: Processor; txId?: string; validSignature?: boolean }): NotificationResult {
  const st = useStore.getState(); const m = useMoney.getState()
  const ref = normaliseRef(n.reference)
  const txId = n.txId ?? `${n.processor === 'PayGate' ? 'PG' : n.processor === 'SnapScan' ? 'SS' : 'BK'}-${Math.floor(10000 + Math.random() * 89999)}`
  if (m.payments.some(p => p.processor === n.processor && p.txId === txId)) return { outcome: 'Ignored', message: `Transaction ${txId} was already applied: no change.` }
  const base = { invoice: ref || n.reference, processor: n.processor, txId, amount: r2(n.amount), at: new Date().toISOString() }
  if (n.validSignature === false) {
    const payment = m.addPayment({ ...base, status: 'Rejected', payer: 'Unknown', note: 'Signature check failed; nothing settled' })
    st.log(`Rejected a ${n.processor} notification: signature check failed`)
    return { outcome: 'Rejected', payment, message: 'The signature did not check out, so the notification was rejected and an alert raised.' }
  }
  const inv = st.data.invoices.find(i => i.number.toUpperCase() === ref)
  if (!inv) {
    const payment = m.addPayment({ ...base, status: 'Unmatched', payer: 'Unknown', note: `Reference ${ref || '(none)'} is not an invoice number` })
    st.log(`Unmatched ${n.processor} payment of ${money(n.amount)}: reference ${ref || '(none)'}`)
    return { outcome: 'Unmatched', payment, message: `No invoice has the number ${ref || '(blank)'}. The payment is in the unmatched queue for Finance.` }
  }
  const outcome = classify(inv, owing(inv, m.payments), r2(n.amount))
  const note = outcome === 'Duplicate' ? 'Invoice was already paid: flag for refund' : outcome === 'Overpaid' ? 'More than the balance: excess to refund or credit' : outcome === 'Part payment' ? 'Less than the balance: invoice stays open' : undefined
  const payment = m.addPayment({ ...base, invoice: inv.number, status: outcome, payer: clientName(st.data, inv), note })
  applyToInvoice(inv, payment)
  const text: Record<PaymentResult, string> = {
    Matched: `Matched to ${inv.number}. Invoice settled.`, 'Part payment': `Part payment recorded on ${inv.number}; the invoice stays open.`,
    Overpaid: `Matched to ${inv.number} and settled. The excess is flagged for Finance.`, Duplicate: `${inv.number} was already paid. Flagged as a duplicate payment.`, Unmatched: '', Rejected: '',
  }
  return { outcome, payment, invoice: inv, message: text[outcome] }
}

/** Finance allocates an unmatched payment to the invoice it was meant for. */
export function allocateUnmatched(paymentId: string, invoiceNumber: string): NotificationResult | null {
  const st = useStore.getState(); const m = useMoney.getState()
  const p = m.payments.find(x => x.id === paymentId); const inv = st.data.invoices.find(i => i.number === invoiceNumber)
  if (!p || !inv || p.status !== 'Unmatched') return null
  const outcome = classify(inv, owing(inv, m.payments), p.amount)
  const payer = clientName(st.data, inv)
  m.updatePayment(p.id, { invoice: inv.number, status: outcome, payer, note: `Allocated to ${inv.number} by Finance` })
  applyToInvoice(inv, { ...p, invoice: inv.number, status: outcome, payer })
  return { outcome, invoice: inv, message: `Allocated to ${inv.number}: ${outcome.toLowerCase()}.` }
}

/** Payments that need a person: unmatched, rejected, duplicate or overpaid. */
export const needsAttention = (payments: PaymentRecord[]) => payments.filter(p => !p.dismissed && ['Unmatched', 'Rejected', 'Duplicate', 'Overpaid'].includes(p.status))

/** Clear a rejected, duplicate or overpaid payment from the alerts once Finance has dealt with it. Unmatched payments must be allocated. */
export function dismissPayment(id: string): boolean {
  const m = useMoney.getState(); const p = m.payments.find(x => x.id === id)
  if (!p || p.status === 'Unmatched' || p.dismissed) return false
  m.updatePayment(id, { dismissed: true, note: `${p.note ? p.note + '. ' : ''}Dismissed by Finance` })
  useStore.getState().log(`${p.processor} ${p.status.toLowerCase()} payment ${p.txId} dismissed`)
  return true
}

/** Dismiss every rejected, duplicate or overpaid payment still showing as an alert. */
export function dismissAllResolvable(): number {
  const ids = needsAttention(useMoney.getState().payments).filter(p => p.status !== 'Unmatched').map(p => p.id)
  ids.forEach(dismissPayment)
  return ids.length
}
