import type { Data } from '../shared/types'

export const LEVELS = ['Not started', 'Beginner', 'Practising', 'Advanced']

/** Verified skill level 0-3 from courses started (+1) and completed (+2). Kept for other screens. */
export function skillLevels(d: Data, learnerId: string, selfOnly = false) {
  const m: Record<string, { level: number; soft: boolean }> = {}
  d.enrolments.filter(e => e.learnerId === learnerId && (!selfOnly || e.payer === 'self') && e.progress > 0).forEach(e => {
    const c = d.courses.find(x => x.id === e.courseId)!
    c.skills.forEach(s => {
      m[s] ??= { level: 0, soft: c.soft }
      m[s].level = Math.min(3, m[s].level + (e.status === 'Completed' ? 2 : 1))
      m[s].soft = m[s].soft || c.soft
    })
  })
  return m
}

export interface SkillInfo { name: string; category: string; soft: boolean; courseIds: string[] }
export function skillUniverse(d: Data): SkillInfo[] {
  const m = new Map<string, SkillInfo>()
  d.courses.filter(c => c.status === 'Active').forEach(c => c.skills.forEach(s => {
    const x = m.get(s) ?? { name: s, category: c.category, soft: c.soft, courseIds: [] }
    x.courseIds.push(c.id); x.soft = x.soft || c.soft; m.set(s, x)
  }))
  return [...m.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const TARGET_ROLES: Record<string, Record<string, number>> = {
  'Team leader': { 'Team leadership': 3, Coaching: 2, Supervision: 2, Communication: 2, 'Conflict resolution': 2, 'Emotional intelligence': 2, 'Time management': 2 },
  'Project manager': { 'Project planning': 3, 'Stakeholder management': 2, 'Agile delivery': 2, Budgeting: 2, Communication: 2, Prioritisation: 2 },
  'Safety officer': { 'Hazard identification': 3, 'OHS compliance': 3, 'First aid': 2, 'Emergency response': 2, 'Fall protection': 2, Communication: 1 },
  'Finance business partner': { 'Financial literacy': 3, Budgeting: 3, 'Cost control': 2, Communication: 2, 'Presentation skills': 2 },
  'Compliance analyst': { 'Data protection': 3, Compliance: 3, 'Cyber hygiene': 2, 'Phishing awareness': 2, Communication: 2 },
}

export interface Gap { skill: string; need: number; have: number; gap: number }
export function gapAnalysis(role: string, have: (skill: string) => number): { rows: Gap[]; coverage: number } {
  const req = TARGET_ROLES[role] ?? {}
  const rows = Object.entries(req).map(([skill, need]) => ({ skill, need, have: have(skill), gap: Math.max(0, need - have(skill)) }))
  const total = rows.reduce((a, r) => a + r.need, 0)
  const got = rows.reduce((a, r) => a + Math.min(r.have, r.need), 0)
  return { rows: rows.sort((a, b) => b.gap - a.gap), coverage: total ? Math.round((got / total) * 100) : 0 }
}

/** Radar axis score 0-100 for a category from a per-skill 0-3 level function. */
export function areaScore(skills: SkillInfo[], category: string, level: (s: string) => number): number {
  const xs = skills.filter(s => s.category === category)
  if (!xs.length) return 0
  return Math.round((xs.reduce((a, s) => a + level(s.name), 0) / (xs.length * 3)) * 100)
}
