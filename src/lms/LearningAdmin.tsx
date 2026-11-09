import { useState } from 'react'
import { Button, Tab, TabList } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../shared/store'
import { PageHeader, Card, EmptyState, Progress, Stat } from '../shared/ui'
import { fmtDate, today } from '../shared/format'
import { useLms } from './lmsStore'
import { downloadCsv } from './csv'
import AssignWizard from './admin/AssignWizard'
import Matrix from './admin/Matrix'
import Overdue from './admin/Overdue'
import { dueRows, staffLearners, teamKey, teamName } from './admin/logic'
import './lms.css'

type Tabv = 'overview' | 'assign' | 'matrix' | 'overdue'

export default function LearningAdmin() {
  const d = useStore(s => s.data)
  const assignments = useLms(s => s.assignments)
  const [tab, setTab] = useState<Tabv>('overview')
  const [pending, setPending] = useState<string | null>(null)

  const staffIds = new Set(staffLearners(d).map(l => l.id))
  const es = d.enrolments.filter(e => staffIds.has(e.learnerId))
  const teams = Array.from(new Set(staffLearners(d).map(teamKey)))
  const byTeam = teams.map(t => {
    const ids = new Set(staffLearners(d).filter(l => teamKey(l) === t).map(l => l.id))
    const x = es.filter(e => ids.has(e.learnerId))
    return { id: t, name: teamName(d, t), Completed: x.filter(e => e.status === 'Completed').length, 'In progress': x.filter(e => e.status === 'In progress').length, Booked: x.filter(e => e.status === 'Booked').length, total: x.length }
  })
  const rate = es.length ? Math.round((es.filter(e => e.status === 'Completed').length / es.length) * 100) : 0
  const due = dueRows(d, today(), 7)
  const overdue = due.filter(r => r.left < 0).length

  return (
    <>
      <PageHeader id="learning-admin" title="Learning admin" subtitle="Assign courses, set deadlines, track compliance and chase overdue learning"
        actions={<Button onClick={() => downloadCsv('completion-by-team.csv', [['Team', 'Enrolments', 'Completed', 'In progress', 'Booked', 'Completion %'], ...byTeam.map(t => [t.name, t.total, t.Completed, t['In progress'], t.Booked, t.total ? Math.round((t.Completed / t.total) * 100) : 0])])}>Export CSV</Button>} />
      <TabList selectedValue={tab} onTabSelect={(_, x) => setTab(x.value as Tabv)} style={{ marginBottom: 16 }}>
        <Tab value="overview">Overview</Tab><Tab value="assign">Assign a course</Tab><Tab value="matrix">Compliance matrix</Tab><Tab value="overdue">Overdue{overdue ? ` (${overdue})` : ''}</Tab>
      </TabList>

      {tab === 'overview' && (
        <>
          <div className="grid c4" style={{ marginBottom: 16 }}>
            <Stat label="Employer and internal enrolments" value={es.length} hint={`${teams.length} teams`} />
            <Stat label="Completion rate" value={`${rate}%`} hint={`${es.filter(e => e.status === 'Completed').length} completed`} />
            <Stat label="Overdue" value={overdue} hint="Past their deadline" />
            <Stat label="Due within 7 days" value={due.length - overdue} hint="Chase these first" />
          </div>
          <div className="grid c2">
            <Card title="Completion by team">
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byTeam} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid stroke="#8884" horizontal={false} /><XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="name" width={130} fontSize={12} />
                    <Tooltip /><Legend />
                    <Bar dataKey="Completed" stackId="a" fill="#13a10e" /><Bar dataKey="In progress" stackId="a" fill="#597f2d" /><Bar dataKey="Booked" stackId="a" fill="#c4c9cf" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Team detail">
              <table className="tbl"><thead><tr><th>Team</th><th className="num">Enrolments</th><th style={{ width: 170 }}>Completion</th></tr></thead><tbody>
                {byTeam.map(t => { const pct = t.total ? Math.round((t.Completed / t.total) * 100) : 0
                  return <tr key={t.id}><td>{t.name}</td><td className="num">{t.total}</td><td><Progress value={pct} /><span className="small muted">{pct}% complete</span></td></tr> })}
              </tbody></table>
            </Card>
          </div>
          <Card title="Recent assignments">
            {assignments.length === 0 ? <EmptyState title="No assignments yet" action={<Button onClick={() => setTab('assign')}>Assign a course</Button>} /> : (
              <table className="tbl"><thead><tr><th>When</th><th>Course</th><th>Who</th><th className="num">Learners</th><th>Deadline</th><th>Reminders</th></tr></thead><tbody>
                {assignments.slice(0, 8).map(a => <tr key={a.id}><td>{fmtDate(a.at.slice(0, 10))}</td><td>{d.courses.find(c => c.id === a.courseId)?.title}</td><td>{a.target}</td><td className="num">{a.count}</td><td>{fmtDate(a.deadline)}</td><td>{a.cadence}</td></tr>)}
              </tbody></table>
            )}
          </Card>
        </>
      )}
      {tab === 'assign' && <AssignWizard />}
      {tab === 'matrix' && <Matrix onNudge={id => { setPending(id); setTab('overdue') }} />}
      {tab === 'overdue' && <Overdue pending={pending} clear={() => setPending(null)} />}
    </>
  )
}
