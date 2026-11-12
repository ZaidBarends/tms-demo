import { addDays, today } from '../../shared/format'

export interface BookingRequest {
  id: string; courseId: string; attendees: number; preferredDate: string; delivery: 'On site' | 'At the training centre' | 'Online'
  notes: string; created: string; status: 'Requested' | 'Confirmed'
  /** Opportunity created in the staff pipeline for this request. */
  oppId?: string
}
export interface Reschedule { id: string; bookingKey: string; courseTitle: string; newDate: string; reason: string; created: string }
export interface Dispute { id: string; invoice: string; reason: string; detail: string; created: string }
export interface Payment { invoice: string; at: string; method: 'Card' | 'EFT' | 'SnapScan'; ref: string }
export interface QuoteRequest { id: string; courseId: string; people: number; notes: string; created: string; oppId?: string }
export interface RosterPerson { id: string; name: string; email: string; dept: string; jobRole: string }
export interface LegacyCert { person: string; cert: string; issued: string; expires: string }

export interface ClientData {
  budget: number
  bookingRequests: BookingRequest[]
  reschedules: Reschedule[]
  disputes: Dispute[]
  payments: Payment[]
  quoteRequests: QuoteRequest[]
  roster: RosterPerson[]
  legacyCerts: LegacyCert[]
}

/** Department and job role for the Cape Freight staff who are already platform learners (matched by name). */
export const STAFF_PROFILE: Record<string, { dept: string; jobRole: string }> = {
  'Johan Botha': { dept: 'Operations', jobRole: 'Driver' },
  'Nomsa Dube': { dept: 'Warehouse', jobRole: 'Warehouse operator' },
  'Riaan Steyn': { dept: 'Operations', jobRole: 'Supervisor' },
  'Thabo Molefe': { dept: 'Fleet', jobRole: 'Driver' },
  'Carla Jacobs': { dept: 'Customer service', jobRole: 'Customer service' },
  'Lwazi Ngcobo': { dept: 'Warehouse', jobRole: 'Warehouse operator' },
  'Megan Fortuin': { dept: 'Finance', jobRole: 'Office admin' },
  'Sibusiso Cele': { dept: 'Warehouse', jobRole: 'Warehouse operator' },
  'Anele Mkhize': { dept: 'Operations', jobRole: 'Supervisor' },
}

const slug = (n: string) => n.toLowerCase().replace(/[^a-z ]/g, '').replace(/ /g, '.')
const person = (id: string, name: string, dept: string, jobRole: string): RosterPerson => ({ id, name, email: `${slug(name)}@capefreight.example`, dept, jobRole })

export function buildClientSeed(): ClientData {
  const t = today()
  const d = (n: number) => addDays(t, n)
  const roster = [
    person('x1', 'Zinhle Maseko', 'Warehouse', 'Warehouse operator'), person('x2', 'Pieter Engelbrecht', 'Fleet', 'Driver'),
    person('x3', 'Fatima Salie', 'Customer service', 'Customer service'), person('x4', 'Ruben Adonis', 'Warehouse', 'Supervisor'),
    person('x5', 'Naledi Tshabalala', 'Finance', 'Office admin'), person('x6', 'Dwayne Pillay', 'Operations', 'Manager'),
    person('x7', 'Chantelle Brown', 'Customer service', 'Customer service'), person('x8', 'Mandla Zungu', 'Fleet', 'Driver'),
    person('x9', 'Lerato Moloi', 'Warehouse', 'Warehouse operator'),
  ]
  const lc = (person: string, cert: string, issuedAgo: number, expiresIn: number): LegacyCert => ({ person, cert, issued: d(-issuedAgo), expires: d(expiresIn) })
  const legacyCerts: LegacyCert[] = [
    lc('Zinhle Maseko', 'hse', 400, 330), lc('Zinhle Maseko', 'heights', 700, 30),
    lc('Pieter Engelbrecht', 'hse', 760, -30), lc('Pieter Engelbrecht', 'firstaid', 300, 430),
    lc('Fatima Salie', 'popia', 200, 530), lc('Fatima Salie', 'cyber', 340, 25), lc('Fatima Salie', 'hse', 100, 630),
    lc('Ruben Adonis', 'hse', 500, 230), lc('Ruben Adonis', 'heights', 715, 15), lc('Ruben Adonis', 'firstaid', 100, 630), lc('Ruben Adonis', 'popia', 150, 580),
    lc('Naledi Tshabalala', 'popia', 690, 40), lc('Naledi Tshabalala', 'cyber', 100, 265), lc('Naledi Tshabalala', 'hse', 30, 700),
    lc('Dwayne Pillay', 'hse', 300, 430), lc('Dwayne Pillay', 'popia', 400, 330), lc('Dwayne Pillay', 'cyber', 380, -15), lc('Dwayne Pillay', 'firstaid', 710, 20),
    lc('Chantelle Brown', 'popia', 50, 680), lc('Chantelle Brown', 'hse', 50, 680),
    lc('Mandla Zungu', 'hse', 600, 130), lc('Mandla Zungu', 'firstaid', 100, 630),
    lc('Lerato Moloi', 'hse', 10, 720),
    // Platform learners who also hold older certificates from before they joined the platform.
    lc('Johan Botha', 'hse', 600, 130), lc('Carla Jacobs', 'popia', 710, 20), lc('Megan Fortuin', 'cyber', 340, 25), lc('Lwazi Ngcobo', 'hse', 650, 80),
  ]
  return {
    budget: 650000,
    bookingRequests: [{ id: 'br1', courseId: 'k6', attendees: 6, preferredDate: d(45), delivery: 'On site', notes: 'Two intakes if possible, one per depot.', created: d(-2), status: 'Requested', oppId: 'p11' }],
    reschedules: [], disputes: [], payments: [], quoteRequests: [], roster, legacyCerts,
  }
}
