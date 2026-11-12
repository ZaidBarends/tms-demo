export type Role = 'admin' | 'finance' | 'instructor' | 'internal' | 'client' | 'blearner' | 'b2c' | 'recruiter'
export type Persona = Role | 'all'
export type Release = 'R1' | 'R2' | 'R3'

export interface Org { id: string; name: string; sector: string; staff: number; city: string }
export interface Staff { id: string; name: string; role: 'admin' | 'finance' | 'instructor'; title: string; email: string }
export interface Contact { id: string; name: string; orgId: string; email: string; title: string }
export type LearnerType = 'b2b' | 'internal' | 'b2c'
export interface Learner { id: string; name: string; type: LearnerType; orgId?: string; email: string; phone: string; city: string }
export interface Recruiter { id: string; name: string; company: string; email: string; approved: boolean }

export interface Course {
  id: string; code: string; title: string; category: string; soft: boolean; price: number
  hours: number; status: 'Active' | 'Draft' | 'Retired'; description: string; skills: string[]
}
export interface Session {
  id: string; courseId: string; start: string; venue: string; instructorId: string
  capacity: number; equipment: string[]; status: 'Scheduled' | 'Completed' | 'Cancelled'
  /** Units needed of stock-tracked equipment, e.g. { 'Loan laptops': 12 }. When an item is missing here, one per learner booked is assumed. */
  equipmentQty?: Record<string, number>
}
export type Payer = 'self' | 'employer' | 'internal'
export interface Enrolment {
  id: string; learnerId: string; courseId: string; sessionId?: string; payer: Payer; orgId?: string
  progress: number; status: 'Booked' | 'In progress' | 'Completed'; deadline?: string
  attended?: boolean; result?: number; certificateId?: string; step?: number
}
export interface Certificate { id: string; learnerId: string; courseId: string; issued: string; expires?: string }
export interface Receipt { id: string; learnerId: string; courseId: string; amount: number; date: string; method: 'Card' | 'EFT' | 'SnapScan'; enrolmentId: string
  /** Invoice number the payment was matched to (the payment reference). */
  invoice?: string }

export type Stage = 'enquiry' | 'needs' | 'quoted' | 'won' | 'lost'
export interface Opportunity { id: string; orgId: string; title: string; value: number; stage: Stage; contact: string; notes: string; expectedClose: string }
export interface TnaNeed { need: string; courseId: string; priority: 'High' | 'Medium' | 'Low' }
export interface Tna { id: string; orgId: string; date: string; needs: TnaNeed[] }

export interface QuoteLine { courseId: string; qty: number; unit: number }
export interface Quote {
  id: string; number: string; orgId: string; lines: QuoteLine[]; discountPct: number; venue: string
  instructorId: string; status: 'Draft' | 'Sent' | 'Accepted' | 'Expired'; issued: string; validUntil: string
}
export interface Invoice {
  number: string; orgId?: string; learnerId?: string; description: string; amount: number
  status: 'Paid' | 'Sent' | 'Overdue'; issued: string; due: string; paidOn?: string
  wb: 'Synced' | 'Pending' | 'Failed'; wbError?: string; creditNote?: number
}

export interface TalentProfile { learnerId: string; optedIn: boolean; summary: string; code: string; region: string }
export interface IntroRequest { id: string; recruiterId: string; learnerId: string; status: 'Pending' | 'Approved' | 'Declined'; message: string; created: string; placed?: boolean }
export interface AuditEntry { id: string; at: string; actor: string; action: 'View' | 'Request' | 'Approve' | 'Decline' | 'Opt-in' | 'Opt-out'; target: string; detail: string }

export interface Template { id: string; name: string; subject: string; body: string }
export interface SentMessage { id: string; at: string; templateId: string; to: string; subject: string }
export interface Mentor { id: string; name: string; focus: string; bio: string }
export interface MentorSession { id: string; learnerId: string; mentorId: string; date: string; status: 'Requested' | 'Completed'; notes: string }
export interface Academy { id: string; title: string; start: string; courseIds: string[]; blurb: string; interested: string[] }
export interface Journey { id: string; goal: string; courseIds: string[] }
export interface Activity { id: string; at: string; text: string }

export interface Data {
  orgs: Org[]; staff: Staff[]; contacts: Contact[]; learners: Learner[]; recruiters: Recruiter[]
  courses: Course[]; sessions: Session[]; enrolments: Enrolment[]; certificates: Certificate[]; receipts: Receipt[]
  opportunities: Opportunity[]; tnas: Tna[]; quotes: Quote[]; invoices: Invoice[]
  talent: TalentProfile[]; intros: IntroRequest[]; audit: AuditEntry[]
  templates: Template[]; sent: SentMessage[]; mentors: Mentor[]; mentorSessions: MentorSession[]
  academies: Academy[]; journeys: Journey[]; activity: Activity[]
}
