import { useMemo, useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Card, EmptyState } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { money, today } from '../shared/format'
import { toCsv } from '../tms/money/calc'
import { downloadCsv } from '../tms/money/actions'
import { Tabs } from '../tms/money/ui'
import { orgMetrics, people } from './adminData'
import type { PersonKind } from './adminData'
import OrgDrawer from './OrgDrawer'
import type { Selection } from './OrgDrawer'
import './admin.css'

const KINDS: PersonKind[] = ['Client contact', 'B2B learner', 'Internal learner', 'B2C learner', 'Administrator', 'Finance', 'Instructor', 'Recruiter']

export default function Orgs() {
  const d = useStore(s => s.data)
  const [tab, setTab] = useState('orgs')
  const [q, setQ] = useState(''); const [sector, setSector] = useState(''); const [kind, setKind] = useState(''); const [org, setOrg] = useState('')
  const [sel, setSel] = useState<Selection>(null)
  const [flash, setFlash] = useState('')
  const needle = q.trim().toLowerCase()

  const orgs = useMemo(() => d.orgs.filter(o => (!sector || o.sector === sector) && (!needle || `${o.name} ${o.sector} ${o.city}`.toLowerCase().includes(needle))), [d, sector, needle])
  const all = useMemo(() => people(d), [d])
  const list = useMemo(() => all.filter(p => (!kind || p.kind === kind) && (!org || p.orgId === org) && (!needle || `${p.name} ${p.email} ${p.org}`.toLowerCase().includes(needle))), [all, kind, org, needle])

  const exportCsv = () => {
    if (tab === 'orgs') {
      downloadCsv(`organisations-${today()}.csv`, toCsv([['Organisation', 'Sector', 'City', 'Staff', 'Contacts', 'Learners', 'Spend incl VAT', 'Open invoices', 'Overdue'], ...orgs.map(o => { const m = orgMetrics(d, o.id); return [o.name, o.sector, o.city, o.staff, m.contacts, m.learners, Math.round(m.spend), m.openInvoices, m.overdue] })]))
      setFlash(`Exported ${orgs.length} organisations.`)
    } else {
      downloadCsv(`people-${today()}.csv`, toCsv([['Name', 'Role', 'Organisation', 'Email', 'Phone', 'Detail'], ...list.map(p => [p.name, p.kind, p.org, p.email, p.phone, p.note])]))
      setFlash(`Exported ${list.length} people.`)
    }
  }
  const clear = () => { setQ(''); setSector(''); setKind(''); setOrg('') }

  return (
    <>
      <PageHeader id="orgs" title="Organisations and users" subtitle="Clients, their contacts and learners, internal staff and recruiters" actions={<Button onClick={exportCsv}>Export CSV</Button>} />
      <Tabs tabs={[{ id: 'orgs', label: `Organisations (${d.orgs.length})` }, { id: 'people', label: `People (${all.length})` }]} value={tab} onChange={t => { setTab(t); setFlash('') }} />
      <Card>
        <div className="mny-filters" style={{ marginBottom: 0 }}>
          <FText label="Search" value={q} onChange={setQ} placeholder={tab === 'orgs' ? 'Name, sector or city' : 'Name, email or organisation'} />
          {tab === 'orgs' && <FSelect label="Sector" value={sector} onChange={setSector} placeholder="All sectors" options={Array.from(new Set(d.orgs.map(o => o.sector))).map(s => ({ value: s, label: s }))} />}
          {tab === 'people' && <FSelect label="Role" value={kind} onChange={setKind} placeholder="All roles" options={KINDS.map(k => ({ value: k, label: k }))} />}
          {tab === 'people' && <FSelect label="Organisation" value={org} onChange={setOrg} placeholder="All organisations" options={d.orgs.map(o => ({ value: o.id, label: o.name }))} />}
          <Button appearance="subtle" onClick={clear}>Clear</Button>
        </div>
      </Card>
      {flash && <div className="callout" role="status" style={{ marginBottom: 16 }}>{flash}</div>}

      {tab === 'orgs' && (orgs.length === 0 ? <EmptyState title="No organisations match" action={<Button onClick={clear}>Clear filters</Button>} /> : (
        <div className="adm-cards">
          {orgs.map(o => {
            const m = orgMetrics(d, o.id)
            return (
              <button key={o.id} className="adm-org" onClick={() => setSel({ kind: 'org', id: o.id })} aria-label={`Open ${o.name}`}>
                <div><h3>{o.name}</h3><span className="muted small">{o.sector} · {o.city}</span></div>
                <div className="adm-metrics">
                  <div><b>{o.staff}</b>staff</div><div><b>{m.contacts}</b>contacts</div><div><b>{m.learners}</b>learners</div>
                  <div><b>{money(Math.round(m.spend / 1000) * 1000)}</b>spend</div><div><b>{m.openInvoices}</b>open invoices</div><div><b style={{ color: m.overdue ? '#c50f1f' : undefined }}>{m.overdue}</b>overdue</div>
                </div>
              </button>
            )
          })}
        </div>
      ))}

      {tab === 'people' && (
        <Card title={`${list.length} ${list.length === 1 ? 'person' : 'people'}`}>
          {list.length === 0 ? <EmptyState title="No people match" action={<Button onClick={clear}>Clear filters</Button>} /> : (
            <div className="tbl-wrap"><table className="tbl">
              <thead><tr><th>Name</th><th>Role</th><th>Organisation</th><th>Email</th><th>Detail</th></tr></thead>
              <tbody>{list.map(p => (
                <tr key={p.key} className="mny-tr" onClick={() => setSel({ kind: 'person', id: p.key })}>
                  <td><button className="mny-th" onClick={e => { e.stopPropagation(); setSel({ kind: 'person', id: p.key }) }} aria-label={`Open ${p.name}`}>{p.name}</button></td>
                  <td>{p.kind}</td><td>{p.org}</td><td>{p.email}</td><td className="muted small">{p.note}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      )}
      <OrgDrawer sel={sel} onClose={() => setSel(null)} />
    </>
  )
}
