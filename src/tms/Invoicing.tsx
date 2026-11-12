import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Button, ToggleButton } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, Status, EmptyState } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { clientName, inclVat, invTotal } from '../shared/calc'
import { fmtDate, money, today } from '../shared/format'
import { balanceOf, bucketOf, daysPastDue, toCsv } from './money/calc'
import { downloadCsv, markPaid, sendReminder } from './money/actions'
import { useMoney } from './money/store'
import { Kpi } from './money/ui'
import InvoiceDrawer from './money/InvoiceDrawer'
import PaymentsCard from './money/PaymentsCard'
import InvoiceDoc from './money/InvoiceDoc'
import type { Invoice } from '../shared/types'

type SortKey = 'number' | 'client' | 'issued' | 'due' | 'total' | 'balance' | 'aged' | 'status'
const STATUSES = ['Paid', 'Sent', 'Overdue']

export default function Invoicing() {
  const d = useStore(s => s.data)
  const credits = useMoney(s => s.credits)
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? '')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [org, setOrg] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'number', dir: -1 })
  const [sel, setSel] = useState<string[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [doc, setDoc] = useState<string | null>(null)
  const [flash, setFlash] = useState('')
  const now = today()
  const focusPayments = params.get('focus') === 'payments'
  useEffect(() => {
    if (!focusPayments) return
    const t = setTimeout(() => document.getElementById('payments-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
    return () => clearTimeout(t)
  }, [focusPayments])

  const val = (i: Invoice, k: SortKey): string | number => {
    switch (k) {
      case 'number': return i.number
      case 'client': return clientName(d, i)
      case 'issued': return i.issued
      case 'due': return i.due
      case 'total': return invTotal(i)
      case 'balance': return balanceOf(i)
      case 'aged': return daysPastDue(i, now)
      default: return i.status
    }
  }
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return d.invoices
      .filter(i => (!status || i.status === status) && (!org || i.orgId === org || (org === 'b2c' && !i.orgId))
        && (!needle || `${i.number} ${clientName(d, i)} ${i.description}`.toLowerCase().includes(needle)))
      .sort((a, b) => { const x = val(a, sort.key), y = val(b, sort.key); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * sort.dir })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, status, q, org, sort])

  const selected = list.filter(i => sel.includes(i.number))
  const allOn = list.length > 0 && list.every(i => sel.includes(i.number))
  const toggle = (n: string) => setSel(s => (s.includes(n) ? s.filter(x => x !== n) : [...s, n]))
  const th = (key: SortKey, label: string, cls?: string) => (
    <th className={cls} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="mny-th" onClick={() => setSort(s => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : 1 }))}>{label}{sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}</button>
    </th>
  )
  const setFilter = (v: string) => { setStatus(v); const p = new URLSearchParams(params); if (v) p.set('status', v); else p.delete('status'); setParams(p, { replace: true }) }

  const exportCsv = () => {
    const rows = (selected.length ? selected : list)
    downloadCsv(`invoices-${now}.csv`, toCsv([
      ['Invoice', 'Client', 'Description', 'Issued', 'Due', 'Status', 'Subtotal ex VAT', 'Credit note', 'Total incl VAT', 'Balance', 'Days past due', 'Ageing bucket', 'Workbook'],
      ...rows.map(i => [i.number, clientName(d, i), i.description, i.issued, i.due, i.status, i.amount, i.creditNote ?? 0, invTotal(i).toFixed(2), balanceOf(i).toFixed(2), daysPastDue(i, now), i.status === 'Paid' ? 'Settled' : bucketOf(i, now), i.wb]),
    ]))
    setFlash(`Exported ${rows.length} invoice${rows.length === 1 ? '' : 's'} to CSV.`)
  }

  const paid = d.invoices.filter(i => i.status === 'Paid')
  const unpaidAll = d.invoices.filter(i => i.status !== 'Paid')
  const totals = { total: list.reduce((a, i) => a + invTotal(i), 0), balance: list.reduce((a, i) => a + balanceOf(i), 0), credit: list.reduce((a, i) => a + (i.creditNote ?? 0), 0) }

  return (
    <>
      <PageHeader id="invoicing" title="Invoicing" subtitle="Invoices, credit notes and payments received through PayGate, SnapScan and the bank" actions={<Button onClick={exportCsv}>Export CSV</Button>} />
      <div className="grid c4" style={{ marginBottom: 20 }}>
        <Kpi label="Invoiced (incl. VAT)" value={money(d.invoices.reduce((a, i) => a + inclVat(i.amount), 0))} hint={`${d.invoices.length} invoices`} />
        <Kpi label="Payments received" value={money(paid.reduce((a, i) => a + invTotal(i), 0))} hint={`${paid.length} invoices paid`} />
        <Kpi label="Outstanding" value={money(unpaidAll.reduce((a, i) => a + invTotal(i), 0))} hint={`${unpaidAll.length} open, ${unpaidAll.filter(i => i.status === 'Overdue').length} overdue`} />
        <Kpi label="Credit notes" value={money(credits.reduce((a, c) => a + c.amount, 0))} hint={`${credits.length} issued`} />
      </div>
      <Card title="Invoices">
        <div className="mny-filters">
          <FText label="Search" value={q} onChange={setQ} placeholder="Invoice, client or description" />
          <FSelect label="Client" value={org} onChange={setOrg} placeholder="All clients" options={[...d.orgs.map(o => ({ value: o.id, label: o.name })), { value: 'b2c', label: 'Self-paying learners' }]} />
          <div role="group" aria-label="Status filter" className="mny-toggle-row">
            <ToggleButton size="small" checked={!status} onClick={() => setFilter('')}>All</ToggleButton>
            {STATUSES.map(s => <ToggleButton key={s} size="small" checked={status === s} onClick={() => setFilter(status === s ? '' : s)}>{s}</ToggleButton>)}
          </div>
        </div>
        {flash && <div className="callout" role="status" style={{ marginBottom: 12 }}>{flash}</div>}
        {selected.length > 0 && (
          <div className="mny-bulk" role="region" aria-label="Bulk actions">
            <b>{selected.length} selected</b>
            <Button size="small" appearance="primary" onClick={() => { markPaid(selected.map(i => i.number)); setFlash(`${selected.length} invoice(s) processed as paid.`); setSel([]) }}>Mark paid</Button>
            <Button size="small" onClick={() => { const n = selected.filter(i => i.status !== 'Paid'); n.forEach(sendReminder); setFlash(`${n.length} reminder(s) sent.`); setSel([]) }}>Send reminders</Button>
            <Button size="small" onClick={exportCsv}>Export selected CSV</Button>
            <Button size="small" appearance="subtle" onClick={() => setSel([])}>Clear</Button>
          </div>
        )}
        {list.length === 0 ? <EmptyState title="No invoices match" text="Clear a filter or search to see more." action={<Button onClick={() => { setQ(''); setOrg(''); setFilter('') }}>Clear filters</Button>} /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr>
              <th><input type="checkbox" aria-label="Select all invoices" checked={allOn} onChange={() => setSel(allOn ? [] : list.map(i => i.number))} /></th>
              {th('number', 'Invoice')}{th('client', 'Client')}<th>Description</th>{th('issued', 'Issued')}{th('due', 'Due')}{th('total', 'Total', 'num')}{th('balance', 'Balance', 'num')}{th('aged', 'Aged balance')}{th('status', 'Status')}
            </tr></thead>
            <tbody>{list.map(i => {
              const late = daysPastDue(i, now)
              return (
                <tr key={i.number} className="mny-tr" onClick={() => setOpen(i.number)}>
                  <td onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${i.number}`} checked={sel.includes(i.number)} onChange={() => toggle(i.number)} /></td>
                  <td><button className="mny-th" onClick={e => { e.stopPropagation(); setOpen(i.number) }} aria-label={`Open ${i.number}`}>{i.number}</button></td>
                  <td>{clientName(d, i)}</td><td>{i.description}{i.creditNote ? <span className="mny-pill" style={{ marginLeft: 6 }}>credit −{money(i.creditNote)}</span> : null}</td>
                  <td>{fmtDate(i.issued)}</td><td>{fmtDate(i.due)}</td>
                  <td className="num">{money(invTotal(i))}</td><td className="num">{money(balanceOf(i))}</td>
                  <td>{i.status === 'Paid' ? <span className="muted">Settled</span> : <span className={`mny-pill ${late > 30 ? 'bad' : late > 0 ? 'warn' : ''}`}>{late > 0 ? `${bucketOf(i, now)} days` : 'Current'}</span>}</td>
                  <td><Status s={i.status} /></td>
                </tr>
              )
            })}</tbody>
            <tfoot><tr className="mny-tfoot">
              <td /><td colSpan={5}>{list.length} invoice{list.length === 1 ? '' : 's'}{selected.length ? `, ${selected.length} selected` : ''}</td>
              <td className="num">{money(totals.total)}</td><td className="num">{money(totals.balance)}</td><td colSpan={2} className="muted small">Credits {money(totals.credit)}</td>
            </tr></tfoot>
          </table></div>
        )}
      </Card>
      <PaymentsCard onOpenInvoice={setOpen} highlight={focusPayments} />
      <div className="grid c2">
        <Card title="Credit notes">
          {credits.length === 0 ? <EmptyState title="No credit notes yet" text="Open an invoice and choose Issue credit note." /> : (
            <table className="tbl"><thead><tr><th>Credit note</th><th>Invoice</th><th>Reason</th><th>Date</th><th className="num">Amount</th></tr></thead><tbody>
              {[...credits].reverse().map(c => <tr key={c.id}><td>{c.id}</td><td><button className="mny-th" onClick={() => setOpen(c.invoice)}>{c.invoice}</button></td><td>{c.reason}</td><td>{fmtDate(c.at)}</td><td className="num">−{money(c.amount)}</td></tr>)}
            </tbody></table>
          )}
        </Card>
        <Card title="Payments received">
          {paid.length === 0 ? <EmptyState title="No payments yet" /> : (
            <table className="tbl"><thead><tr><th>Invoice</th><th>Client</th><th>Paid on</th><th className="num">Amount</th></tr></thead><tbody>
              {[...paid].sort((a, b) => (b.paidOn ?? '').localeCompare(a.paidOn ?? '')).map(i => <tr key={i.number}><td>{i.number}</td><td>{clientName(d, i)}</td><td>{fmtDate(i.paidOn)}</td><td className="num">{money(invTotal(i))}</td></tr>)}
            </tbody></table>
          )}
        </Card>
      </div>
      <InvoiceDrawer number={open} onClose={() => setOpen(null)} onDocument={n => setDoc(n)} />
      <InvoiceDoc number={doc} onClose={() => setDoc(null)} />
    </>
  )
}
