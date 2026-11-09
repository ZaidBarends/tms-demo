import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Tab, TabList } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState, Stat, Status } from '../shared/ui'
import { fmtDate, money, monthKey, monthLabel } from '../shared/format'
import { downloadIcs } from '../lms/csv'
import { useB2c } from './b2cStore'
import BookingCalendar, { type CalEvent } from './BookingCalendar'
import { DocModal, RequestDialog } from './BookingDialogs'
import type { Enrolment, Receipt } from '../shared/types'
import './b2c.css'

export default function MyBookings() {
  const d = useStore(s => s.data)
  const { learnerId, learner } = useCtx()
  const requests = useB2c(s => s.requests)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [doc, setDoc] = useState<{ r: Receipt; kind: 'Receipt' | 'Tax invoice' } | null>(null)
  const [change, setChange] = useState<Enrolment | null>(null)
  const [day, setDay] = useState<string | null>(null)

  const mine = d.enrolments.filter(e => e.learnerId === learnerId && e.payer === 'self')
  const upcoming = mine.filter(e => e.status !== 'Completed')
  const past = mine.filter(e => e.status === 'Completed')
  const receipts = d.receipts.filter(x => x.learnerId === learnerId).sort((a, b) => b.date.localeCompare(a.date))
  const invoices = d.invoices.filter(i => i.learnerId === learnerId)
  const title = (id: string) => d.courses.find(c => c.id === id)?.title ?? ''
  const sess = (e: Enrolment) => d.sessions.find(s => s.id === e.sessionId)
  const reqFor = (e: Enrolment) => requests.find(r => r.enrolId === e.id)
  const events: CalEvent[] = mine.filter(e => sess(e)).map(e => ({ id: e.id, date: sess(e)!.start, title: title(e.courseId), venue: sess(e)!.venue, done: e.status === 'Completed' }))
  const dayEvents = day ? mine.filter(e => sess(e)?.start === day) : []
  const spendByMonth = Object.entries(receipts.reduce<Record<string, number>>((m, r) => { const k = monthKey(r.date); m[k] = (m[k] ?? 0) + r.amount; return m }, {})).sort().map(([k, v]) => ({ month: monthLabel(k), Spend: Math.round(v) }))
  const total = receipts.reduce((a, r) => a + r.amount, 0)

  const actions = (e: Enrolment) => {
    const s = sess(e); const rq = reqFor(e)
    return (
      <div className="row" style={{ gap: 6 }}>
        {s && <Button size="small" onClick={() => downloadIcs(title(e.courseId), s.start, s.venue)}>Add to calendar</Button>}
        {s && e.status === 'Booked' && (rq ? <span className="lms-pill warn">{rq.type} requested</span> : <Button size="small" onClick={() => setChange(e)}>Reschedule or cancel</Button>)}
        {!s && e.status === 'Booked' && !rq && <Button size="small" onClick={() => setChange(e)}>Cancel</Button>}
        <Link to={`/learn/${e.id}`}><Button size="small" appearance="primary">{e.progress > 0 ? 'Continue' : 'Open'}</Button></Link>
      </div>
    )
  }

  return (
    <>
      <PageHeader id="my-bookings" title="My bookings" subtitle="Upcoming and past bookings, receipts and certificates" actions={<Link to="/catalogue"><Button appearance="primary">Book another course</Button></Link>} />
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Upcoming" value={upcoming.length} hint={`${upcoming.filter(e => sess(e)).length} with a set date`} />
        <Stat label="Completed" value={past.length} />
        <Stat label="Total spent" value={money(total)} hint="Incl. VAT" />
        <Stat label="Open requests" value={requests.filter(r => r.status === 'Requested').length} hint="Reschedules and cancellations" />
      </div>
      <TabList selectedValue={view} onTabSelect={(_, x) => setView(x.value as 'list' | 'calendar')} style={{ marginBottom: 16 }}>
        <Tab value="list">List</Tab><Tab value="calendar">Calendar</Tab>
      </TabList>

      {view === 'calendar' ? (
        <Card title="Booking calendar">
          <BookingCalendar events={events} selected={day} onSelect={setDay} />
          {day && (
            <div style={{ marginTop: 14 }}>
              <b>{fmtDate(day)}</b>
              {dayEvents.length === 0 ? <p className="muted">Nothing booked on this day.</p> : dayEvents.map(e => (
                <div key={e.id} className="b2c-day"><div><b>{title(e.courseId)}</b><div className="small muted">{sess(e)!.venue}</div></div>{actions(e)}</div>
              ))}
            </div>
          )}
          {events.length === 0 && <EmptyState title="No dated bookings" text="Instructor-led sessions you book appear on the calendar." />}
        </Card>
      ) : (
        <div className="grid c2">
          <Card title="Upcoming and in progress">
            {upcoming.length === 0 ? <EmptyState title="Nothing booked" text="Find a course in the catalogue." action={<Link to="/catalogue">Browse</Link>} /> : (
              <div className="b2c-bk">{upcoming.map(e => (
                <div key={e.id}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><b>{title(e.courseId)}</b><Status s={e.status} /></div>
                  <div className="small muted">{sess(e) ? `${fmtDate(sess(e)!.start)} · ${sess(e)!.venue}` : 'Online, self-paced'}</div>
                  {reqFor(e) && <div className="small" style={{ margin: '4px 0' }}>{reqFor(e)!.type} requested on {fmtDate(reqFor(e)!.at)}{reqFor(e)!.type === 'Cancel' ? `, refund ${reqFor(e)!.refundPct}%` : ''}.</div>}
                  <div style={{ marginTop: 6 }}>{actions(e)}</div>
                </div>
              ))}</div>
            )}
          </Card>
          <Card title="Past bookings">
            {past.length === 0 ? <EmptyState title="No completed courses yet" /> : (
              <table className="tbl"><tbody>{past.map(e => (
                <tr key={e.id}><td><b>{title(e.courseId)}</b></td><td>{e.certificateId ?? '–'}</td><td><Status s="Completed" /></td><td><Link to={`/learn/${e.id}`}>Review</Link></td></tr>
              ))}</tbody></table>
            )}
          </Card>
        </div>
      )}

      <div className="grid c2">
        <Card title="Receipts">
          {receipts.length === 0 ? <EmptyState title="No receipts yet" /> : (
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Receipt</th><th>Course</th><th>Date</th><th>Method</th><th className="num">Amount</th><th /></tr></thead><tbody>
              {receipts.map(x => <tr key={x.id}><td>{x.id}</td><td>{title(x.courseId)}</td><td>{fmtDate(x.date)}</td><td>{x.method}</td><td className="num">{money(x.amount)}</td>
                <td><div className="row" style={{ gap: 4 }}><Button size="small" onClick={() => setDoc({ r: x, kind: 'Receipt' })}>Receipt</Button><Button size="small" onClick={() => setDoc({ r: x, kind: 'Tax invoice' })}>Tax invoice</Button></div></td></tr>)}
            </tbody></table></div>
          )}
        </Card>
        <Card title="Spending by month">
          {spendByMonth.length === 0 ? <EmptyState title="No spending yet" /> : (
            <div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={spendByMonth} margin={{ left: -8 }}>
              <CartesianGrid stroke="#8884" vertical={false} /><XAxis dataKey="month" fontSize={12} /><YAxis fontSize={12} tickFormatter={v => `R${v / 1000}k`} />
              <Tooltip formatter={(v: number) => money(v)} /><Bar dataKey="Spend" fill="#597f2d" radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer></div>
          )}
          {invoices.length > 0 && <p className="small muted">Account invoices on file: {invoices.map(i => i.number).join(', ')}</p>}
        </Card>
      </div>
      <Card title="Certificates" actions={<Link to="/certifications">Manage certifications</Link>}>
        {d.certificates.filter(c => c.learnerId === learnerId).length === 0 ? <EmptyState title="No certificates yet" text="Complete a course to earn one." /> : (
          <table className="tbl"><tbody>{d.certificates.filter(c => c.learnerId === learnerId).map(c => <tr key={c.id}><td><b>{title(c.courseId)}</b></td><td>{c.id}</td><td>Issued {fmtDate(c.issued)}</td><td>{c.expires ? `Expires ${fmtDate(c.expires)}` : 'No expiry'}</td></tr>)}</tbody></table>
        )}
      </Card>
      <DocModal receipt={doc?.r ?? null} kind={doc?.kind ?? 'Receipt'} onClose={() => setDoc(null)} name={learner?.name ?? ''} />
      <RequestDialog enrol={change} onClose={() => setChange(null)} />
    </>
  )
}
