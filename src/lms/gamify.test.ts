import { describe, it, expect } from 'vitest'
import { currentStreak, levelInfo, computeBadges, mondayOf, leaderboard } from './gamify'
import { addDays, today } from '../shared/format'

describe('streaks', () => {
  it('counts consecutive days ending today', () => {
    const m = { [today()]: 10, [addDays(today(), -1)]: 5, [addDays(today(), -2)]: 8, [addDays(today(), -4)]: 9 }
    expect(currentStreak(m)).toBe(3)
  })
  it('keeps the streak alive when today has no learning yet, and resets after a gap', () => {
    expect(currentStreak({ [addDays(today(), -1)]: 5, [addDays(today(), -2)]: 5 })).toBe(2)
    expect(currentStreak({ [addDays(today(), -2)]: 5 })).toBe(0)
  })
  it('finds Monday of the week', () => {
    expect(mondayOf('2026-11-09')).toBe('2026-11-09')
    expect(mondayOf('2026-11-15')).toBe('2026-11-09')
  })
})

describe('levels and badges', () => {
  it('moves up levels at the thresholds', () => {
    expect(levelInfo(0).level).toBe(1)
    expect(levelInfo(250).name).toBe('Practitioner')
    expect(levelInfo(5000).next).toBeNull()
  })
  it('unlocks badges from progress and ranks the leaderboard', () => {
    const base = { completed: 3, softCompleted: 1, hsCompleted: 0, certs: 3, longest: 4, notes: 2, bookmarks: 0, lessons: 12, bestQuiz: 80, weekHit: false, started: 3 }
    const b = computeBadges(base)
    expect(b.find(x => x.id === 'triple')!.unlocked).toBe(true)
    expect(b.find(x => x.id === 'week')!.unlocked).toBe(false)
    expect(b.find(x => x.id === 'notes')!.current).toBe(2)
    const lb = leaderboard('work', 'Me', 600)
    expect(lb.find(r => r.me)!.rank).toBe(3)
  })
})
