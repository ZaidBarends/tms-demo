import { useState } from 'react'
import { Button, Tab, TabList } from '@fluentui/react-components'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState, Status } from '../shared/ui'
import { FArea, FText } from '../shared/fields'
import { fmtDate, fmtDateTime } from '../shared/format'
import type { IntroRequest } from '../shared/types'
import { useTalent } from './talentStore'
import { PIPE_STAGES, PipeStage } from './talentTypes'
import { Thread } from './Thread'
import './talent.css'

const SHARED = ['Full name', 'Email address', 'Phone number']
const NOT_SHARED = ['Employer-paid courses', 'Home address', 'Any other learner data']

export default function Introductions() {
  const { persona } = useCtx()
  const [tab, setTab] = useState<'b2c' | 'recruiter'>('b2c')
  const view = persona === 'all' ? tab : persona
  return (
    <>
      <PageHeader id="introductions" title="Introduction requests" subtitle={view === 'recruiter' ? 'Your requests to candidates' : 'Recruiters who would like to meet you'} />
      {persona === 'all' && <TabList selectedValue={tab} onTabSelect={(_, x) => setTab(x.value as 'b2c' | 'recruiter')} style={{ marginBottom: 12 }}><Tab value="b2c">As the learner (Zanele)</Tab><Tab value="recruiter">As the recruiter (Marcus)</Tab></TabList>}
      {view === 'recruiter' ? <RecruiterView /> : <LearnerView />}
    </>
  )
}

function Receipt({ approved, at, shared, recruiter }: { approved: boolean; at?: string; shared: string[]; recruiter: string }) {
  return (
    <div className="tal-receipt" role="region" aria-label="Consent receipt">
      <b>Consent receipt</b>{at && <span className="muted small"> · {fmtDateTime(at)}</span>}
      {approved ? (
        <>
          <p style={{ margin: '6px 0 2px' }}>Shared with <b>{recruiter}</b> only:</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{shared.map(s => <li key={s}>{s}</li>)}</ul>
        </>
      ) : <p style={{ margin: '6px 0 0' }}>Nothing was shared with <b>{recruiter}</b>.</p>}
      <p className="small muted" style={{ margin: '6px 0 0' }}>Never shared: {NOT_SHARED.join(', ')}.</p>
    </div>
  )
}

function LearnerView() {
  const d = useStore(s => s.data)
  const decide = useStore(s => s.decideIntro)
  const { learnerId, learner } = useCtx()
  const T = useTalent()
  const list = d.intros.filter(i => i.learnerId === learnerId)
  const [sel, setSel] = useState('')
  const [reply, setReply] = useState('')
  const [note, setNote] = useState('')
  const cur = list.find(i => i.id === sel) ?? list[0]
  const opted = !!d.talent.find(t => t.learnerId === learnerId)?.optedIn

  const simulate = () => {
    const rec = d.recruiters.find(r => r.approved && !d.intros.some(i => i.learnerId === learnerId && i.recruiterId === r.id && i.status === 'Pending'))
    if (!rec) return setNote('Every approved recruiter already has a pending request with you.')
    useStore.getState().requestIntro(rec.id, learnerId, `Hello ${learner?.name.split(' ')[0] ?? ''}, we have a role that suits your recent training and would love to introduce ourselves.`)
    setNote(`${rec.company} sent you a request.`)
  }
  const decideIt = (i: IntroRequest, approve: boolean) => {
    const r = d.recruiters.find(x => x.id === i.recruiterId)!
    decide(i.id, approve)
    T.recordDecision(i.id, { approved: approve, message: reply.trim(), shared: approve ? SHARED : [] })
    if (approve && reply.trim()) T.postMessage(i.id, 'learner', reply.trim())
    T.addConsent(learnerId, approve ? `Approved an introduction to ${r.company}. Shared: ${SHARED.join(', ').toLowerCase()}` : `Declined an introduction from ${r.company}. Nothing shared`)
    setReply('')
  }

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <Button size="small" onClick={simulate} disabled={!opted}>Demo: simulate a new recruiter request</Button>
        {!opted && <span className="muted small">Turn your talent profile on first (Talent profile settings).</span>}
        {note && <span role="status" className="muted small">{note}</span>}
      </div>
      {list.length === 0 ? <Card><EmptyState title="No requests yet" text="When a recruiter asks to be introduced, you will see it here. You always decide." /></Card> : (
        <div className="tal-split">
          <div className="tal-list" role="list" aria-label="Requests">
            {list.map(i => {
              const r = d.recruiters.find(x => x.id === i.recruiterId)!
              return (
                <button key={i.id} className="tal-item" role="listitem" aria-current={cur?.id === i.id} onClick={() => { setSel(i.id); setReply('') }}>
                  <div className="row" style={{ justifyContent: 'space-between' }}><b>{r.company}</b><Status s={i.status} /></div>
                  <div className="muted small">{fmtDate(i.created)} · {i.message.slice(0, 60)}{i.message.length > 60 ? '…' : ''}</div>
                </button>
              )
            })}
          </div>
          {cur && (() => {
            const r = d.recruiters.find(x => x.id === cur.recruiterId)!
            const app = T.applications.find(a => a.id === r.id)
            const dec = T.decisions[cur.id]
            return (
              <Card title={`${r.company}`}>
                <p className="muted small" style={{ marginTop: 0 }}>{r.name}{app ? ` · ${app.sector} · ${app.website}` : ''}</p>
                <div className="row" style={{ marginBottom: 8 }}><Status s={cur.status} /><span className="muted small">Requested {fmtDate(cur.created)}</span></div>
                {cur.status === 'Pending' ? (
                  <>
                    <p style={{ margin: '0 0 10px' }}>“{cur.message}”</p>
                    <div className="tal-receipt" style={{ marginBottom: 12 }}>
                      <b>If you approve, {r.company} will see</b>
                      <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>{SHARED.map(s => <li key={s}>{s}</li>)}</ul>
                      <p className="small muted" style={{ margin: '6px 0 0' }}>Never shared: {NOT_SHARED.join(', ')}.</p>
                    </div>
                    <FArea label="Optional message to the recruiter" value={reply} onChange={setReply} rows={3} />
                    <div className="row" style={{ marginTop: 10 }}>
                      <Button appearance="primary" onClick={() => decideIt(cur, true)}>Approve and share my details</Button>
                      <Button onClick={() => decideIt(cur, false)}>Decline</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Receipt approved={cur.status === 'Approved'} at={dec?.at} shared={dec?.shared ?? (cur.status === 'Approved' ? SHARED : [])} recruiter={r.company} />
                    {dec?.message && <p className="small" style={{ margin: '10px 0 0' }}>Your message: “{dec.message}”</p>}
                    {cur.status === 'Approved' && <>
                      <h3 style={{ fontSize: 14, margin: '14px 0 6px' }}>Conversation</h3>
                      <Thread introId={cur.id} me="learner" firstMessage={cur.message} firstFrom="recruiter" firstAt={cur.created + 'T08:00:00'} open />
                    </>}
                  </>
                )}
              </Card>
            )
          })()}
        </div>
      )}
      <p className="muted small">Approving shares your name, email and phone number with that recruiter only. You can withdraw your profile at any time.</p>
    </>
  )
}

function RecruiterView() {
  const d = useStore(s => s.data)
  const { recruiterId } = useCtx()
  const T = useTalent()
  const list = d.intros.filter(i => i.recruiterId === recruiterId)
  const [sel, setSel] = useState('')
  const [noteText, setNoteText] = useState('')
  const [err, setErr] = useState('')
  const cur = list.find(i => i.id === sel) ?? list[0]

  const addNote = () => {
    if (!cur) return
    if (noteText.trim().length < 3) return setErr('Write at least 3 characters.')
    T.addNote(cur.id, noteText.trim()); setNoteText(''); setErr('')
  }
  if (list.length === 0) return <Card><EmptyState title="No requests yet" text="Request an introduction from Talent search." /></Card>
  return (
    <div className="tal-split">
      <div className="tal-list" role="list" aria-label="Your requests">
        {list.map(i => {
          const l = d.learners.find(x => x.id === i.learnerId)!; const t = d.talent.find(x => x.learnerId === i.learnerId)
          const ok = i.status === 'Approved'
          const stage = T.stages[i.id] ?? (i.placed ? 'placed' : 'approved')
          return (
            <button key={i.id} className="tal-item" role="listitem" aria-current={cur?.id === i.id} onClick={() => setSel(i.id)}>
              <div className="row" style={{ justifyContent: 'space-between' }}><b>{ok ? l.name : `Candidate ${t?.code}`}</b><Status s={i.status} /></div>
              <div className="muted small">{fmtDate(i.created)}{ok ? ` · ${PIPE_STAGES.find(s => s.id === stage)?.label}` : ''}</div>
            </button>
          )
        })}
      </div>
      {cur && (() => {
        const l = d.learners.find(x => x.id === cur.learnerId)!; const t = d.talent.find(x => x.learnerId === cur.learnerId)
        const ok = cur.status === 'Approved'
        const stage: PipeStage = T.stages[cur.id] ?? (cur.placed ? 'placed' : 'approved')
        const idx = PIPE_STAGES.findIndex(s => s.id === stage)
        const notes = T.notes[cur.id] ?? []
        return (
          <Card title={ok ? l.name : `Candidate ${t?.code}`} actions={<Status s={cur.status} />}>
            <p style={{ margin: '0 0 8px' }}><span className="muted small">Your message:</span> “{cur.message}”</p>
            {ok ? (
              <>
                <div className="tal-receipt" style={{ marginBottom: 8 }}>
                  <b>Contact details released</b> <span className="muted small">(the candidate approved{T.decisions[cur.id] ? ` on ${fmtDate(T.decisions[cur.id].at.slice(0, 10))}` : ''})</span>
                  <div>{l.email} · {l.phone}</div>
                </div>
                <div className="tal-stepper" role="group" aria-label="Pipeline stage">
                  {PIPE_STAGES.map((s, n) => (
                    <button key={s.id} className={`tal-step${n < idx ? ' done' : ''}${n === idx ? ' now' : ''}`} aria-pressed={n === idx} onClick={() => T.setStage(cur.id, s.id)}>{s.label}</button>
                  ))}
                </div>
                {stage === 'placed' && <div className="callout" role="status" style={{ marginBottom: 10 }}>Placement recorded. It now counts towards the ROI report.</div>}
                <h3 style={{ fontSize: 14, margin: '10px 0 6px' }}>Conversation</h3>
                <Thread introId={cur.id} me="recruiter" firstMessage={cur.message} firstFrom="recruiter" firstAt={cur.created + 'T08:00:00'} open />
                <h3 style={{ fontSize: 14, margin: '16px 0 6px' }}>Private notes</h3>
                <div className="row" style={{ alignItems: 'flex-end' }}>
                  <FText label="Add a note" value={noteText} onChange={setNoteText} error={err} placeholder="Only you can see this" />
                  <Button onClick={addNote}>Add note</Button>
                </div>
                {notes.length === 0 ? <p className="muted small">No notes yet.</p> : (
                  <ul className="tal-feed" style={{ marginTop: 8 }}>{notes.map(n => <li key={n.id}><span className="dot" /><span>{n.text}<br /><span className="muted small">{fmtDateTime(n.at)}</span></span></li>)}</ul>
                )}
              </>
            ) : (
              <>
                <div className="tal-receipt">{cur.status === 'Pending' ? 'Contact details are hidden until the candidate approves.' : 'The candidate declined. No details were shared.'}</div>
                {T.decisions[cur.id]?.message && <p className="small">Candidate said: “{T.decisions[cur.id].message}”</p>}
              </>
            )}
          </Card>
        )
      })()}
    </div>
  )
}
