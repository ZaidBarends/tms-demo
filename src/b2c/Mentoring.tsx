import { useState } from 'react'
import { Avatar, Button, Checkbox, Rating, RatingDisplay, Textarea } from '@fluentui/react-components'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState, Status } from '../shared/ui'
import { FArea } from '../shared/fields'
import { addDays, fmtDate, parse, today } from '../shared/format'
import { hashOf } from '../lms/gamify'
import { useB2c } from './b2cStore'
import type { Mentor } from '../shared/types'
import './b2c.css'

const TIMES = ['09:00', '11:00', '14:00', '16:00']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function weekdays(n: number): string[] {
  const out: string[] = []; let i = 1
  while (out.length < n) { const d = addDays(today(), i++); const dow = parse(d).getDay(); if (dow !== 0 && dow !== 6) out.push(d) }
  return out
}

export function Mentoring() {
  const d = useStore(s => s.data)
  const { learnerId } = useCtx()
  const { mentorMeta, setMentorMeta } = useB2c()
  const [mentor, setMentor] = useState<Mentor | null>(null)
  const [slot, setSlot] = useState<{ date: string; time: string } | null>(null)
  const [goals, setGoals] = useState('')
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const log = d.mentorSessions.filter(m => m.learnerId === learnerId).sort((a, b) => b.date.localeCompare(a.date))
  const days = weekdays(10)
  const taken = (mid: string, date: string, time: string) => d.mentorSessions.some(s => s.mentorId === mid && s.date === date && (mentorMeta[s.id]?.time === time))
  const open = (mid: string, date: string, time: string) => hashOf(`${mid}${date}${time}`) % 3 !== 0 && !taken(mid, date, time)
  const stats = (m: Mentor) => { const h = hashOf(m.id); return { rating: 4.5 + (h % 5) / 10, n: 40 + (h % 120) } }

  const book = () => {
    if (!mentor || !slot) return
    const lines = goals.split('\n').map(x => x.trim()).filter(Boolean)
    if (lines.join(' ').length < 5) return setErr('Add at least one goal (5 or more characters)')
    const id = `ms${Date.now().toString(36)}`
    useStore.setState(s => { const nd = structuredClone(s.data); nd.mentorSessions.unshift({ id, learnerId, mentorId: mentor.id, date: slot.date, status: 'Requested', notes: lines.join('; ') }); return { data: nd } })
    setMentorMeta(id, { time: slot.time, goals: lines, done: lines.map(() => false) })
    useStore.getState().log(`Mentoring session booked with ${mentor.name} for ${fmtDate(slot.date)}`)
    setMsg(`Booked ${mentor.name} on ${fmtDate(slot.date)} at ${slot.time}.`); setSlot(null); setGoals(''); setErr(''); setMentor(null)
  }
  const cancel = (id: string) => useStore.setState(s => { const nd = structuredClone(s.data); nd.mentorSessions = nd.mentorSessions.filter(x => x.id !== id); return { data: nd } })
  const complete = (id: string) => useStore.setState(s => { const nd = structuredClone(s.data); const m = nd.mentorSessions.find(x => x.id === id); if (m) m.status = 'Completed'; return { data: nd } })

  return (
    <>
      <PageHeader id="mentoring" title="Mentoring" subtitle="Book a 45-minute slot with a mentor, set goals and keep session notes" />
      {msg && <div className="callout" role="status" style={{ marginBottom: 16 }}>{msg}</div>}
      <div className="grid c2">
        {d.mentors.map(m => { const s = stats(m)
          return (
            <Card key={m.id}>
              <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
                <Avatar name={m.name} size={48} color="colorful" />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <b>{m.name}</b> <span className="chip">{m.focus}</span>
                  <div className="muted">{m.bio}</div>
                  <div className="small"><RatingDisplay value={s.rating} size="small" /> · {s.n} sessions</div>
                </div>
                <Button appearance={mentor?.id === m.id ? 'primary' : 'secondary'} onClick={() => { setMentor(mentor?.id === m.id ? null : m); setSlot(null) }}>{mentor?.id === m.id ? 'Close availability' : 'See availability'}</Button>
              </div>
            </Card>
          ) })}
      </div>

      {mentor && (
        <Card title={`Availability: ${mentor.name}`}>
          <div className="tbl-wrap"><table className="b2c-slots">
            <thead><tr><th /> {days.map(dt => <th key={dt} scope="col">{DAYS[parse(dt).getDay()]}<div className="small muted">{fmtDate(dt).slice(0, -5)}</div></th>)}</tr></thead>
            <tbody>{TIMES.map(t => (
              <tr key={t}><th scope="row">{t}</th>{days.map(dt => { const ok = open(mentor.id, dt, t); const sel = slot?.date === dt && slot.time === t
                return <td key={dt}><button disabled={!ok} aria-pressed={sel} className={sel ? 'sel' : ''} onClick={() => setSlot({ date: dt, time: t })} aria-label={`${fmtDate(dt)} at ${t}, ${ok ? 'available' : 'unavailable'}`}>{ok ? (sel ? 'Chosen' : 'Open') : '–'}</button></td> })}</tr>
            ))}</tbody>
          </table></div>
          {slot ? (
            <div className="form" style={{ marginTop: 14, maxWidth: 560 }}>
              <div className="callout">{fmtDate(slot.date)} at {slot.time} with <b>{mentor.name}</b> · 45 minutes · online</div>
              <FArea label="Your goals for this session (one per line)" value={goals} onChange={setGoals} rows={3} error={err} />
              <div className="row"><Button appearance="primary" onClick={book}>Confirm booking</Button><Button onClick={() => setSlot(null)}>Choose another time</Button></div>
            </div>
          ) : <p className="muted small">Pick an open slot to continue. Dashes are already taken.</p>}
        </Card>
      )}

      <Card title="Session log">
        {log.length === 0 ? <EmptyState title="No sessions yet" text="Pick a mentor above to book your first slot." /> : (
          <div className="b2c-sessions">{log.map(s => {
            const meta = mentorMeta[s.id]; const m = d.mentors.find(x => x.id === s.mentorId)
            return (
              <div key={s.id} className="b2c-session">
                <div className="row" style={{ justifyContent: 'space-between' }}><b>{m?.name}</b><span><Status s={s.status} /></span></div>
                <div className="small muted">{fmtDate(s.date)}{meta?.time ? ` at ${meta.time}` : ''}</div>
                {(meta?.goals?.length ?? 0) > 0 ? (
                  <div>{meta!.goals.map((g, i) => <div key={i}><Checkbox label={g} checked={!!meta!.done[i]} onChange={(_, x) => setMentorMeta(s.id, { done: meta!.goals.map((_g, k) => k === i ? !!x.checked : !!meta!.done[k]) })} /></div>)}</div>
                ) : <p style={{ margin: '4px 0' }}>{s.notes}</p>}
                <label className="small" htmlFor={`n-${s.id}`}>Session notes</label>
                <Textarea id={`n-${s.id}`} value={meta?.notes ?? ''} onChange={(_, x) => setMentorMeta(s.id, { notes: x.value })} rows={2} resize="vertical" placeholder="What did you agree? What will you do next?" style={{ width: '100%' }} />
                {s.status === 'Completed'
                  ? <div className="row" style={{ marginTop: 6 }}><span className="small">Rate this session</span><Rating value={meta?.rating ?? 0} onChange={(_, x) => setMentorMeta(s.id, { rating: x.value })} aria-label="Rate this session" /></div>
                  : <div className="row" style={{ marginTop: 6 }}><Button size="small" onClick={() => complete(s.id)}>Demo: mark session as held</Button><Button size="small" appearance="subtle" onClick={() => cancel(s.id)}>Cancel booking</Button></div>}
              </div>
            )
          })}</div>
        )}
      </Card>
    </>
  )
}
