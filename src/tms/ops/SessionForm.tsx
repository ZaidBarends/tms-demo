import { useState } from 'react'
import { Button, Checkbox } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Modal } from '../../shared/ui'
import { FSelect, FText } from '../../shared/fields'
import { fmtDate } from '../../shared/format'
import { seatsTaken } from '../../shared/calc'
import type { Session } from '../../shared/types'
import { useOps } from './opsStore'
import { EQUIPMENT_ITEMS, VENUES, conflictsFor, suggest } from './logic'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dayName = (s: string) => WD[new Date(s + 'T00:00:00').getDay()]

/** Schedule or edit a session. Shows live clash warnings and one-click alternatives before saving. */
export function SessionFormModal({ value, onClose, isNew, onSaved }: { value: Session | null; onClose: () => void; isNew: boolean; onSaved?: (s: Session) => void }) {
  if (!value) return null
  return <Inner key={value.id} initial={value} onClose={onClose} isNew={isNew} onSaved={onSaved} />
}

function Inner({ initial, onClose, isNew, onSaved }: { initial: Session; onClose: () => void; isNew: boolean; onSaved?: (s: Session) => void }) {
  const d = useStore(s => s.data)
  const save = useStore(s => s.saveSession)
  const unavailable = useOps(s => s.unavailable)
  const [s, setS] = useState<Session>(initial)
  const [err, setErr] = useState<Record<string, string>>({})
  const conflicts = conflictsFor(d, s, unavailable)
  const alt = conflicts.length ? suggest(d, s, unavailable) : null
  const taken = isNew ? 0 : seatsTaken(d, s.id)
  const instName = (id: string) => d.staff.find(x => x.id === id)?.name ?? id

  const submit = () => {
    const e: Record<string, string> = {}
    if (!s.start) e.start = 'Choose a date'
    if (!s.courseId) e.courseId = 'Choose a course'
    if (!(s.capacity >= 1) || !Number.isInteger(s.capacity)) e.capacity = 'Capacity must be a whole number, at least 1'
    else if (s.capacity < taken) e.capacity = `${taken} seats are already booked`
    setErr(e); if (Object.keys(e).length) return
    save(s); useStore.getState().log(`${isNew ? 'Scheduled' : 'Updated'} session ${d.courses.find(c => c.id === s.courseId)?.title} on ${fmtDate(s.start)}`)
    onSaved?.(s); onClose()
  }

  return (
    <Modal open onClose={onClose} title={isNew ? 'Schedule a session' : 'Edit session'} wide actions={<Button appearance="primary" onClick={submit}>{conflicts.length ? (isNew ? 'Schedule anyway' : 'Save anyway') : isNew ? 'Schedule' : 'Save session'}</Button>}>
      <div className="form c2">
        <FSelect label="Course" value={s.courseId} onChange={v => setS({ ...s, courseId: v })} error={err.courseId} options={d.courses.filter(c => c.status !== 'Retired').map(c => ({ value: c.id, label: `${c.code} ${c.title}` }))} />
        <FText label={`Date${s.start ? ` (${dayName(s.start)})` : ''}`} type="date" value={s.start} onChange={v => setS({ ...s, start: v })} error={err.start} />
        <FSelect label="Venue" value={s.venue} onChange={v => setS({ ...s, venue: v })} options={Array.from(new Set([...VENUES, s.venue])).map(v => ({ value: v, label: v }))} />
        <FSelect label="Instructor" value={s.instructorId} onChange={v => setS({ ...s, instructorId: v })} options={d.staff.filter(x => x.role === 'instructor').map(x => ({ value: x.id, label: x.name }))} />
        <FText label="Capacity" type="number" min={1} value={s.capacity} onChange={v => setS({ ...s, capacity: Number(v) })} error={err.capacity} />
        <FSelect label="Status" value={s.status} onChange={v => setS({ ...s, status: v as Session['status'] })} options={['Scheduled', 'Completed', 'Cancelled'].map(x => ({ value: x, label: x }))} />
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="muted small" style={{ marginBottom: 4 }}>Equipment</div>
          <div className="row">{EQUIPMENT_ITEMS.map(eq => <Checkbox key={eq} label={eq} checked={s.equipment.includes(eq)} onChange={(_, c) => setS({ ...s, equipment: c.checked ? [...s.equipment, eq] : s.equipment.filter(x => x !== eq) })} />)}</div>
        </div>
      </div>
      <div style={{ marginTop: 14 }} aria-live="polite">
        {conflicts.length === 0 ? <div className="ops-okbox">No clashes: venue, instructor and equipment are free on {fmtDate(s.start)}.</div> : (
          <div className="ops-warnbox" role="alert">
            <b>⚠ {conflicts.length} clash{conflicts.length === 1 ? '' : 'es'} found</b>
            <ul style={{ margin: '6px 0 8px', paddingLeft: 18 }}>{conflicts.map((c, i) => <li key={i}>{c.text}</li>)}</ul>
            {alt && (
              <div className="row" style={{ gap: 6 }}>
                <span className="muted small">Suggestions:</span>
                {alt.venues.slice(0, 2).map(v => <Button key={v} size="small" onClick={() => setS({ ...s, venue: v })}>Use {v.replace('Cape Town Training Centre – ', 'CTTC ')}</Button>)}
                {alt.instructors.slice(0, 2).map(i => <Button key={i} size="small" onClick={() => setS({ ...s, instructorId: i })}>Use {instName(i)}</Button>)}
                {alt.dates.slice(0, 3).map(x => <Button key={x} size="small" onClick={() => setS({ ...s, start: x })}>Move to {dayName(x)} {fmtDate(x)}</Button>)}
                {!alt.venues.length && !alt.instructors.length && !alt.dates.length && <span className="small">No free alternatives in the next three weeks.</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
