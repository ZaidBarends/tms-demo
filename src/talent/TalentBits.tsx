import { useMemo } from 'react'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { useStore } from '../shared/store'
import { useTalent } from './talentStore'
import { buildCandidates, Candidate, CATEGORIES, MatchResult } from './talentLogic'
import './talent.css'

export const PALETTE = ['#0f6cbd', '#2b9bd8', '#13a10e', '#f7630c', '#8764b8', '#c4c9cf']

export function useCandidates(): Candidate[] {
  const d = useStore(s => s.data)
  const vis = useTalent(s => s.visibility)
  return useMemo(() => buildCandidates(d, vis), [d, vis])
}

export function MatchBar({ score }: { score: number }) {
  const color = score >= 75 ? '#13a10e' : score >= 40 ? '#0f6cbd' : '#f7630c'
  return (
    <div className="tal-score" role="img" aria-label={`Match score ${score} out of 100`}>
      <div className="tal-score-bar"><div style={{ width: `${score}%`, background: color }} /></div>
      <span className="tal-score-num">{score}%</span>
    </div>
  )
}

export function MatchChips({ m }: { m: MatchResult }) {
  return (
    <div className="chips" aria-label="Skill match">
      {m.matched.map(s => <span key={s} className="tal-chip-ok" title="Required skill matched">✓ {s}</span>)}
      {m.missing.map(s => <span key={s} className="tal-chip-miss" title="Required skill missing">{s}</span>)}
      {m.niceMatched.map(s => <span key={s} className="tal-chip-nice" title="Nice-to-have matched">+ {s}</span>)}
    </div>
  )
}

export function RadarCompare({ people, height = 280 }: { people: { name: string; radar: Record<string, number> }[]; height?: number }) {
  const data = CATEGORIES.map(cat => {
    const row: Record<string, string | number> = { cat: cat.replace(' Skills', '').replace('Project Management', 'Projects').replace('Health & Safety', 'H&S') }
    people.forEach(p => { row[p.name] = p.radar[cat] ?? 0 })
    return row
  })
  return (
    <div style={{ height }} role="img" aria-label={`Skills radar for ${people.map(p => p.name).join(', ')}`}>
      <ResponsiveContainer>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#8884" />
          <PolarAngleAxis dataKey="cat" fontSize={11} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          {people.map((p, i) => <Radar key={p.name} name={p.name} dataKey={p.name} stroke={PALETTE[i]} fill={PALETTE[i]} fillOpacity={0.25} />)}
          {people.length > 1 && <Legend />}
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Completeness({ value }: { value: number }) {
  return (
    <div role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`Profile completeness ${value}%`} className="tal-meter">
      <div style={{ width: `${value}%` }} />
    </div>
  )
}
