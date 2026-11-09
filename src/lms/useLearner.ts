import { useMemo } from 'react'
import { useStore, useCtx } from '../shared/store'
import { useLms } from './lmsStore'
import { baseActivity, mergeActivity, currentStreak, longestStreak, weekMinutes, lastDays, pointEvents, levelInfo, computeBadges } from './gamify'

export const DEFAULT_GOAL = 150

/** Everything the learner dashboard and the achievements screen derive from the main data plus the LMS store. */
export function useLearnerStats() {
  const d = useStore(s => s.data)
  const { learnerId, learner, persona } = useCtx()
  const lms = useLms()
  return useMemo(() => {
    const name = learner?.name ?? ''
    const map = mergeActivity(baseActivity(name), lms.minutes[learnerId])
    const streak = currentStreak(map); const longest = longestStreak(map)
    const goal = lms.weeklyGoal[learnerId] ?? DEFAULT_GOAL
    const week = weekMinutes(map)
    const events = pointEvents(d, learnerId, lms.points[learnerId] ?? [])
    const total = events.reduce((a, e) => a + e.pts, 0)
    const mine = d.enrolments.filter(e => e.learnerId === learnerId)
    const done = mine.filter(e => e.status === 'Completed')
    const courseOf = (id: string) => d.courses.find(c => c.id === id)
    const notes = Object.entries(lms.notes).filter(([k, v]) => v.trim() && mine.some(e => k.startsWith(e.id + '|'))).length
    const bookmarks = mine.reduce((a, e) => a + (lms.bookmarks[e.id]?.length ?? 0), 0)
    const lessons = mine.reduce((a, e) => a + (lms.done[e.id]?.length ?? 0), 0)
    const bestQuiz = Math.max(0, ...mine.map(e => lms.quizBest[e.id] ?? 0))
    const badges = computeBadges({
      completed: done.length, certs: d.certificates.filter(c => c.learnerId === learnerId).length,
      softCompleted: done.filter(e => courseOf(e.courseId)?.soft).length,
      hsCompleted: done.filter(e => courseOf(e.courseId)?.category === 'Health & Safety').length,
      longest, notes, bookmarks, lessons: lessons + done.length * 3, bestQuiz, weekHit: week >= goal, started: mine.filter(e => e.status !== 'Booked').length,
    })
    return {
      d, learnerId, learner, persona, map, streak, longest, goal, week, days: lastDays(map), events, total,
      level: levelInfo(total), badges, mine, done, kind: (learner?.type === 'b2c' ? 'community' : 'work') as 'community' | 'work',
    }
  }, [d, learnerId, learner, persona, lms.minutes, lms.weeklyGoal, lms.points, lms.notes, lms.bookmarks, lms.done, lms.quizBest])
}
