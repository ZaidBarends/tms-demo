import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { useSurveys } from './surveyStore'
import { KIND_LABEL, findResponse, surveyDue, type SurveyKind } from './surveyLogic'
import SurveyDialog from './SurveyDialog'
import './surveys.css'

/** Learner-facing pre/post survey state for one enrolment: a done pill, a button to complete it, or a note on when it opens. */
export default function SurveyStatus({ enrolId, only }: { enrolId: string; only?: SurveyKind }) {
  const e = useStore(s => s.data.enrolments.find(x => x.id === enrolId))
  const rs = useSurveys(s => s.responses)
  const [open, setOpen] = useState<SurveyKind | null>(null)
  if (!e) return null
  const one = (kind: SurveyKind) => {
    const label = KIND_LABEL[kind].replace('-course survey', '')
    if (findResponse(rs, enrolId, kind)) return <span key={kind} className="lms-pill sv-done">{label} ✓</span>
    if (surveyDue(e, kind)) return <Button key={kind} size="small" onClick={() => setOpen(kind)}>{KIND_LABEL[kind]}</Button>
    return kind === 'post' ? <span key={kind} className="small muted">Post survey opens when you finish</span> : null
  }
  return (
    <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
      {(only ? [only] : (['pre', 'post'] as SurveyKind[])).map(one)}
      {open && <SurveyDialog enrolId={enrolId} kind={open} onClose={() => setOpen(null)} />}
    </div>
  )
}
