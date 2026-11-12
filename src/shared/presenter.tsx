import './presenter.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { Button, Dialog, DialogBody, DialogSurface, DialogTitle, DialogContent, DialogActions, Input, Popover, PopoverSurface, PopoverTrigger, Badge } from '@fluentui/react-components'
import { AlertRegular, DismissRegular, PlayRegular, SearchRegular } from '@fluentui/react-icons'
import { SCREENS, PERSONAS, canOpen, personaDef } from './access'
import { useStore } from './store'
import { TOURS, Tour } from './tours'
import { daysBetween, fmtDate, today } from './format'
import { clashes, invTotal } from './calc'
import { useMoney } from '../tms/money/store'
import { money } from './format'

/* ---------------- tour state ---------------- */
interface TourState { tour: Tour | null; step: number; menu: boolean; start: (id: string) => void; go: (n: number) => void; stop: () => void; setMenu: (o: boolean) => void }
export const useTour = create<TourState>(set => ({
  tour: null, step: 0, menu: false,
  start: id => set({ tour: TOURS.find(t => t.id === id) ?? null, step: 0, menu: false }),
  go: n => set({ step: n }),
  stop: () => set({ tour: null, step: 0 }),
  setMenu: menu => set({ menu }),
}))

export function TourPanel() {
  const { tour, step, go, stop } = useTour()
  const nav = useNavigate()
  const setPersona = useStore(s => s.setPersona)
  const setNotice = useStore(s => s.setNotice)
  const explainer = useStore(s => s.explainer)
  const toggleExplainer = useStore(s => s.toggleExplainer)
  const s = tour?.steps[step]
  useEffect(() => {
    if (!s) return
    setNotice(null)
    setPersona(s.persona)
    if (s.explainer && !useStore.getState().explainer) toggleExplainer()
    nav(s.path)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour?.id, step])
  if (!tour || !s) return null
  const p = personaDef(s.persona)
  return (
    <aside className="tour-panel" role="dialog" aria-label={`Guided tour: ${tour.title}`} aria-live="polite">
      <div className="tour-head">
        <span className="chip">Tour · {tour.title}</span>
        <Button size="small" appearance="subtle" icon={<DismissRegular />} aria-label="End tour" onClick={stop} />
      </div>
      <div className="tour-who"><span className="avatar sm" aria-hidden>{p.name[0]}</span>Viewing as <b>{s.persona === 'all' ? 'All access' : `${p.name} (${p.label})`}</b></div>
      <h3 className="tour-title">{s.title}</h3>
      <p>{s.text}</p>
      <div className="tour-dots" aria-hidden>{tour.steps.map((_, i) => <span key={i} className={i === step ? 'on' : i < step ? 'done' : ''} />)}</div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="muted small">Step {step + 1} of {tour.steps.length}{explainer ? ' · explainer on' : ''}</span>
        <span className="row">
          <Button size="small" disabled={step === 0} onClick={() => go(step - 1)}>Back</Button>
          {step < tour.steps.length - 1 ? <Button size="small" appearance="primary" onClick={() => go(step + 1)}>Next</Button> : <Button size="small" appearance="primary" onClick={stop}>Finish</Button>}
        </span>
      </div>
    </aside>
  )
}

export function TourMenu() {
  const { menu, setMenu, start } = useTour()
  return (
    <Dialog open={menu} onOpenChange={(_, d) => setMenu(d.open)}>
      <DialogSurface style={{ maxWidth: 640 }}>
        <DialogBody>
          <DialogTitle>Guided tours</DialogTitle>
          <DialogContent>
            <p className="muted">Pick a story. The tour switches persona and screen for you; you can click around freely and use Back and Next any time.</p>
            <div className="tour-list">
              {TOURS.map(t => (
                <button key={t.id} className="tour-card" onClick={() => start(t.id)}>
                  <span className="tour-play"><PlayRegular /></span>
                  <span><b>{t.title}</b><br /><span className="muted small">{t.blurb}</span><br /><span className="small muted">{t.steps.length} steps · about {t.minutes} min</span></span>
                </button>
              ))}
            </div>
          </DialogContent>
          <DialogActions><Button appearance="secondary" onClick={() => setMenu(false)}>Close</Button></DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

/* ---------------- welcome ---------------- */
const SEEN = 'training-demo-welcome-seen'
export function Welcome() {
  const [open, setOpen] = useState(false)
  const { setMenu } = useTour()
  useEffect(() => { try { if (!localStorage.getItem(SEEN)) setOpen(true) } catch { /* ignore */ } }, [])
  const close = () => { setOpen(false); try { localStorage.setItem(SEEN, '1') } catch { /* ignore */ } }
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && close()}>
      <DialogSurface style={{ maxWidth: 620 }}>
        <DialogBody>
          <DialogTitle>Welcome to the Zimele Technologies learning platform demo</DialogTitle>
          <DialogContent>
            <p>This is a clickable, frontend-only demo with invented data. Nothing is saved to a server.</p>
            <ul style={{ lineHeight: 1.8 }}>
              <li><b>Viewing as</b> (top bar) switches between eight personas and All access. The menu changes with the role.</li>
              <li><b>Demo map</b> lists every screen; opening one your persona cannot use switches you to one who can.</li>
              <li><b>Access explainer</b> shows why each role sees what it sees.</li>
              <li>Press <kbd>Ctrl</kbd> + <kbd>K</kbd> to jump anywhere, and <b>Reset demo</b> to start over.</li>
            </ul>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={close}>Explore on my own</Button>
            <Button appearance="primary" onClick={() => { close(); setMenu(true) }}>Take a guided tour</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

/* ---------------- command palette ---------------- */
interface Cmd { id: string; label: string; hint: string; run: () => void }
export function CommandPalette({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const nav = useNavigate()
  const { persona, setPersona, setNotice, toggleDark, toggleExplainer, reset } = useStore()
  const { setMenu } = useTour()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const list = useRef<HTMLDivElement>(null)

  const cmds = useMemo<Cmd[]>(() => {
    const out: Cmd[] = []
    SCREENS.forEach(s => out.push({
      id: 's-' + s.id, label: s.title, hint: `${s.area}${canOpen(persona, s) ? '' : ' · switches role'}`,
      run: () => { nav(s.path) },
    }))
    PERSONAS.forEach(p => out.push({ id: 'p-' + p.id, label: `View as ${p.label}`, hint: p.id === 'all' ? p.sub : `${p.name}, ${p.sub}`, run: () => { setPersona(p.id); setNotice(null); nav(p.home) } }))
    out.push({ id: 'a-tour', label: 'Start a guided tour', hint: 'Presenter', run: () => setMenu(true) })
    out.push({ id: 'a-dark', label: 'Toggle dark mode', hint: 'Appearance', run: toggleDark })
    out.push({ id: 'a-exp', label: 'Toggle access explainer', hint: 'Presenter', run: toggleExplainer })
    out.push({ id: 'a-reset', label: 'Reset demo data', hint: 'Presenter', run: reset })
    return out
  }, [persona, nav, setPersona, setNotice, setMenu, toggleDark, toggleExplainer, reset])

  const results = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return cmds.slice(0, 40)
    return cmds.filter(c => (c.label + ' ' + c.hint).toLowerCase().includes(t)).slice(0, 40)
  }, [cmds, q])

  useEffect(() => { setIdx(0) }, [q, open])
  useEffect(() => { if (!open) setQ('') }, [open])
  useEffect(() => { list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' }) }, [idx])

  const run = (c?: Cmd) => { if (!c) return; setOpen(false); c.run() }
  return (
    <Dialog open={open} onOpenChange={(_, d) => setOpen(d.open)}>
      <DialogSurface style={{ maxWidth: 620, padding: 0 }} aria-label="Command palette">
        <DialogBody style={{ display: 'block', padding: 16 }}>
          <Input autoFocus style={{ width: '100%' }} contentBefore={<SearchRegular />} placeholder="Jump to a screen, switch persona, run an action…" aria-label="Search commands"
            value={q} onChange={(_, d) => setQ(d.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(results.length - 1, i + 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setIdx(i => Math.max(0, i - 1)) }
              if (e.key === 'Enter') { e.preventDefault(); run(results[idx]) }
            }} />
          <div className="cmd-list" ref={list} role="listbox" aria-label="Results">
            {results.length === 0 && <div className="muted" style={{ padding: 16 }}>No matches.</div>}
            {results.map((c, i) => (
              <div key={c.id} role="option" aria-selected={i === idx} className={`cmd-item ${i === idx ? 'sel' : ''}`} onMouseEnter={() => setIdx(i)} onClick={() => run(c)}>
                <span>{c.label}</span><span className="muted small">{c.hint}</span>
              </div>
            ))}
          </div>
          <div className="muted small" style={{ marginTop: 8 }}>↑ ↓ to move · Enter to open · Esc to close</div>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

/* ---------------- notifications ---------------- */
interface Note { id: string; tone: 'danger' | 'warning' | 'info' | 'success'; text: string; to: string }
function useNotes(): Note[] {
  const d = useStore(s => s.data)
  const payments = useMoney(s => s.payments)
  const persona = useStore(s => s.persona)
  return useMemo(() => {
    const n: Note[] = []
    const now = today()
    const learnerId = d.learners.find(l => l.name === ({ internal: 'Sipho Khumalo', blearner: 'Johan Botha' } as Record<string, string>)[persona] || l.name === 'Zanele Ndlovu')?.id
    const overdue = d.invoices.filter(i => i.status === 'Overdue')
    const failed = d.invoices.filter(i => i.wb === 'Failed')
    const stuck = payments.filter(p => !p.dismissed && ['Unmatched', 'Rejected', 'Duplicate', 'Overpaid'].includes(p.status)).length
    if ((persona === 'admin' || persona === 'finance' || persona === 'all') && stuck) n.push({ id: 'up', tone: 'danger', text: `${stuck} payment${stuck > 1 ? 's' : ''} need${stuck > 1 ? '' : 's'} matching to an invoice`, to: '/invoicing?focus=payments' })
    if (persona === 'admin' || persona === 'all') {
      if (overdue.length) n.push({ id: 'od', tone: 'danger', text: `${overdue.length} overdue invoices (${money(overdue.reduce((a, i) => a + invTotal(i), 0))})`, to: '/invoicing?status=Overdue' })
      if (failed.length) n.push({ id: 'wb', tone: 'danger', text: `${failed.length} invoice failed to sync to Workbook`, to: '/workbook?status=Failed' })
      const c = Object.keys(clashes(d)).length
      if (c) n.push({ id: 'cl', tone: 'warning', text: `${c} sessions are in a resource clash`, to: '/resources?focus=clashes' })
      const pend = d.recruiters.filter(r => !r.approved).length
      if (pend) n.push({ id: 'rc', tone: 'info', text: `${pend} recruiter awaiting approval`, to: '/talent/admin?tab=approvals&focus=approvals' })
      const sent = d.quotes.filter(q => q.status === 'Sent').length
      if (sent) n.push({ id: 'qs', tone: 'info', text: `${sent} quotes sent and waiting for a response`, to: '/quotes?status=Sent' })
    }
    if (persona === 'finance') {
      if (overdue.length) n.push({ id: 'od', tone: 'danger', text: `${overdue.length} overdue invoices to chase`, to: '/invoicing?status=Overdue' })
      if (failed.length) n.push({ id: 'wb', tone: 'danger', text: `${failed[0].number} failed to sync: ${failed[0].wbError}`, to: '/workbook?status=Failed' })
      n.push({ id: 'pd', tone: 'info', text: `${d.invoices.filter(i => i.wb === 'Pending').length} records pending sync`, to: '/workbook?status=Pending' })
    }
    if (persona === 'instructor') {
      const mine = d.sessions.filter(s => s.instructorId === 's3' && s.start >= now).sort((a, b) => a.start.localeCompare(b.start))
      if (mine[0]) n.push({ id: 'ns', tone: 'info', text: `Next class ${fmtDate(mine[0].start)}: ${d.courses.find(c => c.id === mine[0].courseId)?.title}`, to: `/sessions/${mine[0].id}` })
      const past = d.sessions.find(s => s.instructorId === 's3' && s.status === 'Completed')
      if (past) n.push({ id: 'ar', tone: 'warning', text: 'Enter results for your last completed class', to: `/sessions/${past.id}` })
    }
    if (['internal', 'blearner', 'b2c', 'all'].includes(persona) && learnerId) {
      d.enrolments.filter(e => e.learnerId === learnerId && e.status !== 'Completed' && e.deadline).forEach(e => {
        const left = daysBetween(now, e.deadline!)
        if (left <= 21) n.push({ id: 'dl' + e.id, tone: left < 7 ? 'danger' : 'warning', text: `${d.courses.find(c => c.id === e.courseId)?.title} is due in ${left} days`, to: `/learn/${e.id}` })
      })
      d.certificates.filter(c => c.learnerId === learnerId && c.expires && daysBetween(now, c.expires) < 120).forEach(c => n.push({ id: 'ce' + c.id, tone: 'warning', text: `A certificate expires ${fmtDate(c.expires)}`, to: '/certifications' }))
      if (persona === 'b2c' || persona === 'all') d.intros.filter(i => i.learnerId === learnerId && i.status === 'Pending').forEach(i => n.push({ id: 'in' + i.id, tone: 'info', text: `${d.recruiters.find(r => r.id === i.recruiterId)?.company} would like an introduction`, to: '/talent/introductions' }))
    }
    if (persona === 'client') {
      const sent = d.quotes.filter(q => q.orgId === 'o1' && q.status === 'Sent').length
      if (sent) n.push({ id: 'cq', tone: 'info', text: `${sent} quote awaiting your acceptance`, to: '/quotes?status=Sent' })
      const due = d.invoices.filter(i => i.orgId === 'o1' && i.status !== 'Paid')
      if (due.length) n.push({ id: 'ci', tone: due.some(i => i.status === 'Overdue') ? 'danger' : 'warning', text: `${due.length} unpaid invoices`, to: '/client/invoices' })
    }
    if (persona === 'recruiter') {
      d.intros.filter(i => i.recruiterId === 'r1' && i.status === 'Approved').forEach(i => n.push({ id: 'ri' + i.id, tone: 'success', text: `${d.learners.find(l => l.id === i.learnerId)?.name} approved your introduction`, to: '/talent/introductions' }))
      d.intros.filter(i => i.recruiterId === 'r1' && i.status === 'Pending').forEach(i => n.push({ id: 'rp' + i.id, tone: 'info', text: `Waiting for ${d.talent.find(t => t.learnerId === i.learnerId)?.code} to respond`, to: '/talent/introductions' }))
    }
    return n
  }, [d, persona, payments])
}

export function Bell() {
  const notes = useNotes()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={(_, d) => setOpen(d.open)} positioning="below-end">
      <PopoverTrigger disableButtonEnhancement>
        <Button appearance="subtle" aria-label={`Notifications, ${notes.length}`} icon={<AlertRegular />}>
          {notes.length > 0 && <Badge size="small" color="danger" appearance="filled" style={{ marginLeft: 2 }}>{notes.length}</Badge>}
        </Button>
      </PopoverTrigger>
      <PopoverSurface style={{ width: 340, padding: 0 }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}><b>Notifications</b></div>
        {notes.length === 0 ? <div className="muted" style={{ padding: 16 }}>You are all caught up.</div> : (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notes.map(n => (
              <button key={n.id} className="note-item" onClick={() => { setOpen(false); nav(n.to) }}>
                <span className={`dot ${n.tone}`} aria-hidden /><span>{n.text}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverSurface>
    </Popover>
  )
}

