import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, EmailPreview, EmptyState, Status } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { fmtDateTime, fmtDate } from '../shared/format'
import { GRID, PALETTE, toCsv } from './money/calc'
import { Kpi, Tabs } from './money/ui'
import { useMoney } from './money/store'
import { CampaignComposer, TemplateEditor, useTemplates } from './money/CommsParts'
import { SAMPLE, deliveryStats, engagement, fillMerge } from './money/commsLogic'
import { downloadCsv } from './money/actions'

const TABS = [{ id: 'templates', label: 'Templates' }, { id: 'campaigns', label: 'Campaigns' }, { id: 'delivery', label: 'Delivery stats' }, { id: 'log', label: 'Sent log' }]
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export default function Comms() {
  const d = useStore(s => s.data)
  const templates = useTemplates()
  const campaigns = useMoney(s => s.campaigns)
  const upsert = useMoney(s => s.upsertCampaign)
  const remove = useMoney(s => s.removeCampaign)
  const [tab, setTab] = useState('templates')
  const [flash, setFlash] = useState('')
  const [q, setQ] = useState(''); const [tf, setTf] = useState(''); const [ef, setEf] = useState(''); const [days, setDays] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const sentCamps = campaigns.filter(c => c.status === 'Sent')
  const tot = sentCamps.reduce((a, c) => ({ s: a.s + c.sent, o: a.o + c.opened, c: a.c + c.clicked, b: a.b + c.bounced }), { s: 0, o: 0, c: 0, b: 0 })
  const tplName = (id: string) => templates.find(t => t.id === id)?.name ?? (id === 'pay' ? 'Payment reminder' : 'Custom message')
  const log = d.sent.filter(m => {
    if (q.trim() && !`${m.to} ${m.subject}`.toLowerCase().includes(q.trim().toLowerCase())) return false
    if (tf && m.templateId !== tf) return false
    if (ef && engagement(m.id) !== ef) return false
    if (days && Date.now() - new Date(m.at).getTime() > Number(days) * 864e5) return false
    return true
  })
  const msg = d.sent.find(m => m.id === open)
  const msgTpl = msg ? templates.find(t => t.id === msg.templateId) : undefined
  const first = msg?.to.split('@')[0].split('.')[0] ?? 'there'
  const exportLog = () => { downloadCsv('sent-log.csv', toCsv([['When', 'To', 'Template', 'Subject', 'Engagement'], ...log.map(m => [m.at, m.to, tplName(m.templateId), m.subject, engagement(m.id)])])); setFlash(`Exported ${log.length} messages.`) }

  return (
    <>
      <PageHeader id="comms" title="Communications" subtitle="Templates, campaigns, delivery statistics and the sent log" />
      <Tabs tabs={TABS} value={tab} onChange={t => { setTab(t); setFlash('') }} />
      {flash && <div className="callout" role="status" style={{ marginBottom: 16 }}>{flash}</div>}

      {tab === 'templates' && <TemplateEditor />}

      {tab === 'campaigns' && (
        <div className="grid c2">
          <CampaignComposer onDone={setFlash} />
          <Card title="Campaigns">
            {campaigns.length === 0 ? <EmptyState title="No campaigns yet" text="Compose one on the left." /> : (
              <div className="tbl-wrap"><table className="tbl">
                <thead><tr><th>Campaign</th><th>Audience</th><th>When</th><th>Status</th><th /></tr></thead>
                <tbody>{campaigns.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}<div className="muted small">{tplName(c.templateId)} · {c.recipients} recipients</div></td><td className="small">{c.audience}</td><td className="small">{fmtDateTime(c.at)}</td>
                    <td>{c.status === 'Sent' ? <Status s="Sent" /> : <Status s="Pending" />}{c.status === 'Scheduled' && <span className="muted small"> scheduled</span>}</td>
                    <td>{c.status === 'Scheduled' && <div className="row" style={{ gap: 4 }}>
                      <Button size="small" onClick={() => { upsert({ ...c, status: 'Sent', at: new Date().toISOString(), ...deliveryStats(c.recipients, c.recipients + 1) }); useStore.getState().log(`Campaign “${c.name}” sent`); setFlash(`“${c.name}” sent now.`) }}>Send now</Button>
                      <Button size="small" appearance="subtle" onClick={() => remove(c.id)}>Cancel</Button></div>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </Card>
        </div>
      )}

      {tab === 'delivery' && (
        <>
          <div className="grid c4" style={{ marginBottom: 20 }}>
            <Kpi label="Messages delivered" value={tot.s - tot.b} hint={`${sentCamps.length} campaigns`} />
            <Kpi label="Open rate" value={`${pct(tot.o, tot.s)}%`} hint="Illustrative figures" color={PALETTE.green} />
            <Kpi label="Click rate" value={`${pct(tot.c, tot.s)}%`} hint="Illustrative figures" color={PALETTE.purple} />
            <Kpi label="Bounced" value={tot.b} hint={`${pct(tot.b, tot.s)}% of sent`} />
          </div>
          <div className="grid c2">
            <Card title="Delivery by campaign">
              {sentCamps.length === 0 ? <EmptyState title="Nothing sent yet" /> : (
                <div style={{ height: 300 }}><ResponsiveContainer>
                  <BarChart data={sentCamps.map(c => ({ name: c.name.length > 16 ? c.name.slice(0, 15) + '…' : c.name, Sent: c.sent, Opened: c.opened, Clicked: c.clicked }))} margin={{ bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} /><XAxis dataKey="name" fontSize={11} angle={-25} textAnchor="end" interval={0} height={70} /><YAxis fontSize={12} width={30} allowDecimals={false} />
                    <Tooltip /><Legend verticalAlign="top" height={26} />
                    <Bar dataKey="Sent" fill={PALETTE.grey} radius={[4, 4, 0, 0]} /><Bar dataKey="Opened" fill={PALETTE.blue} radius={[4, 4, 0, 0]} /><Bar dataKey="Clicked" fill={PALETTE.green} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer></div>
              )}
            </Card>
            <Card title="Campaign performance">
              <table className="tbl"><thead><tr><th>Campaign</th><th className="num">Sent</th><th className="num">Opened</th><th className="num">Clicked</th></tr></thead><tbody>
                {sentCamps.map(c => <tr key={c.id}><td>{c.name}<div className="muted small">{fmtDate(c.at)}</div></td><td className="num">{c.sent}</td><td className="num">{c.opened} ({pct(c.opened, c.sent)}%)</td><td className="num">{c.clicked} ({pct(c.clicked, c.sent)}%)</td></tr>)}
              </tbody></table>
            </Card>
          </div>
        </>
      )}

      {tab === 'log' && (
        <Card title="Sent log" actions={<Button size="small" onClick={exportLog}>Export CSV</Button>}>
          <div className="mny-filters">
            <FText label="Search" value={q} onChange={setQ} placeholder="Recipient or subject" />
            <FSelect label="Template" value={tf} onChange={setTf} placeholder="All templates" options={templates.map(t => ({ value: t.id, label: t.name }))} />
            <FSelect label="Engagement" value={ef} onChange={setEf} placeholder="Any" options={['Clicked', 'Opened', 'Delivered', 'Bounced'].map(x => ({ value: x, label: x }))} />
            <FSelect label="Period" value={days} onChange={setDays} placeholder="All time" options={[{ value: '1', label: 'Last 24 hours' }, { value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }]} />
          </div>
          {log.length === 0 ? <EmptyState title="No messages match" action={<Button onClick={() => { setQ(''); setTf(''); setEf(''); setDays('') }}>Clear filters</Button>} /> : (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>When</th><th>Template</th><th>To</th><th>Subject</th><th>Engagement</th></tr></thead>
              <tbody>{log.slice(0, 60).map(m => (
                <tr key={m.id} className="mny-tr" onClick={() => setOpen(m.id)}>
                  <td>{fmtDateTime(m.at)}</td><td>{tplName(m.templateId)}</td><td>{m.to}</td>
                  <td><button className="mny-th" onClick={e => { e.stopPropagation(); setOpen(m.id) }}>{m.subject}</button></td>
                  <td><span className={`mny-pill ${engagement(m.id) === 'Bounced' ? 'bad' : ''}`}>{engagement(m.id)}</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
          {log.length > 60 && <p className="muted small">Showing the latest 60 of {log.length}. Export for the full list.</p>}
        </Card>
      )}
      <EmailPreview open={!!msg} onClose={() => setOpen(null)} to={msg?.to ?? ''} subject={msg?.subject ?? ''}
        body={fillMerge(msgTpl?.body ?? 'Hi {{name}},\n\nThis message was sent from the training platform.\n\nKind regards,\nThe training team', { ...SAMPLE, name: first.charAt(0).toUpperCase() + first.slice(1) })} />
    </>
  )
}
