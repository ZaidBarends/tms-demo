import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, Stat } from '../shared/ui'
import { clashes } from '../shared/calc'
import { addDays, fmtShort, parse, today } from '../shared/format'
import type { Session } from '../shared/types'
import { useOps } from './ops/opsStore'
import { EQUIPMENT_ITEMS, occupancy, workdaysFrom } from './ops/logic'
import { ResolveClashModal } from './ops/ResolveClash'
import './ops/ops.css'

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
type Type = 'all' | 'Instructors' | 'Venues' | 'Equipment'

function Bar({ pct }: { pct: number }) {
  return <div className={`ops-bar ${pct > 85 ? 'bad' : pct > 65 ? 'warn' : ''}`} role="img" aria-label={`${pct}%`}><div style={{ width: `${Math.min(100, pct)}%` }} /></div>
}

export default function Resources() {
  const d = useStore(s => s.data)
  const unavailable = useOps(s => s.unavailable)
  const [off, setOff] = useState(0)
  const [type, setType] = useState<Type>('all')
  const [resolve, setResolve] = useState(false)
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), off + i))
  const cl = clashes(d)
  const instructors = d.staff.filter(s => s.role === 'instructor')
  const venues = Array.from(new Set(d.sessions.map(s => s.venue))).filter(v => !v.startsWith('Online'))
  const equipment = Array.from(new Set([...EQUIPMENT_ITEMS, ...d.sessions.flatMap(s => s.equipment)]))
  type Row = { label: string; group: Exclude<Type, 'all'>; match: (s: Session) => boolean; instId?: string }
  const rows: Row[] = [
    ...instructors.map(i => ({ label: i.name, group: 'Instructors' as const, instId: i.id, match: (s: Session) => s.instructorId === i.id })),
    ...venues.map(v => ({ label: v, group: 'Venues' as const, match: (s: Session) => s.venue === v })),
    ...equipment.map(e => ({ label: e, group: 'Equipment' as const, match: (s: Session) => s.equipment.includes(e) })),
  ].filter(r => type === 'all' || r.group === type)
  const clashCount = new Set(Object.keys(cl)).size

  const live = d.sessions.filter(s => s.status !== 'Cancelled')
  const horizon = workdaysFrom(today(), 28)
  const busyDays = (match: (s: Session) => boolean) => new Set(live.filter(match).map(s => s.start))
  const util = instructors.map(i => {
    const unav = new Set(unavailable[i.id] ?? [])
    const avail = horizon.filter(x => !unav.has(x))
    const busy = busyDays(s => s.instructorId === i.id)
    const pct = avail.length ? Math.round((avail.filter(x => busy.has(x)).length / avail.length) * 100) : 0
    return { i, pct, booked: avail.filter(x => busy.has(x)).length, avail: avail.length, off: horizon.length - avail.length }
  })
  const occ = venues.map(v => ({ v, pct: occupancy(horizon, busyDays(s => s.venue === v)) }))
  const eq = equipment.map(e => {
    const b = busyDays(s => s.equipment.includes(e))
    const inUseToday = b.has(today())
    const next = days.find(x => x >= today() && b.has(x))
    return { e, inUseToday, next, booked: horizon.filter(x => b.has(x)).length }
  })

  return (
    <>
      <PageHeader id="resources" title="Resources" subtitle="Instructors, venues and equipment. Clashes are highlighted in red."
        actions={<>
          <Button onClick={() => setOff(off - 14)}>Previous 2 weeks</Button><Button onClick={() => setOff(0)}>Today</Button><Button onClick={() => setOff(off + 14)}>Next 2 weeks</Button>
          <Button appearance="primary" disabled={clashCount === 0} onClick={() => setResolve(true)}>Resolve clashes{clashCount ? ` (${clashCount})` : ''}</Button></>} />
      {clashCount > 0 && <div className="callout" role="alert" style={{ marginBottom: 16 }}>⚠ {clashCount} sessions are involved in resource clashes across the whole schedule. Red cells show them. <Button size="small" appearance="transparent" onClick={() => setResolve(true)}>Open the resolve assistant</Button></div>}
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Sessions in clash" value={clashCount} hint="Whole schedule" />
        <Stat label="Avg instructor load" value={`${Math.round(util.reduce((a, x) => a + x.pct, 0) / Math.max(1, util.length))}%`} hint="Next 4 weeks of working days" />
        <Stat label="Avg venue occupancy" value={`${Math.round(occ.reduce((a, x) => a + x.pct, 0) / Math.max(1, occ.length))}%`} hint="Next 4 weeks" />
        <Stat label="Equipment in use today" value={eq.filter(x => x.inUseToday).length} hint={`of ${eq.length} items`} />
      </div>

      <div className="ops-toolbar">
        <div className="ops-seg" role="group" aria-label="Resource type">{(['all', 'Instructors', 'Venues', 'Equipment'] as Type[]).map(t => <button key={t} aria-pressed={type === t} onClick={() => setType(t)}>{t === 'all' ? 'All resources' : t}</button>)}</div>
      </div>
      <Card>
        <div className="ops-cal-res"><div className="cal" style={{ gridTemplateColumns: `200px repeat(14, minmax(70px, 1fr))` }} role="table" aria-label="Resource calendar">
          <div className="h">Resource</div>
          {days.map(x => <div key={x} className="h">{WD[parse(x).getDay()]}<br />{fmtShort(x)}</div>)}
          {rows.map((r, ri) => (
            <Fragment key={r.group + r.label}>
              {(ri === 0 || rows[ri - 1].group !== r.group) && <div className="h" style={{ gridColumn: '1 / -1', textAlign: 'left' }}>{r.group}</div>}
              <div className="rowh">{r.label}</div>
              {days.map(day => {
                const ss = d.sessions.filter(s => s.start === day && s.status !== 'Cancelled' && r.match(s))
                const clash = ss.length > 1
                const off = r.instId && (unavailable[r.instId] ?? []).includes(day)
                return (
                  <div key={r.label + day} className={clash ? 'clash' : ss.length ? 'busy' : off ? 'unav' : ''} title={off ? 'Marked unavailable' : undefined}>
                    {ss.map(s => <div key={s.id}><Link to={`/sessions/${s.id}`} style={{ color: 'inherit' }}>{d.courses.find(c => c.id === s.courseId)?.code}</Link></div>)}
                    {clash && <span className="small">Clash</span>}{off && !ss.length && <span className="small">Off</span>}
                  </div>
                )
              })}
            </Fragment>
          ))}
        </div></div>
        <div className="ops-legend"><span><span className="ops-dot" style={{ background: '#dbeafe' }} />Booked</span><span><span className="ops-dot" style={{ background: '#fbd5d1' }} />Clash</span><span><span className="ops-dot" style={{ background: 'repeating-linear-gradient(45deg,#f5f7f2,#f5f7f2 2px,#dfe5d9 2px,#dfe5d9 4px)' }} />Instructor unavailable</span><span><span className="ops-dot" style={{ background: 'var(--card)', border: '1px solid var(--line)' }} />Free</span></div>
      </Card>

      <div className="grid c3">
        {(type === 'all' || type === 'Instructors') && (
          <Card title="Instructor utilisation">
            {util.map(({ i, pct, booked, avail, off }) => (
              <div key={i.id} className="ops-util"><span>{i.name}</span><Bar pct={pct} /><b>{pct}%</b>
                <span className="muted small" style={{ gridColumn: '1 / -1', marginTop: -4 }}>{booked} of {avail} available days booked{off ? `, ${off} marked off` : ''}</span></div>
            ))}
          </Card>
        )}
        {(type === 'all' || type === 'Venues') && (
          <Card title="Venue occupancy">
            {occ.map(({ v, pct }) => <div key={v} className="ops-util"><span className="small">{v.replace('Cape Town Training Centre – ', 'CTTC ')}</span><Bar pct={pct} /><b>{pct}%</b></div>)}
            <p className="muted small" style={{ marginBottom: 0 }}>Share of the next 20 working days with a session.</p>
          </Card>
        )}
        {(type === 'all' || type === 'Equipment') && (
          <Card title="Equipment availability">
            <table className="tbl"><tbody>{eq.map(x => (
              <tr key={x.e}><td>{x.e}</td><td><span className={`ops-pill ${x.inUseToday ? 'warn' : 'ok'}`}>{x.inUseToday ? 'In use today' : 'Available today'}</span></td>
                <td className="muted small">{x.next && !x.inUseToday ? `Next use ${fmtShort(x.next)}` : `${x.booked} days booked`}</td></tr>
            ))}</tbody></table>
          </Card>
        )}
      </div>
      <ResolveClashModal open={resolve} onClose={() => setResolve(false)} />
    </>
  )
}
