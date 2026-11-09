import logoUrl from '../../assets/zimele-logo.png'
import type { ReactNode } from 'react'
import { Button } from '@fluentui/react-components'
import { Modal } from '../../shared/ui'
import { fmtDate, fmtDateTime, money, totals } from '../../shared/format'
import type { Data } from '../../shared/types'
import { netUnit } from './logic'
import { printPage } from './download'

export interface DocLine { courseId: string; qty: number; list: number; disc: number }
export interface DocQuote {
  number: string; orgId: string; issued: string; validUntil: string; discountPct: number; venue: string; instructorId: string
  status: string; lines: DocLine[]; terms: string; signedBy?: string; signedAt?: string
}

export const docTotals = (lines: DocLine[], discountPct: number) => totals(lines.map(l => ({ qty: l.qty, unit: netUnit(l.list, l.disc) })), discountPct)

export function QuoteDoc({ q, d }: { q: DocQuote; d: Data }) {
  const t = docTotals(q.lines, q.discountPct)
  const org = d.orgs.find(o => o.id === q.orgId)
  const contact = d.contacts.find(c => c.orgId === q.orgId)
  const inst = d.staff.find(s => s.id === q.instructorId)
  const anyLineDisc = q.lines.some(l => l.disc > 0)
  return (
    <div className="ops-doc ops-print-area" aria-label={`Quotation ${q.number}`}>
      <div className="ops-doc-head">
        <div className="ops-doc-brand">
          <img className="ops-doc-logo" src={logoUrl} alt="" />
          <div><b style={{ fontSize: 18, color: '#2c3d1d' }}>Zimele Technologies</b><div className="small">Professional training and development</div></div>
        </div>
        <div className="small" style={{ textAlign: 'right' }}>
          Building 11, Stanford Office Park, 12 Bauhinia Street, Highveld, Centurion, 0169<br />Tel 086 999 0229 · accounts@zimeletechnologies.com<br />Reg. 2014/118822/07 · VAT no. 4410298765
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <h2>Quotation {q.number}</h2>
          <div className="small">Issued {fmtDate(q.issued)} · Valid until {fmtDate(q.validUntil)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          {q.status === 'Accepted' && <span className="ops-stamp">ACCEPTED</span>}
          {q.status === 'Expired' && <span className="ops-stamp" style={{ borderColor: '#d13438', color: '#d13438' }}>EXPIRED</span>}
        </div>
      </div>
      <h4>Prepared for</h4>
      <div><b>{org?.name ?? '—'}</b>{org ? `, ${org.city}` : ''}<br />{contact ? <>Attention: {contact.name}, {contact.title}<br /><span className="small">{contact.email}</span></> : null}</div>

      <table>
        <thead><tr><th>Course</th><th className="num">Qty</th><th className="num">List price</th>{anyLineDisc && <th className="num">Line disc.</th>}<th className="num">Amount</th></tr></thead>
        <tbody>{q.lines.map((l, i) => {
          const c = d.courses.find(x => x.id === l.courseId)
          return (
            <tr key={i}>
              <td><b>{c?.title ?? '—'}</b><div className="small">{c?.code} · {c?.hours} hours per cohort</div></td>
              <td className="num">{l.qty}</td><td className="num">{money(l.list)}</td>{anyLineDisc && <td className="num">{l.disc ? `${l.disc}%` : '–'}</td>}
              <td className="num">{money(l.qty * netUnit(l.list, l.disc))}</td>
            </tr>
          )
        })}</tbody>
      </table>
      <table className="totals"><tbody>
        <tr><td>Subtotal</td><td className="num">{money(t.subtotal)}</td></tr>
        <tr><td>Discount ({q.discountPct || 0}%)</td><td className="num">−{money(t.discount)}</td></tr>
        <tr><td>Net amount</td><td className="num">{money(t.net)}</td></tr>
        <tr><td>VAT (15%)</td><td className="num">{money(t.vat)}</td></tr>
        <tr className="grand"><td>Total due</td><td className="num">{money(t.total)}</td></tr>
      </tbody></table>

      <h4>Delivery</h4>
      <div>Venue: {q.venue || 'To be confirmed'}<br />Instructor: {inst?.name ?? 'To be confirmed'}</div>
      <h4>Terms and conditions</h4>
      <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{q.terms}</div>

      <div className="ops-sign">
        <div>{q.signedBy ? <><span className="ops-sig-name">{q.signedBy}</span><br /></> : <><br /><br /></>}Accepted for {org?.name ?? 'client'}{q.signedAt ? ` · ${fmtDateTime(q.signedAt)}` : ''}</div>
        <div><br /><br />For Zimele Technologies · Thandi Mokoena, Training manager</div>
      </div>
    </div>
  )
}

export function QuoteDocModal({ open, onClose, q, d, extra }: { open: boolean; onClose: () => void; q: DocQuote; d: Data; extra?: ReactNode }) {
  return (
    <Modal open={open} onClose={onClose} title="Quote document" wide actions={<>{extra}<Button appearance="primary" onClick={printPage}>Print</Button></>}>
      <QuoteDoc q={q} d={d} />
    </Modal>
  )
}
