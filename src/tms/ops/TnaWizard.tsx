import { useMemo, useState } from 'react'
import { Button, Checkbox, Input, Select } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, Status } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { money, today } from '../../shared/format'
import { uid, useOps, type TnaProfile } from './opsStore'
import { SKILL_AREAS, recommend, type Dept, type Rec } from './logic'
import { GAP_LABEL, Heatmap } from './TnaViews'
import { downloadCsv } from './download'
import { addOpportunity } from './mutate'

const STEPS = ['Client', 'Context', 'Needs by department', 'Course mapping', 'Summary']
const DRIVERS = ['Compliance audit', 'Staff turnover', 'Budget cycle', 'New legislation', 'Growth and expansion', 'Customer complaints', 'Safety incidents']

interface Pick { on: boolean; seats: number; priority: Rec['priority'] }

export function TnaWizard({ initialOrg, onClose, onConvertQuote }: { initialOrg: string; onClose: () => void; onConvertQuote: (orgId: string, lines: { courseId: string; qty: number }[], note: string) => void }) {
  const d = useStore(s => s.data)
  const saveTna = useStore(s => s.saveTna)
  const log = useStore(s => s.log)
  const profiles = useOps(s => s.tnaProfile)
  const setProfile = useOps(s => s.setTnaProfile)
  const [step, setStep] = useState(0)
  const [orgId, setOrgId] = useState(initialOrg)
  const org = d.orgs.find(o => o.id === orgId)!
  const [ctx, setCtx] = useState({ drivers: [] as string[], goal: '', budget: '', timeframe: 'Next 6 months', headcount: String(org.staff) })
  const [depts, setDepts] = useState<Dept[]>([{ id: 'd1', name: 'Operations', headcount: Math.round(org.staff * 0.5), gaps: {} }, { id: 'd2', name: 'Management', headcount: Math.round(org.staff * 0.1) || 1, gaps: {} }])
  const [picks, setPicks] = useState<Record<string, Pick>>({})
  const [err, setErr] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  const recs = useMemo(() => recommend(d.courses, depts), [d.courses, depts])
  const pickOf = (r: Rec): Pick => picks[r.courseId] ?? { on: !r.alt, seats: r.seats, priority: r.priority }
  const chosen = recs.map(r => ({ r, p: pickOf(r) })).filter(x => x.p.on)
  const course = (id: string) => d.courses.find(c => c.id === id)!
  const invest = chosen.reduce((a, x) => a + course(x.r.courseId).price * x.p.seats, 0)
  const budget = Number(ctx.budget) || 0

  const pickOrg = (id: string) => {
    setOrgId(id)
    const o = d.orgs.find(x => x.id === id)!; const pr = profiles[id]
    setCtx(pr ? { drivers: pr.drivers, goal: pr.goal, budget: String(pr.budget), timeframe: pr.timeframe, headcount: String(pr.headcount) } : { drivers: [], goal: '', budget: '', timeframe: 'Next 6 months', headcount: String(o.staff) })
    setDepts(pr ? structuredClone(pr.depts) : [{ id: 'd1', name: 'Operations', headcount: Math.round(o.staff * 0.5), gaps: {} }, { id: 'd2', name: 'Management', headcount: Math.round(o.staff * 0.1) || 1, gaps: {} }])
    setPicks({})
  }
  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (ctx.goal.trim().length < 10) e.goal = 'Describe the business goal (10+ characters)'
      if (!(Number(ctx.budget) > 0)) e.budget = 'Enter an indicative budget above R0'
      if (!(Number(ctx.headcount) >= 1)) e.headcount = 'Enter the number of staff in scope'
    }
    if (s === 2) {
      if (depts.some(x => x.name.trim().length < 2)) e.depts = 'Every department needs a name'
      else if (depts.some(x => !(x.headcount >= 1))) e.depts = 'Every department needs a headcount of at least 1'
      else if (!depts.some(x => Object.values(x.gaps).some(g => g > 0))) e.depts = 'Rate at least one skills gap above "No gap"'
    }
    if (s === 3 && chosen.length === 0) e.maps = 'Select at least one course to map'
    setErr(e); return Object.keys(e).length === 0
  }
  const next = () => { if (validate(step)) setStep(step + 1) }
  const setGap = (i: number, area: string, v: number) => setDepts(depts.map((x, k) => (k === i ? { ...x, gaps: { ...x.gaps, [area]: v } } : x)))

  const save = () => {
    const needs = chosen.map(({ r, p }) => ({ need: `${r.area}: ${r.reason}`, courseId: r.courseId, priority: p.priority }))
    const existing = d.tnas.find(t => t.orgId === orgId)
    const kept = (existing?.needs ?? []).filter(n => !needs.some(x => x.courseId === n.courseId))
    saveTna({ id: existing?.id ?? `t-${orgId}-${uid('')}`, orgId, date: today(), needs: [...needs, ...kept] })
    const profile: TnaProfile = { drivers: ctx.drivers, goal: ctx.goal.trim(), budget, timeframe: ctx.timeframe, headcount: Number(ctx.headcount), depts }
    setProfile(orgId, profile)
    log(`Training needs analysis saved for ${org.name}`); setSaved(true)
  }
  const exportCsv = () => downloadCsv(`tna-${org.name.toLowerCase().replace(/\s+/g, '-')}.csv`, [
    ['Training needs analysis', org.name, today()], ['Goal', ctx.goal], ['Budget', budget], [],
    ['Department', 'Headcount', ...SKILL_AREAS], ...depts.map(x => [x.name, x.headcount, ...SKILL_AREAS.map(a => x.gaps[a] ?? 0)]), [],
    ['Course', 'Code', 'Area', 'Seats', 'Priority', 'Unit price', 'Investment (ex VAT)'],
    ...chosen.map(({ r, p }) => [course(r.courseId).title, course(r.courseId).code, r.area, p.seats, p.priority, course(r.courseId).price, course(r.courseId).price * p.seats]),
    ['Total', '', '', '', '', '', invest],
  ])
  const toOpp = () => {
    addOpportunity({ orgId, title: `${org.name} – training programme (from needs analysis)`, value: invest, stage: 'needs', contact: d.contacts.find(c => c.orgId === orgId)?.name ?? '', notes: `Built from a guided needs analysis: ${chosen.length} courses, ${chosen.reduce((a, x) => a + x.p.seats, 0)} seats.`, expectedClose: today() }, 's1', 'Needs analysis')
    setSaved(true); setErr({ ok: 'Opportunity created in the Needs analysis column.' })
  }

  return (
    <Card title="Guided needs analysis" actions={<Button appearance="subtle" onClick={onClose}>Close wizard</Button>}>
      <ol className="ops-steps" style={{ listStyle: 'none', padding: 0 }} aria-label="Wizard steps">
        {STEPS.map((s, i) => <li key={s} className={`ops-step ${i === step ? 'on' : i < step ? 'done' : ''}`} aria-current={i === step ? 'step' : undefined}><b>{i < step ? '✓' : i + 1}</b>{s}</li>)}
      </ol>

      {step === 0 && (
        <div className="form" style={{ maxWidth: 520 }}>
          <FSelect label="Which client is this analysis for?" value={orgId} onChange={pickOrg} options={d.orgs.map(o => ({ value: o.id, label: o.name }))} />
          <div className="callout">{org.name} · {org.sector} · {org.staff} staff · {org.city}.{profiles[orgId] ? ' An earlier analysis exists and will be loaded for you to update.' : ' No analysis on file yet.'}</div>
        </div>
      )}
      {step === 1 && (
        <div className="form" style={{ maxWidth: 640 }}>
          <div><div className="muted small" style={{ marginBottom: 4 }}>What is driving the training need?</div>
            <div className="row">{DRIVERS.map(x => <Checkbox key={x} label={x} checked={ctx.drivers.includes(x)} onChange={(_, c) => setCtx({ ...ctx, drivers: c.checked ? [...ctx.drivers, x] : ctx.drivers.filter(y => y !== x) })} />)}</div></div>
          <FArea label="Business goal" value={ctx.goal} onChange={v => setCtx({ ...ctx, goal: v })} rows={3} error={err.goal} />
          <div className="form c2">
            <FText label="Indicative budget excluding VAT (R)" type="number" value={ctx.budget} onChange={v => setCtx({ ...ctx, budget: v })} error={err.budget} min={0} />
            <FText label="Staff in scope" type="number" value={ctx.headcount} onChange={v => setCtx({ ...ctx, headcount: v })} error={err.headcount} min={1} />
            <FSelect label="Timeframe" value={ctx.timeframe} onChange={v => setCtx({ ...ctx, timeframe: v })} options={['Next 3 months', 'Next 6 months', 'Next 12 months'].map(x => ({ value: x, label: x }))} />
          </div>
        </div>
      )}
      {step === 2 && (
        <>
          <p className="muted small">Rate the skills gap for each department: 0 no gap, 1 minor, 2 moderate, 3 significant, 4 critical.</p>
          {err.depts && <div className="err" role="alert">{err.depts}</div>}
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Department</th><th>Staff</th>{SKILL_AREAS.map(a => <th key={a}>{a}</th>)}<th /></tr></thead>
            <tbody>{depts.map((x, i) => (
              <tr key={x.id}>
                <td style={{ minWidth: 150 }}><Input aria-label={`Department ${i + 1} name`} value={x.name} onChange={(_, v) => setDepts(depts.map((y, k) => (k === i ? { ...y, name: v.value } : y)))} /></td>
                <td style={{ width: 80 }}><Input type="number" aria-label={`Headcount for ${x.name || 'department'}`} value={String(x.headcount)} onChange={(_, v) => setDepts(depts.map((y, k) => (k === i ? { ...y, headcount: Number(v.value) } : y)))} /></td>
                {SKILL_AREAS.map(a => (
                  <td key={a}><Select size="small" aria-label={`${x.name || 'Department'}: ${a} gap`} value={String(x.gaps[a] ?? 0)} onChange={(_, v) => setGap(i, a, Number(v.value))}>{GAP_LABEL.map((l, g) => <option key={g} value={g}>{g} {l}</option>)}</Select></td>
                ))}
                <td><Button size="small" appearance="subtle" disabled={depts.length === 1} onClick={() => setDepts(depts.filter((_, k) => k !== i))} aria-label={`Remove ${x.name || 'department'}`}>Remove</Button></td>
              </tr>
            ))}</tbody>
          </table></div>
          <div style={{ marginTop: 10 }}><Button size="small" onClick={() => setDepts([...depts, { id: uid('d'), name: '', headcount: 10, gaps: {} }])}>Add department</Button></div>
        </>
      )}
      {step === 3 && (
        <>
          <p className="muted small">Courses are recommended from the largest gaps. Tick the ones to include and adjust seats.</p>
          {err.maps && <div className="err" role="alert">{err.maps}</div>}
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th /><th>Course</th><th>Why</th><th>Seats</th><th>Priority</th><th className="num">Investment</th></tr></thead>
            <tbody>{recs.map(r => {
              const p = pickOf(r); const c = course(r.courseId)
              return (
                <tr key={r.courseId}>
                  <td><Checkbox checked={p.on} aria-label={`Include ${c.title}`} onChange={(_, x) => setPicks({ ...picks, [r.courseId]: { ...p, on: !!x.checked } })} /></td>
                  <td><b>{c.title}</b><div className="muted small">{c.code} · {r.area}{r.alt ? ' · alternative' : ''}</div></td>
                  <td className="small">{r.reason}</td>
                  <td style={{ width: 90 }}><Input type="number" aria-label={`Seats for ${c.title}`} value={String(p.seats)} onChange={(_, v) => setPicks({ ...picks, [r.courseId]: { ...p, seats: Math.max(1, Number(v.value)) } })} /></td>
                  <td style={{ width: 120 }}><Select size="small" aria-label={`Priority for ${c.title}`} value={p.priority} onChange={(_, v) => setPicks({ ...picks, [r.courseId]: { ...p, priority: v.value as Rec['priority'] } })}>{['High', 'Medium', 'Low'].map(x => <option key={x}>{x}</option>)}</Select></td>
                  <td className="num">{p.on ? money(c.price * p.seats) : '–'}</td>
                </tr>
              )
            })}</tbody>
            <tfoot><tr><td colSpan={5}><b>Estimated investment (excl. VAT)</b></td><td className="num"><b>{money(invest)}</b></td></tr></tfoot>
          </table></div>
        </>
      )}
      {step === 4 && (
        <div className="form">
          <div className="grid c3">
            <div className="callout"><b>Goal</b><br />{ctx.goal}<br /><span className="muted small">{ctx.drivers.join(', ') || 'No drivers selected'} · {ctx.timeframe}</span></div>
            <div className="callout"><b>Investment</b><br />{money(invest)} excl. VAT<br /><span className="muted small">{budget ? (invest > budget ? `Exceeds the ${money(budget)} budget by ${money(invest - budget)}` : `Within the ${money(budget)} budget`) : ''}</span></div>
            <div className="callout"><b>Seats</b><br />{chosen.reduce((a, x) => a + x.p.seats, 0)} across {chosen.length} courses<br /><span className="muted small">{depts.length} departments, {depts.reduce((a, x) => a + x.headcount, 0)} staff</span></div>
          </div>
          {invest > budget && budget > 0 && <div className="ops-warnbox" role="alert">The recommended programme is over budget. Reduce seats or phase it before quoting.</div>}
          <Heatmap depts={depts} />
          <table className="tbl"><thead><tr><th>Course</th><th>Priority</th><th className="num">Seats</th><th className="num">Investment</th></tr></thead>
            <tbody>{chosen.map(({ r, p }) => <tr key={r.courseId}><td>{course(r.courseId).title}</td><td><Status s={p.priority === 'High' ? 'Overdue' : p.priority === 'Medium' ? 'Pending' : 'Draft'} /> <span className="small">{p.priority}</span></td><td className="num">{p.seats}</td><td className="num">{money(course(r.courseId).price * p.seats)}</td></tr>)}</tbody></table>
          <div className="row">
            <Button appearance="primary" onClick={save}>Save analysis</Button>
            <Button onClick={exportCsv}>Export summary (CSV)</Button>
            <Button onClick={toOpp}>Convert to opportunity</Button>
            <Button onClick={() => { save(); onConvertQuote(orgId, chosen.map(x => ({ courseId: x.r.courseId, qty: x.p.seats })), `Created from needs analysis for ${org.name}.`) }}>Convert to quote</Button>
          </div>
          {saved && <div className="ops-okbox" role="status">Analysis saved for {org.name}. {err.ok}</div>}
        </div>
      )}

      <div className="row" style={{ marginTop: 18, justifyContent: 'space-between' }}>
        <Button disabled={step === 0} onClick={() => { setErr({}); setStep(step - 1) }}>Back</Button>
        {step < STEPS.length - 1 && <Button appearance="primary" onClick={next}>Next: {STEPS[step + 1]}</Button>}
      </div>
    </Card>
  )
}
