import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore, useCtx } from '../../shared/store'
import { createClientLead } from './clientOpp'
import { Modal } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { addDays, fmtDate, today } from '../../shared/format'
import { useClient } from './clientStore'
import type { BookingRequest } from './clientSeed'
import './client.css'

const STEPS = ['Course', 'When and where', 'Review']

export function BookingWizard({ open, onClose, initialCourse = '' }: { open: boolean; onClose: () => void; initialCourse?: string }) {
  const d = useStore(s => s.data)
  const { orgId } = useCtx()
  const orgName = d.orgs.find(o => o.id === orgId)?.name ?? 'The client'
  const add =useClient(s => s.addBookingRequest)
  const [step, setStep] = useState(0)
  const [f, setF] = useState({ courseId: initialCourse, attendees: '8', date: addDays(today(), 30), delivery: 'On site' as BookingRequest['delivery'], notes: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const course = d.courses.find(c => c.id === f.courseId)
  const reset = () => { setStep(0); setErr({}); setSent(false); setF({ courseId: initialCourse, attendees: '8', date: addDays(today(), 30), delivery: 'On site', notes: '' }) }
  const close = () => { onClose(); setTimeout(reset, 200) }

  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 0) {
      if (!f.courseId) e.courseId = 'Choose a course'
      const n = Number(f.attendees)
      if (!Number.isInteger(n) || n < 1 || n > 200) e.attendees = 'Enter a whole number from 1 to 200'
    }
    if (s === 1) {
      if (!f.date || f.date <= today()) e.date = 'Choose a date in the future'
    }
    setErr(e); return Object.keys(e).length === 0
  }
  const next = () => { if (validate(step)) setStep(step + 1) }
  const submit = () => {
    if (!validate(0) || !validate(1)) return
    const oppId = createClientLead({ orgId, courseId: f.courseId, people: Number(f.attendees), kind: 'booking', preferredDate: f.date, delivery: f.delivery, notes: f.notes.trim() })
    add({ courseId: f.courseId, attendees: Number(f.attendees), preferredDate: f.date, delivery: f.delivery, notes: f.notes.trim(), oppId })
    useStore.getState().log(`${orgName} requested a booking: ${course?.title}, ${f.attendees} attendee(s). Added to Opportunities.`)
    setSent(true)
  }

  return (
    <Modal open={open} onClose={close} title="Request a new booking"
      actions={sent ? undefined : <>
        {step > 0 && <Button onClick={() => setStep(step - 1)}>Back</Button>}
        {step < 2 ? <Button appearance="primary" onClick={next}>Next</Button> : <Button appearance="primary" onClick={submit}>Submit request</Button>}
      </>}>
      {sent ? (
        <div className="callout" role="status"><b>Request sent.</b> The training team will confirm a date and send a quote. You can follow it on Our bookings.</div>
      ) : (
        <>
          <div className="cl-wizard-steps" aria-label={`Step ${step + 1} of 3`}>{STEPS.map((s, i) => <span key={s} className={i === step ? 'on' : ''}>{i + 1}. {s}</span>)}</div>
          {step === 0 && (
            <div className="form">
              <FSelect label="Course" value={f.courseId} onChange={v => setF({ ...f, courseId: v })} placeholder="Choose a course" error={err.courseId} options={d.courses.filter(c => c.status === 'Active').map(c => ({ value: c.id, label: c.title }))} />
              {course && <div className="cl-pre">{course.description}<div className="muted small">{course.hours} hours · from {course.skills.join(', ')}</div></div>}
              <FText label="Number of attendees" type="number" value={f.attendees} onChange={v => setF({ ...f, attendees: v })} error={err.attendees} min={1} max={200} />
            </div>
          )}
          {step === 1 && (
            <div className="form">
              <FText label="Preferred start date" type="date" value={f.date} onChange={v => setF({ ...f, date: v })} error={err.date} />
              <FSelect label="Delivery" value={f.delivery} onChange={v => setF({ ...f, delivery: v as BookingRequest['delivery'] })} options={['On site', 'At the training centre', 'Online'].map(x => ({ value: x, label: x }))} />
              <FArea label="Notes for the training team (optional)" value={f.notes} onChange={v => setF({ ...f, notes: v })} rows={3} />
            </div>
          )}
          {step === 2 && (
            <table className="tbl"><tbody>
              <tr><th scope="row">Course</th><td>{course?.title}</td></tr>
              <tr><th scope="row">Attendees</th><td>{f.attendees}</td></tr>
              <tr><th scope="row">Preferred start</th><td>{fmtDate(f.date)}</td></tr>
              <tr><th scope="row">Delivery</th><td>{f.delivery}</td></tr>
              <tr><th scope="row">Notes</th><td>{f.notes || '–'}</td></tr>
              <tr><th scope="row">Indicative price</th><td>{course ? `R${(course.price * Number(f.attendees || 0)).toLocaleString('en-US')} excl. VAT (before any discount)` : '–'}</td></tr>
            </tbody></table>
          )}
        </>
      )}
    </Modal>
  )
}
