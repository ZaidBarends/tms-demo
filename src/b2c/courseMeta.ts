import type { Course, Data, Session } from '../shared/types'
import { addDays, today } from '../shared/format'
import { seatsTaken } from '../shared/calc'
import { hashOf } from '../lms/gamify'
import { buildLessons } from '../lms/content'
import type { Review } from './b2cStore'

const NAMES = ['Thabiso M.', 'Anneke V.', 'Priyanka S.', 'Sizwe K.', 'Michelle D.', 'Lukhanyo N.', 'Hanlie B.', 'Farai C.', 'Ayanda P.', 'Craig W.', 'Nokuthula T.', 'Imraan J.']
const TEXT: Record<number, string[]> = {
  5: ['Practical, clear and immediately useful at work.', 'The trainer was excellent. I applied it the next day.', 'Best short course I have done this year.'],
  4: ['Good balance of theory and practice. A little more time for questions would help.', 'Well structured with useful templates.', 'Solid content and friendly trainer.'],
  3: ['Decent overview, but I expected more depth.', 'Useful basics. The pace was uneven.'],
  2: ['Too much slide reading for my taste.'],
}

export function seedReviews(courseId: string): Review[] {
  const h = hashOf(courseId); const n = 5 + (h % 5)
  return Array.from({ length: n }, (_, i) => {
    const r = hashOf(`${courseId}:${i}`) % 100
    const rating = r < 52 ? 5 : r < 82 ? 4 : r < 94 ? 3 : 2
    const pool = TEXT[rating]
    return { id: `${courseId}-r${i}`, courseId, name: NAMES[(h + i * 5) % NAMES.length], rating, text: pool[(h + i) % pool.length], date: addDays(today(), -(5 + ((h >> 3) + i * 23) % 240)) }
  })
}
export function reviewsFor(courseId: string, mine: Review[]): Review[] {
  return [...mine.filter(r => r.courseId === courseId), ...seedReviews(courseId)].sort((a, b) => b.date.localeCompare(a.date))
}
export function ratingSummary(rs: Review[]) {
  const hist = [5, 4, 3, 2, 1].map(star => ({ star, n: rs.filter(r => r.rating === star).length }))
  const avg = rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0
  return { avg: Math.round(avg * 10) / 10, count: rs.length, hist }
}

export const courseNo = (c: Course) => Number(c.id.replace(/\D/g, '')) || 0
export const enrolCount = (d: Data, courseId: string) => d.enrolments.filter(e => e.courseId === courseId).length
export function popularIds(d: Data): Set<string> {
  return new Set([...d.courses].sort((a, b) => enrolCount(d, b.id) - enrolCount(d, a.id)).slice(0, 4).map(c => c.id))
}
export const isNew = (c: Course) => courseNo(c) >= 14
export const levelOf = (c: Course): 'Beginner' | 'Intermediate' | 'Advanced' => c.price >= 8500 ? 'Advanced' : c.hours <= 8 && c.price < 4500 ? 'Beginner' : 'Intermediate'

export function formatOf(d: Data, c: Course): 'Classroom' | 'Online' | 'Blended' {
  const ss = d.sessions.filter(s => s.courseId === c.id)
  if (!ss.length) return 'Online'
  const online = ss.filter(s => s.venue.startsWith('Online')).length
  return online === 0 ? 'Classroom' : online === ss.length ? 'Online' : 'Blended'
}

/** Seats left, with a few sessions pre-filled so the waitlist can be demonstrated. */
export function seatsLeft(d: Data, s: Session): number {
  const h = hashOf(s.id)
  if (h % 6 === 0) return 0
  return Math.max(0, s.capacity - seatsTaken(d, s.id) - (h % 4))
}
export const upcomingSessions = (d: Data, courseId: string) =>
  d.sessions.filter(s => s.courseId === courseId && s.start >= today() && s.status === 'Scheduled').sort((a, b) => a.start.localeCompare(b.start))

export function instructorFor(d: Data, courseId: string) {
  const s = upcomingSessions(d, courseId)[0] ?? d.sessions.find(x => x.courseId === courseId)
  const staff = d.staff.find(x => x.id === s?.instructorId) ?? d.staff.find(x => x.role === 'instructor')!
  const h = hashOf(staff.id)
  return { ...staff, years: 7 + (h % 12), trained: (20 + (h % 40)) * 50, rating: 4.6 + (h % 4) / 10, bio: `${staff.name.split(' ')[0]} has facilitated workshops for logistics, mining and retail teams across South Africa and focuses on practical, scenario-based learning.` }
}

export const outcomesFor = (c: Course) => [...c.skills.map(s => `Apply ${s.toLowerCase()} confidently in your daily work`), 'Complete a knowledge check and earn a verifiable certificate', 'Leave with templates and checklists you can use straight away']
export const curriculumFor = (c: Course) => {
  const ls = buildLessons(c); const mods = Array.from(new Set(ls.map(l => l.module)))
  return mods.map(m => ({ module: m, lessons: ls.filter(l => l.module === m) }))
}
export const faqsFor = (c: Course) => [
  { q: 'Do I get a certificate?', a: `Yes. Pass the knowledge check and a certificate for ${c.title} is issued to your account straight away.${['Health & Safety', 'Compliance'].includes(c.category) ? ' It is valid for two years and you can renew it from the Certifications screen.' : ''}` },
  { q: 'Can I pay by EFT?', a: 'Yes. Choose EFT at checkout, use the reference we give you, and your place is held for 3 business days.' },
  { q: 'What if I cannot attend my date?', a: 'You can request a reschedule or cancellation from My bookings. Cancellations more than 7 days before the start get a full refund.' },
  { q: 'Will my employer see my booking?', a: 'No. Self-paid bookings are private to you. Employer-paid courses are shown to your employer only.' },
  { q: 'Do I need any prior knowledge?', a: levelOf(c) === 'Beginner' ? 'No. This course starts from the basics.' : 'Some workplace experience helps. The first lesson recaps the essentials.' },
]
