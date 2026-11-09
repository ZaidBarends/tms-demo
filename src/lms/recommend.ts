import type { Course, Data } from '../shared/types'

export interface Rec { course: Course; reason: string }

/** Recommend courses the learner has not taken, based on their journeys first and shared skills second. */
export function recommend(d: Data, learnerId: string, limit = 4): Rec[] {
  const mine = d.enrolments.filter(e => e.learnerId === learnerId)
  const have = new Set(mine.map(e => e.courseId))
  const out: Rec[] = []
  const push = (c: Course | undefined, reason: string) => { if (c && c.status === 'Active' && !have.has(c.id) && !out.some(o => o.course.id === c.id)) out.push({ course: c, reason }) }

  d.journeys.forEach(j => {
    if (!j.courseIds.some(id => have.has(id))) return
    const nextId = j.courseIds.find(id => !have.has(id))
    push(d.courses.find(c => c.id === nextId), `Next step on your “${j.goal}” journey`)
  })
  const skills = new Map<string, number>()
  mine.forEach(e => d.courses.find(c => c.id === e.courseId)?.skills.forEach(s => skills.set(s, (skills.get(s) ?? 0) + 1)))
  d.courses.forEach(c => {
    const shared = c.skills.find(s => skills.has(s))
    if (shared) push(c, `Builds on your ${shared.toLowerCase()} skills`)
  })
  const softDone = mine.filter(e => e.status === 'Completed' && d.courses.find(c => c.id === e.courseId)?.soft).length
  d.courses.forEach(c => push(c, softDone ? 'Popular with learners like you' : 'A good starting point'))
  return out.slice(0, limit)
}

/** Which lesson index a learner is up to, derived from stored progress. */
export const lessonIndexFor = (progress: number, total: number) => Math.min(total - 1, Math.floor((progress / 100) * total))
