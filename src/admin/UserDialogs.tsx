import { useEffect, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { Modal } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { people } from './adminData'
import type { Person } from './adminData'
import type { Data } from '../shared/types'

/** Account types an administrator can create. */
export const USER_TYPES = [
  { id: 'staff-admin', label: 'Administrator', hint: 'Full access to every screen.' },
  { id: 'staff-finance', label: 'Finance', hint: 'Invoicing, Workbook sync, finance dashboard and reports.' },
  { id: 'staff-instructor', label: 'Instructor', hint: 'Own schedule and class lists. Also appears under Facilitators.' },
  { id: 'contact', label: 'Client contact', hint: 'Signs in to the client portal for their organisation.' },
  { id: 'learner-internal', label: 'Internal learner', hint: 'Staff learner, paid by the company.' },
  { id: 'learner-b2b', label: 'B2B learner', hint: 'Employer-paid. Never visible to recruiters.' },
  { id: 'learner-b2c', label: 'B2C learner', hint: 'Self-paying. May opt in to the talent pool.' },
  { id: 'recruiter', label: 'Recruiter', hint: 'Created as pending: approve them in Talent admin before they can search.' },
] as const
type TypeId = typeof USER_TYPES[number]['id']

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// Identities the personas in this demo are built on. They can be edited but not removed.
const PERSONA_NAMES = ['Sipho Khumalo', 'Johan Botha', 'Zanele Ndlovu']
export const PERSONA_IDS = ['s1', 's2', 's3', 'c1', 'r1']

export function isProtected(d: Data, p: Person) {
  return PERSONA_IDS.includes(p.id) || (p.source === 'learner' && PERSONA_NAMES.includes(p.name))
}

/** Records that stop a user being removed, so nothing is left pointing at nobody. */
export function blockers(d: Data, p: Person): string[] {
  const out: string[] = []
  if (isProtected(d, p)) out.push('This account backs one of the demo personas.')
  if (p.source === 'learner') {
    const e = d.enrolments.filter(x => x.learnerId === p.id).length; if (e) out.push(`${e} enrolment(s)`)
    const c = d.certificates.filter(x => x.learnerId === p.id).length; if (c) out.push(`${c} certificate(s)`)
    const r = d.receipts.filter(x => x.learnerId === p.id).length; if (r) out.push(`${r} receipt(s)`)
    if (d.talent.some(x => x.learnerId === p.id)) out.push('a talent profile')
  }
  if (p.source === 'staff') {
    const s = d.sessions.filter(x => x.instructorId === p.id).length; if (s) out.push(`${s} session(s): reassign them under Facilitators first`)
    const q = d.quotes.filter(x => x.instructorId === p.id).length; if (q) out.push(`${q} quote(s)`)
  }
  if (p.source === 'recruiter' && d.intros.some(x => x.recruiterId === p.id)) out.push('introduction requests')
  return out
}

const typeOf = (p: Person): TypeId =>
  p.source === 'staff' ? (p.kind === 'Administrator' ? 'staff-admin' : p.kind === 'Finance' ? 'staff-finance' : 'staff-instructor')
    : p.source === 'contact' ? 'contact' : p.source === 'recruiter' ? 'recruiter'
      : p.kind === 'Internal learner' ? 'learner-internal' : p.kind === 'B2B learner' ? 'learner-b2b' : 'learner-b2c'

interface Form { type: TypeId; name: string; email: string; title: string; orgId: string; phone: string; city: string; company: string }
const blank = (): Form => ({ type: 'learner-b2c', name: '', email: '', title: '', orgId: '', phone: '', city: '', company: '' })

export function UserDialog({ open, person, onClose, onSaved }: { open: boolean; person: Person | null; onClose: () => void; onSaved: (msg: string, key: string) => void }) {
  const d = useStore(s => s.data)
  const [f, setF] = useState<Form>(blank())
  const [err, setErr] = useState<Record<string, string>>({})
  const editing = !!person

  useEffect(() => {
    if (!open) return
    setErr({})
    setF(person ? { type: typeOf(person), name: person.name, email: person.email, title: person.source === 'learner' || person.source === 'recruiter' ? '' : person.note, orgId: person.orgId ?? '', phone: person.phone === '–' ? '' : person.phone, city: person.source === 'learner' ? person.note : '', company: person.source === 'recruiter' ? person.org : '' } : blank())
  }, [open, person])

  const t = f.type
  const set = (k: keyof Form) => (v: string) => setF(x => ({ ...x, [k]: v }))
  const needsOrg = t === 'contact' || t === 'learner-b2b'
  const isStaff = t.startsWith('staff')
  const isLearner = t.startsWith('learner')

  const save = () => {
    const e: Record<string, string> = {}
    const name = f.name.trim(); const email = f.email.trim().toLowerCase()
    if (name.length < 2) e.name = 'Enter the full name'
    if (!EMAIL.test(email)) e.email = 'Enter a valid email address'
    else if (people(d).some(p => p.email.toLowerCase() === email && p.key !== person?.key)) e.email = 'Someone already uses this email address'
    if (needsOrg && !f.orgId) e.orgId = 'Choose the organisation'
    if (t === 'recruiter' && f.company.trim().length < 2) e.company = 'Enter the recruiter’s company'
    setErr(e); if (Object.keys(e).length) return

    const id = person?.id ?? `u-${Date.now().toString(36)}`
    useStore.setState(s => {
      const data = structuredClone(s.data)
      if (isStaff) {
        const role = t === 'staff-admin' ? 'admin' : t === 'staff-finance' ? 'finance' : 'instructor'
        const row = { id, name, email, title: f.title.trim() || USER_TYPES.find(x => x.id === t)!.label, role } as Data['staff'][number]
        const i = data.staff.findIndex(x => x.id === id); if (i >= 0) data.staff[i] = { ...row, role: data.staff[i].role }; else data.staff.push(row)
      } else if (t === 'contact') {
        const row = { id, name, email, orgId: f.orgId, title: f.title.trim() || 'Contact' }
        const i = data.contacts.findIndex(x => x.id === id); if (i >= 0) data.contacts[i] = row; else data.contacts.push(row)
      } else if (isLearner) {
        const type = t === 'learner-internal' ? 'internal' : t === 'learner-b2b' ? 'b2b' : 'b2c'
        const row = { id, name, email, type, orgId: type === 'b2b' ? f.orgId : undefined, phone: f.phone.trim() || '–', city: f.city.trim() || '–' } as Data['learners'][number]
        const i = data.learners.findIndex(x => x.id === id); if (i >= 0) data.learners[i] = { ...row, type: data.learners[i].type, orgId: data.learners[i].orgId }; else data.learners.push(row)
      } else {
        const i = data.recruiters.findIndex(x => x.id === id)
        if (i >= 0) data.recruiters[i] = { ...data.recruiters[i], name, email, company: f.company.trim() }
        else data.recruiters.push({ id, name, email, company: f.company.trim(), approved: false })
      }
      data.activity.unshift({ id: `ac${Date.now()}`, at: new Date().toISOString(), text: `User ${name} (${USER_TYPES.find(x => x.id === t)!.label}) ${editing ? 'updated' : 'added'}` })
      return { data }
    })
    const key = `${isStaff ? 's' : t === 'contact' ? 'c' : isLearner ? 'l' : 'r'}:${id}`
    onSaved(editing ? `${name} saved.` : `${name} added as ${USER_TYPES.find(x => x.id === t)!.label.toLowerCase()}.${t === 'recruiter' ? ' They are pending approval in Talent admin.' : ''}`, key)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Edit ${person!.name}` : 'Add a user'} actions={<Button appearance="primary" onClick={save}>{editing ? 'Save changes' : 'Add user'}</Button>}>
      <div className="form">
        <FSelect label="Account type" value={t} onChange={set('type')} disabled={editing} options={USER_TYPES.map(x => ({ value: x.id, label: x.label }))} />
        <div className="muted small" style={{ marginTop: -6 }}>{USER_TYPES.find(x => x.id === t)!.hint}{editing && ' The account type cannot be changed once created.'}</div>
        <FText label="Full name" value={f.name} onChange={set('name')} error={err.name} />
        <FText label="Email" type="email" value={f.email} onChange={set('email')} error={err.email} />
        {(isStaff || t === 'contact') && <FText label="Job title" value={f.title} onChange={set('title')} placeholder={isStaff ? 'e.g. Training coordinator' : 'e.g. HR manager'} />}
        {needsOrg && <FSelect label="Organisation" value={f.orgId} onChange={set('orgId')} placeholder="Choose an organisation" error={err.orgId} disabled={editing} options={d.orgs.map(o => ({ value: o.id, label: o.name }))} />}
        {isLearner && <><FText label="Phone" value={f.phone} onChange={set('phone')} /><FText label="City" value={f.city} onChange={set('city')} /></>}
        {t === 'recruiter' && <FText label="Company" value={f.company} onChange={set('company')} error={err.company} />}
      </div>
    </Modal>
  )
}

export function RemoveUserDialog({ person, onClose, onRemoved }: { person: Person | null; onClose: () => void; onRemoved: (msg: string) => void }) {
  const d = useStore(s => s.data)
  const why = person ? blockers(d, person) : []
  const confirm = () => {
    if (!person || why.length) return
    useStore.setState(s => {
      const data = structuredClone(s.data)
      data.staff = data.staff.filter(x => x.id !== person.id)
      data.contacts = data.contacts.filter(x => x.id !== person.id)
      data.learners = data.learners.filter(x => x.id !== person.id)
      data.recruiters = data.recruiters.filter(x => x.id !== person.id)
      data.activity.unshift({ id: `ac${Date.now()}`, at: new Date().toISOString(), text: `User ${person.name} removed` })
      return { data }
    })
    onRemoved(`${person.name} removed.`); onClose()
  }
  return (
    <Modal open={!!person} onClose={onClose} title={`Remove ${person?.name ?? ''}?`}
      actions={<Button appearance="primary" disabled={why.length > 0} onClick={confirm}>Remove user</Button>}>
      {why.length ? (
        <div className="callout" role="alert">{person?.name} cannot be removed while they have: {why.join('; ')}.</div>
      ) : <p>They will no longer appear in lists or be selectable. This cannot be undone, except by Reset demo.</p>}
    </Modal>
  )
}
