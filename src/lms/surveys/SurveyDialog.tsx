import { useState } from 'react'
import { Button, Radio, RadioGroup } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Modal } from '../../shared/ui'
import { FArea } from '../../shared/fields'
import { useSurveys } from './surveyStore'
import { surveyLink } from './surveyActions'
import { KIND_LABEL, QUESTIONS, findResponse, surveyDue, type Answers, type Question, type SurveyKind } from './surveyLogic'
import './surveys.css'

function Field({ q, value, onChange }: { q: Question; value: string | number | undefined; onChange: (v: string | number) => void }) {
  if (q.type === 'text') return <FArea label={q.label} value={String(value ?? '')} onChange={onChange} rows={3} />
  const opts: (string | number)[] = q.type === 'choice' ? q.options! : q.type === 'nps' ? Array.from({ length: 11 }, (_, i) => i) : [1, 2, 3, 4, 5]
  return (
    <fieldset className="sv-q">
      <legend>{q.label}{q.required && <span className="sv-req" aria-label="required"> *</span>}</legend>
      <RadioGroup layout="horizontal" value={value === undefined ? '' : String(value)} onChange={(_, d) => onChange(q.type === 'choice' ? d.value : Number(d.value))}>
        {opts.map(o => <Radio key={o} value={String(o)} label={String(o)} />)}
      </RadioGroup>
    </fieldset>
  )
}

/**
 * Stand-in for the embedded Microsoft Form. In production this body is replaced by
 * <iframe src={surveyLink(enrolId, kind)} /> and the response reaches the platform through the Forms integration.
 */
export default function SurveyDialog({ enrolId, kind, onClose }: { enrolId: string; kind: SurveyKind; onClose: () => void }) {
  const d = useStore(s => s.data)
  const submit = useSurveys(s => s.submit)
  const existing = useSurveys(s => findResponse(s.responses, enrolId, kind))
  const e = d.enrolments.find(x => x.id === enrolId)
  const course = d.courses.find(c => c.id === e?.courseId)
  const [answers, setAnswers] = useState<Answers>(() => ({ ...(existing?.answers ?? {}) }))
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  if (!e || !course) return null
  const closed = !surveyDue(e, kind) && !existing
  const send = () => { const m = submit(enrolId, kind, answers); setErr(m); if (!m) setDone(true) }

  return (
    <Modal open wide onClose={onClose} title={`${KIND_LABEL[kind]}: ${course.title}`}
      actions={!done && !closed ? <Button appearance="primary" onClick={send}>{existing ? 'Update response' : 'Submit'}</Button> : undefined}>
      <div className="sv-banner" role="note">
        <b>Microsoft Forms (simulated).</b> The live site embeds this form from <code>{surveyLink(enrolId, kind)}</code>. Here the same questions are shown with demo controls.
      </div>
      {closed ? <p className="muted">{kind === 'post' ? 'This survey opens once the course is complete.' : 'This survey closed when the course was completed.'}</p>
        : done ? <div className="callout" role="status">Thank you. Your {KIND_LABEL[kind].toLowerCase()} response was recorded.</div>
          : <>
            {existing && <p className="small muted">You answered this already. Submitting again replaces your answers.</p>}
            {QUESTIONS[kind].map(q => <Field key={q.id} q={q} value={answers[q.id]} onChange={v => setAnswers(a => ({ ...a, [q.id]: v }))} />)}
            {err && <div className="err" role="alert">{err}</div>}
          </>}
    </Modal>
  )
}
