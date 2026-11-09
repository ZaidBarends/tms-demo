import type { Persona, Release, Role } from './types'

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator', finance: 'Finance', instructor: 'Instructor', internal: 'Internal learner',
  client: 'B2B client contact', blearner: 'B2B learner', b2c: 'B2C learner', recruiter: 'Recruiter',
}
export const ROLES = Object.keys(ROLE_LABEL) as Role[]
export const ALL_ROLES: Role[] = [...ROLES]

export interface PersonaDef { id: Persona; label: string; name: string; sub: string; home: string }
export const PERSONAS: PersonaDef[] = [
  { id: 'admin', label: 'Administrator', name: 'Thandi Mokoena', sub: 'Training manager', home: '/dashboard' },
  { id: 'finance', label: 'Finance', name: 'Pieter van Wyk', sub: 'Finance lead', home: '/finance/dashboard' },
  { id: 'instructor', label: 'Instructor', name: 'Naledi Dlamini', sub: 'Trainer', home: '/my-schedule' },
  { id: 'internal', label: 'Internal learner', name: 'Sipho Khumalo', sub: 'Staff member', home: '/my-learning' },
  { id: 'client', label: 'B2B client contact', name: 'Ayesha Patel', sub: 'Cape Freight', home: '/client/dashboard' },
  { id: 'blearner', label: 'B2B learner', name: 'Johan Botha', sub: 'Cape Freight, employer-paid', home: '/my-learning' },
  { id: 'b2c', label: 'B2C learner', name: 'Zanele Ndlovu', sub: 'Self-paying', home: '/my-learning' },
  { id: 'recruiter', label: 'Recruiter', name: 'Marcus Lee', sub: 'Atlas Recruitment', home: '/talent/dashboard' },
  { id: 'all', label: 'All access', name: 'Presenter', sub: 'Every screen, no switching', home: '/dashboard' },
]
export const personaDef = (p: Persona) => PERSONAS.find(x => x.id === p)!

export const AREAS = ['TMS', 'B2B client portal', 'Catalogue and B2C', 'LMS', 'Talent connection', 'Administration'] as const
export type Area = typeof AREAS[number]

export interface Screen {
  id: string; title: string; area: Area; path: string; route: string; roles: Role[]; release: Release
  nav?: boolean; why: string; note?: string
}
const LEARNERS: Role[] = ['internal', 'blearner', 'b2c']

import { extraScreens as tmsExtra } from '../tms/extra.screens'
import { schedScreens } from '../tms/sched.screens'
import { extraScreens as b2cExtra } from '../b2c/extra.screens'
import { extraScreens as lmsExtra } from '../lms/extra.screens'
import { extraScreens as talentExtra } from '../talent/extra.screens'
import { extraScreens as adminExtra } from '../admin/extra.screens'

const BASE_SCREENS: Screen[] = [
  // TMS
  { id: 'dashboard', title: 'Dashboard', area: 'TMS', path: '/dashboard', route: '/dashboard', roles: ['admin'], release: 'R1', nav: true, why: 'Only the Administrator sees the whole pipeline, course fill rates and unpaid invoices.' },
  { id: 'opportunities', title: 'Opportunities', area: 'TMS', path: '/opportunities', route: '/opportunities', roles: ['admin'], release: 'R1', nav: true, why: 'The sales pipeline is internal to the training business, so clients and learners cannot see it.' },
  { id: 'tna', title: 'Training needs analysis', area: 'TMS', path: '/tna', route: '/tna', roles: ['admin'], release: 'R1', nav: true, why: 'Needs analyses hold client-sensitive information, so they are Administrator-only.' },
  { id: 'quotes', title: 'Quotes', area: 'TMS', path: '/quotes', route: '/quotes/*', roles: ['admin', 'client'], release: 'R1', nav: true, why: 'Administrators build quotes; a client contact sees only their own organisation’s quotes (drafts are hidden) and can accept them.' },
  { id: 'courses', title: 'Courses', area: 'TMS', path: '/courses', route: '/courses', roles: ['admin'], release: 'R1', nav: true, why: 'Course and session set-up is managed by the Administrator.' },
  { id: 'session', title: 'Course session', area: 'TMS', path: '/sessions', route: '/sessions/:id?', roles: ['admin', 'instructor'], release: 'R1', why: 'Class lists, attendance and results are for the Administrator and the instructor running the class.' },
  { id: 'my-schedule', title: 'My schedule', area: 'TMS', path: '/my-schedule', route: '/my-schedule', roles: ['instructor'], release: 'R1', nav: true, why: 'Instructors see only the sessions assigned to them.' },
  { id: 'resources', title: 'Resources', area: 'TMS', path: '/resources', route: '/resources', roles: ['admin', 'instructor'], release: 'R1', nav: true, why: 'Instructors and the Administrator share the resource calendar so clashes are caught early.' },
  { id: 'comms', title: 'Communications', area: 'TMS', path: '/communications', route: '/communications', roles: ['admin'], release: 'R1', nav: true, why: 'Message templates and the sent log are managed by the Administrator.' },
  { id: 'invoicing', title: 'Invoicing', area: 'TMS', path: '/invoicing', route: '/invoicing', roles: ['admin', 'finance'], release: 'R1', nav: true, why: 'Money screens are limited to the Administrator and Finance.' },
  { id: 'workbook', title: 'Workbook sync', area: 'TMS', path: '/workbook', route: '/workbook', roles: ['finance', 'admin'], release: 'R1', nav: true, why: 'Finance owns the hand-off of invoices and payments to the accounting system.' },
  { id: 'reports', title: 'Reports', area: 'TMS', path: '/reports', route: '/reports', roles: ['admin', 'finance'], release: 'R1', nav: true, why: 'Revenue and profitability reporting is for Administrator and Finance only.' },
  // B2B portal
  { id: 'client-bookings', title: 'Our bookings', area: 'B2B client portal', path: '/client/bookings', route: '/client/bookings', roles: ['client'], release: 'R1', nav: true, why: 'The client contact sees only their own organisation’s bookings.' },
  { id: 'client-learners', title: 'Our learners', area: 'B2B client portal', path: '/client/learners', route: '/client/learners', roles: ['client'], release: 'R1', nav: true, why: 'The client contact manages only their own staff.', note: 'Client single sign-on (R2) is shown as a note and is not built.' },
  { id: 'client-invoices', title: 'Our invoices', area: 'B2B client portal', path: '/client/invoices', route: '/client/invoices', roles: ['client'], release: 'R1', nav: true, why: 'Clients see their own organisation’s invoices and payment status, never anyone else’s.' },
  // Catalogue & B2C
  { id: 'catalogue', title: 'Public catalogue', area: 'Catalogue and B2C', path: '/catalogue', route: '/catalogue/:courseId?', roles: ALL_ROLES, release: 'R1', nav: true, why: 'The catalogue is public: every persona can browse courses, dates and prices.' },
  { id: 'checkout', title: 'Checkout', area: 'Catalogue and B2C', path: '/checkout', route: '/checkout/:courseId?', roles: ['b2c'], release: 'R1', why: 'Only self-paying B2C learners buy online. Other learners are enrolled by their employer or the Administrator.' },
  { id: 'my-bookings', title: 'My bookings', area: 'Catalogue and B2C', path: '/my-bookings', route: '/my-bookings', roles: ['b2c'], release: 'R1', nav: true, why: 'Bookings and receipts belong to the self-paying learner who made them.' },
  { id: 'academies', title: 'Academies', area: 'Catalogue and B2C', path: '/academies', route: '/academies', roles: ['b2c'], release: 'R2', nav: true, why: 'Cohort bundles are sold to self-paying learners.' },
  { id: 'mentoring', title: 'Mentoring', area: 'Catalogue and B2C', path: '/mentoring', route: '/mentoring', roles: ['b2c'], release: 'R2', nav: true, why: 'Mentoring is a self-paying learner service.' },
  { id: 'certifications', title: 'Certifications', area: 'Catalogue and B2C', path: '/certifications', route: '/certifications', roles: ['b2c'], release: 'R2', nav: true, why: 'Self-paying learners track expiry and renewals of their own certificates.' },
  // LMS
  { id: 'my-learning', title: 'My learning', area: 'LMS', path: '/my-learning', route: '/my-learning', roles: LEARNERS, release: 'R1', nav: true, why: 'Every learner sees only their own assigned and booked courses.' },
  { id: 'player', title: 'Course player', area: 'LMS', path: '/learn', route: '/learn/:enrolId?', roles: LEARNERS, release: 'R1', why: 'Learners open the player for their own enrolments.' },
  { id: 'skills', title: 'Skills profile', area: 'LMS', path: '/skills', route: '/skills', roles: LEARNERS, release: 'R2', nav: true, why: 'A learner’s skills are built from their own completed courses.' },
  { id: 'journeys', title: 'Learning journeys', area: 'LMS', path: '/journeys', route: '/journeys', roles: [...LEARNERS, 'admin'], release: 'R2', nav: true, why: 'Journeys guide learners; the Administrator can see the paths on offer.' },
  { id: 'learning-admin', title: 'Learning admin', area: 'LMS', path: '/learning-admin', route: '/learning-admin', roles: ['admin'], release: 'R1', nav: true, why: 'Assigning courses and deadlines is an Administrator task.' },
  // Talent
  { id: 'talent-settings', title: 'Talent profile settings', area: 'Talent connection', path: '/talent/settings', route: '/talent/settings', roles: ['b2c'], release: 'R3', nav: true, why: 'Only self-paying learners can opt in. Employer-paid learners have no talent profile.' },
  { id: 'talent-search', title: 'Talent search', area: 'Talent connection', path: '/talent/search', route: '/talent/search', roles: ['recruiter'], release: 'R3', nav: true, why: 'Employer-paid enrolments are hidden from recruiters. Only opted-in, self-paid learners appear, anonymised.' },
  { id: 'introductions', title: 'Introduction requests', area: 'Talent connection', path: '/talent/introductions', route: '/talent/introductions', roles: ['b2c', 'recruiter'], release: 'R3', nav: true, why: 'Contact details appear to the recruiter only after the learner approves the introduction.' },
  { id: 'talent-admin', title: 'Talent admin', area: 'Talent connection', path: '/talent/admin', route: '/talent/admin', roles: ['admin'], release: 'R3', nav: true, why: 'The Administrator approves recruiters and audits every recruiter action.' },
  { id: 'roi', title: 'ROI report', area: 'Talent connection', path: '/talent/roi', route: '/talent/roi', roles: ['admin'], release: 'R3', nav: true, why: 'Talent-connection value is reported to the Administrator.' },
  // Admin
  { id: 'orgs', title: 'Organisations and users', area: 'Administration', path: '/admin/organisations', route: '/admin/organisations', roles: ['admin'], release: 'R1', nav: true, why: 'User and organisation management is Administrator-only.' },
  { id: 'access-rules', title: 'Access rules', area: 'Administration', path: '/admin/access', route: '/admin/access', roles: ['admin'], release: 'R1', nav: true, why: 'A read-only view of the access model that drives this demo.' },
  { id: 'demo-map', title: 'Demo map', area: 'Administration', path: '/demo-map', route: '/demo-map', roles: ALL_ROLES, release: 'R1', why: 'Every persona can open the demo map so nothing is hidden from the presenter.' },
]

export const SCREENS: Screen[] = [...BASE_SCREENS, ...tmsExtra, ...schedScreens, ...b2cExtra, ...lmsExtra, ...talentExtra, ...adminExtra]

export const canOpen =(persona: Persona, s: Screen) => persona === 'all' || s.roles.includes(persona as Role)
export const navFor = (persona: Persona) => {
  const eff: Role | 'all' = persona === 'all' ? 'admin' : persona
  return SCREENS.filter(s => s.nav && s.roles.includes(eff as Role))
}
export const screenByPath = (pathname: string) =>
  SCREENS.find(s => pathname === s.path || pathname.startsWith(s.path + '/'))
