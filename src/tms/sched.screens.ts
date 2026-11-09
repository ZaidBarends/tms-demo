import type { Screen } from '../shared/access'
// Metadata for additional scheduling/sales screens. Merged into SCREENS in access.ts.
export const schedScreens: Screen[] = [
  { id: 'facilitators', title: 'Facilitators', area: 'TMS', path: '/facilitators', route: '/facilitators', roles: ['admin'], release: 'R1', nav: true, why: 'Adding, editing and removing facilitators is an Administrator task. Instructors only see their own sessions.' },
  { id: 'course-detail', title: 'Course detail', area: 'TMS', path: '/course', route: '/course/:id?', roles: ['admin'], release: 'R1', why: 'Curriculum, pricing tiers, utilisation and revenue for a course are managed by the Administrator.' },
  { id: 'session-calendar', title: 'Calendar', area: 'TMS', path: '/calendar', route: '/calendar', roles: ['admin', 'instructor'], release: 'R1', nav: true, why: 'Administrators schedule and reschedule sessions; instructors use the shared calendar to see their classes and any clashes.' },
]
