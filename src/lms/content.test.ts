import { describe, it, expect } from 'vitest'
import { buildLessons, buildQuiz, scoreQuiz, PASS_MARK } from './content'
import { toCsv } from './csv'
import type { Course } from '../shared/types'

const course: Course = { id: 'k5', code: 'LDR-310', title: 'Supervisor Foundations', category: 'Leadership', soft: false, price: 6500, hours: 16, status: 'Active', description: 'x', skills: ['Supervision', 'Team leadership'] }

describe('quiz scoring', () => {
  const qs = buildQuiz(course)
  it('builds five questions with a valid answer key', () => {
    expect(qs).toHaveLength(5)
    qs.forEach(q => q.answer.forEach(a => expect(a).toBeLessThan(q.options.length)))
    expect(qs[0].options[qs[0].answer[0]]).toBe('Supervision')
  })
  it('scores all correct as 100 and passes', () => {
    const all = Object.fromEntries(qs.map(q => [q.id, q.answer]))
    const s = scoreQuiz(qs, all)
    expect(s.pct).toBe(100); expect(s.passed).toBe(true)
  })
  it('requires every option of a multi-select to match', () => {
    const all = Object.fromEntries(qs.map(q => [q.id, q.answer]))
    all.q5 = [0, 1]
    const s = scoreQuiz(qs, all)
    expect(s.perQuestion.q5).toBe(false)
    expect(s.pct).toBe(80)
  })
  it('fails below the pass mark and ends with a quiz lesson', () => {
    const s = scoreQuiz(qs, { q1: qs[0].answer })
    expect(s.pct).toBeLessThan(PASS_MARK); expect(s.passed).toBe(false)
    expect(buildLessons(course).slice(-1)[0].kind).toBe('quiz')
  })
})

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(toCsv([['a', 'b,c', 'd"e'], [1, null, 'x\ny']])).toBe('a,"b,c","d""e"\r\n1,,"x\ny"')
  })
})
