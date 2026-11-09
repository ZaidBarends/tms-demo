import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { Checkmark16Filled } from '@fluentui/react-icons'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState } from '../shared/ui'
import { addDays, fmtDate, money, today } from '../shared/format'
import { useLms } from './lmsStore'
import { Ring } from './widgets'
import { AssignJourneyModal, JourneyAdminPanel, assignJourney } from './JourneyAdmin'
import { JourneyBuilder, DeleteJourney } from './JourneyBuilder'
import type { Journey } from '../shared/types'
import './lms.css'

export default function Journeys() {
  const d = useStore(s => s.data)
  const { learnerId, learner, persona } = useCtx()
  const nav = useNavigate()
  const reqs = useLms(s => s.journeyRequests)
  const request = useLms(s => s.requestJourney)
  const [assigning, setAssigning] = useState<Journey | null>(null)
  const [msg, setMsg] = useState('')
  const [builder, setBuilder] = useState(false)
  const [editing, setEditing] = useState<Journey | null>(null)
  const [deleting, setDeleting] = useState<Journey | null>(null)
  const isAdmin = persona === 'admin' || persona === 'all'
  const type = learner?.type ?? 'b2c'

  const enrol = (j: Journey) => {
    const remaining = j.courseIds.filter(cid => !d.enrolments.some(e => e.learnerId === learnerId && e.courseId === cid))
    if (type === 'b2c') { nav(`/checkout/${remaining[0]}?journey=${j.id}`); return }
    if (type === 'internal') { assignJourney(j, [learnerId], addDays(today(), 30)); setMsg(`You are enrolled in “${j.goal}”. ${remaining.length} course(s) were added to My learning with 30-day windows.`); return }
    request(learnerId, j.id); setMsg(`Request sent. Your manager will approve “${j.goal}” and the courses will be added to My learning.`)
  }

  return (
    <>
      <PageHeader id="journeys" title="Learning journeys" subtitle="Ordered paths of courses towards a goal"
        actions={isAdmin ? <Button appearance="primary" onClick={() => { setEditing(null); setBuilder(true) }}>New journey</Button> : undefined} />
      {msg && <div className="callout" role="status" style={{ marginBottom: 16 }}>{msg}</div>}
      {isAdmin && <JourneyAdminPanel onAssign={setAssigning} />}
      {d.journeys.length === 0 ? <EmptyState title="No journeys yet" text={isAdmin ? 'Create the first path for your learners.' : 'Your administrator has not set up any journeys yet.'} action={isAdmin ? <Button appearance="primary" onClick={() => { setEditing(null); setBuilder(true) }}>New journey</Button> : undefined} /> : (
        <div className="lms-journeys">
          {d.journeys.map(j => {
            const cs = j.courseIds.map(id => d.courses.find(c => c.id === id)!).filter(Boolean)
            const states = cs.map(c => d.enrolments.find(e => e.learnerId === learnerId && e.courseId === c.id))
            const done = states.filter(e => e?.status === 'Completed').length
            const nextIdx = isAdmin ? -1 : states.findIndex(e => e?.status !== 'Completed')
            const remaining = cs.filter((c, i) => states[i]?.status !== 'Completed')
            const hours = remaining.reduce((a, c) => a + c.hours, 0)
            const toBuy = cs.filter((c, i) => !states[i])
            const cost = toBuy.reduce((a, c) => a + c.price * 1.15, 0)
            const enrolledCount = new Set(d.enrolments.filter(e => j.courseIds.includes(e.courseId)).map(e => e.learnerId)).size
            const requested = reqs.find(r => r.learnerId === learnerId && r.journeyId === j.id)
            const skills = Array.from(new Set(cs.flatMap(c => c.skills)))
            return (
              <Card key={j.id} title={j.goal} actions={isAdmin ? <div className="row" style={{ gap: 6 }}><Button size="small" onClick={() => setAssigning(j)}>Assign to learners</Button><Button size="small" onClick={() => { setEditing(j); setBuilder(true) }}>Edit</Button><Button size="small" appearance="subtle" onClick={() => setDeleting(j)}>Delete</Button></div> : undefined}>
                <div className="lms-jhead">
                  {!isAdmin && <Ring value={(done / cs.length) * 100} size={88} stroke={10} color="#13a10e" label={`${done}/${cs.length}`} sub="courses" />}
                  <div className="small">
                    <div><b>{cs.length} courses</b> · about {hours} hours {isAdmin ? 'in total' : 'to go'}</div>
                    {isAdmin ? <div className="muted">{enrolledCount} learner{enrolledCount === 1 ? '' : 's'} currently enrolled in at least one course</div>
                      : type === 'b2c' ? <div>{toBuy.length ? <>Still to book: <b>{money(cost)}</b> incl. VAT</> : 'Everything is booked'}</div>
                        : <div className="muted">{type === 'internal' ? 'Paid by your organisation' : 'Paid by your employer'}</div>}
                    <div className="chips" style={{ marginTop: 6 }}>{skills.slice(0, 6).map(s => <span className="chip" key={s}>{s}</span>)}</div>
                  </div>
                </div>
                <ol className="lms-path">
                  {cs.map((c, i) => {
                    const e = states[i]; const st = isAdmin ? 'todo' : e?.status === 'Completed' ? 'done' : i === nextIdx ? 'current' : 'todo'
                    return (
                      <li key={c.id} className={st}>
                        <span className="lms-node" aria-hidden>{st === 'done' ? <Checkmark16Filled /> : i + 1}</span>
                        <div className="lms-step">
                          <b>{c.title}</b>
                          <span className="small muted">{c.hours} hrs · {isAdmin || type === 'b2c' ? money(c.price * 1.15) : 'Funded'}</span>
                          {!isAdmin && <span className="small">{e ? (e.status === 'Completed' ? `Completed${e.result ? ` · ${e.result}%` : ''}` : e.status === 'In progress' ? `${e.progress}% complete` : `Booked${e.deadline ? `, due ${fmtDate(e.deadline)}` : ''}`) : 'Not booked'}</span>}
                          {st === 'current' && <span className="chip">Next step</span>}
                          {!isAdmin && st === 'current' && (e ? <Link to={`/learn/${e.id}`}><Button size="small" appearance="primary">{e.progress > 0 ? 'Continue' : 'Start'}</Button></Link>
                            : <Link to={`/catalogue/${c.id}`}><Button size="small" appearance="primary">{type === 'b2c' ? 'Find dates' : 'View course'}</Button></Link>)}
                        </div>
                      </li>
                    )
                  })}
                </ol>
                {!isAdmin && done < cs.length && (toBuy.length > 0 || type !== 'b2c') && (
                  <div className="row">
                    {type === 'b2c' && <Button appearance="primary" disabled={!toBuy.length} onClick={() => enrol(j)}>{toBuy.length === cs.length ? 'Enrol in journey' : 'Book the next course'} (checkout)</Button>}
                    {type === 'internal' && toBuy.length > 0 && <Button appearance="primary" onClick={() => enrol(j)}>Enrol in journey</Button>}
                    {type === 'b2b' && toBuy.length > 0 && (requested ? <span className="lms-pill">{requested.status === 'Approved' ? 'Approved by your manager' : 'Requested, awaiting your manager'}</span> : <Button appearance="primary" onClick={() => enrol(j)}>Request enrolment</Button>)}
                  </div>
                )}
                {!isAdmin && done === cs.length && <div className="callout">Journey complete. Well done.</div>}
              </Card>
            )
          })}
        </div>
      )}
      <AssignJourneyModal journey={assigning} onClose={() => setAssigning(null)} />
      <JourneyBuilder open={builder} journey={editing} onClose={() => setBuilder(false)} onSaved={setMsg} />
      <DeleteJourney journey={deleting} onClose={() => setDeleting(null)} onDeleted={setMsg} />
    </>
  )
}
