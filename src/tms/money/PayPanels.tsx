import { money } from '../../shared/format'
import type { Processor } from './store'

/** How the demo labels the three ways to pay, and who notifies the platform for each. */
export type PayMethod = 'Card' | 'SnapScan' | 'EFT'
export const METHOD_LABEL: Record<PayMethod, string> = { Card: 'Card (PayGate)', SnapScan: 'SnapScan', EFT: 'Bank transfer (EFT)' }
export const PROCESSOR_OF: Record<PayMethod, Processor> = { Card: 'PayGate', SnapScan: 'SnapScan', EFT: 'Bank transfer' }

/** A stand-in QR code drawn from the reference, so each invoice shows a different picture. Not scannable. */
export function FakeQr({ value, size = 168 }: { value: string; size?: number }) {
  const n = 25
  let h = 2166136261
  for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0
  const rnd = () => { h = (Math.imul(h, 1664525) + 1013904223) >>> 0; return h / 4294967296 }
  const finder = (x: number, y: number) => [[0, 0], [n - 7, 0], [0, n - 7]].some(([fx, fy]) => x >= fx - 1 && x <= fx + 7 && y >= fy - 1 && y <= fy + 7)
  const cells: JSX.Element[] = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!finder(x, y) && rnd() > 0.52) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />)
  const eye = (x: number, y: number) => (
    <g key={`e${x}${y}`}><rect x={x} y={y} width={7} height={7} /><rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" /><rect x={x + 2} y={y + 2} width={3} height={3} /></g>
  )
  return (
    <svg role="img" aria-label={`Demo QR code for ${value}`} width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} style={{ background: '#fff', borderRadius: 6, border: '1px solid #d0d7de' }} fill="#111">
      {cells}{eye(0, 0)}{eye(n - 7, 0)}{eye(0, n - 7)}
    </svg>
  )
}

export function PayGateNote() {
  return (
    <div className="callout" style={{ marginBottom: 10 }}>
      <b>PayGate secure payment page (simulated)</b>
      <div className="small" style={{ marginTop: 4 }}>On the live site you are sent to PayGate's own page, so card details never reach this platform. Here the card fields stand in for that page and nothing is charged.</div>
    </div>
  )
}

export function SnapScanPanel({ reference, amount }: { reference: string; amount: number }) {
  return (
    <div className="callout" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      <FakeQr value={reference} />
      <div>
        <b>Pay with SnapScan</b>
        <table className="tbl" style={{ marginTop: 6 }}><tbody>
          <tr><td>Reference</td><td><b>{reference}</b> (the invoice number)</td></tr>
          <tr><td>Amount</td><td><b>{money(amount)}</b></td></tr>
        </tbody></table>
        <div className="small" style={{ marginTop: 6 }}>Scan the code in the SnapScan app, or open the link on your phone. SnapScan tells us when it is paid and sends the reference back, so the payment lands on this invoice. In this demo, press the button to simulate scanning and paying.</div>
      </div>
    </div>
  )
}

export function EftPanel({ reference, amount, hold }: { reference: string; amount: number; hold?: string }) {
  return (
    <div className="callout">
      <b>Pay by bank transfer (EFT)</b>
      <table className="tbl" style={{ marginTop: 6 }}><tbody>
        <tr><td>Bank</td><td>Demo Bank</td></tr><tr><td>Account</td><td>000 000 000 (cheque)</td></tr><tr><td>Branch code</td><td>000000</td></tr>
        <tr><td>Reference</td><td><b>{reference}</b> (the invoice number: use it exactly)</td></tr><tr><td>Amount</td><td><b>{money(amount)}</b></td></tr>
      </tbody></table>
      <div className="small" style={{ marginTop: 6 }}>{hold ?? 'Finance confirms the payment from the bank record in Workbook, using the invoice number as the reference.'} In this demo, press the button to simulate the payment arriving.</div>
    </div>
  )
}
