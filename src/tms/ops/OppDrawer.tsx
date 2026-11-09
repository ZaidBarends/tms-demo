import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Checkbox, Drawer, DrawerBody, DrawerHeader, DrawerHeaderTitle, Tab, TabList } from '@fluentui/react-components'
import { useStore, orgName } from '../../shared/store'
import { EmptyState, Status } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { STAGES } from '../../shared/calc'
import { addDays, fmtDate, fmtDateTime, money, today } from '../../shared/format'
import type { Opportunity, Stage } from '../../shared/types'
import { defaultOpp, uid, useOps } from './opsStore'
import { STAGE_PROB, daysIn, probOf, weightedValue } from './logic'
import { updateOpportunity } from './mutate'

type Tabs = 'details' | 'tasks' | 'notes' | 'timeline'

function Body({ opp, onStage, onClose }: { opp: Opportunity; onStage: (id: string, s: Stage) => void; onClose: () => void }) {
  const d = useStore(s => s.data)
  const log = useStore(s => s.log)
  const nav = useNavigate()
  const extra = useOps(s => s.opp[opp.id]) ?? defaultOpp()
  const patch = useOps(s => s.patchOpp)
  const [tab, setTab] = useState<Tabs>('details')
  const [f, setF] = useState({ title: opp.title, contact: opp.contact, value: String(opp.value), expectedClose: opp.expectedClose, notes: opp.notes, owner: extra.owner, prob: extra.probability === undefined ? '' : String(extra.probability) })
  const [err, setErr] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [taskDue, setTaskDue] = useState(addDays(today(), 3))
  const [taskErr, setTaskErr] = useState('')
  const [note, setNote] = useState('')
  const contacts = d.contacts.filter(c => c.orgId === opp.orgId)
  const owners = d.staff.filter(s => s.role === 'admin')
  const open = opp.stage !== 'won' && opp.stage !== 'lost'

  const save = () => {
    const e: Record<string, string> = {}
    if (f.title.trim().length < 3) e.title = 'Title needs 3+ characters'
    if (!(Number(f.value) > 0)) e.value = 'Enter a value above R0'
    if (!f.expectedClose) e.expectedClose = 'Choose a date'
    if (f.prob !== '' && (Number(f.prob) < 0 || Number(f.prob) > 100)) e.prob = 'Probability is 0 to 100'
    setErr(e); setSaved(false); if (Object.keys(e).length) return
    updateOpportunity(opp.id, { title: f.title.trim(), contact: f.contact, value: Number(f.value), expectedClose: f.expectedClose, notes: f.notes })
    patch(opp.id, x => ({ ...x, owner: f.owner, probability: f.prob === '' ? undefined : Number(f.prob), events: [...x.events, { id: uid('ev'), at: new Date().toISOString(), text: 'Details updated' }] }))
    log(`Opportunity “${f.title.trim()}” updated`); setSaved(true)
  }
  const addTask = () => {
    if (taskText.trim().length < 3) { setTaskErr('Describe the next step (3+ characters)'); return }
    patch(opp.id, x => ({ ...x, tasks: [...x.tasks, { id: uid('tk'), text: taskText.trim(), due: taskDue, done: false }], events: [...x.events, { id: uid('ev'), at: new Date().toISOString(), text: `Task added: ${taskText.trim()}` }] }))
    setTaskText(''); setTaskErr('')
  }
  const addNote = () => {
    if (!note.trim()) return
    patch(opp.id, x => ({ ...x, notes: [{ id: uid('nt'), at: new Date().toISOString(), text: note.trim() }, ...x.notes], events: [...x.events, { id: uid('ev'), at: new Date().toISOString(), text: 'Note added' }] }))
    setNote('')
  }
  const events = [...extra.events].sort((a, b) => b.at.localeCompare(a.at))
  const lbl = STAGES.find(s => s.id === opp.stage)!.label

  return (
    <>
      <div className="row" style={{ marginBottom: 8 }}>
        <Status s={opp.stage === 'needs' ? 'Pending' : lbl} /><span className="muted small">{lbl}</span>
        {open && <span className="ops-pill">{daysIn(extra.stageSince)} days in stage</span>}
        <span className="ops-pill">{probOf(opp, extra.probability)}% likely</span>
        <span className="ops-pill ok">Weighted {money(weightedValue(opp, extra.probability))}</span>
      </div>
      {extra.reason && !open && <div className="callout" style={{ marginBottom: 8 }}><b>{opp.stage === 'won' ? 'Win' : 'Loss'} reason:</b> {extra.reason}</div>}
      <TabList selectedValue={tab} onTabSelect={(_, x) => setTab(x.value as Tabs)} size="small">
        <Tab value="details">Details</Tab><Tab value="tasks">Next steps ({extra.tasks.filter(t => !t.done).length})</Tab><Tab value="notes">Notes ({extra.notes.length})</Tab><Tab value="timeline">Timeline</Tab>
      </TabList>
      <div style={{ marginTop: 14 }}>
        {tab === 'details' && (
          <div className="form">
            <div><span className="muted small">Client</span><div>{orgName(d, opp.orgId)} <span className="muted small">· Source: {extra.source}</span></div></div>
            <FText label="Title" value={f.title} onChange={v => setF({ ...f, title: v })} error={err.title} />
            <div className="form c2">
              <FSelect label="Contact" value={f.contact} onChange={v => setF({ ...f, contact: v })} options={Array.from(new Set([f.contact, ...contacts.map(c => c.name)])).filter(Boolean).map(x => ({ value: x, label: x }))} />
              <FSelect label="Owner" value={f.owner} onChange={v => setF({ ...f, owner: v })} options={owners.map(s => ({ value: s.id, label: s.name }))} />
              <FText label="Value excluding VAT (R)" type="number" value={f.value} onChange={v => setF({ ...f, value: v })} error={err.value} />
              <FText label="Expected close" type="date" value={f.expectedClose} onChange={v => setF({ ...f, expectedClose: v })} error={err.expectedClose} />
              <FText label={`Probability override (%) – stage default ${STAGE_PROB[opp.stage]}%`} type="number" value={f.prob} onChange={v => setF({ ...f, prob: v })} error={err.prob} min={0} max={100} placeholder="Stage default" />
              <FSelect label="Stage" value={opp.stage} onChange={v => onStage(opp.id, v as Stage)} options={STAGES.map(s => ({ value: s.id, label: s.label }))} />
            </div>
            <FArea label="Summary" value={f.notes} onChange={v => setF({ ...f, notes: v })} rows={3} />
            <div className="row">
              <Button appearance="primary" onClick={save}>Save changes</Button>
              {saved && <span role="status" className="muted">Saved.</span>}
            </div>
            <div className="ops-section">Actions</div>
            <div className="row">
              <Button onClick={() => { onClose(); nav('/quotes/new', { state: { fromOpp: opp.id } }) }}>Create quote from this opportunity</Button>
              <Link to="/tna">Open needs analysis</Link>
            </div>
            <div className="ops-section">Move to</div>
            <div className="row">{STAGES.filter(s => s.id !== opp.stage).map(s => <Button key={s.id} size="small" onClick={() => onStage(opp.id, s.id)}>Move to {s.label}</Button>)}</div>
          </div>
        )}
        {tab === 'tasks' && (
          <>
            {extra.tasks.length === 0 ? <EmptyState title="No next steps" text="Add the next action so this deal does not stall." /> : extra.tasks.map(t => (
              <div key={t.id} className={`ops-task ${t.done ? 'done' : ''}`}>
                <Checkbox checked={t.done} onChange={(_, x) => patch(opp.id, o => ({ ...o, tasks: o.tasks.map(y => (y.id === t.id ? { ...y, done: !!x.checked } : y)) }))} aria-label={`Done: ${t.text}`} />
                <span className="t" style={{ flex: 1 }}>{t.text}</span>
                <span className={`ops-pill ${!t.done && t.due < today() ? 'bad' : ''}`}>{fmtDate(t.due)}</span>
                <Button size="small" appearance="subtle" aria-label={`Remove task ${t.text}`} onClick={() => patch(opp.id, o => ({ ...o, tasks: o.tasks.filter(y => y.id !== t.id) }))}>✕</Button>
              </div>
            ))}
            <div className="ops-section">Add a next step</div>
            <div className="form">
              <FText label="Next step" value={taskText} onChange={setTaskText} error={taskErr} />
              <FText label="Due" type="date" value={taskDue} onChange={setTaskDue} />
              <div><Button onClick={addTask}>Add next step</Button></div>
            </div>
          </>
        )}
        {tab === 'notes' && (
          <>
            <FArea label="New note" value={note} onChange={setNote} rows={3} />
            <div style={{ margin: '8px 0 14px' }}><Button onClick={addNote} disabled={!note.trim()}>Add note</Button></div>
            {extra.notes.length === 0 ? <EmptyState title="No notes yet" /> : extra.notes.map(n => (
              <div key={n.id} className="callout" style={{ marginBottom: 8 }}><div className="muted small">{fmtDateTime(n.at)}</div>{n.text}</div>
            ))}
          </>
        )}
        {tab === 'timeline' && (
          events.length === 0 ? <EmptyState title="No activity yet" /> : (
            <ul className="ops-timeline">{events.map(e => <li key={e.id}><div>{e.text}</div><div className="muted small">{fmtDateTime(e.at)}</div></li>)}</ul>
          )
        )}
      </div>
    </>
  )
}

export function OppDrawer({ opp, onClose, onStage }: { opp?: Opportunity; onClose: () => void; onStage: (id: string, s: Stage) => void }) {
  return (
    <Drawer open={!!opp} onOpenChange={(_, x) => !x.open && onClose()} position="end" size="medium">
      <DrawerHeader><DrawerHeaderTitle action={<Button appearance="subtle" onClick={onClose} aria-label="Close">✕</Button>}>{opp?.title ?? 'Opportunity'}</DrawerHeaderTitle></DrawerHeader>
      <DrawerBody>{opp ? <Body key={opp.id + opp.stage} opp={opp} onStage={onStage} onClose={onClose} /> : <EmptyState title="No opportunity selected" />}</DrawerBody>
    </Drawer>
  )
}
