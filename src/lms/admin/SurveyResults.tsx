import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../../shared/store'
import { Card, EmptyState, Stat } from '../../shared/ui'
import { fmtDate } from '../../shared/format'
import { useSettings } from '../../admin/settingsStore'
import { useSurveys } from '../surveys/surveyStore'
import { courseRows, totals, type SurveyKind } from '../surveys/surveyLogic'
import { remindAll, sendSurveyEmail } from '../surveys/surveyActions'
import { downloadCsv } from '../csv'
import '../surveys/surveys.css'

const fmt = (n: number | null, suffix = '') => n === null ? '–' : `${n}${suffix}`

/** Learning admin: response rates, confidence uplift, ratings and NPS from the pre/post Microsoft Forms, plus chasing outstanding responses. */
export default function SurveyResults() {
  const d = useStore(s => s.data)
  const rs = useSurveys(s => s.responses)
  const cfg = useSettings(s => s.settings.surveys)
  const [msg, setMsg] = useState('')
  const rows = useMemo(() => courseRows(d, rs), [d, rs])
  const t = useMemo(() => totals(d, rs), [d, rs])
  const who = (enrolId: string) => {
    const e = d.enrolments.find(x => x.id === enrolId)!
    return { learner: d.learners.find(l => l.id === e.learnerId)?.name ?? 'Unknown', course: d.courses.find(c => c.id === e.courseId)?.code ?? '' }
  }
  const chase = (kind: SurveyKind, ids: string[]) => setMsg(`${remindAll(ids, kind)} reminder email${ids.length === 1 ? '' : 's'} sent. See the sent log in Communications.`)
  const one = (kind: SurveyKind, id: string) => setMsg(sendSurveyEmail(id, kind, true) ? `Reminder sent to ${who(id).learner}.` : 'Nothing to send: already answered or not due yet.')
  const chart = rows.filter(r => r.preConf !== null || r.postConf !== null).map(r => ({ name: r.code, 'Before': r.preConf ?? 0, 'After': r.postConf ?? 0 }))
  const comments = rs.filter(r => r.kind === 'post' && String(r.answers.comment ?? '').trim()).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6)
  const exportCsv = () => downloadCsv('course-surveys.csv', [
    ['Course', 'Enrolments', 'Completed', 'Pre responses', 'Post responses', 'Avg confidence before', 'Avg confidence after', 'Uplift', 'Content (1-5)', 'Delivery (1-5)', 'NPS'],
    ...rows.map(r => [`${r.code} ${r.title}`, r.enrolments, r.completed, r.pre, r.post, r.preConf ?? '', r.postConf ?? '', r.uplift ?? '', r.content ?? '', r.instructor ?? '', r.nps ?? '']),
  ])

  return (
    <>
      {msg && <div className="callout" role="status" style={{ marginBottom: 12 }}>{msg}</div>}
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Pre-course response rate" value={`${t.preRate}%`} hint={`${t.preDue.length} still to answer`} />
        <Stat label="Post-course response rate" value={`${t.postRate}%`} hint={`${t.postDue.length} completed, not answered`} />
        <Stat label="Confidence uplift" value={t.uplift === null ? '–' : `${t.uplift > 0 ? '+' : ''}${t.uplift}`} hint="Average change, out of 5" />
        <Stat label="Net promoter score" value={fmt(t.nps)} hint="Would recommend, -100 to 100" />
      </div>
      <div className="grid c2">
        <Card title="Confidence before and after">
          {chart.length === 0 ? <EmptyState title="No responses yet" /> : (
            <div style={{ height: 260 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chart} margin={{ left: -16 }}>
              <CartesianGrid stroke="#8884" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 5]} fontSize={12} /><Tooltip /><Legend />
              <Bar dataKey="Before" fill="#c4c9cf" radius={[4, 4, 0, 0]} /><Bar dataKey="After" fill="#597f2d" radius={[4, 4, 0, 0]} />
            </BarChart></ResponsiveContainer></div>
          )}
        </Card>
        <Card title="What learners said">
          {comments.length === 0 ? <EmptyState title="No comments yet" /> : comments.map(r => (
            <blockquote key={r.id} className="sv-quote">{String(r.answers.comment)}<div className="small muted">{who(r.enrolId).course} · {fmtDate(r.at.slice(0, 10))}</div></blockquote>
          ))}
        </Card>
      </div>
      <Card title="By course" actions={<Button size="small" onClick={exportCsv}>Export CSV</Button>}>
        {rows.length === 0 ? <EmptyState title="No enrolments" /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Course</th><th className="num">Pre</th><th className="num">Post</th><th className="num">Before</th><th className="num">After</th><th className="num">Uplift</th><th className="num">Content</th><th className="num">Delivery</th><th className="num">NPS</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.courseId}><td><b>{r.code}</b><div className="small muted">{r.title}</div></td>
                <td className="num">{r.pre}/{r.enrolments}</td><td className="num">{r.post}/{r.completed}</td>
                <td className="num">{fmt(r.preConf)}</td><td className="num">{fmt(r.postConf)}</td>
                <td className="num">{r.uplift === null ? '–' : `${r.uplift > 0 ? '+' : ''}${r.uplift}`}</td>
                <td className="num">{fmt(r.content)}</td><td className="num">{fmt(r.instructor)}</td><td className="num">{fmt(r.nps)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <div className="grid c2">
        {(['pre', 'post'] as SurveyKind[]).map(kind => {
          const due = kind === 'pre' ? t.preDue : t.postDue
          return (
            <Card key={kind} title={kind === 'pre' ? `Pre-course survey to do (${due.length})` : `Post-course survey to do (${due.length})`}
              actions={<Button size="small" appearance="primary" disabled={!due.length} onClick={() => chase(kind, due.map(e => e.id))}>Remind all</Button>}>
              {due.length === 0 ? <EmptyState title="All answered" /> : (
                <table className="tbl"><tbody>{due.slice(0, 8).map(e => <tr key={e.id}><td>{who(e.id).learner}</td><td>{who(e.id).course}</td><td><Button size="small" onClick={() => one(kind, e.id)}>Remind</Button></td></tr>)}</tbody></table>
              )}
              {due.length > 8 && <p className="small muted">and {due.length - 8} more</p>}
            </Card>
          )
        })}
      </div>
      <Card title="Microsoft Forms links" actions={<Link to="/admin/settings">Change in Settings</Link>}>
        <p className="small" style={{ margin: '0 0 6px' }}><b>Pre-course:</b> <code>{cfg.preUrl}</code></p>
        <p className="small" style={{ margin: '0 0 6px' }}><b>Post-course:</b> <code>{cfg.postUrl}</code></p>
        <p className="small muted" style={{ margin: 0 }}>Pre-course survey is {cfg.requirePre ? 'required before the first lesson' : 'encouraged, not required'}. Certificate is {cfg.requirePost ? 'released after the post-course survey' : 'released straight after passing'}.</p>
      </Card>
    </>
  )
}
