import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, Stat } from '../shared/ui'
import { FText } from '../shared/fields'
import { money, monthLabel, today } from '../shared/format'
import { useTalent } from './talentStore'
import { estimatedValue, histPlacementsFor, monthlyTrend, roiNumbers } from './talentLogic'
import { downloadText, toCsv } from './download'
import { PALETTE } from './TalentBits'
import './talent.css'

export default function Roi() {
  const d = useStore(s => s.data)
  const decisions = useTalent(s => s.decisions)
  const A = useTalent(s => s.assumptions)
  const setA = useTalent(s => s.setAssumptions)
  const n = roiNumbers(d, decisions)
  const funnel = [{ step: 'Profiles viewed', value: n.views }, { step: 'Introductions requested', value: n.requested }, { step: 'Introductions made', value: n.approved }, { step: 'Placements', value: n.placed }]
  const trend = monthlyTrend(d, decisions).map(r => ({ ...r, month: monthLabel(r.key) }))
  const byRec = d.recruiters.map(r => ({ name: r.company, Placements: histPlacementsFor(r.id) + d.intros.filter(i => i.recruiterId === r.id && i.placed).length }))
  const value = estimatedValue(n.placed, A.salary, A.feePct)
  const multiple = A.platformCost > 0 ? Math.round((value / A.platformCost) * 10) / 10 : 0
  const conv = n.requested ? Math.round((n.placed / n.requested) * 100) : 0

  const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Number(v) || 0))
  const exportCsv = () => downloadText(`talent-roi-${today()}.csv`, toCsv([
    ['Month', 'Views', 'Requests', 'Introductions', 'Placements', 'Avg days to introduction'], ...trend.map(t => [t.month, t.views, t.requests, t.intros, t.placements, t.avgDays]),
  ]))

  return (
    <>
      <PageHeader id="roi" title="ROI report" subtitle="What the talent connection delivers" actions={<Button onClick={exportCsv}>Export trend (CSV)</Button>} />
      <div className="grid c4" style={{ marginBottom: 20 }}>
        <Stat label="Profiles viewed" value={n.views} hint="Includes earlier months" />
        <Stat label="Introductions made" value={n.approved} hint={`${n.requested} requested`} />
        <Stat label="Placements" value={n.placed} hint={`${conv}% of requests`} />
        <Stat label="Avg days to introduction" value={n.avgDays} hint="Request to learner approval" />
      </div>
      <div className="grid c2">
        <Card title="Funnel">
          <div style={{ height: 260 }} role="img" aria-label={`Funnel: ${funnel.map(f => `${f.step} ${f.value}`).join(', ')}`}>
            <ResponsiveContainer>
              <BarChart data={funnel} layout="vertical" margin={{ right: 34 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8884" horizontal={false} /><XAxis type="number" fontSize={12} allowDecimals={false} /><YAxis type="category" dataKey="step" width={140} fontSize={12} /><Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>{funnel.map((_, i) => <Cell key={i} fill={PALETTE[i]} />)}<LabelList dataKey="value" position="right" fontSize={12} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Placements by recruiter">
          <div style={{ height: 260 }} role="img" aria-label="Placements by recruiter">
            <ResponsiveContainer>
              <BarChart data={byRec}><CartesianGrid strokeDasharray="3 3" stroke="#8884" /><XAxis dataKey="name" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="Placements" fill={PALETTE[2]} radius={[6, 6, 0, 0]}><LabelList dataKey="Placements" position="top" fontSize={12} /></Bar></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title="Trend over the last seven months">
        <div style={{ height: 300 }} role="img" aria-label="Monthly trend of views, requests, introductions and placements, with average days to introduction">
          <ResponsiveContainer>
            <ComposedChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#8884" /><XAxis dataKey="month" fontSize={12} />
              <YAxis yAxisId="l" allowDecimals={false} fontSize={12} /><YAxis yAxisId="r" orientation="right" fontSize={12} unit=" d" />
              <Tooltip /><Legend />
              <Bar yAxisId="l" dataKey="views" name="Views" fill={PALETTE[5]} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="l" dataKey="requests" name="Requests" fill={PALETTE[1]} radius={[4, 4, 0, 0]} />
              <Line yAxisId="l" type="monotone" dataKey="placements" name="Placements" stroke={PALETTE[2]} strokeWidth={2} dot />
              <Line yAxisId="r" type="monotone" dataKey="avgDays" name="Avg days to introduction" stroke={PALETTE[3]} strokeWidth={2} strokeDasharray="5 3" dot />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="muted small">Earlier months are invented history for the demo; the last two months are live from the audit log and introductions.</p>
      </Card>
      <Card title="Estimated value (invented fee model)">
        <div className="form c2">
          <FText label="Average first-year salary (R)" type="number" value={A.salary} onChange={v => setA({ salary: num(v, 0, 5_000_000) })} />
          <FText label="Placement fee (% of salary)" type="number" value={A.feePct} onChange={v => setA({ feePct: num(v, 0, 50) })} />
          <FText label="Platform running cost (R per year)" type="number" value={A.platformCost} onChange={v => setA({ platformCost: num(v, 0, 10_000_000) })} />
        </div>
        <div className="grid c3" style={{ marginTop: 14 }}>
          <Stat label="Fee value of placements" value={money(value)} hint={`${n.placed} placements`} />
          <Stat label="Value per placement" value={money(estimatedValue(1, A.salary, A.feePct))} />
          <Stat label="Return on platform cost" value={`${multiple}x`} hint={`against ${money(A.platformCost)}`} />
        </div>
      </Card>
    </>
  )
}
