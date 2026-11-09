import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Checkbox, Switch, RatingDisplay, Tooltip } from '@fluentui/react-components'
import { Heart24Filled, Heart24Regular, Grid24Regular, TextBulletListLtr24Regular } from '@fluentui/react-icons'
import { useStore, useCtx } from '../shared/store'
import { PageHeader, Card, EmptyState } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { fmtDate, money } from '../shared/format'
import { useB2c } from './b2cStore'
import { courseNo, enrolCount, formatOf, isNew, levelOf, popularIds, ratingSummary, reviewsFor, seatsLeft, upcomingSessions } from './courseMeta'
import CompareModal from './CompareModal'
import './b2c.css'

type Sort = 'popular' | 'price-asc' | 'price-desc' | 'rating' | 'date' | 'newest'

export default function CatalogueList() {
  const d = useStore(s => s.data)
  const { learnerId } = useCtx()
  const { wishlist, compare, reviews, toggleWish, toggleCompare, clearCompare } = useB2c()
  const [q, setQ] = useState('')
  const [cats, setCats] = useState<string[]>([])
  const [levels, setLevels] = useState<string[]>([])
  const [formats, setFormats] = useState<string[]>([])
  const [maxPrice, setMaxPrice] = useState(15000)
  const [minRating, setMinRating] = useState('')
  const [soft, setSoft] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sort, setSort] = useState<Sort>('popular')
  const [view, setView] = useState<'card' | 'list'>('card')
  const [cmp, setCmp] = useState(false)
  const [warn, setWarn] = useState('')

  const mine = wishlist[learnerId] ?? []
  const popular = popularIds(d)
  const all = d.courses.filter(c => c.status === 'Active')
  const meta = useMemo(() => Object.fromEntries(all.map(c => {
    const rs = ratingSummary(reviewsFor(c.id, reviews)); const next = upcomingSessions(d, c.id)[0]
    return [c.id, { ...rs, level: levelOf(c), format: formatOf(d, c), next }]
  })), [d, reviews]) // eslint-disable-line react-hooks/exhaustive-deps
  const categories = Array.from(new Set(all.map(c => c.category)))
  const count = (f: (c: typeof all[number]) => boolean) => all.filter(f).length

  const list = all.filter(c => {
    const m = meta[c.id]
    return (!cats.length || cats.includes(c.category)) && (!levels.length || levels.includes(m.level)) && (!formats.length || formats.includes(m.format))
      && c.price <= maxPrice && (!minRating || m.avg >= Number(minRating)) && (!soft || c.soft) && (!saved || mine.includes(c.id))
      && (c.title + c.code + c.description + c.skills.join(' ')).toLowerCase().includes(q.toLowerCase())
  }).sort((a, b) => {
    const ma = meta[a.id], mb = meta[b.id]
    switch (sort) {
      case 'price-asc': return a.price - b.price
      case 'price-desc': return b.price - a.price
      case 'rating': return mb.avg - ma.avg || mb.count - ma.count
      case 'date': return (ma.next?.start ?? '9999').localeCompare(mb.next?.start ?? '9999')
      case 'newest': return courseNo(b) - courseNo(a)
      default: return enrolCount(d, b.id) - enrolCount(d, a.id)
    }
  })
  const tog = (arr: string[], set: (v: string[]) => void, v: string) => set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])
  const clear = () => { setQ(''); setCats([]); setLevels([]); setFormats([]); setMaxPrice(15000); setMinRating(''); setSoft(false); setSaved(false) }
  const filtered = q || cats.length || levels.length || formats.length || maxPrice < 15000 || minRating || soft || saved
  const onCompare = (id: string) => { setWarn(toggleCompare(id) ? '' : 'You can compare up to 3 courses. Remove one first.') }

  const heart = (id: string) => (
    <Tooltip content={mine.includes(id) ? 'Remove from wishlist' : 'Save to wishlist'} relationship="label">
      <Button appearance="subtle" icon={mine.includes(id) ? <Heart24Filled style={{ color: '#d13438' }} /> : <Heart24Regular />} aria-pressed={mine.includes(id)} onClick={() => toggleWish(learnerId, id)} />
    </Tooltip>
  )
  const badges = (c: typeof all[number]) => (
    <span className="b2c-badges">{popular.has(c.id) && <span className="b2c-tag hot">Popular</span>}{isNew(c) && <span className="b2c-tag new">New</span>}{c.soft && <span className="b2c-tag">Soft skill</span>}</span>
  )

  return (
    <>
      <PageHeader id="catalogue" title="Course catalogue" subtitle={`${list.length} of ${all.length} courses · public dates and prices`}
        actions={<Button appearance={saved ? 'primary' : 'secondary'} icon={<Heart24Regular />} onClick={() => setSaved(!saved)}>Wishlist ({mine.length})</Button>} />
      <div className="b2c-cat">
        <aside className="card b2c-facets" aria-label="Filters">
          <FText label="Search courses" value={q} onChange={setQ} placeholder="Safety, leadership, POPIA" />
          <fieldset><legend>Category</legend>{categories.map(c => <div key={c}><Checkbox label={`${c} (${count(x => x.category === c)})`} checked={cats.includes(c)} onChange={() => tog(cats, setCats, c)} /></div>)}</fieldset>
          <fieldset><legend>Level</legend>{['Beginner', 'Intermediate', 'Advanced'].map(l => <div key={l}><Checkbox label={`${l} (${count(x => meta[x.id].level === l)})`} checked={levels.includes(l)} onChange={() => tog(levels, setLevels, l)} /></div>)}</fieldset>
          <fieldset><legend>Format</legend>{['Classroom', 'Online', 'Blended'].map(l => <div key={l}><Checkbox label={`${l} (${count(x => meta[x.id].format === l)})`} checked={formats.includes(l)} onChange={() => tog(formats, setFormats, l)} /></div>)}</fieldset>
          <div>
            <label htmlFor="b2c-price"><b className="small">Maximum price (ex VAT): {maxPrice >= 15000 ? 'any' : money(maxPrice)}</b></label>
            <input id="b2c-price" type="range" min={1500} max={15000} step={500} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))} style={{ width: '100%', accentColor: '#0f6cbd' }} />
          </div>
          <FSelect label="Minimum rating" value={minRating} onChange={setMinRating} placeholder="Any rating" options={[{ value: '4.5', label: '4.5 and up' }, { value: '4', label: '4 and up' }, { value: '3.5', label: '3.5 and up' }]} />
          <Switch label="Soft skills only" checked={soft} onChange={(_, x) => setSoft(x.checked)} />
          <Button onClick={clear} disabled={!filtered}>Clear filters</Button>
        </aside>

        <div>
          <div className="b2c-toolbar">
            <FSelect label="Sort by" value={sort} onChange={v => setSort(v as Sort)} options={[
              { value: 'popular', label: 'Most popular' }, { value: 'rating', label: 'Highest rated' }, { value: 'price-asc', label: 'Price: low to high' },
              { value: 'price-desc', label: 'Price: high to low' }, { value: 'date', label: 'Soonest date' }, { value: 'newest', label: 'Newest' }]} />
            <div className="row" role="group" aria-label="View">
              <Button appearance={view === 'card' ? 'primary' : 'secondary'} icon={<Grid24Regular />} onClick={() => setView('card')} aria-pressed={view === 'card'}>Cards</Button>
              <Button appearance={view === 'list' ? 'primary' : 'secondary'} icon={<TextBulletListLtr24Regular />} onClick={() => setView('list')} aria-pressed={view === 'list'}>List</Button>
            </div>
          </div>
          {warn && <div className="callout" role="alert" style={{ marginBottom: 12 }}>{warn}</div>}
          {list.length === 0 ? <EmptyState title="No courses match" text="Try removing a filter or searching for something broader." action={<Button onClick={clear}>Clear filters</Button>} /> : view === 'card' ? (
            <div className="grid c3">
              {list.map(c => { const m = meta[c.id]; const seats = m.next ? seatsLeft(d, m.next) : null
                return (
                  <div className="card b2c-card" key={c.id}>
                    <div className="row" style={{ justifyContent: 'space-between' }}>{badges(c)}{heart(c.id)}</div>
                    <h2 className="card-title"><Link to={`/catalogue/${c.id}`}>{c.title}</Link></h2>
                    <RatingDisplay value={m.avg} count={m.count} size="small" />
                    <p className="muted b2c-desc">{c.description}</p>
                    <div className="chips"><span className="chip">{c.category}</span><span className="chip">{m.level}</span><span className="chip">{m.format}</span></div>
                    <div className="b2c-foot">
                      <div><b>{money(c.price)}</b> <span className="muted small">ex VAT</span>
                        <div className="muted small">{m.next ? `Next: ${fmtDate(m.next.start)}${seats === 0 ? ' · full, waitlist' : seats !== null && seats <= 3 ? ` · only ${seats} seats left` : ''}` : 'Online, start any time'} · {c.hours} hrs</div></div>
                      <Link to={`/catalogue/${c.id}`}><Button>View</Button></Link>
                    </div>
                    <Checkbox label="Compare" checked={compare.includes(c.id)} onChange={() => onCompare(c.id)} />
                  </div>
                ) })}
            </div>
          ) : (
            <Card>
              <div className="b2c-rows">
                {list.map(c => { const m = meta[c.id]
                  return (
                    <div className="b2c-row" key={c.id}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        {badges(c)}
                        <h2 className="card-title"><Link to={`/catalogue/${c.id}`}>{c.title}</Link></h2>
                        <div className="muted small">{c.category} · {m.level} · {m.format} · {c.hours} hrs · {m.next ? `next ${fmtDate(m.next.start)}` : 'start any time'}</div>
                      </div>
                      <RatingDisplay value={m.avg} count={m.count} size="small" />
                      <b>{money(c.price)}</b>
                      <Checkbox label="Compare" checked={compare.includes(c.id)} onChange={() => onCompare(c.id)} />
                      {heart(c.id)}
                      <Link to={`/catalogue/${c.id}`}><Button>View</Button></Link>
                    </div>
                  ) })}
              </div>
            </Card>
          )}
        </div>
      </div>
      {compare.length > 0 && (
        <div className="b2c-tray" role="region" aria-label="Compare courses">
          <span><b>Compare ({compare.length} of 3):</b></span>
          {compare.map(id => <span key={id} className="chip">{d.courses.find(c => c.id === id)?.title} <button className="lms-linkbtn" onClick={() => toggleCompare(id)} aria-label="Remove from comparison">✕</button></span>)}
          <Button appearance="primary" disabled={compare.length < 2} onClick={() => setCmp(true)}>{compare.length < 2 ? 'Pick one more' : 'Compare now'}</Button>
          <Button appearance="subtle" onClick={clearCompare}>Clear</Button>
        </div>
      )}
      <CompareModal open={cmp} onClose={() => setCmp(false)} ids={compare} />
    </>
  )
}
