import { Button } from '@fluentui/react-components'
import { Modal } from '../shared/ui'
import { fmtDate } from '../shared/format'
import { hashOf } from './gamify'
import './lms.css'

export const verifyUrl = (id: string) => `https://credentials.trainco.example/verify/${id}`
export const verifyCode = (id: string) => { const h = hashOf(id).toString(36).toUpperCase().padStart(8, '0').slice(0, 8); return `${h.slice(0, 4)}-${h.slice(4)}` }

/** Print the element(s) marked .lms-print. Everything else is hidden by the print stylesheet. */
export function printNow() {
  if (typeof window === 'undefined') return
  const root = document.documentElement
  root.classList.add('lms-printing')
  const off = () => { root.classList.remove('lms-printing'); window.removeEventListener('afterprint', off) }
  window.addEventListener('afterprint', off)
  try { window.print() } catch { off() }
  setTimeout(off, 4000)
}

/** A QR-like block drawn from a hash of the code. Decorative: it is not a scannable code. */
export function QrBlock({ code, size = 96 }: { code: string; size?: number }) {
  const n = 21; let seed = hashOf(code)
  const rnd = () => { seed ^= seed << 13; seed >>>= 0; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0; return seed / 4294967296 }
  const finder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
  const cells: JSX.Element[] = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (finder(x, y)) continue
    if (rnd() > 0.5) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)
  }
  const eye = (x: number, y: number) => (
    <g key={`e${x}${y}`}><rect x={x} y={y} width="7" height="7" /><rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" /><rect x={x + 2} y={y + 2} width="3" height="3" /></g>
  )
  return (
    <svg width={size} height={size} viewBox={`-1 -1 ${n + 2} ${n + 2}`} role="img" aria-label={`Verification code ${verifyCode(code)}`} shapeRendering="crispEdges" style={{ background: '#fff', borderRadius: 4 }}>
      <g fill="#0b3a66">{cells}{eye(0, 0)}{eye(n - 7, 0)}{eye(0, n - 7)}</g>
    </svg>
  )
}

export interface CertProps { name: string; course: string; id: string; issued: string; expires?: string; score?: number; hours?: number }

export function CertificateDoc({ name, course, id, issued, expires, score, hours }: CertProps) {
  return (
    <div className="lms-cert lms-print" role="region" aria-label={`Certificate ${id}`}>
      <div className="lms-cert-inner">
        <svg className="lms-cert-seal" width="84" height="84" viewBox="0 0 84 84" aria-hidden>
          <circle cx="42" cy="42" r="38" fill="#0f6cbd" /><circle cx="42" cy="42" r="31" fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="3 3" />
          <path d="M42 22l5.5 11.5 12.5 1.6-9.2 8.6 2.4 12.4L42 49.8 30.8 56l2.4-12.4L24 35l12.5-1.5z" fill="#fff" />
        </svg>
        <div className="lms-cert-kicker">TrainCo Learning Academy</div>
        <h2 className="lms-cert-title">Certificate of completion</h2>
        <div className="lms-cert-sub">This is to certify that</div>
        <div className="lms-cert-name">{name}</div>
        <div className="lms-cert-sub">has successfully completed</div>
        <div className="lms-cert-course">{course}</div>
        <div className="lms-cert-meta">
          <span>Issued {fmtDate(issued)}</span>
          {expires ? <span>Valid until {fmtDate(expires)}</span> : <span>No expiry</span>}
          {hours ? <span>{hours} learning hours</span> : null}
          {score !== undefined ? <span>Result {score}%</span> : null}
        </div>
        <div className="lms-cert-foot">
          <div className="lms-cert-sign"><div className="lms-cert-line" /><span>Thandi Mokoena</span><small>Training manager</small></div>
          <div className="lms-cert-verify">
            <QrBlock code={id} size={84} />
            <div><small>Certificate</small><b>{id}</b><small>Verification code</small><b>{verifyCode(id)}</b></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function CertificateModal({ open, onClose, cert }: { open: boolean; onClose: () => void; cert: CertProps | null }) {
  return (
    <Modal open={open} onClose={onClose} title="Certificate" wide actions={<Button appearance="primary" onClick={printNow}>Print / Save as PDF</Button>}>
      {cert && <CertificateDoc {...cert} />}
      <p className="muted small">Use Print and choose “Save as PDF” to keep a copy. The QR-style block is decorative in this demo.</p>
    </Modal>
  )
}
