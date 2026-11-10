import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { registerReset } from '../shared/resetRegistry'
import { today } from '../shared/format'

export interface Review { id: string; courseId: string; name: string; rating: number; text: string; date: string; mine?: boolean }
export interface SavedCard { brand: string; last4: string; name: string; expiry: string }
export interface OrderMeta { coupon?: string; couponPct?: number; discount: number; net: number; vat: number; total: number; ref: string; method: 'Card' | 'EFT'; sessionId?: string; renewal?: string }
export interface BookingRequest { id: string; enrolId: string; type: 'Reschedule' | 'Cancel'; newSessionId?: string; reason: string; at: string; refundPct: number; status: 'Requested' | 'Approved' }
export interface MentorMeta { time: string; goals: string[]; done: boolean[]; notes: string; rating?: number }

interface Persisted {
  wishlist: Record<string, string[]>
  compare: string[]
  reviews: Review[]
  waitlist: Record<string, string[]>
  card: SavedCard | null
  orders: Record<string, OrderMeta>
  requests: BookingRequest[]
  mentorMeta: Record<string, MentorMeta>
  academyEnrolled: Record<string, string[]>
}
interface Actions {
  toggleWish: (learnerId: string, courseId: string) => void
  toggleCompare: (courseId: string) => boolean
  clearCompare: () => void
  addReview: (r: Omit<Review, 'id' | 'date' | 'mine'>) => void
  toggleWaitlist: (sessionId: string, learnerId: string) => void
  saveCard: (c: SavedCard | null) => void
  recordOrder: (receiptId: string, m: OrderMeta) => void
  addRequest: (r: Omit<BookingRequest, 'id' | 'at' | 'status'>) => void
  approveRequestStatus: (id: string) => void
  setMentorMeta: (sessionId: string, patch: Partial<MentorMeta> & { time?: string }) => void
  enrolAcademy: (academyId: string, learnerId: string) => void
  resetB2c: () => void
}

const EMPTY_META: MentorMeta = { time: '', goals: [], done: [], notes: '' }
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
export const b2cSeed = (): Persisted => ({
  wishlist: {}, compare: [], reviews: [], waitlist: {}, requests: [], orders: {}, mentorMeta: {}, academyEnrolled: {},
  card: { brand: 'Visa', last4: '4242', name: 'Z Ndlovu', expiry: '08/29' },
})
const noStorage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }

export const useB2c = create<Persisted & Actions>()(
  persist(
    (set, get) => ({
      ...b2cSeed(),
      toggleWish: (lid, cid) => set(s => { const cur = s.wishlist[lid] ?? []; return { wishlist: { ...s.wishlist, [lid]: cur.includes(cid) ? cur.filter(x => x !== cid) : [...cur, cid] } } }),
      toggleCompare: cid => {
        const cur = get().compare
        if (cur.includes(cid)) { set({ compare: cur.filter(x => x !== cid) }); return true }
        if (cur.length >= 3) return false
        set({ compare: [...cur, cid] }); return true
      },
      clearCompare: () => set({ compare: [] }),
      addReview: r => set(s => ({ reviews: [{ ...r, id: uid('rv'), date: today(), mine: true }, ...s.reviews] })),
      toggleWaitlist: (sid, lid) => set(s => { const cur = s.waitlist[sid] ?? []; return { waitlist: { ...s.waitlist, [sid]: cur.includes(lid) ? cur.filter(x => x !== lid) : [...cur, lid] } } }),
      approveRequestStatus: id => set(s => ({ requests: s.requests.map(r => r.id === id ? { ...r, status: 'Approved' as const } : r) })),
      saveCard: card => set({ card }),
      recordOrder: (rid, m) => set(s => ({ orders: { ...s.orders, [rid]: m } })),
      addRequest: r => set(s => ({ requests: [{ ...r, id: uid('rq'), at: today(), status: 'Requested' }, ...s.requests] })),
      setMentorMeta: (sid, patch) => set(s => ({ mentorMeta: { ...s.mentorMeta, [sid]: { ...EMPTY_META, ...s.mentorMeta[sid], ...patch } } })),
      enrolAcademy: (aid, lid) => set(s => { const cur = s.academyEnrolled[aid] ?? []; return { academyEnrolled: { ...s.academyEnrolled, [aid]: cur.includes(lid) ? cur : [...cur, lid] } } }),
      resetB2c: () => set(b2cSeed()),
    }),
    { name: 'b2c-learner-v1', version: 1, storage: createJSONStorage(() => { try { return localStorage } catch { return noStorage } }) },
  ),
)
registerReset(() => useB2c.getState().resetB2c())
