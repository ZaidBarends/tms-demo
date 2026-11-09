import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { ChevronLeft24Regular, ChevronRight24Regular } from '@fluentui/react-icons'
import { addDays, iso, parse, today } from '../shared/format'

export interface CalEvent { date: string; title: string; venue: string; id: string; done: boolean }
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default function BookingCalendar({ events, selected, onSelect }: { events: CalEvent[]; selected: string | null; onSelect: (date: string | null) => void }) {
  const t = parse(today())
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() })
  const first = new Date(ym.y, ym.m, 1)
  const start = addDays(iso(first), -((first.getDay() + 6) % 7))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const move = (n: number) => { const d = new Date(ym.y, ym.m + n, 1); setYm({ y: d.getFullYear(), m: d.getMonth() }) }
  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <Button icon={<ChevronLeft24Regular />} onClick={() => move(-1)} aria-label="Previous month" />
        <b aria-live="polite">{MONTHS[ym.m]} {ym.y}</b>
        <div className="row"><Button size="small" onClick={() => setYm({ y: t.getFullYear(), m: t.getMonth() })}>Today</Button><Button icon={<ChevronRight24Regular />} onClick={() => move(1)} aria-label="Next month" /></div>
      </div>
      <div className="b2c-cal" role="grid" aria-label={`${MONTHS[ym.m]} ${ym.y}`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="h" role="columnheader">{d}</div>)}
        {cells.map(date => {
          const evs = events.filter(e => e.date === date); const inMonth = parse(date).getMonth() === ym.m
          return (
            <button key={date} role="gridcell" className={`${inMonth ? '' : 'out'} ${date === today() ? 'today' : ''} ${selected === date ? 'sel' : ''}`} onClick={() => onSelect(selected === date ? null : date)} aria-label={`${date}${evs.length ? `, ${evs.length} booking${evs.length > 1 ? 's' : ''}` : ''}`}>
              <span>{parse(date).getDate()}</span>
              {evs.map(e => <i key={e.id} className={e.done ? 'done' : ''} title={e.title}>{e.title}</i>)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
