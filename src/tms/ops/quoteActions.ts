import { useStore } from '../../shared/store'
import { addDays, today, totals } from '../../shared/format'
import type { Data, Quote } from '../../shared/types'
import { DEFAULT_TERMS, uid, useOps, type QuoteMeta } from './opsStore'
import type { DocQuote } from './QuoteDoc'
import { moveStage } from './mutate'

export const BUNDLES: { id: string; name: string; blurb: string; items: { code: string; qty: number }[] }[] = [
  { id: 'b1', name: 'Safety starter', blurb: 'H&S essentials plus first aid for a depot', items: [{ code: 'HSE-101', qty: 20 }, { code: 'HSE-220', qty: 10 }] },
  { id: 'b2', name: 'New supervisor pack', blurb: 'Supervisor foundations with communication and time management', items: [{ code: 'LDR-310', qty: 10 }, { code: 'SFT-101', qty: 10 }, { code: 'SFT-140', qty: 10 }] },
  { id: 'b3', name: 'Digital trust bundle', blurb: 'Cybersecurity and POPIA awareness for all staff', items: [{ code: 'CYB-110', qty: 40 }, { code: 'POP-120', qty: 40 }] },
  { id: 'b4', name: 'Finance for managers', blurb: 'Finance and budgeting for budget holders', items: [{ code: 'FIN-201', qty: 15 }, { code: 'FIN-230', qty: 15 }] },
]

export function nextQuoteNumber(d: Data): string {
  const max = d.quotes.reduce((a, q) => Math.max(a, Number(q.number.split('-').pop()) || 0), 10)
  return `Q-2026-${String(max + 1).padStart(3, '0')}`
}

export function metaFor(q: Quote, m?: QuoteMeta): QuoteMeta {
  const base: QuoteMeta = m ?? { terms: DEFAULT_TERMS, validityDays: 30, lineMeta: [] }
  return { ...base, lineMeta: q.lines.map((l, i) => base.lineMeta[i] ?? { list: l.unit, disc: 0 }) }
}

export function toDocQuote(q: Quote, m?: QuoteMeta): DocQuote {
  const meta = metaFor(q, m)
  return {
    number: q.number, orgId: q.orgId, issued: q.issued, validUntil: q.validUntil, discountPct: q.discountPct, venue: q.venue,
    instructorId: q.instructorId, status: q.status, terms: meta.terms, signedBy: meta.signedBy, signedAt: meta.signedAt,
    lines: q.lines.map((l, i) => ({ courseId: l.courseId, qty: l.qty, list: meta.lineMeta[i].list, disc: meta.lineMeta[i].disc })),
  }
}

export const quoteTotals = (q: Quote) => totals(q.lines, q.discountPct)

export function sendQuote(q: Quote) {
  const st = useStore.getState()
  st.setQuoteStatus(q.id, 'Sent')
  const ops = useOps.getState()
  const meta = metaFor(q, ops.quoteMeta[q.id]); ops.setQuoteMeta(q.id, { ...meta, sentAt: today() })
  if (meta.oppId) {
    const o = st.data.opportunities.find(x => x.id === meta.oppId)
    if (o && (o.stage === 'enquiry' || o.stage === 'needs')) moveStage(o.id, 'quoted')
  }
}

export function acceptQuote(q: Quote, signedBy?: string) {
  const st = useStore.getState(); const ops = useOps.getState()
  st.setQuoteStatus(q.id, 'Accepted')
  const meta = metaFor(q, ops.quoteMeta[q.id])
  ops.setQuoteMeta(q.id, { ...meta, signedBy: signedBy ?? meta.signedBy, signedAt: new Date().toISOString() })
  if (signedBy) st.log(`Quote ${q.number} e-signed by ${signedBy}`)
  if (meta.oppId) moveStage(meta.oppId, 'won', 'Quote accepted by client')
}

export function extendQuote(q: Quote) {
  const st = useStore.getState()
  st.saveQuote({ ...q, validUntil: addDays(today(), 30), status: 'Sent' })
  st.log(`Quote ${q.number} validity extended by 30 days`)
}

export function duplicateQuote(q: Quote): string {
  const st = useStore.getState(); const ops = useOps.getState()
  const id = uid('q'); const number = nextQuoteNumber(st.data)
  const meta = metaFor(q, ops.quoteMeta[q.id])
  const copy: Quote = { ...structuredClone(q), id, number, status: 'Draft', issued: today(), validUntil: addDays(today(), meta.validityDays) }
  st.saveQuote(copy)
  ops.setQuoteMeta(id, { terms: meta.terms, validityDays: meta.validityDays, lineMeta: meta.lineMeta.map(x => ({ ...x })), internalNote: `Duplicated from ${q.number}` })
  st.log(`Quote ${q.number} duplicated as ${number}`)
  return id
}
