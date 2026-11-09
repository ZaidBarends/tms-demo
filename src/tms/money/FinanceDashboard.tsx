import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, CartesianGrid, Cell, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart } from 'recharts'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { PageHeader, Card, EmailPreview, EmptyState, Status } from '../../shared/ui'
import { clientName, invTotal } from '../../shared/calc'
import { addDays, fmtDate, fmtShort, money, today } from '../../shared/format'
import { PALETTE, GRID, ageing, balanceOf, buildLedger, debtors, daysPastDue, deltaPct, dso, fakeSeries, monthlySeries, receivablesAt } from './calc'
import { Kpi } from './ui'
import { useMoney } from './store'
import { resendAllFailed, sendReminder } from './actions'

const BUCKET_COLOR = [PALETTE.green, PALETTE.sky, PALETTE.orange, PALETTE.red]

export default function FinanceDashboard() {
  const d = useStore(s => s.data)
  const events = useMoney(s => s.events)
  const [msg, setMsg] = useState<{ to: string; subject: string; body: string } | null>(null)
  const now = today()
  const ledger = useMemo(() => buildLedger(d, now), [d, now])
  const series = useMemo(() => monthlySeries(ledger, now, 12).map(m => ({ ...m, gap: Math.round(m.invoiced - m.collected) })), [ledger, now])
  const age = ageing(d.invoices, now).map((a, i) => ({ ...a, name: a.bucket === 'Current' ? 'Current' : `${a.bucket} days`, fill: BUCKET_COLOR[i] }))
  const recv = d.invoices.filter(i => i.status !== 'Paid').reduce((a, i) => a + balanceOf(i), 0)
  const inv90 = ledger.filter(r => r.date > addDays(now, -90)).reduce((a, r) => a + r.incl, 0)
  const days = dso(recv, inv90, 90)
  const col30 = ledger.filter(r => r.paidOn && r.paidOn > addDays(now, -30)).reduce((a, r) => a + r.paid, 0)
  const colPrev = ledger.filter(r => r.paidOn && r.paidOn > addDays(now, -60) && r.paidOn <= addDays(now, -30)).reduce((a, r) => a + r.paid, 0)
  const overdue = d.invoices.filter(i => i.status !== 'Paid' && daysPastDue(i, now) > 0).sort((a, b) => daysPastDue(b, now) - daysPastDue(a, now))
  const overdueAmt = overdue.reduce((a, i) => a + balanceOf(i), 0)
  const recvPrev = receivablesAt(ledger, addDays(now, -30))
  const paid = d.invoices.filter(i => i.status === 'Paid').sort((a, b) => (b.paidOn ?? '').localeCompare(a.paidOn ?? ''))
  const wb = (s: string) => d.invoices.filter(i => i.wb === s).length
  const lastReminder = (n: string) => events.filter(e => e.invoice === n && e.kind === 'reminder').map(e => e.at.slice(0, 10)).sort().pop()
  const top = debtors(d, now).slice(0, 5)
  const dsoS = fakeSeries(days, 5)

  return (
    <>
      <PageHeader id="finance-dashboard" title="Finance dashboard" subtitle="Cash position, receivables ageing and collections" />
      <div className="grid c4" style={{ marginBottom: 20 }}>
        <Kpi label="Cash collected, 30 days" value={money(col30)} delta={deltaPct(col30, colPrev)} spark={series.slice(-6).map(s => s.collected)} color={PALETTE.green} hint="vs previous 30 days" />
        <Kpi label="Receivables" value={money(recv)} delta={deltaPct(recv, recvPrev)} goodWhenUp={false} spark={fakeSeries(recv, 2)} color={PALETTE.orange} hint="vs 30 days ago" />
        <Kpi label="DSO" value={`${days} days`} delta={deltaPct(dsoS[5], dsoS[4])} goodWhenUp={false} spark={dsoS} color={PALETTE.purple} hint="Days sales outstanding, 90 day basis" />
        <Kpi label="Overdue" value={money(overdueAmt)} spark={fakeSeries(overdueAmt, 8)} color={PALETTE.red} hint={`${overdue.length} invoices past due`} />
      </div>
      <div className="grid c2">
        <Card title="Cash collected vs invoiced (incl. VAT)">
          <div style={{ height: 290 }}>
            <ResponsiveContainer>
              <ComposedChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} width={52} tickFormatter={v => `R${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => money(Math.round(v))} /><Legend verticalAlign="top" height={28} />
                <Bar dataKey="invoiced" name="Invoiced" fill={PALETTE.blue} radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill={PALETTE.green} radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="gap" name="Collection gap" stroke={PALETTE.orange} strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Receivables ageing">
          <div style={{ height: 230 }}>
            <ResponsiveContainer>
              <BarChart data={age}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} width={52} tickFormatter={v => `R${Math.round(v / 1000)}k`} />
                <Tooltip formatter={(v: number) => money(Math.round(v))} />
                <Bar dataKey="amount" name="Balance" radius={[6, 6, 0, 0]}>{age.map((a, i) => <Cell key={a.bucket} fill={BUCKET_COLOR[i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="row small muted" style={{ marginTop: 6 }}>{age.map(a => <span key={a.bucket}>{a.name}: {a.count} invoice{a.count === 1 ? '' : 's'}</span>)}</div>
        </Card>
        <Card title="Collections worklist" actions={<Link to="/invoicing?status=Overdue">All overdue</Link>}>
          {overdue.length === 0 ? <EmptyState title="Nothing to chase" text="Every invoice is current or paid." /> : (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Invoice</th><th>Client</th><th className="num">Balance</th><th>Past due</th><th>Last reminder</th><th /></tr></thead>
              <tbody>{overdue.map(i => {
                const lr = lastReminder(i.number)
                return (
                  <tr key={i.number}>
                    <td>{i.number}</td><td>{clientName(d, i)}</td><td className="num">{money(balanceOf(i))}</td>
                    <td><span className={`mny-pill ${daysPastDue(i, now) > 30 ? 'bad' : 'warn'}`}>{daysPastDue(i, now)} days</span></td>
                    <td>{lr ? fmtShort(lr) : <span className="muted">None</span>}</td>
                    <td><Button size="small" appearance="primary" onClick={() => setMsg(sendReminder(i))} aria-label={`Send reminder for ${i.number}`}>Send reminder</Button></td>
                  </tr>
                )
              })}</tbody>
            </table></div>
          )}
        </Card>
        <Card title="Top debtors">
          {top.length === 0 ? <EmptyState title="No receivables" /> : (
            <table className="tbl"><thead><tr><th>Client</th><th className="num">Balance</th><th className="num">Overdue</th><th className="num">Oldest</th></tr></thead><tbody>
              {top.map(t => <tr key={t.name}><td>{t.name}<div className="muted small">{t.count} open invoice{t.count === 1 ? '' : 's'}</div></td><td className="num">{money(t.balance)}</td><td className="num">{t.overdue ? <span className="err">{money(t.overdue)}</span> : '–'}</td><td className="num">{t.oldest ? `${t.oldest} d` : '–'}</td></tr>)}
            </tbody></table>
          )}
        </Card>
        <Card title="Workbook sync health" actions={<Link to="/workbook">Open Workbook sync</Link>}>
          <div className="row" style={{ marginBottom: 10 }}>
            <Status s="Synced" /> <b>{wb('Synced')}</b> <Status s="Pending" /> <b>{wb('Pending')}</b> <Status s="Failed" /> <b>{wb('Failed')}</b>
          </div>
          <div className="mny-bar" aria-label="Share of records synced"><div style={{ width: `${Math.round((wb('Synced') / Math.max(1, d.invoices.length)) * 100)}%`, background: PALETTE.green }} /></div>
          <p className="muted small">{Math.round((wb('Synced') / Math.max(1, d.invoices.length)) * 100)}% of records are in Workbook.</p>
          {d.invoices.filter(i => i.wb === 'Failed').map(i => <div key={i.number} className="callout" style={{ marginBottom: 8, borderLeftColor: PALETTE.red }}><b>{i.number}</b>: {i.wbError}</div>)}
          {wb('Failed') > 0 && <Button onClick={() => resendAllFailed()}>Resend all failed</Button>}
          {wb('Failed') === 0 && <span className="muted">No failed records.</span>}
        </Card>
        <Card title="Payments received" actions={<Link to="/invoicing?status=Paid">All paid</Link>}>
          {paid.length === 0 ? <EmptyState title="No payments yet" /> : (
            <table className="tbl"><tbody>{paid.slice(0, 7).map(i => <tr key={i.number}><td>{i.number}</td><td>{clientName(d, i)}</td><td>{fmtDate(i.paidOn)}</td><td className="num">{money(invTotal(i))}</td></tr>)}</tbody></table>
          )}
        </Card>
      </div>
      <EmailPreview open={!!msg} onClose={() => setMsg(null)} to={msg?.to ?? ''} subject={msg?.subject ?? ''} body={msg?.body ?? ''} />
    </>
  )
}
