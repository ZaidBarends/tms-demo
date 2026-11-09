import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Button, Select } from '@fluentui/react-components'
import { useStore, orgName } from '../../shared/store'
import { PageHeader, Card, EmptyState, Status, EmailPreview } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { addDays, fmtDate, fmtDateTime, money, today } from '../../shared/format'
import type { Quote } from '../../shared/types'
import { DEFAULT_TERMS, uid, useOps } from './opsStore'
import { expiry, netUnit } from './logic'
import { QuoteDocModal, docTotals, type DocQuote, type DocLine } from './QuoteDoc'
import { BUNDLES, acceptQuote, duplicateQuote, extendQuote, metaFor, nextQuoteNumber, sendQuote } from './quoteActions'
import { ExpiryChip } from './QuoteViews'

interface Draft {
  id: string; number: string; orgId: string; lines: DocLine[]; discountPct: number; venue: string; instructorId: string
  status: Quote['status']; issued: string; validityDays: number; terms: string; oppId?: string; internalNote: string
}
const blankLine = (): DocLine => ({ courseId: '', qty: 1, list: 0, disc: 0 })

export function QuoteBuilder() {
  const { id } = useParams()
  const loc = useLocation()
  const nav = useNavigate()
  const d = useStore(s => s.data)
  const save = useStore(s => s.saveQuote)
  const setStatus = useStore(s => s.setQuoteStatus)
  const ops = useOps()
  const existing = d.quotes.find(q => q.id === id)
  const isNew = id === 'new'
  const seed = loc.state as { fromOpp?: string; fromTna?: { orgId: string; lines: { courseId: string; qty: number }[]; note: string } } | null

  const [draft, setDraft] = useState<Draft>(() => {
    if (existing) {
      const m = metaFor(existing, ops.quoteMeta[existing.id])
      return { id: existing.id, number: existing.number, orgId: existing.orgId, discountPct: existing.discountPct, venue: existing.venue, instructorId: existing.instructorId,
        status: existing.status, issued: existing.issued, validityDays: m.validityDays, terms: m.terms, oppId: m.oppId, internalNote: m.internalNote ?? '',
        lines: existing.lines.map((l, i) => ({ courseId: l.courseId, qty: l.qty, list: m.lineMeta[i].list, disc: m.lineMeta[i].disc })) }
    }
    const base: Draft = { id: uid('q'), number: nextQuoteNumber(d), orgId: '', lines: [blankLine()], discountPct: 0, venue: '', instructorId: '', status: 'Draft', issued: today(), validityDays: 30, terms: DEFAULT_TERMS, internalNote: '' }
    const opp = seed?.fromOpp ? d.opportunities.find(o => o.id === seed.fromOpp) : undefined
    const mk = (courseId: string, qty: number): DocLine => ({ courseId, qty, list: d.courses.find(c => c.id === courseId)?.price ?? 0, disc: 0 })
    if (opp) {
      const tna = d.tnas.find(t => t.orgId === opp.orgId)
      const lines = (tna?.needs ?? []).filter(n => n.priority !== 'Low').slice(0, 3).map(n => mk(n.courseId, 10))
      return { ...base, orgId: opp.orgId, oppId: opp.id, lines: lines.length ? lines : [blankLine()], internalNote: `Created from opportunity “${opp.title}” (estimated ${money(opp.value)} excl. VAT).` }
    }
    if (seed?.fromTna) return { ...base, orgId: seed.fromTna.orgId, lines: seed.fromTna.lines.map(l => mk(l.courseId, l.qty)), internalNote: seed.fromTna.note }
    return base
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)
  const [email, setEmail] = useState(false)
  const [msg, setMsg] = useState('')
  const [versionNote, setVersionNote] = useState('')

  if (!existing && !isNew) return <EmptyState title="Quote not found" action={<Link to="/quotes">Back to quotes</Link>} />
  const locked = draft.status === 'Accepted'
  const t = docTotals(draft.lines, draft.discountPct)
  const touch = () => setMsg('')
  const setLine = (i: number, patch: Partial<DocLine>) => { touch(); setDraft(x => ({ ...x, lines: x.lines.map((l, k) => (k === i ? { ...l, ...patch } : l)) })) }
  const validUntil = addDays(draft.issued, draft.validityDays)
  const asDoc = (): DocQuote => ({ ...draft, validUntil, lines: draft.lines, signedBy: ops.quoteMeta[draft.id]?.signedBy, signedAt: ops.quoteMeta[draft.id]?.signedAt })
  const asQuote = (): Quote => ({ id: draft.id, number: draft.number, orgId: draft.orgId, discountPct: Number(draft.discountPct) || 0, venue: draft.venue, instructorId: draft.instructorId,
    status: draft.status, issued: draft.issued, validUntil, lines: draft.lines.map(l => ({ courseId: l.courseId, qty: Number(l.qty), unit: netUnit(Number(l.list), Number(l.disc)) })) })

  const validate = () => {
    const e: Record<string, string> = {}
    if (!draft.orgId) e.orgId = 'Choose a client'
    if (draft.lines.some(l => !l.courseId)) e.lines = 'Every line needs a course'
    else if (draft.lines.some(l => !(l.qty >= 1) || !Number.isInteger(Number(l.qty)))) e.lines = 'Quantity must be a whole number, at least 1'
    else if (draft.lines.some(l => !(l.list >= 0) || l.disc < 0 || l.disc > 100)) e.lines = 'Prices cannot be negative and line discounts must be 0 to 100'
    if (!(draft.discountPct >= 0 && draft.discountPct <= 100)) e.discount = 'Discount must be 0 to 100'
    if (draft.terms.trim().length < 10) e.terms = 'Add terms (10+ characters)'
    setErrors(e); return Object.keys(e).length === 0
  }
  const persist = (label?: string) => {
    if (!validate()) return false
    const q = asQuote(); save(q)
    const prev = ops.quoteMeta[q.id]
    ops.setQuoteMeta(q.id, { ...(prev ?? { lineMeta: [] }), terms: draft.terms, validityDays: draft.validityDays, oppId: draft.oppId, internalNote: draft.internalNote, lineMeta: draft.lines.map(l => ({ list: Number(l.list), disc: Number(l.disc) })) })
    const last = (ops.quoteVersions[q.id] ?? []).slice(-1)[0]
    const total = docTotals(draft.lines, draft.discountPct).total
    if (!last || Math.abs(last.total - total) > 0.005 || label) {
      ops.addQuoteVersion(q.id, { id: uid('v'), at: new Date().toISOString(), by: 'Thandi Mokoena', label: label || versionNote.trim() || (last ? 'Edited' : 'Created'), lines: q.lines, discountPct: q.discountPct, total })
      setVersionNote('')
    }
    setMsg(`Saved at ${new Date().toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}.`)
    return true
  }
  const finishNew = () => { if (isNew) nav(`/quotes/${draft.id}`, { replace: true }) }

  const addBundle = (bid: string) => {
    const b = BUNDLES.find(x => x.id === bid); if (!b) return
    const add = b.items.map(it => { const c = d.courses.find(k => k.code === it.code); return c ? { courseId: c.id, qty: it.qty, list: c.price, disc: 0 } : null }).filter(Boolean) as DocLine[]
    setDraft(x => ({ ...x, lines: [...x.lines.filter(l => l.courseId), ...add] })); touch()
  }
  const versions = [...(ops.quoteVersions[draft.id] ?? [])].reverse()
  const restore = (vi: number) => {
    const v = versions[vi]; if (!v) return
    setDraft(x => ({ ...x, discountPct: v.discountPct, lines: v.lines.map(l => ({ courseId: l.courseId, qty: l.qty, list: l.unit, disc: 0 })) })); setMsg(`Version restored into the editor. Save to keep it.`)
  }
  const contact = d.contacts.find(c => c.orgId === draft.orgId)
  const emailBody = `Hi ${contact?.name.split(' ')[0] ?? 'there'},\n\nPlease find quotation ${draft.number} for ${money(t.total)} including VAT. It is valid until ${fmtDate(validUntil)}.\n\nYou can review and accept it online in your client portal.\n\nKind regards,\nThandi Mokoena\nZimele Technologies`

  return (
    <>
      <PageHeader id="quotes" title={isNew ? 'New quote' : `Quote ${draft.number}`} subtitle={draft.oppId ? 'Linked to an opportunity: sending moves it to Quoted, acceptance marks it Won.' : undefined}
        actions={<><Status s={draft.status} />{!isNew && <ExpiryChip q={{ ...asQuote(), status: draft.status }} />}<Link to="/quotes"><Button>Back to list</Button></Link></>} />
      {locked && <div className="callout" style={{ marginBottom: 16 }}>This quote is accepted and locked. Duplicate it to prepare a revised version.</div>}
      {draft.internalNote && <div className="muted small" style={{ marginBottom: 10 }}>Internal note: {draft.internalNote}</div>}
      <div className="grid c2">
        <Card title="Details">
          <div className="form c2">
            <FSelect label="Client" value={draft.orgId} disabled={locked} onChange={v => { touch(); setDraft({ ...draft, orgId: v }) }} placeholder="Choose a client" error={errors.orgId} options={d.orgs.map(o => ({ value: o.id, label: o.name }))} />
            <FSelect label="Validity" value={String(draft.validityDays)} disabled={locked} onChange={v => { touch(); setDraft({ ...draft, validityDays: Number(v) }) }} options={[14, 30, 60, 90].map(n => ({ value: String(n), label: `${n} days (until ${fmtDate(addDays(draft.issued, n))})` }))} />
            <FText label="Venue" value={draft.venue} disabled={locked} onChange={v => { touch(); setDraft({ ...draft, venue: v }) }} placeholder="e.g. Client site" />
            <FSelect label="Instructor" value={draft.instructorId} disabled={locked} onChange={v => { touch(); setDraft({ ...draft, instructorId: v }) }} placeholder="To be confirmed" options={d.staff.filter(s => s.role === 'instructor').map(s => ({ value: s.id, label: s.name }))} />
            <FText label="Overall discount (%)" type="number" value={draft.discountPct} disabled={locked} onChange={v => { touch(); setDraft({ ...draft, discountPct: Number(v) }) }} error={errors.discount} min={0} max={100} />
            <FText label="Issued" type="date" value={draft.issued} disabled={locked || !isNew} onChange={v => setDraft({ ...draft, issued: v })} />
          </div>
        </Card>
        <Card title="Totals">
          <table className="tbl"><tbody>
            <tr><td>Subtotal</td><td className="num">{money(t.subtotal)}</td></tr>
            <tr><td>Discount ({draft.discountPct || 0}%)</td><td className="num">−{money(t.discount)}</td></tr>
            <tr><td>Net</td><td className="num">{money(t.net)}</td></tr>
            <tr><td>VAT (15%)</td><td className="num">{money(t.vat)}</td></tr>
            <tr><td><b>Total</b></td><td className="num"><b data-testid="quote-total">{money(t.total)}</b></td></tr>
          </tbody></table>
          {draft.orgId && <p className="muted small" style={{ marginBottom: 0 }}>For {orgName(d, draft.orgId)}. Valid until {fmtDate(validUntil)} ({expiry(validUntil, draft.status).label}).</p>}
        </Card>
      </div>

      <Card title="Course lines" actions={<div className="row">
        <Select aria-label="Add a bundle" value="" disabled={locked} onChange={(_, x) => addBundle(x.value)}><option value="">Add a bundle…</option>{BUNDLES.map(b => <option key={b.id} value={b.id}>{b.name}: {b.blurb}</option>)}</Select>
        <Button size="small" disabled={locked} onClick={() => setDraft({ ...draft, lines: [...draft.lines, blankLine()] })}>Add line</Button></div>}>
        {errors.lines && <div className="err" role="alert">{errors.lines}</div>}
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Course</th><th>Qty</th><th>List price (R)</th><th>Line discount (%)</th><th className="num">Amount</th><th /></tr></thead>
          <tbody>{draft.lines.map((l, i) => (
            <tr key={i}>
              <td style={{ minWidth: 250 }}><FSelect label={`Course for line ${i + 1}`} value={l.courseId} disabled={locked} placeholder="Choose a course" onChange={v => setLine(i, { courseId: v, list: d.courses.find(c => c.id === v)?.price ?? 0 })} options={d.courses.map(c => ({ value: c.id, label: `${c.code} ${c.title}` }))} /></td>
              <td style={{ width: 90 }}><FText label={`Quantity for line ${i + 1}`} type="number" min={1} value={l.qty} disabled={locked} onChange={v => setLine(i, { qty: Number(v) })} /></td>
              <td style={{ width: 130 }}><FText label={`List price for line ${i + 1}`} type="number" min={0} value={l.list} disabled={locked} onChange={v => setLine(i, { list: Number(v) })} /></td>
              <td style={{ width: 120 }}><FText label={`Line discount for line ${i + 1}`} type="number" min={0} max={100} value={l.disc} disabled={locked} onChange={v => setLine(i, { disc: Number(v) })} /></td>
              <td className="num">{money(l.qty * netUnit(l.list, l.disc))}</td>
              <td className="row" style={{ flexWrap: 'nowrap', gap: 4 }}>
                <Button size="small" appearance="subtle" disabled={locked} onClick={() => setDraft({ ...draft, lines: [...draft.lines.slice(0, i + 1), { ...l }, ...draft.lines.slice(i + 1)] })} aria-label={`Duplicate line ${i + 1}`}>Copy</Button>
                <Button size="small" appearance="subtle" disabled={locked || draft.lines.length === 1} onClick={() => setDraft({ ...draft, lines: draft.lines.filter((_, x) => x !== i) })} aria-label={`Remove line ${i + 1}`}>Remove</Button>
              </td>
            </tr>
          ))}</tbody>
        </table></div>
      </Card>

      <Card title="Terms and conditions">
        <FArea label="Terms printed on the quote" value={draft.terms} onChange={v => { touch(); setDraft({ ...draft, terms: v }) }} rows={3} error={errors.terms} />
        <div className="row" style={{ marginTop: 8 }}>
          <Button size="small" appearance="subtle" disabled={locked} onClick={() => setDraft({ ...draft, terms: DEFAULT_TERMS })}>Reset to standard terms</Button>
        </div>
      </Card>

      <div className="row" style={{ marginBottom: 20 }}>
        {!locked && <FText label="Version note (optional)" value={versionNote} onChange={setVersionNote} placeholder="What changed?" />}
        <Button appearance="primary" disabled={locked} onClick={() => { if (persist()) finishNew() }}>Save quote</Button>
        <Button onClick={() => validate() && setPreview(true)}>Preview and print</Button>
        {!locked && draft.status !== 'Expired' && <Button onClick={() => { if (persist('Sent to client')) { sendQuote({ ...asQuote(), status: 'Draft' }); setDraft(x => ({ ...x, status: 'Sent' })); setEmail(true); finishNew() } }}>{draft.status === 'Sent' ? 'Resend to client' : 'Send to client'}</Button>}
        {!isNew && <Button onClick={() => nav(`/quotes/${duplicateQuote(asQuote())}`)}>Duplicate quote</Button>}
        {!isNew && draft.status === 'Sent' && <Button onClick={() => { acceptQuote(asQuote()); setDraft({ ...draft, status: 'Accepted' }) }}>Mark as accepted</Button>}
        {!isNew && draft.status === 'Sent' && <Button onClick={() => { setStatus(draft.id, 'Expired'); setDraft({ ...draft, status: 'Expired' }) }}>Mark as expired</Button>}
        {!isNew && draft.status === 'Expired' && <Button onClick={() => { extendQuote(asQuote()); setDraft({ ...draft, status: 'Sent', validityDays: 30, issued: today() }) }}>Reissue for 30 days</Button>}
        {msg && <span role="status" className="muted">{msg}</span>}
      </div>

      <Card title={`Version history (${versions.length})`}>
        {versions.length === 0 ? <EmptyState title="No versions yet" text="A version is recorded each time you save changes that alter the total." /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Version</th><th>When</th><th>By</th><th>Change</th><th className="num">Total (incl. VAT)</th><th /></tr></thead>
            <tbody>{versions.map((v, i) => (
              <tr key={v.id}><td>v{versions.length - i}</td><td>{fmtDateTime(v.at)}</td><td>{v.by}</td><td>{v.label}</td><td className="num">{money(v.total)}</td>
                <td>{!locked && i > 0 && <Button size="small" appearance="subtle" onClick={() => restore(i)}>Restore</Button>}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>

      <QuoteDocModal open={preview} onClose={() => setPreview(false)} q={asDoc()} d={d} />
      <EmailPreview open={email} onClose={() => setEmail(false)} to={contact?.email ?? 'client@example.test'} subject={`Quotation ${draft.number} from Zimele Technologies`} body={emailBody} />
    </>
  )
}
