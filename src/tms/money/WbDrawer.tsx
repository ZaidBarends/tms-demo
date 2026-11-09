import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Status } from '../../shared/ui'
import { clientName, invTotal } from '../../shared/calc'
import { fmtDateTime, VAT_RATE } from '../../shared/format'
import { SideDrawer, Timeline } from './ui'
import { useMoney } from './store'
import { resendWb } from './actions'
import { invoiceLines } from './calc'
import type { Data, Invoice } from '../../shared/types'

export function wbPayload(d: Data, i: Invoice) {
  const org = d.orgs.find(o => o.id === i.orgId)
  const lines = invoiceLines(i)
  return {
    documentType: 'SalesInvoice',
    documentNumber: i.number,
    customer: { code: i.orgId ? `CUS-${i.orgId.slice(1).padStart(4, '0')}` : `CUS-B2C-${(i.learnerId ?? '').slice(1).padStart(3, '0')}`, name: clientName(d, i), city: org?.city ?? null },
    documentDate: i.issued, dueDate: i.due, currency: 'ZAR', reference: i.description,
    lines: lines.map((l, n) => ({ line: n + 1, description: l.description, quantity: l.qty, unitPrice: l.unit, vatCode: 'S', vatRate: VAT_RATE })),
    totals: { exclusive: i.amount, vat: Math.round(i.amount * VAT_RATE * 100) / 100, creditNotes: i.creditNote ?? 0, inclusiveNet: Math.round(invTotal(i) * 100) / 100 },
    source: 'training-system-demo',
  }
}

export default function WbDrawer({ number, onClose }: { number: string | null; onClose: () => void }) {
  const d = useStore(s => s.data)
  const attempts = useMoney(s => s.attempts)
  const inv = number ? d.invoices.find(i => i.number === number) : undefined
  if (!inv) return <SideDrawer open={false} onClose={onClose} title="">{null}</SideDrawer>
  const mine = attempts.filter(a => a.number === inv.number).sort((a, b) => a.at.localeCompare(b.at))
  const json = JSON.stringify(wbPayload(d, inv), null, 2)
  return (
    <SideDrawer open onClose={onClose} size="large" title={<>{inv.number} <Status s={inv.wb} /></>} subtitle={`${clientName(d, inv)} · outbound record`}>
      {inv.wb === 'Failed' && (
        <div className="callout" role="alert" style={{ borderLeftColor: '#c50f1f', marginBottom: 12 }}>
          <b>Last error:</b> {inv.wbError ?? 'Rejected'}. Create the customer in Workbook (or fix the customer code), then resend.
        </div>
      )}
      <div className="row" style={{ marginBottom: 14 }}>
        {inv.wb === 'Failed' && <Button appearance="primary" onClick={() => resendWb(inv.number)}>Resend {inv.number}</Button>}
        <Button onClick={() => { try { void navigator.clipboard.writeText(json) } catch { /* clipboard unavailable */ } }}>Copy payload</Button>
      </div>
      <h3 className="card-title" style={{ marginBottom: 8 }}>Payload sent to Workbook</h3>
      <pre className="mny-json" tabIndex={0} aria-label="Mock JSON payload">{json}</pre>
      <h3 className="card-title" style={{ margin: '18px 0 10px' }}>Attempt history ({mine.length})</h3>
      {mine.length === 0 ? <p className="muted">No attempts recorded.</p> : (
        <Timeline items={mine.map(a => ({ id: a.id, at: a.at, text: `${a.kind} · ${a.result}`, tone: a.result === 'Success' ? 'ok' : a.result === 'Failed' ? 'bad' : 'warn', meta: `${fmtDateTime(a.at)} · ${a.message}` }))} />
      )}
    </SideDrawer>
  )
}
