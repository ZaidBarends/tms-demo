import type { Data, Enrolment } from '../../shared/types'

/** Pre- and post-course surveys. In production each is a Microsoft Form embedded in the site; the demo simulates the form. */
export type SurveyKind = 'pre' | 'post'
export type Answers = Record<string, string | number>
export interface SurveyResponse { id: string; enrolId: string; kind: SurveyKind; at: string; answers: Answers }

export interface Question {
  id: string; label: string; type: 'scale' | 'choice' | 'nps' | 'text'; options?: string[]; required: boolean
}

/** The confidence question is asked before and after, so the two can be compared (self-reported uplift). */
export const CONFIDENCE_Q = 'confidence'

export const KIND_LABEL: Record<SurveyKind, string> = { pre: 'Pre-course survey', post: 'Post-course survey' }

export const QUESTIONS: Record<SurveyKind, Question[]> = {
  pre: [
    { id: CONFIDENCE_Q, label: 'How confident are you in this topic today? (1 = not at all, 5 = very confident)', type: 'scale', required: true },
    { id: 'experience', label: 'How much experience do you already have with this topic?', type: 'choice', options: ['None', 'Some', 'Extensive'], required: true },
    { id: 'goal', label: 'What do you hope to be able to do after the course?', type: 'text', required: false },
  ],
  post: [
    { id: CONFIDENCE_Q, label: 'How confident are you in this topic now? (1 = not at all, 5 = very confident)', type: 'scale', required: true },
    { id: 'content', label: 'The content was relevant to my work (1 = disagree, 5 = agree)', type: 'scale', required: true },
    { id: 'instructor', label: 'The course was well delivered (1 = disagree, 5 = agree)', type: 'scale', required: true },
    { id: 'nps', label: 'How likely are you to recommend this course to a colleague? (0 to 10)', type: 'nps', required: true },
    { id: 'comment', label: 'What one thing would improve this course?', type: 'text', required: false },
  ],
}

/** Returns '' when valid, otherwise the first problem. */
export function validateAnswers(kind: SurveyKind, a: Answers): string {
  for (const q of QUESTIONS[kind]) {
    const v = a[q.id]
    const blank = v === undefined || v === '' || (typeof v === 'string' && !v.trim())
    if (q.required && blank) return `Please answer: ${q.label.split(' (')[0]}`
    if (blank) continue
    if (q.type === 'scale' && !(Number(v) >= 1 && Number(v) <= 5)) return 'Scale answers are 1 to 5.'
    if (q.type === 'nps' && !(Number(v) >= 0 && Number(v) <= 10)) return 'Recommendation is 0 to 10.'
    if (q.type === 'choice' && !q.options!.includes(String(v))) return `Choose one of: ${q.options!.join(', ')}.`
  }
  return ''
}

export interface FormVars { code: string; course: string; enrolment: string; learner: string }
/** Fills {code}, {course}, {enrolment} and {learner} in a Forms link template (URL-encoded) so the form can be pre-filled. */
export function formUrl(template: string, v: FormVars): string {
  return template.replace(/\{(code|course|enrolment|learner)\}/g, (_, k: keyof FormVars) => encodeURIComponent(v[k]))
}

const FORMS_HOSTS = ['forms.office.com', 'forms.cloud.microsoft', 'forms.microsoft.com']
/** Returns '' when the link is a Microsoft Forms address, otherwise an error message. */
export function checkFormsUrl(url: string): string {
  let u: URL
  try { u = new URL(url.replace(/\{\w+\}/g, 'x')) } catch { return 'Enter a full web address that starts with https://' }
  if (u.protocol !== 'https:') return 'The link must start with https://'
  if (!FORMS_HOSTS.includes(u.hostname)) return `Use a Microsoft Forms link (${FORMS_HOSTS.join(', ')})`
  return ''
}

export const findResponse = (rs: SurveyResponse[], enrolId: string, kind: SurveyKind) => rs.find(r => r.enrolId === enrolId && r.kind === kind)

/** Which survey can the learner act on now? Pre until the course is done, post only once it is complete. */
export function surveyDue(e: Pick<Enrolment, 'status'>, kind: SurveyKind): boolean {
  return kind === 'pre' ? e.status !== 'Completed' : e.status === 'Completed'
}

const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null
const num = (r: SurveyResponse | undefined, q: string) => r && r.answers[q] !== undefined ? Number(r.answers[q]) : undefined
const round1 = (n: number | null) => n === null ? null : Math.round(n * 10) / 10

/** Net promoter score: % promoters (9-10) minus % detractors (0-6). Null with no answers. */
export function nps(scores: number[]): number | null {
  if (!scores.length) return null
  const p = scores.filter(s => s >= 9).length, dtr = scores.filter(s => s <= 6).length
  return Math.round(((p - dtr) / scores.length) * 100)
}

export interface CourseSurveyRow {
  courseId: string; code: string; title: string; enrolments: number; completed: number; pre: number; post: number
  preConf: number | null; postConf: number | null; uplift: number | null; content: number | null; instructor: number | null; nps: number | null
}

/** Per-course roll-up. Pre is expected from every enrolment, post from completed enrolments. Uplift compares only learners who answered both. */
export function courseRows(d: Data, rs: SurveyResponse[]): CourseSurveyRow[] {
  const out: CourseSurveyRow[] = []
  for (const c of d.courses) {
    const es = d.enrolments.filter(e => e.courseId === c.id)
    if (!es.length) continue
    const pre = es.map(e => findResponse(rs, e.id, 'pre')).filter((r): r is SurveyResponse => !!r)
    const post = es.map(e => findResponse(rs, e.id, 'post')).filter((r): r is SurveyResponse => !!r)
    const both = es.map(e => [num(findResponse(rs, e.id, 'pre'), CONFIDENCE_Q), num(findResponse(rs, e.id, 'post'), CONFIDENCE_Q)] as const).filter((p): p is readonly [number, number] => p[0] !== undefined && p[1] !== undefined)
    const upl = avg(both.map(([a, b]) => b - a))
    out.push({
      courseId: c.id, code: c.code, title: c.title, enrolments: es.length, completed: es.filter(e => e.status === 'Completed').length, pre: pre.length, post: post.length,
      preConf: round1(avg(pre.map(r => Number(r.answers[CONFIDENCE_Q])))), postConf: round1(avg(post.map(r => Number(r.answers[CONFIDENCE_Q])))), uplift: round1(upl),
      content: round1(avg(post.map(r => Number(r.answers.content)))), instructor: round1(avg(post.map(r => Number(r.answers.instructor)))), nps: nps(post.map(r => Number(r.answers.nps))),
    })
  }
  return out.sort((a, b) => b.enrolments - a.enrolments || a.code.localeCompare(b.code))
}

export interface Totals { preRate: number; postRate: number; uplift: number | null; nps: number | null; preDue: Enrolment[]; postDue: Enrolment[] }
/** Overall response rates, mean confidence uplift and NPS, plus the enrolments still owing each survey. */
export function totals(d: Data, rs: SurveyResponse[]): Totals {
  const preDue = d.enrolments.filter(e => surveyDue(e, 'pre') && !findResponse(rs, e.id, 'pre'))
  const postDue = d.enrolments.filter(e => surveyDue(e, 'post') && !findResponse(rs, e.id, 'post'))
  const completed = d.enrolments.filter(e => e.status === 'Completed')
  const withPre = d.enrolments.filter(e => findResponse(rs, e.id, 'pre')).length
  const preRate = d.enrolments.length ? Math.round((withPre / d.enrolments.length) * 100) : 0
  const postRate = completed.length ? Math.round(((completed.length - postDue.length) / completed.length) * 100) : 0
  const gains = d.enrolments.flatMap(e => { const a = num(findResponse(rs, e.id, 'pre'), CONFIDENCE_Q), b = num(findResponse(rs, e.id, 'post'), CONFIDENCE_Q); return a !== undefined && b !== undefined ? [b - a] : [] })
  const uplift = round1(avg(gains))
  const scores = rs.filter(r => r.kind === 'post').map(r => Number(r.answers.nps))
  return { preRate, postRate, uplift, nps: nps(scores), preDue, postDue }
}
