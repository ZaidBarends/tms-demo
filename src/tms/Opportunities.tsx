import { useMemo, useState } from 'react'
import { Button, Input, Select } from '@fluentui/react-components'
import { useStore, orgName } from '../shared/store'
import { PageHeader, Stat, Status, EmptyState } from '../shared/ui'
import { STAGES } from '../shared/calc'
import { fmtDate, money } from '../shared/format'
import type { Opportunity, Stage } from '../shared/types'
import { useOps, defaultOpp } from './ops/opsStore'
import { BANDS, ageTone, bandOf, daysIn, probOf, weightedValue } from './ops/logic'
import { moveStage } from './ops/mutate'
import { OppDrawer } from './ops/OppDrawer'
import { NewOppDialog, ReasonDialog } from './ops/OppDialogs'
import { downloadCsv } from './ops/download'
import './ops/ops.css'

type SortKey = 'title' | 'client' | 'stage' | 'value' | 'weighted' | 'owner' | 'age' | 'close'

export default function Opportunities() {
  const d = useStore(s => s.data)
  const extras = useOps(s => s.opp)
  const [view, setView] = useState<'board' | 'table'>('board')
  const [q, setQ] = useState('')
  const [client, setClient] = useState('')
  const [owner, setOwner] = useState('')
  const [band, setBand] = useState('')
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<Stage | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [pending, setPending] = useState<{ id: string; stage: Stage } | null>(null)
  const [creating, setCreating] = useState(false)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'close', dir: 1 })
  const ex = (id: string) => extras[id] ?? defaultOpp()
  const staffName = (id: string) => d.staff.find(s => s.id === id)?.name ?? '—'
  const initials = (id: string) => staffName(id).split(' ').map(x => x[0]).join('')

  const list = useMemo(() => d.opportunities.filter(o => {
    const e = extras[o.id] ?? defaultOpp()
    if (client && o.orgId !== client) return false
    if (owner && e.owner !== owner) return false
    if (band && bandOf(o.value) !== band) return false
    if (q.trim()) {
      const hay = `${o.title} ${o.contact} ${orgName(d, o.orgId)} ${o.notes}`.toLowerCase()
      if (!hay.includes(q.trim().toLowerCase())) return false
    }
    return true
  }), [d, extras, q, client, owner, band])

  const open = list.filter(o => o.stage !== 'won' && o.stage !== 'lost')
  const won = list.filter(o => o.stage === 'won'); const lost = list.filter(o => o.stage === 'lost')
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0

  const requestMove = (id: string, stage: Stage) => {
    const o = d.opportunities.find(x => x.id === id); if (!o || o.stage === stage) return
    if (stage === 'won' || stage === 'lost') setPending({ id, stage }); else moveStage(id, stage)
  }
  const pendingOpp = pending ? d.opportunities.find(o => o.id === pending.id) : undefined

  const sortVal = (o: Opportunity): string | number => {
    const e = ex(o.id)
    switch (sort.key) {
      case 'title': return o.title; case 'client': return orgName(d, o.orgId); case 'stage': return STAGES.findIndex(s => s.id === o.stage)
      case 'value': return o.value; case 'weighted': return weightedValue(o, e.probability); case 'owner': return staffName(e.owner)
      case 'age': return daysIn(e.stageSince); default: return o.expectedClose
    }
  }
  const sorted = [...list].sort((a, b) => { const x = sortVal(a), y = sortVal(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir })
  const th = (key: SortKey, label: string, num = false) => (
    <th className={num ? 'num' : ''} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button style={{ all: 'unset', cursor: 'pointer' }} onClick={() => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>{label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button>
    </th>
  )
  const exportCsv = () => downloadCsv('opportunities.csv', [
    ['Title', 'Client', 'Contact', 'Stage', 'Value (ex VAT)', 'Probability %', 'Weighted value', 'Owner', 'Days in stage', 'Expected close'],
    ...sorted.map(o => { const e = ex(o.id); return [o.title, orgName(d, o.orgId), o.contact, STAGES.find(s => s.id === o.stage)!.label, o.value, probOf(o, e.probability), weightedValue(o, e.probability), staffName(e.owner), daysIn(e.stageSince), o.expectedClose] }),
  ])
  const filtered = !!(q || client || owner || band)

  return (
    <>
      <PageHeader id="opportunities" title="Opportunities" subtitle="Drag a card between stages, or focus a card and press Alt + Left or Right Arrow."
        actions={<><Button onClick={exportCsv}>Export CSV</Button><Button appearance="primary" onClick={() => setCreating(true)}>New opportunity</Button></>} />
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Open pipeline" value={money(open.reduce((a, o) => a + o.value, 0))} hint={`${open.length} open opportunities`} />
        <Stat label="Weighted forecast" value={money(open.reduce((a, o) => a + weightedValue(o, ex(o.id).probability), 0))} hint="Value x stage probability" />
        <Stat label="Won" value={money(won.reduce((a, o) => a + o.value, 0))} hint={`${won.length} deals`} />
        <Stat label="Win rate" value={`${winRate}%`} hint={`${won.length} won, ${lost.length} lost`} />
      </div>

      <div className="ops-toolbar">
        <div className="ops-search"><Input style={{ width: '100%' }} type="search" placeholder="Search title, client, contact" aria-label="Search opportunities" value={q} onChange={(_, x) => setQ(x.value)} /></div>
        <Select className="ops-sel" aria-label="Filter by client" value={client} onChange={(_, x) => setClient(x.value)}><option value="">All clients</option>{d.orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
        <Select className="ops-sel" aria-label="Filter by owner" value={owner} onChange={(_, x) => setOwner(x.value)}><option value="">All owners</option>{d.staff.filter(s => s.role === 'admin').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select className="ops-sel" aria-label="Filter by value band" value={band} onChange={(_, x) => setBand(x.value)}><option value="">Any value</option>{BANDS.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</Select>
        {filtered && <Button appearance="subtle" onClick={() => { setQ(''); setClient(''); setOwner(''); setBand('') }}>Clear filters</Button>}
        <span className="spacer" />
        <div className="ops-seg" role="group" aria-label="View">
          <button aria-pressed={view === 'board'} onClick={() => setView('board')}>Board</button>
          <button aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button>
        </div>
      </div>

      {view === 'board' ? (
        <div className="ops-board">
          {STAGES.map(st => {
            const cards = list.filter(o => o.stage === st.id)
            const isOpen = st.id !== 'won' && st.id !== 'lost'
            return (
              <div key={st.id} className={`ops-col ${over === st.id ? 'over' : ''}`} role="group" aria-label={`${st.label} stage`}
                onDragOver={e => { e.preventDefault(); setOver(st.id) }} onDragLeave={() => setOver(null)}
                onDrop={e => { e.preventDefault(); if (drag) requestMove(drag, st.id); setDrag(null); setOver(null) }}>
                <div className="ops-col-head">
                  <h3><span>{st.label} <span className="muted">({cards.length})</span></span><span>{money(cards.reduce((a, o) => a + o.value, 0))}</span></h3>
                  <div className="ops-col-sum"><span>{isOpen ? 'Weighted' : st.id === 'won' ? 'Closed won' : 'Closed lost'}</span><span>{isOpen ? money(cards.reduce((a, o) => a + weightedValue(o, ex(o.id).probability), 0)) : ''}</span></div>
                </div>
                {cards.length === 0 && <div className="muted small" style={{ padding: 8 }}>{filtered ? 'No matches in this stage.' : 'Nothing here. Drop a card.'}</div>}
                {cards.map(o => {
                  const e = ex(o.id); const age = daysIn(e.stageSince); const si = STAGES.findIndex(x => x.id === o.stage)
                  const nextTask = e.tasks.filter(t => !t.done).sort((a, b) => a.due.localeCompare(b.due))[0]
                  return (
                    <div key={o.id} className={`ops-card ${drag === o.id ? 'dragging' : ''}`} draggable onDragStart={e => { try { e.dataTransfer.setData('text/plain', o.id); e.dataTransfer.effectAllowed = 'move' } catch { /* ignore */ } setDrag(o.id) }} onDragEnd={() => { setDrag(null); setOver(null) }}>
                      <button style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%' }} onClick={() => setSel(o.id)}
                        aria-label={`${o.title}, ${orgName(d, o.orgId)}, ${money(o.value)}. Press Alt and an arrow key to change stage.`}
                        onKeyDown={ev => {
                          if (ev.altKey && (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft')) {
                            ev.preventDefault()
                            const t = STAGES[si + (ev.key === 'ArrowRight' ? 1 : -1)]; if (t) requestMove(o.id, t.id)
                          }
                        }}>
                        <b>{o.title}</b>
                        <div className="muted small">{orgName(d, o.orgId)} · {o.contact}</div>
                        <div style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}><span>{money(o.value)}</span>{isOpen && <span className="muted small">{probOf(o, e.probability)}% · {money(weightedValue(o, e.probability))}</span>}</div>
                      </button>
                      <div className="ops-card-foot">
                        {isOpen ? <span className={`ops-age ${ageTone(age)}`} title="Time spent in this stage">{age === 0 ? 'New today' : `${age}d in stage`}</span> : <span className="muted small">{o.stage === 'won' ? 'Won' : 'Lost'} {age}d ago</span>}
                        <span className="muted small" title={`Owner ${staffName(e.owner)}`}>{initials(e.owner)} · close {fmtDate(o.expectedClose)}</span>
                      </div>
                      {nextTask && isOpen && <div className="small muted" style={{ marginTop: 4 }}>Next: {nextTask.text} ({fmtDate(nextTask.due)})</div>}
                      <div className="ops-moveto" aria-label="Move to">
                        {STAGES.filter(s => s.id !== o.stage).map(s => <button key={s.id} onClick={() => requestMove(o.id, s.id)} aria-label={`Move ${o.title} to ${s.label}`}>{s.label}</button>)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState title="No opportunities match" text="Try clearing the filters or create a new opportunity." action={<Button onClick={() => setCreating(true)}>New opportunity</Button>} />
      ) : (
        <div className="card"><div className="tbl-wrap"><table className="tbl">
          <thead><tr>{th('title', 'Opportunity')}{th('client', 'Client')}{th('stage', 'Stage')}{th('value', 'Value', true)}{th('weighted', 'Weighted', true)}{th('owner', 'Owner')}{th('age', 'In stage', true)}{th('close', 'Expected close')}</tr></thead>
          <tbody>{sorted.map(o => {
            const e = ex(o.id)
            return (
              <tr key={o.id} className="ops-row-click" tabIndex={0} onClick={() => setSel(o.id)} onKeyDown={ev => ev.key === 'Enter' && setSel(o.id)}>
                <td><b>{o.title}</b><div className="muted small">{o.contact}</div></td><td>{orgName(d, o.orgId)}</td>
                <td><Status s={o.stage === 'needs' ? 'Pending' : STAGES.find(s => s.id === o.stage)!.label} /> <span className="small muted">{STAGES.find(s => s.id === o.stage)!.label}</span></td>
                <td className="num">{money(o.value)}</td><td className="num">{money(weightedValue(o, e.probability))}</td><td>{staffName(e.owner)}</td>
                <td className="num">{daysIn(e.stageSince)}d</td><td>{fmtDate(o.expectedClose)}</td>
              </tr>
            )
          })}</tbody>
        </table></div></div>
      )}
      <p className="muted small">Weighted value = value x probability (Enquiry 10%, Needs analysis 30%, Quoted 60%, Won 100%, Lost 0%), unless overridden on the opportunity.</p>

      <OppDrawer opp={d.opportunities.find(o => o.id === sel)} onClose={() => setSel(null)} onStage={requestMove} />
      {pending && pendingOpp && (
        <ReasonDialog key={pending.id + pending.stage} open stage={pending.stage} title={pendingOpp.title} onCancel={() => setPending(null)}
          onConfirm={reason => { moveStage(pending.id, pending.stage, reason); setPending(null) }} />
      )}
      <NewOppDialog open={creating} onClose={() => setCreating(false)} onCreated={id => { setCreating(false); setSel(id) }} />
    </>
  )
}
