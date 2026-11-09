import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { FSelect, FText } from '../shared/fields'
import { Card } from '../shared/ui'
import { AVAILABILITY, CATEGORIES, extractSkills } from './talentLogic'
import { Brief, EMPTY_FILTERS, SearchFilters } from './talentTypes'
import { useTalent } from './talentStore'

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" className="tal-chipbtn" aria-pressed={on} onClick={onClick}>{children}</button>
}
const flip = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]

export function FilterPanel({ f, set, skills, regions }: { f: SearchFilters; set: (f: SearchFilters) => void; skills: string[]; regions: string[] }) {
  const upd = (p: Partial<SearchFilters>) => set({ ...f, ...p })
  const active = JSON.stringify(f) !== JSON.stringify(EMPTY_FILTERS)
  return (
    <Card title="Filters" actions={<Button size="small" appearance="subtle" disabled={!active} onClick={() => set({ ...EMPTY_FILTERS, sort: f.sort })}>Clear filters</Button>}>
      <div className="tal-filters">
        <div className="form c2">
          <FText label="Keyword" value={f.q} onChange={q => upd({ q })} placeholder="Skill, course or phrase" />
          <FSelect label="Region" value={f.region} onChange={region => upd({ region })} placeholder="Any region" options={regions.map(r => ({ value: r, label: r }))} />
          <FSelect label="Availability" value={f.availability} onChange={availability => upd({ availability })} placeholder="Any" options={AVAILABILITY.map(a => ({ value: a, label: a }))} />
          <FSelect label="Skill focus" value={f.focus} onChange={focus => upd({ focus: focus as SearchFilters['focus'] })} options={[{ value: 'any', label: 'Soft and technical' }, { value: 'soft', label: 'Mostly soft skills' }, { value: 'technical', label: 'Mostly technical' }]} />
          <FSelect label="Courses completed" value={String(f.minCourses)} onChange={v => upd({ minCourses: Number(v) })} options={[0, 1, 2, 3].map(n => ({ value: String(n), label: n === 0 ? 'Any number' : `${n} or more` }))} />
          <FSelect label="Sort by" value={f.sort} onChange={sort => upd({ sort: sort as SearchFilters['sort'] })} options={[{ value: 'match', label: 'Best match' }, { value: 'newest', label: 'Newest activity' }, { value: 'skills', label: 'Most skills' }]} />
        </div>
        <div role="group" aria-label="Course categories">
          <div className="small muted" style={{ marginBottom: 6 }}>Categories</div>
          <div className="chips">{CATEGORIES.map(c => <Toggle key={c} on={f.categories.includes(c)} onClick={() => upd({ categories: flip(f.categories, c) })}>{c}</Toggle>)}</div>
        </div>
        <div role="group" aria-label="Skills">
          <div className="row" style={{ marginBottom: 6, justifyContent: 'space-between' }}>
            <span className="small muted">Skills ({f.skills.length} selected)</span>
            <span className="row" style={{ gap: 6 }}>
              <Toggle on={f.skillMode === 'any'} onClick={() => upd({ skillMode: 'any' })}>Match any</Toggle>
              <Toggle on={f.skillMode === 'all'} onClick={() => upd({ skillMode: 'all' })}>Match all</Toggle>
            </span>
          </div>
          <div className="chips">{skills.map(s => <Toggle key={s} on={f.skills.includes(s)} onClick={() => upd({ skills: flip(f.skills, s) })}>{s}</Toggle>)}</div>
        </div>
      </div>
    </Card>
  )
}

export type BriefChoice = { id: string; brief: Pick<Brief, 'required' | 'nice' | 'title'> | null }

export function BriefPanel({ briefId, setBriefId, customText, setCustomText, skillsKnown, active }: {
  briefId: string; setBriefId: (id: string) => void; customText: string; setCustomText: (t: string) => void; skillsKnown: string[]
  active: Pick<Brief, 'required' | 'nice' | 'title'> | null
}) {
  const briefs = useTalent(s => s.briefs)
  const addBrief = useTalent(s => s.addBrief)
  const [title, setTitle] = useState('')
  const [err, setErr] = useState('')
  const detected = extractSkills(customText, skillsKnown)
  const saved = briefs.find(b => b.id === briefId)
  const save = () => {
    if (title.trim().length < 3) return setErr('Give the brief a short title.')
    if (detected.length === 0) return setErr('No known skills found yet. Mention skills such as budgeting, agile or communication.')
    const id = addBrief({ title: title.trim(), company: 'My client', text: customText, required: detected, nice: [] })
    setErr(''); setTitle(''); setCustomText(''); setBriefId(id)
  }
  return (
    <Card title="Job brief and match score">
      <p className="muted small" style={{ marginTop: 0 }}>Choose a brief to score every candidate. Required skills are worth 3 points each, nice-to-haves 1 point. The score is simply points matched divided by points available.</p>
      <FSelect label="Brief" value={briefId} onChange={setBriefId} placeholder="No brief (no scoring)"
        options={[...briefs.map(b => ({ value: b.id, label: `${b.title} (${b.company})` })), { value: 'custom', label: 'Paste my own brief' }]} />
      {briefId === 'custom' && (
        <div className="form" style={{ marginTop: 12 }}>
          <label className="small muted" htmlFor="tal-brief-text">Paste the job description</label>
          <textarea id="tal-brief-text" rows={4} value={customText} onChange={e => setCustomText(e.target.value)} style={{ width: '100%', font: 'inherit', padding: 8, boxSizing: 'border-box', background: 'var(--card)', color: 'inherit', border: '1px solid var(--line)', borderRadius: 6 }} />
          <div className="small muted">Skills found: {detected.length ? <span className="chips" style={{ display: 'inline-flex' }}>{detected.map(s => <span className="chip" key={s}>{s}</span>)}</span> : 'none yet'}</div>
          <div className="row">
            <FText label="Save as" value={title} onChange={setTitle} placeholder="e.g. Operations coordinator" error={err} />
            <Button onClick={save}>Save brief</Button>
          </div>
        </div>
      )}
      {saved && (
        <div style={{ marginTop: 12 }}>
          <p style={{ margin: '0 0 8px' }}>{saved.text}</p>
          <div className="chips"><b className="small">Required:</b>{saved.required.map(s => <span key={s} className="chip">{s}</span>)}</div>
          {saved.nice.length > 0 && <div className="chips" style={{ marginTop: 6 }}><b className="small">Nice to have:</b>{saved.nice.map(s => <span key={s} className="tal-chip-nice">{s}</span>)}</div>}
        </div>
      )}
      {active && <div className="small muted" style={{ marginTop: 10 }}>Scoring against <b>{active.title}</b>.</div>}
    </Card>
  )
}
