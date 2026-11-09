import type { Screen } from '../shared/access'
// Metadata for additional screens owned by this area. Merged into SCREENS in access.ts.
export const extraScreens: Screen[] = [
  { id: 'achievements', title: 'Achievements', area: 'LMS', path: '/achievements', route: '/achievements', roles: ['internal', 'blearner', 'b2c'], release: 'R2', nav: true,
    why: 'Badges, streaks and points are built from a learner’s own activity, so each learner sees only their own, plus an anonymised leaderboard.' },
]
