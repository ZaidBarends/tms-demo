import { Link } from 'react-router-dom'
import { Button, Select } from '@fluentui/react-components'
import { Fire24Regular, Checkmark16Filled } from '@fluentui/react-icons'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, EmptyState } from '../../shared/ui'
import { Ring, BadgeIcon } from '../widgets'
import { fmtDate, fmtShort, daysBetween, today, money } from '../../shared/format'
import { downloadIcs } from '../csv'
import type { Rec } from '../recommend'
import type { Badge, LeaderRow } from '../gamify'
import type { Data, Enrolment } from '../../shared/types'

export function StreakGoalCard({ streak, longest, days, week, goal, setGoal }: {
  streak: number; longest: number; days: { date: string; label: string; mins: number }[]; week: number; goal: number; setGoal: (m: number) => void
}) {
  return (
    <Card title="Your learning rhythm">
      <div className="lms-rhythm">
        <div className="lms-streak">
          <Fire24Regular style={{ color: '#f7630c', width: 34, height: 34 }} />
          <div><b className="lms-big">{streak}</b><span className="muted small"> day streak</span><div className="muted small">Best: {longest} days</div></div>
        </div>
        <Ring value={(week / goal) * 100} size={92} stroke={10} color={week >= goal ? '#13a10e' : '#0f6cbd'} label={`${week}`} sub={`of ${goal} min`} />
      </div>
      <div className="lms-week" aria-label="Last seven days">
        {days.map(x => <div key={x.date} className={x.mins > 0 ? 'on' : ''} title={`${fmtShort(x.date)}: ${x.mins} min`}><span>{x.mins > 0 ? <Checkmark16Filled /> : ''}</span><small>{x.label}</small></div>)}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <label htmlFor="lms-goal" className="small muted">Weekly goal</label>
        <Select id="lms-goal" size="small" value={String(goal)} onChange={(_, d) => setGoal(Number(d.value))}>
          {[60, 90, 150, 210, 300].map(m => <option key={m} value={m}>{m} minutes</option>)}
        </Select>
      </div>
    </Card>
  )
}

const COLORS = { Completed: '#13a10e', 'In progress': '#0f6cbd', 'Not started': '#c4c9cf' }
export function ProgressDonut({ es }: { es: Enrolment[] }) {
  const data = [
    { name: 'Completed', value: es.filter(e => e.status === 'Completed').length },
    { name: 'In progress', value: es.filter(e => e.status === 'In progress').length },
    { name: 'Not started', value: es.filter(e => e.status === 'Booked').length },
  ].filter(x => x.value > 0)
  return (
    <Card title="Course progress">
      {es.length === 0 ? <EmptyState title="No courses yet" /> : (
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2} stroke="none">
                {data.map(x => <Cell key={x.name} fill={COLORS[x.name as keyof typeof COLORS]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

export function WeeklyBars({ days, goal }: { days: { label: string; mins: number }[]; goal: number }) {
  return (
    <Card title="Minutes learnt this week">
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={days} margin={{ left: -18, right: 8 }}>
            <CartesianGrid stroke="#8884" vertical={false} />
            <XAxis dataKey="label" tickLine={false} fontSize={12} /><YAxis allowDecimals={false} fontSize={12} />
            <Tooltip formatter={(v: number) => [`${v} min`, 'Learning']} />
            <ReferenceLine y={Math.round(goal / 7)} stroke="#f7630c" strokeDasharray="4 4" label={{ value: 'daily target', fontSize: 11, fill: '#f7630c', position: 'insideTopRight' }} />
            <Bar dataKey="mins" fill="#0f6cbd" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function Recommended({ recs, canBuy }: { recs: Rec[]; canBuy: boolean }) {
  return (
    <Card title="Recommended next" actions={<Link to="/catalogue">Browse all</Link>}>
      {recs.length === 0 ? <EmptyState title="You are all caught up" text="New recommendations appear as you learn." /> : (
        <div className="grid c4">
          {recs.map(({ course: c, reason }) => (
            <div key={c.id} className="lms-rec">
              <span className="chip">{c.category}</span>
              <b>{c.title}</b>
              <span className="muted small">{reason}</span>
              <span className="small">{c.hours} hrs{canBuy ? ` · ${money(c.price * 1.15)} incl. VAT` : ''}</span>
              <Link to={`/catalogue/${c.id}`}><Button size="small">{canBuy ? 'View and book' : 'View course'}</Button></Link>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export function DeadlineAlerts({ d, es }: { d: Data; es: Enrolment[] }) {
  const due = es.filter(e => e.deadline && e.status !== 'Completed').map(e => ({ e, left: daysBetween(today(), e.deadline!) })).filter(x => x.left <= 21).sort((a, b) => a.left - b.left)
  return (
    <Card title="Deadlines">
      {due.length === 0 ? <EmptyState title="Nothing due soon" text="Compliance and assigned deadlines show here." /> : (
        <ul className="lms-list">{due.map(({ e, left }) => (
          <li key={e.id}>
            <span><b>{d.courses.find(c => c.id === e.courseId)?.title}</b><div className="small muted">Due {fmtDate(e.deadline)} · {e.progress}% done</div></span>
            <span className={`lms-pill ${left < 0 ? 'bad' : left < 7 ? 'warn' : ''}`}>{left < 0 ? `${-left} days overdue` : left === 0 ? 'Due today' : `${left} days left`}</span>
          </li>
        ))}</ul>
      )}
    </Card>
  )
}

export function UpcomingSessions({ d, es }: { d: Data; es: Enrolment[] }) {
  const rows = es.filter(e => e.sessionId && e.status !== 'Completed').map(e => ({ e, s: d.sessions.find(x => x.id === e.sessionId)! })).filter(x => x.s && x.s.start >= today()).sort((a, b) => a.s.start.localeCompare(b.s.start))
  return (
    <Card title="Upcoming sessions">
      {rows.length === 0 ? <EmptyState title="No sessions booked" text="Instructor-led dates you book appear here." /> : (
        <ul className="lms-list">{rows.map(({ e, s }) => {
          const title = d.courses.find(c => c.id === e.courseId)?.title ?? ''
          return (
            <li key={e.id}>
              <span><b>{title}</b><div className="small muted">{fmtDate(s.start)} · {s.venue}</div></span>
              <Button size="small" onClick={() => downloadIcs(title, s.start, s.venue)}>Add to calendar</Button>
            </li>
          )
        })}</ul>
      )}
    </Card>
  )
}

export function BadgeStrip({ badges }: { badges: Badge[] }) {
  const sorted = [...badges].sort((a, b) => Number(b.unlocked) - Number(a.unlocked) || b.current / b.target - a.current / a.target).slice(0, 6)
  return (
    <Card title={`Achievements (${badges.filter(b => b.unlocked).length} of ${badges.length})`} actions={<Link to="/achievements">View all</Link>}>
      <div className="lms-badges">
        {sorted.map(b => (
          <div key={b.id} className={`lms-badge ${b.unlocked ? 'on' : ''}`} title={b.desc}>
            <span className="lms-badge-ico"><BadgeIcon icon={b.icon} /></span>
            <b>{b.name}</b>
            <small>{b.unlocked ? 'Unlocked' : `${b.current} / ${b.target}`}</small>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function MiniLeaderboard({ rows, title }: { rows: LeaderRow[]; title: string }) {
  const top = rows.slice(0, 5); const me = rows.find(r => r.me)!
  const shown = top.some(r => r.me) ? top : [...top.slice(0, 4), me]
  return (
    <Card title={title} actions={<Link to="/achievements">Details</Link>}>
      <ol className="lms-lb">{shown.map(r => (
        <li key={r.name} className={r.me ? 'me' : ''}><span className="lms-rank">{r.rank}</span><span>{r.me ? `${r.name} (you)` : r.name}</span><b>{r.pts} pts</b></li>
      ))}</ol>
    </Card>
  )
}
