import { useEffect, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmailPreview, EmptyState } from '../../shared/ui'
import { fmtDate, fmtDateTime, today } from '../../shared/format'
import { useLms } from '../lmsStore'
import { downloadCsv } from '../csv'
import { dueRows, teamKey, teamName } from './logic'

export function nudgeMail(name: string, course: string, deadline: string, left: number) {
  const first = name.split(' ')[0]
  return {
    subject: left < 0 ? `Overdue: ${course}` : `Reminder: ${course} is due soon`,
    body: `Hi ${first},\n\n${left < 0 ? `${course} was due on ${fmtDate(deadline)} and is now ${-left} day${-left === 1 ? '' : 's'} overdue.` : `${course} is due on ${fmtDate(deadline)}.`} Please complete it as soon as you can. It takes a few short lessons and a knowledge check.\n\nIf you need help, reply to this email.\n\nKind regards,\nThe training team`,
  }
}

export default function Overdue({ pending, clear }: { pending: string | null; clear: () => void }) {
  const d = useStore(s => s.data)
  const sendEmail = useStore(s => s.sendEmail)
  const nudges = useLms(s => s.nudges)
  const nudge = useLms(s => s.nudge)
  const [win, setWin] = useState(7)
  const [preview, setPreview] = useState<{ to: string; subject: string; body: string } | null>(null)
  const [msg, setMsg] = useState('')
  const rows = dueRows(d, today(), win)

  const send = (enrolId: string, quiet = false) => {
    const r = dueRows(d, today(), 3650).find(x => x.e.id === enrolId); if (!r) return
    const m = nudgeMail(r.learner.name, r.courseTitle, r.e.deadline!, r.left)
    sendEmail('m2', r.learner.email, m.subject); nudge(r.learner.id, r.e.id)
    useStore.getState().log(`Nudge sent to ${r.learner.name} for ${r.courseTitle}`)
    if (!quiet) setPreview({ to: r.learner.email, ...m })
  }
  useEffect(() => { if (pending) { send(pending); clear() } }, [pending]) // eslint-disable-line react-hooks/exhaustive-deps

  const overdue = rows.filter(r => r.left < 0)
  const nudgeAll = () => { overdue.forEach(r => send(r.e.id, true)); setMsg(`Nudges sent to ${overdue.length} learner(s). See the sent log in Communications.`) }

  return (
    <Card title="Overdue and due soon" actions={
      <div className="row">
        <select aria-label="Window" value={win} onChange={e => setWin(Number(e.target.value))} className="lms-select">
          <option value={0}>Overdue only</option><option value={7}>Due within 7 days</option><option value={14}>Due within 14 days</option>
        </select>
        <Button size="small" appearance="primary" disabled={!overdue.length} onClick={nudgeAll}>Nudge all overdue ({overdue.length})</Button>
        <Button size="small" disabled={!rows.length} onClick={() => downloadCsv('overdue-learning.csv', [['Learner', 'Team', 'Course', 'Deadline', 'Days left', 'Progress %', 'Last nudged'],
          ...rows.map(r => [r.learner.name, teamName(d, teamKey(r.learner)), r.courseTitle, r.e.deadline, r.left, r.e.progress, nudges[`${r.learner.id}|${r.e.id}`] ?? ''])])}>Export CSV</Button>
      </div>}>
      {msg && <div className="callout" role="status" style={{ marginBottom: 10 }}>{msg}</div>}
      {rows.length === 0 ? <EmptyState title="Nothing overdue" text="Everyone is on track for the selected window." /> : (
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Learner</th><th>Course</th><th>Deadline</th><th>Progress</th><th>Last nudged</th><th /></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.e.id}>
              <td><b>{r.learner.name}</b><div className="small muted">{teamName(d, teamKey(r.learner))}</div></td>
              <td>{r.courseTitle}</td>
              <td>{fmtDate(r.e.deadline)} <span className={`lms-pill ${r.left < 0 ? 'bad' : 'warn'}`}>{r.left < 0 ? `${-r.left} days overdue` : r.left === 0 ? 'Today' : `${r.left} days`}</span></td>
              <td>{r.e.progress}%</td>
              <td className="small">{nudges[`${r.learner.id}|${r.e.id}`] ? fmtDateTime(nudges[`${r.learner.id}|${r.e.id}`]) : 'Never'}</td>
              <td><Button size="small" onClick={() => send(r.e.id)}>Send nudge</Button></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
      <EmailPreview open={!!preview} onClose={() => setPreview(null)} to={preview?.to ?? ''} subject={preview?.subject ?? ''} body={preview?.body ?? ''} />
    </Card>
  )
}
