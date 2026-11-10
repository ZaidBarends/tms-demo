import { useStore } from '../shared/store'
import { money, fmtDate } from '../shared/format'
import { useB2c, type BookingRequest } from './b2cStore'

/**
 * Staff approval of a learner's reschedule or cancellation request.
 * Reschedule: moves the enrolment to the new session (only if it still has a free seat).
 * Cancel: releases the seat and records the refund owed at the percentage quoted to the learner.
 * Returns an error message, or '' on success.
 */
export function approveBookingRequest(r: BookingRequest): string {
  const st = useStore.getState()
  const e = st.data.enrolments.find(x => x.id === r.enrolId)
  if (!e) return 'The booking no longer exists.'
  if (e.status !== 'Booked') return 'Only places that have not started can be changed.'
  const learner = st.data.learners.find(l => l.id === e.learnerId)
  const course = st.data.courses.find(c => c.id === e.courseId)
  let subject = ''
  if (r.type === 'Reschedule') {
    const s = st.data.sessions.find(x => x.id === r.newSessionId)
    if (!s || s.status !== 'Scheduled') return 'The requested session is no longer available.'
    if (st.data.enrolments.filter(x => x.sessionId === s.id).length >= s.capacity) return 'The requested session is now full.'
    useStore.setState(state => {
      const d = structuredClone(state.data)
      d.enrolments.find(x => x.id === r.enrolId)!.sessionId = s.id
      return { data: d }
    })
    subject = `Your booking was moved to ${fmtDate(s.start)}`
    st.log(`${learner?.name ?? 'A learner'} rescheduled to ${fmtDate(s.start)} (${course?.title})`)
  } else {
    const receipt = st.data.receipts.find(x => x.enrolmentId === r.enrolId)
    const refund = receipt ? Math.round(receipt.amount * r.refundPct) / 100 : 0
    useStore.setState(state => {
      const d = structuredClone(state.data)
      d.enrolments = d.enrolments.filter(x => x.id !== r.enrolId)
      return { data: d }
    })
    subject = `Your booking was cancelled. Refund: ${money(refund)} (${r.refundPct}%)`
    st.log(`${learner?.name ?? 'A learner'} cancelled ${course?.title}; refund ${money(refund)} (${r.refundPct}%) to be paid`)
  }
  if (learner) st.sendEmail('m1', learner.email, subject)
  useB2c.getState().approveRequestStatus(r.id)
  return ''
}
