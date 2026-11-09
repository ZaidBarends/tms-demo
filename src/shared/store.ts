import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Data, Persona, Stage, Quote, Course, Session, Enrolment, Tna, Template, Role } from './types'
import { buildSeed } from './seed'
import { addDays, today } from './format'
import { runResets } from './resetRegistry'

interface State {
  data: Data
  persona: Persona
  explainer: boolean
  dark: boolean
  notice: string | null
  setPersona: (p: Persona) => void
  setNotice: (n: string | null) => void
  toggleExplainer: () => void
  toggleDark: () => void
  reset: () => void
  log: (text: string) => void
  moveOpp: (id: string, stage: Stage) => void
  saveTna: (t: Tna) => void
  saveQuote: (q: Quote) => void
  setQuoteStatus: (id: string, s: Quote['status']) => void
  saveCourse: (c: Course) => void
  saveSession: (s: Session) => void
  setAttended: (enrolId: string, v: boolean) => void
  setResult: (enrolId: string, v: number | undefined) => void
  issueCert: (enrolId: string) => void
  checkout: (learnerId: string, courseId: string, sessionId: string | undefined, method: 'Card' | 'EFT') => string
  setProgress: (enrolId: string, progress: number, step: number) => void
  completeCourse: (enrolId: string) => void
  setOptIn: (learnerId: string, v: boolean) => void
  saveSummary: (learnerId: string, text: string) => void
  requestIntro: (recruiterId: string, learnerId: string, message: string) => void
  decideIntro: (id: string, approve: boolean) => void
  auditView: (recruiterId: string, learnerId: string) => void
  approveRecruiter: (id: string, v: boolean) => void
  resendWb: (number: string) => void
  setInvoiceStatus: (number: string, s: 'Paid' | 'Sent' | 'Overdue') => void
  assign: (learnerIds: string[], courseId: string, deadline: string) => void
  addClientLearner: (orgId: string, name: string, email: string, courseId: string) => void
  toggleAcademy: (id: string, learnerId: string) => void
  requestMentor: (learnerId: string, mentorId: string, notes: string) => void
  saveTemplate: (t: Template) => void
  sendEmail: (templateId: string, to: string, subject: string) => void
}

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

export const useStore = create<State>()(
  persist(
    (set, get) => {
      const upd = (fn: (d: Data) => void) => set(s => { const d = structuredClone(s.data); fn(d); return { data: d } })
      const pushLog = (d: Data, text: string) => { d.activity.unshift({ id: uid('ac'), at: new Date().toISOString(), text }) }
      const certFor = (d: Data, e: Enrolment) => {
        if (e.certificateId) return
        const course = d.courses.find(c => c.id === e.courseId)!
        const id = `CERT-${1000 + d.certificates.length + 1}${Math.floor(Math.random() * 90 + 10)}`
        const expires = ['Health & Safety', 'Compliance'].includes(course.category) ? addDays(today(), 730) : undefined
        d.certificates.push({ id, learnerId: e.learnerId, courseId: e.courseId, issued: today(), expires })
        e.certificateId = id; e.status = 'Completed'; e.progress = 100
        const learner = d.learners.find(l => l.id === e.learnerId)!
        d.sent.unshift({ id: uid('n'), at: new Date().toISOString(), templateId: 'm4', to: learner.email, subject: 'Congratulations – your certificate is ready' })
        pushLog(d, `Certificate issued to ${learner.name} for ${course.title}`)
      }
      return {
        data: buildSeed(), persona: 'admin', explainer: false, dark: false, notice: null,
        setPersona: persona => set({ persona }),
        setNotice: notice => set({ notice }),
        toggleExplainer: () => set(s => ({ explainer: !s.explainer })),
        toggleDark: () => set(s => ({ dark: !s.dark })),
        reset: () => { runResets(); set({ data: buildSeed(), notice: 'Demo data reset to the seed data.' }) },
        log: text => upd(d => pushLog(d, text)),
        moveOpp: (id, stage) => upd(d => {
          const o = d.opportunities.find(x => x.id === id); if (!o || o.stage === stage) return
          o.stage = stage; pushLog(d, `Opportunity “${o.title}” moved to ${stage}`)
        }),
        saveTna: t => upd(d => { const i = d.tnas.findIndex(x => x.id === t.id); if (i >= 0) d.tnas[i] = t; else d.tnas.push(t) }),
        saveQuote: q => upd(d => { const i = d.quotes.findIndex(x => x.id === q.id); if (i >= 0) d.quotes[i] = q; else d.quotes.push(q) }),
        setQuoteStatus: (id, s) => upd(d => {
          const q = d.quotes.find(x => x.id === id); if (!q) return
          q.status = s; pushLog(d, `Quote ${q.number} marked ${s.toLowerCase()}`)
        }),
        saveCourse: c => upd(d => { const i = d.courses.findIndex(x => x.id === c.id); if (i >= 0) d.courses[i] = c; else d.courses.push(c) }),
        saveSession: s => upd(d => { const i = d.sessions.findIndex(x => x.id === s.id); if (i >= 0) d.sessions[i] = s; else d.sessions.push(s) }),
        setAttended: (id, v) => upd(d => { const e = d.enrolments.find(x => x.id === id); if (e) e.attended = v }),
        setResult: (id, v) => upd(d => { const e = d.enrolments.find(x => x.id === id); if (e) e.result = v }),
        issueCert: id => upd(d => { const e = d.enrolments.find(x => x.id === id); if (e) certFor(d, e) }),
        checkout: (learnerId, courseId, sessionId, method) => {
          const rid = `RCT-${5000 + get().data.receipts.length + 1}`
          upd(d => {
            const course = d.courses.find(c => c.id === courseId)!
            const learner = d.learners.find(l => l.id === learnerId)!
            const eid = uid('e')
            d.enrolments.push({ id: eid, learnerId, courseId, sessionId, payer: 'self', progress: 0, status: 'Booked' })
            d.receipts.push({ id: rid, learnerId, courseId, amount: course.price * 1.15, date: today(), method, enrolmentId: eid })
            d.sent.unshift({ id: uid('n'), at: new Date().toISOString(), templateId: 'm1', to: learner.email, subject: 'Your booking is confirmed' })
            pushLog(d, `${learner.name} booked ${course.title}`)
          })
          return rid
        },
        setProgress: (id, progress, step) => upd(d => { const e = d.enrolments.find(x => x.id === id); if (e && e.status !== 'Completed') { e.progress = Math.max(e.progress, progress); e.step = step; e.status = 'In progress' } }),
        completeCourse: id => upd(d => { const e = d.enrolments.find(x => x.id === id); if (e) { e.attended = true; e.result = e.result ?? 80; certFor(d, e) } }),
        setOptIn: (learnerId, v) => upd(d => {
          const l = d.learners.find(x => x.id === learnerId)!
          let t = d.talent.find(x => x.learnerId === learnerId)
          if (!t) { t = { learnerId, optedIn: false, summary: '', code: `TL-${5100 + d.talent.length}`, region: l.city }; d.talent.push(t) }
          t.optedIn = v
          d.audit.unshift({ id: uid('a'), at: new Date().toISOString(), actor: l.name, action: v ? 'Opt-in' : 'Opt-out', target: t.code, detail: v ? 'Talent profile switched on' : 'Talent profile withdrawn' })
        }),
        saveSummary: (learnerId, text) => upd(d => { const t = d.talent.find(x => x.learnerId === learnerId); if (t) t.summary = text }),
        requestIntro: (recruiterId, learnerId, message) => upd(d => {
          const r = d.recruiters.find(x => x.id === recruiterId)!; const t = d.talent.find(x => x.learnerId === learnerId)!
          d.intros.unshift({ id: uid('i'), recruiterId, learnerId, status: 'Pending', message, created: today() })
          d.audit.unshift({ id: uid('a'), at: new Date().toISOString(), actor: `${r.name} (${r.company})`, action: 'Request', target: t.code, detail: 'Requested introduction' })
          pushLog(d, `${r.company} requested an introduction to ${t.code}`)
        }),
        decideIntro: (id, approve) => upd(d => {
          const i = d.intros.find(x => x.id === id)!; i.status = approve ? 'Approved' : 'Declined'
          const l = d.learners.find(x => x.id === i.learnerId)!; const r = d.recruiters.find(x => x.id === i.recruiterId)!
          d.audit.unshift({ id: uid('a'), at: new Date().toISOString(), actor: l.name, action: approve ? 'Approve' : 'Decline', target: r.company, detail: approve ? 'Approved introduction; contact details released' : 'Declined introduction' })
        }),
        auditView: (recruiterId, learnerId) => upd(d => {
          const r = d.recruiters.find(x => x.id === recruiterId)!; const t = d.talent.find(x => x.learnerId === learnerId)!
          d.audit.unshift({ id: uid('a'), at: new Date().toISOString(), actor: `${r.name} (${r.company})`, action: 'View', target: t.code, detail: 'Opened profile' })
        }),
        approveRecruiter: (id, v) => upd(d => { const r = d.recruiters.find(x => x.id === id); if (r) r.approved = v }),
        resendWb: number => upd(d => {
          const i = d.invoices.find(x => x.number === number); if (!i) return
          i.wb = 'Synced'; i.wbError = undefined; pushLog(d, `${number} resent and synced to Workbook`)
        }),
        setInvoiceStatus: (number, s) => upd(d => { const i = d.invoices.find(x => x.number === number); if (i) { i.status = s; i.paidOn = s === 'Paid' ? today() : undefined } }),
        assign: (learnerIds, courseId, deadline) => upd(d => {
          learnerIds.forEach(lid => {
            const l = d.learners.find(x => x.id === lid)!
            if (d.enrolments.some(e => e.learnerId === lid && e.courseId === courseId)) return
            d.enrolments.push({ id: uid('e'), learnerId: lid, courseId, payer: l.type === 'internal' ? 'internal' : 'employer', orgId: l.orgId, progress: 0, status: 'Booked', deadline })
          })
          pushLog(d, `Course assigned to ${learnerIds.length} learner(s)`)
        }),
        addClientLearner: (orgId, name, email, courseId) => upd(d => {
          const id = uid('l')
          d.learners.push({ id, name, type: 'b2b', orgId, email, phone: '—', city: d.orgs.find(o => o.id === orgId)!.city })
          d.enrolments.push({ id: uid('e'), learnerId: id, courseId, payer: 'employer', orgId, progress: 0, status: 'Booked' })
          pushLog(d, `${name} added to ${d.orgs.find(o => o.id === orgId)!.name} booking`)
        }),
        toggleAcademy: (id, lid) => upd(d => { const a = d.academies.find(x => x.id === id)!; a.interested = a.interested.includes(lid) ? a.interested.filter(x => x !== lid) : [...a.interested, lid] }),
        requestMentor: (learnerId, mentorId, notes) => upd(d => { d.mentorSessions.unshift({ id: uid('ms'), learnerId, mentorId, date: addDays(today(), 7), status: 'Requested', notes }) }),
        saveTemplate: t => upd(d => { const i = d.templates.findIndex(x => x.id === t.id); if (i >= 0) d.templates[i] = t }),
        sendEmail: (templateId, to, subject) => upd(d => { d.sent.unshift({ id: uid('n'), at: new Date().toISOString(), templateId, to, subject }) }),
      }
    },
    { name: 'training-demo-v1', version: 1, partialize: s => ({ data: s.data, persona: s.persona, explainer: s.explainer, dark: s.dark }) },
  ),
)

// Who "I" am for each persona (All access borrows a sensible identity so every screen has data).
export function useCtx() {
  const persona = useStore(s => s.persona)
  const data = useStore(s => s.data)
  const byName = (n: string) => data.learners.find(l => l.name === n)?.id ?? ''
  const learnerId = { internal: byName('Sipho Khumalo'), blearner: byName('Johan Botha'), b2c: byName('Zanele Ndlovu') }[persona as 'internal'] ?? byName('Zanele Ndlovu')
  const learner = data.learners.find(l => l.id === learnerId)
  const instructorId = persona === 'instructor' || persona === 'all' ? 's3' : 's3'
  const role: Role | 'all' = persona
  return { persona, role, learnerId, learner, orgId: 'o1', recruiterId: 'r1', instructorId }
}

export const orgName = (d: Data, id?: string) => d.orgs.find(o => o.id === id)?.name ?? '—'
export const courseOf = (d: Data, id: string) => d.courses.find(c => c.id === id)
export const learnerOf = (d: Data, id: string) => d.learners.find(l => l.id === id)
