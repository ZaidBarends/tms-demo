import { useEffect, useState } from 'react'
import { Button, Checkbox, Radio, RadioGroup } from '@fluentui/react-components'
import { Card } from '../../shared/ui'
import { Ring } from '../widgets'
import { fmtClock, scoreQuiz, MAX_ATTEMPTS, PASS_MARK, QUIZ_SECONDS, type Question, type QuizScore } from '../content'

type Phase = 'intro' | 'run' | 'result'

export default function QuizView({ questions, failedAttempts, bestPct, practice, onResult, onUnlock, onContinue }: {
  questions: Question[]; failedAttempts: number; bestPct: number; practice: boolean
  onResult: (s: QuizScore) => void; onUnlock: () => void; onContinue: () => void
}) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [qi, setQi] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number[]>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [left, setLeft] = useState(QUIZ_SECONDS)
  const [score, setScore] = useState<QuizScore | null>(null)
  const locked = !practice && failedAttempts >= MAX_ATTEMPTS

  const finish = (a = answers) => { const s = scoreQuiz(questions, a); setScore(s); setPhase('result'); onResult(s) }

  useEffect(() => {
    if (phase !== 'run') return
    const id = setInterval(() => setLeft(x => x - 1), 1000)
    return () => clearInterval(id)
  }, [phase])
  useEffect(() => { if (phase === 'run' && left <= 0) finish() }, [left, phase]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => { setAnswers({}); setChecked({}); setQi(0); setLeft(QUIZ_SECONDS); setScore(null); setPhase('run') }

  if (phase === 'intro') {
    return (
      <Card title="Knowledge check">
        <ul className="lms-rules">
          <li>{questions.length} questions · {fmtClock(QUIZ_SECONDS)} minutes in total, the timer starts when you begin.</li>
          <li>You get feedback after each question. Pass mark {PASS_MARK}%.</li>
          <li>{practice ? 'You have already passed. This is a practice run and is not recorded.' : `You may fail up to ${MAX_ATTEMPTS} times, then you must review the lessons before trying again.`}</li>
          {!practice && failedAttempts > 0 && !locked && <li><b>Failed attempts so far: {failedAttempts} of {MAX_ATTEMPTS}.</b></li>}
          {bestPct > 0 && <li>Your best score: <b>{bestPct}%</b></li>}
        </ul>
        {locked ? (
          <div className="callout" role="alert">
            <b>Attempts used up.</b> Review the lessons, then unlock the check again.
            <div style={{ marginTop: 8 }}><Button appearance="primary" onClick={onUnlock}>Review the lessons and unlock</Button></div>
          </div>
        ) : <Button appearance="primary" onClick={start}>{failedAttempts > 0 ? 'Try again' : 'Start the knowledge check'}</Button>}
      </Card>
    )
  }

  if (phase === 'result' && score) {
    const nowLocked = !practice && !score.passed && failedAttempts >= MAX_ATTEMPTS
    return (
      <Card title="Your results">
        <div className="lms-result">
          <Ring value={score.pct} size={132} stroke={14} color={score.passed ? '#13a10e' : '#d13438'} label={`${score.pct}%`} sub={`${score.correct} of ${score.total}`} />
          <div>
            <h3 style={{ margin: '0 0 4px' }}>{score.passed ? 'You passed' : 'Not quite there yet'}</h3>
            <p className="muted" style={{ margin: 0 }}>{score.passed ? 'Great work. Your certificate is ready.' : `You need ${PASS_MARK}% to pass.${nowLocked ? ' Review the lessons before your next attempt.' : ' Review the feedback below and try again.'}`}</p>
            <div className="row" style={{ marginTop: 12 }}>
              {score.passed ? <Button appearance="primary" onClick={onContinue}>See my certificate</Button>
                : nowLocked ? <Button appearance="primary" onClick={onUnlock}>Review the lessons</Button>
                  : <Button appearance="primary" onClick={start}>Try again</Button>}
            </div>
          </div>
        </div>
        <h4>Review</h4>
        {questions.map((q, i) => {
          const ok = score.perQuestion[q.id]; const mine = answers[q.id] ?? []
          return (
            <div key={q.id} className={`lms-review ${ok ? 'ok' : 'bad'}`}>
              <b>{i + 1}. {q.q}</b>
              <div className="small">Your answer: {mine.length ? mine.map(k => q.options[k]).join('; ') : 'No answer'} {ok ? '(correct)' : `· Correct: ${q.answer.map(k => q.options[k]).join('; ')}`}</div>
              <div className="small muted">{q.why}</div>
            </div>
          )
        })}
      </Card>
    )
  }

  const q = questions[qi]; const sel = answers[q.id] ?? []; const isChecked = !!checked[q.id]
  const correct = scoreQuiz([q], { [q.id]: sel }).passed
  const setSel = (v: number[]) => setAnswers({ ...answers, [q.id]: v })
  return (
    <Card title={`Question ${qi + 1} of ${questions.length}`} actions={<span className={`lms-timer ${left < 60 ? 'low' : ''}`} role="timer" aria-label={`Time left ${fmtClock(Math.max(0, left))}`}>{fmtClock(Math.max(0, left))}</span>}>
      <div className="progress" style={{ marginBottom: 14 }}><div style={{ width: `${(qi / questions.length) * 100}%` }} /></div>
      <fieldset className="lms-q">
        <legend><b>{q.q}</b>{q.type === 'multi' && <span className="muted small"> (select all that apply)</span>}</legend>
        {q.type === 'multi' ? q.options.map((o, k) => (
          <div key={o}><Checkbox label={o} disabled={isChecked} checked={sel.includes(k)} onChange={(_, d) => setSel(d.checked ? [...sel, k] : sel.filter(x => x !== k))} /></div>
        )) : (
          <RadioGroup value={sel[0] === undefined ? '' : String(sel[0])} onChange={(_, d) => setSel([Number(d.value)])} disabled={isChecked}>
            {q.options.map((o, k) => <Radio key={o} value={String(k)} label={o} />)}
          </RadioGroup>
        )}
      </fieldset>
      {isChecked && (
        <div className={`lms-feedback ${correct ? 'ok' : 'bad'}`} role="status">
          <b>{correct ? 'Correct' : 'Not quite'}</b> {!correct && <span>The right answer: {q.answer.map(k => q.options[k]).join('; ')}. </span>}{q.why}
        </div>
      )}
      <div className="row" style={{ marginTop: 14 }}>
        {!isChecked
          ? <Button appearance="primary" disabled={sel.length === 0} onClick={() => setChecked({ ...checked, [q.id]: true })}>Check answer</Button>
          : qi < questions.length - 1
            ? <Button appearance="primary" onClick={() => setQi(qi + 1)}>Next question</Button>
            : <Button appearance="primary" onClick={() => finish()}>Finish and see results</Button>}
        <Button appearance="subtle" onClick={() => finish()}>Submit now</Button>
      </div>
    </Card>
  )
}
