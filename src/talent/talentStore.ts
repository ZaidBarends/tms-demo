import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerReset } from '../shared/resetRegistry'
import { useStore } from '../shared/store'
import { safeStorage } from './safeStorage'
import { buildTalentSeed, TalentData } from './talentSeed'
import { Assumptions, Brief, ConsentEntry, Decision, DEFAULT_VISIBILITY, PipeStage, SavedSearch, SearchFilters, ThreadMsg, Visibility } from './talentTypes'

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

interface Actions {
  toggleShortlist: (recruiterId: string, code: string) => void
  saveSearch: (recruiterId: string, name: string, filters: SearchFilters, briefId: string) => void
  deleteSearch: (id: string) => void
  addBrief: (b: Omit<Brief, 'id'>) => string
  setPendingSaved: (id: string | null) => void
  markViewed: (recruiterId: string, code: string) => void
  postMessage: (introId: string, from: ThreadMsg['from'], text: string) => void
  setStage: (introId: string, stage: PipeStage) => void
  addNote: (introId: string, text: string) => void
  recordDecision: (introId: string, d: Omit<Decision, 'at'>) => void
  setVisibility: (learnerId: string, patch: Partial<Visibility>) => void
  addConsent: (learnerId: string, text: string) => void
  decideApplication: (id: string, status: 'Approved' | 'Rejected' | 'Pending', reason: string) => void
  setAssumptions: (a: Partial<Assumptions>) => void
}
export type TalentState = TalentData & Actions

/** Keeps the main store's `placed` flag in step with the recruiter's pipeline stage. */
function syncPlaced(introId: string, placed: boolean) {
  useStore.setState(s => {
    const d = structuredClone(s.data)
    const i = d.intros.find(x => x.id === introId)
    if (!i || !!i.placed === placed) return {}
    i.placed = placed
    return { data: d }
  })
}

export const useTalent = create<TalentState>()(
  persist(
    (set, get) => ({
      ...buildTalentSeed(),
      toggleShortlist: (rid, code) => set(s => {
        const cur = s.shortlists[rid] ?? []
        const next = cur.some(x => x.code === code) ? cur.filter(x => x.code !== code) : [{ code, at: new Date().toISOString() }, ...cur]
        return { shortlists: { ...s.shortlists, [rid]: next } }
      }),
      saveSearch: (recruiterId, name, filters, briefId) => set(s => ({
        savedSearches: [{ id: uid('ss'), recruiterId, name, filters, briefId, created: new Date().toISOString().slice(0, 10) }, ...s.savedSearches],
      })),
      deleteSearch: id => set(s => ({ savedSearches: s.savedSearches.filter(x => x.id !== id) })),
      addBrief: b => { const id = uid('b'); set(s => ({ briefs: [...s.briefs, { ...b, id }] })); return id },
      setPendingSaved: id => set({ pendingSavedId: id }),
      markViewed: (rid, code) => set(s => {
        const cur = s.viewedSeed[rid] ?? []
        return cur.includes(code) ? {} : { viewedSeed: { ...s.viewedSeed, [rid]: [...cur, code] } }
      }),
      postMessage: (introId, from, text) => set(s => ({
        threads: { ...s.threads, [introId]: [...(s.threads[introId] ?? []), { id: uid('tm'), from, text, at: new Date().toISOString() }] },
      })),
      setStage: (introId, stage) => {
        set(s => ({ stages: { ...s.stages, [introId]: stage } }))
        syncPlaced(introId, stage === 'placed')
        const d = useStore.getState().data
        const i = d.intros.find(x => x.id === introId)
        const r = d.recruiters.find(x => x.id === i?.recruiterId)
        if (i && r && stage === 'placed') useStore.getState().log(`${r.company} recorded a placement`)
      },
      addNote: (introId, text) => set(s => ({
        notes: { ...s.notes, [introId]: [{ id: uid('n'), text, at: new Date().toISOString() }, ...(s.notes[introId] ?? [])] },
      })),
      recordDecision: (introId, d) => set(s => ({ decisions: { ...s.decisions, [introId]: { ...d, at: new Date().toISOString() } } })),
      setVisibility: (learnerId, patch) => set(s => ({
        visibility: { ...s.visibility, [learnerId]: { ...DEFAULT_VISIBILITY, ...s.visibility[learnerId], ...patch } },
      })),
      addConsent: (learnerId, text) => set(s => ({
        consent: { ...s.consent, [learnerId]: [{ id: uid('c'), at: new Date().toISOString(), text } as ConsentEntry, ...(s.consent[learnerId] ?? [])] },
      })),
      decideApplication: (id, status, reason) => {
        const app = get().applications.find(a => a.id === id)
        if (!app) return
        set(s => ({ applications: s.applications.map(a => a.id === id ? { ...a, status, reason } : a) }))
        if (app.linkedId) useStore.getState().approveRecruiter(app.linkedId, status === 'Approved')
        useStore.getState().log(`${app.company} recruiter application ${status.toLowerCase()}`)
      },
      setAssumptions: a => set(s => ({ assumptions: { ...s.assumptions, ...a } })),
    }),
    { name: 'talent-connection-v2', version: 1, storage: safeStorage },
  ),
)

export const visibilityOf = (v: Record<string, Visibility>, learnerId: string): Visibility => ({ ...DEFAULT_VISIBILITY, ...v[learnerId] })

registerReset(() => useTalent.setState(buildTalentSeed()))

export type { SavedSearch }
