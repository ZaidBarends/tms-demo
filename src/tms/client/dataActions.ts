import { useStore } from '../../shared/store'
import { today } from '../../shared/format'

/** Remove a learner from a booking that has not started. Returns an error message or ''. */
export function removeEnrolment(enrolId: string): string {
  const d0 = useStore.getState().data
  const e = d0.enrolments.find(x => x.id === enrolId)
  if (!e) return 'That booking could not be found.'
  if (e.status !== 'Booked') return 'Only places that have not started can be removed.'
  useStore.setState(s => {
    const d = structuredClone(s.data)
    d.enrolments = d.enrolments.filter(x => x.id !== enrolId)
    return { data: d }
  })
  const l = d0.learners.find(x => x.id === e.learnerId)
  const c = d0.courses.find(x => x.id === e.courseId)
  useStore.getState().log(`${l?.name ?? 'A learner'} removed from ${c?.title ?? 'a course'} by their organisation`)
  return ''
}

/** Move a not-yet-started place to a different course (first upcoming session if there is one). */
export function transferEnrolment(enrolId: string, courseId: string): string {
  const d0 = useStore.getState().data
  const e = d0.enrolments.find(x => x.id === enrolId)
  if (!e) return 'That booking could not be found.'
  if (e.status !== 'Booked') return 'Only places that have not started can be transferred.'
  if (d0.enrolments.some(x => x.learnerId === e.learnerId && x.courseId === courseId)) return 'This learner is already on that course.'
  useStore.setState(s => {
    const d = structuredClone(s.data)
    const x = d.enrolments.find(y => y.id === enrolId)!
    x.courseId = courseId
    x.sessionId = d.sessions.find(z => z.courseId === courseId && z.start >= today() && z.status === 'Scheduled')?.id
    return { data: d }
  })
  const l = d0.learners.find(x => x.id === e.learnerId)
  const c = d0.courses.find(x => x.id === courseId)
  useStore.getState().log(`${l?.name ?? 'A learner'} transferred to ${c?.title ?? 'another course'}`)
  return ''
}
