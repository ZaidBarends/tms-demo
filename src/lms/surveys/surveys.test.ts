import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  const m = new Map<string, string>()
  ;(globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) }, clear: () => m.clear(), key: () => null, length: 0 }
})

import { useStore } from '../../shared/store'
import { buildSeed } from '../../shared/seed'
import { useSettings, seedSettings } from '../../admin/settingsStore'
import { useSurveys, surveySeed } from './surveyStore'
import { checkFormsUrl, courseRows, findResponse, formUrl, nps, surveyDue, totals, validateAnswers } from './surveyLogic'
import { remindAll, sendSurveyEmail, surveyLink } from './surveyActions'

const fresh = () => { useStore.setState({ data: buildSeed() }); useSurveys.setState({ responses: surveySeed() }); useSettings.setState({ settings: seedSettings() }) }

describe('survey answers', () => {
  it('requires the compulsory questions and range-checks them', () => {
    expect(validateAnswers('pre', {})).toMatch(/confident/)
    expect(validateAnswers('pre', { confidence: 3, experience: 'Some' })).toBe('')
    expect(validateAnswers('pre', { confidence: 6, experience: 'Some' })).toMatch(/1 to 5/)
    expect(validateAnswers('pre', { confidence: 3, experience: 'Lots' })).toMatch(/Choose one of/)
    expect(validateAnswers('post', { confidence: 4, content: 4, instructor: 4, nps: 11 })).toMatch(/0 to 10/)
    expect(validateAnswers('post', { confidence: 4, content: 4, instructor: 4, nps: 9 })).toBe('')
  })
  it('computes NPS from promoters and detractors', () => {
    expect(nps([])).toBeNull()
    expect(nps([10, 9, 8, 3])).toBe(25)
  })
  it('pre is due until the course is done, post only afterwards', () => {
    expect(surveyDue({ status: 'Booked' }, 'pre')).toBe(true)
    expect(surveyDue({ status: 'Completed' }, 'pre')).toBe(false)
    expect(surveyDue({ status: 'In progress' }, 'post')).toBe(false)
    expect(surveyDue({ status: 'Completed' }, 'post')).toBe(true)
  })
})

describe('Microsoft Forms links', () => {
  it('fills merge fields with encoded values', () => {
    expect(formUrl('https://forms.office.com/r/X?c={code}&e={enrolment}&l={learner}', { code: 'HSE 101', course: '', enrolment: 'e1', learner: 'a@b.co' })).toBe('https://forms.office.com/r/X?c=HSE%20101&e=e1&l=a%40b.co')
  })
  it('accepts only https Microsoft Forms addresses', () => {
    expect(checkFormsUrl('https://forms.office.com/r/abc?course={code}')).toBe('')
    expect(checkFormsUrl('https://forms.cloud.microsoft/r/abc')).toBe('')
    expect(checkFormsUrl('http://forms.office.com/r/abc')).toMatch(/https/)
    expect(checkFormsUrl('https://example.com/survey')).toMatch(/Microsoft Forms/)
    expect(checkFormsUrl('not a link')).toMatch(/https/)
  })
  it('builds the link for an enrolment from settings', () => {
    fresh()
    const e = useStore.getState().data.enrolments[0]
    const code = useStore.getState().data.courses.find(c => c.id === e.courseId)!.code
    expect(surveyLink(e.id, 'pre')).toContain(`course=${encodeURIComponent(code)}`)
    expect(surveyLink(e.id, 'post')).toContain('PostCourseDemo')
  })
})

describe('survey store and reporting', () => {
  it('submitting replaces an earlier answer and rejects invalid ones', () => {
    fresh()
    const e = useStore.getState().data.enrolments.find(x => !findResponse(useSurveys.getState().responses, x.id, 'pre') && x.status !== 'Completed')!
    expect(useSurveys.getState().submit(e.id, 'pre', {})).not.toBe('')
    expect(useSurveys.getState().submit(e.id, 'pre', { confidence: 2, experience: 'None' })).toBe('')
    expect(useSurveys.getState().submit(e.id, 'pre', { confidence: 4, experience: 'Some' })).toBe('')
    const mine = useSurveys.getState().responses.filter(r => r.enrolId === e.id && r.kind === 'pre')
    expect(mine.length).toBe(1)
    expect(mine[0].answers.confidence).toBe(4)
  })
  it('seed gives completed courses both surveys, apart from a few left to do', () => {
    fresh()
    const d = useStore.getState().data, rs = useSurveys.getState().responses
    const done = d.enrolments.filter(e => e.status === 'Completed')
    expect(done.every(e => findResponse(rs, e.id, 'pre'))).toBe(true)
    const t = totals(d, rs)
    expect(t.postDue.length).toBeGreaterThan(0)
    expect(t.postDue.length).toBeLessThan(done.length)
    expect(t.uplift).toBeGreaterThan(0)
    expect(t.preRate).toBeGreaterThan(0)
    expect(courseRows(d, rs).some(r => r.uplift !== null)).toBe(true)
  })
  it('reminders email only learners who still owe the survey, once due', () => {
    fresh()
    const d = useStore.getState().data, rs = useSurveys.getState().responses
    const t = totals(d, rs)
    const sentBefore = useStore.getState().data.sent.length
    const owing = t.preDue[0], answered = d.enrolments.find(e => findResponse(rs, e.id, 'pre') && e.status !== 'Completed')
    expect(sendSurveyEmail(owing.id, 'pre', true)).toBe(true)
    expect(sendSurveyEmail(owing.id, 'post')).toBe(false)
    if (answered) expect(sendSurveyEmail(answered.id, 'pre')).toBe(false)
    expect(remindAll(t.postDue.map(e => e.id), 'post')).toBe(t.postDue.length)
    expect(useStore.getState().data.sent.length).toBe(sentBefore + 1 + t.postDue.length)
  })
})
