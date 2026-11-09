import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmptyState, Modal, Status } from '../../shared/ui'
import { FArea } from '../../shared/fields'
import { fmtDate } from '../../shared/format'
import { useTalent } from '../talentStore'
import type { Application } from '../talentTypes'

export function Approvals() {
  const d = useStore(s => s.data)
  const T = useTalent()
  const [review, setReview] = useState<Application | null>(null)
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  // For linked recruiters the main store is the source of truth for "approved".
  const statusOf = (a: Application): Application['status'] => {
    if (!a.linkedId) return a.status
    const r = d.recruiters.find(x => x.id === a.linkedId)
    return r?.approved ? 'Approved' : a.status === 'Rejected' ? 'Rejected' : 'Pending'
  }
  const pending = T.applications.filter(a => statusOf(a) === 'Pending')
  const decided = T.applications.filter(a => statusOf(a) !== 'Pending')

  const decide = (status: 'Approved' | 'Rejected') => {
    if (!review) return
    if (status === 'Rejected' && reason.trim().length < 5) return setErr('Give a short reason so the recruiter knows why (5+ characters).')
    T.decideApplication(review.id, status, reason.trim()); setReview(null); setReason(''); setErr('')
  }
  const open = (a: Application) => { setReview(a); setReason(''); setErr('') }

  return (
    <>
      <Card title={`Approval queue (${pending.length})`}>
        {pending.length === 0 ? <EmptyState title="Queue is clear" text="New recruiter applications appear here for review." /> : (
          <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Recruiter</th><th>Company</th><th>Sector</th><th>Submitted</th><th /></tr></thead><tbody>
            {pending.map(a => (
              <tr key={a.id}>
                <td><b>{a.name}</b><div className="muted small">{a.email}</div></td><td>{a.company}<div className="muted small">Reg. {a.regNo}</div></td>
                <td>{a.sector}<div className="muted small">{a.size}</div></td><td>{fmtDate(a.submitted)}</td>
                <td><Button size="small" appearance="primary" onClick={() => open(a)}>Review</Button></td>
              </tr>
            ))}
          </tbody></table></div>
        )}
      </Card>
      <Card title="Decided">
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Recruiter</th><th>Company</th><th>Status</th><th>Note</th><th /></tr></thead><tbody>
          {decided.map(a => {
            const st = statusOf(a)
            return (
              <tr key={a.id}>
                <td><b>{a.name}</b></td><td>{a.company}</td><td><Status s={st === 'Rejected' ? 'Declined' : st} /></td><td className="small muted">{a.reason || a.note}</td>
                <td><Button size="small" onClick={() => st === 'Approved' ? (T.decideApplication(a.id, 'Rejected', 'Access revoked by administrator')) : T.decideApplication(a.id, 'Approved', '')}>{st === 'Approved' ? 'Revoke' : 'Approve'}</Button></td>
              </tr>
            )
          })}
        </tbody></table></div>
      </Card>
      <Modal open={!!review} onClose={() => setReview(null)} title={`Review ${review?.company ?? ''}`}
        actions={<><Button onClick={() => decide('Rejected')}>Reject</Button><Button appearance="primary" onClick={() => decide('Approved')}>Approve</Button></>}>
        {review && (
          <div className="form">
            <table className="tbl"><tbody>
              <tr><th scope="row">Contact</th><td>{review.name}, {review.email}</td></tr>
              <tr><th scope="row">Company registration</th><td>{review.regNo}</td></tr>
              <tr><th scope="row">Website</th><td>{review.website}</td></tr>
              <tr><th scope="row">Sector and size</th><td>{review.sector}, {review.size}</td></tr>
              <tr><th scope="row">About</th><td>{review.note || '–'}</td></tr>
            </tbody></table>
            <FArea label="Decision note (required to reject)" value={reason} onChange={setReason} rows={3} error={err} />
            <p className="muted small">Approved recruiters can search anonymised profiles. Every view and request is logged.</p>
          </div>
        )}
      </Modal>
    </>
  )
}
