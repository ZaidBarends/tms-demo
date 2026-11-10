import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Modal, EmptyState } from '../../shared/ui'
import { clashes } from '../../shared/calc'
import { fmtDate } from '../../shared/format'
import type { Session } from '../../shared/types'
import { useOps } from './opsStore'
import { suggest } from './logic'

/** Proposes alternatives for every session involved in a clash and applies the chosen one. */
export function ResolveClashModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useStore(s => s.data)
  const save = useStore(s => s.saveSession)
  const unavailable = useOps(s => s.unavailable)
  const cl = clashes(d)
  const ids = Object.keys(cl)
  const iname = (id: string) => d.staff.find(s => s.id === id)?.name ?? id
  const apply = (s: Session, patch: Partial<Session>, what: string) => {
    save({ ...s, ...patch })
    useStore.getState().log(`Clash resolved: ${d.courses.find(c => c.id === s.courseId)?.title} ${what}`)
  }
  return (
    <Modal open={open} onClose={onClose} wide title={`Resolve clashes (${ids.length})`}>
      {ids.length === 0 ? <EmptyState title="No clashes" text="Every session has its own venue, instructor and equipment." /> : (
        <div className="form">
          <p className="muted small" style={{ margin: 0 }}>For each session in a clash, pick one change. Options are only shown when they are free on that day.</p>
          {ids.map(id => {
            const s = d.sessions.find(x => x.id === id)!; const c = d.courses.find(k => k.id === s.courseId)
            const alt = suggest(d, s, unavailable)
            const reasons = Array.from(new Set(cl[id]))
            const eqNames = reasons.filter(r => r.startsWith('Equipment: ')).map(r => r.slice(11).replace(/ \(.*$/, ''))
            const hasEq = eqNames.length > 0
            return (
              <div key={id} className="callout">
                <b>{c?.code} {c?.title}</b> <span className="muted small">· {fmtDate(s.start)} · {s.venue} · {iname(s.instructorId)}</span>
                <div className="small" style={{ margin: '4px 0 8px' }}>⚠ {reasons.join('; ')}</div>
                <div className="row" style={{ gap: 6 }}>
                  {alt.venues.slice(0, 2).map(v => <Button key={v} size="small" onClick={() => apply(s, { venue: v }, `moved to ${v}`)}>Move to {v.replace('Cape Town Training Centre – ', 'CTTC ')}</Button>)}
                  {alt.instructors.slice(0, 2).map(i => <Button key={i} size="small" onClick={() => apply(s, { instructorId: i }, `reassigned to ${iname(i)}`)}>Assign {iname(i)}</Button>)}
                  {alt.dates.slice(0, 2).map(x => <Button key={x} size="small" onClick={() => apply(s, { start: x }, `moved to ${fmtDate(x)}`)}>Move to {fmtDate(x)}</Button>)}
                  {hasEq && <Button size="small" onClick={() => apply(s, { equipment: s.equipment.filter(e => !eqNames.includes(e)) }, `released ${eqNames.join(', ')}`)}>Release {eqNames.join(', ')}</Button>}
                  {!alt.venues.length && !alt.instructors.length && !alt.dates.length && <span className="small">No free alternatives found in the next three weeks.</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
