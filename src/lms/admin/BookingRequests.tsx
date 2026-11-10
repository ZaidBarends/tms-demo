import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmptyState, Status } from '../../shared/ui'
import { fmtDate } from '../../shared/format'
import { useB2c } from '../../b2c/b2cStore'
import { approveBookingRequest } from '../../b2c/requestActions'

/** Staff queue for B2C reschedule and cancellation requests. */
export default function BookingRequests() {
  const d = useStore(s => s.data)
  const requests = useB2c(s => s.requests)
  const [msg, setMsg] = useState('')
  const name = (enrolId: string) => {
    const e = d.enrolments.find(x => x.id === enrolId)
    return { learner: d.learners.find(l => l.id === e?.learnerId)?.name ?? 'Unknown', course: d.courses.find(c => c.id === e?.courseId)?.title ?? 'Booking removed' }
  }
  const approve = (id: string) => { const r = requests.find(x => x.id === id)!; setMsg(approveBookingRequest(r) || `${name(r.enrolId).learner}'s ${r.type.toLowerCase()} request approved and the learner emailed.`) }
  return (
    <Card title={`Learner booking requests (${requests.filter(r => r.status === 'Requested').length} open)`}>
      {msg && <div className="callout" role="status" style={{ marginBottom: 12 }}>{msg}</div>}
      {requests.length === 0 ? <EmptyState title="No requests" text="Reschedule and cancellation requests from self-paying learners appear here." /> : (
        <table className="tbl"><thead><tr><th>Requested</th><th>Learner</th><th>Course</th><th>Type</th><th>Detail</th><th>Status</th><th /></tr></thead><tbody>
          {requests.map(r => { const n = name(r.enrolId)
            const ns = r.newSessionId ? d.sessions.find(s => s.id === r.newSessionId) : undefined
            return <tr key={r.id}><td>{fmtDate(r.at)}</td><td>{n.learner}</td><td>{n.course}</td><td>{r.type}</td>
              <td className="small">{r.type === 'Cancel' ? `Refund ${r.refundPct}%` : ns ? `Move to ${fmtDate(ns.start)}` : ''}{r.reason ? ` · ${r.reason}` : ''}</td>
              <td><Status s={r.status === 'Approved' ? 'Completed' : 'Pending'} /></td>
              <td>{r.status === 'Requested' && <Button size="small" appearance="primary" onClick={() => approve(r.id)}>Approve</Button>}</td></tr> })}
        </tbody></table>
      )}
    </Card>
  )
}
