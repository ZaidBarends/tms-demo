import { Button } from '@fluentui/react-components'
import { Modal } from '../../shared/ui'
import { useStore } from '../../shared/store'
import { clientName } from '../../shared/calc'
import { fmtDate, money, VAT_RATE } from '../../shared/format'
import { useSettings } from '../../admin/settingsStore'
import { invoiceLines } from './calc'
import { recipientFor } from './actions'
import './money.css'

export default function InvoiceDoc({ number, onClose }: { number: string | null; onClose: () => void }) {
  const d = useStore(s => s.data)
  const s = useSettings(x => x.settings)
  const inv = number ? d.invoices.find(i => i.number === number) : undefined
  if (!inv) return <Modal open={false} onClose={onClose} title="Tax invoice">{null}</Modal>
  const lines = invoiceLines(inv)
  const sub = inv.amount, vat = sub * VAT_RATE, total = sub + vat, credit = inv.creditNote ?? 0
  const balance = inv.status === 'Paid' ? 0 : total - credit
  const to = recipientFor(d, inv)
  return (
    <Modal open onClose={onClose} title={`Tax invoice ${inv.number}`} wide actions={<Button appearance="primary" onClick={() => window.print()}>Print</Button>}>
      <div className="doc mny-print" aria-label={`Invoice ${inv.number}`}>
        <div className="mny-doc-head" style={{ borderBottomColor: s.branding.primary }}>
          <div>
            <h2 style={{ color: s.branding.primary }}><span className="mny-doc-logo" style={{ background: s.branding.primary }}>{s.profile.name.slice(0, 1)}</span>{s.profile.tradingAs}</h2>
            <div style={{ fontSize: 12 }}>{s.profile.name}<br />{s.profile.address}<br />{s.profile.phone} · {s.profile.email}<br />Reg no {s.profile.regNo} · VAT no {s.profile.vatNo}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.branding.primary }}>TAX INVOICE</div>
            <div><b>{inv.number}</b></div>
            <div style={{ fontSize: 12 }}>Issued {fmtDate(inv.issued)}<br />Due {fmtDate(inv.due)}<br />{inv.status === 'Paid' ? `Paid ${fmtDate(inv.paidOn)}` : inv.status}</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
          <div><div style={{ fontSize: 11, color: '#666' }}>BILL TO</div><b>{clientName(d, inv)}</b><br />Attention: {to.name}<br />{to.email}</div>
          <div style={{ fontSize: 12 }}>Reference: {inv.number}<br />Payment terms: {s.numbering.paymentTermsDays} days</div>
        </div>
        <table>
          <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
          <tbody>{lines.map((l, i) => <tr key={i}><td>{l.description}</td><td className="num">{l.qty}</td><td className="num">{money(l.unit)}</td><td className="num">{money(l.qty * l.unit)}</td></tr>)}</tbody>
          <tfoot>
            <tr><td colSpan={3} className="num">Subtotal (excl. VAT)</td><td className="num">{money(sub)}</td></tr>
            <tr><td colSpan={3} className="num">VAT at {Math.round(VAT_RATE * 100)}%</td><td className="num">{money(vat)}</td></tr>
            <tr><td colSpan={3} className="num"><b>Total (incl. VAT)</b></td><td className="num"><b>{money(total)}</b></td></tr>
            {credit > 0 && <tr><td colSpan={3} className="num">Less credit notes</td><td className="num">−{money(credit)}</td></tr>}
            <tr><td colSpan={3} className="num"><b>{inv.status === 'Paid' ? 'Balance (paid in full)' : 'Balance due'}</b></td><td className="num"><b>{money(balance)}</b></td></tr>
          </tfoot>
        </table>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 12, background: '#f4f7fb', padding: 12, borderRadius: 4 }}>
          <div><b>Banking details</b><br />{s.banking.bank} · {s.banking.accountType}<br />Account name: {s.banking.accountName}<br />Account no: {s.banking.accountNo} · Branch code: {s.banking.branch}<br />Reference: {inv.number}</div>
          <div style={{ flex: 1, minWidth: 180 }}><b>Notes</b><br />{s.branding.letterhead}. Please use the invoice number as your payment reference. Demo document only.</div>
        </div>
      </div>
    </Modal>
  )
}
