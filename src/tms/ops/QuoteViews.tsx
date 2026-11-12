import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Checkbox, Input, Select } from '@fluentui/react-components'
import { useStore, useCtx, orgName } from '../../shared/store'
import { PageHeader, Card, EmptyState, Status, Stat, ReleaseBadge } from '../../shared/ui'
import { FText } from '../../shared/fields'
import { fmtDate, money } from '../../shared/format'
import type { Quote } from '../../shared/types'
import { useOps } from './opsStore'
import { expiry } from './logic'
import { QuoteDoc, QuoteDocModal } from './QuoteDoc'
import { acceptQuote, duplicateQuote, quoteTotals, toDocQuote } from './quoteActions'
import { downloadCsv } from './download'

export function ExpiryChip({ q }: { q: Quote }) {
  const e = expiry(q.validUntil, q.status)
  if (e.tone === 'none') return <span className="ops-pill ok">Accepted</span>
  return <span className={`ops-pill ${e.tone}`}>{e.label}</span>
}

const TABS = ['All', 'Draft', 'Sent', 'Accepted', 'Expired'] as const

export function QuoteList() {
  const d = useStore(s => s.data)
  const { persona, orgId } = useCtx()
  const nav = useNavigate()
  const isClient = persona === 'client'
  const [params] = useSearchParams()
  const wanted = TABS.find(t => t === params.get('status'))
  const [tab, setTab] = useState<typeof TABS[number]>(wanted && !(isClient && wanted === 'Draft') ? wanted : 'All')
  const [q, setQ] = useState('')
  const [client, setClient] = useState('')
  const [sort, setSort] = useState('issued-desc')
  const base = d.quotes.filter(x => (isClient ? x.orgId === orgId && x.status !== 'Draft' : true))
  const list = base.filter(x => (tab === 'All' || x.status === tab) && (!client || x.orgId === client)
    && (!q.trim() || `${x.number} ${orgName(d, x.orgId)}`.toLowerCase().includes(q.trim().toLowerCase())))
    .sort((a, b) => {
      const [k, dir] = sort.split('-'); const m = dir === 'asc' ? 1 : -1
      const va = k === 'total' ? quoteTotals(a).total : k === 'valid' ? a.validUntil : a.issued
      const vb = k === 'total' ? quoteTotals(b).total : k === 'valid' ? b.validUntil : b.issued
      return (va < vb ? -1 : va > vb ? 1 : 0) * m
    })
  const net = (x: Quote) => quoteTotals(x).net
  const sum = (s: Quote['status']) => base.filter(x => x.status === s).reduce((a, x) => a + net(x), 0)
  const shown = list.reduce((a, x) => a + quoteTotals(x).total, 0)
  const count = (t: typeof TABS[number]) => (t === 'All' ? base.length : base.filter(x => x.status === t).length)
  const expSoon = base.filter(x => x.status === 'Sent' && expiry(x.validUntil, x.status).days <= 7 && expiry(x.validUntil, x.status).days >= 0).length

  return (
    <>
      <PageHeader id="quotes" title={isClient ? 'Your quotes' : 'Quotes'} subtitle={isClient ? 'Quotes issued to Cape Freight' : 'Build, send and track quotes'}
        actions={<>
          <Button onClick={() => downloadCsv('quotes.csv', [['Number', 'Client', 'Status', 'Issued', 'Valid until', 'Net', 'Total incl VAT'], ...list.map(x => [x.number, orgName(d, x.orgId), x.status, x.issued, x.validUntil, net(x), quoteTotals(x).total])])}>Export CSV</Button>
          {!isClient && <Link to="/quotes/new"><Button appearance="primary">New quote</Button></Link>}
        </>} />
      {!isClient && (
        <div className="grid c4" style={{ marginBottom: 16 }}>
          <Stat label="Pipeline value (sent)" value={money(sum('Sent'))} hint={`${base.filter(x => x.status === 'Sent').length} quotes out, excl. VAT`} />
          <Stat label="Accepted value" value={money(sum('Accepted'))} hint={`${base.filter(x => x.status === 'Accepted').length} quotes, excl. VAT`} />
          <Stat label="In draft" value={money(sum('Draft'))} hint={`${base.filter(x => x.status === 'Draft').length} not yet sent`} />
          <Stat label="Expiring within 7 days" value={expSoon} hint="Sent quotes to chase" />
        </div>
      )}
      <div className="ops-tabs" role="group" aria-label="Filter by status">
        {TABS.filter(t => !(isClient && t === 'Draft')).map(t => <button key={t} className="ops-tab" aria-pressed={tab === t} onClick={() => setTab(t)}>{t} ({count(t)})</button>)}
      </div>
      <div className="ops-toolbar">
        <div className="ops-search"><Input style={{ width: '100%' }} type="search" aria-label="Search quotes" placeholder="Search number or client" value={q} onChange={(_, x) => setQ(x.value)} /></div>
        {!isClient && <Select className="ops-sel" aria-label="Filter by client" value={client} onChange={(_, x) => setClient(x.value)}><option value="">All clients</option>{d.orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>}
        <Select className="ops-sel" aria-label="Sort quotes" value={sort} onChange={(_, x) => setSort(x.value)}>
          <option value="issued-desc">Newest first</option><option value="issued-asc">Oldest first</option><option value="total-desc">Highest total</option><option value="total-asc">Lowest total</option><option value="valid-asc">Expiring soonest</option>
        </Select>
      </div>
      <Card>
        {list.length === 0 ? <EmptyState title={base.length ? 'No quotes match' : 'No quotes yet'} text={isClient ? 'Quotes sent to your organisation will appear here.' : 'Adjust the filters or create a new quote.'} /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Number</th>{!isClient && <th>Client</th>}<th>Issued</th><th>Valid until</th><th className="num">Net</th><th className="num">Total (incl. VAT)</th><th>Status</th><th /></tr></thead>
            <tbody>{list.map(x => (
              <tr key={x.id}>
                <td><Link to={`/quotes/${x.id}`}>{x.number}</Link></td>{!isClient && <td>{orgName(d, x.orgId)}</td>}
                <td>{fmtDate(x.issued)}</td><td>{fmtDate(x.validUntil)} <ExpiryChip q={x} /></td>
                <td className="num">{money(net(x))}</td><td className="num">{money(quoteTotals(x).total)}</td><td><Status s={x.status} /></td>
                <td><div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                  <Link to={`/quotes/${x.id}`}>{isClient ? 'View' : 'Open'}</Link>
                  {!isClient && <Button size="small" appearance="subtle" onClick={() => nav(`/quotes/${duplicateQuote(x)}`)} aria-label={`Duplicate ${x.number}`}>Duplicate</Button>}
                </div></td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td colSpan={isClient ? 4 : 5} className="muted small">{list.length} quote{list.length === 1 ? '' : 's'} shown</td><td className="num"><b>{money(shown)}</b></td><td colSpan={2} className="muted small">incl. VAT</td></tr></tfoot>
          </table></div>
        )}
      </Card>
    </>
  )
}

export function ClientQuote({ q }: { q: Quote }) {
  const d = useStore(s => s.data)
  const meta = useOps(s => s.quoteMeta[q.id])
  const contact = d.contacts.find(c => c.orgId === q.orgId)
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [err, setErr] = useState('')
  const [view, setView] = useState(false)
  const accept = () => {
    if (!agree) { setErr('Please confirm that you are authorised to accept this quote'); return }
    if (name.trim().split(/\s+/).length < 2) { setErr('Type your full name (first name and surname) to sign'); return }
    setErr(''); acceptQuote(q, name.trim())
  }
  const e = expiry(q.validUntil, q.status)
  return (
    <>
      <PageHeader id="quotes" title={`Quote ${q.number}`} actions={<><Status s={q.status} /><Button onClick={() => setView(true)}>Print view</Button><Link to="/quotes"><Button>Back to quotes</Button></Link></>} />
      <QuoteDoc q={toDocQuote(q, meta)} d={d} />
      <Card title="Your response">
        {q.status === 'Sent' && e.days >= 0 && (
          <div className="form" style={{ maxWidth: 520 }}>
            <div className={`ops-pill ${e.tone}`} style={{ width: 'fit-content' }}>{e.label}</div>
            <Checkbox checked={agree} onChange={(_, x) => { setAgree(!!x.checked); setErr('') }} label={`I am authorised to accept this quote on behalf of ${orgName(d, q.orgId)}.`} />
            <FText label="Type your full name to sign" value={name} onChange={v => { setName(v); setErr('') }} placeholder={contact?.name ?? 'Full name'} error={err} />
            {name.trim() && <div>Signature preview: <span className="ops-sig-name">{name}</span></div>}
            <div><Button appearance="primary" onClick={accept}>Accept quote</Button></div>
            <span className="muted small"><ReleaseBadge r="R2" /> Single sign-on and a legally binding e-signature are planned for R2. In this demo a typed name stands in for the signature.</span>
          </div>
        )}
        {q.status === 'Sent' && e.days < 0 && <p className="muted">This quote passed its validity date. Contact the training team to renew it.</p>}
        {q.status === 'Accepted' && <div className="ops-okbox" role="status">✓ Accepted{meta?.signedBy ? ` by ${meta.signedBy}` : ''}. The training team will confirm dates and venue shortly.</div>}
        {q.status === 'Expired' && <p className="muted">This quote has expired. Contact the training team for a new one.</p>}
      </Card>
      <QuoteDocModal open={view} onClose={() => setView(false)} q={toDocQuote(q, meta)} d={d} />
    </>
  )
}
