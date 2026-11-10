import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Input, Select } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, EmptyState, Status, Modal, Stat } from '../shared/ui'
import { FArea, FSelect, FText } from '../shared/fields'
import { fmtDate, money, today } from '../shared/format'
import { seatsTaken } from '../shared/calc'
import type { Course, Session } from '../shared/types'
import { SessionFormModal } from './ops/SessionForm'
import { SKILL_AREAS } from './ops/logic'
import { defaultVenue } from './resources/registry'
import { downloadCsv } from './ops/download'
import './ops/ops.css'

type SortKey = 'code' | 'title' | 'price' | 'sessions' | 'fill'

export default function Courses() {
  const d = useStore(s => s.data)
  const saveCourse = useStore(s => s.saveCourse)
  const [edit, setEdit] = useState<(Course & { skillsText: string }) | null>(null)
  const [sched, setSched] = useState<Session | null>(null)
  const [err, setErr] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'code', dir: 1 })

  const newCourse = () => ({ id: `k-${Date.now()}`, code: '', title: '', category: SKILL_AREAS[0], soft: false, price: 0, hours: 8, status: 'Draft' as const, description: '', skills: [], skillsText: '' })
  const newSession = (courseId: string): Session => ({ id: `x-${Date.now()}`, courseId, start: today(), venue: defaultVenue(), instructorId: 's3', capacity: 12, equipment: [], status: 'Scheduled' })

  const info = (c: Course) => {
    const ss = d.sessions.filter(s => s.courseId === c.id && s.status !== 'Cancelled')
    const up = ss.filter(s => s.start >= today()).sort((a, b) => a.start.localeCompare(b.start))
    const cap = up.reduce((a, s) => a + s.capacity, 0); const taken = up.reduce((a, s) => a + seatsTaken(d, s.id), 0)
    return { all: d.sessions.filter(s => s.courseId === c.id).sort((a, b) => a.start.localeCompare(b.start)), up, cap, taken, fill: cap ? Math.round((taken / cap) * 100) : 0 }
  }
  const list = d.courses.filter(c => (!cat || c.category === cat) && (!status || c.status === status)
    && (!q.trim() || `${c.code} ${c.title} ${c.category} ${c.skills.join(' ')}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => {
      const va = sort.key === 'sessions' ? info(a).up.length : sort.key === 'fill' ? info(a).fill : a[sort.key as 'code']
      const vb = sort.key === 'sessions' ? info(b).up.length : sort.key === 'fill' ? info(b).fill : b[sort.key as 'code']
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir
    })
  const th = (key: SortKey, label: string, num = false) => (
    <th className={num ? 'num' : ''} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button style={{ all: 'unset', cursor: 'pointer' }} onClick={() => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>{label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button>
    </th>
  )

  const submitCourse = () => {
    if (!edit) return
    const e: Record<string, string> = {}
    if (!edit.code.trim()) e.code = 'Code is required'
    else if (d.courses.some(c => c.id !== edit.id && c.code.toLowerCase() === edit.code.trim().toLowerCase())) e.code = 'That code is already used'
    if (edit.title.trim().length < 3) e.title = 'Title is required'
    if (!(edit.price > 0)) e.price = 'Enter a price above R0'
    if (!(edit.hours >= 1)) e.hours = 'Hours must be at least 1'
    setErr(e); if (Object.keys(e).length) return
    const { skillsText, ...c } = edit
    saveCourse({ ...c, code: c.code.trim(), title: c.title.trim(), soft: c.category === 'Soft Skills', skills: skillsText.split(',').map(x => x.trim()).filter(Boolean) })
    useStore.getState().log(`Course ${c.title} saved`); setEdit(null)
  }
  const upcomingTotal = d.sessions.filter(s => s.start >= today() && s.status === 'Scheduled').length
  const allCap = d.courses.reduce((a, c) => a + info(c).cap, 0); const allTaken = d.courses.reduce((a, c) => a + info(c).taken, 0)
  const filtered = !!(q || cat || status)
  const actions = (c: Course) => (
    <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
      <Link to={`/course/${c.id}`}><Button size="small" appearance="primary">Open</Button></Link>
      <Button size="small" onClick={() => { setErr({}); setEdit({ ...structuredClone(c), skillsText: c.skills.join(', ') }) }}>Edit</Button>
      <Button size="small" onClick={() => setSched(newSession(c.id))}>Schedule</Button>
    </div>
  )

  return (
    <>
      <PageHeader id="courses" title="Courses" subtitle="Catalogue, sessions, capacity and price"
        actions={<>
          <Button onClick={() => downloadCsv('courses.csv', [['Code', 'Title', 'Category', 'Hours', 'Price ex VAT', 'Status', 'Upcoming sessions', 'Fill %'], ...list.map(c => [c.code, c.title, c.category, c.hours, c.price, c.status, info(c).up.length, info(c).fill])])}>Export CSV</Button>
          <Button appearance="primary" onClick={() => { setErr({}); setEdit(newCourse()) }}>New course</Button></>} />
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Active courses" value={d.courses.filter(c => c.status === 'Active').length} hint={`${d.courses.length} in the catalogue`} />
        <Stat label="Upcoming sessions" value={upcomingTotal} />
        <Stat label="Seats booked" value={`${allTaken}/${allCap}`} hint="Across upcoming sessions" />
        <Stat label="Overall fill rate" value={`${allCap ? Math.round((allTaken / allCap) * 100) : 0}%`} />
      </div>
      <div className="ops-toolbar">
        <div className="ops-search"><Input style={{ width: '100%' }} type="search" aria-label="Search courses" placeholder="Search code, title or skill" value={q} onChange={(_, x) => setQ(x.value)} /></div>
        <Select className="ops-sel" aria-label="Filter by category" value={cat} onChange={(_, x) => setCat(x.value)}><option value="">All categories</option>{SKILL_AREAS.map(c => <option key={c}>{c}</option>)}</Select>
        <Select className="ops-sel" aria-label="Filter by status" value={status} onChange={(_, x) => setStatus(x.value)}><option value="">Any status</option>{['Active', 'Draft', 'Retired'].map(c => <option key={c}>{c}</option>)}</Select>
        {view === 'cards' && <Select className="ops-sel" aria-label="Sort courses" value={`${sort.key}`} onChange={(_, x) => setSort({ key: x.value as SortKey, dir: x.value === 'fill' ? -1 : 1 })}><option value="code">Sort by code</option><option value="title">Sort by title</option><option value="price">Sort by price</option><option value="fill">Sort by fill rate</option></Select>}
        {filtered && <Button appearance="subtle" onClick={() => { setQ(''); setCat(''); setStatus('') }}>Clear filters</Button>}
        <span className="spacer" />
        <div className="ops-seg" role="group" aria-label="View"><button aria-pressed={view === 'table'} onClick={() => setView('table')}>Table</button><button aria-pressed={view === 'cards'} onClick={() => setView('cards')}>Cards</button></div>
      </div>

      {list.length === 0 ? <EmptyState title={d.courses.length ? 'No courses match' : 'No courses yet'} text="Try different filters, or create a course." /> : view === 'cards' ? (
        <div className="grid c3">{list.map(c => { const i = info(c); return (
          <div key={c.id} className="ops-course-card">
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted small">{c.code} · {c.category}</span><Status s={c.status} /></div>
            <b><Link to={`/course/${c.id}`}>{c.title}</Link></b>
            <span className="muted small">{c.description}</span>
            <div className="chips">{c.skills.map(s => <span key={s} className="chip">{s}</span>)}</div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>{money(c.price)} <span className="muted small">ex VAT · {c.hours}h</span></span><span className="muted small">{i.up.length} upcoming · {i.fill}% full</span></div>
            {actions(c)}
          </div>) })}</div>
      ) : (
        <Card><div className="tbl-wrap"><table className="tbl">
          <thead><tr>{th('code', 'Code')}{th('title', 'Course')}<th>Category</th>{th('price', 'Price (ex VAT)', true)}<th className="num">Hours</th>{th('sessions', 'Upcoming')}{th('fill', 'Fill', true)}<th>Status</th><th /></tr></thead>
          <tbody>{list.map(c => {
            const i = info(c)
            return (
              <Fragment key={c.id}>
                <tr>
                  <td>{c.code}</td><td><Link to={`/course/${c.id}`}><b>{c.title}</b></Link></td><td>{c.category}</td><td className="num">{money(c.price)}</td><td className="num">{c.hours}</td>
                  <td><Button size="small" appearance="subtle" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>{i.up.length} of {i.all.length} {open === c.id ? '▴' : '▾'}</Button></td>
                  <td className="num">{i.cap ? `${i.fill}%` : '–'}</td><td><Status s={c.status} /></td><td>{actions(c)}</td>
                </tr>
                {open === c.id && (
                  <tr><td colSpan={9} style={{ background: 'var(--page)' }}>
                    {i.all.length === 0 ? <span className="muted">No sessions scheduled.</span> : i.all.map(s => (
                      <div key={s.id} className="row" style={{ padding: '4px 0' }}>
                        <Link to={`/sessions/${s.id}`}>{fmtDate(s.start)}</Link><span>{s.venue}</span><span className="muted">{seatsTaken(d, s.id)}/{s.capacity} seats</span><Status s={s.status} />
                      </div>
                    ))}
                  </td></tr>
                )}
              </Fragment>
            )
          })}</tbody>
        </table></div></Card>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} wide title={edit && d.courses.some(c => c.id === edit.id) ? 'Edit course' : 'New course'} actions={<Button appearance="primary" onClick={submitCourse}>Save course</Button>}>
        {edit && (
          <div className="form c2">
            <FText label="Course code" value={edit.code} onChange={v => setEdit({ ...edit, code: v })} error={err.code} />
            <FText label="Title" value={edit.title} onChange={v => setEdit({ ...edit, title: v })} error={err.title} />
            <FSelect label="Category" value={edit.category} onChange={v => setEdit({ ...edit, category: v })} options={SKILL_AREAS.map(c => ({ value: c, label: c }))} />
            <FSelect label="Status" value={edit.status} onChange={v => setEdit({ ...edit, status: v as Course['status'] })} options={['Active', 'Draft', 'Retired'].map(c => ({ value: c, label: c }))} />
            <FText label="Price excluding VAT (R)" type="number" value={edit.price} onChange={v => setEdit({ ...edit, price: Number(v) })} error={err.price} />
            <FText label="Duration (hours)" type="number" value={edit.hours} onChange={v => setEdit({ ...edit, hours: Number(v) })} error={err.hours} />
            <div style={{ gridColumn: '1 / -1' }}><FText label="Skills taught (comma separated)" value={edit.skillsText} onChange={v => setEdit({ ...edit, skillsText: v })} hint="Used for recommendations and the skills profile" /></div>
            <div style={{ gridColumn: '1 / -1' }}><FArea label="Description" value={edit.description} onChange={v => setEdit({ ...edit, description: v })} rows={3} /></div>
          </div>
        )}
      </Modal>
      <SessionFormModal value={sched} isNew onClose={() => setSched(null)} />
    </>
  )
}
