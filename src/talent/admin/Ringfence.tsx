import { useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useStore, orgName } from '../../shared/store'
import { Card, EmptyState, Stat } from '../../shared/ui'
import { FText } from '../../shared/fields'
import { ringfenceStats } from '../ringfence'
import { PALETTE } from '../TalentBits'

export function Ringfence() {
  const d = useStore(s => s.data)
  const s = ringfenceStats(d)
  const [q, setQ] = useState('')
  const rows = s.employerPaidOnLearners
    .map(l => ({ l, es: d.enrolments.filter(e => e.learnerId === l.id) }))
    .filter(r => `${r.l.name} ${orgName(d, r.l.orgId)}`.toLowerCase().includes(q.toLowerCase()))
  const byType = [
    { name: 'Employer-paid (B2B)', value: s.employerPaidOnLearners.filter(l => l.type === 'b2b').length },
    { name: 'Internal staff', value: s.employerPaidOnLearners.filter(l => l.type === 'internal').length },
    { name: 'B2C with no self-paid course', value: s.employerPaidOnLearners.filter(l => l.type === 'b2c').length },
    { name: 'Visible to recruiters', value: s.visible },
  ].filter(x => x.value > 0)
  return (
    <>
      <Card title="Ringfencing check (live)">
        <div className="grid c4">
          <Stat label="Learners excluded: employer-paid only" value={s.excludedLearners} hint="Never eligible for recruiter search" />
          <Stat label="Employer-paid enrolments filtered" value={s.excludedEnrolments} hint="Includes internal and B2B enrolments" />
          <Stat label="Mixed-history learners" value={s.mixedHistoryLearners} hint="Only self-paid courses shown" />
          <Stat label="Profiles visible to recruiters" value={s.visible} hint={`${s.optedIn} opted in`} />
        </div>
        <div className="callout" style={{ marginTop: 14 }}>
          <b>The rule.</b> Only enrolments paid for by the learner can ever feed a recruiter-visible profile. Employer-paid and internal enrolments are removed in code, whatever the learner's opt-in switch says.
          A learner with no self-paid enrolment is never shown, and on a mixed-history profile only the self-paid courses are listed. An automated test covers all three cases.
        </div>
      </Card>
      <div className="grid c2">
        <Card title="Who is where">
          <div style={{ height: 240 }} role="img" aria-label="Breakdown of excluded and visible learners">
            <ResponsiveContainer><PieChart><Pie data={byType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{byType.map((_, i) => <Cell key={i} fill={PALETTE[i % 5]} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
          </div>
        </Card>
        <Card title={`Excluded learners (${rows.length})`}>
          <FText label="Search by name or organisation" value={q} onChange={setQ} />
          {rows.length === 0 ? <EmptyState title="No learners match" /> : (
            <div className="tbl-wrap" style={{ maxHeight: 300, overflowY: 'auto', marginTop: 8 }}><table className="tbl"><thead><tr><th>Learner</th><th>Type</th><th>Why excluded</th></tr></thead><tbody>
              {rows.map(({ l, es }) => (
                <tr key={l.id}><td><b>{l.name}</b><div className="muted small">{orgName(d, l.orgId) !== '—' ? orgName(d, l.orgId) : 'Internal'}</div></td>
                  <td>{l.type === 'b2b' ? 'Employer-paid' : l.type === 'internal' ? 'Internal' : 'B2C'}</td>
                  <td className="small">{es.length} enrolment(s), none self-paid</td></tr>
              ))}
            </tbody></table></div>
          )}
          <p className="muted small">Names are shown to the administrator only. Recruiters never see these learners.</p>
        </Card>
      </div>
    </>
  )
}
