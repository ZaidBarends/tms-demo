import type { Data, Course, Learner, TalentProfile } from '../shared/types'

export interface RecruiterProfile {
  code: string; region: string; summary: string
  courses: Course[]; skills: string[]; learnerId: string
}

/**
 * RINGFENCING RULE: only self-paid enrolments may ever feed a recruiter-visible profile.
 * Employer-paid ('employer') and internal ('internal') enrolments are excluded in code,
 * whatever the learner's opt-in flag says. A learner with no self-paid enrolments is not shown.
 */
export function recruiterVisibleProfiles(data: Data): RecruiterProfile[] {
  const out: RecruiterProfile[] = []
  for (const t of data.talent) {
    if (!t.optedIn) continue
    const selfPaid = data.enrolments.filter(e => e.learnerId === t.learnerId && e.payer === 'self')
    if (selfPaid.length === 0) continue
    const courses = selfPaid.map(e => data.courses.find(c => c.id === e.courseId)).filter((c): c is Course => !!c)
    const unique = courses.filter((c, i) => courses.findIndex(x => x.id === c.id) === i)
    const skills = Array.from(new Set(unique.flatMap(c => c.skills)))
    out.push({ code: t.code, region: t.region, summary: t.summary, courses: unique, skills, learnerId: t.learnerId })
  }
  return out
}

export interface RingfenceStats {
  excludedLearners: number; excludedEnrolments: number; mixedHistoryLearners: number
  optedIn: number; visible: number; employerPaidOnLearners: Learner[]
}

export function ringfenceStats(data: Data): RingfenceStats {
  const nonSelf = data.enrolments.filter(e => e.payer !== 'self')
  const learnerHasSelf = (id: string) => data.enrolments.some(e => e.learnerId === id && e.payer === 'self')
  const excluded = data.learners.filter(l => !learnerHasSelf(l.id) && data.enrolments.some(e => e.learnerId === l.id))
  const mixed = data.learners.filter(l => learnerHasSelf(l.id) && data.enrolments.some(e => e.learnerId === l.id && e.payer !== 'self'))
  return {
    excludedLearners: excluded.length, excludedEnrolments: nonSelf.length, mixedHistoryLearners: mixed.length,
    optedIn: data.talent.filter((t: TalentProfile) => t.optedIn).length, visible: recruiterVisibleProfiles(data).length,
    employerPaidOnLearners: excluded,
  }
}
