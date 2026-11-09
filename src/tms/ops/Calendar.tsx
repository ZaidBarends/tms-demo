import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Drawer, DrawerBody, DrawerHeader, DrawerHeaderTitle, Select } from '@fluentui/react-components'
import { useStore, useCtx } from '../../shared/store'
import { PageHeader, Card, EmptyState, Status, Modal } from '../../shared/ui'
import { clashes, seatsTaken } from '../../shared/calc'
import { addDays, fmtDate, parse, today } from '../../shared/format'
import type { Session } from '../../shared/types'
import { useOps } from './opsStore'
import { conflictsFor, monthGrid, monthTitle, shiftMonth, suggest, weekDays } from './logic'
import { SessionFormModal } from './SessionForm'
import './ops.css'

export const CAT_COLOR: Record<string, string> = {
  'Health & Safety': '#f7630c', Leadership: '#0f6cbd', 'Project Management': '#8764b8', 'Finance Skills': '#13a10e',
  Cybersecurity: '#2b9bd8', Compliance: '#986f0b', 'Soft Skills': '#c239b3',
}
const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
type View = 'month' | 'week' | 'agenda'

export default function SessionCalendar() {
  const d = useStore(s => s.data)
  const { persona } = useCtx()
  const unavailable = useOps(s => s.unavailable)
  const canEdit = persona === 'admin' || persona === 'all'
  const [view, setView] = useState<View>('month')
  const [anchor, setAnchor] = useState(today())
  const [inst, setInst] = useState('')
  const [cat, setCat] = useState('')
  const [drag, setDrag] = useState<string | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [move, setMove] = useState<{ s: Session; to: string } | null>(null)
  const [edit, setEdit] = useState<Session | null>(null)
  const [msg, setMsg] = useState('')
  const cl = clashes(d)
  const course = (id: string) => d.courses.find(c => c.id === id)
  const iname = (id: string) => d.staff.find(s => s.id === id)?.name ?? '—'

  const visible = d.sessions.filter(s => (!inst || s.instructorId === inst) && (!cat || course(s.courseId)?.category === cat))
  const on = (day: string) => visible.filter(s => s.start === day)
  const nav = (dir: -1 | 1) => setAnchor(view === 'month' ? shiftMonth(anchor, dir) : addDays(anchor, dir * (view === 'week' ? 7 : 30)))
  const title = view === 'month' ? monthTitle(anchor) : view === 'week' ? `Week of ${fmtDate(weekDays(anchor)[0])}` : `${fmtDate(anchor)} to ${fmtDate(addDays(anchor, 29))}`
  const selected = d.sessions.find(s => s.id === sel)
  const cats = Array.from(new Set(d.courses.map(c => c.category)))

  const request = (id: string, to: string) => {
    const s = d.sessions.find(x => x.id === id); if (!s || s.start === to || !canEdit) return
    if (s.status !== 'Scheduled') { setMsg('Only scheduled sessions can be rescheduled.'); return }
    if (to < today()) { setMsg('Sessions cannot be moved into the past.'); return }
    setMsg(''); setMove({ s, to })
  }
  const confirmMove = () => {
    if (!move) return
    useStore.getState().saveSession({ ...move.s, start: move.to })
    useStore.getState().log(`${course(move.s.courseId)?.title} rescheduled from ${fmtDate(move.s.start)} to ${fmtDate(move.to)}`)
    setMsg(`Moved to ${fmtDate(move.to)}.`); setMove(null)
  }
  const moveConf = move ? conflictsFor(d, { ...move.s, start: move.to }, unavailable) : []
  const moveAlt = move && moveConf.length ? suggest(d, { ...move.s, start: move.to }, unavailable).dates : []

  const chip = (s: Session) => {
    const c = course(s.courseId); const bad = !!cl[s.id]
    return (
      <button key={s.id} className={`ops-chip ${bad ? 'clash' : ''} ${s.status === 'Cancelled' ? 'cancelled' : ''}`} style={{ ['--c' as string]: CAT_COLOR[c?.category ?? ''] ?? '#0f6cbd' }}
        draggable={canEdit && s.status === 'Scheduled'} onDragStart={e => { try { e.dataTransfer.setData('text/plain', s.id); e.dataTransfer.effectAllowed = 'move' } catch { /* ignore */ } setDrag(s.id) }} onDragEnd={() => { setDrag(null); setOver(null) }} onClick={() => setSel(s.id)}
        title={`${c?.title}\n${s.venue}\n${iname(s.instructorId)}${bad ? '\nResource clash' : ''}`}
        aria-label={`${c?.title}, ${fmtDate(s.start)}, ${iname(s.instructorId)}${bad ? ', resource clash' : ''}${canEdit ? '. Alt plus arrow keys to reschedule' : ''}`}
        onKeyDown={e => {
          if (!e.altKey || !canEdit) return
          const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowDown' ? 7 : e.key === 'ArrowUp' ? -7 : 0
          if (delta) { e.preventDefault(); request(s.id, addDays(s.start, delta)) }
        }}>
        {bad && '⚠ '}{c?.code} · {iname(s.instructorId).split(' ')[0]}
      </button>
    )
  }
  const renderDay = (day: string, big?: boolean) => {
    const list = on(day); const inMonth = day.slice(0, 7) === anchor.slice(0, 7)
    const shown = big || view === 'week' ? list : list.slice(0, 3)
    const nClash = list.filter(s => cl[s.id]).length
    return (
      <div key={day} className={`ops-day ${view === 'week' ? 'week' : ''} ${view === 'month' && !inMonth ? 'out' : ''} ${day === today() ? 'today' : ''} ${over === day ? 'over' : ''}`}
        onDragOver={e => { if (drag) { e.preventDefault(); setOver(day) } }} onDragLeave={() => setOver(null)}
        onDrop={e => { e.preventDefault(); if (drag) request(drag, day); setDrag(null); setOver(null) }}
        role="gridcell" aria-label={`${fmtDate(day)}, ${list.length} sessions`}>
        <div className="row" style={{ justifyContent: 'space-between', gap: 4 }}>
          <span className="ops-daynum">{parse(day).getDate()}</span>
          {nClash > 0 && <span className="ops-pill bad" title="Clashes on this day">⚠ {nClash}</span>}
        </div>
        {shown.map(s => chip(s))}
        {!big && view === 'month' && list.length > 3 && <button className="ops-chip" style={{ ['--c' as string]: '#8a96a3', cursor: 'pointer' }} onClick={() => { setAnchor(day); setView('week') }}>+{list.length - 3} more</button>}
      </div>
    )
  }

  const agendaDays = Array.from({ length: 30 }, (_, i) => addDays(anchor, i)).filter(x => on(x).length)

  return (
    <>
      <PageHeader id="session-calendar" title="Calendar" subtitle={canEdit ? 'Drag a session to another day to reschedule it. Clashes are checked before anything moves.' : 'All scheduled sessions. Administrators can reschedule.'}
        actions={canEdit ? <Button appearance="primary" onClick={() => setEdit({ id: `x-${Date.now()}`, courseId: d.courses[0].id, start: today(), venue: 'Cape Town Training Centre – Room A', instructorId: inst || 's3', capacity: 12, equipment: [], status: 'Scheduled' })}>Schedule session</Button> : undefined} />
      <div className="ops-toolbar">
        <Button onClick={() => nav(-1)} aria-label="Previous">‹ Previous</Button><Button onClick={() => setAnchor(today())}>Today</Button><Button onClick={() => nav(1)} aria-label="Next">Next ›</Button>
        <b style={{ fontSize: 16, minWidth: 180 }} aria-live="polite">{title}</b>
        <span className="spacer" />
        <Select className="ops-sel" aria-label="Filter by instructor" value={inst} onChange={(_, x) => setInst(x.value)}><option value="">All instructors</option>{d.staff.filter(s => s.role === 'instructor').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</Select>
        <Select className="ops-sel" aria-label="Filter by category" value={cat} onChange={(_, x) => setCat(x.value)}><option value="">All categories</option>{cats.map(c => <option key={c}>{c}</option>)}</Select>
        <div className="ops-seg" role="group" aria-label="Calendar view">{(['month', 'week', 'agenda'] as View[]).map(v => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>)}</div>
      </div>
      {msg && <div className="callout" role="status" style={{ marginBottom: 10 }}>{msg}</div>}

      {view === 'agenda' ? (
        <Card>{agendaDays.length === 0 ? <EmptyState title="Nothing scheduled" text="No sessions in the next 30 days for these filters." /> : agendaDays.map(day => (
          <div key={day} className="ops-agenda-day">
            <div><b>{fmtDate(day)}</b><div className="muted small">{WD[(parse(day).getDay() + 6) % 7]}</div></div>
            <div>{on(day).map(s => { const c = course(s.courseId); return (
              <div key={s.id} className="row" style={{ padding: '3px 0' }}>
                <span className="ops-dot" style={{ background: CAT_COLOR[c?.category ?? ''] }} />
                <button style={{ all: 'unset', cursor: 'pointer', color: 'var(--colorBrandForeground1)' }} onClick={() => setSel(s.id)}>{c?.title}</button>
                <span className="muted small">{s.venue} · {iname(s.instructorId)} · {seatsTaken(d, s.id)}/{s.capacity}</span>
                {cl[s.id] && <span className="ops-pill bad">⚠ Clash</span>}<Status s={s.status} />
              </div>) })}</div>
          </div>))}</Card>
      ) : (
        <>
          <div className="ops-cal-head" aria-hidden>{WD.map(w => <div key={w}>{w}</div>)}</div>
          <div className="ops-cal-grid" role="grid" aria-label={`${view} calendar`}>
            {(view === 'month' ? monthGrid(anchor) : weekDays(anchor)).map(day => renderDay(day))}
          </div>
        </>
      )}
      <div className="ops-legend" aria-label="Category colours">
        {cats.map(c => <span key={c}><span className="ops-dot" style={{ background: CAT_COLOR[c] }} />{c}</span>)}
        <span><span className="ops-pill bad">⚠</span> Resource clash</span>
      </div>

      <Drawer open={!!selected} onOpenChange={(_, x) => !x.open && setSel(null)} position="end" size="small">
        <DrawerHeader><DrawerHeaderTitle action={<Button appearance="subtle" onClick={() => setSel(null)} aria-label="Close">✕</Button>}>{selected ? course(selected.courseId)?.title : 'Session'}</DrawerHeaderTitle></DrawerHeader>
        <DrawerBody>
          {selected && (
            <div className="form">
              <div className="row"><Status s={selected.status} />{cl[selected.id] && <span className="ops-pill bad">⚠ Clash</span>}</div>
              <dl className="ops-kv">
                <dt>Date</dt><dd>{fmtDate(selected.start)}</dd><dt>Venue</dt><dd>{selected.venue}</dd><dt>Instructor</dt><dd>{iname(selected.instructorId)}</dd>
                <dt>Seats</dt><dd>{seatsTaken(d, selected.id)} of {selected.capacity}</dd><dt>Equipment</dt><dd>{selected.equipment.join(', ') || 'None'}</dd><dt>Category</dt><dd>{course(selected.courseId)?.category}</dd>
              </dl>
              {cl[selected.id] && <div className="ops-warnbox" role="alert">{Array.from(new Set(cl[selected.id])).join('; ')}</div>}
              <div className="row">
                <Link to={`/sessions/${selected.id}`}><Button appearance="primary">Open class list</Button></Link>
                {canEdit && <Link to={`/course/${selected.courseId}`}><Button>Course detail</Button></Link>}
              </div>
              {canEdit && <div className="row">
                <Button onClick={() => { setEdit(selected); setSel(null) }}>Edit session</Button>
                {selected.status === 'Scheduled' && <Button onClick={() => useStore.getState().saveSession({ ...selected, status: 'Cancelled' })}>Cancel session</Button>}
                {selected.status === 'Cancelled' && <Button onClick={() => useStore.getState().saveSession({ ...selected, status: 'Scheduled' })}>Reinstate</Button>}
              </div>}
            </div>
          )}
        </DrawerBody>
      </Drawer>

      <Modal open={!!move} onClose={() => setMove(null)} title="Reschedule session" actions={<Button appearance="primary" onClick={confirmMove}>{moveConf.length ? 'Move anyway' : 'Confirm move'}</Button>}>
        {move && (
          <div className="form">
            <p style={{ margin: 0 }}>Move <b>{course(move.s.courseId)?.title}</b> from <b>{fmtDate(move.s.start)}</b> to <b>{fmtDate(move.to)}</b>?</p>
            {moveConf.length === 0 ? <div className="ops-okbox">No clashes on the new date.</div> : (
              <div className="ops-warnbox" role="alert"><b>⚠ Clashes on {fmtDate(move.to)}</b><ul style={{ margin: '6px 0', paddingLeft: 18 }}>{moveConf.map((c, i) => <li key={i}>{c.text}</li>)}</ul>
                {moveAlt.length > 0 && <div className="row" style={{ gap: 6 }}><span className="small muted">Free dates:</span>{moveAlt.slice(0, 3).map(x => <Button key={x} size="small" onClick={() => setMove({ ...move, to: x })}>{fmtDate(x)}</Button>)}</div>}</div>
            )}
          </div>
        )}
      </Modal>
      <SessionFormModal value={edit} isNew={!!edit && !d.sessions.some(s => s.id === edit.id)} onClose={() => setEdit(null)} />
    </>
  )
}
