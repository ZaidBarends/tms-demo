import { Link, useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@fluentui/react-components'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState, Stat, Status } from '../shared/ui'
import { fmtDate, fmtDateTime } from '../shared/format'
import { useTalent } from './talentStore'
import { recruiterFunnel } from './talentLogic'
import { PALETTE, useCandidates } from './TalentBits'

const TIPS = [
  'Paste a job brief on Talent search and the match score will show which required skills each candidate is missing.',
  'Candidates answer faster when your request says which role you are hiring for and where it is based.',
  'Save a search for roles you fill often, then rerun it from here in one click.',
  'You cannot see employer-paid training. That is by design, and it protects the learner.',
]

export default function RecruiterDashboard() {
  const d = useStore(s => s.data)
  const { recruiterId } = useCtx()
  const nav = useNavigate()
  const T = useTalent()
  const cands = useCandidates()
  const rec = d.recruiters.find(r => r.id === recruiterId)!
  if (!rec.approved) return <><PageHeader id="talent-dashboard" title="Recruiter dashboard" /><EmptyState title="Awaiting approval" text="The training team has not approved your recruiter account yet. You will see your dashboard once it is approved." /></>

  const mine = d.intros.filter(i => i.recruiterId === recruiterId)
  const shortCodes = (T.shortlists[recruiterId] ?? []).map(s => s.code)
  const funnel = recruiterFunnel(d, recruiterId, shortCodes, T.viewedSeed[recruiterId] ?? [])
  const codeOf = (lid: string) => d.talent.find(t => t.learnerId === lid)?.code ?? '—'
  const pending = mine.filter(i => i.status === 'Pending')
  const approved = mine.filter(i => i.status === 'Approved')
  const savedMine = T.savedSearches.filter(s => s.recruiterId === recruiterId)
  const shortlisted = shortCodes.map(c => cands.find(x => x.code === c)).filter((x): x is NonNullable<typeof x> => !!x)
  const feed = d.audit.filter(a => a.actor.startsWith(`${rec.name} (`)).slice(0, 8)
  const conv = funnel[0].value ? Math.round((funnel[4].value / funnel[0].value) * 100) : 0

  return (
    <>
      <PageHeader id="talent-dashboard" title={`Welcome back, ${rec.name.split(' ')[0]}`} subtitle={`${rec.company}. Your searches, shortlist and introductions.`}
        actions={<Button appearance="primary" onClick={() => nav('/talent/search')}>Search talent</Button>} />
      <div className="grid c4" style={{ marginBottom: 20 }}>
        <Stat label="Profiles available" value={cands.length} hint="Opted in and self-funded" />
        <Stat label="Shortlisted" value={shortlisted.length} hint="Your hearts" />
        <Stat label="Awaiting answer" value={pending.length} hint="Introduction requests" />
        <Stat label="View to placement" value={`${conv}%`} hint={`${funnel[4].value} placed`} />
      </div>
      <div className="grid c2">
        <Card title="Your hiring funnel">
          <div style={{ height: 260 }} role="img" aria-label={`Funnel: ${funnel.map(f => `${f.step} ${f.value}`).join(', ')}`}>
            <ResponsiveContainer>
              <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#8884" horizontal={false} />
                <XAxis type="number" allowDecimals={false} fontSize={12} /><YAxis type="category" dataKey="step" width={84} fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                  {funnel.map((_, i) => <Cell key={i} fill={PALETTE[i % 5]} />)}
                  <LabelList dataKey="value" position="right" fontSize={12} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Introductions" actions={<Link to="/talent/introductions">Open all</Link>}>
          {mine.length === 0 ? <EmptyState title="No introductions yet" text="Request one from Talent search." /> : (
            <div className="tal-list">
              {[...pending, ...approved].slice(0, 5).map(i => {
                const l = d.learners.find(x => x.id === i.learnerId)!
                const stage = T.stages[i.id] ?? (i.placed ? 'placed' : 'approved')
                return (
                  <div key={i.id} className="tal-item" style={{ cursor: 'default' }}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <b>{i.status === 'Approved' ? l.name : `Candidate ${codeOf(i.learnerId)}`}</b><Status s={i.status} />
                    </div>
                    <div className="muted small">Requested {fmtDate(i.created)}{i.status === 'Approved' ? ` · stage: ${stage}` : ' · waiting for the candidate'}</div>
                  </div>
                )
              })}
              {declinedCount(mine) > 0 && <span className="muted small">{declinedCount(mine)} declined request(s) not shown.</span>}
            </div>
          )}
        </Card>
      </div>
      <div className="grid c3">
        <Card title="Saved searches">
          {savedMine.length === 0 ? <p className="muted">Save a search from Talent search to see it here.</p> : (
            <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0, display: 'grid', gap: 8 }}>
              {savedMine.map(s => (
                <li key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
                  <span><b>{s.name}</b><br /><span className="muted small">{s.briefId ? T.briefs.find(b => b.id === s.briefId)?.title ?? 'Pasted brief' : 'No brief'}</span></span>
                  <Button size="small" onClick={() => { T.setPendingSaved(s.id); nav('/talent/search') }}>Run</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Shortlist" actions={<Link to="/talent/search">Manage</Link>}>
          {shortlisted.length === 0 ? <p className="muted">Tap the heart on a candidate to build a shortlist.</p> : (
            <ul style={{ paddingLeft: 0, listStyle: 'none', margin: 0, display: 'grid', gap: 8 }}>
              {shortlisted.slice(0, 6).map(c => (
                <li key={c.code} className="row" style={{ justifyContent: 'space-between' }}>
                  <span><b>{c.code}</b> <span className="muted small">{c.region}</span></span>
                  <span className="chips">{c.skills.slice(0, 2).map(s => <span className="chip" key={s}>{s}</span>)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Recent activity">
          {feed.length === 0 ? <p className="muted">Nothing yet.</p> : (
            <ul className="tal-feed">{feed.map(a => <li key={a.id}><span className="dot" /><span><b>{a.action}</b> {a.target}<br /><span className="muted small">{fmtDateTime(a.at)}</span></span></li>)}</ul>
          )}
        </Card>
      </div>
      <Card title="Tips">
        {TIPS.map(t => <div className="tal-tip" key={t}>{t}</div>)}
      </Card>
    </>
  )
}
const declinedCount = (l: { status: string }[]) => l.filter(i => i.status === 'Declined').length
