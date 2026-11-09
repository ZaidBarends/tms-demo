import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, EmptyState, Stat } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { addDays, fmtDateTime, fmtShort, today } from '../shared/format'
import { GRID, PALETTE, toCsv } from '../tms/money/calc'
import { downloadCsv } from '../tms/money/actions'
import { trail } from './adminData'

export default function AuditTrail() {
  const d = useStore(s => s.data)
  const [source, setSource] = useState(''); const [action, setAction] = useState(''); const [q, setQ] = useState('')
  const [from, setFrom] = useState(''); const [to, setTo] = useState('')
  const [flash, setFlash] = useState('')
  const all = useMemo(() => trail(d), [d])
  const actions = Array.from(new Set(all.map(r => r.action))).sort()
  const rows = all.filter(r => {
    if (source && r.source !== source) return false
    if (action && r.action !== action) return false
    if (from && r.at.slice(0, 10) < from) return false
    if (to && r.at.slice(0, 10) > to) return false
    return !q.trim() || `${r.actor} ${r.target} ${r.detail}`.toLowerCase().includes(q.trim().toLowerCase())
  })
  const days = Array.from({ length: 10 }, (_, k) => {
    const day = addDays(today(), k - 9)
    return { day: fmtShort(day), Activity: all.filter(r => r.source === 'Activity feed' && r.at.slice(0, 10) === day).length, 'Talent audit': all.filter(r => r.source === 'Talent audit' && r.at.slice(0, 10) === day).length }
  })
  const exportCsv = () => { downloadCsv(`audit-trail-${today()}.csv`, toCsv([['When', 'Source', 'Actor', 'Action', 'Target', 'Detail'], ...rows.map(r => [r.at, r.source, r.actor, r.action, r.target, r.detail])])); setFlash(`Exported ${rows.length} entries.`) }
  const clear = () => { setSource(''); setAction(''); setQ(''); setFrom(''); setTo('') }

  return (
    <>
      <PageHeader id="audit-trail" title="Audit trail" subtitle="Everything that changed in the platform, plus every recruiter view and request" actions={<Button onClick={exportCsv}>Export CSV</Button>} />
      <div className="grid c4" style={{ marginBottom: 20 }}>
        <Stat label="Total entries" value={all.length} />
        <Stat label="Activity feed" value={all.filter(r => r.source === 'Activity feed').length} hint="Business actions" />
        <Stat label="Talent audit" value={all.filter(r => r.source === 'Talent audit').length} hint="Recruiter views and requests" />
        <Stat label="Matching filters" value={rows.length} />
      </div>
      <Card title="Entries per day (last 10 days)">
        <div style={{ height: 170 }}><ResponsiveContainer><BarChart data={days}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} /><XAxis dataKey="day" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} width={28} /><Tooltip />
          <Bar dataKey="Activity" stackId="a" fill={PALETTE.blue} /><Bar dataKey="Talent audit" stackId="a" fill={PALETTE.purple} radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div>
      </Card>
      <Card title="Entries">
        <div className="mny-filters">
          <FText label="Search" value={q} onChange={setQ} placeholder="Actor, target or detail" />
          <FSelect label="Source" value={source} onChange={setSource} placeholder="All sources" options={[{ value: 'Activity feed', label: 'Activity feed' }, { value: 'Talent audit', label: 'Talent audit' }]} />
          <FSelect label="Action / category" value={action} onChange={setAction} placeholder="Any" options={actions.map(a => ({ value: a, label: a }))} />
          <FText label="From" type="date" value={from} onChange={setFrom} />
          <FText label="To" type="date" value={to} onChange={setTo} />
          <Button appearance="subtle" onClick={clear}>Clear</Button>
        </div>
        {flash && <div className="callout" role="status" style={{ marginBottom: 12 }}>{flash}</div>}
        {rows.length === 0 ? <EmptyState title="No entries match" action={<Button onClick={clear}>Clear filters</Button>} /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>When</th><th>Source</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
            <tbody>{rows.slice(0, 100).map(r => (
              <tr key={`${r.source}-${r.id}`}><td className="small">{fmtDateTime(r.at)}</td><td><span className="mny-pill">{r.source}</span></td><td>{r.actor}</td><td>{r.action}</td><td>{r.target || '–'}</td><td>{r.detail}</td></tr>
            ))}</tbody>
          </table></div>
        )}
        {rows.length > 100 && <p className="muted small">Showing the latest 100 of {rows.length}. Export for the full list.</p>}
      </Card>
    </>
  )
}
