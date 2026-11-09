import { useState } from 'react'
import { Button, Checkbox, Input } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmptyState, Progress } from '../../shared/ui'
import { FArea, FSelect } from '../../shared/fields'
import { fmtDate, today } from '../../shared/format'
import type { Session } from '../../shared/types'
import { defaultSess, uid, useOps } from './opsStore'
import { promoteWaitlist } from './mutate'

const useX = (id: string) => useOps(s => s.sess[id]) ?? defaultSess()

export function SeatChart({ session }: { session: Session }) {
  const d = useStore(s => s.data)
  const list = d.enrolments.filter(e => e.sessionId === session.id)
  const wait = useX(session.id).waitlist.length
  return (
    <Card title="Seat chart">
      <div className="ops-seats" role="img" aria-label={`${list.length} of ${session.capacity} seats taken`}>
        {Array.from({ length: session.capacity }, (_, i) => {
          const e = list[i]; const l = e && d.learners.find(x => x.id === e.learnerId)
          return <div key={i} className={`ops-seat ${e ? (e.attended ? 'taken att' : 'taken') : ''}`} title={l ? `${l.name}${e.attended ? ' (present)' : ''}` : 'Free seat'}>{l ? l.name.split(' ').map(x => x[0]).join('') : i + 1}</div>
        })}
      </div>
      <div className="ops-legend"><span><span className="ops-dot" style={{ background: '#0f6cbd' }} />Booked</span><span><span className="ops-dot" style={{ background: '#13a10e' }} />Present</span><span><span className="ops-dot" style={{ background: 'var(--page)', border: '1px solid var(--line)' }} />Free</span>{wait > 0 && <span className="muted">{wait} on waitlist</span>}</div>
    </Card>
  )
}

export function Waitlist({ session }: { session: Session }) {
  const d = useStore(s => s.data)
  const x = useX(session.id)
  const patch = useOps(s => s.patchSess)
  const [pick, setPick] = useState('')
  const [err, setErr] = useState('')
  const taken = d.enrolments.filter(e => e.sessionId === session.id)
  const free = session.capacity - taken.length
  const candidates = d.learners.filter(l => l.type !== 'b2c' && !taken.some(e => e.learnerId === l.id) && !x.waitlist.some(w => w.learnerId === l.id))
  const name = (id: string) => d.learners.find(l => l.id === id)?.name ?? '—'
  const add = () => {
    if (!pick) { setErr('Choose a learner to add'); return }
    patch(session.id, s => ({ ...s, waitlist: [...s.waitlist, { id: uid('w'), learnerId: pick, added: today() }] })); setPick(''); setErr('')
  }
  return (
    <Card title={`Waitlist (${x.waitlist.length})`}>
      {x.waitlist.length === 0 ? <EmptyState title="Waitlist is empty" text={free > 0 ? `${free} seats are still free.` : 'The session is full. Add learners who should be offered the next free seat.'} /> : (
        <table className="tbl"><tbody>{x.waitlist.map((w, i) => (
          <tr key={w.id}><td>{i + 1}</td><td>{name(w.learnerId)}</td><td className="muted small">Added {fmtDate(w.added)}</td>
            <td className="row" style={{ gap: 4, flexWrap: 'nowrap' }}>
              <Button size="small" disabled={free <= 0} title={free <= 0 ? 'No free seats' : ''} onClick={() => promoteWaitlist(session.id, w.learnerId)}>Move into class</Button>
              <Button size="small" appearance="subtle" aria-label={`Remove ${name(w.learnerId)} from waitlist`} onClick={() => patch(session.id, s => ({ ...s, waitlist: s.waitlist.filter(y => y.id !== w.id) }))}>✕</Button></td></tr>
        ))}</tbody></table>
      )}
      <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
        <div style={{ minWidth: 220 }}><FSelect label="Add to waitlist" value={pick} onChange={setPick} placeholder="Choose a learner" error={err} options={candidates.map(l => ({ value: l.id, label: l.name }))} /></div>
        <Button onClick={add}>Add</Button>
      </div>
    </Card>
  )
}

export function Notes({ session }: { session: Session }) {
  const x = useX(session.id)
  const patch = useOps(s => s.patchSess)
  const [text, setText] = useState(x.notes)
  const [saved, setSaved] = useState(false)
  return (
    <Card title="Session notes">
      <FArea label="Notes for the training office" value={text} onChange={v => { setText(v); setSaved(false) }} rows={4} />
      <div className="row" style={{ marginTop: 8 }}><Button onClick={() => { patch(session.id, s => ({ ...s, notes: text })); setSaved(true) }}>Save notes</Button>{saved && <span role="status" className="muted">Saved.</span>}</div>
    </Card>
  )
}

export function Materials({ session }: { session: Session }) {
  const x = useX(session.id)
  const patch = useOps(s => s.patchSess)
  const [label, setLabel] = useState('')
  const done = x.materials.filter(m => m.done).length
  const pct = x.materials.length ? Math.round((done / x.materials.length) * 100) : 0
  return (
    <Card title="Materials checklist">
      <div className="row" style={{ marginBottom: 8 }}><div style={{ flex: 1 }}><Progress value={pct} /></div><span className="muted small">{done} of {x.materials.length} ready</span></div>
      {x.materials.map(m => (
        <div key={m.id} className="ops-task"><Checkbox checked={m.done} label={m.label} onChange={(_, c) => patch(session.id, s => ({ ...s, materials: s.materials.map(y => (y.id === m.id ? { ...y, done: !!c.checked } : y)) }))} />
          <span className="spacer" /><Button size="small" appearance="subtle" aria-label={`Remove ${m.label}`} onClick={() => patch(session.id, s => ({ ...s, materials: s.materials.filter(y => y.id !== m.id) }))}>✕</Button></div>
      ))}
      <form className="row" style={{ marginTop: 8 }} onSubmit={e => { e.preventDefault(); if (label.trim()) { patch(session.id, s => ({ ...s, materials: [...s.materials, { id: uid('m'), label: label.trim(), done: false }] })); setLabel('') } }}>
        <Input aria-label="New checklist item" placeholder="Add an item" value={label} onChange={(_, v) => setLabel(v.value)} /><Button type="submit">Add</Button>
      </form>
    </Card>
  )
}

export function FeedbackForm({ session }: { session: Session }) {
  const x = useX(session.id)
  const patch = useOps(s => s.patchSess)
  const [rating, setRating] = useState(x.feedback?.rating ?? 0)
  const [strengths, setStrengths] = useState(x.feedback?.strengths ?? '')
  const [improve, setImprove] = useState(x.feedback?.improve ?? '')
  const [err, setErr] = useState('')
  const submit = () => {
    if (!rating) { setErr('Rate the session from 1 to 5 stars'); return }
    if (strengths.trim().length < 3) { setErr('Add at least a short note on what went well'); return }
    patch(session.id, s => ({ ...s, feedback: { rating, strengths: strengths.trim(), improve: improve.trim(), at: new Date().toISOString() } })); setErr('')
  }
  return (
    <Card title="Instructor feedback">
      <div role="radiogroup" aria-label="Session rating" className="ops-stars">
        {[1, 2, 3, 4, 5].map(n => <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} star${n === 1 ? '' : 's'}`} className={`ops-star ${n <= rating ? 'on' : ''}`} onClick={() => { setRating(n); setErr('') }}>★</button>)}
      </div>
      <div className="form" style={{ marginTop: 8 }}>
        <FArea label="What went well?" value={strengths} onChange={setStrengths} rows={2} />
        <FArea label="What should we improve?" value={improve} onChange={setImprove} rows={2} />
        {err && <div className="err" role="alert">{err}</div>}
        <div className="row"><Button appearance="primary" onClick={submit}>{x.feedback ? 'Update feedback' : 'Submit feedback'}</Button>{x.feedback && <span role="status" className="muted small">Submitted {fmtDate(x.feedback.at)}</span>}</div>
      </div>
    </Card>
  )
}
