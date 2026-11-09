import { useStore } from '../../shared/store'
import { addDays, today } from '../../shared/format'
import type { Data, Opportunity } from '../../shared/types'
import { addOpportunity } from '../ops/mutate'
import { useOps } from '../ops/opsStore'
import type { BookingRequest } from './clientSeed'

/** Turn a client-portal booking or quote request into a lead in the staff Opportunities pipeline. Returns the opportunity id. */
export function createClientLead(a: { orgId: string; courseId: string; people: number; kind: 'booking' | 'quote'; preferredDate?: string; delivery?: string; notes?: string }): string | undefined {
  const d = useStore.getState().data
  const course = d.courses.find(c => c.id === a.courseId)
  const org = d.orgs.find(o => o.id === a.orgId)
  if (!course || !org) return undefined
  const contact = d.contacts.find(c => c.orgId === a.orgId)?.name ?? ''
  const detail = [
    `Requested by ${contact || org.name} through the client portal (${a.kind === 'booking' ? 'booking request' : 'quote request'}).`,
    `${a.people} attendee(s) for ${course.title}.`,
    a.preferredDate ? `Preferred start ${a.preferredDate}${a.delivery ? `, ${a.delivery.toLowerCase()}` : ''}.` : '',
    a.notes ? `Client notes: ${a.notes}` : '',
  ].filter(Boolean).join(' ')
  const id = addOpportunity({
    orgId: a.orgId, title: `${course.title} – ${a.people} people`, value: Math.round(course.price * a.people), stage: 'enquiry',
    contact, notes: detail, expectedClose: a.preferredDate && a.preferredDate > today() ? a.preferredDate : addDays(today(), 14),
  }, 's1', 'Client portal')
  useOps.getState().patchOpp(id, o => ({ ...o, tasks: [...o.tasks, { id: `t-${id}`, text: `Respond to ${org.name}'s ${a.kind} request`, due: addDays(today(), 1), done: false }] }))
  return id
}

export interface RequestView { status: BookingRequest['status']; note: string }

/** The client sees the staff-side stage of their request, so the two sides never disagree. */
export function requestView(r: { status: BookingRequest['status']; oppId?: string }, d: Data): RequestView {
  const o: Opportunity | undefined = r.oppId ? d.opportunities.find(x => x.id === r.oppId) : undefined
  if (!o) return { status: r.status, note: r.status === 'Confirmed' ? 'The training team has confirmed this request.' : 'Received by the training team.' }
  switch (o.stage) {
    case 'enquiry': return { status: 'Requested', note: 'Received by the training team.' }
    case 'needs': return { status: 'Requested', note: 'The training team is scoping your request.' }
    case 'quoted': return { status: 'Requested', note: 'A quote has been prepared for you. See your dashboard.' }
    case 'won': return { status: 'Confirmed', note: 'The training team has confirmed this request.' }
    case 'lost': return { status: 'Requested', note: 'The training team could not take this on as requested and will be in touch.' }
  }
}
