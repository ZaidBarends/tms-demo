import { useEffect, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore, useCtx } from '../../shared/store'
import { Modal } from '../../shared/ui'
import { FSelect, FText } from '../../shared/fields'
import { addDays, today } from '../../shared/format'
import './client.css'

export interface Prefill { name?: string; email?: string; courseId?: string; learnerId?: string; title?: string }

/** One flow for "add a learner to a booking". With a learnerId it enrols an existing learner instead. */
export function AddLearnerDialog({ open, onClose, prefill }: { open: boolean; onClose: () => void; prefill?: Prefill }) {
  const d = useStore(s => s.data)
  const add = useStore(s => s.addClientLearner)
  const assign = useStore(s => s.assign)
  const { orgId } = useCtx()
  const [f, setF] = useState({ name: '', email: '', courseId: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [done, setDone] = useState('')
  useEffect(() => {
    if (open) { setF({ name: prefill?.name ?? '', email: prefill?.email ?? '', courseId: prefill?.courseId ?? '' }); setErr({}); setDone('') }
  }, [open, prefill])
  const existing = !!prefill?.learnerId

  const submit = () => {
    const e: Record<string, string> = {}
    if (f.name.trim().length < 3) e.name = 'Enter the learner’s full name'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address'
    else if (!existing && d.learners.some(l => l.email.toLowerCase() === f.email.trim().toLowerCase())) e.email = 'A learner with this email already exists'
    if (!f.courseId) e.courseId = 'Choose a course'
    setErr(e); if (Object.keys(e).length) return
    if (existing) assign([prefill!.learnerId!], f.courseId, addDays(today(), 30))
    else add(orgId, f.name.trim(), f.email.trim(), f.courseId)
    setDone(`${f.name.trim()} is booked on ${d.courses.find(c => c.id === f.courseId)?.title}.`)
    setTimeout(onClose, 700)
  }
  return (
    <Modal open={open} onClose={onClose} title={prefill?.title ?? 'Add a learner to a booking'} actions={<Button appearance="primary" onClick={submit} disabled={!!done}>{existing ? 'Book course' : 'Add learner'}</Button>}>
      <div className="form">
        <FText label="Full name" value={f.name} onChange={v => setF({ ...f, name: v })} error={err.name} disabled={existing} />
        <FText label="Work email" value={f.email} onChange={v => setF({ ...f, email: v })} error={err.email} disabled={existing} />
        <FSelect label="Course" value={f.courseId} onChange={v => setF({ ...f, courseId: v })} placeholder="Choose a course" error={err.courseId} options={d.courses.filter(c => c.status === 'Active').map(c => ({ value: c.id, label: c.title }))} />
        {done && <div className="callout" role="status">{done}</div>}
      </div>
    </Modal>
  )
}
