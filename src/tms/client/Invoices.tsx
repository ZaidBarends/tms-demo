import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore, useCtx } from '../../shared/store'
import { PageHeader, Card, EmptyState, Modal, Stat, Status } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { invTotal } from '../../shared/calc'
import { fmtDate, money, today } from '../../shared/format'
import type { Invoice } from '../../shared/types'
import { downloadText, printWindow, toCsv } from '../../talent/download'
import { useClient } from './clientStore'
import { aging, ledger } from './clientLogic'
import './client.css'

const REASONS = ['Amount is incorrect', 'Learner did not attend', 'Duplicate invoice', 'Service not delivered as quoted', 'Other']
const COLORS = ['#13a10e', '#92ca61', '#f7630c', '#c50f1f', '#8a1a10']

export function ClientInvoices() {
  const d = useStore(s => s.data)
  const { orgId } = useCtx()
  const C = useClient()
  const org = d.orgs.find(o => o.id === orgId)!
  const now = today()
  const list = d.invoices.filter(i => i.orgId === orgId).sort((a, b) => b.issued.localeCompare(a.issued))
  const lines = ledger([...list])
  const buckets = aging(list, now)
  const outstanding = list.filter(i => i.status !== 'Paid').reduce((a, i) => a + invTotal(i), 0)
  const disputed = (n: string) => C.disputes.some(x => x.invoice === n)

  const [pay, setPay] = useState<Invoice | null>(null)
  const [dis, setDis] = useState<Invoice | null>(null)
  const [stmt, setStmt] = useState(false)
  const [done, setDone] = useState('')
  const [method, setMethod] = useState<'Card' | 'EFT'>('Card')
  const [card, setCard] = useState({ num: '', exp: '', cvv: '' })
  const [reason, setReason] = useState(REASONS[0])
  const [detail, setDetail] = useState('')
  const [err, setErr] = useState<Record<string, string>>({})

  const doPay = () => {
    if (!pay) return
    const e: Record<string, string> = {}
    if (method === 'Card') {
      if (!/^\d{16}$/.test(card.num.replace(/\s/g, ''))) e.num = 'Enter a 16-digit test card number'
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.exp)) e.exp = 'Use MM/YY'
      if (!/^\d{3}$/.test(card.cvv)) e.cvv = '3 digits'
    }
    setErr(e); if (Object.keys(e).length) return
    const ref = C.addPayment({ invoice: pay.number, method })
    useStore.getState().setInvoiceStatus(pay.number, 'Paid')
    useStore.getState().log(`${org.name} paid ${pay.number} (${method}, ${ref})`)
    setDone(`Payment received for ${pay.number}. Reference ${ref}. This is a demo: no money moved.`)
    setPay(null); setCard({ num: '', exp: '', cvv: '' })
  }
  const doDispute = () => {
    if (!dis) return
    if (detail.trim().length < 10) return setErr({ detail: 'Describe the problem (10+ characters)' })
    C.addDispute({ invoice: dis.number, reason, detail: detail.trim() })
    useStore.getState().log(`${org.name} disputed ${dis.number}: ${reason}`)
    setDone(`Dispute logged for ${dis.number}. Finance will contact you within two working days.`)
    setDis(null); setDetail(''); setErr({})
  }
  const exportCsv = () => downloadText(`statement-${org.name.replace(/\s+/g, '-').toLowerCase()}-${now}.csv`, toCsv([
    ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'], ...lines.map(l => [l.date, l.ref, l.text, l.debit.toFixed(2), l.credit.toFixed(2), l.balance.toFixed(2)]),
  ]))

  return (
    <>
      <PageHeader id="client-invoices" title="Our invoices" subtitle="Invoices, statement and payment status for Cape Freight" actions={<Button appearance="primary" onClick={() => setStmt(true)}>Download statement</Button>} />
      {done && <div className="callout" role="status" style={{ marginBottom: 14 }}>{done}</div>}
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Paid" value={money(list.filter(i => i.status === 'Paid').reduce((a, i) => a + invTotal(i), 0))} />
        <Stat label="Outstanding" value={money(outstanding)} hint={`${list.filter(i => i.status !== 'Paid').length} invoice(s)`} />
        <Stat label="Overdue" value={list.filter(i => i.status === 'Overdue').length} hint={money(list.filter(i => i.status === 'Overdue').reduce((a, i) => a + invTotal(i), 0))} />
        <Stat label="In dispute" value={list.filter(i => disputed(i.number)).length} />
      </div>
      <div className="grid c2">
        <Card title="Ageing of unpaid invoices">
          <div style={{ height: 220 }} role="img" aria-label="Unpaid invoice amounts by age">
            <ResponsiveContainer>
              <BarChart data={buckets}><CartesianGrid strokeDasharray="3 3" stroke="#8884" /><XAxis dataKey="bucket" fontSize={11} /><YAxis fontSize={11} tickFormatter={v => `R${Math.round(v / 1000)}k`} /><Tooltip formatter={(v: number) => money(v)} />
                <Bar dataKey="amount" name="Outstanding" radius={[6, 6, 0, 0]}>{buckets.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Statement (running balance)" actions={<Button size="small" onClick={exportCsv}>Export CSV</Button>}>
          {lines.length === 0 ? <EmptyState title="No activity yet" /> : (
            <div className="tbl-wrap" style={{ maxHeight: 250, overflowY: 'auto' }}><table className="tbl cl-ledger"><thead><tr><th>Date</th><th>Detail</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead><tbody>
              {[...lines].reverse().map((l, i) => <tr key={i} className={l.credit ? 'credit' : ''}><td>{fmtDate(l.date)}</td><td>{l.ref}<div className="muted small">{l.text}</div></td><td className="num">{l.debit ? money(l.debit) : ''}</td><td className="num">{l.credit ? money(l.credit) : ''}</td><td className="num">{money(l.balance)}</td></tr>)}
            </tbody></table></div>
          )}
        </Card>
      </div>
      <Card title="Invoices">
        {list.length === 0 ? <EmptyState title="No invoices yet" /> : (
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Invoice</th><th>Description</th><th>Issued</th><th>Due</th><th className="num">Total</th><th>Status</th><th /></tr></thead><tbody>
            {list.map(i => (
              <tr key={i.number}>
                <td>{i.number}</td><td>{i.description}{i.creditNote ? <div className="muted small">Includes credit note {money(i.creditNote)}</div> : null}</td><td>{fmtDate(i.issued)}</td><td>{fmtDate(i.due)}</td><td className="num">{money(invTotal(i))}</td>
                <td><Status s={i.status} />{disputed(i.number) && <div className="small" style={{ color: '#f7630c' }}>Disputed</div>}</td>
                <td>{i.status !== 'Paid' && <div className="row" style={{ gap: 6 }}>
                  <Button size="small" appearance="primary" disabled={disputed(i.number)} onClick={() => { setPay(i); setErr({}); setDone('') }}>Pay now</Button>
                  {!disputed(i.number) && <Button size="small" onClick={() => { setDis(i); setErr({}); setDone('') }}>Dispute</Button>}
                </div>}</td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </Card>

      <Modal open={!!pay} onClose={() => setPay(null)} title={`Pay ${pay?.number ?? ''}`} actions={<Button appearance="primary" onClick={doPay}>Pay {pay ? money(invTotal(pay)) : ''}</Button>}>
        <div className="form">
          <p style={{ margin: 0 }}>{pay?.description}. Amount due <b>{pay ? money(invTotal(pay)) : ''}</b> including VAT.</p>
          <FSelect label="Method" value={method} onChange={v => setMethod(v as 'Card' | 'EFT')} options={[{ value: 'Card', label: 'Card' }, { value: 'EFT', label: 'Instant EFT' }]} />
          {method === 'Card' ? (
            <>
              <FText label="Card number" value={card.num} onChange={v => setCard({ ...card, num: v })} error={err.num} placeholder="4111 1111 1111 1111" />
              <div className="form c2">
                <FText label="Expiry" value={card.exp} onChange={v => setCard({ ...card, exp: v })} error={err.exp} placeholder="MM/YY" />
                <FText label="CVV" value={card.cvv} onChange={v => setCard({ ...card, cvv: v })} error={err.cvv} />
              </div>
            </>
          ) : <div className="cl-pre">You would be redirected to your bank. In this demo the payment is confirmed instantly.</div>}
          <span className="muted small">Mock payment screen. No card details are stored or sent anywhere.</span>
        </div>
      </Modal>
      <Modal open={!!dis} onClose={() => setDis(null)} title={`Dispute ${dis?.number ?? ''}`} actions={<Button appearance="primary" onClick={doDispute}>Submit dispute</Button>}>
        <div className="form">
          <FSelect label="Reason" value={reason} onChange={setReason} options={REASONS.map(r => ({ value: r, label: r }))} />
          <FArea label="What is wrong?" value={detail} onChange={setDetail} rows={4} error={err.detail} />
          <span className="muted small">Paying is paused for a disputed invoice until Finance responds.</span>
        </div>
      </Modal>
      <Modal open={stmt} onClose={() => setStmt(false)} title="Statement of account" wide actions={<><Button onClick={exportCsv}>Download CSV</Button><Button appearance="primary" onClick={printWindow}>Print or save as PDF</Button></>}>
        <div className="doc cl-print cl-stmt">
          <h2>Statement of account</h2>
          <div>{org.name}, {org.city}<br />Statement date: {fmtDate(now)}</div>
          <table><thead><tr><th>Date</th><th>Reference</th><th>Detail</th><th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th></tr></thead><tbody>
            {lines.map((l, i) => <tr key={i}><td>{fmtDate(l.date)}</td><td>{l.ref}</td><td>{l.text}</td><td className="num">{l.debit ? money(l.debit) : ''}</td><td className="num">{l.credit ? money(l.credit) : ''}</td><td className="num">{money(l.balance)}</td></tr>)}
          </tbody></table>
          <table><thead><tr>{buckets.map(b => <th key={b.bucket} className="num">{b.bucket}</th>)}<th className="num">Total due</th></tr></thead><tbody>
            <tr>{buckets.map(b => <td key={b.bucket} className="num">{money(b.amount)}</td>)}<td className="num"><b>{money(outstanding)}</b></td></tr>
          </tbody></table>
          <p style={{ fontSize: 12 }}>Amounts include VAT at 15%. Please use the invoice number as your payment reference.</p>
        </div>
      </Modal>
    </>
  )
}
