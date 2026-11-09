import { useState } from 'react'
import { Button, Radio, RadioGroup } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { Modal } from '../shared/ui'
import { FArea, FSelect } from '../shared/fields'
import { daysBetween, fmtDate, money, today } from '../shared/format'
import { printNow } from '../lms/CertificateView'
import { useB2c } from './b2cStore'
import { refundPct } from './pricing'
import { seatsLeft, upcomingSessions } from './courseMeta'
import type { Enrolment, Receipt } from '../shared/types'

export function RequestDialog({ enrol, onClose }: { enrol: Enrolment | null; onClose: () => void }) {
  const d = useStore(s => s.data)
  const addRequest = useB2c(s => s.addRequest)
  const [type, setType] = useState<'Reschedule' | 'Cancel'>('Reschedule')
  const [newId, setNewId] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  if (!enrol) return null
  const course = d.courses.find(c => c.id === enrol.courseId)!
  const cur = d.sessions.find(s => s.id === enrol.sessionId)
  const options = upcomingSessions(d, enrol.courseId).filter(s => s.id !== enrol.sessionId && seatsLeft(d, s) > 0)
  const days = cur ? daysBetween(today(), cur.start) : 30
  const pct = refundPct(days)
  const receipt = d.receipts.find(r => r.enrolmentId === enrol.id)
  const close = () => { setSent(false); setReason(''); setNewId(''); setErr({}); setType('Reschedule'); onClose() }
  const submit = () => {
    const e: Record<string, string> = {}
    if (type === 'Reschedule' && !newId) e.session = 'Choose a new date'
    if (reason.trim().length < 5) e.reason = 'Tell us why (at least 5 characters)'
    setErr(e); if (Object.keys(e).length) return
    addRequest({ enrolId: enrol.id, type, newSessionId: type === 'Reschedule' ? newId : undefined, reason: reason.trim(), refundPct: type === 'Cancel' ? pct : 100 })
    useStore.getState().log(`${type} requested for ${course.title}`)
    setSent(true)
  }
  return (
    <Modal open onClose={close} title={`Change your booking: ${course.title}`} actions={!sent ? <Button appearance="primary" onClick={submit}>Send request</Button> : undefined}>
      {sent ? <div className="callout" role="status"><b>Request sent.</b> The training team will confirm {type === 'Cancel' ? 'your cancellation and refund' : 'your new date'} within one business day. You can follow the status in My bookings.</div> : (
        <div className="form">
          <RadioGroup layout="horizontal" value={type} onChange={(_, x) => setType(x.value as 'Reschedule' | 'Cancel')}><Radio value="Reschedule" label="Reschedule" /><Radio value="Cancel" label="Cancel booking" /></RadioGroup>
          <div className="small muted">Current date: {cur ? fmtDate(cur.start) : 'Online'}</div>
          {type === 'Reschedule' ? (
            options.length ? <FSelect label="New date" value={newId} onChange={setNewId} placeholder="Choose a new date" error={err.session} options={options.map(s => ({ value: s.id, label: `${fmtDate(s.start)} · ${s.venue} (${seatsLeft(d, s)} seats)` }))} />
              : <div className="callout">No other dates with free seats. You can cancel or join a waitlist from the course page.</div>
          ) : (
            <div className="callout">Refund policy: full refund more than 7 days before the start, 50% within 7 days, none after the start. {cur ? <>Your session starts in <b>{days}</b> day(s), so you would receive <b>{pct}%</b>{receipt ? ` (${money(receipt.amount * pct / 100)})` : ''}.</> : 'This is an online course, so the full amount is refundable until you start.'}</div>
          )}
          <FArea label="Reason" value={reason} onChange={setReason} rows={3} error={err.reason} />
        </div>
      )}
    </Modal>
  )
}

/** Print-style tax invoice or receipt. */
export function DocModal({ receipt, kind, onClose, name, company }: { receipt: Receipt | null; kind: 'Receipt' | 'Tax invoice'; onClose: () => void; name: string; company?: string }) {
  const d = useStore(s => s.data)
  const order = useB2c(s => (receipt ? s.orders[receipt.id] : undefined))
  if (!receipt) return null
  const course = d.courses.find(c => c.id === receipt.courseId)
  const total = receipt.amount
  const net = order?.net ?? total / 1.15; const vat = order?.vat ?? total - net
  const gross = order ? order.net + order.discount : net
  return (
    <Modal open onClose={onClose} title={`${kind} ${receipt.id}`} wide actions={<Button appearance="primary" onClick={printNow}>Print / Save as PDF</Button>}>
      <div className="doc lms-print">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div><h2>{kind}</h2><div>No. {receipt.id}{kind === 'Tax invoice' ? ` · Order ${order?.ref ?? '–'}` : ''}</div><div>Date {fmtDate(receipt.date)}</div></div>
          <div style={{ textAlign: 'right' }}><b>Zimele Technologies (Pty) Ltd</b><div>Building 11, Stanford Office Park, 12 Bauhinia Street, Highveld, Centurion, 0169</div><div>VAT no. 4123456789 · Reg. 2015/123456/07</div></div>
        </div>
        <p><b>Billed to</b><br />{name}{company ? <><br />{company}</> : null}</p>
        <table><thead><tr><th>Description</th><th className="num">Amount</th></tr></thead><tbody>
          <tr><td>{course?.title} ({course?.code}), {course?.hours} hours</td><td className="num">{money(gross)}</td></tr>
          {order?.coupon && <tr><td>Coupon {order.coupon} ({order.couponPct}% off)</td><td className="num">-{money(order.discount)}</td></tr>}
          <tr><td>Subtotal excluding VAT</td><td className="num">{money(net)}</td></tr>
          <tr><td>VAT (15%)</td><td className="num">{money(vat)}</td></tr>
          <tr><td><b>Total {kind === 'Receipt' ? 'paid' : 'due'}</b></td><td className="num"><b>{money(total)}</b></td></tr>
        </tbody></table>
        <p>Paid by {receipt.method === 'Card' ? 'card' : 'EFT'} on {fmtDate(receipt.date)}. <b style={{ color: '#13a10e', border: '2px solid #13a10e', padding: '2px 8px', borderRadius: 4, marginLeft: 8 }}>PAID</b></p>
        <p className="small" style={{ color: '#666' }}>Demo document. Bank: Demo Bank, account 000 000 000. Thank you for learning with us.</p>
      </div>
    </Modal>
  )
}
