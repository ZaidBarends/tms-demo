import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerReset } from '../../shared/resetRegistry'
import { safeStorage } from '../../talent/safeStorage'
import { buildClientSeed, BookingRequest, ClientData, Dispute, Payment, QuoteRequest, Reschedule } from './clientSeed'

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
const nowDate = () => new Date().toISOString().slice(0, 10)

interface Actions {
  addBookingRequest: (b: Omit<BookingRequest, 'id' | 'created' | 'status'>) => string
  confirmRequest: (id: string) => void
  addReschedule: (r: Omit<Reschedule, 'id' | 'created'>) => void
  addDispute: (d: Omit<Dispute, 'id' | 'created'>) => void
  addPayment: (p: Omit<Payment, 'at' | 'ref'>) => string
  addQuoteRequest: (q: Omit<QuoteRequest, 'id' | 'created'>) => void
}
export const useClient = create<ClientData & Actions>()(
  persist(
    set => ({
      ...buildClientSeed(),
      addBookingRequest: b => { const id = uid('br'); set(s => ({ bookingRequests: [{ ...b, id, created: nowDate(), status: 'Requested' }, ...s.bookingRequests] })); return id },
      confirmRequest: id => set(s => ({ bookingRequests: s.bookingRequests.map(b => b.id === id ? { ...b, status: 'Confirmed' } : b) })),
      addReschedule: r => set(s => ({ reschedules: [{ ...r, id: uid('rs'), created: nowDate() }, ...s.reschedules] })),
      addDispute: d => set(s => ({ disputes: [{ ...d, id: uid('dp'), created: nowDate() }, ...s.disputes] })),
      addPayment: p => {
        const ref = `PAY-${Math.floor(100000 + Math.random() * 900000)}`
        set(s => ({ payments: [{ ...p, at: nowDate(), ref }, ...s.payments] }))
        return ref
      },
      addQuoteRequest: q => set(s => ({ quoteRequests: [{ ...q, id: uid('qr'), created: nowDate() }, ...s.quoteRequests] })),
    }),
    { name: 'client-portal-v2', version: 1, storage: safeStorage },
  ),
)
registerReset(() => useClient.setState(buildClientSeed()))
