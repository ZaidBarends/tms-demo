import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Switch } from '@fluentui/react-components'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState } from '../shared/ui'
import { FSelect } from '../shared/fields'
import { money } from '../shared/format'
import { useLms } from './lmsStore'
import { LEVELS, TARGET_ROLES, areaScore, gapAnalysis, skillLevels, skillUniverse, type SkillInfo } from './skillsLogic'
import { Ring } from './widgets'
import './lms.css'

export { skillLevels } from './skillsLogic'

export default function Skills() {
  const d = useStore(s => s.data)
  const { learnerId, persona } = useCtx()
  const targetRole = useLms(s => s.targetRole[learnerId] ?? '')
  const self = useLms(s => s.selfAssess[learnerId]) ?? {}
  const { setTargetRole, setSelfAssess } = useLms.getState()
  const [onlyMine, setOnlyMine] = useState(true)
  const canBuy = persona === 'b2c' || persona === 'all'

  const verified = skillLevels(d, learnerId)
  const lvl = (s: string) => verified[s]?.level ?? 0
  const selfLvl = (s: string) => (self[s] !== undefined ? (self[s] / 5) * 3 : 0)
  const universe = useMemo(() => skillUniverse(d), [d])
  const categories = Array.from(new Set(universe.map(s => s.category)))
  const req = TARGET_ROLES[targetRole]
  const reqLvl = (s: string) => req?.[s] ?? 0

  const radar = categories.map(c => ({
    area: c.replace(' Skills', ''), Verified: areaScore(universe, c, lvl), 'Self-assessed': areaScore(universe, c, selfLvl),
    ...(req ? { 'Target role': areaScore(universe, c, reqLvl) } : {}),
  }))
  const gap = targetRole ? gapAnalysis(targetRole, lvl) : null

  /** What the learner should do next to raise a skill. */
  const advice = (s: SkillInfo) => {
    const lv = lvl(s.name)
    if (lv >= 3) return { text: 'Advanced. Refresh yearly or coach a colleague to keep it sharp.' }
    const inProg = d.enrolments.find(e => e.learnerId === learnerId && e.status !== 'Completed' && d.courses.find(c => c.id === e.courseId)?.skills.includes(s.name))
    if (inProg) {
      const c = d.courses.find(x => x.id === inProg.courseId)!
      return { text: `Finish ${c.title} (${inProg.progress}% done) to reach ${LEVELS[Math.min(3, lv + 1)]}.`, to: `/learn/${inProg.id}`, cta: 'Continue' }
    }
    const next = d.courses.filter(c => c.status === 'Active' && c.skills.includes(s.name) && !d.enrolments.some(e => e.learnerId === learnerId && e.courseId === c.id))[0]
    return next ? { text: `Take ${next.title} (${next.hours} hrs${canBuy ? `, ${money(next.price * 1.15)}` : ''}) to reach ${LEVELS[Math.min(3, lv + 1)]}.`, to: `/catalogue/${next.id}`, cta: 'View course' }
      : { text: 'Practise on the job and ask for feedback.' }
  }
  const nextPct = (s: string) => d.enrolments.find(e => e.learnerId === learnerId && e.status === 'In progress' && d.courses.find(c => c.id === e.courseId)?.skills.includes(s))?.progress ?? 0

  const group = (title: string, soft: boolean) => {
    const list = universe.filter(s => s.soft === soft && (!onlyMine || lvl(s.name) > 0 || self[s.name] !== undefined))
    return (
      <section aria-label={title}>
        <h2 className="card-title" style={{ margin: '8px 0 10px' }}>{title}</h2>
        {list.length === 0 ? <EmptyState title="No skills here yet" text="Skills grow as you complete courses. Switch on “Show all skills” to explore." /> : (
          <div className="grid c3">
            {list.map(s => {
              const lv = lvl(s.name); const a = advice(s); const mine = self[s.name]
              return (
                <div className="card lms-skill" key={s.name} style={{ marginBottom: 0 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><b>{s.name}</b><span className="chip">{s.category}</span></div>
                  <div className="row">
                    <span className="skill-bar" role="img" aria-label={`${LEVELS[lv]}, level ${lv} of 3`}>{[1, 2, 3].map(i => <span key={i} className={i <= lv ? 'on' : ''} />)}</span>
                    <span className="small muted">{LEVELS[lv]}</span>
                  </div>
                  {lv < 3 && nextPct(s.name) > 0 && <div className="small muted">Progress to {LEVELS[lv + 1]}: {nextPct(s.name)}%</div>}
                  <div className="lms-levelup"><b className="small">How to level up</b><div className="small">{a.text}</div>{a.to && <Link to={a.to}><Button size="small" style={{ marginTop: 6 }}>{a.cta}</Button></Link>}</div>
                  <label className="small" htmlFor={`sa-${s.name}`}>Self-assessment: <b>{mine ?? 0} / 5</b>{mine !== undefined && Math.abs((mine / 5) * 3 - lv) >= 1.5 && <span className="muted"> {(mine / 5) * 3 > lv ? '(higher than verified)' : '(lower than verified)'}</span>}</label>
                  <input id={`sa-${s.name}`} type="range" min={0} max={5} step={1} value={mine ?? 0} onChange={e => setSelfAssess(learnerId, s.name, Number(e.target.value))} className="lms-slider" />
                </div>
              )
            })}
          </div>
        )}
      </section>
    )
  }

  return (
    <>
      <PageHeader id="skills" title="Skills profile" subtitle="Built from the courses you have started and completed, plus your own assessment"
        actions={<Switch label="Show all skills" checked={!onlyMine} onChange={(_, x) => setOnlyMine(!x.checked)} />} />
      <div className="grid c2">
        <Card title="Skill areas">
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#8886" /><PolarAngleAxis dataKey="area" fontSize={12} /><PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Verified" dataKey="Verified" stroke="#0f6cbd" fill="#0f6cbd" fillOpacity={0.35} />
                <Radar name="Self-assessed" dataKey="Self-assessed" stroke="#13a10e" fill="#13a10e" fillOpacity={0.15} />
                {req && <Radar name="Target role" dataKey="Target role" stroke="#f7630c" fill="#f7630c" fillOpacity={0.1} strokeDasharray="5 4" />}
                <Tooltip formatter={(v: number) => `${v}%`} /><Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Gap to a target role">
          <FSelect label="I want to become a…" value={targetRole} onChange={v => setTargetRole(learnerId, v)} placeholder="Choose a target role" options={Object.keys(TARGET_ROLES).map(r => ({ value: r, label: r }))} />
          {!gap ? <p className="muted">Pick a role to see which skills you still need and the courses that close each gap.</p> : (
            <>
              <div className="row" style={{ margin: '12px 0' }}>
                <Ring value={gap.coverage} size={86} stroke={10} color={gap.coverage >= 75 ? '#13a10e' : '#0f6cbd'} label={`${gap.coverage}%`} sub="ready" />
                <div className="small muted">{gap.rows.filter(r => r.gap > 0).length === 0 ? 'You meet every requirement for this role.' : `${gap.rows.filter(r => r.gap > 0).length} skill${gap.rows.filter(r => r.gap > 0).length === 1 ? '' : 's'} to build.`}</div>
              </div>
              <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Skill</th><th>You</th><th>Need</th><th>Close the gap</th></tr></thead><tbody>
                {gap.rows.map(r => {
                  const c = d.courses.find(x => x.status === 'Active' && x.skills.includes(r.skill))
                  return <tr key={r.skill}><td>{r.skill}</td><td>{LEVELS[r.have]}</td><td>{LEVELS[r.need]}</td>
                    <td>{r.gap === 0 ? <span className="lms-pill">Met</span> : c ? <Link to={`/catalogue/${c.id}`}>{c.title}</Link> : '–'}</td></tr>
                })}
              </tbody></table></div>
            </>
          )}
        </Card>
      </div>
      {group('Technical skills', false)}
      <div style={{ height: 8 }} />
      {group('Soft skills', true)}
      <p className="muted">Want to grow a skill? <Link to="/catalogue">Browse the catalogue</Link> or follow a <Link to="/journeys">learning journey</Link>.</p>
    </>
  )
}
