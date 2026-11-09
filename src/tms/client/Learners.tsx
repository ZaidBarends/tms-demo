import { useMemo, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore, useCtx } from '../../shared/store'
import { PageHeader, Card, EmptyState, Progress, ReleaseBadge, Stat } from '../../shared/ui'
import { FText, FSelect } from '../../shared/fields'
import { fmtDate, today } from '../../shared/format'
import { downloadText, toCsv } from '../../talent/download'
import { STAFF_PROFILE } from './clientSeed'
import { AddLearnerDialog } from './AddLearnerDialog'
import { BulkAdd } from './BulkAdd'
import { LearnerDrawer } from './LearnerDrawer'
import './client.css'

type SortKey = 'name' | 'courses' | 'progress' | 'deadline'

export function ClientLearners() {
  const d = useStore(s => s.data)
  const { orgId } = useCtx()
  const org = d.orgs.find(o => o.id === orgId)!
  const [q, setQ] = useState('')
  const [courseF, setCourseF] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'name', dir: 1 })
  const [add, setAdd] = useState(false)
  const [bulk, setBulk] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const now = today()

  const rows = useMemo(() => d.learners.filter(l => l.orgId === orgId && l.type === 'b2b').map(l => {
    const es = d.enrolments.filter(e => e.learnerId === l.id && e.payer === 'employer')
    const open = es.filter(e => e.status !== 'Completed' && e.deadline).map(e => e.deadline!).sort()
    return {
      l, es, courses: es.length, progress: es.length ? Math.round(es.reduce((a, e) => a + e.progress, 0) / es.length) : 0,
      certs: es.filter(e => e.certificateId).length, deadline: open[0] ?? '', profile: STAFF_PROFILE[l.name],
    }
  }), [d, orgId])

  const shown = rows
    .filter(r => (!q || `${r.l.name} ${r.l.email}`.toLowerCase().includes(q.toLowerCase())) && (!courseF || r.es.some(e => e.courseId === courseF)))
    .sort((a, b) => {
      const k = sort.key
      const cmp = k === 'name' ? a.l.name.localeCompare(b.l.name) : k === 'courses' ? a.courses - b.courses : k === 'progress' ? a.progress - b.progress : (a.deadline || '9999').localeCompare(b.deadline || '9999')
      return cmp * sort.dir
    })
  const th = (key: SortKey, label: string) => (
    <th scope="col" aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="cl-sortbtn" onClick={() => setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 })}>{label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button>
    </th>
  )
  const exportCsv = () => downloadText(`cape-freight-learners-${now}.csv`, toCsv([
    ['Name', 'Email', 'Courses', 'Average progress %', 'Certificates', 'Next deadline'],
    ...shown.map(r => [r.l.name, r.l.email, r.courses, r.progress, r.certs, r.deadline]),
  ]))
  const active = rows.filter(r => r.courses > 0 && r.progress < 100).length

  return (
    <>
      <PageHeader id="client-learners" title="Our learners" subtitle={`${org.name} has about ${org.staff} staff; ${rows.length} are on training`}
        actions={<><Button onClick={() => setBulk(true)}>Add many (paste)</Button><Button onClick={exportCsv}>Export CSV</Button><Button appearance="primary" onClick={() => setAdd(true)}>Add a learner to a booking</Button></>} />
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Learners on platform" value={rows.length} hint={`of about ${org.staff} staff`} />
        <Stat label="Currently learning" value={active} />
        <Stat label="Certificates earned" value={rows.reduce((a, r) => a + r.certs, 0)} />
        <Stat label="Overdue deadlines" value={rows.filter(r => r.deadline && r.deadline < now).length} />
      </div>
      <Card>
        <div className="form c2" style={{ marginBottom: 10 }}>
          <FText label="Search learners" value={q} onChange={setQ} placeholder="Name or email" />
          <FSelect label="On course" value={courseF} onChange={setCourseF} placeholder="Any course" options={d.courses.filter(c => d.enrolments.some(e => e.orgId === orgId && e.courseId === c.id)).map(c => ({ value: c.id, label: c.title }))} />
        </div>
        {shown.length === 0 ? <EmptyState title="No learners match" text="Clear the search, or add a learner to a booking." /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr>{th('name', 'Learner')}<th scope="col">Role</th>{th('courses', 'Courses')}{th('progress', 'Progress')}<th scope="col">Certificates</th>{th('deadline', 'Next deadline')}<th /></tr></thead>
            <tbody>
              {shown.map(r => (
                <tr key={r.l.id}>
                  <td><b>{r.l.name}</b><div className="muted small">{r.l.email}</div></td>
                  <td className="small">{r.profile ? `${r.profile.jobRole}, ${r.profile.dept}` : '–'}</td>
                  <td className="num">{r.courses}</td>
                  <td style={{ minWidth: 150 }}><Progress value={r.progress} /></td>
                  <td>{r.certs > 0 ? `✓ ${r.certs}` : <span className="muted">–</span>}</td>
                  <td>{r.deadline ? <span style={{ color: r.deadline < now ? '#c50f1f' : undefined }}>{fmtDate(r.deadline)}</span> : <span className="muted">–</span>}</td>
                  <td><Button size="small" onClick={() => setSel(r.l.id)}>Details</Button></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </Card>
      <p className="muted small"><ReleaseBadge r="R2" /> Client single sign-on is planned for release 2 and is not built in this demo.</p>
      <AddLearnerDialog open={add} onClose={() => setAdd(false)} />
      <BulkAdd open={bulk} onClose={() => setBulk(false)} />
      <LearnerDrawer learnerId={sel} onClose={() => setSel(null)} />
    </>
  )
}
