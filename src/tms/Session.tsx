import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, EmptyState, Status } from '../shared/ui'
import { FSelect } from '../shared/fields'
import { clashes, seatsTaken } from '../shared/calc'
import { fmtDate, today } from '../shared/format'
import { ClassList } from './ops/ClassList'
import { FeedbackForm, Materials, Notes, SeatChart, Waitlist } from './ops/SessionPanels'
import './ops/ops.css'

export { MySchedule } from './ops/InstructorHome'

export function SessionScreen() {
  const { id } = useParams()
  const nav = useNavigate()
  const d = useStore(s => s.data)
  const { persona, instructorId } = useCtx()
  const isInstructor = persona === 'instructor'
  const mine = isInstructor ? d.sessions.filter(s => s.instructorId === instructorId) : d.sessions
  const s = (id ? d.sessions.find(x => x.id === id) : undefined) ?? mine.find(x => x.start >= today()) ?? mine[0]
  if (!s) return <EmptyState title="No sessions" />
  if (isInstructor && s.instructorId !== instructorId) {
    return <EmptyState title="Not your session" text="Instructors can open only the sessions assigned to them." action={<Link to="/my-schedule">Back to my schedule</Link>} />
  }
  const course = d.courses.find(c => c.id === s.courseId)!
  const clash = clashes(d)[s.id]
  const ordered = [...mine].sort((a, b) => a.start.localeCompare(b.start))

  return (
    <>
      <PageHeader id="session" title={course.title} subtitle={`${fmtDate(s.start)} · ${s.venue} · ${d.staff.find(x => x.id === s.instructorId)?.name}`}
        actions={<><Status s={s.status} /><span>{seatsTaken(d, s.id)}/{s.capacity} seats</span><Link to={isInstructor ? '/my-schedule' : '/calendar'}><Button>{isInstructor ? 'Back to my schedule' : 'Calendar'}</Button></Link></>} />
      <div style={{ maxWidth: 520, marginBottom: 12 }}>
        <FSelect label="Switch session" value={s.id} onChange={v => nav(`/sessions/${v}`)} options={ordered.map(x => ({ value: x.id, label: `${fmtDate(x.start)} · ${d.courses.find(c => c.id === x.courseId)?.code} · ${x.status}` }))} />
      </div>
      {clash && <div className="callout" role="alert" style={{ marginBottom: 16 }}>⚠ Resource clash on this day: {Array.from(new Set(clash)).join('; ')}</div>}
      <ClassList key={s.id} session={s} />
      <div className="grid c2">
        <SeatChart session={s} />
        <Waitlist key={s.id} session={s} />
        <Materials key={s.id + 'm'} session={s} />
        <Notes key={s.id + 'n'} session={s} />
        <FeedbackForm key={s.id + 'f'} session={s} />
      </div>
    </>
  )
}
