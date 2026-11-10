import { Link } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { Card } from '../../shared/ui'
import { Confetti, Ring } from '../widgets'
import { CertificateDoc, printNow, verifyUrl } from '../CertificateView'
import { copyText } from '../csv'
import { useState } from 'react'
import { fmtDate } from '../../shared/format'
import type { Certificate, Course } from '../../shared/types'
import { useSettings } from '../../admin/settingsStore'
import { useSurveys } from '../surveys/surveyStore'
import { findResponse } from '../surveys/surveyLogic'
import SurveyStatus from '../surveys/SurveyStatus'

export default function Completion({ enrolId, course, learnerName, cert, score, celebrate, next }: {
  enrolId: string; course: Course; learnerName: string; cert?: Certificate; score?: number; celebrate: boolean; next?: { id: string; title: string }
}) {
  const [copied, setCopied] = useState(false)
  const requirePost = useSettings(s => s.settings.surveys.requirePost)
  const answered = useSurveys(s => !!findResponse(s.responses, enrolId, 'post'))
  const locked = requirePost && !answered
  return (
    <div style={{ position: 'relative' }}>
      {celebrate && <Confetti />}
      <Card>
        <div className="lms-done-head">
          <Ring value={score ?? 100} size={110} stroke={12} color="#13a10e" label={score !== undefined ? `${score}%` : 'Done'} sub="final result" />
          <div>
            <h2 style={{ margin: 0 }}>Course complete</h2>
            <p className="muted" style={{ margin: '4px 0 10px' }}>Well done on completing <b>{course.title}</b>.{cert ? ` Certificate ${cert.id} was issued on ${fmtDate(cert.issued)}${cert.expires ? ` and expires on ${fmtDate(cert.expires)}` : ''}. It now appears in your certificate lists.` : ''}</p>
            <div className="row">
              <Button appearance="primary" onClick={printNow} disabled={!cert || locked}>Print / Save</Button>
              {cert && !locked && <Button onClick={async () => { setCopied(await copyText(verifyUrl(cert.id))) }}>{copied ? 'Link copied' : 'Copy verification link'}</Button>}
              <Link to="/my-learning"><Button>Back to My learning</Button></Link>
              {next && <Link to={`/catalogue/${next.id}`}><Button>Next: {next.title}</Button></Link>}
            </div>
          </div>
        </div>
      </Card>
      {!answered && (
        <Card title="Post-course survey">
          <p style={{ marginTop: 0 }}>{locked ? 'Your certificate is ready. Answer the short post-course survey to view and print it.' : 'Tell us how the course went. It takes about two minutes.'}</p>
          <SurveyStatus enrolId={enrolId} only="post" />
        </Card>
      )}
      {locked ? null : cert ? <CertificateDoc name={learnerName} course={course.title} id={cert.id} issued={cert.issued} expires={cert.expires} score={score} hours={course.hours} />
        : <p className="muted">Your certificate is being prepared.</p>}
    </div>
  )
}
