import { useStore } from '../../shared/store'
import type { Data, Invoice } from '../../shared/types'
import { clientName, invTotal } from '../../shared/calc'
import { fmtDate, money, today } from '../../shared/format'
import { useMoney } from './store'
import { daysPastDue } from './calc'

export function recipientFor(d: Data, i: Invoice) {
  if (i.orgId) { const c = d.contacts.find(x => x.orgId === i.orgId); return { name: c?.name ?? clientName(d, i), email: c?.email ?? 'accounts@client.example' } }
  const l = d.learners.find(x => x.id === i.learnerId)
  return { name: l?.name ?? 'Customer', email: l?.email ?? 'customer@mail.example' }
}

export function reminderMessage(d: Data, i: Invoice) {
  const r = recipientFor(d, i)
  const late = daysPastDue(i, today())
  const subject = `Payment reminder: invoice ${i.number}`
  const body = `Hi ${r.name.split(' ')[0]},\n\nOur records show invoice ${i.number} (${i.description}) for ${money(invTotal(i))} was due on ${fmtDate(i.due)}${late > 0 ? ` and is ${late} days past due` : ''}.\n\nPlease arrange payment using the banking details on the invoice, quoting ${i.number} as the reference. If you have already paid, thank you, and please send us the proof of payment.\n\nKind regards,\nFinance team`
  return { to: r.email, subject, body }
}

export function sendReminder(i: Invoice) {
  const st = useStore.getState()
  const m = reminderMessage(st.data, i)
  st.sendEmail('pay', m.to, m.subject)
  st.log(`Payment reminder for ${i.number} sent to ${clientName(st.data, i)}`)
  useMoney.getState().addEvent({ invoice: i.number, kind: 'reminder', text: `Payment reminder sent to ${m.to}` })
  return m
}

export function markPaid(numbers: string[]) {
  const st = useStore.getState()
  numbers.forEach(n => {
    const i = st.data.invoices.find(x => x.number === n)
    if (!i || i.status === 'Paid') return
    useStore.getState().setInvoiceStatus(n, 'Paid')
    useMoney.getState().addEvent({ invoice: n, kind: 'payment', text: `Payment of ${money(invTotal(i))} recorded` })
    useMoney.getState().addAttempt({ number: n, kind: 'Payment', result: 'Queued', message: 'Payment queued for the next Workbook sync' })
  })
  if (numbers.length) useStore.getState().log(`${numbers.length} invoice${numbers.length > 1 ? 's' : ''} marked paid (${numbers.slice(0, 3).join(', ')}${numbers.length > 3 ? '…' : ''})`)
}

export function applyCreditNote(number: string, amount: number, reason: string, note: string) {
  const id = useMoney.getState().addCredit({ invoice: number, amount, reason, note })
  useStore.setState(s => {
    const data = structuredClone(s.data)
    const i = data.invoices.find(x => x.number === number)
    if (i) { i.creditNote = Math.round(((i.creditNote ?? 0) + amount) * 100) / 100; if (i.wb === 'Synced') i.wb = 'Pending' }
    data.activity.unshift({ id: `ac${Date.now().toString(36)}`, at: new Date().toISOString(), text: `Credit note ${id} for ${money(amount)} issued against ${number} (${reason})` })
    return { data }
  })
  useMoney.getState().addEvent({ invoice: number, kind: 'credit', text: `Credit note ${id} issued for ${money(amount)} (${reason})` })
  return id
}

export function resendWb(number: string) {
  useStore.getState().resendWb(number)
  useMoney.getState().addAttempt({ number, kind: 'Invoice', result: 'Success', message: 'Resent manually. Document accepted (201)' })
}
export function resendAllFailed() {
  const failed = useStore.getState().data.invoices.filter(i => i.wb === 'Failed').map(i => i.number)
  failed.forEach(resendWb)
  return failed
}

export function downloadCsv(filename: string, text: string) {
  try {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch { /* download not available */ }
}
