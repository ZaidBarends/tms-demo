import { useEffect, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { Modal } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { money } from '../shared/format'
import type { Journey } from '../shared/types'

/** Create / edit a learning journey: a goal plus an ordered list of courses. Pass journey=null with open=true to create. */
export function JourneyBuilder({ open, journey, onClose, onSaved }: { open: boolean; journey: Journey | null; onClose: () => void; onSaved: (msg: string) => void }) {
  const d = useStore(s => s.data)
  const [goal, setGoal] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [pick, setPick] = useState('')
  const [err, setErr] = useState<{ goal?: string; courses?: string }>({})

  useEffect(() => {
    if (open) { setGoal(journey?.goal ?? ''); setIds(journey?.courseIds ?? []); setPick(''); setErr({}) }
  }, [open, journey])

  const courses = ids.map(id => d.courses.find(c => c.id === id)).filter(Boolean) as typeof d.courses
  const hours = courses.reduce((a, c) => a + c.hours, 0)
  const price = courses.reduce((a, c) => a + c.price, 0)
  const available = d.courses.filter(c => c.status !== 'Retired' && !ids.includes(c.id))

  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= ids.length) return; const n = [...ids];[n[i], n[j]] = [n[j], n[i]]; setIds(n) }
  const add = (id: string) => { if (id) { setIds([...ids, id]); setPick(''); setErr({ ...err, courses: undefined }) } }

  const save = () => {
    const e: typeof err = {}
    const g = goal.trim()
    if (g.length < 3) e.goal = 'Give the journey a goal of at least 3 characters'
    else if (d.journeys.some(j => j.id !== journey?.id && j.goal.toLowerCase() === g.toLowerCase())) e.goal = 'Another journey already has this goal'
    if (ids.length < 2) e.courses = 'Add at least two courses to make a path'
    setErr(e); if (Object.keys(e).length) return
    useStore.setState(s => {
      const data = structuredClone(s.data)
      if (journey) { const x = data.journeys.find(j => j.id === journey.id); if (x) { x.goal = g; x.courseIds = ids } }
      else data.journeys.push({ id: `j-${Date.now().toString(36)}`, goal: g, courseIds: ids })
      data.activity.unshift({ id: `ac${Date.now()}`, at: new Date().toISOString(), text: `Learning journey “${g}” ${journey ? 'updated' : 'created'}` })
      return { data }
    })
    onSaved(`Journey “${g}” ${journey ? 'saved' : 'created'}.`); onClose()
  }

  return (
    <Modal open={open} onClose={onClose} wide title={journey ? 'Edit learning journey' : 'New learning journey'} actions={<Button appearance="primary" onClick={save}>{journey ? 'Save journey' : 'Create journey'}</Button>}>
      <div className="form">
        <FText label="Goal" value={goal} onChange={setGoal} error={err.goal} placeholder="e.g. Become a safety officer" />
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <FSelect label="Add a course to the path" value={pick} onChange={v => add(v)} placeholder="Choose a course…" options={available.map(c => ({ value: c.id, label: `${c.code} ${c.title} (${money(c.price)})` }))} />
          </div>
        </div>
        {err.courses && <div className="err" role="alert">{err.courses}</div>}
        {courses.length === 0 ? <div className="muted">No courses yet. The order you add them in is the order learners follow.</div> : (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }} aria-label="Courses in this journey, in order">
            {courses.map((c, i) => (
              <li key={c.id} className="row" style={{ justifyContent: 'space-between', padding: '8px 12px', marginBottom: 6, border: '1px solid var(--line)', borderRadius: 8 }}>
                <span><b>{i + 1}.</b> {c.title} <span className="muted small">{c.hours} hrs · {money(c.price)}</span></span>
                <span className="row" style={{ gap: 4 }}>
                  <Button size="small" appearance="subtle" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${c.title} up`}>↑</Button>
                  <Button size="small" appearance="subtle" disabled={i === courses.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${c.title} down`}>↓</Button>
                  <Button size="small" appearance="subtle" onClick={() => setIds(ids.filter(x => x !== c.id))} aria-label={`Remove ${c.title}`}>Remove</Button>
                </span>
              </li>
            ))}
          </ol>
        )}
        <div className="muted small">{courses.length} course(s) · about {hours} hours · {money(price)} ex VAT in total</div>
      </div>
    </Modal>
  )
}

export function DeleteJourney({ journey, onClose, onDeleted }: { journey: Journey | null; onClose: () => void; onDeleted: (msg: string) => void }) {
  const d = useStore(s => s.data)
  const learners = journey ? new Set(d.enrolments.filter(e => journey.courseIds.includes(e.courseId)).map(e => e.learnerId)).size : 0
  const confirm = () => {
    if (!journey) return
    useStore.setState(s => {
      const data = structuredClone(s.data)
      data.journeys = data.journeys.filter(j => j.id !== journey.id)
      data.activity.unshift({ id: `ac${Date.now()}`, at: new Date().toISOString(), text: `Learning journey “${journey.goal}” deleted` })
      return { data }
    })
    onDeleted(`Journey “${journey.goal}” deleted. Learners keep the courses they were already enrolled in.`); onClose()
  }
  return (
    <Modal open={!!journey} onClose={onClose} title={`Delete “${journey?.goal}”?`} actions={<Button appearance="primary" onClick={confirm}>Delete journey</Button>}>
      <p>The path is removed for everyone. {learners > 0 ? `${learners} learner(s) are enrolled in at least one of its courses; those enrolments are not affected.` : 'Nobody is enrolled in these courses through it.'}</p>
      <p className="muted small">Reset demo brings the original journeys back.</p>
    </Modal>
  )
}
