import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmptyState, Modal } from '../../shared/ui'
import { FSelect, FText } from '../../shared/fields'
import { fmtDateTime, money } from '../../shared/format'
import { clientName, invTotal } from '../../shared/calc'
import { useMoney, type PaymentResult, type Processor } from './store'
import { PROCESSORS, allocateUnmatched, applyNotification, dismissAllResolvable, dismissPayment, needsAttention, owing } from './payments'

const TONE: Record<PaymentResult, string> = { Matched: '', 'Part payment': 'warn', Overpaid: 'warn', Duplicate: 'warn', Unmatched: 'bad', Rejected: 'bad' }

/** Payments reported by PayGate, SnapScan and the bank, each matched to an invoice by its number. */
export default function PaymentsCard({ onOpenInvoice, highlight = false }: { onOpenInvoice: (n: string) => void; highlight?: boolean }) {
  const d = useStore(s => s.data)
  const payments = useMoney(s => s.payments)
  const [flash, setFlash] = useState('')
  const [sim, setSim] = useState(false)
  const [alloc, setAlloc] = useState<string | null>(null)
  const [target, setTarget] = useState('')
  const [form, setForm] = useState({ processor: 'PayGate' as Processor, reference: '', amount: '', bad: false })
  const [err, setErr] = useState('')
  const attention = needsAttention(payments)
  const open = d.invoices.filter(i => i.status !== 'Paid')
  const flagged = new Set(attention.map(p => p.id))
  const rows = [...payments].sort((a, b) => Number(flagged.has(b.id)) - Number(flagged.has(a.id)) || b.at.localeCompare(a.at)).slice(0, 12)

  const send = () => {
    const amount = Number(form.amount.replace(/[^0-9.]/g, ''))
    if (!(amount > 0)) return setErr('Enter the amount paid')
    const res = applyNotification({ reference: form.reference, amount, processor: form.processor, validSignature: !form.bad })
    setFlash(res.message); setSim(false); setErr(''); setForm({ processor: 'PayGate', reference: '', amount: '', bad: false })
  }
  const fillFor = (n: string) => { const i = d.invoices.find(x => x.number === n); if (i) setForm(f => ({ ...f, reference: n, amount: String(owing(i, payments) || invTotal(i)) })) }
  const doAlloc = () => {
    if (!alloc || !target) return setErr('Choose the invoice this payment belongs to')
    const res = allocateUnmatched(alloc, target)
    setFlash(res?.message ?? 'Could not allocate that payment.'); setAlloc(null); setTarget(''); setErr('')
  }

  return (
    <>
      <div id="payments-card" className={highlight ? 'pay-focus' : undefined} style={{ scrollMarginTop: 'calc(var(--stick-top, 72px) + var(--head-h, 0px) + 12px)' }}>
      <Card title={`Payments from PayGate, SnapScan and the bank${attention.length ? ` (${attention.length} need attention, shown first)` : ''}`} actions={<>{attention.some(p => p.status !== 'Unmatched') && <Button size="small" onClick={() => { const n = dismissAllResolvable(); setFlash(`${n} payment${n === 1 ? '' : 's'} dismissed.`) }}>Dismiss rejected, duplicate and overpaid</Button>}<Button size="small" onClick={() => { setSim(true); setErr(''); setFlash('') }}>Simulate a notification</Button></>}>
        <p className="muted small" style={{ marginTop: 0 }}>Every payment carries the invoice number as its reference, so it lands on the right invoice and we know who paid what. A reference that matches no invoice waits here until someone allocates it.</p>
        {flash && <div className="callout" role="status" style={{ marginBottom: 12 }}>{flash}</div>}
        {rows.length === 0 ? <EmptyState title="No payments yet" /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Received</th><th>Reference</th><th>Paid by</th><th>Through</th><th>Transaction</th><th className="num">Amount</th><th>Result</th><th /></tr></thead>
            <tbody>{rows.map(p => (
              <tr key={p.id} style={flagged.has(p.id) ? { background: 'var(--brandsoft)' } : undefined}>
                <td>{fmtDateTime(p.at)}</td>
                <td>{d.invoices.some(i => i.number === p.invoice) ? <button className="mny-th" onClick={() => onOpenInvoice(p.invoice)}>{p.invoice}</button> : p.invoice}</td>
                <td>{p.payer || (() => { const i = d.invoices.find(x => x.number === p.invoice); return i ? clientName(d, i) : 'Unknown' })()}</td>
                <td>{p.processor}</td><td>{p.txId}</td><td className="num">{money(p.amount)}</td>
                <td><span className={`mny-pill ${TONE[p.status]}`}>{p.status}</span>{p.note && <div className="muted small">{p.note}</div>}</td>
                <td>{p.status === 'Unmatched' && <Button size="small" appearance="primary" onClick={() => { setAlloc(p.id); setTarget(''); setErr(''); setFlash('') }}>Allocate</Button>}
                  {flagged.has(p.id) && p.status !== 'Unmatched' && <Button size="small" onClick={() => { dismissPayment(p.id); setFlash(`${p.status} payment ${p.txId} dismissed.`) }}>Dismiss</Button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      </div>
      <Modal open={sim} onClose={() => setSim(false)} title="Simulate a payment notification" actions={<Button appearance="primary" onClick={send}>Send notification</Button>}>
        <div className="form">
          <p className="muted small" style={{ margin: 0 }}>In production PayGate and SnapScan call the platform when a payment is made. Use this to see what happens when the reference is right, wrong, or the amount is off.</p>
          <FSelect label="Processor" value={form.processor} onChange={v => setForm({ ...form, processor: v as Processor })} options={PROCESSORS.map(p => ({ value: p, label: p }))} />
          <FSelect label="Pick an open invoice to fill in" value="" onChange={fillFor} placeholder="Choose an invoice (optional)" options={open.map(i => ({ value: i.number, label: `${i.number}: ${clientName(d, i)} (${money(owing(i, payments) || invTotal(i))})` }))} />
          <div className="form c2">
            <FText label="Reference (invoice number)" value={form.reference} onChange={v => setForm({ ...form, reference: v })} placeholder="INV-0042" />
            <FText label="Amount paid (incl. VAT)" value={form.amount} onChange={v => setForm({ ...form, amount: v })} error={err} placeholder="e.g. 2760" />
          </div>
          <label className="small"><input type="checkbox" checked={form.bad} onChange={e => setForm({ ...form, bad: e.target.checked })} /> Make the signature invalid (the notification is rejected)</label>
          <span className="muted small">Try: a wrong number, an amount below or above the balance, or paying an invoice that is already paid.</span>
        </div>
      </Modal>
      <Modal open={!!alloc} onClose={() => setAlloc(null)} title="Allocate an unmatched payment" actions={<Button appearance="primary" onClick={doAlloc}>Allocate</Button>}>
        {(() => { const p = payments.find(x => x.id === alloc); return p ? <p style={{ marginTop: 0 }}>{money(p.amount)} through {p.processor}, transaction {p.txId}, reference <b>{p.invoice}</b>.</p> : null })()}
        <FSelect label="Invoice it belongs to" value={target} onChange={setTarget} error={err} placeholder="Choose an invoice" options={open.map(i => ({ value: i.number, label: `${i.number}: ${clientName(d, i)} (${money(owing(i, payments) || invTotal(i))})` }))} />
      </Modal>
    </>
  )
}
