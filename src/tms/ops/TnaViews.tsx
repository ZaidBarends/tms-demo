import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Dept } from './logic'
import { SKILL_AREAS, gapTotals } from './logic'

export const GAP_LABEL = ['No gap', 'Minor', 'Moderate', 'Significant', 'Critical']

export function Heatmap({ depts }: { depts: Dept[] }) {
  return (
    <>
      <div className="ops-heat" role="table" aria-label="Skills gap heatmap by department" style={{ gridTemplateColumns: `minmax(130px, 1.2fr) repeat(${SKILL_AREAS.length}, minmax(64px, 1fr))` }}>
        <div className="hh" role="columnheader">Department</div>
        {SKILL_AREAS.map(a => <div key={a} className="hh" role="columnheader">{a}</div>)}
        {depts.map(dp => (
          <div key={dp.id} style={{ display: 'contents' }} role="row">
            <div className="rh" role="rowheader">{dp.name}<span className="muted small">&nbsp;({dp.headcount})</span></div>
            {SKILL_AREAS.map(a => {
              const g = dp.gaps[a] ?? 0
              return <div key={a} role="cell" className={`ops-h${g}`} title={`${dp.name}, ${a}: ${GAP_LABEL[g]}`} aria-label={`${dp.name}, ${a}: ${GAP_LABEL[g]}`}>{g === 0 ? '–' : g}</div>
            })}
          </div>
        ))}
      </div>
      <div className="ops-legend" aria-label="Heatmap legend">
        {GAP_LABEL.map((l, i) => <span key={l}><span className={`ops-dot ops-h${i}`} />{i} {l}</span>)}
      </div>
    </>
  )
}

export function GapChart({ depts }: { depts: Dept[] }) {
  const data = gapTotals(depts).map(x => ({ area: x.area.replace(' Skills', '').replace('Project Management', 'Projects').replace('Health & Safety', 'H&S'), avg: Math.round(x.avg * 10) / 10 }))
  return (
    <div className="ops-chart" role="img" aria-label="Average skills gap by area, weighted by headcount">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: -10, right: 8 }}>
          <CartesianGrid stroke="#8884" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="area" tick={{ fontSize: 11 }} interval={0} />
          <YAxis domain={[0, 4]} tickCount={5} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => [`${v} of 4`, 'Average gap']} />
          <Bar dataKey="avg" radius={[4, 4, 0, 0]}>{data.map(x => <Cell key={x.area} fill={x.avg >= 3 ? '#d13438' : x.avg >= 2 ? '#f7630c' : '#597f2d'} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
