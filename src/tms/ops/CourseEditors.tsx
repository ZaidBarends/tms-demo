import { useState } from 'react'
import { Button, Input, Select } from '@fluentui/react-components'
import { Card } from '../../shared/ui'
import { money } from '../../shared/format'
import type { Course } from '../../shared/types'
import { uid, useOps, defaultCourseExtra, type CourseExtra, type Lesson, type Tier } from './opsStore'
import { useStore } from '../../shared/store'

export function useCourseExtra(c: Course): CourseExtra {
  const x = useOps(s => s.course[c.id])
  return x ?? defaultCourseExtra(c.hours)
}

const KINDS: Lesson['kind'][] = ['Lecture', 'Practical', 'Discussion', 'Assessment']
const fmtMin = (m: number) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`

export function CurriculumEditor({ course }: { course: Course }) {
  const stored = useCourseExtra(course)
  const setCourse = useOps(s => s.setCourse)
  const [lessons, setLessons] = useState<Lesson[]>(stored.lessons)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const total = lessons.reduce((a, l) => a + (Number(l.minutes) || 0), 0)
  const set = (i: number, p: Partial<Lesson>) => { setMsg(''); setLessons(lessons.map((l, k) => (k === i ? { ...l, ...p } : l))) }
  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= lessons.length) return; const c = [...lessons]; [c[i], c[j]] = [c[j], c[i]]; setLessons(c); setMsg('') }
  const save = () => {
    if (lessons.length === 0) { setErr('Add at least one lesson'); return }
    if (lessons.some(l => l.title.trim().length < 2)) { setErr('Every lesson needs a title'); return }
    if (lessons.some(l => !(Number(l.minutes) >= 5))) { setErr('Every lesson needs at least 5 minutes'); return }
    setErr(''); setCourse(course.id, { ...stored, lessons }); setMsg('Curriculum saved.')
    useStore.getState().log(`Curriculum updated for ${course.title}`)
  }
  const diff = total - course.hours * 60
  return (
    <Card title="Lesson outline" actions={<Button size="small" onClick={() => { setLessons([...lessons, { id: uid('l'), title: '', minutes: 30, kind: 'Lecture' }]); setMsg('') }}>Add lesson</Button>}>
      {err && <div className="err" role="alert">{err}</div>}
      {lessons.map((l, i) => (
        <div key={l.id} className="ops-lesson">
          <span className="muted small">{i + 1}</span>
          <Input aria-label={`Lesson ${i + 1} title`} value={l.title} onChange={(_, x) => set(i, { title: x.value })} placeholder="Lesson title" />
          <Input type="number" aria-label={`Lesson ${i + 1} minutes`} value={String(l.minutes)} onChange={(_, x) => set(i, { minutes: Number(x.value) })} contentAfter={<span className="small muted">min</span>} />
          <Select aria-label={`Lesson ${i + 1} type`} value={l.kind} onChange={(_, x) => set(i, { kind: x.value as Lesson['kind'] })}>{KINDS.map(k => <option key={k}>{k}</option>)}</Select>
          <span className="row" style={{ gap: 2, flexWrap: 'nowrap' }}>
            <Button size="small" appearance="subtle" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move lesson ${i + 1} up`}>↑</Button>
            <Button size="small" appearance="subtle" onClick={() => move(i, 1)} disabled={i === lessons.length - 1} aria-label={`Move lesson ${i + 1} down`}>↓</Button>
            <Button size="small" appearance="subtle" onClick={() => { setLessons(lessons.filter((_, k) => k !== i)); setMsg('') }} aria-label={`Remove lesson ${i + 1}`}>✕</Button>
          </span>
        </div>
      ))}
      <div className="row" style={{ marginTop: 12 }}>
        <Button appearance="primary" onClick={save}>Save curriculum</Button>
        <span className={diff === 0 ? 'muted' : 'err'}>{fmtMin(total)} planned of {course.hours}h course length{diff !== 0 ? ` (${diff > 0 ? '+' : '−'}${fmtMin(Math.abs(diff))})` : ''}</span>
        {msg && <span role="status" className="muted">{msg}</span>}
      </div>
    </Card>
  )
}

export function PricingEditor({ course }: { course: Course }) {
  const stored = useCourseExtra(course)
  const setCourse = useOps(s => s.setCourse)
  const [tiers, setTiers] = useState<Tier[]>(stored.tiers)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const set = (i: number, p: Partial<Tier>) => { setMsg(''); setTiers(tiers.map((t, k) => (k === i ? { ...t, ...p } : t))) }
  const save = () => {
    if (tiers.some(t => t.name.trim().length < 2)) { setErr('Every tier needs a name'); return }
    if (tiers.some(t => !(t.minSeats >= 1) || t.discountPct < 0 || t.discountPct > 60)) { setErr('Minimum seats must be 1+ and discounts between 0 and 60%'); return }
    const sorted = [...tiers].sort((a, b) => a.minSeats - b.minSeats)
    setErr(''); setTiers(sorted); setCourse(course.id, { ...stored, tiers: sorted }); setMsg('Pricing tiers saved.')
  }
  return (
    <Card title="Pricing tiers" actions={<Button size="small" onClick={() => setTiers([...tiers, { id: uid('t'), name: '', minSeats: 50, discountPct: 20 }])}>Add tier</Button>}>
      <p className="muted small">List price is {money(course.price)} per seat excluding VAT. Tiers apply automatically as a volume discount suggestion in quotes.</p>
      {err && <div className="err" role="alert">{err}</div>}
      <div className="tbl-wrap"><table className="tbl">
        <thead><tr><th>Tier</th><th>From seats</th><th>Discount %</th><th className="num">Per seat</th><th className="num">Example total (excl. VAT)</th><th /></tr></thead>
        <tbody>{tiers.map((t, i) => {
          const per = Math.round(course.price * (1 - t.discountPct / 100))
          return (
            <tr key={t.id}>
              <td><Input aria-label={`Tier ${i + 1} name`} value={t.name} onChange={(_, x) => set(i, { name: x.value })} /></td>
              <td style={{ width: 110 }}><Input type="number" aria-label={`Tier ${i + 1} minimum seats`} value={String(t.minSeats)} onChange={(_, x) => set(i, { minSeats: Number(x.value) })} /></td>
              <td style={{ width: 110 }}><Input type="number" aria-label={`Tier ${i + 1} discount`} value={String(t.discountPct)} onChange={(_, x) => set(i, { discountPct: Number(x.value) })} /></td>
              <td className="num">{money(per)}</td><td className="num">{money(per * Math.max(1, t.minSeats))}</td>
              <td><Button size="small" appearance="subtle" disabled={tiers.length === 1} onClick={() => { setTiers(tiers.filter((_, k) => k !== i)); setMsg('') }} aria-label={`Remove tier ${i + 1}`}>Remove</Button></td>
            </tr>
          )
        })}</tbody>
      </table></div>
      <div className="row" style={{ marginTop: 12 }}><Button appearance="primary" onClick={save}>Save tiers</Button>{msg && <span role="status" className="muted">{msg}</span>}</div>
    </Card>
  )
}
