import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerReset } from '../../shared/resetRegistry'
import { buildSeed } from '../../shared/seed'
import { addDays, today } from '../../shared/format'
import { safeStorage } from './safeStorage'

export interface MoneyEvent { id: string; invoice: string; at: string; kind: 'reminder' | 'credit' | 'payment' | 'note'; text: string }
export interface WbAttempt { id: string; number: string; kind: 'Invoice' | 'Payment'; at: string; result: 'Success' | 'Failed' | 'Queued'; message: string }
export interface CreditNote { id: string; invoice: string; amount: number; reason: string; note: string; at: string }
export interface SavedView { id: string; name: string; tab: string; preset: string; org: string; cat: string; instructor: string; venue: string; compare: boolean; created: string }
export interface Campaign {
  id: string; name: string; templateId: string; subject: string; body: string; audience: string; recipients: number
  status: 'Sent' | 'Scheduled'; at: string; sent: number; opened: number; clicked: number; bounced: number
}
export interface CustomTemplate { id: string; name: string; subject: string; body: string }
/** Who can notify the platform of a payment. Bank transfers are matched from the bank record in Workbook. */
export type Processor = 'PayGate' | 'SnapScan' | 'Bank transfer'
export type PaymentResult = 'Matched' | 'Part payment' | 'Overpaid' | 'Duplicate' | 'Unmatched' | 'Rejected'
/** One payment notification. `invoice` is the reference the payer used: the invoice number. */
export interface PaymentRecord {
  id: string; invoice: string; processor: Processor; txId: string; amount: number; at: string
  status: PaymentResult; payer: string; note?: string
  /** Set when Finance has looked at a rejected, duplicate or overpaid payment and cleared it from the alerts. */
  dismissed?: boolean
}

interface MoneyState {
  events: MoneyEvent[]; attempts: WbAttempt[]; credits: CreditNote[]; views: SavedView[]; campaigns: Campaign[]; customTemplates: CustomTemplate[]; payments: PaymentRecord[]
  addPayment: (p: Omit<PaymentRecord, 'id'>) => PaymentRecord
  updatePayment: (id: string, patch: Partial<PaymentRecord>) => void
  addEvent: (e: Omit<MoneyEvent, 'id' | 'at'> & { at?: string }) => void
  addAttempt: (a: Omit<WbAttempt, 'id' | 'at'> & { at?: string }) => void
  addCredit: (c: Omit<CreditNote, 'id' | 'at'>) => string
  saveView: (v: Omit<SavedView, 'id' | 'created'>) => void
  deleteView: (id: string) => void
  upsertCampaign: (c: Campaign) => void
  removeCampaign: (id: string) => void
  saveCustomTemplate: (t: CustomTemplate) => void
  deleteCustomTemplate: (id: string) => void
}

const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
const at = (day: string, hm = '09:00') => `${day}T${hm}:00`

export function seedMoney() {
  const d = buildSeed(); const now = today()
  const events: MoneyEvent[] = []
  const attempts: WbAttempt[] = []
  d.invoices.forEach(i => {
    events.push({ id: `ev-${i.number}-s`, invoice: i.number, at: at(i.issued, '09:15'), kind: 'note', text: 'Invoice emailed to client contact' })
    if (i.wb === 'Failed') {
      ;[0, 1, 2].forEach(n => attempts.push({ id: `wa-${i.number}-${n}`, number: i.number, kind: 'Invoice', at: at(addDays(i.issued, n), n === 0 ? '09:20' : '02:00'), result: 'Failed', message: i.wbError ?? 'Rejected by Workbook' }))
    } else attempts.push({ id: `wa-${i.number}`, number: i.number, kind: 'Invoice', at: at(i.issued, '09:20'), result: i.wb === 'Synced' ? 'Success' : 'Queued', message: i.wb === 'Synced' ? 'Document accepted (201)' : 'Waiting for the next sync window' })
    if (i.status === 'Paid' && i.paidOn) attempts.push({ id: `wp-${i.number}`, number: i.number, kind: 'Payment', at: at(i.paidOn > now ? now : i.paidOn, '07:05'), result: i.wb === 'Pending' ? 'Queued' : 'Success', message: i.wb === 'Pending' ? 'Waiting for invoice to sync first' : 'Receipt allocated in Workbook' })
  })
  const rem = (n: string, off: number) => events.push({ id: `ev-${n}-r${off}`, invoice: n, at: at(addDays(d.invoices.find(i => i.number === n)!.due, off), '10:00'), kind: 'reminder', text: `Payment reminder ${off > 8 ? 2 : 1} sent to client` })
  rem('INV-0036', 3); rem('INV-0036', 11); rem('INV-0041', 4); rem('INV-0042', 2)
  const credits: CreditNote[] = [
    { id: 'CN-0001', invoice: 'INV-0034', amount: 3500, reason: 'Learner no-shows', note: 'Two learners did not attend; credited per terms.', at: at(addDays(now, -40)) },
    { id: 'CN-0002', invoice: 'INV-0038', amount: 2400, reason: 'Pricing error', note: 'One seat billed at the wrong rate.', at: at(addDays(now, -9)) },
  ]
  credits.forEach(c => events.push({ id: `ev-${c.id}`, invoice: c.invoice, at: c.at, kind: 'credit', text: `Credit note ${c.id} issued for R${c.amount.toLocaleString('en-US')} (${c.reason})` }))
  const views: SavedView[] = [
    { id: 'sv1', name: 'Quarterly revenue, all clients', tab: 'revenue', preset: '90', org: '', cat: '', instructor: '', venue: '', compare: true, created: addDays(now, -20) },
    { id: 'sv2', name: 'Health & Safety margins', tab: 'profit', preset: '365', org: '', cat: 'Health & Safety', instructor: '', venue: '', compare: false, created: addDays(now, -6) },
  ]
  const camp = (n: number, name: string, tid: string, subject: string, audience: string, rec: number, ago: number, op: number, cl: number): Campaign => ({
    id: `cm${n}`, name, templateId: tid, subject, body: '', audience, recipients: rec, status: 'Sent', at: at(addDays(now, -ago), '08:30'),
    sent: rec, opened: Math.round(rec * op), clicked: Math.round(rec * cl), bounced: Math.max(0, Math.round(rec * 0.02)),
  })
  const campaigns: Campaign[] = [
    camp(1, 'Safety refresher reminder', 'm2', 'Reminder: your course starts soon', 'Cape Freight learners', 11, 21, 0.82, 0.41),
    camp(2, 'Welcome to the new term', 'm1', 'Your booking is confirmed', 'All learners in Cybersecurity Awareness', 9, 14, 0.71, 0.33),
    camp(3, 'Joining instructions: leadership cohort', 'm3', 'Joining instructions for your course', 'Swift Route Logistics learners', 6, 8, 0.89, 0.56),
    camp(4, 'Payment reminders: overdue accounts', 'pay', 'Payment reminder', 'Clients with overdue invoices', 4, 4, 0.75, 0.5),
    { id: 'cm5', name: 'Month-end course reminder', templateId: 'm2', subject: 'Reminder: your course starts soon', body: '', audience: 'All learners in Leadership Foundations', recipients: 12, status: 'Scheduled', at: at(addDays(now, 3), '08:00'), sent: 0, opened: 0, clicked: 0, bounced: 0 },
  ]
  const customTemplates: CustomTemplate[] = [
    { id: 'pay', name: 'Payment reminder', subject: 'Payment reminder: invoice {{invoice}}', body: 'Hi {{name}},\n\nOur records show invoice {{invoice}} for {{amount}} was due on {{date}} and is still open. Please arrange payment or reply if you have already paid.\n\nKind regards,\nFinance team' },
  ]
  // Payments already received, as the processors or the bank reported them (the invoice number was the reference).
  const payments: PaymentRecord[] = d.invoices.filter(i => i.status === 'Paid' && i.paidOn).map(i => ({
    id: `pay-${i.number}`, invoice: i.number, processor: (i.orgId ? 'Bank transfer' : 'PayGate') as Processor, txId: `SEED-${i.number.replace(/\D/g, '')}`,
    amount: Math.round(((i.amount * 1.15) - (i.creditNote ?? 0)) * 100) / 100, at: at(i.paidOn! > now ? now : i.paidOn!, '14:00'), status: 'Matched' as PaymentResult, payer: i.orgId ? (d.orgs.find(o => o.id === i.orgId)?.name ?? '') : (d.learners.find(l => l.id === i.learnerId)?.name ?? ''),
  }))
  // One payment whose reference matches no invoice, so the unmatched queue has something to show.
  payments.push({ id: 'pay-unmatched-1', invoice: 'INV-0099', processor: 'SnapScan', txId: 'SS-48213', amount: 1150, at: at(addDays(now, -1), '10:12'), status: 'Unmatched', payer: 'Unknown', note: 'Reference INV-0099 is not an invoice number' })
  return { events, attempts, credits, views, campaigns, customTemplates, payments }
}

export const useMoney = create<MoneyState>()(
  persist(
    (set, get) => ({
      ...seedMoney(),
      addPayment: p => { const rec = { ...p, id: uid('pay') }; set(s => ({ payments: [rec, ...s.payments] })); return rec },
      updatePayment: (id, patch) => set(s => ({ payments: s.payments.map(p => (p.id === id ? { ...p, ...patch } : p)) })),
      addEvent: e => set(s => ({ events: [...s.events, { ...e, id: uid('ev'), at: e.at ?? new Date().toISOString() }] })),
      addAttempt: a => set(s => ({ attempts: [...s.attempts, { ...a, id: uid('wa'), at: a.at ?? new Date().toISOString() }] })),
      addCredit: c => {
        const id = `CN-${String(get().credits.length + 1).padStart(4, '0')}`
        set(s => ({ credits: [...s.credits, { ...c, id, at: new Date().toISOString() }] }))
        return id
      },
      saveView: v => set(s => ({ views: [...s.views, { ...v, id: uid('sv'), created: today() }] })),
      deleteView: id => set(s => ({ views: s.views.filter(v => v.id !== id) })),
      upsertCampaign: c => set(s => ({ campaigns: s.campaigns.some(x => x.id === c.id) ? s.campaigns.map(x => (x.id === c.id ? c : x)) : [c, ...s.campaigns] })),
      removeCampaign: id => set(s => ({ campaigns: s.campaigns.filter(c => c.id !== id) })),
      saveCustomTemplate: t => set(s => ({ customTemplates: s.customTemplates.some(x => x.id === t.id) ? s.customTemplates.map(x => (x.id === t.id ? t : x)) : [...s.customTemplates, t] })),
      deleteCustomTemplate: id => set(s => ({ customTemplates: s.customTemplates.filter(t => t.id !== id) })),
    }),
    { name: 'tms-money-v1', version: 1, storage: safeStorage() },
  ),
)
registerReset(() => useMoney.setState(seedMoney()))
