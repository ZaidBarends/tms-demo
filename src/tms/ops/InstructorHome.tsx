import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Checkbox } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore, useCtx } from '../../shared/store'
import { PageHeader, Card, EmptyState, Stat, Status } from '../../shared/ui'
import { seatsTaken } from '../../shared/calc'
import { addDays, fmtDate, fmtShort, monthLabel, parse, today } from '../../shared/format'
import { defaultSess, useOps } from './opsStore'
import { monthlyLoad } from './logic'
import './ops.css'

const CHECKLIST = ['Venue unlocked and set up', 'Projector and laptop tested', 'Attendance register printed', 'Learner workbooks counted', 'Safety briefing prepared', 'Assessment papers ready']
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function useNow(ms = 30000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t) }, [ms])
  return now
}
function countdown(start: string, now: number) {
  const target = new Date(`${start}T08:30:00`).getTime()
  const diff = target - now
  if (diff <= 0) return { text: 'Under way', soon: true }
  const m = Math.floor(diff / 60000); const dd = Math.floor(m / 1440); const h = Math.floor((m % 1440) / 60)
  return { text: dd > 0 ? `${dd}d ${h}h ${m % 60}m` : `${h}h ${m % 60}m`, soon: dd === 0 }
}

export function MySchedule() {
  const d = useStore(s => s.data)
  const { instructorId } = useCtx()
  const sess = useOps(s => s.sess)
  const unavailable = useOps(s => s.unavailable)
  const patch = useOps(s => s.patchSess)
  const toggle = useOps(s => s.toggleUnavailable)
  const now = useNow()
  const mine = d.sessions.filter(s => s.instructorId === instructorId && s.status !== 'Cancelled').sort((a, b) => a.start.localeCompare(b.start))
  const upcoming = mine.filter(s => s.start >= today())
  const past = mine.filter(s => s.start < today()).reverse()
  const next = upcoming[0]
  const course = (id: string) => d.courses.find(c => c.id === id)
  const todays = mine.filter(s => s.start === today())
  const month = today().slice(0, 7)
  const thisMonth = mine.filter(s => s.start.startsWith(month))
  const hours = thisMonth.reduce((a, s) => a + (course(s.courseId)?.hours ?? 0), 0)
  const learners30 = upcoming.filter(s => s.start <= addDays(today(), 30)).reduce((a, s) => a + seatsTaken(d, s.id), 0)
  const ratings = mine.map(s => sess[s.id]?.feedback?.rating).filter((x): x is number => !!x)
  const load = monthlyLoad(d, instructorId, today()).map(x => ({ ...x, name: monthLabel(x.key) }))
  const myOff = unavailable[instructorId] ?? []
  const nextCheck = next ? (sess[next.id] ?? defaultSess()).checklist : {}
  const ready = CHECKLIST.filter(c => nextCheck[c]).length
  const cd = next ? countdown(next.start, now) : null
  const days14 = Array.from({ length: 14 }, (_, i) => addDays(today(), i))

  const row = (s: typeof mine[0]) => (
    <tr key={s.id}><td>{fmtDate(s.start)}</td><td>{course(s.courseId)?.title}</td><td>{s.venue}</td><td className="num">{seatsTaken(d, s.id)}/{s.capacity}</td><td><Link to={`/sessions/${s.id}`}>Class list</Link></td></tr>
  )

  return (
    <>
      <PageHeader id="my-schedule" title="My schedule" subtitle="Your classes, class-day checklist and availability" actions={<Link to="/calendar"><Button>Open calendar</Button></Link>} />
      {next ? (
        <div className="ops-next" aria-label="Next class">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ opacity: .8, fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em' }}>Next class</div>
              <div style={{ fontSize: 22, fontWeight: 600, margin: '4px 0' }}>{course(next.courseId)?.title}</div>
              <div>{fmtDate(next.start)} at 08:30 · {next.venue}</div>
              <div style={{ marginTop: 4 }}>{seatsTaken(d, next.id)} of {next.capacity} learners · <Link to={`/sessions/${next.id}`}>Open class list</Link></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ opacity: .8, fontSize: 12 }}>{cd?.soon ? 'Starts in' : 'Countdown'}</div>
              <div className="ops-countdown" aria-live="off">{cd?.text}</div>
            </div>
          </div>
        </div>
      ) : <Card><EmptyState title="No upcoming classes" text="New sessions assigned to you will show here." /></Card>}

      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Sessions this month" value={thisMonth.length} />
        <Stat label="Teaching hours this month" value={hours} />
        <Stat label="Learners, next 30 days" value={learners30} />
        <Stat label="Average rating" value={ratings.length ? `${(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)} / 5` : '–'} hint={`${ratings.length} feedback forms`} />
      </div>

      <div className="grid c2">
        <Card title="Today's agenda">
          {todays.length === 0 ? <EmptyState title="No class today" text={next ? `Your next class is on ${fmtDate(next.start)}.` : undefined} /> : todays.map(s => {
            const c = course(s.courseId); const end = Math.min(17, 9 + Math.min(8, Math.ceil((c?.hours ?? 8) / (c && c.hours > 8 ? Math.ceil(c.hours / 8) : 1))))
            return (
              <ul key={s.id} className="ops-timeline">
                <li><b>08:30</b> Arrive, set up and register learners</li>
                <li><b>09:00</b> {c?.title} begins ({seatsTaken(d, s.id)} learners)</li>
                <li><b>10:30</b> Tea break</li><li><b>12:30</b> Lunch</li>
                <li><b>{String(end).padStart(2, '0')}:00</b> Assessment and close. <Link to={`/sessions/${s.id}`}>Capture results</Link></li>
              </ul>
            )
          })}
        </Card>
        <Card title="Class-day checklist" actions={next && <span className="muted small">{ready} of {CHECKLIST.length} done</span>}>
          {!next ? <EmptyState title="Nothing to prepare" /> : (
            <>
              <p className="muted small" style={{ marginTop: 0 }}>For {course(next.courseId)?.title} on {fmtDate(next.start)}</p>
              {CHECKLIST.map(c => <div key={c}><Checkbox label={c} checked={!!nextCheck[c]} onChange={(_, x) => patch(next.id, s => ({ ...s, checklist: { ...s.checklist, [c]: !!x.checked } }))} /></div>)}
            </>
          )}
        </Card>
        <Card title="Teaching load">
          <div className="ops-chart" role="img" aria-label="Sessions and teaching hours per month">
            <ResponsiveContainer><BarChart data={load} margin={{ left: -15 }}>
              <CartesianGrid stroke="#8884" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend />
              <Bar dataKey="sessions" name="Sessions" fill="#0f6cbd" radius={[4, 4, 0, 0]} /><Bar dataKey="hours" name="Hours" fill="#2b9bd8" radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </Card>
        <Card title="My availability">
          <p className="muted small" style={{ marginTop: 0 }}>Tap a day to mark yourself unavailable. The scheduler avoids these days and warns about clashes.</p>
          <div className="ops-avail">
            {days14.map(day => {
              const has = mine.some(s => s.start === day); const off = myOff.includes(day); const wk = [0, 6].includes(parse(day).getDay())
              return (
                <button key={day} aria-pressed={off} disabled={has || wk} className={has ? 'has' : ''} onClick={() => toggle(instructorId, day)}
                  aria-label={`${fmtDate(day)}: ${has ? 'teaching' : wk ? 'weekend' : off ? 'unavailable' : 'available'}`}>
                  {WD[parse(day).getDay()]}<br />{fmtShort(day)}<br /><span className="small">{has ? 'Teaching' : wk ? '–' : off ? 'Off' : 'Free'}</span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      <Card title="Upcoming">{upcoming.length === 0 ? <EmptyState title="No upcoming sessions" /> : <div className="tbl-wrap"><table className="tbl"><tbody>{upcoming.map(row)}</tbody></table></div>}</Card>
      <Card title="Recent">{past.length === 0 ? <EmptyState title="No past sessions" /> : <div className="tbl-wrap"><table className="tbl"><tbody>{past.slice(0, 8).map(s => <tr key={s.id}><td>{fmtDate(s.start)}</td><td>{course(s.courseId)?.title}</td><td>{s.venue}</td><td className="num">{seatsTaken(d, s.id)}/{s.capacity}</td><td><Status s={s.status} /> <Link to={`/sessions/${s.id}`}>Class list</Link></td></tr>)}</tbody></table></div>}</Card>
    </>
  )
}
