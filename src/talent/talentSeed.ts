import { addDays, iso, today, monthKey } from '../shared/format'
import type { Application, Assumptions, Brief, ConsentEntry, Decision, HistMonth, Note, PipeStage, SavedSearch, ShortItem, ThreadMsg, Visibility } from './talentTypes'
import { EMPTY_FILTERS } from './talentTypes'

const ago = (days: number, hour = 0) => new Date(Date.now() - days * 864e5 + hour * 36e5).toISOString()

export interface TalentData {
  briefs: Brief[]
  savedSearches: SavedSearch[]
  shortlists: Record<string, ShortItem[]>
  viewedSeed: Record<string, string[]>
  threads: Record<string, ThreadMsg[]>
  stages: Record<string, PipeStage>
  notes: Record<string, Note[]>
  decisions: Record<string, Decision>
  visibility: Record<string, Visibility>
  consent: Record<string, ConsentEntry[]>
  applications: Application[]
  assumptions: Assumptions
  pendingSavedId: string | null
}

/** Six calendar months before the current one, newest last. Used as invented "earlier months" history. */
export function histMonths(): HistMonth[] {
  const now = new Date()
  const rows: [number, number, number, number, number][] = [
    [64, 11, 5, 1, 6.5], [81, 14, 7, 2, 5.8], [97, 17, 9, 2, 4.9], [118, 22, 12, 3, 4.2], [131, 26, 15, 3, 3.6],
  ]
  return rows.map((r, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (rows.length + 1 - i), 1)
    return { key: monthKey(iso(d)), views: r[0], requests: r[1], intros: r[2], placements: r[3], avgDays: r[4] }
  })
}
/** Placements made before this demo's live data, per recruiter. */
export const HIST_PLACEMENTS: Record<string, number> = { r1: 3, r2: 2, r3: 0 }

export function buildTalentSeed(): TalentData {
  const t = today()
  const briefs: Brief[] = [
    { id: 'b1', title: 'Junior finance partner', company: 'Table Bay Wholesalers', text: 'Support budgeting and cost control for a regional wholesaler. Strong financial literacy, comfortable explaining numbers to non-finance colleagues.', required: ['Budgeting', 'Financial literacy'], nice: ['Cost control', 'Communication'] },
    { id: 'b2', title: 'Project officer, Gauteng', company: 'Highveld Infrastructure Group', text: 'Coordinate delivery on construction support projects. Planning discipline, agile ways of working and stakeholder updates.', required: ['Project planning', 'Agile delivery'], nice: ['Stakeholder management', 'Communication'] },
    { id: 'b3', title: 'Client-facing account coordinator', company: 'Lanternfish Media', text: 'First point of contact for retainer clients. Confident presenting, calm in conflict, good at negotiation.', required: ['Communication', 'Presentation skills'], nice: ['Conflict resolution', 'Negotiation'] },
    { id: 'b4', title: 'Compliance assistant', company: 'Sable Insurance Brokers', text: 'Help the compliance officer with POPIA reviews, data protection checks and cyber awareness drives.', required: ['Data protection', 'Compliance'], nice: ['Cyber hygiene', 'Phishing awareness'] },
  ]
  const savedSearches: SavedSearch[] = [
    { id: 'ss1', recruiterId: 'r1', name: 'Finance juniors, any region', created: addDays(t, -14), briefId: 'b1', filters: { ...EMPTY_FILTERS, categories: ['Finance Skills'], sort: 'match' } },
    { id: 'ss2', recruiterId: 'r1', name: 'Presenters in Gauteng', created: addDays(t, -9), briefId: 'b3', filters: { ...EMPTY_FILTERS, region: 'Gauteng', skills: ['Presentation skills'], sort: 'newest' } },
  ]
  const shortlists: Record<string, ShortItem[]> = {
    r1: [{ code: 'TL-4830', at: ago(9) }, { code: 'TL-4837', at: ago(2) }, { code: 'TL-4900', at: ago(1) }],
  }
  const viewedSeed = { r1: ['TL-4837', 'TL-4844', 'TL-4851', 'TL-4872', 'TL-4886', 'TL-4900', 'TL-4865', 'TL-4821'] }

  const threads: Record<string, ThreadMsg[]> = {
    i1: [
      { id: 'tm1', from: 'recruiter', text: 'Hi Kabelo, thanks for approving. The role is a junior finance partner, hybrid, Cape Town.', at: ago(7, 2) },
      { id: 'tm2', from: 'learner', text: 'Sounds good. I am free on Thursday afternoon for a call.', at: ago(7, 5) },
      { id: 'tm3', from: 'recruiter', text: 'Thursday 15:00 works. I will send a calendar invite.', at: ago(6, 1) },
    ],
    i4: [
      { id: 'tm4', from: 'recruiter', text: 'Hello Naomi, we would love to tell you about our team lead trainee programme.', at: ago(11) },
      { id: 'tm5', from: 'learner', text: 'Thank you, please send the programme outline.', at: ago(10) },
    ],
  }
  const stages: Record<string, PipeStage> = { i1: 'placed', i4: 'interview' }
  const notes: Record<string, Note[]> = {
    i1: [{ id: 'n1', text: 'Panel interview went well. Offer accepted, starts 1 December.', at: ago(3) }],
    i4: [{ id: 'n2', text: 'Second interview booked with the programme lead.', at: ago(2) }],
  }
  const decisions: Record<string, Decision> = {
    i1: { approved: true, at: ago(7), message: 'Happy to chat, afternoons are best.', shared: ['Full name', 'Email address', 'Phone number'] },
    i3: { approved: false, at: ago(5), message: 'Not looking to relocate at the moment, thank you.', shared: [] },
    i4: { approved: true, at: ago(10), message: '', shared: ['Full name', 'Email address', 'Phone number'] },
  }
  const applications: Application[] = [
    { id: 'r3', linkedId: 'r3', name: 'Dumisani Zulu', company: 'Harbour Search', email: 'dumisani@harboursearch.example', regNo: '2019/448210/07', website: 'harboursearch.example', sector: 'Logistics and supply chain', size: '6 to 10 consultants', submitted: addDays(t, -3), status: 'Pending', reason: '', note: 'Specialises in port and freight operations hires.' },
    { id: 'ap2', name: 'Karabo Sithebe', company: 'Kgosi Placement Partners', email: 'karabo@kgosiplacement.example', regNo: '2021/117384/07', website: 'kgosiplacement.example', sector: 'Financial services', size: '1 to 5 consultants', submitted: addDays(t, -2), status: 'Pending', reason: '', note: 'Boutique agency placing junior finance and compliance staff.' },
    { id: 'ap3', name: 'Lauren Hendricks', company: 'Table View Talent', email: 'lauren@tableviewtalent.example', regNo: '2017/902215/07', website: 'tableviewtalent.example', sector: 'General staffing', size: '11 to 25 consultants', submitted: addDays(t, -1), status: 'Pending', reason: '', note: 'Mostly temporary and contract staffing; asks about bulk shortlists.' },
    { id: 'r1', linkedId: 'r1', name: 'Marcus Lee', company: 'Atlas Recruitment', email: 'marcus@atlasrecruit.example', regNo: '2015/331870/07', website: 'atlasrecruit.example', sector: 'Professional services', size: '11 to 25 consultants', submitted: addDays(t, -120), status: 'Approved', reason: '', note: 'Long-standing partner.' },
    { id: 'r2', linkedId: 'r2', name: 'Chloe Naidoo', company: 'Bluegum Talent', email: 'chloe@bluegumtalent.example', regNo: '2018/260044/07', website: 'bluegumtalent.example', sector: 'Project and engineering', size: '6 to 10 consultants', submitted: addDays(t, -95), status: 'Approved', reason: '', note: '' },
  ]
  return {
    briefs, savedSearches, shortlists, viewedSeed, threads, stages, notes, decisions, visibility: {}, consent: {}, applications,
    assumptions: { feePct: 12, salary: 285000, platformCost: 18000 }, pendingSavedId: null,
  }
}

/** Default consent history every learner starts with. */
export function baseConsent(learnerId: string): ConsentEntry[] {
  return [
    { id: `${learnerId}-c1`, at: ago(140), text: 'Accepted the platform terms and privacy notice' },
    { id: `${learnerId}-c2`, at: ago(75), text: 'Chose email as the only marketing channel' },
  ]
}
