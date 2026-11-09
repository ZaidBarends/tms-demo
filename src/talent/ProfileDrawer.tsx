import { Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, OverlayDrawer } from '@fluentui/react-components'
import { DismissRegular, HeartFilled, HeartRegular } from '@fluentui/react-icons'
import type { IntroRequest } from '../shared/types'
import { fmtDate } from '../shared/format'
import { Status } from '../shared/ui'
import { Candidate, MatchResult } from './talentLogic'
import { Completeness, MatchBar, MatchChips, RadarCompare } from './TalentBits'

export function ProfileDrawer({ c, m, briefTitle, shortlisted, onShortlist, intro, onRequest, onClose }: {
  c: Candidate | null; m: MatchResult | null; briefTitle?: string; shortlisted: boolean; onShortlist: () => void
  intro?: IntroRequest; onRequest: () => void; onClose: () => void
}) {
  return (
    <OverlayDrawer open={!!c} onOpenChange={(_, d) => !d.open && onClose()} position="end" size="medium" aria-label="Candidate profile">
      {c && (
        <>
          <DrawerHeader>
            <DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Close profile" icon={<DismissRegular />} onClick={onClose} />}>
              Candidate {c.code}
            </DrawerHeaderTitle>
          </DrawerHeader>
          <DrawerBody>
            <p className="muted" style={{ marginTop: 0 }}>{c.region} · Available: {c.availability}</p>
            <div className="row" style={{ marginBottom: 12 }}>
              <Button icon={shortlisted ? <HeartFilled color="#c50f1f" /> : <HeartRegular />} onClick={onShortlist} aria-pressed={shortlisted}>{shortlisted ? 'On shortlist' : 'Add to shortlist'}</Button>
              {intro ? <Status s={intro.status} /> : <Button appearance="primary" onClick={onRequest}>Request introduction</Button>}
            </div>
            <p className="small muted" style={{ margin: '0 0 12px' }}>This view was recorded in the audit log. Name and contact details stay hidden until the candidate approves.</p>

            {m && (
              <section style={{ marginBottom: 16 }} aria-label="Match against brief">
                <b>Match against {briefTitle}</b>
                <MatchBar score={m.score} />
                <MatchChips m={m} />
              </section>
            )}

            <b>About</b>
            <p style={{ marginTop: 4 }}>{c.summary || <span className="tal-hidden">The candidate has not shared a summary.</span>}</p>

            <b>Profile completeness</b>
            <Completeness value={c.completeness} />
            <p className="small muted">{c.completeness}% complete · {c.completed} course(s) completed</p>

            <b>Skills</b>
            <div className="chips" style={{ margin: '6px 0 16px' }}>
              {c.skills.length === 0 ? <span className="tal-hidden">Hidden by the candidate</span> : c.skills.map(s => {
                const hit = m?.matched.includes(s) || m?.niceMatched.includes(s)
                return <span key={s} className={hit ? 'tal-chip-ok' : 'chip'}>{s}</span>
              })}
            </div>

            <b>Skills radar</b>
            <RadarCompare people={[{ name: c.code, radar: c.radar }]} height={240} />

            <b>Learning timeline (self-funded only)</b>
            {c.timeline.length === 0 ? <p className="muted">No courses to show.</p> : (
              <ul className="tal-timeline" style={{ marginTop: 10 }}>
                {c.timeline.map((t, i) => (
                  <li key={i} className={t.status === 'Completed' ? '' : 'off'}>
                    <div><b>{t.title}</b></div>
                    <div className="small muted">{t.category} · {t.status} · {fmtDate(t.date)}</div>
                  </li>
                ))}
              </ul>
            )}
            <p className="small muted">Courses paid for by an employer are never shown to recruiters.</p>
          </DrawerBody>
        </>
      )}
    </OverlayDrawer>
  )
}
