import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button, Checkbox, Tab, TabList } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../../shared/store'
import { PageHeader, Card, EmptyState, Status, Stat, Progress } from '../../shared/ui'
import { FSelect } from '../../shared/fields'
import { fmtDate, fmtShort, money, today } from '../../shared/format'
import { seatsTaken } from '../../shared/calc'
import type { Session } from '../../shared/types'
import { useOps, defaultCourseExtra } from './opsStore'
import { CurriculumEditor, PricingEditor } from './CourseEditors'
import { SessionFormModal } from './SessionForm'
import { VENUES } from './logic'
import { downloadCsv } from './download'
import './ops.css'

type Tabs = 'overview' | 'curriculum' | 'pricing' | 'sessions' | 'learners' | 'revenue'
const PALETTE = ['#0f6cbd', '#2b9bd8', '#13a10e', '#f7630c', '#8764b8', '#c4c9cf']

export default function CourseDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const d = useStore(s => s.data)
  const course = d.courses.find(c => c.id === id) ?? (id ? undefined : d.courses[0])
  const [tab, setTab] = useState<Tabs>('overview')
  const [sched, setSched] = useState<Session | null>(null)
  const setCourse = useOps(s => s.setCourse)
  const stored = useOps(s => (course ? s.course[course.id] : undefined))
  const extra = stored ?? (course ? defaultCourseExtra(course.hours) : undefined)
  const picker = <FSelect label="Course" value={course?.id ?? ''} onChange={v => nav(`/course/${v}`)} options={d.courses.map(c => ({ value: c.id, label: `${c.code} ${c.title}` }))} />

  if (!course || !extra) return (<><PageHeader id="course-detail" title="Course detail" /><EmptyState title="Course not found" text="Choose a course from the catalogue." action={<Link to="/courses">Back to courses</Link>} /></>)

  const sessions = d.sessions.filter(s => s.courseId === course.id).sort((a, b) => a.start.localeCompare(b.start))
  const upcoming = sessions.filter(s => s.start >= today() && s.status !== 'Cancelled')
  const roster = d.enrolments.filter(e => e.courseId === course.id)
  const cap = upcoming.reduce((a, s) => a + s.capacity, 0); const taken = upcoming.reduce((a, s) => a + seatsTaken(d, s.id), 0)
  const revenueOf = (payer: string) => roster.filter(e => e.payer === payer).length * course.price
  const revenue = roster.length * course.price
  const completed = roster.filter(e => e.status === 'Completed').length
  const util = sessions.filter(s => s.status !== 'Cancelled').map(s => ({ name: fmtShort(s.start), booked: seatsTaken(d, s.id), free: Math.max(0, s.capacity - seatsTaken(d, s.id)) }))
  const payerData = [{ name: 'Employer-paid', value: revenueOf('employer') }, { name: 'Self-paying', value: revenueOf('self') }, { name: 'Internal', value: revenueOf('internal') }].filter(x => x.value > 0)
  const prereqs = d.courses.filter(c => extra.prereqs.includes(c.id))
  const dependents = d.courses.filter(c => (useOps.getState().course[c.id]?.prereqs ?? []).includes(course.id))
  const togglePrereq = (cid: string, on: boolean) => setCourse(course.id, { ...extra, prereqs: on ? [...extra.prereqs, cid] : extra.prereqs.filter(x => x !== cid) })
  const newSession = (): Session => ({ id: `x-${Date.now()}`, courseId: course.id, start: today(), venue: VENUES[0], instructorId: 's3', capacity: 12, equipment: [], status: 'Scheduled' })

  return (
    <>
      <PageHeader id="course-detail" title={course.title} subtitle={`${course.code} · ${course.category} · ${course.hours} hours`}
        actions={<><Status s={course.status} /><Button onClick={() => setSched(newSession())}>Schedule session</Button><Link to="/courses"><Button>Back to courses</Button></Link></>} />
      <div style={{ maxWidth: 420, marginBottom: 12 }}>{picker}</div>
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="List price" value={money(course.price)} hint="Per seat, excl. VAT" />
        <Stat label="Upcoming sessions" value={upcoming.length} hint={upcoming[0] ? `Next ${fmtDate(upcoming[0].start)}` : 'None scheduled'} />
        <Stat label="Seat utilisation" value={`${cap ? Math.round((taken / cap) * 100) : 0}%`} hint={`${taken} of ${cap} seats`} />
        <Stat label="Revenue to date" value={money(revenue)} hint={`${roster.length} enrolments, ${completed} completed`} />
      </div>
      <TabList selectedValue={tab} onTabSelect={(_, x) => setTab(x.value as Tabs)} style={{ marginBottom: 16 }}>
        <Tab value="overview">Overview</Tab><Tab value="curriculum">Curriculum</Tab><Tab value="pricing">Pricing</Tab><Tab value="sessions">Sessions ({sessions.length})</Tab><Tab value="learners">Learners ({roster.length})</Tab><Tab value="revenue">Revenue</Tab>
      </TabList>

      {tab === 'overview' && (
        <div className="grid c2">
          <Card title="About this course">
            <p style={{ marginTop: 0 }}>{course.description || 'No description yet.'}</p>
            <div className="ops-section">Skills taught</div>
            <div className="chips">{course.skills.length ? course.skills.map(s => <span key={s} className="chip">{s}</span>) : <span className="muted">None listed</span>}</div>
            <div className="ops-section">Required before this course</div>
            <div className="chips">{prereqs.length ? prereqs.map(p => <Link key={p.id} to={`/course/${p.id}`} className="chip">{p.code} {p.title}</Link>) : <span className="muted">No prerequisites</span>}</div>
            {dependents.length > 0 && <><div className="ops-section">Unlocks</div><div className="chips">{dependents.map(p => <Link key={p.id} to={`/course/${p.id}`} className="chip">{p.code} {p.title}</Link>)}</div></>}
          </Card>
          <Card title="Prerequisites">
            <p className="muted small" style={{ marginTop: 0 }}>Tick the courses a learner should complete first.</p>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {d.courses.filter(c => c.id !== course.id).map(c => <div key={c.id}><Checkbox label={`${c.code} ${c.title}`} checked={extra.prereqs.includes(c.id)} onChange={(_, x) => togglePrereq(c.id, !!x.checked)} /></div>)}
            </div>
          </Card>
          <Card title="Session utilisation">
            {util.length === 0 ? <EmptyState title="No sessions yet" /> : (
              <div className="ops-chart" role="img" aria-label="Booked and free seats per session">
                <ResponsiveContainer><BarChart data={util} margin={{ left: -15 }}>
                  <CartesianGrid stroke="#8884" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} /><Tooltip /><Legend />
                  <Bar dataKey="booked" name="Booked" stackId="a" fill="#0f6cbd" /><Bar dataKey="free" name="Free" stackId="a" fill="#c4c9cf" radius={[4, 4, 0, 0]} />
                </BarChart></ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      )}
      {tab === 'curriculum' && <CurriculumEditor key={course.id} course={course} />}
      {tab === 'pricing' && <PricingEditor key={course.id} course={course} />}
      {tab === 'sessions' && (
        <Card title="Sessions timeline" actions={<Button size="small" onClick={() => setSched(newSession())}>Schedule session</Button>}>
          {sessions.length === 0 ? <EmptyState title="No sessions scheduled" text="Schedule the first session for this course." /> : (
            <ul className="ops-timeline">{sessions.map(s => (
              <li key={s.id}>
                <div className="row"><Link to={`/sessions/${s.id}`}><b>{fmtDate(s.start)}</b></Link><Status s={s.status} /><span className="muted small">{s.start < today() ? 'Past' : `in ${Math.round((new Date(s.start).getTime() - new Date(today()).getTime()) / 864e5)} days`}</span></div>
                <div className="small muted">{s.venue} · {d.staff.find(x => x.id === s.instructorId)?.name} · {seatsTaken(d, s.id)}/{s.capacity} seats</div>
              </li>))}</ul>
          )}
        </Card>
      )}
      {tab === 'learners' && (
        <Card title="Learner roster" actions={<Button size="small" disabled={!roster.length} onClick={() => downloadCsv(`${course.code}-roster.csv`, [['Learner', 'Paid by', 'Status', 'Progress %', 'Session'], ...roster.map(e => [d.learners.find(l => l.id === e.learnerId)?.name, e.payer, e.status, e.progress, e.sessionId ? d.sessions.find(s => s.id === e.sessionId)?.start : 'Self-paced'])])}>Export CSV</Button>}>
          {roster.length === 0 ? <EmptyState title="Nobody enrolled yet" /> : (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Learner</th><th>Paid by</th><th>Status</th><th>Progress</th><th>Session</th></tr></thead>
              <tbody>{roster.map(e => {
                const l = d.learners.find(x => x.id === e.learnerId); const s = d.sessions.find(x => x.id === e.sessionId)
                return <tr key={e.id}><td>{l?.name}</td><td>{e.payer === 'self' ? 'Self' : e.payer === 'internal' ? 'Internal' : d.orgs.find(o => o.id === e.orgId)?.name}</td><td><Status s={e.status} /></td><td style={{ width: 150 }}><Progress value={e.progress} /></td><td>{s ? <Link to={`/sessions/${s.id}`}>{fmtDate(s.start)}</Link> : <span className="muted">Self-paced</span>}</td></tr>
              })}</tbody>
            </table></div>
          )}
        </Card>
      )}
      {tab === 'revenue' && (
        <div className="grid c2">
          <Card title="Revenue by payer">
            {payerData.length === 0 ? <EmptyState title="No revenue yet" /> : (
              <div className="ops-chart" role="img" aria-label="Revenue split by payer">
                <ResponsiveContainer><PieChart><Pie data={payerData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>{payerData.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}</Pie><Tooltip formatter={(v: number) => money(v)} /><Legend /></PieChart></ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card title="Summary">
            <table className="tbl"><tbody>
              <tr><td>Enrolments</td><td className="num">{roster.length}</td></tr>
              <tr><td>Revenue at list price (excl. VAT)</td><td className="num">{money(revenue)}</td></tr>
              <tr><td>Booked for upcoming sessions</td><td className="num">{money(taken * course.price)}</td></tr>
              <tr><td>Unsold capacity value</td><td className="num">{money(Math.max(0, cap - taken) * course.price)}</td></tr>
              <tr><td>Completion rate</td><td className="num">{roster.length ? Math.round((completed / roster.length) * 100) : 0}%</td></tr>
            </tbody></table>
          </Card>
        </div>
      )}
      <SessionFormModal value={sched} isNew onClose={() => setSched(null)} />
    </>
  )
}
