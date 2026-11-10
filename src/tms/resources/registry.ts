import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerReset } from '../../shared/resetRegistry'
import { safeStorage } from '../money/safeStorage'

/** The register of bookable venues and equipment. Instructors are managed under Facilitators. */
export type ResourceStatus = 'Available' | 'Out of service'
export interface VenueRec { id: string; name: string; city: string; seats: number; status: ResourceStatus; notes: string }
/** `quantity` is units in stock (a batch, such as 16 laptops). 0 means not tracked: it never clashes on its own. Sessions on the same day clash when together they need more units than are in stock. */
/** `perLearner` items (individual laptops) default to one unit per learner booked; others (a trolley, a projector) default to one unit per session. A session can always state its own units. */
export interface EquipRec { id: string; name: string; quantity: number; perLearner: boolean; status: ResourceStatus; notes: string }

export const venueSeed = (): VenueRec[] => [
  { id: 'v1', name: 'Cape Town Training Centre – Room A', city: 'Cape Town', seats: 20, status: 'Available', notes: 'Tiered seating, fixed projector.' },
  { id: 'v2', name: 'Cape Town Training Centre – Room B', city: 'Cape Town', seats: 12, status: 'Available', notes: 'Workshop layout with movable tables.' },
  { id: 'v3', name: 'Bellville Boardroom', city: 'Bellville', seats: 10, status: 'Available', notes: 'Client-facing boardroom.' },
  { id: 'v4', name: 'Stellenbosch Hub', city: 'Stellenbosch', seats: 16, status: 'Available', notes: '' },
  { id: 'v5', name: 'Online (video call)', city: 'Remote', seats: 200, status: 'Available', notes: 'Names starting with “Online” never clash.' },
]
export const equipSeed = (): EquipRec[] => [
  { id: 'q1', name: 'Projector', quantity: 0, perLearner: false, status: 'Available', notes: 'Several units; not tracked.' },
  { id: 'q2', name: 'Laptop trolley', quantity: 1, perLearner: false, status: 'Available', notes: 'One trolley of 16 laptops.' },
  { id: 'q3', name: 'First aid manikins', quantity: 0, perLearner: false, status: 'Available', notes: '' },
  { id: 'q4', name: 'Harness kit', quantity: 0, perLearner: false, status: 'Available', notes: 'Inspect before each use.' },
  { id: 'q5', name: 'Loan laptops', quantity: 16, perLearner: true, status: 'Available', notes: 'Individual laptops for hands-on courses.' },
]

interface State {
  venues: VenueRec[]
  equipment: EquipRec[]
  setVenues: (v: VenueRec[]) => void
  setEquipment: (e: EquipRec[]) => void
}

export const useResources = create<State>()(persist(
  set => ({ venues: venueSeed(), equipment: equipSeed(), setVenues: venues => set({ venues }), setEquipment: equipment => set({ equipment }) }),
  {
    name: 'tms-resources-v1', version: 2, storage: safeStorage(),
    // v1 used an "exclusive" flag: exclusive items become a stock of 1, the rest are untracked.
    migrate: (state: any) => ({ ...state, equipment: (state?.equipment ?? equipSeed()).map((e: any) => { const { exclusive, ...rest } = e; return { ...rest, quantity: rest.quantity ?? (exclusive ? 1 : 0), perLearner: rest.perLearner ?? false } }) }),
  },
))
registerReset(() => useResources.setState({ venues: venueSeed(), equipment: equipSeed() }))

/** Plain readers for logic code that runs outside React. */
export const isOnline = (venue: string) => venue.startsWith('Online')
export const venueNames = (onlyAvailable = false) => useResources.getState().venues.filter(v => !onlyAvailable || v.status === 'Available').map(v => v.name)
export const equipmentNames = (onlyAvailable = false) => useResources.getState().equipment.filter(e => !onlyAvailable || e.status === 'Available').map(e => e.name)
/** Units in stock for a tracked item; 0 when untracked or unknown. */
export const stockOf = (name: string) => useResources.getState().equipment.find(e => e.name === name)?.quantity ?? 0
export const perLearnerOf = (name: string) => useResources.getState().equipment.find(e => e.name === name)?.perLearner ?? false
export const isOutOfService = (kind: 'venue' | 'equipment', name: string) =>
  (kind === 'venue' ? useResources.getState().venues : useResources.getState().equipment).some(r => r.name === name && r.status === 'Out of service')
export const defaultVenue = () => venueNames(true)[0] ?? venueNames()[0] ?? ''
