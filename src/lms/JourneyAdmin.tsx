import { useState } from 'react'
import { Button, Checkbox } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../shared/store'
import { Card, EmptyState, Modal, Status } from '../shared/ui'
import { FText } from '../shared/fields'
import { addDays, fmtDate, today } from '../shared/format'
import { useLms } from './lmsStore'
import type { Journey } from '../shared/types'

/** Assign every remaining course of a journey to the given learners, one deadline window per step. */
export function assignJourney(j: Journey, learnerIds: string[], startDeadline: string, gapDays = 30) {
  const { assign, log } = useStore.getState()
  j.courseIds.forEach((cid, i) => assign(learnerIds, cid, addDays(startDeadline, i * gapDays)))
  log(`Journey “${j.goal}” assigned to ${learnerIds.length} learner(s)`)
}

export function AssignJourneyModal({ journey, onClose }: { journey: Journey | null; onClose: () => void }) {
  const d = useStore(s => s.data)
  const [picked, setPicked] = useState<string[]>([])
  const [deadline, setDeadline] = useState(addDays(today(), 30))
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState('')
  const staff = d.learners.filter(l => l.type !== 'b2c' && l.name.toLowerCase().includes(q.toLowerCase()))
  const submit = () => {
    if (!picked.length) return setErr('Select at least one learner')
    if (deadline < today()) return setErr('The first deadline must be today or later')
    assignJourney(journey!, picked, deadline); setErr(''); setDone(`Assigned ${journey!.courseIds.length} courses to ${picked.length} learner(s). Existing enrolments were kept.`); setPicked([])
  }
  return (
    <Modal open={!!journey} onClose={() => { setDone(''); onClose() }} title={`Assign “${journey?.goal}”`} actions={<Button appearance="primary" onClick={submit}>Assign journey</Button>}>
      <div className="form">
        <FText label="Find a learner" value={q} onChange={setQ} placeholder="Type a name" />
        <fieldset style={{ border: '1px solid var(--line)', borderRadius: 8, maxHeight: 200, overflowY: 'auto', padding: 10 }}>
          <legend>Learners (employer-paid and internal)</legend>
          {staff.map(l => <div key={l.id}><Checkbox label={`${l.name} · ${l.type === 'internal' ? 'Internal' : d.orgs.find(o => o.id === l.orgId)?.name}`} checked={picked.includes(l.id)} onChange={(_, x) => setPicked(x.checked ? [...picked, l.id] : picked.filter(p => p !== l.id))} /></div>)}
          {staff.length === 0 && <span className="muted">No learners match.</span>}
        </fieldset>
        <FText label="Deadline for the first course" type="date" value={deadline} onChange={setDeadline} hint="Each later course is due 30 days after the one before." />
        {err && <div className="err" role="alert">{err}</div>}
        {done && <div className="callout" role="status">{done}</div>}
      </div>
    </Modal>
  )
}

export function JourneyAdminPanel({ onAssign }: { onAssign: (j: Journey) => void }) {
  const d = useStore(s => s.data)
  const reqs = useLms(s => s.journeyRequests)
  const approve = useLms(s => s.approveJourney)
  const funnel = d.journeys.flatMap(j => j.courseIds.map((cid, i) => ({
    name: `${j.goal.split(' ').slice(-2).join(' ')} · ${i + 1}`,
    Completed: d.enrolments.filter(e => e.courseId === cid && e.status === 'Completed').length,
    Enrolled: d.enrolments.filter(e => e.courseId === cid && e.status !== 'Completed').length,
  })))
  const approveReq = (id: string) => {
    const r = reqs.find(x => x.id === id); const j = d.journeys.find(x => x.id === r?.journeyId); if (!r || !j) return
    assignJourney(j, [r.learnerId], addDays(today(), 30)); approve(id)
  }
  return (
    <>
      <Card title="Enrolment requests from employer-paid learners">
        {reqs.length === 0 ? <EmptyState title="No requests" text="When an employer-paid learner asks to join a journey it will appear here for approval." /> : (
          <table className="tbl"><thead><tr><th>Learner</th><th>Journey</th><th>Requested</th><th>Status</th><th /></tr></thead><tbody>
            {reqs.map(r => (
              <tr key={r.id}><td>{d.learners.find(l => l.id === r.learnerId)?.name}</td><td>{d.journeys.find(j => j.id === r.journeyId)?.goal}</td><td>{fmtDate(r.at)}</td><td><Status s={r.status === 'Approved' ? 'Approved' : 'Requested'} /></td>
                <td>{r.status === 'Requested' && <Button size="small" appearance="primary" onClick={() => approveReq(r.id)}>Approve and assign</Button>}</td></tr>
            ))}
          </tbody></table>
        )}
      </Card>
      <Card title="Where learners are in each journey" actions={<span className="muted small">Number of learners per step</span>}>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} margin={{ left: -16 }}>
              <CartesianGrid stroke="#8884" vertical={false} /><XAxis dataKey="name" fontSize={10} interval={0} angle={-30} textAnchor="end" height={70} /><YAxis allowDecimals={false} fontSize={12} />
              <Tooltip /><Bar dataKey="Completed" stackId="a" fill="#13a10e" /><Bar dataKey="Enrolled" stackId="a" fill="#92ca61" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="row" style={{ marginTop: 8 }}>{d.journeys.map(j => <Button key={j.id} size="small" onClick={() => onAssign(j)}>Assign “{j.goal}”</Button>)}</div>
      </Card>
    </>
  )
}
