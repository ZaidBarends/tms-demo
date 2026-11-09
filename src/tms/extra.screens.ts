import type { Screen } from '../shared/access'
// Metadata for additional screens owned by this area. Merged into SCREENS in access.ts.
export const extraScreens: Screen[] = [
  { id: 'finance-dashboard', title: 'Finance dashboard', area: 'TMS', path: '/finance/dashboard', route: '/finance/dashboard', roles: ['finance', 'admin'], release: 'R1', nav: true, why: 'Cash position, ageing and collections are for Finance and the Administrator.' },
]
