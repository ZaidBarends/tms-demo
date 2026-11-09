import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore, useCtx } from '../../shared/store'
import { PageHeader, Card, EmptyState, Modal, Stat, Status } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { invTotal } from '../../shared/calc'
import { fmtDate, money, today, totals } from '../../shared/format'
import { downloadText, toCsv } from '../../talent/download'
import { useClient } from './clientStore'
import { complianceMatrix } from './clientLogic'
import { BookingWizard } from './BookingWizard'
import './client.css'

export default function ClientDashboard() {
  const d = useStore(s => s.data)
  const setQuoteStatus = useStore(s => s.setQuoteStatus)
  const { orgId } = useCtx()
  const C = useClient()
  const nav = useNavigate()
  const now = today()
  const org = d.orgs.find(o => o.id === orgId)!
  const contact = d.contacts.find(c => c.orgId === orgId)

  const invs = d.invoices.filter(i => i.orgId === orgId)
  const paid = invs.filter(i => i.status === 'Paid').reduce((a, i) => a + invTotal(i), 0)
  const unpaid = invs.filter(i => i.status !== 'Paid').reduce((a, i) => a + invTotal(i), 0)
  const spent = paid + unpaid
  const pct = Math.round((spent / C.budget) * 100)
  const gauge = [{ name: 'Paid', value: paid, fill: '#0f6cbd' }, { name: 'Invoiced, unpaid', value: unpaid, fill: '#f7630c' }, { name: 'Budget left', value: Math.max(0, C.budget - spent), fill: '#c4c9cf' }]

  const es = d.enrolments.filter(e => e.orgId === orgId && e.payer === 'employer')
  const byCourse = Array.from(new Set(es.map(e => e.courseId))).map(cid => {
    const l = es.filter(e => e.courseId === cid)
    return { name: (d.courses.find(c => c.id === cid)?.code ?? ''), full: d.courses.find(c => c.id === cid)?.title ?? '', rate: Math.round((l.filter(e => e.status === 'Completed').length / l.length) * 100), n: l.length }
  }).sort((a, b) => b.n - a.n)
  const overallRate = es.length ? Math.round((es.filter(e => e.status === 'Completed').length / es.length) * 100) : 0

  const m = useMemo(() => complianceMatrix(d, C, orgId, now), [d, C.roster, C.legacyCerts, orgId, now])
  const sessions = Object.values(es.filter(e => e.sessionId).reduce<Record<string, { s: NonNullable<typeof d.sessions[number]>; n: number; names: string[] }>>((acc, e) => {
    const s = d.sessions.find(x => x.id === e.sessionId)
    if (!s || s.start < now) return acc
    const row = (acc[s.id] ??= { s, n: 0, names: [] }); row.n++; row.names.push(d.learners.find(l => l.id === e.learnerId)?.name ?? ''); return acc
  }, {})).sort((a, b) => a.s.start.localeCompare(b.s.start)).slice(0, 5)

  const quotes = d.quotes.filter(q => q.orgId === orgId && q.status === 'Sent')
  const due = invs.filter(i => i.status !== 'Paid').sort((a, b) => a.due.localeCompare(b.due))

  const [wizard, setWizard] = useState(false)
  const [qr, setQr] = useState(false)
  const [f, setF] = useState({ courseId: '', people: '10', notes: '' })
  const [err, setErr] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const sendQuote = () => {
    const e: Record<string, string> = {}
    if (!f.courseId) e.courseId = 'Choose a course'
    if (!(Number(f.people) >= 1)) e.people = 'Enter how many people'
    setErr(e); if (Object.keys(e).length) return
    C.addQuoteRequest({ courseId: f.courseId, people: Number(f.people), notes: f.notes.trim() })
    useStore.getState().log(`${org.name} asked for a quote: ${d.courses.find(c => c.id === f.courseId)?.title}, ${f.people} people`)
    setQr(false); setMsg('Quote request sent. The training team will respond within one working day.'); setF({ courseId: '', people: '10', notes: '' })
  }
  const report = () => {
    downloadText(`cape-freight-training-report-${now}.csv`, toCsv([
      ['Course', 'Learners', 'Completed', 'Completion %'],
      ...byCourse.map(c => [c.full, c.n, Math.round((c.rate / 100) * c.n), c.rate]), [],
      ['Budget', C.budget], ['Invoiced (incl. VAT)', spent.toFixed(2)], ['Compliance score %', m.score],
    ]))
    setMsg('Report downloaded.')
  }

  return (
    <>
      <PageHeader id="client-dashboard" title={`Hello ${contact?.name.split(' ')[0] ?? ''}`} subtitle={`${org.name} training overview`} />
      {msg && <div className="callout" role="status" style={{ marginBottom: 14 }}>{msg}</div>}
      <Card title="Quick actions">
        <div className="cl-actions">
          <Button appearance="primary" onClick={() => { setQr(true); setErr({}) }}>Request a quote</Button>
          <Button onClick={() => setWizard(true)}>Request a booking</Button>
          <Button onClick={() => nav('/client/learners')}>Add learners</Button>
          <Button onClick={report}>Download report</Button>
        </div>
      </Card>
      <div className="grid c4" style={{ marginBottom: 20 }}>
        <Stat label="Learners on training" value={new Set(es.map(e => e.learnerId)).size} />
        <Stat label="Completion rate" value={`${overallRate}%`} hint={`${es.filter(e => e.status === 'Completed').length} of ${es.length} places`} />
        <Stat label="Compliance score" value={`${m.score}%`} hint={`${m.counts.expiring} expiring soon`} />
        <Stat label="Invoices to pay" value={money(unpaid)} hint={`${due.length} invoice(s)`} />
      </div>
      <div className="grid c2">
        <Card title="Training spend vs budget">
          <div className="cl-gauge" role="img" aria-label={`Spent ${money(spent)} of a ${money(C.budget)} budget, ${pct} percent`}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={gauge} dataKey="value" startAngle={180} endAngle={0} cx="50%" cy="100%" innerRadius="140%" outerRadius="190%" stroke="none">
                  {gauge.map((g, i) => <Cell key={i} fill={g.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="cl-gauge-label"><b>{pct}%</b><span className="muted small">{money(spent)} of {money(C.budget)}</span></div>
          </div>
          <div className="chips" style={{ justifyContent: 'center', marginTop: 8 }}>
            <span className="chip">Paid {money(paid)}</span><span className="chip">Unpaid {money(unpaid)}</span><span className="chip">Left {money(Math.max(0, C.budget - spent))}</span>
          </div>
        </Card>
        <Card title="Completion rate by course">
          {byCourse.length === 0 ? <EmptyState title="No courses yet" /> : (
            <div style={{ height: 230 }} role="img" aria-label="Completion rate per course">
              <ResponsiveContainer>
                <BarChart data={byCourse} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8884" /><XAxis dataKey="name" fontSize={11} /><YAxis domain={[0, 100]} unit="%" fontSize={11} />
                  <Tooltip formatter={(v: number, _n, p) => [`${v}% of ${p.payload.n}`, p.payload.full]} />
                  <Bar dataKey="rate" fill="#0f6cbd" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
      <div className="grid c3">
        <Card title="Upcoming sessions for your staff">
          {sessions.length === 0 ? <EmptyState title="Nothing scheduled" text="Request a booking to get dates." /> : (
            <ul className="cl-list">{sessions.map(r => (
              <li key={r.s.id}><span><b>{d.courses.find(c => c.id === r.s.courseId)?.title}</b><div className="muted small">{fmtDate(r.s.start)} · {r.s.venue}</div><div className="small">{r.names.slice(0, 3).join(', ')}{r.names.length > 3 ? ` +${r.names.length - 3}` : ''}</div></span><span className="chip">{r.n}</span></li>
            ))}</ul>
          )}
        </Card>
        <Card title="Certificates expiring in 90 days" actions={<Link to="/client/compliance">Compliance</Link>}>
          {m.expiries.length === 0 ? <EmptyState title="All clear" text="No required certificates expire in the next 90 days." /> : (
            <ul className="cl-list">{m.expiries.slice(0, 6).map((e, i) => (
              <li key={i}><span><b>{e.person.name}</b><div className="muted small">{e.cert.label}</div></span><span className="small" style={{ color: e.days <= 30 ? '#c50f1f' : '#b45309' }}>{fmtDate(e.expires)} · {e.days}d</span></li>
            ))}</ul>
          )}
        </Card>
        <Card title="Open quotes" actions={<Link to="/quotes">All quotes</Link>}>
          {quotes.length === 0 ? <EmptyState title="No open quotes" text="Quotes awaiting your decision appear here." /> : (
            <ul className="cl-list">{quotes.map(q => (
              <li key={q.id}><span><b>{q.number}</b><div className="muted small">Valid until {fmtDate(q.validUntil)} · {money(totals(q.lines, q.discountPct).total)}</div></span>
                <Button size="small" appearance="primary" onClick={() => { setQuoteStatus(q.id, 'Accepted'); setMsg(`Quote ${q.number} accepted. The training team will schedule your sessions.`) }}>Accept</Button></li>
            ))}</ul>
          )}
        </Card>
      </div>
      <Card title="Invoices due" actions={<Link to="/client/invoices">All invoices</Link>}>
        {due.length === 0 ? <EmptyState title="Nothing to pay" /> : (
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Invoice</th><th>Description</th><th>Due</th><th className="num">Total</th><th>Status</th></tr></thead><tbody>
            {due.map(i => <tr key={i.number}><td>{i.number}</td><td>{i.description}</td><td>{fmtDate(i.due)}</td><td className="num">{money(invTotal(i))}</td><td><Status s={i.status} /></td></tr>)}
          </tbody></table></div>
        )}
      </Card>
      <BookingWizard open={wizard} onClose={() => setWizard(false)} />
      <Modal open={qr} onClose={() => setQr(false)} title="Request a quote" actions={<Button appearance="primary" onClick={sendQuote}>Send request</Button>}>
        <div className="form">
          <FSelect label="Course" value={f.courseId} onChange={v => setF({ ...f, courseId: v })} placeholder="Choose a course" error={err.courseId} options={d.courses.filter(c => c.status === 'Active').map(c => ({ value: c.id, label: c.title }))} />
          <FText label="Number of people" type="number" value={f.people} onChange={v => setF({ ...f, people: v })} error={err.people} min={1} />
          <FArea label="Anything we should know?" value={f.notes} onChange={v => setF({ ...f, notes: v })} rows={3} />
        </div>
      </Modal>
    </>
  )
}
