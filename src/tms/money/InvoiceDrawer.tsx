import { useMemo, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Status, EmailPreview } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { clientName, invTotal } from '../../shared/calc'
import { fmtDate, fmtDateTime, money, today, VAT_RATE } from '../../shared/format'
import { SideDrawer, Timeline } from './ui'
import { useMoney } from './store'
import { applyCreditNote, markPaid, reminderMessage, resendWb, sendReminder } from './actions'
import { balanceOf, bucketOf, daysPastDue, invoiceLines, validateCredit } from './calc'
import { owing } from './payments'

const REASONS = ['Pricing error', 'Learner no-shows', 'Course cancelled', 'Duplicate billing', 'Goodwill gesture']

export default function InvoiceDrawer({ number, onClose, onDocument }: { number: string | null; onClose: () => void; onDocument: (n: string) => void }) {
  const d = useStore(s => s.data)
  const events = useMoney(s => s.events)
  const attempts = useMoney(s => s.attempts)
  const payments = useMoney(s => s.payments)
  const inv = number ? d.invoices.find(i => i.number === number) : undefined
  const [credit, setCredit] = useState(false)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [errs, setErrs] = useState<{ amount?: string; reason?: string }>({})
  const [msg, setMsg] = useState<{ to: string; subject: string; body: string } | null>(null)
  const [flash, setFlash] = useState('')
  const now = today()

  const timeline = useMemo(() => {
    if (!inv) return []
    const items: { id: string; at: string; text: string; tone?: 'ok' | 'bad' | 'info' | 'warn'; meta?: string }[] = [
      { id: 'iss', at: `${inv.issued}T08:00:00`, text: `Invoice ${inv.number} issued`, tone: 'info', meta: `Due ${fmtDate(inv.due)}` },
    ]
    const mine = events.filter(e => e.invoice === inv.number)
    mine.forEach(e => items.push({ id: e.id, at: e.at, text: e.text, tone: e.kind === 'reminder' ? 'warn' : e.kind === 'payment' ? 'ok' : 'info' }))
    if (inv.status === 'Paid' && inv.paidOn && !mine.some(e => e.kind === 'payment')) items.push({ id: 'paid', at: `${inv.paidOn}T14:00:00`, text: `Payment of ${money(invTotal(inv))} received`, tone: 'ok' })
    attempts.filter(a => a.number === inv.number).forEach(a => items.push({ id: a.id, at: a.at, text: `Workbook ${a.kind.toLowerCase()} sync: ${a.result}`, tone: a.result === 'Success' ? 'ok' : a.result === 'Failed' ? 'bad' : 'warn', meta: a.message }))
    return items.sort((a, b) => a.at.localeCompare(b.at)).map(e => ({ ...e, meta: [fmtDateTime(e.at), e.meta].filter(Boolean).join(' · ') }))
  }, [inv, events, attempts])

  const close = () => { setCredit(false); setErrs({}); setAmount(''); setReason(''); setNote(''); setFlash(''); onClose() }
  if (!inv) return <SideDrawer open={false} onClose={onClose} title="">{null}</SideDrawer>
  const lines = invoiceLines(inv)
  const vat = inv.amount * VAT_RATE
  const late = daysPastDue(inv, now)

  const submit = () => {
    const v = validateCredit(inv, amount, reason)
    setErrs(v.errors)
    if (!v.ok) return
    const id = applyCreditNote(inv.number, v.amount, reason, note)
    setFlash(`Credit note ${id} for ${money(v.amount)} issued. New balance ${money(invTotal({ ...inv, creditNote: (inv.creditNote ?? 0) + v.amount }))}.`)
    setCredit(false); setAmount(''); setReason(''); setNote('')
  }

  return (
    <>
      <SideDrawer open onClose={close} size="large" title={<>{inv.number} <Status s={inv.status} /></>} subtitle={`${clientName(d, inv)} · ${inv.description}`}>
        {flash && <div className="callout" role="status" style={{ marginBottom: 12 }}>{flash}</div>}
        <div className="row" style={{ marginBottom: 12 }}>
          {inv.status !== 'Paid' && <Button appearance="primary" onClick={() => markPaid([inv.number])}>Record payment</Button>}
          {inv.status !== 'Paid' && <Button onClick={() => setMsg(sendReminder(inv))}>Send reminder</Button>}
          <Button onClick={() => onDocument(inv.number)}>View invoice document</Button>
          <Button onClick={() => setCredit(c => !c)} aria-expanded={credit}>Issue credit note</Button>
          {inv.wb === 'Failed' && <Button onClick={() => resendWb(inv.number)}>Resend {inv.number} to Workbook</Button>}
        </div>

        {credit && (
          <form className="card" onSubmit={e => { e.preventDefault(); submit() }} aria-label="Issue credit note" noValidate>
            <h3 className="card-title" style={{ marginBottom: 10 }}>Issue credit note</h3>
            <div className="form c2">
              <FText label="Amount (incl. VAT)" value={amount} onChange={setAmount} error={errs.amount} placeholder="e.g. 2500" hint={`Up to ${money(invTotal(inv))}`} />
              <FSelect label="Reason" value={reason} onChange={setReason} error={errs.reason} placeholder="Choose a reason" options={REASONS.map(r => ({ value: r, label: r }))} />
            </div>
            <div style={{ margin: '12px 0' }}><FArea label="Internal note (optional)" value={note} onChange={setNote} rows={2} /></div>
            <div className="row"><Button appearance="primary" type="submit">Issue credit note</Button><Button onClick={() => { setCredit(false); setErrs({}) }}>Cancel</Button></div>
          </form>
        )}

        <h3 className="card-title">Amounts</h3>
        <dl className="mny-kv">
          <dt>Subtotal (excl. VAT)</dt><dd>{money(inv.amount)}</dd>
          <dt>VAT at 15%</dt><dd>{money(vat)}</dd>
          {inv.creditNote ? (<><dt>Credit notes</dt><dd>−{money(inv.creditNote)}</dd></>) : null}
          <dt><b>Invoice total</b></dt><dd><b>{money(invTotal(inv))}</b></dd>
          <dt>Received through PayGate, SnapScan or the bank</dt><dd>{money(payments.filter(p => p.invoice === inv.number && ['Matched', 'Part payment', 'Overpaid'].includes(p.status)).reduce((a, p) => a + p.amount, 0))}</dd>
          <dt>Balance outstanding</dt><dd>{money(inv.status === 'Paid' ? balanceOf(inv) : owing(inv, payments))}</dd>
          <dt>Aged balance</dt><dd>{inv.status === 'Paid' ? 'Settled' : `${bucketOf(inv, now)} (${late} days past due)`}</dd>
          <dt>Workbook</dt><dd><Status s={inv.wb} /></dd>
        </dl>

        <h3 className="card-title">Payments received</h3>
        {payments.filter(p => p.invoice === inv.number).length === 0 ? <p className="muted small">None yet. The invoice number, <b>{inv.number}</b>, is the reference every payer should use.</p> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Received</th><th>Through</th><th>Transaction</th><th className="num">Amount</th><th>Result</th></tr></thead>
            <tbody>{payments.filter(p => p.invoice === inv.number).map(p => <tr key={p.id}><td>{fmtDateTime(p.at)}</td><td>{p.processor}</td><td>{p.txId}</td><td className="num">{money(p.amount)}</td><td>{p.status}</td></tr>)}</tbody>
          </table></div>
        )}

        <h3 className="card-title" style={{ marginTop: 18 }}>Line items</h3>
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Amount</th></tr></thead>
          <tbody>{lines.map((l, i) => <tr key={i}><td>{l.description}</td><td className="num">{l.qty}</td><td className="num">{money(l.unit)}</td><td className="num">{money(l.qty * l.unit)}</td></tr>)}</tbody>
        </table></div>

        <h3 className="card-title" style={{ margin: '18px 0 10px' }}>Timeline</h3>
        <Timeline items={timeline} />
      </SideDrawer>
      <EmailPreview open={!!msg} onClose={() => setMsg(null)} to={msg?.to ?? ''} subject={msg?.subject ?? reminderMessage(d, inv).subject} body={msg?.body ?? ''} />
    </>
  )
}
