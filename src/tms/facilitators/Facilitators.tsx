import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Checkbox } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { PageHeader, Card, EmptyState, Modal, Stat, Status } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { fmtDate, money, today } from '../../shared/format'
import { downloadCsv } from '../ops/download'
import { blankExtra, FacilitatorExtra, useFacilitators } from './store'
import type { Staff } from '../../shared/types'

const CATS = ['Health & Safety', 'Leadership', 'Project Management', 'Finance Skills', 'Cybersecurity', 'Compliance', 'Soft Skills']
const PROTECTED = 's3' // Naledi Dlamini is the Instructor persona in this demo

interface Draft { id: string; name: string; title: string; email: string; x: FacilitatorExtra }

export default function Facilitators() {
  const d = useStore(s => s.data)
  const extras = useFacilitators(s => s.extras)
  const setExtra = useFacilitators(s => s.setExtra)
  const removeExtra = useFacilitators(s => s.removeExtra)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [spec, setSpec] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [err, setErr] = useState<Record<string, string>>({})
  const [del, setDel] = useState<Staff | null>(null)
  const [reassign, setReassign] = useState('')
  const [info, setInfo] = useState('')

  const people = d.staff.filter(s => s.role === 'instructor')
  const now = today()
  const stats = (id: string) => {
    const ss = d.sessions.filter(s => s.instructorId === id)
    const upcoming = ss.filter(s => s.start >= now && s.status === 'Scheduled')
    const learners = upcoming.reduce((a, s) => a + d.enrolments.filter(e => e.sessionId === s.id).length, 0)
    return { all: ss.length, upcoming: upcoming.length, next: upcoming.sort((a, b) => a.start.localeCompare(b.start))[0]?.start, learners, quotes: d.quotes.filter(x => x.instructorId === id).length }
  }

  const list = useMemo(() => people.filter(p => {
    const x = extras[p.id] ?? blankExtra()
    return (!status || x.status === status) && (!spec || x.specialties.includes(spec))
      && (p.name + p.email + p.title + x.city + x.specialties.join(' ')).toLowerCase().includes(q.toLowerCase())
  }), [people, extras, q, status, spec])

  const openNew = () => { setErr({}); setIsNew(true); setDraft({ id: `s-${Date.now().toString(36)}`, name: '', title: 'Trainer', email: '', x: blankExtra() }) }
  const openEdit = (p: Staff) => { setErr({}); setIsNew(false); setDraft({ id: p.id, name: p.name, title: p.title, email: p.email, x: structuredClone(extras[p.id] ?? blankExtra()) }) }

  const save = () => {
    if (!draft) return
    const e: Record<string, string> = {}
    if (draft.name.trim().length < 3) e.name = 'Enter the facilitator’s full name'
    if (!/^\S+@\S+\.\S+$/.test(draft.email)) e.email = 'Enter a valid email address'
    if (d.staff.some(s => s.id !== draft.id && s.email.toLowerCase() === draft.email.toLowerCase())) e.email = 'That email is already used by another staff member'
    if (draft.x.dayRate <= 0) e.rate = 'Enter a day rate above R0'
    if (draft.x.specialties.length === 0) e.spec = 'Choose at least one specialty'
    setErr(e); if (Object.keys(e).length) return
    useStore.setState(s => {
      const data = structuredClone(s.data)
      const rec = { id: draft.id, name: draft.name.trim(), role: 'instructor' as const, title: draft.title.trim() || 'Trainer', email: draft.email.trim() }
      const i = data.staff.findIndex(x => x.id === draft.id)
      if (i >= 0) data.staff[i] = rec; else data.staff.push(rec)
      data.activity.unshift({ id: `ac${Date.now()}`, at: new Date().toISOString(), text: `Facilitator ${rec.name} ${i >= 0 ? 'updated' : 'added'}` })
      return { data }
    })
    setExtra(draft.id, draft.x)
    setInfo(`${draft.name.trim()} ${isNew ? 'added' : 'saved'}.`)
    setDraft(null)
  }

  const delStats = del ? stats(del.id) : null
  const others = del ? people.filter(p => p.id !== del.id && (extras[p.id]?.status ?? 'Active') !== 'Inactive') : []
  const needsReassign = !!delStats && (delStats.upcoming > 0 || delStats.quotes > 0)
  const confirmDelete = () => {
    if (!del) return
    if (needsReassign && !reassign) return
    useStore.setState(s => {
      const data = structuredClone(s.data)
      if (reassign) {
        data.sessions.forEach(x => { if (x.instructorId === del.id && x.start >= now) x.instructorId = reassign })
        data.quotes.forEach(x => { if (x.instructorId === del.id) x.instructorId = reassign })
      }
      // past sessions keep their history: hand them to the replacement too, so no dangling references remain
      const fallback = reassign || data.staff.find(x => x.role === 'instructor' && x.id !== del.id)?.id || ''
      data.sessions.forEach(x => { if (x.instructorId === del.id) x.instructorId = fallback })
      data.quotes.forEach(x => { if (x.instructorId === del.id) x.instructorId = fallback })
      data.staff = data.staff.filter(x => x.id !== del.id)
      data.activity.unshift({ id: `ac${Date.now()}`, at: new Date().toISOString(), text: `Facilitator ${del.name} removed${reassign ? `; sessions reassigned to ${data.staff.find(x => x.id === reassign)?.name}` : ''}` })
      return { data }
    })
    removeExtra(del.id)
    setInfo(`${del.name} removed.`); setDel(null); setReassign('')
  }

  const setStat = (p: Staff, st: FacilitatorExtra['status']) => setExtra(p.id, { ...(extras[p.id] ?? blankExtra()), status: st })
  const active = people.filter(p => (extras[p.id]?.status ?? 'Active') === 'Active').length

  return (
    <>
      <PageHeader id="facilitators" title="Facilitators" subtitle="Add, edit and remove the trainers who deliver your courses"
        actions={<><Button onClick={() => downloadCsv('facilitators.csv', [['Name', 'Title', 'Email', 'Phone', 'City', 'Status', 'Specialties', 'Day rate', 'Upcoming sessions'], ...people.map(p => { const x = extras[p.id] ?? blankExtra(); return [p.name, p.title, p.email, x.phone, x.city, x.status, x.specialties.join('; '), x.dayRate, stats(p.id).upcoming] })])}>Export CSV</Button><Button appearance="primary" onClick={openNew}>Add facilitator</Button></>} />
      {info && <div className="callout" role="status" style={{ marginBottom: 14 }}>{info}</div>}
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Facilitators" value={people.length} hint={`${active} active`} />
        <Stat label="Upcoming sessions" value={people.reduce((a, p) => a + stats(p.id).upcoming, 0)} hint="Across all facilitators" />
        <Stat label="Learners booked" value={people.reduce((a, p) => a + stats(p.id).learners, 0)} hint="On upcoming sessions" />
        <Stat label="Average day rate" value={people.length ? money(Math.round(people.reduce((a, p) => a + (extras[p.id]?.dayRate ?? 0), 0) / people.length)) : '–'} />
      </div>
      <Card>
        <div className="form c2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <FText label="Search" value={q} onChange={setQ} placeholder="Name, email, city or specialty" />
          <FSelect label="Status" value={status} onChange={setStatus} placeholder="Any status" options={['Active', 'On leave', 'Inactive'].map(x => ({ value: x, label: x }))} />
          <FSelect label="Specialty" value={spec} onChange={setSpec} placeholder="Any specialty" options={CATS.map(x => ({ value: x, label: x }))} />
        </div>
      </Card>
      {list.length === 0 ? <EmptyState title={people.length === 0 ? 'No facilitators yet' : 'No facilitators match'} text="Add a facilitator to start assigning sessions." action={<Button appearance="primary" onClick={openNew}>Add facilitator</Button>} /> : (
        <div className="grid c3">
          {list.map(p => {
            const x = extras[p.id] ?? blankExtra(); const st = stats(p.id)
            return (
              <div className="card" key={p.id} style={{ marginBottom: 0 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div className="row"><span className="avatar" aria-hidden>{p.name[0]}</span><div><b>{p.name}</b><div className="muted small">{p.title}{x.city ? ` · ${x.city}` : ''}</div></div></div>
                  <Status s={x.status === 'Active' ? 'Active' : x.status === 'On leave' ? 'Pending' : 'Retired'} />
                </div>
                <div className="chips" style={{ margin: '10px 0' }}>{x.specialties.map(s => <span className="chip" key={s}>{s}</span>)}</div>
                <p className="muted small" style={{ minHeight: 36 }}>{x.bio || 'No bio yet.'}</p>
                <table className="tbl"><tbody>
                  <tr><td>Email</td><td>{p.email}</td></tr>
                  <tr><td>Phone</td><td>{x.phone || '–'}</td></tr>
                  <tr><td>Day rate</td><td>{money(x.dayRate)}</td></tr>
                  <tr><td>Upcoming</td><td>{st.upcoming} session{st.upcoming === 1 ? '' : 's'}{st.next ? `, next ${fmtDate(st.next)}` : ''}</td></tr>
                </tbody></table>
                <div className="row" style={{ marginTop: 10 }}>
                  <Button size="small" onClick={() => openEdit(p)}>Edit</Button>
                  <Link to="/calendar"><Button size="small">Calendar</Button></Link>
                  {x.status !== 'Active' ? <Button size="small" onClick={() => setStat(p, 'Active')}>Mark active</Button> : <Button size="small" onClick={() => setStat(p, 'On leave')}>Put on leave</Button>}
                  <Button size="small" appearance="subtle" disabled={p.id === PROTECTED} title={p.id === PROTECTED ? 'This facilitator is the Instructor persona in the demo' : ''} onClick={() => { setDel(p); setReassign('') }}>Delete</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={!!draft} onClose={() => setDraft(null)} title={isNew ? 'Add facilitator' : 'Edit facilitator'} wide actions={<Button appearance="primary" onClick={save}>{isNew ? 'Add facilitator' : 'Save changes'}</Button>}>
        {draft && (
          <div className="form c2">
            <FText label="Full name" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} error={err.name} />
            <FText label="Title" value={draft.title} onChange={v => setDraft({ ...draft, title: v })} />
            <FText label="Email" value={draft.email} onChange={v => setDraft({ ...draft, email: v })} error={err.email} />
            <FText label="Phone" value={draft.x.phone} onChange={v => setDraft({ ...draft, x: { ...draft.x, phone: v } })} />
            <FText label="City" value={draft.x.city} onChange={v => setDraft({ ...draft, x: { ...draft.x, city: v } })} />
            <FText label="Day rate (R, ex VAT)" type="number" value={draft.x.dayRate} onChange={v => setDraft({ ...draft, x: { ...draft.x, dayRate: Number(v) } })} error={err.rate} />
            <FSelect label="Status" value={draft.x.status} onChange={v => setDraft({ ...draft, x: { ...draft.x, status: v as FacilitatorExtra['status'] } })} options={['Active', 'On leave', 'Inactive'].map(x => ({ value: x, label: x }))} />
            <FText label="Accreditation" value={draft.x.accreditation} onChange={v => setDraft({ ...draft, x: { ...draft.x, accreditation: v } })} />
            <fieldset style={{ gridColumn: '1 / -1', border: '1px solid var(--line)', borderRadius: 8, padding: 10 }}>
              <legend>Specialties</legend>
              <div className="row">{CATS.map(c => <Checkbox key={c} label={c} checked={draft.x.specialties.includes(c)} onChange={(_, v) => setDraft({ ...draft, x: { ...draft.x, specialties: v.checked ? [...draft.x.specialties, c] : draft.x.specialties.filter(s => s !== c) } })} />)}</div>
              {err.spec && <div className="err" role="alert">{err.spec}</div>}
            </fieldset>
            <div style={{ gridColumn: '1 / -1' }}><FArea label="Short bio" value={draft.x.bio} onChange={v => setDraft({ ...draft, x: { ...draft.x, bio: v } })} rows={3} /></div>
          </div>
        )}
      </Modal>

      <Modal open={!!del} onClose={() => setDel(null)} title={`Delete ${del?.name}?`}
        actions={<Button appearance="primary" disabled={needsReassign && !reassign} onClick={confirmDelete}>Delete facilitator</Button>}>
        {del && delStats && (
          <div className="form">
            <p>This removes the facilitator from the demo. It cannot be undone, except with Reset demo.</p>
            {needsReassign ? (
              <>
                <div className="callout" role="alert">{del.name} has {delStats.upcoming} upcoming session(s) and {delStats.quotes} quote(s). Choose who takes them over.</div>
                <FSelect label="Reassign to" value={reassign} onChange={setReassign} placeholder="Choose a facilitator" options={others.map(o => ({ value: o.id, label: o.name }))} />
                {others.length === 0 && <div className="err">There is no other active facilitator to hand over to. Add one first.</div>}
              </>
            ) : <p className="muted">No upcoming sessions or quotes are assigned, so nothing needs reassigning. Past sessions keep their record.</p>}
          </div>
        )}
      </Modal>
    </>
  )
}
