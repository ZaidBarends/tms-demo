import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerReset } from '../../shared/resetRegistry'
import { safeStorage } from '../../tms/money/safeStorage'
import { buildSeed } from '../../shared/seed'
import { addDays, today } from '../../shared/format'
import { CONFIDENCE_Q, validateAnswers, type Answers, type SurveyKind, type SurveyResponse } from './surveyLogic'

interface State {
  responses: SurveyResponse[]
  /** Saves (or replaces) the response for an enrolment. Returns an error message, or '' on success. */
  submit: (enrolId: string, kind: SurveyKind, answers: Answers) => string
}

const COMMENTS = ['More worked examples please.', 'A second break in the afternoon would help.', 'Loved the practical exercises.', '', 'Share the slides before the day.', '']

/**
 * Seed responses so the results screen has something to show: completed enrolments have both surveys,
 * part-way enrolments have the pre-course survey, and about half of booked enrolments have answered it.
 * Anything left unanswered (including a few completed courses) shows up as "to do" for the demo.
 */
export function surveySeed(): SurveyResponse[] {
  const d = buildSeed()
  const out: SurveyResponse[] = []
  d.enrolments.forEach((e, i) => {
    const at = (back: number) => addDays(today(), -back) + 'T09:00:00.000Z'
    const pre = 1 + (i % 3)
    const wantPre = e.status !== 'Booked' || i % 2 === 0
    if (wantPre) out.push({ id: `sv-pre-${e.id}`, enrolId: e.id, kind: 'pre', at: at(45), answers: { [CONFIDENCE_Q]: pre, experience: ['None', 'Some', 'Extensive'][i % 3], goal: i % 4 === 0 ? 'Apply this in my current role.' : '' } })
    if (e.status === 'Completed' && i % 7 !== 3) {
      out.push({ id: `sv-post-${e.id}`, enrolId: e.id, kind: 'post', at: at(30), answers: {
        [CONFIDENCE_Q]: Math.min(5, pre + 1 + (i % 2)), content: 3 + (i % 3), instructor: 3 + ((i + 1) % 3), nps: 6 + ((i * 3) % 5), comment: COMMENTS[i % COMMENTS.length],
      } })
    }
  })
  return out
}

const uid = () => `sv${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`

export const useSurveys = create<State>()(
  persist(
    (set, get) => ({
      responses: surveySeed(),
      submit: (enrolId, kind, answers) => {
        const err = validateAnswers(kind, answers)
        if (err) return err
        const rec: SurveyResponse = { id: uid(), enrolId, kind, at: new Date().toISOString(), answers }
        set({ responses: [...get().responses.filter(r => !(r.enrolId === enrolId && r.kind === kind)), rec] })
        return ''
      },
    }),
    { name: 'lms-surveys-v1', version: 1, storage: safeStorage() },
  ),
)
registerReset(() => useSurveys.setState({ responses: surveySeed() }))
