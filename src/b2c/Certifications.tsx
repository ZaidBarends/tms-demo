import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Switch } from '@fluentui/react-components'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState, Modal } from '../shared/ui'
import { daysBetween, fmtDate, money, today } from '../shared/format'
import { CertificateModal, QrBlock, verifyCode, verifyUrl, type CertProps } from '../lms/CertificateView'
import { copyText } from '../lms/csv'
import type { Certificate } from '../shared/types'
import './b2c.css'

const status = (left: number | null) => left === null ? { label: 'Does not expire', cls: '' } : left < 0 ? { label: 'Expired', cls: 'bad' } : left < 60 ? { label: `Expires in ${left} days`, cls: 'bad' } : left < 180 ? { label: `Renew soon · ${left} days`, cls: 'warn' } : { label: `Valid · ${left} days`, cls: '' }

export function Certifications() {
  const d = useStore(s => s.data)
  const { learnerId, learner } = useCtx()
  const nav = useNavigate()
  const [share, setShare] = useState<Certificate | null>(null)
  const [view, setView] = useState<CertProps | null>(null)
  const [renew, setRenew] = useState<Certificate | null>(null)
  const certs = d.certificates.filter(c => c.learnerId === learnerId)
  const title = (id: string) => d.courses.find(c => c.id === id)?.title ?? ''
  const props = (c: Certificate): CertProps => ({ name: learner?.name ?? '', course: title(c.courseId), id: c.id, issued: c.issued, expires: c.expires, hours: d.courses.find(x => x.id === c.courseId)?.hours })
  const expiring = certs.filter(c => c.expires).sort((a, b) => a.expires!.localeCompare(b.expires!))
  const RANGE = 365 * 3; const pos = (days: number) => Math.max(1, Math.min(99, ((days + 365) / RANGE) * 100))

  return (
    <>
      <PageHeader id="certifications" title="Certifications" subtitle="Your certificates, expiry timeline, renewals and shareable credentials" />
      <Card title="Expiry timeline" actions={<span className="muted small">12 months back to 24 months ahead</span>}>
        {expiring.length === 0 ? <EmptyState title="Nothing expires" text="Your certificates do not have an expiry date, or you do not have any yet." /> : (
          <div className="b2c-tl" role="img" aria-label={`Timeline of ${expiring.length} expiring certificates`}>
            <div className="b2c-tl-axis" />
            <div className="b2c-tl-today" style={{ left: `${pos(0)}%` }}><span>Today</span></div>
            {[0, 6, 12, 18, 24].map(m => <div key={m} className="b2c-tl-tick" style={{ left: `${pos(m * 30.4)}%` }}><span>{m === 0 ? '' : `+${m}m`}</span></div>)}
            {expiring.map((c, i) => { const left = daysBetween(today(), c.expires!); const st = status(left)
              return <div key={c.id} className={`b2c-tl-pin ${st.cls}`} style={{ left: `${pos(left)}%`, top: 38 + (i % 3) * 34 }} title={`${title(c.courseId)} · ${fmtDate(c.expires)}`}><i /><span>{title(c.courseId)}</span></div> })}
          </div>
        )}
      </Card>
      <Card title="My certificates">
        {certs.length === 0 ? <EmptyState title="No certificates yet" text="Complete a course to earn your first." action={<Link to="/my-learning">Go to My learning</Link>} /> : (
          <div className="b2c-certs">{certs.map(c => {
            const left = c.expires ? daysBetween(today(), c.expires) : null; const st = status(left); const course = d.courses.find(x => x.id === c.courseId)
            return (
              <div key={c.id} className="b2c-certcard">
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div><b>{title(c.courseId)}</b><div className="small muted">{c.id} · issued {fmtDate(c.issued)}</div><div className="small">{c.expires ? `Expires ${fmtDate(c.expires)}` : 'Does not expire'}</div></div>
                  <span className={`lms-pill ${st.cls}`}>{st.label}</span>
                </div>
                <div className="row" style={{ marginTop: 10, gap: 8 }}>
                  <Button size="small" onClick={() => setView(props(c))}>View</Button>
                  <Button size="small" onClick={() => setShare(c)}>Share credential</Button>
                  {left !== null && left < 180 && <Button size="small" appearance="primary" onClick={() => setRenew(c)}>Renew</Button>}
                  {left === null && course && <span className="small muted">Valid for life</span>}
                </div>
              </div>
            )
          })}</div>
        )}
      </Card>

      <ShareModal cert={share} onClose={() => setShare(null)} name={learner?.name ?? ''} course={share ? title(share.courseId) : ''} />
      <CertificateModal open={!!view} onClose={() => setView(null)} cert={view} />
      <Modal open={!!renew} onClose={() => setRenew(null)} title="Renew your certification" actions={<Button appearance="primary" onClick={() => { const c = renew!; setRenew(null); nav(`/checkout/${c.courseId}?renew=${c.id}`) }}>Continue to checkout</Button>}>
        {renew && <>
          <p>To renew <b>{title(renew.courseId)}</b> you retake the course and pass the knowledge check. A new certificate with a fresh two-year expiry is issued and your old one stays on record.</p>
          <table className="tbl"><tbody><tr><td>Current expiry</td><td>{fmtDate(renew.expires)}</td></tr><tr><td>Renewal price</td><td><b>{money((d.courses.find(c => c.id === renew.courseId)?.price ?? 0) * 1.15)}</b> incl. VAT</td></tr></tbody></table>
          <p className="muted small">Tip: use coupon WELCOME10 or DEMO15 at checkout to try a discount.</p>
        </>}
      </Modal>
    </>
  )
}

function ShareModal({ cert, onClose, name, course }: { cert: Certificate | null; onClose: () => void; name: string; course: string }) {
  const [pub, setPub] = useState(true)
  const [copied, setCopied] = useState(false)
  const [added, setAdded] = useState(false)
  if (!cert) return null
  const url = verifyUrl(cert.id)
  return (
    <Modal open onClose={() => { setCopied(false); setAdded(false); onClose() }} title="Share your credential">
      <div className="b2c-li">
        <div className="b2c-li-band" />
        <div className="b2c-li-body">
          <div className="b2c-li-av">{name.split(' ').map(x => x[0]).join('').slice(0, 2)}</div>
          <b>{name}</b>
          <div className="small muted">Licences and certifications</div>
          <div className="b2c-li-cert">
            <QrBlock code={cert.id} size={56} />
            <div><b>{course}</b><div className="small">TrainCo Learning Academy</div><div className="small muted">Issued {fmtDate(cert.issued)}{cert.expires ? ` · Expires ${fmtDate(cert.expires)}` : ''}</div><div className="small muted">Credential ID {cert.id} · Code {verifyCode(cert.id)}</div></div>
          </div>
          <Button size="small" appearance={added ? 'secondary' : 'primary'} onClick={() => setAdded(true)}>{added ? 'Added to profile (preview)' : 'Add to profile'}</Button>
        </div>
      </div>
      <p className="small muted">LinkedIn-style preview. Nothing is posted anywhere in this demo.</p>
      <Switch label="Anyone with the link can verify this credential" checked={pub} onChange={(_, x) => setPub(x.checked)} />
      <div className="row" style={{ marginTop: 8 }}>
        <input className="b2c-input" readOnly value={pub ? url : 'Verification link is switched off'} aria-label="Credential link" style={{ flex: 1 }} />
        <Button disabled={!pub} onClick={async () => setCopied(await copyText(url))}>{copied ? 'Copied' : 'Copy link'}</Button>
      </div>
    </Modal>
  )
}
