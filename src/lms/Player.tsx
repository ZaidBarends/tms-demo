import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { Checkmark16Filled, LockClosed16Regular, ArrowLeft24Regular, ArrowRight24Regular } from '@fluentui/react-icons'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState, Progress } from '../shared/ui'
import { useLms } from './lmsStore'
import { buildLessons, buildQuiz, buildResources, type Lesson, type QuizScore } from './content'
import SlideView from './player/SlideView'
import VideoView from './player/VideoView'
import QuizView from './player/QuizView'
import SidePanel from './player/SidePanel'
import Completion from './player/Completion'
import './lms.css'

export default function Player() {
  const { enrolId } = useParams()
  const d = useStore(s => s.data)
  const { learnerId } = useCtx()
  const mine = d.enrolments.filter(e => e.learnerId === learnerId)
  const e = d.enrolments.find(x => x.id === enrolId) ?? mine.find(x => x.status !== 'Completed') ?? mine[0]
  const course = e && d.courses.find(c => c.id === e.courseId)
  if (!e || !course) return <><PageHeader id="player" title="Course player" /><EmptyState title="No course to play" text="Book or be assigned a course first." action={<Link to="/my-learning">My learning</Link>} /></>
  if (e.learnerId !== learnerId) return <><PageHeader id="player" title="Course player" /><EmptyState title="This course belongs to another learner" action={<Link to="/my-learning">My learning</Link>} /></>
  return <Inner key={e.id} enrolId={e.id} />
}

function Inner({ enrolId }: { enrolId: string }) {
  const d = useStore(s => s.data)
  const { learnerId, learner } = useCtx()
  const lms = useLms()
  const e = d.enrolments.find(x => x.id === enrolId)!
  const course = d.courses.find(c => c.id === e.courseId)!
  const lessons = useMemo(() => buildLessons(course), [course])
  const quiz = useMemo(() => buildQuiz(course), [course])
  const resources = useMemo(() => buildResources(course), [course])
  const completed = e.status === 'Completed'

  const baseline = completed ? lessons.length : Math.floor((e.progress / 100) * lessons.length)
  const doneIds = new Set([...(lms.done[e.id] ?? []), ...lessons.slice(0, baseline).map(l => l.id)])
  const firstOpen = lessons.findIndex(l => !doneIds.has(l.id))
  const [idx, setIdx] = useState(completed ? lessons.length : Math.max(0, firstOpen))
  const [slide, setSlide] = useState(0)
  const [seek, setSeek] = useState(0)
  const [seen, setSeen] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const lesson: Lesson | undefined = lessons[idx]
  const quizId = lessons[lessons.length - 1].id
  const priorDone = lessons.slice(0, -1).every(l => doneIds.has(l.id))
  const quizOpen = completed || priorDone
  const doneCount = lessons.filter(l => doneIds.has(l.id)).length
  const bookmarks = lms.bookmarks[e.id] ?? []

  const go = (i: number, pos: { slide?: number; seek?: number } = {}) => { setIdx(i); setSlide(pos.slide ?? 0); setSeek(pos.seek ?? 0); setSeen(false) }
  const finishLesson = (l: Lesson) => {
    const st = useLms.getState()
    if ((st.done[e.id] ?? []).includes(l.id)) return
    st.markDone(e.id, l.id); st.addMinutes(learnerId, l.mins); st.award(learnerId, `Finished “${l.title}”`, 5)
    if (!completed) {
      const count = new Set([...doneIds, l.id]).size
      useStore.getState().setProgress(e.id, Math.min(95, Math.round((count / lessons.length) * 100)), lessons.findIndex(x => x.id === l.id) + 1)
    }
  }
  const onQuizResult = (s: QuizScore) => {
    if (completed) return
    const st = useLms.getState()
    st.recordQuiz(e.id, s.pct, s.passed)
    if (!s.passed) return
    st.markDone(e.id, quizId); st.addMinutes(learnerId, 6)
    st.award(learnerId, `Passed the ${course.code} knowledge check (${s.pct}%)`, s.pct === 100 ? 40 : 25)
    useStore.getState().setResult(e.id, s.pct)
    useStore.getState().completeCourse(e.id)
    setCelebrate(true)
  }
  const jump = (key: string) => {
    const [lid, pos] = key.split('#'); const i = lessons.findIndex(l => l.id === lid); if (i < 0) return
    pos.startsWith('t') ? go(i, { seek: Number(pos.slice(1)) }) : go(i, { slide: Number(pos) })
  }
  const toggleMark = (key: string) => lms.toggleBookmark(e.id, key)

  const journey = d.journeys.find(j => j.courseIds.includes(course.id))
  const nextId = journey?.courseIds[journey.courseIds.indexOf(course.id) + 1]
  const nextCourse = nextId ? d.courses.find(c => c.id === nextId) : undefined
  const cert = e.certificateId ? d.certificates.find(c => c.id === e.certificateId) : undefined

  const modules = Array.from(new Set(lessons.map(l => l.module)))
  const canAdvance = !!lesson && (doneIds.has(lesson.id) || (lesson.kind === 'slides' && seen))

  return (
    <>
      <PageHeader id="player" title={course.title} subtitle={`${course.code} · ${doneCount} of ${lessons.length} steps complete`} actions={<Link to="/my-learning"><Button>Back to My learning</Button></Link>} />
      <div className="row" style={{ marginBottom: 16 }}><div style={{ flex: 1 }}><Progress value={e.progress} /></div><b>{e.progress}%</b></div>
      <div className="lms-player">
        <nav className="lms-toc" aria-label="Course outline">
          {modules.map(m => (
            <div key={m}>
              <div className="lms-toc-mod">{m}</div>
              {lessons.map((l, i) => l.module !== m ? null : (
                <button key={l.id} className={`lms-toc-item ${i === idx ? 'on' : ''}`} aria-current={i === idx ? 'step' : undefined}
                  disabled={l.kind === 'quiz' && !quizOpen} onClick={() => go(i)}>
                  <span className={`lms-tick ${doneIds.has(l.id) ? 'done' : ''}`}>{doneIds.has(l.id) ? <Checkmark16Filled /> : l.kind === 'quiz' && !quizOpen ? <LockClosed16Regular /> : i + 1}</span>
                  <span className="lms-toc-text">{l.title}<small>{l.kind === 'video' ? 'Video' : l.kind === 'quiz' ? 'Timed check' : 'Slides'} · {l.mins} min</small></span>
                </button>
              ))}
            </div>
          ))}
          <div className="lms-toc-mod">Finish</div>
          <button className={`lms-toc-item ${idx === lessons.length ? 'on' : ''}`} disabled={!completed} onClick={() => go(lessons.length)}>
            <span className={`lms-tick ${completed ? 'done' : ''}`}>{completed ? <Checkmark16Filled /> : <LockClosed16Regular />}</span>
            <span className="lms-toc-text">Completion and certificate<small>{completed ? 'Unlocked' : 'Unlocks when you pass'}</small></span>
          </button>
        </nav>

        <div className="lms-stage">
          {lesson && (
            <Card title={`${idx + 1}. ${lesson.title}`} actions={doneIds.has(lesson.id) ? <span className="chip">Complete</span> : undefined}>
              {lesson.kind === 'slides' && <SlideView lesson={lesson} index={slide} setIndex={setSlide} bookmarked={bookmarks.includes(`${lesson.id}#${slide}`)} onBookmark={() => toggleMark(`${lesson.id}#${slide}`)} onSeenAll={() => setSeen(true)} />}
              {lesson.kind === 'video' && <VideoView lesson={lesson} courseTitle={course.title} startAt={seek} watched={doneIds.has(lesson.id)}
                bookmarks={bookmarks.filter(k => k.startsWith(`${lesson.id}#t`)).map(k => Number(k.split('#t')[1]))}
                onBookmark={t => toggleMark(`${lesson.id}#t${t}`)} onWatched={() => finishLesson(lesson)} />}
              {lesson.kind === 'quiz' && (quizOpen
                ? <QuizView questions={quiz} failedAttempts={lms.quizAttempts[e.id] ?? 0} bestPct={lms.quizBest[e.id] ?? e.result ?? 0} practice={completed}
                  onResult={onQuizResult} onUnlock={() => { lms.unlockQuiz(e.id); go(0) }} onContinue={() => go(lessons.length)} />
                : <div className="callout">Finish the earlier lessons first: {lessons.slice(0, -1).filter(l => !doneIds.has(l.id)).map(l => l.title).join(', ')}.</div>)}
              {lesson.kind !== 'quiz' && (
                <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
                  <Button icon={<ArrowLeft24Regular />} disabled={idx === 0} onClick={() => go(idx - 1)}>Previous lesson</Button>
                  <span className="small muted">{!canAdvance ? (lesson.kind === 'slides' ? 'View the last slide to continue' : 'Watch most of the video to continue') : ''}</span>
                  <Button appearance="primary" icon={<ArrowRight24Regular />} iconPosition="after" disabled={!canAdvance} onClick={() => { finishLesson(lesson); go(idx + 1) }}>
                    {lessons[idx + 1]?.kind === 'quiz' ? 'Continue to the knowledge check' : 'Complete and continue'}
                  </Button>
                </div>
              )}
            </Card>
          )}
          {idx === lessons.length && (completed
            ? <Completion course={course} learnerName={learner?.name ?? ''} cert={cert} score={lms.quizBest[e.id] ?? e.result} celebrate={celebrate} next={nextCourse && { id: nextCourse.id, title: nextCourse.title }} />
            : <EmptyState title="Not complete yet" text="Pass the knowledge check to unlock your certificate." />)}
          <SidePanel enrolId={e.id} lesson={lesson} lessons={lessons} notes={lms.notes} setNote={(lid, t) => lms.setNote(e.id, lid, t)}
            bookmarks={bookmarks} jump={jump} removeBookmark={toggleMark} resources={resources} courseTitle={course.title} />
        </div>
      </div>
    </>
  )
}
