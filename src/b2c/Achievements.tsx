import { useState } from 'react'
import { Tab, TabList } from '@fluentui/react-components'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader, Card, EmptyState, Stat, Progress } from '../shared/ui'
import { fmtDate, fmtShort } from '../shared/format'
import { useLearnerStats } from '../lms/useLearner'
import { leaderboard } from '../lms/gamify'
import { BadgeIcon, Heatmap, Ring } from '../lms/widgets'
import './b2c.css'

export default function Achievements() {
  const s = useLearnerStats()
  const [tab, setTab] = useState<'all' | 'on' | 'off'>('all')
  const badges = s.badges.filter(b => tab === 'all' || (tab === 'on' ? b.unlocked : !b.unlocked))
  const lb = leaderboard(s.kind, s.learner?.name ?? 'You', s.total)
  const asc = [...s.events].sort((a, b) => a.at.localeCompare(b.at))
  let run = 0
  const series = asc.map(e => ({ date: fmtShort(e.at.slice(0, 10)), Points: (run += e.pts) }))
  const unlocked = s.badges.filter(b => b.unlocked).length

  return (
    <>
      <PageHeader id="achievements" title="Achievements" subtitle="Badges, streaks, points and your level" />
      <div className="grid c2">
        <Card>
          <div className="row" style={{ gap: 20 }}>
            <Ring value={s.level.pct} size={120} stroke={13} color="#8764b8" label={`L${s.level.level}`} sub={s.level.name} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="lms-big">{s.total} <span className="muted" style={{ fontSize: 16, fontWeight: 400 }}>points</span></div>
              {s.level.next ? <><Progress value={s.level.pct} /><div className="small muted" style={{ marginTop: 4 }}>{s.level.toNext} points to {s.level.nextName}</div></> : <div className="small muted">Top level reached.</div>}
            </div>
          </div>
        </Card>
        <div className="grid c2">
          <Stat label="Current streak" value={`${s.streak} days`} hint={`Longest ${s.longest} days`} />
          <Stat label="Badges" value={`${unlocked} / ${s.badges.length}`} hint="Unlocked" />
          <Stat label="This week" value={`${s.week} min`} hint={`Goal ${s.goal} min`} />
          <Stat label="Rank" value={`#${lb.find(r => r.me)?.rank}`} hint={s.kind === 'work' ? 'Among colleagues' : 'In the community'} />
        </div>
      </div>

      <Card title="Badges" actions={<TabList size="small" selectedValue={tab} onTabSelect={(_, x) => setTab(x.value as typeof tab)}><Tab value="all">All</Tab><Tab value="on">Unlocked</Tab><Tab value="off">Locked</Tab></TabList>}>
        {badges.length === 0 ? <EmptyState title="Nothing here yet" text="Keep learning to unlock your first badge." /> : (
          <div className="b2c-badgegrid">
            {badges.map(b => (
              <div key={b.id} className={`lms-badge ${b.unlocked ? 'on' : ''}`}>
                <span className="lms-badge-ico">{b.unlocked ? <BadgeIcon icon={b.icon} /> : <LockGlyph />}</span>
                <b>{b.name}</b><small>{b.desc}</small>
                {b.unlocked ? <small style={{ color: '#13a10e', fontWeight: 600 }}>Unlocked</small> : <><div style={{ width: '100%' }}><Progress value={Math.round((b.current / b.target) * 100)} /></div><small>{b.current} / {b.target}</small></>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid c2">
        <Card title="Learning streak calendar" actions={<span className="muted small">Last 8 weeks</span>}>
          <Heatmap map={s.map} weeks={8} />
          <p className="small muted" style={{ marginTop: 10 }}>Darker squares mean more minutes learnt. Learn on consecutive days to build your streak.</p>
        </Card>
        <Card title="Points over time">
          {series.length === 0 ? <EmptyState title="No points yet" /> : (
            <div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%"><AreaChart data={series} margin={{ left: -12 }}>
              <CartesianGrid stroke="#8884" vertical={false} /><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={12} /><Tooltip />
              <Area type="monotone" dataKey="Points" stroke="#8764b8" fill="#8764b8" fillOpacity={0.25} />
            </AreaChart></ResponsiveContainer></div>
          )}
        </Card>
      </div>

      <div className="grid c2">
        <Card title="Points history">
          {s.events.length === 0 ? <EmptyState title="No points yet" /> : (
            <div className="tbl-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}><table className="tbl"><thead><tr><th>Date</th><th>For</th><th className="num">Points</th></tr></thead><tbody>
              {s.events.map(e => <tr key={e.id}><td>{fmtDate(e.at.slice(0, 10))}</td><td>{e.label}</td><td className="num">+{e.pts}</td></tr>)}
            </tbody></table></div>
          )}
        </Card>
        <Card title={s.kind === 'work' ? 'Team leaderboard' : 'Community leaderboard'}>
          <ol className="lms-lb">{lb.map(r => <li key={r.name} className={r.me ? 'me' : ''}><span className="lms-rank">{r.rank}</span><span>{r.me ? `${r.name} (you)` : r.name}</span><b>{r.pts} pts</b></li>)}</ol>
        </Card>
      </div>
    </>
  )
}

const LockGlyph = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm-3 8V7a3 3 0 0 1 6 0v3z" /></svg>
