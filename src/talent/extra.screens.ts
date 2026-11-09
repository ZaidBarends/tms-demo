import type { Screen } from '../shared/access'
// Metadata for additional screens owned by this area. Merged into SCREENS in access.ts.
export const extraScreens: Screen[] = [
  { id: 'client-dashboard', title: 'Client dashboard', area: 'B2B client portal', path: '/client/dashboard', route: '/client/dashboard', roles: ['client'], release: 'R1', nav: true, why: 'The client contact sees training spend, compliance and progress for their own organisation only.' },
  { id: 'client-compliance', title: 'Compliance', area: 'B2B client portal', path: '/client/compliance', route: '/client/compliance', roles: ['client'], release: 'R1', nav: true, why: 'Compliance status of Cape Freight staff is client-sensitive, so only that organisation’s contact sees it.' },
  { id: 'talent-dashboard', title: 'Recruiter dashboard', area: 'Talent connection', path: '/talent/dashboard', route: '/talent/dashboard', roles: ['recruiter'], release: 'R3', nav: true, why: 'Recruiters see only their own searches, shortlist and introductions.' },
]
