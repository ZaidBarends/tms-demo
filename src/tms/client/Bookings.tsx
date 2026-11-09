import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore, useCtx } from '../../shared/store'
import { PageHeader, Card, EmptyState, Modal, Progress, Status } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { addDays, fmtDate, today } from '../../shared/format'
import { useClient } from './clientStore'
import { BOOKING_STEPS, BookingGroup, groupBookings } from './clientLogic'
import { BookingWizard } from './BookingWizard'
import { AddLearnerDialog } from './AddLearnerDialog'
import './client.css'

function Stepper({ status }: { status: string }) {
  const idx = BOOKING_STEPS.indexOf(status as typeof BOOKING_STEPS[number])
  return (
    <ol className="cl-steps" style={{ listStyle: 'none', padding: 0 }} aria-label={`Booking status: ${status}`}>
      {BOOKING_STEPS.map((s, i) => <li key={s} className={`cl-step${i < idx ? ' done' : ''}${i === idx ? ' now' : ''}`} aria-current={i === idx ? 'step' : undefined}>{s}</li>)}
    </ol>
  )
}

export function ClientBookings() {
  const d = useStore(s => s.data)
  const { orgId } = useCtx()
  const C = useClient()
  const now = today()
  const groups = groupBookings(d, orgId, now)
  const [q, setQ] = useState('')
  const [st, setSt] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [wizard, setWizard] = useState(false)
  const [resch, setResch] = useState<BookingGroup | null>(null)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})
  const [addFor, setAddFor] = useState(false)

  const title = (cid: string) => d.courses.find(c => c.id === cid)?.title ?? ''
  const shown = groups.filter(g => (!st || g.status === st) && (!q || title(g.courseId).toLowerCase().includes(q.toLowerCase())
    || g.enrolments.some(e => d.learners.find(l => l.id === e.learnerId)?.name.toLowerCase().includes(q.toLowerCase()))))
  const reqs = C.bookingRequests.filter(r => (!st || r.status === st) && (!q || title(r.courseId).toLowerCase().includes(q.toLowerCase())))
  const reschFor = (key: string) => C.reschedules.filter(r => r.bookingKey === key)

  const submitResch = () => {
    const e: Record<string, string> = {}
    if (!date || date <= now) e.date = 'Choose a date in the future'
    if (reason.trim().length < 10) e.reason = 'Tell us why (10+ characters)'
    setErr(e); if (Object.keys(e).length || !resch) return
    C.addReschedule({ bookingKey: resch.key, courseTitle: title(resch.courseId), newDate: date, reason: reason.trim() })
    useStore.getState().log(`Cape Freight asked to reschedule ${title(resch.courseId)} to ${fmtDate(date)}`)
    setResch(null); setDate(''); setReason('')
  }

  return (
    <>
      <PageHeader id="client-bookings" title="Our bookings" subtitle="Courses booked for Cape Freight staff" actions={<Button appearance="primary" onClick={() => setWizard(true)}>Request a new booking</Button>} />
      <Card>
        <div className="form c2">
          <FText label="Search by course or learner" value={q} onChange={setQ} />
          <FSelect label="Status" value={st} onChange={setSt} placeholder="All statuses" options={BOOKING_STEPS.map(s => ({ value: s, label: s }))} />
        </div>
      </Card>

      {reqs.length > 0 && (
        <>
          <h2 className="card-title" style={{ margin: '4px 0 10px' }}>Your requests</h2>
          {reqs.map(r => (
            <div className="cl-booking" key={r.id}>
              <div className="cl-booking-head" style={{ cursor: 'default' }}>
                <div style={{ flex: 1 }}><b>{title(r.courseId)}</b><div className="muted small">{r.attendees} attendee(s) · {r.delivery} · preferred {fmtDate(r.preferredDate)} · asked {fmtDate(r.created)}</div></div>
                <Status s={r.status} />
              </div>
              <div className="cl-booking-body">
                <Stepper status={r.status} />
                {r.notes && <p className="small muted">Notes: {r.notes}</p>}
                {r.status === 'Requested' && <Button size="small" appearance="subtle" onClick={() => C.confirmRequest(r.id)}>Demo: training team confirms this request</Button>}
              </div>
            </div>
          ))}
          <h2 className="card-title" style={{ margin: '16px 0 10px' }}>Confirmed bookings</h2>
        </>
      )}

      {shown.length === 0 ? <Card><EmptyState title="No bookings match" text="Request a new booking, or clear the filters." action={<Button onClick={() => setWizard(true)}>Request a new booking</Button>} /></Card> : shown.map(g => {
        const isOpen = open === g.key
        const rs = reschFor(g.key)
        const done = g.enrolments.filter(e => e.status === 'Completed').length
        return (
          <div className="cl-booking" key={g.key}>
            <button className="cl-booking-head" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : g.key)}>
              <span aria-hidden>{isOpen ? '▾' : '▸'}</span>
              <div style={{ flex: 1, minWidth: 180 }}><b>{title(g.courseId)}</b><div className="muted small">{g.session ? `${fmtDate(g.session.start)} · ${g.session.venue}` : 'Self-paced online'} · {g.enrolments.length} learner(s)</div></div>
              {rs.length > 0 && <Status s="Requested" />}
              <Status s={g.status} />
            </button>
            {isOpen && (
              <div className="cl-booking-body">
                <Stepper status={g.status} />
                <div className="row" style={{ marginBottom: 8 }}>
                  <span className="muted small">{done} of {g.enrolments.length} completed</span>
                  {g.session && g.status === 'Confirmed' && <Button size="small" onClick={() => { setResch(g); setErr({}); setDate(addDays(g.session!.start, 14)) }}>Request reschedule</Button>}
                  <Button size="small" onClick={() => setAddFor(true)}>Add a learner</Button>
                </div>
                {rs.map(r => <div className="callout" key={r.id} style={{ marginBottom: 8 }}>Reschedule requested to {fmtDate(r.newDate)}: “{r.reason}”. The training team will confirm.</div>)}
                <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Learner</th><th>Status</th><th>Progress</th><th>Deadline</th></tr></thead><tbody>
                  {g.enrolments.map(e => {
                    const l = d.learners.find(x => x.id === e.learnerId)
                    return <tr key={e.id}><td>{l?.name}<div className="muted small">{l?.email}</div></td><td><Status s={e.status} /></td><td style={{ width: 160 }}><Progress value={e.progress} /></td><td>{fmtDate(e.deadline)}</td></tr>
                  })}
                </tbody></table></div>
              </div>
            )}
          </div>
        )
      })}

      <BookingWizard open={wizard} onClose={() => setWizard(false)} />
      <AddLearnerDialog open={addFor} onClose={() => setAddFor(false)} />
      <Modal open={!!resch} onClose={() => setResch(null)} title={`Reschedule ${resch ? title(resch.courseId) : ''}`} actions={<Button appearance="primary" onClick={submitResch}>Send request</Button>}>
        <div className="form">
          <p className="muted small" style={{ margin: 0 }}>Currently {resch?.session ? fmtDate(resch.session.start) : ''}. The training team will reply with a confirmed date; nothing changes until they do.</p>
          <FText label="Preferred new date" type="date" value={date} onChange={setDate} error={err.date} />
          <FArea label="Reason" value={reason} onChange={setReason} rows={3} error={err.reason} />
        </div>
      </Modal>
    </>
  )
}
