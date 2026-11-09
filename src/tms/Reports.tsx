import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, EmptyState } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { fmtDate, money, today } from '../shared/format'
import { GRID, PALETTE, buildLedger, deltaPct, toCsv } from './money/calc'
import { PRESETS, attendanceReport, clientsReport, previousRange, profitReport, rangeOf, revenueReport, utilisationReport } from './money/reportData'
import type { Table } from './money/reportData'
import { Delta, Kpi, Tabs } from './money/ui'
import { useMoney } from './money/store'
import { downloadCsv } from './money/actions'

const TABS = [{ id: 'revenue', label: 'Revenue' }, { id: 'util', label: 'Utilisation' }, { id: 'attend', label: 'Attendance' }, { id: 'profit', label: 'Profitability' }, { id: 'clients', label: 'Clients' }]
const MONEY_HEADS = /revenue|cost|profit|incl|outstanding|previous period/i

export default function Reports() {
  const d = useStore(s => s.data)
  const views = useMoney(s => s.views)
  const saveView = useMoney(s => s.saveView)
  const deleteView = useMoney(s => s.deleteView)
  const [tab, setTab] = useState('revenue')
  const [preset, setPreset] = useState('180')
  const [compare, setCompare] = useState(true)
  const [org, setOrg] = useState(''); const [cat, setCat] = useState(''); const [instructor, setInstructor] = useState(''); const [venue, setVenue] = useState('')
  const [by, setBy] = useState<'category' | 'client'>('category')
  const [drill, setDrill] = useState<string | null>(null)
  const [viewName, setViewName] = useState(''); const [viewErr, setViewErr] = useState(''); const [flash, setFlash] = useState('')
  const now = today()
  const cats = Array.from(new Set(d.courses.map(c => c.category)))
  const venues = Array.from(new Set(d.sessions.map(s => s.venue)))
  const f = { org, cat, instructor, venue }
  const range = rangeOf(preset, now), prev = previousRange(range)
  const ledger = useMemo(() => buildLedger(d, now), [d, now])
  const orgName = (id?: string) => d.orgs.find(o => o.id === id)?.name ?? '—'

  const rev = useMemo(() => revenueReport(ledger, range, f, compare, drill, orgName), [ledger, preset, org, cat, compare, drill]) // eslint-disable-line react-hooks/exhaustive-deps
  const util = useMemo(() => utilisationReport(d, range, f, compare), [d, preset, cat, instructor, venue, compare]) // eslint-disable-line react-hooks/exhaustive-deps
  const att = useMemo(() => attendanceReport(d, range, f, compare), [d, preset, org, cat, instructor, venue, compare]) // eslint-disable-line react-hooks/exhaustive-deps
  const prof = useMemo(() => profitReport(ledger, range, f, by, compare, orgName), [ledger, preset, org, cat, by, compare]) // eslint-disable-line react-hooks/exhaustive-deps
  const cli = useMemo(() => clientsReport(d, ledger, range, f, compare), [d, ledger, preset, org, cat, compare]) // eslint-disable-line react-hooks/exhaustive-deps

  const active = { revenue: rev, util, attend: att, profit: prof, clients: cli }[tab as 'revenue']
  const table: Table = active.table
  const chart = active.chart as Record<string, string | number | undefined>[]
  const keys = tab === 'revenue' ? ['Revenue', 'Collected'] : tab === 'util' ? ['Seat fill %'] : tab === 'attend' ? ['Attended %', 'Completed %'] : tab === 'profit' ? ['Revenue', 'Cost', 'Profit'] : ['Revenue']
  const colors = tab === 'profit' ? [PALETTE.blue, PALETTE.grey, PALETTE.green] : tab === 'attend' ? [PALETTE.sky, PALETTE.green] : tab === 'revenue' ? [PALETTE.blue, PALETTE.green] : [PALETTE.blue]
  const isPct = tab === 'util' || tab === 'attend'
  const xKey = tab === 'revenue' ? 'label' : 'name'

  const changeTab = (t: string) => { setTab(t); setDrill(null); if ((t === 'util' || t === 'attend') && range.to <= now && preset !== 'sched') setPreset('sched') }
  const exportCsv = () => { downloadCsv(`report-${tab}-${now}.csv`, toCsv([table.head, ...table.rows])); setFlash(`Exported ${table.rows.length} rows from the ${TABS.find(x => x.id === tab)?.label} report.`) }
  const doSave = () => {
    if (!viewName.trim()) return setViewErr('Name the view first')
    setViewErr(''); saveView({ name: viewName.trim(), tab, preset, org, cat, instructor, venue, compare }); setViewName(''); setFlash('View saved.')
  }
  const apply = (id: string) => {
    const v = views.find(x => x.id === id); if (!v) return
    setTab(v.tab); setPreset(v.preset); setOrg(v.org); setCat(v.cat); setInstructor(v.instructor); setVenue(v.venue); setCompare(v.compare); setDrill(null); setFlash(`Applied “${v.name}”.`)
  }

  const kpis = tab === 'revenue'
    ? [['Revenue (ex VAT)', money(rev.total), deltaPct(rev.total, rev.prevTotal)], ['Invoices raised', String(rev.count), undefined], ['Average invoice', money(rev.count ? rev.total / rev.count : 0), undefined]]
    : tab === 'util' ? [['Seat fill', `${util.fill}%`, util.fill - util.prevFill], ['Sessions', String(util.sessions), undefined], ['Seats booked', `${util.taken} of ${util.cap}`, undefined]]
    : tab === 'attend' ? [['Enrolments', String(att.enrolled), undefined], ['Attendance', `${att.attendance}%`, undefined], ['Completion', `${att.completion}%`, undefined]]
    : tab === 'profit' ? [['Revenue', money(prof.revenue), undefined], ['Profit', money(prof.profit), deltaPct(prof.profit, prof.prevProfit)], ['Margin', `${prof.margin}%`, undefined]]
    : [['Client revenue', money(cli.total), undefined], ['Active clients', String(cli.table.rows.filter(r => Number(r[1]) > 0).length), undefined], ['Clients listed', String(cli.table.rows.length), undefined]]

  return (
    <>
      <PageHeader id="reports" title="Reports" subtitle="Revenue, utilisation, attendance and profitability. Costs are illustrative." actions={<Button onClick={exportCsv}>Export CSV</Button>} />
      <Tabs tabs={TABS} value={tab} onChange={changeTab} />
      <Card>
        <div className="form c2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <FSelect label="Date range" value={preset} onChange={v => { setPreset(v); setDrill(null) }} options={PRESETS.map(p => ({ value: p.id, label: p.label }))} />
          <FSelect label="Client" value={org} onChange={setOrg} placeholder="All clients" options={d.orgs.map(o => ({ value: o.id, label: o.name }))} />
          <FSelect label="Course category" value={cat} onChange={setCat} placeholder="All categories" options={cats.map(c => ({ value: c, label: c }))} />
          <FSelect label="Instructor" value={instructor} onChange={setInstructor} placeholder="All instructors" options={d.staff.filter(s => s.role === 'instructor').map(s => ({ value: s.id, label: s.name }))} />
          <FSelect label="Venue" value={venue} onChange={setVenue} placeholder="All venues" options={venues.map(v => ({ value: v, label: v }))} />
          {tab === 'profit' && <FSelect label="Profitability by" value={by} onChange={v => setBy(v as 'category' | 'client')} options={[{ value: 'category', label: 'Course category' }, { value: 'client', label: 'Client' }]} />}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <label className="row" style={{ gap: 6 }}><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} /> Compare to previous period ({fmtDate(prev.from)} to {fmtDate(prev.to)})</label>
          <span className="muted small">Showing {fmtDate(range.from)} to {fmtDate(range.to)}. Instructor and venue apply to Utilisation and Attendance; client and category apply to all tabs except Utilisation (client).</span>
        </div>
      </Card>
      {flash && <div className="callout" role="status" style={{ marginBottom: 16 }}>{flash}</div>}
      <div className="grid c3" style={{ marginBottom: 20 }}>
        {kpis.map(([l, v, dl]) => <Kpi key={String(l)} label={String(l)} value={v} delta={typeof dl === 'number' && compare ? dl : undefined} hint={typeof dl === 'number' && compare ? 'vs previous period' : ''} />)}
      </div>
      <div className="grid c2">
        <Card title={`${TABS.find(x => x.id === tab)!.label}${tab === 'revenue' ? ` by ${rev.mode} (ex VAT)` : ''}`} actions={drill ? <Button size="small" onClick={() => setDrill(null)}>Clear drill-down</Button> : undefined}>
          {chart.length === 0 || table.rows.length === 0 ? <EmptyState title="No data for these filters" text="Try a wider date range or clear a filter." /> : (
            <div style={{ height: 320 }}>
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ bottom: tab === 'revenue' ? 0 : 40 }} onClick={(e: any) => { if (tab === 'revenue' && e?.activePayload?.[0]) setDrill(String(e.activePayload[0].payload.key)) }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey={xKey} fontSize={11} angle={tab === 'revenue' ? 0 : -30} textAnchor={tab === 'revenue' ? 'middle' : 'end'} interval={0} height={tab === 'revenue' ? 30 : 70} />
                  <YAxis fontSize={12} width={50} tickFormatter={v => (isPct ? `${v}%` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <Tooltip formatter={(v: number) => (isPct ? `${v}%` : money(v))} /><Legend verticalAlign="top" height={28} />
                  {keys.map((k, i) => <Bar key={k} dataKey={k} fill={colors[i]} radius={[4, 4, 0, 0]} cursor={tab === 'revenue' ? 'pointer' : undefined} />)}
                  {compare && <Bar dataKey="Previous" name="Previous period" fill={PALETTE.purple} fillOpacity={0.55} radius={[4, 4, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {tab === 'revenue' && <p className="muted small" style={{ margin: '4px 0 0' }}>Select a bar to drill into its invoices.</p>}
        </Card>
        <Card title="Saved report views">
          <div className="row" style={{ alignItems: 'flex-end', marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 180 }}><FText label="View name" value={viewName} onChange={setViewName} error={viewErr} placeholder="e.g. Cape Freight, last 90 days" /></div>
            <Button onClick={doSave}>Save current view</Button>
          </div>
          {views.length === 0 ? <EmptyState title="No saved views" text="Set filters, then save them here." /> : views.map(v => (
            <div key={v.id} className="mny-view">
              <div><b>{v.name}</b><div className="muted small">{TABS.find(t => t.id === v.tab)?.label} · {PRESETS.find(p => p.id === v.preset)?.label}{v.cat ? ` · ${v.cat}` : ''}{v.org ? ` · ${orgName(v.org)}` : ''}</div></div>
              <div className="row" style={{ gap: 6 }}><Button size="small" onClick={() => apply(v.id)}>Apply</Button><Button size="small" appearance="subtle" onClick={() => deleteView(v.id)} aria-label={`Delete view ${v.name}`}>Delete</Button></div>
            </div>
          ))}
        </Card>
      </div>
      <Card title={`Drill-down data${drill ? ' (selected period)' : ''}`} actions={<span className="muted small">{table.rows.length} rows</span>}>
        {table.rows.length === 0 ? <EmptyState title="No rows" /> : (
          <div className="tbl-wrap" style={{ maxHeight: 420, overflow: 'auto' }}><table className="tbl">
            <thead><tr>{table.head.map((h, i) => <th key={h} className={i > 0 && typeof table.rows[0][i] === 'number' ? 'num' : undefined}>{h}</th>)}</tr></thead>
            <tbody>{table.rows.map((r, ri) => (
              <tr key={ri}>{r.map((c, i) => <td key={i} className={typeof c === 'number' ? 'num' : undefined}>{typeof c === 'number' && MONEY_HEADS.test(table.head[i]) && !/%/.test(table.head[i]) ? money(c) : tab === 'revenue' && i === 1 ? fmtDate(String(c)) : String(c)}</td>)}</tr>
            ))}</tbody>
          </table></div>
        )}
        {tab === 'revenue' && compare && rev.prevTotal > 0 && <p className="small muted" style={{ marginTop: 10 }}>Previous period total {money(rev.prevTotal)}, <Delta pct={deltaPct(rev.total, rev.prevTotal)} /></p>}
      </Card>
    </>
  )
}
