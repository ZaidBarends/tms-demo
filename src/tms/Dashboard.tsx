import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, EmptyState } from '../shared/ui'
import { seatsTaken, invTotal } from '../shared/calc'
import { addDays, fmtDate, fmtDateTime, fmtShort, money, today } from '../shared/format'
import { PALETTE, GRID, buildLedger, deltaPct, fakeSeries, monthlySeries, pipeline, receivablesAt, STAGE_PROB } from './money/calc'
import type { LedgerRow } from './money/calc'
import { Kpi } from './money/ui'
import AlertCentre from './money/AlertCentre'

const sumWin = (rows: LedgerRow[], key: 'date' | 'paidOn', from: string, to: string) =>
  rows.filter(r => { const v = r[key]; return v && v >= from && v <= to }).reduce((a, r) => a + (key === 'date' ? r.incl : r.paid), 0)

export default function Dashboard() {
  const d = useStore(s => s.data)
  const nav = useNavigate()
  const now = today()
  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const ledger = useMemo(() => buildLedger(d, now), [d, now])
  const series = useMemo(() => monthlySeries(ledger, now, 12), [ledger, now])
  const win = (key: 'date' | 'paidOn', k: number) => sumWin(ledger, key, addDays(now, -30 * (k + 1) + 1), addDays(now, -30 * k))
  const invWins = [5, 4, 3, 2, 1, 0].map(k => win('date', k)), colWins = [5, 4, 3, 2, 1, 0].map(k => win('paidOn', k))
  const recvSpark = [150, 120, 90, 60, 30, 0].map(k => receivablesAt(ledger, addDays(now, -k)))
  const pipe = pipeline(d.opportunities)

  const upcoming = d.sessions.filter(s => s.status === 'Scheduled' && s.start >= now)
  const seats = upcoming.reduce((a, s) => a + s.capacity, 0), taken = upcoming.reduce((a, s) => a + seatsTaken(d, s.id), 0)
  const fill = seats ? Math.round((taken / seats) * 100) : 0
  const active = d.enrolments.filter(e => e.status !== 'Completed').length
  const fillS = fakeSeries(fill, 3), actS = fakeSeries(active, 9), pipeS = fakeSeries(Math.round(pipe.weighted), 21)
  const last2 = (a: number[]) => deltaPct(a[a.length - 1], a[a.length - 2])

  const clients = useMemo(() => {
    const m = new Map<string, number>()
    ledger.filter(r => r.date >= addDays(now, -365)).forEach(r => {
      const k = r.orgId ? d.orgs.find(o => o.id === r.orgId)?.name ?? '—' : 'Self-paying learners'
      m.set(k, (m.get(k) ?? 0) + r.exVat)
    })
    return Array.from(m.entries()).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value).slice(0, 6)
  }, [ledger, d.orgs, now])

  const agenda = useMemo(() => {
    const items: { date: string; tag: string; text: ReactNodeLike; to: string }[] = []
    d.sessions.filter(s => s.status === 'Scheduled' && s.start >= now && s.start <= addDays(now, 7)).forEach(s => items.push({ date: s.start, tag: s.start === now ? 'Today' : fmtShort(s.start), text: `${d.courses.find(c => c.id === s.courseId)?.title} · ${seatsTaken(d, s.id)}/${s.capacity} booked`, to: `/sessions/${s.id}` }))
    d.invoices.filter(i => i.status !== 'Paid' && i.due >= now && i.due <= addDays(now, 7)).forEach(i => items.push({ date: i.due, tag: 'Due', text: `${i.number} falls due ${fmtDate(i.due)} (${money(invTotal(i))})`, to: '/invoicing' }))
    d.quotes.filter(q => q.status === 'Sent' && q.validUntil >= now && q.validUntil <= addDays(now, 10)).forEach(q => items.push({ date: q.validUntil, tag: 'Quote', text: `${q.number} expires ${fmtDate(q.validUntil)}`, to: '/quotes' }))
    d.opportunities.filter(o => !['won', 'lost'].includes(o.stage) && o.expectedClose >= now && o.expectedClose <= addDays(now, 14)).forEach(o => items.push({ date: o.expectedClose, tag: 'Deal', text: `${o.title} expected to close`, to: '/opportunities' }))
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 7)
  }, [d, now])

  const forecastRows = pipe.open.length
    ? (['enquiry', 'needs', 'quoted'] as const).map(st => {
        const rows = pipe.open.filter(o => o.stage === st)
        const v = rows.reduce((a, o) => a + o.value, 0)
        return { stage: st, deals: rows.length, value: v, prob: STAGE_PROB[st], weighted: v * STAGE_PROB[st] }
      })
    : []
  const maxFunnel = Math.max(1, ...pipe.funnel.map(f => f.value))

  return (
    <>
      <PageHeader id="dashboard" title="Dashboard" subtitle="Pipeline, delivery and cash at a glance" />
      <div className="mny-greet">
        <Card>
          <h2 className="mny-hello">{hello}, Thandi</h2>
          <div className="muted">{fmtDate(now)}. Here is what needs your attention today.</div>
          <ul className="mny-agenda" aria-label="Today's agenda">
            {agenda.length === 0 && <li className="muted">Nothing scheduled in the next week.</li>}
            {agenda.map((a, i) => <li key={i}><span className="tag">{a.tag}</span><Link to={a.to}>{a.text}</Link></li>)}
          </ul>
        </Card>
        <Card title="Quick actions">
          <div className="mny-quick" style={{ marginBottom: 0 }}>
            <Button appearance="primary" onClick={() => nav('/quotes')}>New quote</Button>
            <Button onClick={() => nav('/opportunities')}>Log opportunity</Button>
            <Button onClick={() => nav('/courses')}>Schedule session</Button>
            <Button onClick={() => nav('/invoicing')}>Open invoicing</Button>
            <Button onClick={() => nav('/communications')}>Send campaign</Button>
            <Button onClick={() => nav('/reports')}>Run report</Button>
          </div>
        </Card>
      </div>

      <div className="grid c3" style={{ marginBottom: 20 }}>
        <Kpi label="Invoiced, last 30 days" value={money(invWins[5])} delta={last2(invWins)} spark={invWins} hint="vs previous 30 days" />
        <Kpi label="Cash collected, last 30 days" value={money(colWins[5])} delta={last2(colWins)} spark={colWins} color={PALETTE.green} hint="vs previous 30 days" />
        <Kpi label="Outstanding receivables" value={money(recvSpark[5])} delta={deltaPct(recvSpark[5], recvSpark[4])} goodWhenUp={false} spark={recvSpark} color={PALETTE.orange} hint="vs 30 days ago" />
        <Kpi label="Weighted pipeline forecast" value={money(pipe.weighted)} delta={last2(pipeS)} spark={pipeS} color={PALETTE.purple} />
        <Kpi label="Seat fill, upcoming sessions" value={`${fill}%`} delta={last2(fillS)} spark={fillS} color={PALETTE.sky} hint={`${taken} of ${seats} seats`} />
        <Kpi label="Learners in progress" value={active} delta={last2(actS)} spark={actS} hint="vs last month" />
      </div>

      <div className="grid c2">
        <Card title="Revenue trend: invoiced vs collected" actions={<Link to="/reports">Reports</Link>}>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <AreaChart data={series} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PALETTE.blue} stopOpacity={0.35} /><stop offset="100%" stopColor={PALETTE.blue} stopOpacity={0.02} /></linearGradient>
                  <linearGradient id="gCol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={PALETTE.green} stopOpacity={0.35} /><stop offset="100%" stopColor={PALETTE.green} stopOpacity={0.02} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                <XAxis dataKey="label" fontSize={12} /><YAxis fontSize={12} tickFormatter={v => `R${Math.round(v / 1000)}k`} width={52} />
                <Tooltip formatter={(v: number) => money(Math.round(v))} /><Legend verticalAlign="top" height={28} />
                <Area type="monotone" name="Invoiced" dataKey="invoiced" stroke={PALETTE.blue} strokeWidth={2} fill="url(#gInv)" />
                <Area type="monotone" name="Collected" dataKey="collected" stroke={PALETTE.green} strokeWidth={2} fill="url(#gCol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <AlertCentre />
        <Card title="Pipeline funnel" actions={<Link to="/opportunities">Opportunities</Link>}>
          {pipe.funnel.map(f => (
            <div key={f.id} className="mny-funnel-row">
              <div>{f.label}<div className="muted small">{f.deals} deals</div></div>
              <div><div className="mny-funnel-bar" style={{ width: `${Math.max(8, (f.value / maxFunnel) * 100)}%` }}>{money(f.value)}</div></div>
              <div className="mny-conv">{f.id === 'enquiry' ? 'all deals' : `${f.conversion}% advance`}</div>
            </div>
          ))}
          <div className="callout" style={{ marginTop: 12 }}>
            Probability-weighted forecast of open deals: <b>{money(pipe.weighted)}</b> from {money(pipe.openValue)} open.
          </div>
          {forecastRows.length > 0 && (
            <table className="tbl" style={{ marginTop: 8 }}><thead><tr><th>Open stage</th><th className="num">Deals</th><th className="num">Value</th><th className="num">Prob.</th><th className="num">Weighted</th></tr></thead><tbody>
              {forecastRows.map(r => <tr key={r.stage}><td style={{ textTransform: 'capitalize' }}>{r.stage}</td><td className="num">{r.deals}</td><td className="num">{money(r.value)}</td><td className="num">{Math.round(r.prob * 100)}%</td><td className="num">{money(r.weighted)}</td></tr>)}
            </tbody></table>
          )}
        </Card>
        <Card title="Top clients by revenue (12 months, ex VAT)">
          {clients.length === 0 ? <EmptyState title="No revenue yet" /> : (
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={clients} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
                  <XAxis type="number" fontSize={12} tickFormatter={v => `R${Math.round(v / 1000)}k`} />
                  <YAxis type="category" dataKey="name" width={150} fontSize={12} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Bar dataKey="value" name="Revenue" fill={PALETTE.blue} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
        <Card title="Upcoming courses" actions={<Link to="/courses">All courses</Link>}>
          {upcoming.length === 0 ? <EmptyState title="No upcoming sessions" /> : (
            <table className="tbl"><tbody>
              {upcoming.sort((a, b) => a.start.localeCompare(b.start)).slice(0, 6).map(s => {
                const pct = Math.round((seatsTaken(d, s.id) / s.capacity) * 100)
                return (
                  <tr key={s.id}>
                    <td><Link to={`/sessions/${s.id}`}>{d.courses.find(c => c.id === s.courseId)?.title}</Link></td>
                    <td>{fmtDate(s.start)}</td>
                    <td style={{ width: 120 }}><div className="mny-bar" title={`${pct}% full`}><div style={{ width: `${pct}%`, background: pct < 40 ? PALETTE.orange : PALETTE.blue }} /></div></td>
                    <td className="num">{seatsTaken(d, s.id)}/{s.capacity}</td>
                  </tr>
                )
              })}
            </tbody></table>
          )}
        </Card>
        <Card title="Recent activity">
          {d.activity.length === 0 ? <EmptyState title="No activity yet" /> : (
            <ol className="mny-timeline">
              {d.activity.slice(0, 8).map(a => <li key={a.id}><div>{a.text}</div><div className="muted small">{fmtDateTime(a.at)}</div></li>)}
            </ol>
          )}
        </Card>
      </div>
    </>
  )
}
type ReactNodeLike = string
