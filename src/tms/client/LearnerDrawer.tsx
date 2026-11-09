import { useState } from 'react'
import { Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, OverlayDrawer } from '@fluentui/react-components'
import { DismissRegular } from '@fluentui/react-icons'
import { useStore } from '../../shared/store'
import { Progress, Status } from '../../shared/ui'
import { FSelect } from '../../shared/fields'
import { fmtDate, today } from '../../shared/format'
import { STAFF_PROFILE } from './clientSeed'
import { removeEnrolment, transferEnrolment } from './dataActions'
import './client.css'

export function LearnerDrawer({ learnerId, onClose }: { learnerId: string | null; onClose: () => void }) {
  const d = useStore(s => s.data)
  const l = d.learners.find(x => x.id === learnerId)
  const [xfer, setXfer] = useState<{ id: string; course: string } | null>(null)
  const [msg, setMsg] = useState('')
  const profile = l ? STAFF_PROFILE[l.name] : undefined
  const es = l ? d.enrolments.filter(e => e.learnerId === l.id && e.payer === 'employer') : []
  const certs = l ? d.certificates.filter(c => c.learnerId === l.id && es.some(e => e.courseId === c.courseId)) : []
  const title = (id: string) => d.courses.find(c => c.id === id)?.title ?? ''

  const doRemove = (id: string) => { setMsg(removeEnrolment(id) || 'Place removed.') }
  const doTransfer = () => {
    if (!xfer) return
    if (!xfer.course) return setMsg('Choose the course to move to.')
    const e = transferEnrolment(xfer.id, xfer.course); setMsg(e || 'Place transferred.'); if (!e) setXfer(null)
  }
  return (
    <OverlayDrawer open={!!l} onOpenChange={(_, x) => !x.open && onClose()} position="end" size="medium" aria-label="Learner details">
      {l && (
        <>
          <DrawerHeader>
            <DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Close" icon={<DismissRegular />} onClick={onClose} />}>{l.name}</DrawerHeaderTitle>
          </DrawerHeader>
          <DrawerBody>
            <p className="muted" style={{ marginTop: 0 }}>{profile ? `${profile.jobRole}, ${profile.dept}` : 'Cape Freight staff'} · {l.email} · {l.city}</p>
            {msg && <div className="callout" role="status" style={{ marginBottom: 12 }}>{msg}</div>}
            <h3 style={{ fontSize: 14 }}>Courses and deadlines</h3>
            {es.length === 0 ? <p className="muted">No courses booked.</p> : es.map(e => {
              const s = d.sessions.find(x => x.id === e.sessionId)
              const late = e.deadline && e.status !== 'Completed' && e.deadline < today()
              return (
                <div key={e.id} className="card" style={{ padding: 12, marginBottom: 10 }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><b>{title(e.courseId)}</b><Status s={e.status} /></div>
                  <Progress value={e.progress} />
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {s ? `Session ${fmtDate(s.start)}` : 'Self-paced'} · Deadline {fmtDate(e.deadline)}{late ? ' (overdue)' : ''}{e.result !== undefined ? ` · Result ${e.result}%` : ''}
                  </div>
                  {e.status === 'Booked' && (
                    <div className="row" style={{ marginTop: 8 }}>
                      <Button size="small" onClick={() => { setXfer({ id: e.id, course: '' }); setMsg('') }}>Transfer</Button>
                      <Button size="small" appearance="subtle" onClick={() => doRemove(e.id)}>Remove from course</Button>
                    </div>
                  )}
                  {xfer?.id === e.id && (
                    <div className="row" style={{ marginTop: 8, alignItems: 'flex-end' }}>
                      <FSelect label="Move to" value={xfer.course} onChange={v => setXfer({ id: e.id, course: v })} placeholder="Choose a course" options={d.courses.filter(c => c.status === 'Active' && c.id !== e.courseId).map(c => ({ value: c.id, label: c.title }))} />
                      <Button size="small" appearance="primary" onClick={doTransfer}>Move</Button>
                    </div>
                  )}
                </div>
              )
            })}
            <h3 style={{ fontSize: 14 }}>Certificates</h3>
            {certs.length === 0 ? <p className="muted">No certificates yet.</p> : (
              <ul className="cl-list">{certs.map(c => <li key={c.id}><span><b>{title(c.courseId)}</b><div className="muted small">{c.id} · issued {fmtDate(c.issued)}</div></span><span className="small">{c.expires ? `Expires ${fmtDate(c.expires)}` : 'No expiry'}</span></li>)}</ul>
            )}
          </DrawerBody>
        </>
      )}
    </OverlayDrawer>
  )
}
