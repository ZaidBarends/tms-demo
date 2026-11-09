import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, OverlayDrawer, Radio, RadioGroup } from '@fluentui/react-components'
import { Dismiss24Regular } from '@fluentui/react-icons'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState, Modal, Progress } from '../shared/ui'
import { addDays, daysBetween, fmtDate, money, today } from '../shared/format'
import { hashOf } from '../lms/gamify'
import { useB2c } from './b2cStore'
import { priceOrder } from './pricing'
import type { Academy, Course } from '../shared/types'
import './b2c.css'

const OUTCOMES: Record<string, string[]> = {
  ac1: ['Lead a team with confidence', 'Give feedback that changes behaviour', 'Run a team meeting that gets results', 'Present a 90-day plan to your manager'],
  ac2: ['Plan and baseline a real project', 'Run agile ceremonies', 'Control budget and scope', 'Present a capstone to a panel'],
  ac3: ['Spot and report cyber threats', 'Handle personal information lawfully', 'Write clear, safe communication', 'Build a team awareness checklist'],
}

export function Academies() {
  const d = useStore(s => s.data)
  const toggle = useStore(s => s.toggleAcademy)
  const { learnerId } = useCtx()
  const { academyEnrolled } = useB2c()
  const [open, setOpen] = useState<Academy | null>(null)
  const [buying, setBuying] = useState<Academy | null>(null)
  const [done, setDone] = useState('')

  const info = (a: Academy) => {
    const cs = a.courseIds.map(id => d.courses.find(c => c.id === id)).filter(Boolean) as Course[]
    const subtotal = cs.reduce((x, c) => x + c.price, 0)
    const seats = 24 - (8 + (hashOf(a.id) % 11))
    const weeks = cs.length * 2 + 2
    const enrolled = (academyEnrolled[a.id] ?? []).includes(learnerId)
    const doneN = cs.filter(c => d.enrolments.some(e => e.learnerId === learnerId && e.courseId === c.id && e.status === 'Completed')).length
    return { cs, subtotal, seats, weeks, enrolled, doneN, priced: priceOrder(subtotal, 10) }
  }

  return (
    <>
      <PageHeader id="academies" title="Academies" subtitle="Cohort bundles of courses with a shared start date, a mentor and a capstone" />
      {done && <div className="callout" role="status" style={{ marginBottom: 16 }}>{done} <Link to="/my-learning">Go to My learning</Link></div>}
      {d.academies.length === 0 ? <EmptyState title="No academies scheduled" /> : (
        <div className="grid c3">
          {d.academies.map(a => {
            const x = info(a); const on = a.interested.includes(learnerId); const days = daysBetween(today(), a.start)
            return (
              <div className="card b2c-acad" key={a.id} style={{ marginBottom: 0 }}>
                <div className="b2c-acad-head"><span className="small">{x.weeks}-week cohort</span><h2>{a.title}</h2></div>
                <p className="muted">{a.blurb}</p>
                <p style={{ margin: 0 }}><b>Starts {fmtDate(a.start)}</b> <span className="muted small">(in {days} days)</span></p>
                <div className="small"><span className={`lms-pill ${x.seats <= 5 ? 'warn' : ''}`}>{x.seats} of 24 seats left</span></div>
                <ol style={{ paddingLeft: 18, margin: '8px 0' }}>{x.cs.map(c => <li key={c.id}>{c.title}</li>)}</ol>
                <div>Bundle price <b>{money(x.priced.net)}</b> <span className="muted small">ex VAT, you save {money(x.priced.discount)}</span></div>
                {x.enrolled && <div><Progress value={Math.round((x.doneN / x.cs.length) * 100)} /><span className="small muted">{x.doneN} of {x.cs.length} courses complete</span></div>}
                <div className="row" style={{ marginTop: 'auto' }}>
                  {x.enrolled ? <span className="lms-pill">You are enrolled</span> : <Button appearance="primary" onClick={() => setBuying(a)}>Enrol now</Button>}
                  <Button onClick={() => setOpen(a)}>Programme details</Button>
                  <Button appearance="subtle" onClick={() => toggle(a.id, learnerId)} aria-pressed={on}>{on ? '✓ Interested (undo)' : 'Register interest'}</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <OverlayDrawer open={!!open} onOpenChange={(_, s) => !s.open && setOpen(null)} position="end" size="medium">
        {open && (() => { const x = info(open); return (
          <>
            <DrawerHeader><DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Close" icon={<Dismiss24Regular />} onClick={() => setOpen(null)} />}>{open.title}</DrawerHeaderTitle></DrawerHeader>
            <DrawerBody>
              <p>{open.blurb}</p>
              <h3>Programme timeline</h3>
              <ol className="b2c-timeline">
                {x.cs.map((c, i) => <li key={c.id}><b>Weeks {i * 2 + 1}-{i * 2 + 2}</b> · {fmtDate(addDays(open.start, i * 14))}<div>{c.title}</div><div className="small muted">{c.hours} hrs · {c.skills.join(', ')}</div></li>)}
                <li><b>Weeks {x.cs.length * 2 + 1}-{x.weeks}</b> · {fmtDate(addDays(open.start, x.cs.length * 14))}<div>Capstone and graduation</div><div className="small muted">Present to a panel and receive your academy certificate</div></li>
              </ol>
              <h3>You will be able to</h3>
              <ul className="b2c-ticks">{(OUTCOMES[open.id] ?? ['Apply what you learn at work']).map(o => <li key={o}>{o}</li>)}</ul>
              <h3>Included</h3>
              <ul className="b2c-ticks"><li>A cohort mentor and two group coaching calls</li><li>All course certificates plus an academy certificate</li><li>Priority listing on the talent connection, if you opt in</li></ul>
              <table className="tbl"><tbody>
                <tr><td>Courses separately</td><td className="num">{money(x.subtotal)}</td></tr><tr><td>Bundle discount (10%)</td><td className="num">-{money(x.priced.discount)}</td></tr>
                <tr><td>VAT (15%)</td><td className="num">{money(x.priced.vat)}</td></tr><tr><td><b>Total</b></td><td className="num"><b>{money(x.priced.total)}</b></td></tr>
              </tbody></table>
              <div style={{ marginTop: 14 }}>{!x.enrolled && <Button appearance="primary" onClick={() => { setBuying(open); setOpen(null) }}>Enrol now</Button>}</div>
            </DrawerBody>
          </>
        ) })()}
      </OverlayDrawer>
      <EnrolModal academy={buying} info={buying ? info(buying) : null} onClose={() => setBuying(null)} onDone={m => { setBuying(null); setDone(m) }} />
    </>
  )
}

function EnrolModal({ academy, info, onClose, onDone }: { academy: Academy | null; info: { cs: Course[]; priced: ReturnType<typeof priceOrder> } | null; onClose: () => void; onDone: (m: string) => void }) {
  const d = useStore(s => s.data)
  const { learnerId } = useCtx()
  const { card, recordOrder, enrolAcademy } = useB2c()
  const [method, setMethod] = useState<'Card' | 'EFT'>('Card')
  if (!academy || !info) return null
  const fresh = info.cs.filter(c => !d.enrolments.some(e => e.learnerId === learnerId && e.courseId === c.id))
  const buy = () => {
    const st = useStore.getState()
    fresh.forEach(c => {
      const p = priceOrder(c.price, 10)
      const rid = st.checkout(learnerId, c.id, undefined, method)
      useStore.setState(s => { const nd = structuredClone(s.data); const r = nd.receipts.find(x => x.id === rid); if (r) r.amount = p.total; return { data: nd } })
      recordOrder(rid, { coupon: 'ACADEMY10', couponPct: 10, discount: p.discount, net: p.net, vat: p.vat, total: p.total, ref: `ACA-${academy.id.toUpperCase()}`, method })
    })
    enrolAcademy(academy.id, learnerId)
    if (!academy.interested.includes(learnerId)) st.toggleAcademy(academy.id, learnerId)
    st.log(`Academy enrolment: ${academy.title}`)
    onDone(`You are enrolled in ${academy.title}. ${fresh.length} course(s) were added and receipts saved in My bookings.`)
  }
  const total = fresh.reduce((a, c) => a + priceOrder(c.price, 10).total, 0)
  return (
    <Modal open onClose={onClose} title={`Enrol in ${academy.title}`} actions={<Button appearance="primary" onClick={buy}>{method === 'Card' ? 'Pay' : 'I have paid'} {money(total)}</Button>}>
      <table className="tbl"><tbody>
        {info.cs.map(c => { const have = !fresh.includes(c); return <tr key={c.id}><td>{c.title}{have && <span className="muted small"> (already yours, not charged)</span>}</td><td className="num">{have ? '–' : money(priceOrder(c.price, 10).total)}</td></tr> })}
        <tr><td><b>Total incl. VAT after 10% bundle discount</b></td><td className="num"><b>{money(total)}</b></td></tr>
      </tbody></table>
      <RadioGroup value={method} onChange={(_, x) => setMethod(x.value as 'Card' | 'EFT')} style={{ marginTop: 12 }}>
        <Radio value="Card" label={card ? `${card.brand} ending ${card.last4} (saved)` : 'Card'} /><Radio value="EFT" label="EFT (reference ACADEMY)" />
      </RadioGroup>
      <p className="muted small">Demo payment: nothing is charged.</p>
    </Modal>
  )
}
