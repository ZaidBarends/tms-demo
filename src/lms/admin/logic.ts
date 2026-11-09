import type { Data, Enrolment, Learner } from '../../shared/types'
import { daysBetween } from '../../shared/format'

export type Cell = 'complete' | 'progress' | 'assigned' | 'overdue' | 'none'

/** Status of one learner against one course, for the compliance matrix. */
export function cellStatus(es: Enrolment[], learnerId: string, courseId: string, on: string): { status: Cell; e?: Enrolment } {
  const e = es.filter(x => x.learnerId === learnerId && x.courseId === courseId).sort((a, b) => Number(b.status === 'Completed') - Number(a.status === 'Completed'))[0]
  if (!e) return { status: 'none' }
  if (e.status === 'Completed') return { status: 'complete', e }
  if (e.deadline && e.deadline < on) return { status: 'overdue', e }
  return { status: e.status === 'In progress' ? 'progress' : 'assigned', e }
}

export const teamKey = (l: Learner) => (l.type === 'internal' ? 'internal' : l.orgId ?? 'other')
export const teamName = (d: Data, key: string) => key === 'internal' ? 'Internal staff' : d.orgs.find(o => o.id === key)?.name ?? key
export const staffLearners = (d: Data) => d.learners.filter(l => l.type !== 'b2c')

export interface OverdueRow { e: Enrolment; learner: Learner; courseTitle: string; left: number }
/** Open enrolments for staff learners that are past due, or due within `window` days. */
export function dueRows(d: Data, on: string, window = 7): OverdueRow[] {
  const staff = new Map(staffLearners(d).map(l => [l.id, l]))
  return d.enrolments
    .filter(e => staff.has(e.learnerId) && e.status !== 'Completed' && e.deadline && daysBetween(on, e.deadline) <= window)
    .map(e => ({ e, learner: staff.get(e.learnerId)!, courseTitle: d.courses.find(c => c.id === e.courseId)?.title ?? '', left: daysBetween(on, e.deadline!) }))
    .sort((a, b) => a.left - b.left)
}

/** Share of mandatory courses a learner has completed. */
export function compliancePct(es: Enrolment[], learnerId: string, courseIds: string[]): number {
  if (!courseIds.length) return 100
  return Math.round((courseIds.filter(c => es.some(e => e.learnerId === learnerId && e.courseId === c && e.status === 'Completed')).length / courseIds.length) * 100)
}
