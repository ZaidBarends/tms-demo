import { useStore } from '../../shared/store'
import { useSettings } from '../../admin/settingsStore'
import { useSurveys } from './surveyStore'
import { findResponse, formUrl, KIND_LABEL, surveyDue, type SurveyKind } from './surveyLogic'

/** The Microsoft Forms link for one enrolment, with the course and enrolment filled in so the form can be pre-filled. */
export function surveyLink(enrolId: string, kind: SurveyKind): string {
  const d = useStore.getState().data
  const e = d.enrolments.find(x => x.id === enrolId)
  const c = d.courses.find(x => x.id === e?.courseId)
  const l = d.learners.find(x => x.id === e?.learnerId)
  const s = useSettings.getState().settings.surveys
  return formUrl(kind === 'pre' ? s.preUrl : s.postUrl, { code: c?.code ?? '', course: c?.title ?? '', enrolment: enrolId, learner: l?.email ?? '' })
}

/**
 * Emails the learner the survey link (sent log + activity feed). Skips, and returns false, when the survey
 * is not due yet, is already answered, or the enrolment is gone. Used for first invites and reminders.
 */
export function sendSurveyEmail(enrolId: string, kind: SurveyKind, reminder = false): boolean {
  const st = useStore.getState()
  const e = st.data.enrolments.find(x => x.id === enrolId)
  if (!e || !surveyDue(e, kind) || findResponse(useSurveys.getState().responses, enrolId, kind)) return false
  const learner = st.data.learners.find(l => l.id === e.learnerId)
  const course = st.data.courses.find(c => c.id === e.courseId)
  if (!learner || !course) return false
  const what = KIND_LABEL[kind].toLowerCase()
  st.sendEmail('m2', learner.email, `${reminder ? 'Reminder: ' : ''}${course.title}: please complete the ${what}`)
  st.log(`${reminder ? 'Reminder sent for' : 'Invited to'} the ${what}: ${learner.name} (${course.code})`)
  return true
}

/** Reminds every learner in `enrolIds` who still owes the survey. Returns how many were emailed. */
export function remindAll(enrolIds: string[], kind: SurveyKind): number {
  return enrolIds.filter(id => sendSurveyEmail(id, kind, true)).length
}
