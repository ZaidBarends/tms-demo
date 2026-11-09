export type PipeStage = 'approved' | 'contacted' | 'interview' | 'offer' | 'placed'
export const PIPE_STAGES: { id: PipeStage; label: string }[] = [
  { id: 'approved', label: 'Introduced' }, { id: 'contacted', label: 'Contacted' }, { id: 'interview', label: 'Interview' },
  { id: 'offer', label: 'Offer' }, { id: 'placed', label: 'Placed' },
]

export interface SearchFilters {
  q: string; skills: string[]; skillMode: 'any' | 'all'; categories: string[]; region: string
  focus: 'any' | 'soft' | 'technical'; minCourses: number; availability: string; sort: 'match' | 'newest' | 'skills'
}
export const EMPTY_FILTERS: SearchFilters = { q: '', skills: [], skillMode: 'any', categories: [], region: '', focus: 'any', minCourses: 0, availability: '', sort: 'match' }

export interface Brief { id: string; title: string; company: string; text: string; required: string[]; nice: string[] }
export interface SavedSearch { id: string; recruiterId: string; name: string; filters: SearchFilters; briefId: string; created: string }
export interface ShortItem { code: string; at: string }
export interface ThreadMsg { id: string; from: 'recruiter' | 'learner'; text: string; at: string }
export interface Note { id: string; text: string; at: string }
export interface Visibility { region: boolean; titles: boolean; skills: boolean; summary: boolean }
export const DEFAULT_VISIBILITY: Visibility = { region: true, titles: true, skills: true, summary: true }
export interface Decision { approved: boolean; at: string; message: string; shared: string[] }
export interface ConsentEntry { id: string; at: string; text: string }
export interface Application {
  id: string; linkedId?: string; name: string; company: string; email: string; regNo: string; website: string
  sector: string; size: string; submitted: string; status: 'Pending' | 'Approved' | 'Rejected'; reason: string; note: string
}
export interface Assumptions { feePct: number; salary: number; platformCost: number }
export interface HistMonth { key: string; views: number; requests: number; intros: number; placements: number; avgDays: number }
