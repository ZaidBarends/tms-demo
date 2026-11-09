import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { registerReset } from '../shared/resetRegistry'
import { safeStorage } from '../tms/money/safeStorage'

export interface Hours { open: boolean; start: string; end: string }
export interface Settings {
  profile: { name: string; tradingAs: string; regNo: string; vatNo: string; address: string; email: string; phone: string; website: string }
  banking: { bank: string; accountName: string; accountNo: string; branch: string; accountType: string }
  numbering: { invoicePrefix: string; invoicePad: number; quotePrefix: string; creditPrefix: string; receiptPrefix: string; paymentTermsDays: number }
  notifications: Record<string, boolean>
  hours: Record<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun', Hours>
  closures: string[]
  branding: { primary: string; accent: string; letterhead: string }
}

export const NOTIFICATIONS: { id: string; label: string; hint: string }[] = [
  { id: 'overdue', label: 'Overdue invoice alerts', hint: 'Email Finance when an invoice passes its due date.' },
  { id: 'wbfail', label: 'Workbook sync failures', hint: 'Notify Finance when a record cannot be synced.' },
  { id: 'clash', label: 'Resource clash warnings', hint: 'Warn the Administrator when a venue or trainer is double-booked.' },
  { id: 'lowfill', label: 'Low-fill session warnings', hint: 'Flag sessions under 40% full three weeks out.' },
  { id: 'certexp', label: 'Certificate expiry reminders', hint: 'Remind learners 90 days before a certificate expires.' },
  { id: 'intro', label: 'Talent introduction requests', hint: 'Tell learners when a recruiter asks to be introduced.' },
  { id: 'digest', label: 'Weekly management digest', hint: 'Monday summary of pipeline, fill rates and cash.' },
]

export const seedSettings = (): Settings => ({
  profile: { name: 'Zimele Technologies (Pty) Ltd', tradingAs: 'Zimele Academy', regNo: '2014/218730/07', vatNo: '4410298765', address: 'Building 11, Stanford Office Park, 12 Bauhinia Street, Highveld, Centurion, 0169', email: 'accounts@zimeletechnologies.com', phone: '086 999 0229', website: 'www.zimeletechnologies.com' },
  banking: { bank: 'Cape Commercial Bank', accountName: 'Zimele Technologies (Pty) Ltd', accountNo: '1029384756', branch: '470010', accountType: 'Business current' },
  numbering: { invoicePrefix: 'INV-', invoicePad: 4, quotePrefix: 'Q-2026-', creditPrefix: 'CN-', receiptPrefix: 'RCT-', paymentTermsDays: 30 },
  notifications: { overdue: true, wbfail: true, clash: true, lowfill: true, certexp: true, intro: false, digest: true },
  hours: {
    Mon: { open: true, start: '08:00', end: '17:00' }, Tue: { open: true, start: '08:00', end: '17:00' }, Wed: { open: true, start: '08:00', end: '17:00' },
    Thu: { open: true, start: '08:00', end: '17:00' }, Fri: { open: true, start: '08:00', end: '15:30' }, Sat: { open: false, start: '09:00', end: '13:00' }, Sun: { open: false, start: '09:00', end: '13:00' },
  },
  closures: ['2026-12-16 Day of Reconciliation (observed)', '2026-12-25 Christmas Day', '2026-12-26 Day of Goodwill'],
  branding: { primary: '#597f2d', accent: '#92ca61', letterhead: 'Training that moves careers forward' },
})

interface SettingsState { settings: Settings; save: (s: Settings) => void }
export const useSettings = create<SettingsState>()(
  persist(
    set => ({ settings: seedSettings(), save: settings => set({ settings }) }),
    { name: 'admin-settings-v1', version: 1, storage: safeStorage() },
  ),
)
registerReset(() => useSettings.setState({ settings: seedSettings() }))

export const formatNumber = (prefix: string, pad: number, n: number) => `${prefix}${String(n).padStart(pad, '0')}`
export const isHex = (s: string) => /^#[0-9a-fA-F]{6}$/.test(s)
