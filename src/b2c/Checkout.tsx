import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Checkbox, Radio, RadioGroup, Tab, TabList } from '@fluentui/react-components'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmailPreview, EmptyState } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { fmtDate, money } from '../shared/format'
import { downloadIcs } from '../lms/csv'
import { useB2c } from './b2cStore'
import { priceOrder, type Coupon } from './pricing'
import { OrderSummary, Stepper } from './CheckoutParts'
import { seatsLeft, upcomingSessions } from './courseMeta'
import { applyNotification, nextInvoiceNumber, raiseCheckoutInvoice } from '../tms/money/payments'
import { EftPanel, METHOD_LABEL, PayGateNote, PROCESSOR_OF, SnapScanPanel, type PayMethod } from '../tms/money/PayPanels'
import './b2c.css'

const STEPS = ['Course', 'Your details', 'Payment', 'Confirmation']
const phasesFor = (m: PayMethod, ref: string) => ({
  Card: ['Sending you to the PayGate payment page', 'Waiting for PayGate to confirm', `Matching invoice ${ref}`],
  SnapScan: ['Waiting for the SnapScan payment', 'SnapScan notification received', `Matching invoice ${ref}`],
  EFT: ['Bank transfer received', `Matching the reference ${ref}`, 'Issuing your receipt'],
}[m])

export default function Checkout() {
  const { courseId } = useParams()
  const [qs] = useSearchParams()
  const nav = useNavigate()
  const d = useStore(s => s.data)
  const checkout = useStore(s => s.checkout)
  const { learnerId, learner } = useCtx()
  const { card, saveCard, recordOrder } = useB2c()
  const course = d.courses.find(c => c.id === courseId) ?? d.courses.find(c => c.status === 'Active')
  const renew = qs.get('renew'); const journeyId = qs.get('journey')

  const sessions = course ? upcomingSessions(d, course.id).filter(s => seatsLeft(d, s) > 0) : []
  const [step, setStep] = useState(0)
  const [sessionId, setSessionId] = useState(qs.get('session') ?? sessions[0]?.id ?? '')
  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const [det, setDet] = useState({ name: learner?.name ?? '', email: learner?.email ?? '', phone: learner?.phone ?? '', company: '', terms: false })
  const [method, setMethod] = useState<PayMethod>('Card')
  const [invoiceNo, setInvoiceNo] = useState('')
  const [useSaved, setUseSaved] = useState(!!card)
  const [f, setF] = useState({ name: learner?.name ?? '', number: '', expiry: '', cvv: '', save: false })
  const [err, setErr] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState(-1)
  const [receiptId, setReceiptId] = useState<string | null>(null)
  const [email, setEmail] = useState(false)
  const [orderRef] = useState(() => `ORD-${Math.floor(10000 + Math.random() * 89999)}`)

  const phases = phasesFor(method, invoiceNo || '...')
  useEffect(() => {
    if (phase < 0 || !course) return
    if (phase < phases.length) { const t = setTimeout(() => setPhase(phase + 1), 650); return () => clearTimeout(t) }
    const priced = priceOrder(course.price, coupon?.pct ?? 0)
    // The processor notifies the platform with the invoice number as the reference; the payment is matched to the invoice.
    const note = applyNotification({ reference: invoiceNo, amount: priced.total, processor: PROCESSOR_OF[method] })
    const rid = checkout(learnerId, course.id, sessionId || undefined, method)
    useStore.setState(s => { const nd = structuredClone(s.data); const r = nd.receipts.find(x => x.id === rid); if (r) { r.amount = priced.total; r.invoice = invoiceNo } return { data: nd } })
    recordOrder(rid, { coupon: coupon?.code, couponPct: coupon?.pct, discount: priced.discount, net: priced.net, vat: priced.vat, total: priced.total, ref: orderRef, method, sessionId: sessionId || undefined, renewal: renew ?? undefined, invoice: invoiceNo, processor: PROCESSOR_OF[method], txId: note.payment?.txId })
    if (f.save && method === 'Card' && !useSaved && /^\d{13,19}$/.test(f.number.replace(/\s/g, ''))) saveCard({ brand: 'Card', last4: f.number.replace(/\s/g, '').slice(-4), name: f.name, expiry: f.expiry })
    if (coupon) useStore.getState().log(`Coupon ${coupon.code} used on ${course.title} booking`)
    setReceiptId(rid); setPhase(-1); setStep(3)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!course) return <><PageHeader id="checkout" title="Checkout" /><EmptyState title="No course" action={<Link to="/catalogue">Browse the catalogue</Link>} /></>
  const priced = priceOrder(course.price, coupon?.pct ?? 0)
  const sess = d.sessions.find(s => s.id === sessionId)
  const dateLabel = sess ? `${fmtDate(sess.start)} · ${sess.venue}` : 'Online, start any time'
  const existing = d.enrolments.find(e => e.learnerId === learnerId && e.courseId === course.id && e.status !== 'Completed')
  const reference = invoiceNo || nextInvoiceNumber(d)

  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 0 && sessions.length && !sessionId) e.session = 'Choose a date'
    if (s === 1) {
      if (det.name.trim().length < 3) e.dname = 'Enter your full name'
      if (!/^\S+@\S+\.\S+$/.test(det.email)) e.demail = 'Enter a valid email address'
      if (det.phone.replace(/\D/g, '').length < 10) e.dphone = 'Enter a phone number with at least 10 digits'
      if (!det.terms) e.terms = 'Please accept the booking terms'
    }
    if (s === 2 && method === 'Card') {
      if (useSaved && card) { if (!/^\d{3,4}$/.test(f.cvv)) e.cvv = 'Enter the 3 or 4 digit CVV to confirm' }
      else {
        if (f.name.trim().length < 3) e.name = 'Enter the name on the card'
        if (!/^\d{13,19}$/.test(f.number.replace(/\s/g, ''))) e.number = 'Enter a card number of 13 to 19 digits'
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(f.expiry)) e.expiry = 'Use MM/YY'
        if (!/^\d{3,4}$/.test(f.cvv)) e.cvv = '3 or 4 digits'
      }
    }
    setErr(e); return Object.keys(e).length === 0
  }
  const next = () => { if (validate(step)) setStep(step + 1) }
  const pay = () => { if (!validate(2)) return; setInvoiceNo(raiseCheckoutInvoice(learnerId, course.id, priced.net)); setPhase(0) }

  if (step === 3 && receiptId) {
    const r = d.receipts.find(x => x.id === receiptId)
    const order = useB2c.getState().orders[receiptId]
    const nextJourneyCourse = journeyId ? (() => { const j = d.journeys.find(x => x.id === journeyId); return j?.courseIds.find(cid => cid !== course.id && !d.enrolments.some(e => e.learnerId === learnerId && e.courseId === cid)) })() : undefined
    return (
      <>
        <PageHeader id="checkout" title="Payment received" subtitle="Thank you. Your place is confirmed." />
        <Stepper steps={STEPS} step={4} />
        <div className="grid c2">
          <Card title={`Receipt ${receiptId}`}>
            <table className="tbl"><tbody>
              <tr><td>Order</td><td>{order?.ref ?? orderRef}</td></tr>
              <tr><td>Course</td><td>{course.title}</td></tr>
              <tr><td>Date</td><td>{dateLabel}</td></tr>
              <tr><td>Invoice number</td><td><b>{r?.invoice ?? order?.invoice}</b> (the payment reference)</td></tr>
              <tr><td>Paid through</td><td>{r?.method === 'Card' ? `PayGate, card${useSaved && card ? ` ending ${card.last4}` : ''} (demo)` : r?.method === 'SnapScan' ? 'SnapScan (demo)' : 'Bank transfer (demo)'}</td></tr>
              <tr><td>Transaction id</td><td>{order?.txId ?? 'n/a'}</td></tr>
              <tr><td>Paid on</td><td>{fmtDate(r?.date)}</td></tr>
              {order?.coupon && <tr><td>Coupon {order.coupon}</td><td>-{money(order.discount)} ex VAT</td></tr>}
              <tr><td>VAT (15%)</td><td>{money(order?.vat ?? priced.vat)}</td></tr>
              <tr><td>Amount (incl. 15% VAT)</td><td><b>{money(r?.amount ?? priced.total)}</b></td></tr>
            </tbody></table>
            <div className="row" style={{ marginTop: 14 }}>
              <Button onClick={() => setEmail(true)}>View confirmation email</Button>
              {sess && <Button onClick={() => downloadIcs(course.title, sess.start, sess.venue)}>Add to calendar</Button>}
              <Link to="/my-bookings"><Button>View in My bookings</Button></Link>
            </div>
          </Card>
          <Card title="What happens next">
            <ol className="b2c-next">
              <li><b>Confirmation email</b> is on its way to {det.email}.</li>
              <li><b>Your course</b> is now in My learning.{sess ? ' Joining instructions arrive 3 days before the session.' : ' You can start straight away.'}</li>
              <li><b>Your receipt</b> is saved in My bookings.</li>
            </ol>
            <div className="row">
              <Link to="/my-learning"><Button appearance="primary">Go to My learning</Button></Link>
              {nextJourneyCourse && <Button onClick={() => nav(`/checkout/${nextJourneyCourse}?journey=${journeyId}`)}>Book the next course on your journey</Button>}
            </div>
          </Card>
        </div>
        <EmailPreview open={email} onClose={() => setEmail(false)} to={det.email} subject="Your booking is confirmed"
          body={`Hi ${det.name.split(' ')[0]},\n\nYour place on ${course.title} is confirmed.\nDate: ${dateLabel}\nInvoice: ${r?.invoice ?? ''}\nReceipt: ${receiptId} (${money(r?.amount ?? priced.total)}${order?.coupon ? `, coupon ${order.coupon} applied` : ''})\n\nKind regards,\nThe training team`} />
      </>
    )
  }

  return (
    <>
      <PageHeader id="checkout" title={renew ? 'Renew your certification' : 'Checkout'} subtitle="Demo payment: PayGate and SnapScan are simulated and nothing is charged." />
      <Stepper steps={STEPS} step={step} />
      {renew && <div className="callout" style={{ marginBottom: 16 }}>Renewing certificate <b>{renew}</b>. Completing this course issues a fresh certificate with a new expiry date.</div>}
      {existing && !renew && <div className="callout" role="alert" style={{ marginBottom: 16 }}>You already have this course ({existing.status.toLowerCase()}, {existing.progress}%). <Link to={`/learn/${existing.id}`}>Open it</Link> or continue to book another seat.</div>}
      <div className="grid c2" style={{ gridTemplateColumns: 'minmax(0, 3fr) minmax(280px, 2fr)' }}>
        <div>
          {step === 0 && (
            <Card title="Your course">
              <h3 style={{ margin: '0 0 6px' }}>{course.title}</h3>
              <p className="muted">{course.code} · {course.hours} hours</p>
              <p>{course.description}</p>
              {sessions.length > 0 ? (
                <FSelect label="Date" value={sessionId} onChange={setSessionId} error={err.session} options={sessions.map(s => ({ value: s.id, label: `${fmtDate(s.start)} · ${s.venue} (${seatsLeft(d, s)} seats left)` }))} />
              ) : <div className="callout">Online, start any time.</div>}
              <p><Link to="/catalogue">Choose a different course</Link></p>
              <Button appearance="primary" onClick={next}>Continue to your details</Button>
            </Card>
          )}
          {step === 1 && (
            <Card title="Your details">
              <div className="form">
                <FText label="Full name" value={det.name} onChange={v => setDet({ ...det, name: v })} error={err.dname} />
                <div className="form c2">
                  <FText label="Email" type="email" value={det.email} onChange={v => setDet({ ...det, email: v })} error={err.demail} />
                  <FText label="Mobile number" value={det.phone} onChange={v => setDet({ ...det, phone: v })} error={err.dphone} />
                </div>
                <FText label="Company for the tax invoice (optional)" value={det.company} onChange={v => setDet({ ...det, company: v })} />
                <div><Checkbox label="I accept the booking and cancellation terms" checked={det.terms} onChange={(_, x) => setDet({ ...det, terms: !!x.checked })} />{err.terms && <div className="err" role="alert">{err.terms}</div>}</div>
                <div className="row"><Button onClick={() => setStep(0)}>Back</Button><Button appearance="primary" onClick={next}>Continue to payment</Button></div>
              </div>
            </Card>
          )}
          {step === 2 && (
            <Card title="Payment">
              <TabList selectedValue={method} onTabSelect={(_, x) => { setMethod(x.value as PayMethod); setErr({}) }}>
                <Tab value="Card">{METHOD_LABEL.Card}</Tab><Tab value="SnapScan">{METHOD_LABEL.SnapScan}</Tab><Tab value="EFT">{METHOD_LABEL.EFT}</Tab>
              </TabList>
              <div className="small muted" style={{ marginTop: 10 }}>Your invoice number is <b>{reference}</b>. It is sent with the payment and comes back with it, so we know who paid what.</div>
              <div className="form" style={{ marginTop: 14 }}>
                {method === 'Card' ? (
                  <>
                    <PayGateNote />
                    {card && (
                      <RadioGroup value={useSaved ? 'saved' : 'new'} onChange={(_, x) => { setUseSaved(x.value === 'saved'); setErr({}) }}>
                        <Radio value="saved" label={`${card.brand} ending ${card.last4} · expires ${card.expiry} (saved)`} /><Radio value="new" label="Use a different card" />
                      </RadioGroup>
                    )}
                    {card && useSaved ? <FText label="CVV to confirm" value={f.cvv} onChange={v => setF({ ...f, cvv: v })} error={err.cvv} placeholder="123" />
                      : (
                        <>
                          <FText label="Name on card" value={f.name} onChange={v => setF({ ...f, name: v })} error={err.name} />
                          <FText label="Card number" value={f.number} onChange={v => setF({ ...f, number: v })} error={err.number} placeholder="4242 4242 4242 4242" />
                          <div className="form c2"><FText label="Expiry (MM/YY)" value={f.expiry} onChange={v => setF({ ...f, expiry: v })} error={err.expiry} placeholder="08/29" /><FText label="CVV" value={f.cvv} onChange={v => setF({ ...f, cvv: v })} error={err.cvv} /></div>
                          <Checkbox label="Save this card for next time (demo)" checked={f.save} onChange={(_, x) => setF({ ...f, save: !!x.checked })} />
                        </>
                      )}
                  </>
                ) : method === 'SnapScan' ? <SnapScanPanel reference={reference} amount={priced.total} />
                  : <EftPanel reference={reference} amount={priced.total} hold="Your place is held for 3 business days. Finance confirms the payment from the bank record in Workbook, using the invoice number as the reference." />}
                {phase >= 0 ? (
                  <div className="b2c-proc" role="status" aria-live="polite">
                    <div className="progress"><div style={{ width: `${Math.min(100, ((phase + 1) / (phases.length + 1)) * 100)}%` }} /></div>
                    <div className="small">{phases[Math.min(phase, phases.length - 1)]}…</div>
                  </div>
                ) : <div className="row"><Button onClick={() => setStep(1)}>Back</Button><Button appearance="primary" onClick={pay}>{method === 'Card' ? 'Pay with PayGate' : method === 'SnapScan' ? 'I have scanned and paid' : 'I have paid'} {money(priced.total)}</Button></div>}
              </div>
            </Card>
          )}
        </div>
        <OrderSummary course={course} priced={priced} coupon={coupon} setCoupon={setCoupon} locked={phase >= 0} dateLabel={dateLabel} />
      </div>
    </>
  )
}
