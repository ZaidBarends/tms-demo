import { useState } from 'react'
import { Button, Checkbox, Switch } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmptyState } from '../../shared/ui'
import { FSelect, FText } from '../../shared/fields'
import { addDays, fmtDate, money, today } from '../../shared/format'
import { useLms } from '../lmsStore'
import { staffLearners, teamKey, teamName } from './logic'

const STEPS = ['Who', 'Course', 'Schedule', 'Review']
export const CADENCES = ['No reminders', '3 days before', 'Weekly until done', 'Every 2 weeks', 'Daily in the last week']

export default function AssignWizard() {
  const d = useStore(s => s.data)
  const assign = useStore(s => s.assign)
  const sendEmail = useStore(s => s.sendEmail)
  const { addAssignment, mandatory, toggleMandatory } = useLms()
  const [step, setStep] = useState(0)
  const [picked, setPicked] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [courseId, setCourseId] = useState('')
  const [deadline, setDeadline] = useState(addDays(today(), 30))
  const [cadence, setCadence] = useState(CADENCES[1])
  const [notify, setNotify] = useState(true)
  const [err, setErr] = useState<Record<string, string>>({})
  const [done, setDone] = useState<string | null>(null)

  const staff = staffLearners(d)
  const teams = Array.from(new Set(staff.map(teamKey)))
  const shown = staff.filter(l => l.name.toLowerCase().includes(q.toLowerCase()))
  const course = d.courses.find(c => c.id === courseId)
  const already = picked.filter(id => d.enrolments.some(e => e.learnerId === id && e.courseId === courseId))
  const fresh = picked.filter(id => !already.includes(id))
  const toggleTeam = (key: string) => {
    const ids = staff.filter(l => teamKey(l) === key).map(l => l.id)
    const all = ids.every(i => picked.includes(i))
    setPicked(all ? picked.filter(p => !ids.includes(p)) : Array.from(new Set([...picked, ...ids])))
  }

  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 0 && !picked.length) e.who = 'Select at least one learner'
    if (s === 1 && !courseId) e.course = 'Choose a course'
    if (s === 2 && (!deadline || deadline < today())) e.deadline = 'Deadline must be today or later'
    setErr(e); return Object.keys(e).length === 0
  }
  const next = () => { if (validate(step)) setStep(step + 1) }
  const confirm = () => {
    if (!course) return
    assign(picked, courseId, deadline)
    addAssignment({ courseId, target: teams.filter(t => staff.filter(l => teamKey(l) === t).every(l => picked.includes(l.id))).map(t => teamName(d, t)).join(', ') || `${picked.length} selected learners`, count: fresh.length, deadline, cadence, notified: notify })
    if (notify) fresh.forEach(id => { const l = d.learners.find(x => x.id === id)!; sendEmail('m1', l.email, `New course assigned: ${course.title}`) })
    useStore.getState().log(`${course.title} assigned to ${fresh.length} learner(s), due ${fmtDate(deadline)}`)
    setDone(`Assigned ${course.title} to ${fresh.length} learner(s). ${already.length ? `${already.length} already had it and were skipped. ` : ''}${notify ? 'Notification emails were added to the sent log.' : ''}`)
  }
  const reset = () => { setDone(null); setStep(0); setPicked([]); setCourseId(''); setErr({}) }

  if (done) return (
    <Card title="Assignment complete">
      <div className="callout" role="status">{done}</div>
      <div className="row" style={{ marginTop: 12 }}><Button appearance="primary" onClick={reset}>Assign another course</Button></div>
    </Card>
  )

  return (
    <Card title="Assign a course">
      <ol className="lms-steps" aria-label="Wizard steps">
        {STEPS.map((s, i) => <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}><span>{i < step ? '✓' : i + 1}</span>{s}</li>)}
      </ol>
      {step === 0 && (
        <div className="form">
          <div className="chips" role="group" aria-label="Quick select a team">
            {teams.map(t => { const ids = staff.filter(l => teamKey(l) === t).map(l => l.id); const all = ids.every(i => picked.includes(i))
              return <Button key={t} size="small" appearance={all ? 'primary' : 'secondary'} onClick={() => toggleTeam(t)}>{teamName(d, t)} ({ids.length})</Button> })}
          </div>
          <FText label="Find a learner" value={q} onChange={setQ} placeholder="Type a name" />
          <fieldset style={{ border: '1px solid var(--line)', borderRadius: 8, maxHeight: 240, overflowY: 'auto', padding: 10 }}>
            <legend>Learners ({picked.length} selected)</legend>
            {shown.length === 0 ? <EmptyState title="No learners match" /> : shown.map(l => <div key={l.id}><Checkbox label={`${l.name} · ${teamName(d, teamKey(l))}`} checked={picked.includes(l.id)} onChange={(_, x) => setPicked(x.checked ? [...picked, l.id] : picked.filter(p => p !== l.id))} /></div>)}
          </fieldset>
          {err.who && <div className="err" role="alert">{err.who}</div>}
        </div>
      )}
      {step === 1 && (
        <div className="form">
          <FSelect label="Course" value={courseId} onChange={setCourseId} placeholder="Choose a course" error={err.course} options={d.courses.filter(c => c.status === 'Active').map(c => ({ value: c.id, label: `${c.code} · ${c.title}` }))} />
          {course && (
            <div className="callout">
              <b>{course.title}</b> · {course.hours} hours · list price {money(course.price)} per learner<div className="small">{course.description}</div>
              {already.length > 0 && <div className="small" style={{ marginTop: 6 }}><b>{already.length}</b> of your selected learners already have this course and will be skipped.</div>}
            </div>
          )}
          {course && <Switch label="Treat as a mandatory compliance course" checked={mandatory.includes(course.code)} onChange={() => toggleMandatory(course.code)} />}
        </div>
      )}
      {step === 2 && (
        <div className="form">
          <FText label="Deadline" type="date" value={deadline} onChange={setDeadline} error={err.deadline} />
          <FSelect label="Reminder cadence" value={cadence} onChange={setCadence} options={CADENCES.map(c => ({ value: c, label: c }))} />
          <Switch label="Email learners now" checked={notify} onChange={(_, x) => setNotify(x.checked)} />
        </div>
      )}
      {step === 3 && course && (
        <table className="tbl"><tbody>
          <tr><td>Learners</td><td><b>{fresh.length}</b> new{already.length ? `, ${already.length} skipped (already enrolled)` : ''}</td></tr>
          <tr><td>Course</td><td>{course.title} ({course.code})</td></tr>
          <tr><td>Deadline</td><td>{fmtDate(deadline)}</td></tr>
          <tr><td>Reminders</td><td>{cadence}</td></tr>
          <tr><td>Notify</td><td>{notify ? 'Yes, email each learner' : 'No'}</td></tr>
          <tr><td>Billing</td><td>Employer or internal cost centre, {money(course.price * fresh.length)} ex VAT</td></tr>
        </tbody></table>
      )}
      <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
        <Button disabled={step === 0} onClick={() => setStep(step - 1)}>Back</Button>
        {step < 3 ? <Button appearance="primary" onClick={next}>Next</Button> : <Button appearance="primary" disabled={fresh.length === 0} onClick={confirm}>{fresh.length === 0 ? 'Nobody new to assign' : 'Confirm assignment'}</Button>}
      </div>
    </Card>
  )
}
