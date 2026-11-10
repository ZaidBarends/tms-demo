import { useState } from 'react'
import { Button, Checkbox, Input } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmptyState, Status, Modal, Stat } from '../../shared/ui'
import { fmtDate } from '../../shared/format'
import type { Session } from '../../shared/types'
import { bulkAttend } from './mutate'
import { CLASS_PASS_MARK } from './logic'
import { downloadCsv, printPage } from './download'
import { useSurveys } from '../../lms/surveys/surveyStore'
import { findResponse, surveyDue, type SurveyKind } from '../../lms/surveys/surveyLogic'
import { remindAll, sendSurveyEmail } from '../../lms/surveys/surveyActions'
import './ops.css'

const PASS = CLASS_PASS_MARK

export function ClassList({ session }: { session: Session }) {
  const d = useStore(s => s.data)
  const { setAttended, setResult, issueCert } = useStore.getState()
  const [sheet, setSheet] = useState(false)
  const [msg, setMsg] = useState('')
  const responses = useSurveys(s => s.responses)
  const course = d.courses.find(c => c.id === session.courseId)!
  const inst = d.staff.find(x => x.id === session.instructorId)
  const list = d.enrolments.filter(e => e.sessionId === session.id)
  const learner = (id: string) => d.learners.find(x => x.id === id)!
  const payer = (e: typeof list[0]) => (e.payer === 'self' ? 'Self' : e.payer === 'internal' ? 'Internal' : d.orgs.find(o => o.id === e.orgId)?.name ?? 'Employer')
  const eligible = list.filter(e => !e.certificateId && e.attended && (e.result ?? 0) >= PASS)
  const attended = list.filter(e => e.attended).length
  const graded = list.filter(e => e.result !== undefined)
  const passed = graded.filter(e => (e.result ?? 0) >= PASS).length
  const avg = graded.length ? Math.round(graded.reduce((a, e) => a + (e.result ?? 0), 0) / graded.length) : 0
  const allPresent = list.length > 0 && attended === list.length

  const answered = (id: string, k: SurveyKind) => !!findResponse(responses, id, k)
  const pendingPre = list.filter(e => surveyDue(e, 'pre') && !answered(e.id, 'pre'))
  const pendingPost = list.filter(e => surveyDue(e, 'post') && !answered(e.id, 'post'))
  const remind = () => { const n = remindAll(pendingPre.map(e => e.id), 'pre'); setMsg(`Pre-course survey reminder sent to ${n} learner${n === 1 ? '' : 's'}.`) }
  const issueOne = (id: string) => { issueCert(id); sendSurveyEmail(id, 'post') }
  const issueAll = () => { eligible.forEach(e => { issueCert(e.id); sendSurveyEmail(e.id, 'post') }); setMsg(`${eligible.length} certificate${eligible.length === 1 ? '' : 's'} issued and learners notified.`) }
  const exportCsv = () => downloadCsv(`class-list-${course.code}-${session.start}.csv`, [
    ['Learner', 'Paid by', 'Attended', 'Result %', 'Outcome', 'Certificate', 'Pre survey', 'Post survey'],
    ...list.map(e => [learner(e.learnerId).name, payer(e), e.attended ? 'Yes' : 'No', e.result ?? '', e.result === undefined ? '' : e.result >= PASS ? 'Pass' : 'Fail', e.certificateId ?? '', answered(e.id, 'pre') ? 'Done' : 'To do', answered(e.id, 'post') ? 'Done' : 'To do']),
  ])

  return (
    <>
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Booked" value={`${list.length}/${session.capacity}`} hint={`${Math.max(0, session.capacity - list.length)} seats free`} />
        <Stat label="Attendance" value={list.length ? `${Math.round((attended / list.length) * 100)}%` : '–'} hint={`${attended} present`} />
        <Stat label="Pass rate" value={graded.length ? `${Math.round((passed / graded.length) * 100)}%` : '–'} hint={`${graded.length} marked, pass mark ${PASS}%`} />
        <Stat label="Average result" value={graded.length ? `${avg}%` : '–'} />
      </div>
      <Card title="Class list" actions={
        <div className="row" style={{ gap: 6 }}>
          <Button size="small" disabled={!list.length} onClick={() => { bulkAttend(list.map(e => e.id), !allPresent); setMsg(allPresent ? 'Attendance cleared.' : `All ${list.length} learners marked present.`) }}>{allPresent ? 'Clear attendance' : 'Mark all present'}</Button>
          <Button size="small" disabled={!eligible.length} onClick={issueAll}>Issue certificates ({eligible.length})</Button>
          <Button size="small" disabled={!pendingPre.length} onClick={remind}>Remind pre-course survey ({pendingPre.length})</Button>
          <Button size="small" disabled={!list.length} onClick={() => setSheet(true)}>Attendance sheet</Button>
          <Button size="small" disabled={!list.length} onClick={exportCsv}>Export CSV</Button>
        </div>}>
        {msg && <div className="callout" role="status" style={{ marginBottom: 10 }}>{msg}</div>}
        {list.length === 0 ? <EmptyState title="Nobody booked yet" text="Learners who book this session will appear in the class list." /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Learner</th><th>Paid by</th><th>Attended</th><th>Result (%)</th><th>Outcome</th><th>Pre survey</th><th>Post survey</th><th>Certificate</th></tr></thead>
            <tbody>{list.map(e => {
              const l = learner(e.learnerId)
              const canIssue = !e.certificateId && e.attended && (e.result ?? 0) >= PASS
              return (
                <tr key={e.id}>
                  <td>{l.name}</td><td>{payer(e)}</td>
                  <td><Checkbox checked={!!e.attended} onChange={(_, x) => setAttended(e.id, !!x.checked)} aria-label={`Attended: ${l.name}`} /></td>
                  <td style={{ width: 120 }}><Input type="number" min={0} max={100} value={e.result === undefined ? '' : String(e.result)} aria-label={`Result for ${l.name}`}
                    onChange={(_, x) => setResult(e.id, x.value === '' ? undefined : Math.max(0, Math.min(100, Number(x.value))))} /></td>
                  <td>{e.result === undefined ? <span className="muted small">Not marked</span> : <Status s={e.result >= PASS ? 'Completed' : 'Failed'} />} {e.result !== undefined && <span className="small">{e.result >= PASS ? 'Pass' : 'Fail'}</span>}</td>
                  <td>{answered(e.id, 'pre') ? '✓' : <span className="muted">To do</span>}</td>
                  <td>{answered(e.id, 'post') ? '✓' : <span className="muted">{surveyDue(e, 'post') ? 'To do' : '–'}</span>}</td>
                  <td>{e.certificateId ? <Status s="Completed" /> : <Button size="small" disabled={!canIssue} onClick={() => issueOne(e.id)} title={canIssue ? '' : 'Needs attendance and a pass mark of 50% or more'}>Issue certificate</Button>}
                    {e.certificateId && <span className="muted small"> {e.certificateId}</span>}</td>
                </tr>
              )
            })}</tbody>
          </table></div>
        )}
      </Card>
      <Modal open={sheet} onClose={() => setSheet(false)} wide title="Attendance sheet" actions={<Button appearance="primary" onClick={printPage}>Print</Button>}>
        <div className="ops-sheet ops-print-area">
          <h2 style={{ margin: 0 }}>Attendance register</h2>
          <p style={{ margin: '4px 0 14px' }}><b>{course.code} {course.title}</b><br />{fmtDate(session.start)} · {session.venue}<br />Instructor: {inst?.name ?? 'To be confirmed'}</p>
          <table><thead><tr><th style={{ width: 36 }}>#</th><th>Learner</th><th>Organisation</th><th className="sign">Signature</th><th style={{ width: 80 }}>Time in</th></tr></thead>
            <tbody>{list.map((e, i) => <tr key={e.id}><td>{i + 1}</td><td>{learner(e.learnerId).name}</td><td>{payer(e)}</td><td className="sign" /><td /></tr>)}</tbody></table>
          <p style={{ marginTop: 18 }}>Instructor signature: ______________________ &nbsp; Date: ______________</p>
        </div>
      </Modal>
    </>
  )
}
