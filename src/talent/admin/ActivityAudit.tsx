import { useMemo, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../../shared/store'
import { Card, EmptyState } from '../../shared/ui'
import { FSelect, FText } from '../../shared/fields'
import { fmtDateTime, today } from '../../shared/format'
import { recruiterActivity } from '../talentLogic'
import { downloadText, toCsv } from '../download'
import { PALETTE } from '../TalentBits'

export function RecruiterActivity() {
  const d = useStore(s => s.data)
  const rows = recruiterActivity(d)
  return (
    <>
      <Card title="Recruiter activity">
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Recruiter</th><th className="num">Profile views</th><th className="num">Requests</th><th className="num">Approved</th><th className="num">Declined</th><th className="num">Placed</th><th>Last active</th></tr></thead><tbody>
          {rows.map(r => (
            <tr key={r.id}><td><b>{r.name}</b><div className="muted small">{r.company}{r.approved ? '' : ' · not approved'}</div></td>
              <td className="num">{r.views}</td><td className="num">{r.requests}</td><td className="num">{r.approvedIntros}</td><td className="num">{r.declined}</td><td className="num">{r.placed}</td>
              <td>{r.last ? fmtDateTime(r.last) : '–'}</td></tr>
          ))}
        </tbody></table></div>
      </Card>
      <Card title="Views and requests by recruiter">
        <div style={{ height: 240 }} role="img" aria-label="Chart of profile views and requests per recruiter">
          <ResponsiveContainer>
            <BarChart data={rows.map(r => ({ name: r.company, Views: r.views, Requests: r.requests, Approved: r.approvedIntros }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8884" /><XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend />
              <Bar dataKey="Views" fill={PALETTE[0]} radius={[4, 4, 0, 0]} /><Bar dataKey="Requests" fill={PALETTE[1]} radius={[4, 4, 0, 0]} /><Bar dataKey="Approved" fill={PALETTE[2]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </>
  )
}

export function AuditLog() {
  const d = useStore(s => s.data)
  const [action, setAction] = useState('')
  const [actor, setActor] = useState('')
  const [q, setQ] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const actors = useMemo(() => Array.from(new Set(d.audit.map(a => a.actor))).sort(), [d.audit])
  const rows = d.audit.filter(a =>
    (!action || a.action === action) && (!actor || a.actor === actor)
    && (!q || `${a.target} ${a.detail}`.toLowerCase().includes(q.toLowerCase()))
    && (!from || a.at.slice(0, 10) >= from) && (!to || a.at.slice(0, 10) <= to))
  const exportCsv = () => downloadText(`talent-audit-${today()}.csv`, toCsv([['When', 'Who', 'Action', 'Target', 'Detail'], ...rows.map(a => [a.at, a.actor, a.action, a.target, a.detail])]))
  return (
    <Card title={`Audit log (${rows.length} of ${d.audit.length})`} actions={<Button size="small" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>}>
      <div className="form c2" style={{ marginBottom: 12 }}>
        <FSelect label="Action" value={action} onChange={setAction} placeholder="All actions" options={['View', 'Request', 'Approve', 'Decline', 'Opt-in', 'Opt-out'].map(a => ({ value: a, label: a }))} />
        <FSelect label="Who" value={actor} onChange={setActor} placeholder="Everyone" options={actors.map(a => ({ value: a, label: a }))} />
        <FText label="Search target or detail" value={q} onChange={setQ} />
        <FText label="From" type="date" value={from} onChange={setFrom} />
        <FText label="To" type="date" value={to} onChange={setTo} />
      </div>
      {rows.length === 0 ? <EmptyState title="No entries match" text="Change or clear the filters." /> : (
        <div className="tbl-wrap" style={{ maxHeight: 440, overflowY: 'auto' }}><table className="tbl"><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Target</th></tr></thead><tbody>
          {rows.map(a => <tr key={a.id}><td>{fmtDateTime(a.at)}</td><td>{a.actor}</td><td>{a.action}</td><td>{a.target}<div className="muted small">{a.detail}</div></td></tr>)}
        </tbody></table></div>
      )}
    </Card>
  )
}
