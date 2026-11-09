import { describe, expect, it } from 'vitest'
import { buildSeed } from '../../shared/seed'
import { addDays, today, totals } from '../../shared/format'
import { bandOf, conflictsFor, expiry, monthGrid, netUnit, recommend, suggest, weightedValue } from './logic'
import { toCsv } from './download'

describe('pipeline and quote maths', () => {
  it('weights open deals by stage probability and honours overrides', () => {
    expect(weightedValue({ stage: 'quoted', value: 100000 })).toBe(60000)
    expect(weightedValue({ stage: 'lost', value: 100000 })).toBe(0)
    expect(weightedValue({ stage: 'enquiry', value: 100000 }, 25)).toBe(25000)
    expect(bandOf(99999)).toBe('small'); expect(bandOf(250000)).toBe('large')
  })
  it('line discounts feed the same subtotal - discount + 15% VAT total', () => {
    const lines = [{ qty: 10, unit: netUnit(1000, 10) }, { qty: 2, unit: netUnit(500, 0) }]
    const t = totals(lines, 10)
    expect(t.subtotal).toBe(10000)
    expect(t.total).toBeCloseTo(10000 * 0.9 * 1.15)
  })
  it('counts expiry days', () => {
    expect(expiry(addDays(today(), 3), 'Sent')).toMatchObject({ days: 3, tone: 'warn' })
    expect(expiry(addDays(today(), -2), 'Sent').tone).toBe('bad')
    expect(expiry(addDays(today(), -2), 'Accepted').tone).toBe('none')
  })
})

describe('scheduling', () => {
  it('detects venue and instructor clashes and suggests free alternatives', () => {
    const d = buildSeed()
    const a = d.sessions[2]
    const clash = conflictsFor(d, { ...d.sessions[3], id: 'new' })
    expect(clash.some(c => c.kind === 'venue')).toBe(true)
    const alt = suggest(d, { ...a, id: 'new', venue: d.sessions[3].venue })
    expect(alt.venues).not.toContain(d.sessions[3].venue)
    for (const day of alt.dates) expect(conflictsFor(d, { ...a, id: 'new', start: day })).toHaveLength(0)
  })
  it('flags days an instructor marked unavailable', () => {
    const d = buildSeed()
    const c = { start: addDays(today(), 400), venue: 'Bellville Boardroom', instructorId: 's3', equipment: [] }
    expect(conflictsFor(d, c, { s3: [c.start] }).map(x => x.kind)).toEqual(['unavailable'])
  })
  it('builds a six-week month grid starting on a Monday', () => {
    const g = monthGrid('2026-11-09')
    expect(g).toHaveLength(42)
    expect(new Date(g[0] + 'T00:00:00').getDay()).toBe(1)
  })
})

describe('needs analysis and export', () => {
  it('recommends active courses for the biggest gaps first', () => {
    const d = buildSeed()
    const recs = recommend(d.courses, [{ id: 'a', name: 'Depot', headcount: 50, gaps: { 'Health & Safety': 4, Leadership: 1 } }])
    expect(recs[0].priority).toBe('High')
    expect(d.courses.find(c => c.id === recs[0].courseId)!.category).toBe('Health & Safety')
    expect(recs[0].seats).toBe(50)
  })
  it('escapes CSV cells', () => {
    expect(toCsv([['a,b', 'say "hi"', 3]])).toBe('"a,b","say ""hi""",3')
  })
})
