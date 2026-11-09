import { useMemo, useState } from 'react'
import { Button, Switch } from '@fluentui/react-components'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card } from '../shared/ui'
import { FArea } from '../shared/fields'
import { fmtDate, fmtDateTime, today } from '../shared/format'
import { buildCandidates } from './talentLogic'
import { useTalent, visibilityOf } from './talentStore'
import { baseConsent } from './talentSeed'
import { downloadText } from './download'
import { Completeness, RadarCompare } from './TalentBits'
import './talent.css'

export default function TalentSettings() {
  const d = useStore(s => s.data)
  const { setOptIn, saveSummary } = useStore.getState()
  const { learnerId, learner } = useCtx()
  const T = useTalent()
  const t = d.talent.find(x => x.learnerId === learnerId)
  const on = !!t?.optedIn
  const vis = visibilityOf(T.visibility, learnerId)
  const [text, setText] = useState(t?.summary ?? '')
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState('')

  const mine = d.enrolments.filter(e => e.learnerId === learnerId)
  const selfCourses = mine.filter(e => e.payer === 'self')
  const asRecruiter = useMemo(() => {
    const forced = { ...d, talent: d.talent.map(x => x.learnerId === learnerId ? { ...x, optedIn: true } : x) }
    return buildCandidates(forced, T.visibility).find(c => c.learnerId === learnerId)
  }, [d, learnerId, T.visibility])
  const allSkills = Array.from(new Set(selfCourses.flatMap(e => d.courses.find(c => c.id === e.courseId)?.skills ?? [])))

  const checks = [
    { ok: on, pts: 20, label: 'Switch your talent profile on' },
    { ok: (t?.summary ?? '').trim().length >= 20, pts: 25, label: 'Save a summary of at least 20 characters' },
    { ok: selfCourses.length >= 1, pts: 20, label: 'Complete or book a self-funded course' },
    { ok: allSkills.length >= 3, pts: 15, label: 'Build at least 3 skills' },
    { ok: vis.region, pts: 10, label: 'Show your region so recruiters can filter by it' },
    { ok: selfCourses.some(e => e.status === 'Completed'), pts: 10, label: 'Finish a course to earn a certificate' },
  ]
  const score = checks.filter(c => c.ok).reduce((a, c) => a + c.pts, 0)

  const generate = () => {
    const top = allSkills.slice(0, 3)
    const titles = selfCourses.slice(0, 2).map(e => d.courses.find(c => c.id === e.courseId)?.title).filter(Boolean)
    setText(top.length
      ? `Motivated professional building practical skills through self-funded training${titles.length ? ` in ${titles.join(' and ')}` : ''}. Strengths in ${top.join(', ')}. Looking for a role where I can keep learning and add value quickly.`
      : 'Motivated professional building practical skills through self-funded training. Looking for a role where I can keep learning and add value quickly.')
    setSaved(false)
  }
  const save = () => {
    if (text.trim().length < 20) return setErr('Write at least 20 characters so recruiters know who you are.')
    setErr(''); if (!t) setOptIn(learnerId, false); saveSummary(learnerId, text.trim()); setSaved(true)
  }
  const withdraw = () => { setOptIn(learnerId, false); T.addConsent(learnerId, 'Withdrew consent. Talent profile hidden from all recruiters') }
  const toggleOn = (v: boolean) => { setOptIn(learnerId, v); if (v) T.addConsent(learnerId, 'Gave consent for approved recruiters to see an anonymised profile') }

  const history = [
    ...baseConsent(learnerId),
    ...(T.consent[learnerId] ?? []),
    ...d.audit.filter(a => a.actor === learner?.name && (a.action === 'Opt-in' || a.action === 'Opt-out')).map(a => ({ id: a.id, at: a.at, text: a.detail })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  const download = () => {
    const payload = {
      exportedOn: today(), learner: learner && { name: learner.name, email: learner.email, phone: learner.phone, city: learner.city },
      talentProfile: t && { code: t.code, optedIn: t.optedIn, region: t.region, summary: t.summary }, visibility: vis,
      enrolments: mine.map(e => ({ course: d.courses.find(c => c.id === e.courseId)?.title, paidBy: e.payer, status: e.status, progress: e.progress, sharedWithRecruiters: e.payer === 'self' })),
      certificates: d.certificates.filter(c => c.learnerId === learnerId),
      introductions: d.intros.filter(i => i.learnerId === learnerId).map(i => ({ recruiter: d.recruiters.find(r => r.id === i.recruiterId)?.company, status: i.status, requested: i.created })),
      consentHistory: history,
    }
    downloadText('my-talent-data.json', JSON.stringify(payload, null, 2), 'application/json')
  }

  return (
    <>
      <PageHeader id="talent-settings" title="Talent profile settings" subtitle="You decide whether recruiters can find you, and what they see"
        actions={<Button onClick={download}>Download my data (JSON)</Button>} />
      <div className="grid c2">
        <Card title="Profile completeness">
          <div style={{ fontSize: 28, fontWeight: 600 }}>{score}%</div>
          <Completeness value={score} />
          <ul className="tal-todo">{checks.map(c => <li key={c.label}><span aria-hidden>{c.ok ? '✓' : '○'}</span> <span className={c.ok ? 'muted' : ''}>{c.label}</span><span className="sr-only"> {c.ok ? 'done' : 'to do'}</span></li>)}</ul>
        </Card>
        <Card title="Opt in">
          <Switch checked={on} onChange={(_, x) => toggleOn(x.checked)} label={on ? 'Your talent profile is ON' : 'Your talent profile is OFF'} />
          <div className="callout" style={{ margin: '12px 0' }}>
            <b>Consent</b>
            <p style={{ margin: '6px 0 0' }}>I agree that approved recruiters may see an <b>anonymised</b> profile of my skills and the courses I paid for myself. My name and contact details are shared only if I approve an introduction request. I can withdraw at any time.</p>
          </div>
          <Button disabled={!on} onClick={withdraw}>Withdraw my profile</Button>
          <p className="muted small">Courses paid for by an employer are never included, even if you opt in.</p>
        </Card>
      </div>
      <div className="grid c2">
        <Card title="What recruiters may see">
          <div className="form">
            <Switch checked={vis.region} onChange={(_, x) => T.setVisibility(learnerId, { region: x.checked })} label="Show my region" />
            <Switch checked={vis.titles} onChange={(_, x) => T.setVisibility(learnerId, { titles: x.checked })} label="Show course titles" />
            <Switch checked={vis.skills} onChange={(_, x) => T.setVisibility(learnerId, { skills: x.checked })} label="Show my skills" />
            <Switch checked={vis.summary} onChange={(_, x) => T.setVisibility(learnerId, { summary: x.checked })} label="Show my summary" />
          </div>
          <p className="muted small">Turning something off hides it from recruiters straight away. It can reduce how often you match a search.</p>
        </Card>
        <Card title="Your summary">
          <div className="form">
            <FArea label="Summary shown to recruiters" value={text} onChange={v => { setText(v); setSaved(false) }} rows={5} error={err} />
            <div className="row">
              <Button onClick={generate}>Generate summary</Button>
              <Button appearance="primary" onClick={save}>Save summary</Button>
              {saved && <span role="status" className="muted">Saved.</span>}
            </div>
            <span className="muted small">The generated text is demo content built from your own skills. Edit it before saving.</span>
          </div>
        </Card>
      </div>
      <Card title="Preview as a recruiter">
        {!on && <p className="muted" style={{ marginTop: 0 }}>Your profile is off, so recruiters see nothing. This is what they would see if you opted in.</p>}
        <div className="tal-two">
          <div className="tal-view">
            <h3>What you see (everything on your account)</h3>
            {mine.length === 0 ? <p className="muted">No courses yet.</p> : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {mine.map(e => {
                  const c = d.courses.find(x => x.id === e.courseId)
                  return e.payer === 'self'
                    ? <li key={e.id}>{c?.title} <span className="muted small">({e.status})</span></li>
                    : <li key={e.id} className="tal-hidden">{c?.title}: hidden, paid by {e.payer === 'internal' ? 'your employer (internal training)' : 'employer'}. Recruiters never see this.</li>
                })}
              </ul>
            )}
            <p className="small muted" style={{ marginBottom: 0 }}>Name: {learner?.name} · {learner?.email}</p>
          </div>
          <div className="tal-view" aria-label="Recruiter view">
            <h3>What a recruiter sees</h3>
            {!asRecruiter ? <p className="muted">You have no self-paid courses yet, so there is nothing to show. Book a course to build a profile.</p> : (
              <>
                <b>Candidate {t?.code}</b> · {asRecruiter.region}
                <p>{asRecruiter.summary || <span className="tal-hidden">(no summary shared)</span>}</p>
                <div className="chips">{asRecruiter.skills.length ? asRecruiter.skills.map(s => <span key={s} className="chip">{s}</span>) : <span className="tal-hidden">Skills hidden</span>}</div>
                <p><b>Courses:</b> {asRecruiter.timeline.map(x => x.title).join(', ') || 'none'}</p>
                <RadarCompare people={[{ name: 'You', radar: asRecruiter.radar }]} height={190} />
                <p className="muted small" style={{ margin: 0 }}>Name, email and phone number are hidden until you approve an introduction.</p>
              </>
            )}
          </div>
        </div>
      </Card>
      <Card title="Consent history">
        <ul className="tal-timeline">{history.map(h => <li key={h.id}><div>{h.text}</div><div className="small muted">{fmtDate(h.at.slice(0, 10))} · {fmtDateTime(h.at).split(', ')[1]}</div></li>)}</ul>
      </Card>
    </>
  )
}
