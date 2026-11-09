import { ReactNode, useMemo } from 'react'
import { addDays, parse, today } from '../shared/format'
import './lms.css'

/** Circular progress ring drawn with SVG. */
export function Ring({ value, size = 96, stroke = 10, color = '#0f6cbd', label, sub }: {
  value: number; size?: number; stroke?: number; color?: string; label?: ReactNode; sub?: ReactNode
}) {
  const v = Math.max(0, Math.min(100, value)); const r = (size - stroke) / 2; const c = 2 * Math.PI * r
  return (
    <div className="lms-ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#8884" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dasharray .5s' }} />
      </svg>
      <div className="lms-ring-label"><b>{label ?? `${Math.round(v)}%`}</b>{sub && <span>{sub}</span>}</div>
    </div>
  )
}

/** CSS-only celebration. Honours reduced-motion through the stylesheet. */
export function Confetti({ count = 36 }: { count?: number }) {
  const bits = useMemo(() => Array.from({ length: count }, (_, i) => ({
    left: (i * 97) % 100, delay: (i % 9) * 0.18, dur: 2.6 + (i % 5) * 0.4, rot: (i * 53) % 360,
    color: ['#0f6cbd', '#2b9bd8', '#13a10e', '#f7630c', '#8764b8', '#ffb900'][i % 6], w: 6 + (i % 3) * 3,
  })), [count])
  return (
    <div className="lms-confetti" aria-hidden>
      {bits.map((b, i) => <span key={i} style={{ left: `${b.left}%`, background: b.color, width: b.w, height: b.w * 1.6, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, transform: `rotate(${b.rot}deg)` }} />)}
    </div>
  )
}

/** Weeks-by-days heat grid of minutes learnt. */
export function Heatmap({ map, weeks = 8, endDate = today() }: { map: Record<string, number>; weeks?: number; endDate?: string }) {
  const dayOf = (d: string) => parse(d).getDay()
  const start = addDays(endDate, -(weeks * 7 - 1) - ((dayOf(endDate) + 6) % 7))
  const cells = Array.from({ length: weeks * 7 + 7 }, (_, i) => addDays(start, i)).filter(d => d <= endDate)
  return (
    <div className="lms-heat" role="img" aria-label="Learning activity over the last weeks">
      {cells.map(d => {
        const m = map[d] ?? 0; const lvl = m === 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 45 ? 3 : 4
        return <span key={d} className={`h${lvl}`} title={`${d}: ${m} min`} style={{ gridRow: ((dayOf(d) + 6) % 7) + 1 }} />
      })}
    </div>
  )
}

export function BadgeIcon({ icon, size = 28 }: { icon: string; size?: number }) {
  const glyph: Record<string, string> = { trophy: 'M7 4h10v4a5 5 0 0 1-10 0V4zm-3 1h3v3a3 3 0 0 1-3-3zm16 0h-3v3a3 3 0 0 0 3-3zM11 13h2v4h3v2H8v-2h3z', fire: 'M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z', star: 'M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.8 5.6 21.5l1.7-7.2L2 9.6 9 9z', book: 'M5 3h12a2 2 0 0 1 2 2v15H7a2 2 0 0 0-2 2zM7 5v13h10V5z', shield: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5zm-1 12l6-6-1.4-1.4L11 11.2 9.4 9.6 8 11z', people: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM2 19c0-3 3-5 7-5s7 2 7 5zm14-4c3 0 6 1.5 6 4h-5c0-1.7-.4-3-1-4z', flash: 'M13 2L4 14h6l-1 8 9-12h-6z', target: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12zm0 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z', bookmark: 'M6 3h12v18l-6-4-6 4z', note: 'M5 3h10l4 4v14H5zm9 1.5V8h3.5zM8 12h8v1.5H8zm0 3h8v1.5H8z', ribbon: 'M12 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12zM8 14l-2 8 6-3 6 3-2-8a8 8 0 0 1-8 0z', rocket: 'M12 2c4 2 6 6 6 10l-3 3H9l-3-3c0-4 2-8 6-10zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 17l-3 4 5-1zm10 0l3 4-5-1z' }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d={glyph[icon] ?? glyph.star} /></svg>
}
