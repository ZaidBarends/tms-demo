import type { Data } from '../shared/types'
import { addDays, parse, today } from '../shared/format'
import type { PointEvent } from './lmsStore'

const hash = (s: string) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 }
export const hashOf = hash

const STREAK_BASE: Record<string, number> = { 'Zanele Ndlovu': 4, 'Johan Botha': 3, 'Sipho Khumalo': 9 }

/** Minutes learnt per day (invented history, relative to today) so every persona has a believable streak. */
export function baseActivity(name: string): Record<string, number> {
  const n = STREAK_BASE[name] ?? (hash(name) % 5)
  const out: Record<string, number> = {}
  for (let i = 0; i < n; i++) out[addDays(today(), -i)] = 12 + (hash(name + i) % 40)
  for (let i = n + 1; i < 60; i++) if (hash(`${name}:${i}`) % 100 < 36) out[addDays(today(), -i)] = 10 + (hash(name + i) % 45)
  return out
}
export function mergeActivity(base: Record<string, number>, extra: Record<string, number> = {}) {
  const out = { ...base }
  Object.entries(extra).forEach(([k, v]) => { out[k] = (out[k] ?? 0) + v })
  return out
}

/** Consecutive days with learning, ending today (or yesterday, so a streak is not lost before you have studied today). */
export function currentStreak(map: Record<string, number>, from = today()): number {
  let cur = from
  if (!(map[cur] > 0)) cur = addDays(cur, -1)
  let n = 0
  while (map[cur] > 0) { n++; cur = addDays(cur, -1) }
  return n
}
export function longestStreak(map: Record<string, number>, days = 60): number {
  let best = 0, run = 0
  for (let i = days; i >= 0; i--) { if (map[addDays(today(), -i)] > 0) { run++; best = Math.max(best, run) } else run = 0 }
  return best
}
export function mondayOf(date: string): string {
  const dow = (parse(date).getDay() + 6) % 7
  return addDays(date, -dow)
}
export function weekMinutes(map: Record<string, number>, on = today()): number {
  const start = mondayOf(on); let sum = 0
  for (let i = 0; i < 7; i++) { const d = addDays(start, i); if (d <= on) sum += map[d] ?? 0 }
  return sum
}
const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export function lastDays(map: Record<string, number>, n = 7) {
  return Array.from({ length: n }, (_, i) => { const date = addDays(today(), -(n - 1 - i)); return { date, label: DAY[parse(date).getDay()], mins: map[date] ?? 0 } })
}

export function pointEvents(d: Data, learnerId: string, extra: PointEvent[] = []): PointEvent[] {
  const title = (id: string) => d.courses.find(c => c.id === id)?.title ?? 'a course'
  const ev: PointEvent[] = []
  d.certificates.filter(c => c.learnerId === learnerId).forEach(c => ev.push({ id: `c-${c.id}`, at: `${c.issued}T09:00:00`, label: `Completed ${title(c.courseId)}`, pts: 100 }))
  d.enrolments.filter(e => e.learnerId === learnerId && e.status !== 'Booked').forEach((e, i) =>
    ev.push({ id: `s-${e.id}`, at: `${addDays(today(), -(5 + i * 4))}T08:00:00`, label: `Started ${title(e.courseId)}`, pts: 10 }))
  return [...ev, ...extra].sort((a, b) => b.at.localeCompare(a.at))
}

const LEVELS = [
  { name: 'Newcomer', min: 0 }, { name: 'Explorer', min: 100 }, { name: 'Practitioner', min: 250 },
  { name: 'Specialist', min: 450 }, { name: 'Expert', min: 700 }, { name: 'Master', min: 1000 },
]
export function levelInfo(total: number) {
  let i = 0
  LEVELS.forEach((l, k) => { if (total >= l.min) i = k })
  const cur = LEVELS[i]; const next = LEVELS[i + 1] ?? null
  const pct = next ? Math.round(((total - cur.min) / (next.min - cur.min)) * 100) : 100
  return { level: i + 1, name: cur.name, min: cur.min, next: next?.min ?? null, nextName: next?.name ?? null, pct, toNext: next ? next.min - total : 0 }
}

export interface BadgeInput {
  completed: number; softCompleted: number; hsCompleted: number; certs: number; longest: number; notes: number
  bookmarks: number; lessons: number; bestQuiz: number; weekHit: boolean; started: number
}
export interface Badge { id: string; name: string; desc: string; icon: string; current: number; target: number; unlocked: boolean }
export function computeBadges(i: BadgeInput): Badge[] {
  const b = (id: string, name: string, desc: string, icon: string, current: number, target: number): Badge =>
    ({ id, name, desc, icon, current: Math.min(current, target), target, unlocked: current >= target })
  return [
    b('first', 'First finish', 'Complete your first course', 'ribbon', i.completed, 1),
    b('triple', 'Hat-trick', 'Complete three courses', 'trophy', i.completed, 3),
    b('five', 'High five', 'Complete five courses', 'star', i.completed, 5),
    b('roll', 'On a roll', 'Learn three days in a row', 'fire', i.longest, 3),
    b('week', 'Week warrior', 'Learn seven days in a row', 'fire', i.longest, 7),
    b('fort', 'Fortnight focus', 'Learn fourteen days in a row', 'flash', i.longest, 14),
    b('notes', 'Note taker', 'Save notes on five lessons', 'note', i.notes, 5),
    b('marks', 'Marker', 'Bookmark three moments', 'bookmark', i.bookmarks, 3),
    b('quiz', 'Quiz ace', 'Score 100% on a knowledge check', 'target', i.bestQuiz, 100),
    b('safety', 'Safety first', 'Complete a health and safety course', 'shield', i.hsCompleted, 1),
    b('people', 'People person', 'Complete two soft-skills courses', 'people', i.softCompleted, 2),
    b('cert', 'Certified', 'Hold two certificates', 'ribbon', i.certs, 2),
    b('books', 'Bookworm', 'Finish ten lessons', 'book', i.lessons, 10),
    b('goal', 'Goal getter', 'Reach your weekly learning goal', 'target', i.weekHit ? 1 : 0, 1),
    b('curious', 'Curious mind', 'Start three different courses', 'rocket', i.started, 3),
  ]
}

const WORK = [['Mandla T.', 820], ['Karabo S.', 705], ['Elize B.', 560], ['Yolanda M.', 455], ['Dumi R.', 320], ['Pru A.', 190]] as const
const COMMUNITY = [['Thuli M.', 1180], ['Ricardo A.', 905], ['Nisha K.', 640], ['Sbu D.', 420], ['Kelly-Ann P.', 260], ['Moeketsi T.', 140]] as const
export interface LeaderRow { rank: number; name: string; pts: number; me: boolean }
export function leaderboard(kind: 'work' | 'community', myName: string, myPts: number): LeaderRow[] {
  const rows: { name: string; pts: number; me: boolean }[] = (kind === 'work' ? [...WORK] : [...COMMUNITY]).map(([name, pts]) => ({ name: name as string, pts: pts as number, me: false }))
  rows.push({ name: myName, pts: myPts, me: true })
  return rows.sort((a, b) => b.pts - a.pts).map((r, i) => ({ ...r, rank: i + 1 }))
}
