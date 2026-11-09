import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Tab, TabList } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, EmptyState, Progress, Status, Stat } from '../shared/ui'
import { daysBetween, fmtDate, money, today } from '../shared/format'
import { useLms } from './lmsStore'
import { useLearnerStats } from './useLearner'
import { buildLessons } from './content'
import { recommend, lessonIndexFor } from './recommend'
import { leaderboard } from './gamify'
import { BadgeStrip, DeadlineAlerts, MiniLeaderboard, ProgressDonut, Recommended, StreakGoalCard, UpcomingSessions, WeeklyBars } from './dash/DashParts'
import { CertificateModal, type CertProps } from './CertificateView'
import { Ring } from './widgets'
import './lms.css'

type Filter = 'all' | 'active' | 'todo' | 'done'

export default function MyLearning() {
  const s = useLearnerStats()
  const { d, learnerId, learner, persona } = s
  const setGoal = useLms(x => x.setWeeklyGoal)
  const talent = useStore(x => x.data.talent.find(t => t.learnerId === learnerId))
  const [filter, setFilter] = useState<Filter>('all')
  const [cert, setCert] = useState<CertProps | null>(null)

  const type = learner?.type ?? 'b2c'
  const isB2c = type === 'b2c'
  const org = d.orgs.find(o => o.id === learner?.orgId)?.name
  const es = s.mine
  const first = learner?.name.split(' ')[0] ?? 'there'
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const resume = useMemo(() => {
    const active = es.filter(e => e.status === 'In progress').sort((a, b) => b.progress - a.progress)[0]
    return active ?? es.filter(e => e.status === 'Booked').sort((a, b) => (a.deadline ?? '9').localeCompare(b.deadline ?? '9'))[0]
  }, [es])
  const resumeCourse = resume && d.courses.find(c => c.id === resume.courseId)
  const lessons = resumeCourse ? buildLessons(resumeCourse) : []
  const li = resume ? lessonIndexFor(resume.progress, lessons.length) : 0
  const minsLeft = lessons.slice(li).reduce((a, l) => a + l.mins, 0)

  const rows = es.filter(e => filter === 'all' || (filter === 'done' ? e.status === 'Completed' : filter === 'active' ? e.status === 'In progress' : e.status === 'Booked'))
    .sort((a, b) => Number(a.status === 'Completed') - Number(b.status === 'Completed') || (a.deadline ?? '9').localeCompare(b.deadline ?? '9'))
  const certs = d.certificates.filter(c => c.learnerId === learnerId)
  const recs = recommend(d, learnerId, 4)
  const lb = leaderboard(s.kind, learner?.name ?? 'You', s.total)
  const spent = d.receipts.filter(r => r.learnerId === learnerId).reduce((a, r) => a + r.amount, 0)
  const overdue = es.filter(e => e.deadline && e.status !== 'Completed' && e.deadline < today()).length
  const payerLabel = (p: string) => p === 'self' ? 'You' : p === 'internal' ? 'Your organisation' : `Employer${org ? ` (${org})` : ''}`

  return (
    <>
      <PageHeader id="my-learning" title="My learning" subtitle={`${learner?.name}${type === 'b2b' ? ` · courses paid for by your employer${org ? `, ${org}` : ''}` : type === 'internal' ? ' · assigned by your organisation' : ' · self-paying'}`} />

      <div className="lms-hero-grid">
        <section className="card lms-hero" aria-label="Continue where you left off">
          <div className="lms-hero-greet">{greet}, {first}</div>
          <div className="lms-hero-sub">
            {type === 'b2b' && `Your employer${org ? `, ${org},` : ''} has paid for your courses. ${overdue ? `${overdue} overdue.` : 'Keep your compliance deadlines on track.'}`}
            {type === 'internal' && `Your organisation has assigned your training. ${overdue ? `${overdue} overdue.` : 'You are on track.'}`}
            {isB2c && `You have spent ${money(spent)} on learning so far. Keep the momentum going.`}
          </div>
          {resume && resumeCourse ? (
            <div className="lms-resume">
              <Ring value={resume.progress} size={84} stroke={9} color="#fff" />
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="small" style={{ opacity: .8 }}>{resume.status === 'Booked' ? 'Ready to start' : 'Continue where you left off'}</div>
                <b className="lms-resume-title">{resumeCourse.title}</b>
                <div className="small" style={{ opacity: .9 }}>Lesson {li + 1} of {lessons.length}: {lessons[li]?.title} · about {minsLeft} min left</div>
                <div className="small" style={{ opacity: .8 }}>Paid by {payerLabel(resume.payer)}{resume.deadline ? ` · due ${fmtDate(resume.deadline)}` : ''}</div>
              </div>
              <Link to={`/learn/${resume.id}`}><Button appearance="primary" size="large" style={{ background: '#fff', color: '#0b3a66' }}>{resume.progress > 0 ? 'Continue' : 'Start'}</Button></Link>
            </div>
          ) : (
            <div className="lms-resume"><div style={{ flex: 1 }}><b>Nothing in progress</b><div className="small">Pick a course to get started.</div></div><Link to="/catalogue"><Button appearance="primary" style={{ background: '#fff', color: '#0b3a66' }}>Browse the catalogue</Button></Link></div>
          )}
        </section>
        <StreakGoalCard streak={s.streak} longest={s.longest} days={s.days} week={s.week} goal={s.goal} setGoal={m => setGoal(learnerId, m)} />
      </div>

      {isB2c && (
        <div className="grid c3" style={{ marginBottom: 16 }}>
          <Link to="/my-bookings" className="card lms-short"><b>My bookings</b><div className="muted">Receipts, calendar and upcoming dates</div></Link>
          <Link to="/talent/settings" className="card lms-short"><b>Talent profile {talent?.optedIn ? '· visible to recruiters' : '· switched off'}</b><div className="muted">{talent?.optedIn ? 'Recruiters can find your anonymised profile. Manage visibility.' : 'Turn it on and let recruiters find your self-paid learning.'}</div></Link>
          <Link to="/catalogue" className="card lms-short"><b>Find a course</b><div className="muted">Browse the catalogue</div></Link>
        </div>
      )}

      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Active courses" value={es.filter(e => e.status !== 'Completed').length} hint={overdue ? `${overdue} overdue` : 'None overdue'} />
        <Stat label="Completed" value={s.done.length} hint={`${certs.length} certificate${certs.length === 1 ? '' : 's'}`} />
        <Stat label="Points · level" value={`${s.total} · L${s.level.level}`} hint={`${s.level.name}${s.level.nextName ? `, ${s.level.toNext} to ${s.level.nextName}` : ''}`} />
        {isB2c ? <Stat label="Learning spend" value={money(spent)} hint="Incl. VAT, from your receipts" />
          : <Stat label="Paid by" value={type === 'internal' ? 'Your organisation' : 'Employer'} hint={type === 'b2b' ? org : 'No cost to you'} />}
      </div>

      <div className="grid c2">
        <ProgressDonut es={es} />
        <WeeklyBars days={s.days} goal={s.goal} />
      </div>

      <div className="grid c2">
        <DeadlineAlerts d={d} es={es} />
        <UpcomingSessions d={d} es={es} />
      </div>

      <Recommended recs={recs} canBuy={isB2c} />

      <Card title="My courses" actions={
        <TabList size="small" selectedValue={filter} onTabSelect={(_, x) => setFilter(x.value as Filter)}>
          <Tab value="all">All ({es.length})</Tab><Tab value="active">In progress</Tab><Tab value="todo">Not started</Tab><Tab value="done">Completed</Tab>
        </TabList>}>
        {rows.length === 0 ? <EmptyState title={es.length ? 'No courses in this view' : 'No courses yet'} text="Courses you book or are assigned will show up here." action={<Link to="/catalogue">Browse the catalogue</Link>} /> : (
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>Course</th><th>Paid by</th><th style={{ width: 200 }}>Progress</th><th>Deadline</th><th>Status</th><th /></tr></thead>
            <tbody>{rows.map(e => {
              const c = d.courses.find(x => x.id === e.courseId)!
              const left = e.deadline ? daysBetween(today(), e.deadline) : null
              return (
                <tr key={e.id}>
                  <td><b>{c.title}</b><div className="muted small">{c.code} · {c.hours} hrs</div></td>
                  <td>{payerLabel(e.payer)}</td>
                  <td><Progress value={e.progress} /><span className="small muted">{e.progress}%</span></td>
                  <td>{e.deadline ? <>{fmtDate(e.deadline)} {left !== null && left < 14 && e.status !== 'Completed' && <span className="err">({left < 0 ? 'overdue' : `${left} days`})</span>}</> : '–'}</td>
                  <td><Status s={e.status} /></td>
                  <td><Link to={`/learn/${e.id}`}><Button size="small" appearance={e.status === 'Completed' ? 'secondary' : 'primary'}>{e.status === 'Completed' ? 'Review' : e.progress > 0 ? 'Continue' : 'Start'}</Button></Link></td>
                </tr>
              )
            })}</tbody>
          </table></div>
        )}
      </Card>

      <div className="grid c2">
        <Card title="My certificates" actions={isB2c ? <Link to="/certifications">Manage</Link> : undefined}>
          {certs.length === 0 ? <EmptyState title="No certificates yet" text="Complete a course to earn one." /> : (
            <ul className="lms-list">{certs.map(c => {
              const left = c.expires ? daysBetween(today(), c.expires) : null
              const title = d.courses.find(x => x.id === c.courseId)?.title ?? ''
              return (
                <li key={c.id}>
                  <span><b>{title}</b><div className="small muted">{c.id} · issued {fmtDate(c.issued)} · {c.expires ? `expires ${fmtDate(c.expires)}` : 'no expiry'}</div>
                    {left !== null && left < 120 && <span className={`lms-pill ${left < 30 ? 'bad' : 'warn'}`}>{left < 0 ? 'Expired' : `Expires in ${left} days`}</span>}</span>
                  <Button size="small" onClick={() => setCert({ name: learner?.name ?? '', course: title, id: c.id, issued: c.issued, expires: c.expires })}>View</Button>
                </li>
              )
            })}</ul>
          )}
        </Card>
        <MiniLeaderboard rows={lb} title={s.kind === 'work' ? 'Team leaderboard' : 'Community leaderboard'} />
      </div>
      <BadgeStrip badges={s.badges} />
      <CertificateModal open={!!cert} onClose={() => setCert(null)} cert={cert} />
    </>
  )
}
