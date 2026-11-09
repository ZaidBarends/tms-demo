import { useEffect, useMemo, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { HeartFilled, HeartRegular } from '@fluentui/react-icons'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState, Modal, Status } from '../shared/ui'
import { FArea, FText } from '../shared/fields'
import { fmtDate } from '../shared/format'
import { Candidate, extractSkills, MatchResult, rankCandidates, Ranked } from './talentLogic'
import { EMPTY_FILTERS, SearchFilters } from './talentTypes'
import { useTalent } from './talentStore'
import { useCandidates, MatchBar, MatchChips } from './TalentBits'
import { BriefPanel, FilterPanel } from './SearchFilters'
import { ProfileDrawer } from './ProfileDrawer'
import { CompareModal } from './CompareModal'

function CandidateCard({ r, hasBrief, hearted, picked, canPick, req, onView, onHeart, onPick, onAsk }: {
  r: Ranked; hasBrief: boolean; hearted: boolean; picked: boolean; canPick: boolean; req?: { status: string }
  onView: () => void; onHeart: () => void; onPick: () => void; onAsk: () => void
}) {
  const c = r.c
  return (
    <article className={`card tal-cand${picked ? ' picked' : ''}`} aria-label={`Candidate ${c.code}`}>
      <div className="tal-cand-head">
        <div><h2 className="card-title">Candidate {c.code}</h2><span className="muted small">{c.region} · {c.availability}</span></div>
        <Button appearance="subtle" size="small" aria-label={hearted ? `Remove ${c.code} from shortlist` : `Add ${c.code} to shortlist`} aria-pressed={hearted}
          icon={hearted ? <HeartFilled color="#c50f1f" /> : <HeartRegular />} onClick={onHeart} />
      </div>
      {r.m && hasBrief && <><MatchBar score={r.m.score} /><MatchChips m={r.m} /></>}
      <p style={{ margin: 0, minHeight: 44 }} className="small">{c.summary || <span className="tal-hidden">No summary shared</span>}</p>
      {!r.m && <div className="chips">{c.skills.slice(0, 5).map(s => <span key={s} className="chip">{s}</span>)}</div>}
      <div className="muted small">{c.completed} completed · {c.skills.length} skills · {c.completeness}% complete</div>
      <div className="row" style={{ marginTop: 'auto' }}>
        <Button size="small" onClick={onView}>View profile</Button>
        {req ? <Status s={req.status} /> : <Button size="small" appearance="primary" onClick={onAsk}>Request introduction</Button>}
        <label className="small row" style={{ gap: 4, marginLeft: 'auto' }}>
          <input type="checkbox" checked={picked} disabled={!picked && !canPick} onChange={onPick} aria-label={`Compare ${c.code}`} /> Compare
        </label>
      </div>
    </article>
  )
}

export default function TalentSearch() {
  const d = useStore(s => s.data)
  const { auditView, requestIntro } = useStore.getState()
  const { recruiterId } = useCtx()
  const rec = d.recruiters.find(r => r.id === recruiterId)!
  const all = useCandidates()
  const T = useTalent()
  const [f, setF] = useState<SearchFilters>(EMPTY_FILTERS)
  const [briefId, setBriefId] = useState('')
  const [customText, setCustomText] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [openCode, setOpenCode] = useState<string | null>(null)
  const [askCode, setAskCode] = useState<string | null>(null)
  const [showCompare, setShowCompare] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchErr, setSearchErr] = useState('')
  const [onlyShort, setOnlyShort] = useState(false)

  const skills = useMemo(() => Array.from(new Set(all.flatMap(c => c.skills))).sort(), [all])
  const regions = useMemo(() => Array.from(new Set(all.map(c => c.region))).sort(), [all])

  // Apply a saved search chosen on the dashboard.
  useEffect(() => {
    if (!T.pendingSavedId) return
    const s = T.savedSearches.find(x => x.id === T.pendingSavedId)
    if (s) { setF({ ...EMPTY_FILTERS, ...s.filters }); setBriefId(s.briefId) }
    T.setPendingSaved(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [T.pendingSavedId])

  if (!rec.approved) return <><PageHeader id="talent-search" title="Talent search" /><EmptyState title="Awaiting approval" text="Your recruiter account has not been approved by the training team yet." /></>

  const savedBrief = T.briefs.find(b => b.id === briefId)
  const brief = briefId === 'custom'
    ? (customText.trim() ? { title: 'Pasted brief', required: extractSkills(customText, skills), nice: [] as string[] } : null)
    : savedBrief ? { title: savedBrief.title, required: savedBrief.required, nice: savedBrief.nice } : null
  const ranked = rankCandidates(all, f, brief)
  const short = (T.shortlists[recruiterId] ?? []).map(x => x.code)
  const list = onlyShort ? ranked.filter(r => short.includes(r.c.code)) : ranked
  const mySaved = T.savedSearches.filter(s => s.recruiterId === recruiterId)
  const intro = (c: Candidate) => d.intros.find(i => i.recruiterId === recruiterId && i.learnerId === c.learnerId)

  const view = (c: Candidate) => { auditView(recruiterId, c.learnerId); T.markViewed(recruiterId, c.code); setOpenCode(c.code) }
  const ask = (c: Candidate) => {
    setAskCode(c.code); setErr('')
    setMsg(brief ? `Hi, we are recruiting for a ${brief.title} role and your skills look like a strong fit. Would you be open to an introduction?` : '')
  }
  const send = () => {
    const c = all.find(x => x.code === askCode)
    if (!c) return
    if (msg.trim().length < 10) return setErr('Tell the candidate why you are getting in touch (10+ characters).')
    requestIntro(recruiterId, c.learnerId, msg.trim()); setAskCode(null); setMsg(''); setErr('')
  }
  const saveCurrent = () => {
    if (searchName.trim().length < 3) return setSearchErr('Name the search (3+ characters).')
    T.saveSearch(recruiterId, searchName.trim(), f, briefId); setSearchName(''); setSearchErr('')
  }
  const pick = (code: string) => setPicked(p => p.includes(code) ? p.filter(x => x !== code) : p.length < 3 ? [...p, code] : p)
  const open = all.find(c => c.code === openCode) ?? null
  const openM: MatchResult | null = open && brief ? ranked.find(r => r.c.code === open.code)?.m ?? null : null
  const compareItems = picked.map(code => ranked.find(r => r.c.code === code) ?? (all.find(c => c.code === code) ? { c: all.find(c => c.code === code)!, m: null } : null)).filter((x): x is Ranked => !!x)

  return (
    <>
      <PageHeader id="talent-search" title="Talent search" subtitle={`${rec.name}, ${rec.company}. Anonymised profiles of opted-in learners.`}
        actions={<Button appearance={onlyShort ? 'primary' : 'secondary'} icon={<HeartRegular />} aria-pressed={onlyShort} onClick={() => setOnlyShort(!onlyShort)}>Shortlist ({short.length})</Button>} />
      <div className="grid c2">
        <FilterPanel f={f} set={setF} skills={skills} regions={regions} />
        <div>
          <BriefPanel briefId={briefId} setBriefId={setBriefId} customText={customText} setCustomText={setCustomText} skillsKnown={skills} active={brief} />
          <Card title="Saved searches">
            {mySaved.length === 0 ? <p className="muted">No saved searches yet.</p> : (
              <ul style={{ margin: '0 0 12px', paddingLeft: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
                {mySaved.map(s => (
                  <li key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
                    <span><b>{s.name}</b> <span className="muted small">saved {fmtDate(s.created)}</span></span>
                    <span className="row" style={{ gap: 4 }}>
                      <Button size="small" onClick={() => { setF({ ...EMPTY_FILTERS, ...s.filters }); setBriefId(s.briefId) }}>Run</Button>
                      <Button size="small" appearance="subtle" onClick={() => T.deleteSearch(s.id)} aria-label={`Delete saved search ${s.name}`}>Delete</Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="row" style={{ alignItems: 'flex-end' }}>
              <FText label="Save current filters as" value={searchName} onChange={setSearchName} error={searchErr} placeholder="e.g. Finance juniors" />
              <Button onClick={saveCurrent}>Save search</Button>
            </div>
          </Card>
        </div>
      </div>

      <p className="muted small" role="status">{list.length} profile(s). Only self-funded learning is shown; employer-paid enrolments are never included.</p>
      {list.length === 0 ? <EmptyState title="No profiles match" text={onlyShort ? 'Your shortlist is empty. Tap the heart on a candidate.' : 'Try fewer filters. Learners appear here only when they opt in.'} /> : (
        <div className="grid c3">
          {list.map(r => (
            <CandidateCard key={r.c.code} r={r} hasBrief={!!brief} hearted={short.includes(r.c.code)} picked={picked.includes(r.c.code)} canPick={picked.length < 3} req={intro(r.c)}
              onView={() => view(r.c)} onHeart={() => T.toggleShortlist(recruiterId, r.c.code)} onPick={() => pick(r.c.code)} onAsk={() => ask(r.c)} />
          ))}
        </div>
      )}
      {picked.length > 0 && (
        <div className="tal-tray" role="region" aria-label="Compare tray">
          <b>{picked.length} selected</b><span className="muted small">up to 3</span>
          <Button appearance="primary" disabled={picked.length < 2} onClick={() => setShowCompare(true)}>Compare side by side</Button>
          <Button appearance="subtle" onClick={() => setPicked([])}>Clear</Button>
        </div>
      )}

      <ProfileDrawer c={open} m={openM} briefTitle={brief?.title} shortlisted={!!open && short.includes(open.code)} onShortlist={() => open && T.toggleShortlist(recruiterId, open.code)}
        intro={open ? intro(open) : undefined} onRequest={() => open && ask(open)} onClose={() => setOpenCode(null)} />
      <CompareModal open={showCompare && compareItems.length > 1} onClose={() => setShowCompare(false)} items={compareItems} />
      <Modal open={!!askCode} onClose={() => setAskCode(null)} title={`Request an introduction to ${askCode}`} actions={<Button appearance="primary" onClick={send}>Send request</Button>}>
        <FArea label="Message to the candidate" value={msg} onChange={setMsg} rows={5} error={err} />
        <p className="muted small">The candidate decides. Their contact details are released only if they approve, and the request is recorded in the audit log.</p>
      </Modal>
    </>
  )
}
