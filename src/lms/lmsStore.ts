import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { registerReset } from '../shared/resetRegistry'
import { addDays, today } from '../shared/format'

export interface PointEvent { id: string; at: string; label: string; pts: number }
export interface AssignmentRecord {
  id: string; at: string; courseId: string; target: string; count: number; deadline: string; cadence: string; notified: boolean
}
export interface JourneyRequest { id: string; learnerId: string; journeyId: string; at: string; status: 'Requested' | 'Approved' }

interface Persisted {
  notes: Record<string, string>                 // `${enrolId}|${lessonId}` -> text
  bookmarks: Record<string, string[]>           // enrolId -> `${lessonId}#${slideIndex}`
  done: Record<string, string[]>                // enrolId -> completed lesson ids
  quizBest: Record<string, number>              // enrolId -> best percentage
  quizAttempts: Record<string, number>          // enrolId -> failed attempts since last unlock
  minutes: Record<string, Record<string, number>> // learnerId -> date -> minutes learnt in the app
  points: Record<string, PointEvent[]>
  targetRole: Record<string, string>
  selfAssess: Record<string, Record<string, number>>
  weeklyGoal: Record<string, number>            // learnerId -> minutes
  assignments: AssignmentRecord[]
  nudges: Record<string, string>                // `${learnerId}|${enrolId}` -> ISO time
  mandatory: string[]                           // course codes treated as mandatory
  journeyRequests: JourneyRequest[]
}

interface Actions {
  setNote: (enrolId: string, lessonId: string, text: string) => void
  toggleBookmark: (enrolId: string, key: string) => void
  markDone: (enrolId: string, lessonId: string) => void
  recordQuiz: (enrolId: string, pct: number, passed: boolean) => void
  unlockQuiz: (enrolId: string) => void
  addMinutes: (learnerId: string, mins: number) => void
  award: (learnerId: string, label: string, pts: number) => void
  setTargetRole: (learnerId: string, role: string) => void
  setSelfAssess: (learnerId: string, skill: string, v: number) => void
  setWeeklyGoal: (learnerId: string, mins: number) => void
  addAssignment: (a: Omit<AssignmentRecord, 'id' | 'at'>) => void
  nudge: (learnerId: string, enrolId: string) => void
  toggleMandatory: (code: string) => void
  requestJourney: (learnerId: string, journeyId: string) => void
  approveJourney: (id: string) => void
  resetLms: () => void
}

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

export function lmsSeed(): Persisted {
  return {
    notes: {}, bookmarks: {}, done: {}, quizBest: {}, quizAttempts: {}, minutes: {}, points: {},
    targetRole: {}, selfAssess: {}, weeklyGoal: {},
    assignments: [
      { id: 'as1', at: new Date(Date.now() - 6 * 864e5).toISOString(), courseId: 'k11', target: 'Internal staff', count: 8, deadline: addDays(today(), 12), cadence: 'Weekly', notified: true },
      { id: 'as2', at: new Date(Date.now() - 15 * 864e5).toISOString(), courseId: 'k1', target: 'Cape Freight', count: 9, deadline: addDays(today(), 25), cadence: '3 days before', notified: true },
    ],
    nudges: {}, mandatory: ['HSE-101', 'POP-120', 'CYB-110'], journeyRequests: [],
  }
}

const noStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }

export const useLms = create<Persisted & Actions>()(
  persist(
    (set) => {
      const upd = (fn: (s: Persisted) => Partial<Persisted>) => set(s => fn(s))
      return {
        ...lmsSeed(),
        setNote: (e, l, text) => upd(s => ({ notes: { ...s.notes, [`${e}|${l}`]: text } })),
        toggleBookmark: (e, key) => upd(s => {
          const cur = s.bookmarks[e] ?? []
          return { bookmarks: { ...s.bookmarks, [e]: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] } }
        }),
        markDone: (e, l) => upd(s => {
          const cur = s.done[e] ?? []
          return cur.includes(l) ? {} : { done: { ...s.done, [e]: [...cur, l] } }
        }),
        recordQuiz: (e, pct, passed) => upd(s => ({
          quizBest: { ...s.quizBest, [e]: Math.max(s.quizBest[e] ?? 0, pct) },
          quizAttempts: { ...s.quizAttempts, [e]: passed ? 0 : (s.quizAttempts[e] ?? 0) + 1 },
        })),
        unlockQuiz: e => upd(s => ({ quizAttempts: { ...s.quizAttempts, [e]: 0 } })),
        addMinutes: (lid, mins) => upd(s => {
          const day = today(); const m = { ...(s.minutes[lid] ?? {}) }; m[day] = (m[day] ?? 0) + mins
          return { minutes: { ...s.minutes, [lid]: m } }
        }),
        award: (lid, label, pts) => upd(s => ({
          points: { ...s.points, [lid]: [{ id: uid('pt'), at: new Date().toISOString(), label, pts }, ...(s.points[lid] ?? [])] },
        })),
        setTargetRole: (lid, role) => upd(s => ({ targetRole: { ...s.targetRole, [lid]: role } })),
        setSelfAssess: (lid, skill, v) => upd(s => ({ selfAssess: { ...s.selfAssess, [lid]: { ...(s.selfAssess[lid] ?? {}), [skill]: v } } })),
        setWeeklyGoal: (lid, mins) => upd(s => ({ weeklyGoal: { ...s.weeklyGoal, [lid]: mins } })),
        addAssignment: a => upd(s => ({ assignments: [{ ...a, id: uid('as'), at: new Date().toISOString() }, ...s.assignments] })),
        nudge: (lid, eid) => upd(s => ({ nudges: { ...s.nudges, [`${lid}|${eid}`]: new Date().toISOString() } })),
        toggleMandatory: code => upd(s => ({ mandatory: s.mandatory.includes(code) ? s.mandatory.filter(c => c !== code) : [...s.mandatory, code] })),
        requestJourney: (lid, jid) => upd(s => ({
          journeyRequests: s.journeyRequests.some(r => r.learnerId === lid && r.journeyId === jid) ? s.journeyRequests
            : [{ id: uid('jr'), learnerId: lid, journeyId: jid, at: today(), status: 'Requested' }, ...s.journeyRequests],
        })),
        approveJourney: id => upd(s => ({ journeyRequests: s.journeyRequests.map(r => r.id === id ? { ...r, status: 'Approved' as const } : r) })),
        resetLms: () => set(lmsSeed()),
      }
    },
    {
      name: 'lms-learner-v1', version: 1,
      storage: createJSONStorage(() => { try { return localStorage } catch { return noStorage } }),
    },
  ),
)

registerReset(() => useLms.getState().resetLms())
