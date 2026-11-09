import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, ToggleButton } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, Stat, Status, EmptyState } from '../shared/ui'
import { FText } from '../shared/fields'
import { clientName, invTotal } from '../shared/calc'
import { addDays, fmtDate, fmtDateTime, fmtShort, money, today } from '../shared/format'
import { GRID, PALETTE } from './money/calc'
import { useMoney } from './money/store'
import { resendAllFailed, resendWb } from './money/actions'
import WbDrawer from './money/WbDrawer'
import './money/money.css'

const MAPPING: [string, string, string, string][] = [
  ['Invoice number', 'DocumentNumber', 'As is', 'Required'],
  ['Organisation id / learner id', 'CustomerCode', 'CUS- prefix + zero padded id', 'Required, must exist in Workbook'],
  ['Client name', 'CustomerName', 'As is', 'Optional'],
  ['Issued date', 'DocumentDate', 'ISO 8601 date', 'Required'],
  ['Due date', 'DueDate', 'ISO 8601 date', 'Required'],
  ['Line description', 'Lines[].Description', 'Trimmed to 120 characters', 'Required'],
  ['Quantity / unit price', 'Lines[].Quantity / UnitPrice', 'Excl. VAT, 2 decimals', 'Required'],
  ['VAT rate (15%)', 'Lines[].VatCode = S', 'Standard rate code', 'Required'],
  ['Credit note amount', 'Adjustments[].Amount', 'Negative value, incl. VAT', 'Optional'],
  ['Payment received', 'Receipts[].Amount / Date', 'Allocated to invoice number', 'Sent after invoice syncs'],
]

export default function Workbook() {
  const d = useStore(s => s.data)
  const attempts = useMoney(s => s.attempts)
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState(params.get('status') ?? '')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [flash, setFlash] = useState('')
  const now = today()
  const all = [...d.invoices].sort((a, b) => b.number.localeCompare(a.number))
  const q2 = all.filter(i => (!status || i.wb === status) && (!q.trim() || `${i.number} ${clientName(d, i)}`.toLowerCase().includes(q.trim().toLowerCase())))
  const count = (s: string) => all.filter(i => i.wb === s).length
  const sum = (s: string) => all.filter(i => i.wb === s).reduce((a, i) => a + invTotal(i), 0)
  const failed = all.filter(i => i.wb === 'Failed')
  const lastOf = (n: string) => attempts.filter(a => a.number === n).map(a => a.at).sort().pop()
  const countOf = (n: string) => attempts.filter(a => a.number === n).length

  const byDay = useMemo(() => Array.from({ length: 7 }, (_, k) => {
    const day = addDays(now, k - 6)
    const rows = attempts.filter(a => a.at.slice(0, 10) === day)
    // nightly batch counts are invented background volume; manual attempts from the store sit on top
    return { day: fmtShort(day), Success: [9, 12, 7, 14, 11, 6, 10][k] + rows.filter(r => r.result === 'Success').length, Failed: [0, 1, 0, 0, 1, 0, 0][k] + rows.filter(r => r.result === 'Failed').length, Queued: [1, 0, 2, 0, 1, 1, 2][k] + rows.filter(r => r.result === 'Queued').length }
  }), [attempts, now])

  const setFilter = (v: string) => { setStatus(v); const p = new URLSearchParams(params); if (v) p.set('status', v); else p.delete('status'); setParams(p, { replace: true }) }

  return (
    <>
      <PageHeader id="workbook" title="Workbook sync" subtitle="Records sent to the accounting system. Nothing really syncs in this demo."
        actions={<Button appearance="primary" disabled={failed.length === 0} onClick={() => { const n = resendAllFailed(); setFlash(`${n.length} failed record(s) resent and synced.`) }}>Resend all failed ({failed.length})</Button>} />
      {failed.length > 0 && <div className="callout" role="alert" style={{ marginBottom: 16, borderLeftColor: '#c50f1f' }}>⚠ {failed.length} record failed to sync. Resend it once the issue is fixed.</div>}
      {flash && <div className="callout" role="status" style={{ marginBottom: 16 }}>{flash}</div>}
      <div className="grid c2">
        <Card title="Daily reconciliation summary">
          <div className="grid c2" style={{ marginBottom: 12 }}>
            <Stat label="Synced" value={count('Synced')} hint={money(sum('Synced'))} />
            <Stat label="Pending" value={count('Pending')} hint={money(sum('Pending'))} />
            <Stat label="Failed" value={count('Failed')} hint={money(sum('Failed'))} />
            <Stat label="Difference to training system" value={money(sum('Pending') + sum('Failed'))} hint={count('Failed') + count('Pending') === 0 ? 'Fully reconciled' : 'Not yet in Workbook'} />
          </div>
        </Card>
        <Card title="Sync results by day (last 7 days, incl. nightly batch)">
          <div style={{ height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="day" fontSize={12} /><YAxis allowDecimals={false} fontSize={12} width={30} />
                <Tooltip /><Legend verticalAlign="top" height={26} />
                <Bar dataKey="Success" stackId="a" fill={PALETTE.green} /><Bar dataKey="Queued" stackId="a" fill={PALETTE.orange} /><Bar dataKey="Failed" stackId="a" fill={PALETTE.red} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card title="Sync queue">
        <div className="mny-filters">
          <FText label="Search" value={q} onChange={setQ} placeholder="Record or client" />
          <div role="group" aria-label="Workbook status filter" className="mny-toggle-row">
            <ToggleButton size="small" checked={!status} onClick={() => setFilter('')}>All ({all.length})</ToggleButton>
            {['Synced', 'Pending', 'Failed'].map(s => <ToggleButton key={s} size="small" checked={status === s} onClick={() => setFilter(status === s ? '' : s)}>{s} ({count(s)})</ToggleButton>)}
          </div>
        </div>
        {q2.length === 0 ? <EmptyState title="No records match" action={<Button onClick={() => { setQ(''); setFilter('') }}>Clear filters</Button>} /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Record</th><th>Client</th><th>Issued</th><th className="num">Amount</th><th>Workbook status</th><th>Attempts</th><th>Last attempt</th><th>Error</th><th /></tr></thead>
            <tbody>{q2.map(i => (
              <tr key={i.number} className="mny-tr" onClick={() => setOpen(i.number)}>
                <td><button className="mny-th" onClick={e => { e.stopPropagation(); setOpen(i.number) }} aria-label={`View payload for ${i.number}`}>{i.number}</button></td>
                <td>{clientName(d, i)}</td><td>{fmtDate(i.issued)}</td><td className="num">{money(invTotal(i))}</td>
                <td><Status s={i.wb} /></td><td>{countOf(i.number)}</td><td className="small">{lastOf(i.number) ? fmtDateTime(lastOf(i.number)!) : '–'}</td><td className="err">{i.wbError}</td>
                <td onClick={e => e.stopPropagation()}>{i.wb === 'Failed' && <Button size="small" appearance="primary" onClick={() => resendWb(i.number)}>Resend {i.number}</Button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <Card title="Field mapping: training system to Workbook">
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Training system field</th><th>Workbook field</th><th>Transform</th><th>Rule</th></tr></thead>
          <tbody>{MAPPING.map(([a, b, c, e]) => <tr key={a}><td>{a}</td><td><code>{b}</code></td><td>{c}</td><td className="muted">{e}</td></tr>)}</tbody>
        </table></div>
      </Card>
      <WbDrawer number={open} onClose={() => setOpen(null)} />
    </>
  )
}
