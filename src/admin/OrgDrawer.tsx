import { useState } from 'react'
import { useStore } from '../shared/store'
import { EmptyState, Progress, Status } from '../shared/ui'
import { clientName, invTotal } from '../shared/calc'
import { fmtDate, fmtDateTime, money } from '../shared/format'
import { SideDrawer, Tabs, Timeline } from '../tms/money/ui'
import { balanceOf } from '../tms/money/calc'
import { Button } from '@fluentui/react-components'
import { orgMetrics, people } from './adminData'
import type { Person } from './adminData'
import { blockers } from './UserDialogs'
import type { Data, Enrolment } from '../shared/types'
import './admin.css'

export type Selection = { kind: 'org' | 'person'; id: string } | null

const EnrolTable = ({ d, rows }: { d: Data; rows: Enrolment[] }) => rows.length === 0 ? <EmptyState title="No enrolments" /> : (
  <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Learner</th><th>Course</th><th>Status</th><th>Progress</th></tr></thead><tbody>
    {rows.map(e => <tr key={e.id}><td>{d.learners.find(l => l.id === e.learnerId)?.name}</td><td>{d.courses.find(c => c.id === e.courseId)?.title}</td><td><Status s={e.status} /></td><td style={{ width: 110 }}><Progress value={e.progress} /></td></tr>)}
  </tbody></table></div>
)

export default function OrgDrawer({ sel, onClose, onEdit, onRemove }: { sel: Selection; onClose: () => void; onEdit?: (p: Person) => void; onRemove?: (p: Person) => void }) {
  const d = useStore(s => s.data)
  const [tab, setTab] = useState('overview')
  const close = () => { setTab('overview'); onClose() }
  if (!sel) return <SideDrawer open={false} onClose={onClose} title="">{null}</SideDrawer>

  if (sel.kind === 'org') {
    const o = d.orgs.find(x => x.id === sel.id)
    if (!o) return <SideDrawer open={false} onClose={onClose} title="">{null}</SideDrawer>
    const m = orgMetrics(d, o.id)
    const invs = d.invoices.filter(i => i.orgId === o.id)
    const acts = d.activity.filter(a => a.text.includes(o.name) || invs.some(i => a.text.includes(i.number)))
    const opps = d.opportunities.filter(p => p.orgId === o.id)
    return (
      <SideDrawer open onClose={close} size="large" title={o.name} subtitle={`${o.sector} · ${o.city} · about ${o.staff} staff`}>
        <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'people', label: `People (${m.contacts + m.learners})` }, { id: 'enrol', label: `Enrolments (${m.enrolments})` }, { id: 'inv', label: `Invoices (${invs.length})` }, { id: 'act', label: 'Activity' }]} />
        {tab === 'overview' && (
          <>
            <dl className="mny-kv">
              <dt>Lifetime spend (incl. VAT)</dt><dd>{money(m.spend)}</dd><dt>Open invoices</dt><dd>{m.openInvoices} ({money(m.openValue)})</dd><dt>Overdue</dt><dd>{m.overdue}</dd>
              <dt>Learners</dt><dd>{m.learners}</dd><dt>Contacts</dt><dd>{m.contacts}</dd><dt>Quotes</dt><dd>{d.quotes.filter(q => q.orgId === o.id).length}</dd>
            </dl>
            <h3 className="card-title">Pipeline</h3>
            {opps.length === 0 ? <EmptyState title="No opportunities" /> : <table className="tbl"><tbody>{opps.map(p => <tr key={p.id}><td>{p.title}</td><td className="num">{money(p.value)}</td><td style={{ textTransform: 'capitalize' }}>{p.stage}</td></tr>)}</tbody></table>}
          </>
        )}
        {tab === 'people' && (
          <table className="tbl"><thead><tr><th>Name</th><th>Role</th><th>Email</th></tr></thead><tbody>
            {d.contacts.filter(c => c.orgId === o.id).map(c => <tr key={c.id}><td>{c.name}</td><td>Client contact <span className="muted small">({c.title})</span></td><td>{c.email}</td></tr>)}
            {d.learners.filter(l => l.orgId === o.id).map(l => <tr key={l.id}><td>{l.name}</td><td>Learner (employer-paid)</td><td>{l.email}</td></tr>)}
          </tbody></table>
        )}
        {tab === 'enrol' && <EnrolTable d={d} rows={d.enrolments.filter(e => e.orgId === o.id)} />}
        {tab === 'inv' && (invs.length === 0 ? <EmptyState title="No invoices" /> : (
          <table className="tbl"><thead><tr><th>Invoice</th><th>Due</th><th className="num">Total</th><th className="num">Balance</th><th>Status</th></tr></thead><tbody>
            {invs.map(i => <tr key={i.number}><td>{i.number}</td><td>{fmtDate(i.due)}</td><td className="num">{money(invTotal(i))}</td><td className="num">{money(balanceOf(i))}</td><td><Status s={i.status} /></td></tr>)}
          </tbody></table>
        ))}
        {tab === 'act' && (acts.length === 0 ? <EmptyState title="No recorded activity" /> : <Timeline items={acts.map(a => ({ id: a.id, at: a.at, text: a.text, meta: fmtDateTime(a.at) }))} />)}
      </SideDrawer>
    )
  }

  const p = people(d).find(x => x.key === sel.id)
  if (!p) return <SideDrawer open={false} onClose={onClose} title="">{null}</SideDrawer>
  const isLearner = p.source === 'learner'
  const enrols = isLearner ? d.enrolments.filter(e => e.learnerId === p.id) : []
  const certs = isLearner ? d.certificates.filter(c => c.learnerId === p.id) : []
  const invs = p.source === 'contact' ? d.invoices.filter(i => i.orgId === p.orgId) : isLearner ? d.invoices.filter(i => i.learnerId === p.id) : []
  const receipts = isLearner ? d.receipts.filter(r => r.learnerId === p.id) : []
  const first = p.name.split(' ')[0]
  const acts = [
    ...d.activity.filter(a => a.text.includes(p.name)).map(a => ({ id: a.id, at: a.at, text: a.text })),
    ...d.audit.filter(a => a.actor.includes(p.name) || a.target.includes(p.name)).map(a => ({ id: a.id, at: a.at, text: `${a.action}: ${a.detail}` })),
    ...d.sent.filter(m => m.to === p.email).map(m => ({ id: m.id, at: m.at, text: `Email sent: ${m.subject}` })),
  ].sort((a, b) => b.at.localeCompare(a.at))
  const sessionsTaught = p.source === 'staff' ? d.sessions.filter(s => s.instructorId === p.id) : []
  const intros = p.source === 'recruiter' ? d.intros.filter(i => i.recruiterId === p.id) : []

  return (
    <SideDrawer open onClose={close} size="large"
      title={<span><span className="adm-avatar" aria-hidden>{first.slice(0, 1)}</span>{p.name}</span>} subtitle={`${p.kind} · ${p.org} · ${p.email}`}>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'enrol', label: `Enrolments (${enrols.length})` }, { id: 'cert', label: `Certificates (${certs.length})` }, { id: 'inv', label: `Invoices (${invs.length + receipts.length})` }, { id: 'act', label: 'Activity' }]} />
      {tab === 'overview' && (
        <>
          <dl className="mny-kv"><dt>Role</dt><dd>{p.kind}</dd><dt>Organisation</dt><dd>{p.org}</dd><dt>Email</dt><dd>{p.email}</dd><dt>Phone</dt><dd>{p.phone}</dd><dt>Detail</dt><dd>{p.note}</dd>
            {isLearner && <><dt>Enrolments</dt><dd>{enrols.length}</dd><dt>Certificates</dt><dd>{certs.length}</dd></>}
            {sessionsTaught.length > 0 && <><dt>Sessions assigned</dt><dd>{sessionsTaught.length}</dd></>}
            {p.source === 'recruiter' && <><dt>Introduction requests</dt><dd>{intros.length}</dd></>}</dl>
          {(onEdit || onRemove) && <div className="row" style={{ margin: '12px 0' }}>{onEdit && <Button onClick={() => onEdit(p)}>Edit user</Button>}{onRemove && <Button appearance="subtle" onClick={() => onRemove(p)}>{blockers(d, p).length ? 'Remove user…' : 'Remove user'}</Button>}</div>}
          {p.source === 'recruiter' && <div className="callout">Recruiters only ever see anonymised, opted-in, self-paid profiles. Contact details are released after a learner approves an introduction.</div>}
          {p.source === 'learner' && p.kind === 'B2B learner' && <div className="callout">Employer-paid learner: invoiced to {p.org}, never visible to recruiters.</div>}
        </>
      )}
      {tab === 'enrol' && (isLearner ? <EnrolTable d={d} rows={enrols} /> : <EmptyState title="Not a learner" text={sessionsTaught.length ? `${sessionsTaught.length} sessions are assigned to this person.` : 'This person has no enrolments.'} />)}
      {tab === 'cert' && (certs.length === 0 ? <EmptyState title="No certificates" /> : (
        <table className="tbl"><thead><tr><th>Certificate</th><th>Course</th><th>Issued</th><th>Expires</th></tr></thead><tbody>
          {certs.map(c => <tr key={c.id}><td>{c.id}</td><td>{d.courses.find(x => x.id === c.courseId)?.title}</td><td>{fmtDate(c.issued)}</td><td>{fmtDate(c.expires)}</td></tr>)}
        </tbody></table>
      ))}
      {tab === 'inv' && (invs.length + receipts.length === 0 ? <EmptyState title="No invoices or receipts" text={p.kind === 'B2B learner' ? 'Employer-paid: invoiced to the organisation.' : undefined} /> : (
        <table className="tbl"><thead><tr><th>Document</th><th>Detail</th><th className="num">Total</th><th>Status</th></tr></thead><tbody>
          {invs.map(i => <tr key={i.number}><td>{i.number}</td><td>{clientName(d, i)}: {i.description}</td><td className="num">{money(invTotal(i))}</td><td><Status s={i.status} /></td></tr>)}
          {receipts.map(r => <tr key={r.id}><td>{r.id}</td><td>{d.courses.find(c => c.id === r.courseId)?.title} ({r.method})</td><td className="num">{money(r.amount)}</td><td><Status s="Paid" /></td></tr>)}
        </tbody></table>
      ))}
      {tab === 'act' && (acts.length === 0 ? <EmptyState title="No recorded activity" /> : <Timeline items={acts.map(a => ({ ...a, meta: fmtDateTime(a.at) }))} />)}
    </SideDrawer>
  )
}
