import { useMemo, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore, useCtx } from '../../shared/store'
import { PageHeader, Card, EmptyState, Stat } from '../../shared/ui'
import { FSelect, FText } from '../../shared/fields'
import { fmtDate, today, addDays, monthKey, monthLabel } from '../../shared/format'
import { downloadText, toCsv } from '../../talent/download'
import { useClient } from './clientStore'
import { CERTS, CertStatus, complianceMatrix } from './clientLogic'
import { AddLearnerDialog, Prefill } from './AddLearnerDialog'
import './client.css'

const LABEL: Record<CertStatus, string> = { valid: 'Valid', expiring: 'Expiring', missing: 'Missing', planned: 'Booked', na: 'Not required' }
const ICON: Record<CertStatus, string> = { valid: '✓', expiring: '!', missing: '✕', planned: '◔', na: '–' }

export default function ClientCompliance() {
  const d = useStore(s => s.data)
  const { orgId } = useCtx()
  const client = useClient()
  const now = today()
  const m = useMemo(() => complianceMatrix(d, client, orgId, now), [d, client.roster, client.legacyCerts, orgId, now])
  const [dept, setDept] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [dialog, setDialog] = useState<Prefill | null>(null)

  const depts = Array.from(new Set(m.rows.map(r => r.person.dept))).sort()
  const roles = Array.from(new Set(m.rows.map(r => r.person.jobRole))).sort()
  const rows = m.rows.filter(r => (!dept || r.person.dept === dept) && (!role || r.person.jobRole === role)
    && (!q || r.person.name.toLowerCase().includes(q.toLowerCase()))
    && (!status || Object.values(r.cells).some(c => c.status === status)))

  const book = (personIdx: number, certKey: string) => {
    const row = m.rows[personIdx]; const def = CERTS.find(c => c.key === certKey)!
    const course = d.courses.find(c => c.code === def.code)
    setDialog({ name: row.person.name, email: row.person.email, courseId: course?.id, learnerId: row.person.learnerId, title: `Book ${def.label} for ${row.person.name}` })
  }
  const exportCsv = () => downloadText(`cape-freight-compliance-${now}.csv`, toCsv([
    ['Name', 'Department', 'Role', ...CERTS.map(c => c.label)],
    ...rows.map(r => [r.person.name, r.person.dept, r.person.jobRole, ...CERTS.map(c => { const x = r.cells[c.key]; return `${LABEL[x.status]}${x.expires ? ` (${x.expires})` : ''}` })]),
  ]))

  // expiries per month for the next six months
  const buckets = Array.from({ length: 4 }, (_, i) => {
    const key = monthKey(addDays(now, i * 30))
    return { key, label: monthLabel(key), count: 0 }
  }).filter((b, i, a) => a.findIndex(x => x.key === b.key) === i)
  m.expiries.forEach(e => { const b = buckets.find(x => x.key === monthKey(e.expires)); if (b) b.count++ })

  return (
    <>
      <PageHeader id="client-compliance" title="Compliance" subtitle="Mandatory certificates for Cape Freight staff" actions={<Button onClick={exportCsv}>Export CSV</Button>} />
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Compliance score" value={`${m.score}%`} hint="Required certificates in date" />
        <Stat label="Expiring in 90 days" value={m.counts.expiring} />
        <Stat label="Missing or expired" value={m.counts.missing} hint={`${m.counts.planned} already booked`} />
        <Stat label="Staff in the matrix" value={m.rows.length} hint={`${m.rows.filter(r => !r.person.onPlatform).length} not yet on the platform`} />
      </div>
      <Card title="Certificate matrix">
        <div className="form c2" style={{ marginBottom: 10 }}>
          <FText label="Search staff" value={q} onChange={setQ} />
          <FSelect label="Department" value={dept} onChange={setDept} placeholder="All departments" options={depts.map(x => ({ value: x, label: x }))} />
          <FSelect label="Job role" value={role} onChange={setRole} placeholder="All roles" options={roles.map(x => ({ value: x, label: x }))} />
          <FSelect label="Has a status of" value={status} onChange={setStatus} placeholder="Any status" options={(['valid', 'expiring', 'missing', 'planned'] as CertStatus[]).map(s => ({ value: s, label: LABEL[s] }))} />
        </div>
        <div className="cl-legend" aria-label="Legend">
          {(Object.keys(LABEL) as CertStatus[]).map(s => <span key={s} className={`cl-${s}`}>{ICON[s]} {LABEL[s]}</span>)}
        </div>
        {rows.length === 0 ? <EmptyState title="No staff match" text="Change or clear the filters." /> : (
          <div className="tbl-wrap">
            <table className="cl-matrix">
              <thead><tr><th className="left" scope="col">Staff member</th>{CERTS.map(c => <th key={c.key} scope="col">{c.label}</th>)}</tr></thead>
              <tbody>
                {rows.map(r => {
                  const idx = m.rows.indexOf(r)
                  return (
                    <tr key={r.person.id}>
                      <td className="left"><b>{r.person.name}</b><div className="muted small">{r.person.dept} · {r.person.jobRole}{r.person.onPlatform ? '' : ' · not on platform'}</div></td>
                      {CERTS.map(c => {
                        const x = r.cells[c.key]
                        return (
                          <td key={c.key} className={`cell cl-${x.status}`}>
                            <div><span aria-hidden>{ICON[x.status]}</span> {x.expired ? 'Expired' : LABEL[x.status]}</div>
                            {x.expires && <div className="small">{fmtDate(x.expires)}</div>}
                            {(x.status === 'missing' || x.status === 'expiring') && <Button className="cl-book-btn" size="small" appearance="subtle" onClick={() => book(idx, c.key)} aria-label={`Book ${c.label} for ${r.person.name}`}>Book</Button>}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <div className="grid c2">
        <Card title="Expiry timeline (next 90 days)">
          {m.expiries.length === 0 ? <EmptyState title="Nothing expires soon" text="Certificates expiring in the next 90 days are listed here." /> : (
            <div>
              {m.expiries.map((e, i) => (
                <div className="cl-expiry" key={i}>
                  <span><b>{e.person.name}</b><br /><span className="muted small">{e.cert.label}</span></span>
                  <div className="bar" role="img" aria-label={`${e.days} days left`}><div style={{ width: `${Math.max(6, 100 - (e.days / 90) * 100)}%`, background: e.days <= 30 ? '#c50f1f' : '#f7630c' }} /></div>
                  <span className="small">{e.days} days</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title="Expiries by month">
          <div style={{ height: 220 }} role="img" aria-label="Certificates expiring per month">
            <ResponsiveContainer><BarChart data={buckets}><CartesianGrid strokeDasharray="3 3" stroke="#8884" /><XAxis dataKey="label" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="count" name="Expiring" fill="#f7630c" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
          <p className="muted small">Platform certificates and older certificates captured by the training team are combined. Cybersecurity is renewed yearly; the others every two years.</p>
        </Card>
      </div>
      <AddLearnerDialog open={!!dialog} onClose={() => setDialog(null)} prefill={dialog ?? undefined} />
    </>
  )
}
