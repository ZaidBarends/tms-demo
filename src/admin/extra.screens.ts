import type { Screen } from '../shared/access'
// Metadata for additional screens owned by this area. Merged into SCREENS in access.ts.
export const extraScreens: Screen[] = [
  { id: 'audit-trail', title: 'Audit trail', area: 'Administration', path: '/admin/audit', route: '/admin/audit', roles: ['admin'], release: 'R1', nav: true, why: 'The audit trail combines business activity with every recruiter view and request, so only the Administrator can read it.' },
  { id: 'settings', title: 'Settings', area: 'Administration', path: '/admin/settings', route: '/admin/settings', roles: ['admin'], release: 'R1', nav: true, why: 'Organisation profile, numbering formats, notifications and branding affect every document, so they are Administrator-only.' },
]
