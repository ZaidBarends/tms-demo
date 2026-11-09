import type { Data, Enrolment } from '../shared/types'
import { daysBetween, monthKey, today } from '../shared/format'
import { recruiterVisibleProfiles, RecruiterProfile } from './ringfence'
import { Brief, DEFAULT_VISIBILITY, SearchFilters, Visibility } from './talentTypes'
import { HIST_PLACEMENTS, histMonths } from './talentSeed'
import type { Decision } from './talentTypes'

export const CATEGORIES = ['Health & Safety', 'Leadership', 'Project Management', 'Finance Skills', 'Cybersecurity', 'Compliance', 'Soft Skills']
export const AVAILABILITY = ['Immediately', 'Within 1 month', 'Within 3 months']

export interface TimelineItem { courseId: string; title: string; category: string; status: Enrolment['status']; date: string; soft: boolean }
export interface Candidate extends RecruiterProfile {
  completed: number; categories: string[]; softShare: number; latest: string; availability: string; completeness: number
  timeline: TimelineItem[]; radar: Record<string, number>; vis: Visibility
}

/**
 * Builds recruiter-facing candidates. It starts from recruiterVisibleProfiles (the ringfence), then
 * re-reads ONLY self-paid enrolments. The learner's visibility toggles can only remove detail.
 */
export function buildCandidates(data: Data, visMap: Record<string, Visibility> = {}): Candidate[] {
  return recruiterVisibleProfiles(data).map(p => {
    const vis = { ...DEFAULT_VISIBILITY, ...visMap[p.learnerId] }
    const selfEnrols = data.enrolments.filter(e => e.learnerId === p.learnerId && e.payer === 'self')
    const timeline: TimelineItem[] = selfEnrols.map(e => {
      const c = data.courses.find(x => x.id === e.courseId)!
      const date = data.receipts.find(r => r.enrolmentId === e.id)?.date ?? today()
      return { courseId: c.id, title: vis.titles ? c.title : `${c.category} course`, category: c.category, status: e.status, date, soft: c.soft }
    }).sort((a, b) => a.date.localeCompare(b.date))
    const completed = timeline.filter(t => t.status === 'Completed').length
    const radar: Record<string, number> = {}
    CATEGORIES.forEach(cat => {
      const mine = timeline.filter(t => t.category === cat)
      radar[cat] = Math.min(100, mine.filter(t => t.status === 'Completed').length * 55 + mine.filter(t => t.status !== 'Completed').length * 25)
    })
    const skills = vis.skills ? p.skills : []
    const num = Number(p.code.replace(/\D/g, '')) || 0
    const summary = vis.summary ? p.summary : ''
    const completeness = Math.min(100, (summary.length >= 20 ? 30 : 0) + (skills.length >= 3 ? 20 : skills.length ? 10 : 0) + (vis.region ? 10 : 0) + (completed >= 1 ? 20 : 0) + (timeline.length >= 2 ? 10 : 0) + 10)
    return {
      ...p, summary, skills, region: vis.region ? p.region : 'Not disclosed', courses: vis.titles ? p.courses : [],
      completed, categories: Array.from(new Set(timeline.map(t => t.category))), softShare: timeline.length ? timeline.filter(t => t.soft).length / timeline.length : 0,
      latest: timeline.length ? timeline[timeline.length - 1].date : '', availability: AVAILABILITY[num % AVAILABILITY.length],
      completeness, timeline, radar, vis,
    }
  })
}

export interface MatchResult { score: number; matched: string[]; missing: string[]; niceMatched: string[]; niceMissing: string[] }
/** Required skills are worth 3 points each, nice-to-haves 1 point each. */
export function matchScore(skills: string[], brief: Pick<Brief, 'required' | 'nice'>): MatchResult {
  const have = new Set(skills.map(s => s.toLowerCase()))
  const matched = brief.required.filter(s => have.has(s.toLowerCase()))
  const missing = brief.required.filter(s => !have.has(s.toLowerCase()))
  const niceMatched = brief.nice.filter(s => have.has(s.toLowerCase()))
  const niceMissing = brief.nice.filter(s => !have.has(s.toLowerCase()))
  const denom = 3 * brief.required.length + brief.nice.length
  const score = denom === 0 ? 0 : Math.round((100 * (3 * matched.length + niceMatched.length)) / denom)
  return { score, matched, missing, niceMatched, niceMissing }
}

const ALIASES: Record<string, string> = {
  budget: 'Budgeting', agile: 'Agile delivery', scrum: 'Agile delivery', planning: 'Project planning', stakeholder: 'Stakeholder management',
  communicat: 'Communication', presenting: 'Presentation skills', presentation: 'Presentation skills', leadership: 'Team leadership', coaching: 'Coaching',
  popia: 'Data protection', privacy: 'Data protection', 'data protection': 'Data protection', phishing: 'Phishing awareness', cyber: 'Cyber hygiene',
  'first aid': 'First aid', emergency: 'Emergency response', hazard: 'Hazard identification', conflict: 'Conflict resolution', negotiat: 'Negotiation',
  'time management': 'Time management', financ: 'Financial literacy', 'cost control': 'Cost control', supervis: 'Supervision', compliance: 'Compliance',
  'emotional intelligence': 'Emotional intelligence', prioriti: 'Prioritisation',
}
/** Finds known skills named (or hinted at) in a pasted job brief. */
export function extractSkills(text: string, known: string[]): string[] {
  const t = text.toLowerCase()
  const out = new Set<string>()
  known.forEach(k => { if (t.includes(k.toLowerCase())) out.add(k) })
  Object.entries(ALIASES).forEach(([key, skill]) => { if (t.includes(key) && known.includes(skill)) out.add(skill) })
  return Array.from(out)
}

export interface Ranked { c: Candidate; m: MatchResult | null }
export function rankCandidates(list: Candidate[], f: SearchFilters, brief: Pick<Brief, 'required' | 'nice'> | null): Ranked[] {
  const q = f.q.trim().toLowerCase()
  const out = list.filter(c => {
    if (q && !(c.summary + ' ' + c.skills.join(' ') + ' ' + c.timeline.map(t => t.title).join(' ') + ' ' + c.region).toLowerCase().includes(q)) return false
    if (f.skills.length) {
      const has = (s: string) => c.skills.includes(s)
      if (f.skillMode === 'all' ? !f.skills.every(has) : !f.skills.some(has)) return false
    }
    if (f.categories.length && !f.categories.some(cat => c.categories.includes(cat))) return false
    if (f.region && c.region !== f.region) return false
    if (f.focus === 'soft' && c.softShare < 0.5) return false
    if (f.focus === 'technical' && c.softShare >= 0.5) return false
    if (c.completed < f.minCourses) return false
    if (f.availability && c.availability !== f.availability) return false
    return true
  }).map(c => ({ c, m: brief ? matchScore(c.skills, brief) : null }))
  out.sort((a, b) => {
    if (f.sort === 'newest') return b.c.latest.localeCompare(a.c.latest)
    if (f.sort === 'skills') return b.c.skills.length - a.c.skills.length
    return (b.m?.score ?? 0) - (a.m?.score ?? 0) || b.c.skills.length - a.c.skills.length
  })
  return out
}

// ---------- recruiter funnel ----------
export interface FunnelStep { step: string; value: number }
export function recruiterFunnel(data: Data, recruiterId: string, shortlistCodes: string[], viewedSeed: string[]): FunnelStep[] {
  const rec = data.recruiters.find(r => r.id === recruiterId)
  const codeOf = (learnerId: string) => data.talent.find(t => t.learnerId === learnerId)?.code ?? learnerId
  const mine = data.intros.filter(i => i.recruiterId === recruiterId)
  const requested = new Set(mine.map(i => codeOf(i.learnerId)))
  const approved = new Set(mine.filter(i => i.status === 'Approved').map(i => codeOf(i.learnerId)))
  const placed = new Set(mine.filter(i => i.placed).map(i => codeOf(i.learnerId)))
  const viewed = new Set<string>(viewedSeed)
  if (rec) data.audit.filter(a => a.action === 'View' && a.actor.startsWith(`${rec.name} (`)).forEach(a => viewed.add(a.target))
  const shortlisted = new Set<string>(shortlistCodes)
  requested.forEach(c => shortlisted.add(c))
  shortlisted.forEach(c => viewed.add(c))
  return [
    { step: 'Viewed', value: viewed.size }, { step: 'Shortlisted', value: shortlisted.size }, { step: 'Requested', value: requested.size },
    { step: 'Approved', value: approved.size }, { step: 'Placed', value: placed.size },
  ]
}

// ---------- ROI ----------
export interface TrendRow { key: string; views: number; requests: number; intros: number; placements: number; avgDays: number }
export function monthlyTrend(data: Data, decisions: Record<string, Decision>): TrendRow[] {
  const hist = histMonths()
  const now = new Date()
  const keys = [1, 0].map(k => {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const live: TrendRow[] = keys.map(key => {
    const reqs = data.intros.filter(i => monthKey(i.created) === key)
    const gaps = reqs.filter(i => decisions[i.id]?.approved).map(i => Math.max(0, daysBetween(i.created, decisions[i.id].at.slice(0, 10))))
    return {
      key, views: data.audit.filter(a => a.action === 'View' && a.at.slice(0, 7) === key).length,
      requests: reqs.length, intros: reqs.filter(i => i.status === 'Approved').length, placements: reqs.filter(i => i.placed).length,
      avgDays: gaps.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : 0,
    }
  })
  return [...hist, ...live]
}

export interface RoiNumbers { views: number; requested: number; approved: number; placed: number; avgDays: number; histPlacements: number }
export function roiNumbers(data: Data, decisions: Record<string, Decision>): RoiNumbers {
  const hist = histMonths()
  const histSum = (k: 'views' | 'requests' | 'intros' | 'placements') => hist.reduce((a, h) => a + h[k], 0)
  const gaps = data.intros.filter(i => decisions[i.id]?.approved).map(i => Math.max(0, daysBetween(i.created, decisions[i.id].at.slice(0, 10))))
  const histGapAvg = hist.reduce((a, h) => a + h.avgDays, 0) / hist.length
  const liveAvg = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : histGapAvg
  return {
    views: histSum('views') + data.audit.filter(a => a.action === 'View').length,
    requested: histSum('requests') + data.intros.length,
    approved: histSum('intros') + data.intros.filter(i => i.status === 'Approved').length,
    placed: histSum('placements') + data.intros.filter(i => i.placed).length,
    avgDays: Math.round(liveAvg * 10) / 10,
    histPlacements: histSum('placements'),
  }
}
export const histPlacementsFor = (recruiterId: string) => HIST_PLACEMENTS[recruiterId] ?? 0
export const estimatedValue = (placements: number, salary: number, feePct: number) => Math.round(placements * salary * (feePct / 100))

// ---------- admin helpers ----------
export function recruiterActivity(data: Data) {
  return data.recruiters.map(r => {
    const mine = data.audit.filter(a => a.actor.startsWith(`${r.name} (`))
    const intros = data.intros.filter(i => i.recruiterId === r.id)
    const last = mine.map(a => a.at).sort().pop()
    return {
      id: r.id, name: r.name, company: r.company, approved: r.approved,
      views: mine.filter(a => a.action === 'View').length, requests: intros.length,
      approvedIntros: intros.filter(i => i.status === 'Approved').length, declined: intros.filter(i => i.status === 'Declined').length,
      placed: intros.filter(i => i.placed).length, last: last ?? '',
    }
  })
}
