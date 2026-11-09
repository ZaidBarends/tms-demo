import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { useStore, orgName } from '../shared/store'
import { PageHeader, Card, EmptyState, Stat, Status } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { fmtDate, money, today } from '../shared/format'
import type { TnaNeed } from '../shared/types'
import { useOps } from './ops/opsStore'
import { Heatmap, GapChart } from './ops/TnaViews'
import { TnaWizard } from './ops/TnaWizard'
import { recommend, gapTotals } from './ops/logic'
import { downloadCsv } from './ops/download'
import { addOpportunity } from './ops/mutate'
import './ops/ops.css'

export default function Tna() {
  const d = useStore(s => s.data)
  const save = useStore(s => s.saveTna)
  const nav = useNavigate()
  const profiles = useOps(s => s.tnaProfile)
  const [orgId, setOrgId] = useState('o1')
  const [wizard, setWizard] = useState(false)
  const [need, setNeed] = useState('')
  const [courseId, setCourseId] = useState('')
  const [priority, setPriority] = useState<TnaNeed['priority']>('Medium')
  const [err, setErr] = useState<{ need?: string; course?: string }>({})
  const [info, setInfo] = useState('')
  const tna = d.tnas.find(t => t.orgId === orgId)
  const profile = profiles[orgId]
  const course = (id: string) => d.courses.find(c => c.id === id)

  const seatsFor = (id: string) => {
    if (!profile) return 10
    const c = course(id); return recommend(d.courses, profile.depts).find(r => r.courseId === id)?.seats ?? (c ? 10 : 10)
  }
  const invest = (tna?.needs ?? []).reduce((a, n) => a + (course(n.courseId)?.price ?? 0) * seatsFor(n.courseId), 0)

  const add = () => {
    const e: typeof err = {}
    if (need.trim().length < 5) e.need = 'Describe the need (at least 5 characters)'
    if (!courseId) e.course = 'Map the need to a course'
    setErr(e)
    if (Object.keys(e).length) return
    const next = tna ? { ...tna, needs: [...tna.needs, { need: need.trim(), courseId, priority }] } : { id: `t-${orgId}`, orgId, date: today(), needs: [{ need: need.trim(), courseId, priority }] }
    save(next); setNeed(''); setCourseId('')
  }
  const remove = (i: number) => tna && save({ ...tna, needs: tna.needs.filter((_, x) => x !== i) })
  const toQuote = () => nav('/quotes/new', { state: { fromTna: { orgId, lines: (tna?.needs ?? []).map(n => ({ courseId: n.courseId, qty: seatsFor(n.courseId) })), note: `Created from the needs analysis dated ${tna ? fmtDate(tna.date) : ''} for ${orgName(d, orgId)}.` } } })
  const toOpp = () => {
    addOpportunity({ orgId, title: `${orgName(d, orgId)} – training programme (from needs analysis)`, value: invest, stage: 'needs', contact: d.contacts.find(c => c.orgId === orgId)?.name ?? '', notes: `${tna?.needs.length ?? 0} mapped needs from the analysis dated ${fmtDate(tna?.date)}.`, expectedClose: today() }, 's1', 'Needs analysis')
    setInfo('Opportunity created in the Needs analysis column.')
  }
  const exportSummary = () => downloadCsv(`needs-${orgName(d, orgId).toLowerCase().replace(/\s+/g, '-')}.csv`, [
    ['Client', orgName(d, orgId)], ['Analysis date', tna?.date ?? ''], [],
    ['Need', 'Course', 'Priority', 'Seats', 'Investment (ex VAT)'],
    ...(tna?.needs ?? []).map(n => [n.need, course(n.courseId)?.title ?? '', n.priority, seatsFor(n.courseId), (course(n.courseId)?.price ?? 0) * seatsFor(n.courseId)]),
    ['Total', '', '', '', invest],
  ])
  const hasNeeds = !!tna && tna.needs.length > 0
  const topGap = profile ? [...gapTotals(profile.depts)].sort((a, b) => b.avg - a.avg)[0] : undefined

  return (
    <>
      <PageHeader id="tna" title="Training needs analysis" subtitle="Run a guided analysis, see where the skills gaps are and turn it into a quote"
        actions={<><Button onClick={exportSummary} disabled={!hasNeeds}>Export summary</Button><Button appearance="primary" onClick={() => setWizard(true)}>Start guided analysis</Button></>} />
      {wizard ? (
        <TnaWizard key={orgId} initialOrg={orgId} onClose={() => setWizard(false)}
          onConvertQuote={(o, lines, note) => nav('/quotes/new', { state: { fromTna: { orgId: o, lines, note } } })} />
      ) : (
        <>
          <div className="row" style={{ marginBottom: 14, maxWidth: 360 }}>
            <FSelect label="Client" value={orgId} onChange={v => { setOrgId(v); setInfo('') }} options={d.orgs.map(o => ({ value: o.id, label: o.name }))} />
          </div>
          <div className="grid c4" style={{ marginBottom: 16 }}>
            <Stat label="Mapped needs" value={tna?.needs.length ?? 0} hint={tna ? `Analysis dated ${fmtDate(tna.date)}` : 'No analysis yet'} />
            <Stat label="Estimated investment" value={money(invest)} hint="Excluding VAT" />
            <Stat label="Biggest gap" value={topGap ? topGap.area : '–'} hint={topGap ? `Average ${topGap.avg.toFixed(1)} of 4` : 'Run the guided analysis'} />
            <Stat label="Indicative budget" value={profile ? money(profile.budget) : '–'} hint={profile ? profile.timeframe : ''} />
          </div>
          {profile ? (
            <div className="grid c2">
              <Card title="Skills gap heatmap"><Heatmap depts={profile.depts} /><p className="muted small">Goal: {profile.goal}</p></Card>
              <Card title="Average gap by skill area"><GapChart depts={profile.depts} /></Card>
            </div>
          ) : (
            <Card title="Skills gap heatmap"><EmptyState title="No gap analysis for this client" text="Run the guided analysis to capture departments and skills gaps." action={<Button onClick={() => setWizard(true)}>Start guided analysis</Button>} /></Card>
          )}
          <div className="grid c2">
            <Card title="Needs and mapped courses" actions={hasNeeds ? <div className="row"><Button size="small" onClick={toOpp}>Convert to opportunity</Button><Button size="small" appearance="primary" onClick={toQuote}>Convert to quote</Button></div> : undefined}>
              {info && <div className="ops-okbox" role="status" style={{ marginBottom: 10 }}>{info} <Link to="/opportunities">Open pipeline</Link></div>}
              {!hasNeeds ? <EmptyState title="No needs captured yet" text={`Add the first need for ${orgName(d, orgId)}.`} /> : (
                <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Need</th><th>Mapped course</th><th>Priority</th><th className="num">Seats</th><th /></tr></thead><tbody>
                  {tna!.needs.map((n, i) => (
                    <tr key={i}><td>{n.need}</td><td>{course(n.courseId)?.title}</td>
                      <td><Status s={n.priority === 'High' ? 'Overdue' : n.priority === 'Medium' ? 'Pending' : 'Draft'} /><span className="small"> {n.priority}</span></td>
                      <td className="num">{seatsFor(n.courseId)}</td>
                      <td><Button size="small" appearance="subtle" onClick={() => remove(i)} aria-label={`Remove need ${n.need}`}>Remove</Button></td></tr>
                  ))}
                </tbody></table></div>
              )}
            </Card>
            <Card title="Add a need">
              <div className="form">
                <FText label="Training need" value={need} onChange={setNeed} error={err.need} placeholder="e.g. Depot staff need current safety certificates" />
                <FSelect label="Mapped course" value={courseId} onChange={setCourseId} error={err.course} placeholder="Choose a course" options={d.courses.map(c => ({ value: c.id, label: `${c.code} ${c.title}` }))} />
                <FSelect label="Priority" value={priority} onChange={v => setPriority(v as TnaNeed['priority'])} options={['High', 'Medium', 'Low'].map(x => ({ value: x, label: x }))} />
                <div><Button appearance="primary" onClick={add}>Add need</Button></div>
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  )
}
