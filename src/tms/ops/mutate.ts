import { useStore } from '../../shared/store'
import { today } from '../../shared/format'
import type { Data, Opportunity, Session, Stage } from '../../shared/types'
import { STAGES } from '../../shared/calc'
import { defaultOpp, uid, useOps } from './opsStore'

/** Apply a change to the main data without touching store.ts. */
export function mutate(fn: (d: Data) => void) {
  useStore.setState(s => { const d = structuredClone(s.data); fn(d); return { data: d } })
}

const stageLabel = (s: Stage) => STAGES.find(x => x.id === s)?.label ?? s
const evt = (text: string) => ({ id: uid('ev'), at: new Date().toISOString(), text })

export function addOpportunity(o: Omit<Opportunity, 'id'>, owner: string, source: string): string {
  const id = `p-${Date.now().toString(36)}`
  mutate(d => { d.opportunities.push({ ...o, id }) })
  useOps.getState().patchOpp(id, () => ({ ...defaultOpp(), owner, source, stageSince: today(), events: [evt('Opportunity created')] }))
  useStore.getState().log(`Opportunity “${o.title}” created`)
  return id
}

export function updateOpportunity(id: string, patch: Partial<Omit<Opportunity, 'id'>>) {
  mutate(d => { const o = d.opportunities.find(x => x.id === id); if (o) Object.assign(o, patch) })
}

export function moveStage(id: string, stage: Stage, reason?: string) {
  const o = useStore.getState().data.opportunities.find(x => x.id === id)
  if (!o || o.stage === stage) return
  const from = o.stage
  useStore.getState().moveOpp(id, stage)
  useOps.getState().patchOpp(id, x => ({
    ...x, stageSince: today(), reason: reason ?? x.reason,
    events: [...x.events, evt(`Moved from ${stageLabel(from)} to ${stageLabel(stage)}${reason ? `. Reason: ${reason}` : ''}`)],
  }))
}

export function saveSessionChecked(s: Session) {
  useStore.getState().saveSession(s)
}

/** Move a learner from a session waitlist into the class list. */
export function promoteWaitlist(sessionId: string, learnerId: string) {
  mutate(d => {
    const s = d.sessions.find(x => x.id === sessionId); const l = d.learners.find(x => x.id === learnerId)
    if (!s || !l || d.enrolments.some(e => e.sessionId === sessionId && e.learnerId === learnerId)) return
    d.enrolments.push({
      id: uid('e'), learnerId, courseId: s.courseId, sessionId, payer: l.type === 'internal' ? 'internal' : l.type === 'b2b' ? 'employer' : 'self',
      orgId: l.orgId, progress: 0, status: 'Booked',
    })
  })
  useOps.getState().patchSess(sessionId, x => ({ ...x, waitlist: x.waitlist.filter(w => w.learnerId !== learnerId) }))
  useStore.getState().log('Learner moved from waitlist into a class list')
}

export function bulkAttend(enrolIds: string[], value: boolean) {
  mutate(d => { d.enrolments.forEach(e => { if (enrolIds.includes(e.id)) e.attended = value }) })
}
