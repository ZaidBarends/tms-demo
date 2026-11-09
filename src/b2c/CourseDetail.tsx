import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Accordion, AccordionHeader, AccordionItem, AccordionPanel, Avatar, Button, Radio, RadioGroup, Rating, RatingDisplay } from '@fluentui/react-components'
import { Heart24Filled, Heart24Regular } from '@fluentui/react-icons'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState } from '../shared/ui'
import { FArea } from '../shared/fields'
import { fmtDate, money } from '../shared/format'
import { copyText } from '../lms/csv'
import { useB2c } from './b2cStore'
import { curriculumFor, faqsFor, formatOf, instructorFor, isNew, levelOf, outcomesFor, popularIds, ratingSummary, reviewsFor, seatsLeft, upcomingSessions } from './courseMeta'
import './b2c.css'

export default function CourseDetail({ id }: { id: string }) {
  const d = useStore(s => s.data)
  const nav = useNavigate()
  const { learnerId, learner, persona } = useCtx()
  const { wishlist, reviews, waitlist, compare, toggleWish, toggleWaitlist, toggleCompare, addReview } = useB2c()
  const c = d.courses.find(x => x.id === id)
  const ss = upcomingSessions(d, id)
  const [sessionId, setSessionId] = useState('')
  const [copied, setCopied] = useState(false)
  const [rate, setRate] = useState(0)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const [thanks, setThanks] = useState(false)

  if (!c) return <EmptyState title="Course not found" action={<Link to="/catalogue">Back to catalogue</Link>} />
  const rs = reviewsFor(id, reviews); const sum = ratingSummary(rs)
  const inst = instructorFor(d, id)
  const picked = ss.find(s => s.id === sessionId) ?? ss.find(s => seatsLeft(d, s) > 0)
  const pickedFull = picked ? seatsLeft(d, picked) === 0 : false
  const wished = (wishlist[learnerId] ?? []).includes(id)
  const related = d.courses.filter(x => x.id !== id && x.status === 'Active' && (x.category === c.category || x.skills.some(s => c.skills.includes(s)))).slice(0, 3)
  const mineBought = d.enrolments.some(e => e.learnerId === learnerId && e.courseId === id && e.status === 'Completed')
  const canReview = persona === 'b2c' || persona === 'all'

  const book = () => nav(`/checkout/${c.id}${picked ? `?session=${picked.id}` : ''}`)
  const submitReview = () => {
    if (rate < 1) return setErr('Choose a star rating')
    if (text.trim().length < 10) return setErr('Write at least 10 characters')
    addReview({ courseId: id, name: `${learner?.name.split(' ')[0] ?? 'Learner'} ${learner?.name.split(' ')[1]?.[0] ?? ''}.`, rating: rate, text: text.trim() })
    setErr(''); setText(''); setRate(0); setThanks(true)
  }

  return (
    <>
      <PageHeader title={c.title} subtitle={`${c.code} · ${c.category} · ${c.hours} hours`} actions={<Link to="/catalogue"><Button>Back to catalogue</Button></Link>} />
      <div className="b2c-detail">
        <div>
          <Card>
            <div className="b2c-badges" style={{ marginBottom: 8 }}>{popularIds(d).has(id) && <span className="b2c-tag hot">Popular</span>}{isNew(c) && <span className="b2c-tag new">New</span>}<span className="b2c-tag">{levelOf(c)}</span><span className="b2c-tag">{formatOf(d, c)}</span></div>
            <RatingDisplay value={sum.avg} count={sum.count} />
            <p style={{ fontSize: 16, lineHeight: 1.6 }}>{c.description}</p>
            <div className="chips">{c.skills.map(s => <span className="chip" key={s}>{s}</span>)}</div>
            <h3>What you will learn</h3>
            <ul className="b2c-ticks">{outcomesFor(c).map(o => <li key={o}>{o}</li>)}</ul>
          </Card>

          <Card title="Curriculum" actions={<span className="muted small">{curriculumFor(c).reduce((a, m) => a + m.lessons.length, 0)} lessons</span>}>
            <Accordion multiple collapsible defaultOpenItems={['Getting started']}>
              {curriculumFor(c).map(m => (
                <AccordionItem key={m.module} value={m.module}>
                  <AccordionHeader>{m.module} <span className="muted small">&nbsp;· {m.lessons.length} lessons</span></AccordionHeader>
                  <AccordionPanel>
                    <ul className="lms-list">{m.lessons.map(l => <li key={l.id}><span>{l.title}</span><span className="muted small">{l.kind === 'video' ? 'Video' : l.kind === 'quiz' ? 'Timed check' : 'Slides'} · {l.mins} min</span></li>)}</ul>
                  </AccordionPanel>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>

          <Card title="Your instructor">
            <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
              <Avatar name={inst.name} size={56} color="colorful" />
              <div style={{ flex: 1, minWidth: 220 }}>
                <b>{inst.name}</b> <span className="muted">· {inst.title}</span>
                <div><RatingDisplay value={inst.rating} size="small" /> <span className="muted small">instructor rating</span></div>
                <p style={{ margin: '6px 0' }}>{inst.bio}</p>
                <span className="small muted">{inst.years} years facilitating · {inst.trained.toLocaleString('en-ZA')} learners trained</span>
              </div>
            </div>
          </Card>

          <Card title="Upcoming dates">
            {ss.length === 0 ? <EmptyState title="No scheduled dates" text="This course is available online and can be started any time." /> : (
              <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Date</th><th>Venue</th><th className="num">Seats left</th><th /></tr></thead><tbody>
                {ss.map(s => { const left = seatsLeft(d, s); const on = (waitlist[s.id] ?? []).includes(learnerId)
                  return (
                    <tr key={s.id}><td>{fmtDate(s.start)}</td><td>{s.venue}</td>
                      <td className="num">{left === 0 ? <span className="lms-pill bad">Full</span> : left <= 3 ? <span className="lms-pill warn">{left} left</span> : left}</td>
                      <td>{left === 0 ? <Button size="small" appearance={on ? 'secondary' : 'primary'} onClick={() => toggleWaitlist(s.id, learnerId)}>{on ? `On waitlist (#${(waitlist[s.id] ?? []).indexOf(learnerId) + 4}) · leave` : 'Join waitlist'}</Button>
                        : <Button size="small" appearance={picked?.id === s.id ? 'primary' : 'secondary'} onClick={() => setSessionId(s.id)}>{picked?.id === s.id ? 'Selected' : 'Select'}</Button>}</td></tr>
                  ) })}
              </tbody></table></div>
            )}
          </Card>

          <Card title="Frequently asked questions">
            <Accordion collapsible>{faqsFor(c).map(f => <AccordionItem key={f.q} value={f.q}><AccordionHeader>{f.q}</AccordionHeader><AccordionPanel><p style={{ margin: 0 }}>{f.a}</p></AccordionPanel></AccordionItem>)}</Accordion>
          </Card>

          <Card title={`Reviews (${sum.count})`}>
            <div className="b2c-reviews-head">
              <div style={{ textAlign: 'center' }}><div className="lms-big">{sum.avg.toFixed(1)}</div><RatingDisplay value={sum.avg} size="small" /><div className="muted small">{sum.count} reviews</div></div>
              <div className="b2c-hist" aria-label="Rating distribution">
                {sum.hist.map(h => <div key={h.star}><span>{h.star} star</span><div className="progress"><div style={{ width: `${sum.count ? (h.n / sum.count) * 100 : 0}%`, background: '#f7630c' }} /></div><span>{h.n}</span></div>)}
              </div>
            </div>
            {rs.slice(0, 6).map(r => (
              <div key={r.id} className="b2c-review">
                <div className="row" style={{ justifyContent: 'space-between' }}><b>{r.name}{r.mine && <span className="chip" style={{ marginLeft: 8 }}>Your review</span>}</b><span className="muted small">{fmtDate(r.date)}</span></div>
                <RatingDisplay value={r.rating} size="small" /><p style={{ margin: '4px 0 0' }}>{r.text}</p>
              </div>
            ))}
            {canReview ? (
              <div className="form" style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                <b>Write a review{!mineBought && <span className="muted small"> (open to learners who have booked or completed this course)</span>}</b>
                <div><span id="rv-l" className="small">Your rating</span><div><Rating value={rate} onChange={(_, d2) => setRate(d2.value)} aria-labelledby="rv-l" /></div></div>
                <FArea label="Your review" value={text} onChange={setText} rows={3} error={err.includes('characters') ? err : undefined} />
                {err && !err.includes('characters') && <div className="err" role="alert">{err}</div>}
                <div className="row"><Button appearance="primary" onClick={submitReview}>Post review</Button>{thanks && <span role="status" className="muted">Thank you. Your review is live.</span>}</div>
              </div>
            ) : <p className="muted small" style={{ marginTop: 12 }}>Switch to the B2C learner to write a review.</p>}
          </Card>

          {related.length > 0 && <Card title="You might also like"><div className="grid c3">{related.map(r => <Link key={r.id} to={`/catalogue/${r.id}`} className="b2c-related"><b>{r.title}</b><span className="muted small">{r.hours} hrs · {money(r.price * 1.15)}</span></Link>)}</div></Card>}
        </div>

        <aside className="card b2c-sticky" aria-label="Booking">
          <div className="lms-big">{money(c.price * 1.15)}</div>
          <div className="muted">{money(c.price)} plus 15% VAT</div>
          {ss.length > 0 ? (
            <div style={{ margin: '12px 0' }}>
              <b className="small">Choose a date</b>
              <RadioGroup value={picked?.id ?? ''} onChange={(_, v) => setSessionId(v.value)}>
                {ss.slice(0, 4).map(s => { const left = seatsLeft(d, s); return <Radio key={s.id} value={s.id} disabled={left === 0} label={`${fmtDate(s.start)} · ${left === 0 ? 'full' : `${left} seats`}`} /> })}
              </RadioGroup>
            </div>
          ) : <p className="small">Online, start any time.</p>}
          {pickedFull ? <Button appearance="primary" style={{ width: '100%' }} onClick={() => picked && toggleWaitlist(picked.id, learnerId)}>Join waitlist</Button>
            : <Button appearance="primary" size="large" style={{ width: '100%' }} onClick={book}>Book this course</Button>}
          <div className="row" style={{ marginTop: 10 }}>
            <Button icon={wished ? <Heart24Filled style={{ color: '#d13438' }} /> : <Heart24Regular />} aria-pressed={wished} onClick={() => toggleWish(learnerId, id)}>{wished ? 'Saved' : 'Save'}</Button>
            <Button onClick={async () => setCopied(await copyText(window.location.href))}>{copied ? 'Link copied' : 'Share'}</Button>
            <Button onClick={() => toggleCompare(id)}>{compare.includes(id) ? 'In compare' : 'Compare'}</Button>
          </div>
          <ul className="b2c-ticks small" style={{ marginTop: 14 }}><li>Certificate on completion</li><li>Pay by card or EFT</li><li>Free reschedule up to 7 days before</li></ul>
          <p className="muted small">Booking is for self-paying learners. Opening checkout from another role switches you to the B2C learner.</p>
        </aside>
      </div>
    </>
  )
}
