import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ToggleButton } from '@fluentui/react-components'
import { AREAS, PERSONAS, ROLES, ROLE_LABEL, SCREENS } from '../shared/access'
import type { Role } from '../shared/types'
import { PageHeader, Card, ReleaseBadge, EmptyState } from '../shared/ui'
import { useStore } from '../shared/store'
import { recruiterVisibleProfiles, ringfenceStats } from '../talent/ringfence'
import './admin.css'

function rulesFor(role: Role, d: ReturnType<typeof useStore.getState>['data']): string[] {
  const own = d.invoices.filter(i => i.orgId === 'o1').length
  switch (role) {
    case 'admin': return ['Sees every organisation, learner, invoice and audit entry.', 'Can open every Administrator and shared screen, and approves recruiters.', `Currently manages ${d.orgs.length} organisations and ${d.learners.length} learners.`]
    case 'finance': return ['Sees invoices, credit notes, payments and Workbook sync for all clients.', 'Cannot see the sales pipeline, needs analyses or course set-up.', `Currently ${d.invoices.filter(i => i.status !== 'Paid').length} unpaid invoices are in scope.`]
    case 'instructor': return ['Sees only sessions assigned to them, with class lists, attendance and results.', 'Shares the resource calendar so clashes are caught early.', 'Never sees invoices, quotes or pricing.']
    case 'client': return ['Sees only their own organisation (Cape Freight): bookings, learners and invoices.', 'Quotes in Draft are hidden; they can accept Sent quotes.', `Currently ${own} invoices and ${d.learners.filter(l => l.orgId === 'o1').length} learners are visible.`]
    case 'blearner': return ['Sees only their own enrolments, certificates and skills.', 'Employer-paid: never has a talent profile and is never visible to recruiters.', 'Cannot see any invoice or price.']
    case 'internal': return ['Sees only their own assigned learning.', 'Internal enrolments are excluded from recruiter search by code.', 'Cannot see money screens.']
    case 'b2c': {
      const s = ringfenceStats(d)
      return ['Sees only their own bookings, receipts, certificates and skills.', 'Can opt in to the talent pool; only self-paid enrolments feed the profile.', `${s.optedIn} learners are opted in today; they approve every introduction before contact details are shared.`]
    }
    case 'recruiter': {
      const s = ringfenceStats(d)
      return [`Sees ${recruiterVisibleProfiles(d).length} anonymised profiles (opted-in and self-paid only); ${s.excludedEnrolments} employer-paid or internal enrolments are hidden.`, 'Contact details appear only after the learner approves the introduction.', 'Every view and request is written to the audit log.']
    }
  }
}

export default function AccessRules() {
  const d = useStore(s => s.data)
  const [picked, setPicked] = useState<Role[]>(['client'])
  const toggle = (r: Role) => setPicked(p => (p.includes(r) ? p.filter(x => x !== r) : [...p, r]))
  return (
    <>
      <PageHeader id="access-rules" title="Access rules" subtitle="Simulate any role to see exactly what it can open. The demo’s navigation and route guards are generated from this registry." />
      <Card title="Simulate a role">
        <div className="mny-toggle-row" role="group" aria-label="Roles to simulate">
          {ROLES.map(r => <ToggleButton key={r} checked={picked.includes(r)} onClick={() => toggle(r)} size="small">{ROLE_LABEL[r]}</ToggleButton>)}
        </div>
        <p className="muted small">Select one or more roles to compare them side by side.</p>
        {picked.length === 0 ? <EmptyState title="Pick a role" text="Choose a role above to list its screens and data rules." /> : (
          <div className="adm-sim">
            {picked.map(r => {
              const open = SCREENS.filter(s => s.roles.includes(r))
              const home = PERSONAS.find(p => p.id === r)
              return (
                <section key={r} className="card" style={{ marginBottom: 0 }} aria-label={`${ROLE_LABEL[r]} simulation`}>
                  <h3 className="card-title">{ROLE_LABEL[r]}</h3>
                  <div className="muted small">{open.length} of {SCREENS.length} screens · {open.filter(s => s.nav).length} in the menu · home {home?.home}</div>
                  <h4 className="adm-area">Data visibility</h4>
                  <ul style={{ margin: '0 0 6px', paddingLeft: 18, lineHeight: 1.6, fontSize: 13 }}>{rulesFor(r, d).map(t => <li key={t}>{t}</li>)}</ul>
                  {AREAS.map(a => {
                    const ss = open.filter(s => s.area === a)
                    if (!ss.length) return null
                    return (
                      <div key={a}>
                        <h4 className="adm-area">{a} ({ss.length})</h4>
                        {ss.map(s => (
                          <div key={s.id} className="adm-screen">
                            <span><Link to={s.path.replace(/\/:.*$/, '')}>{s.title}</Link> {s.release !== 'R1' && <ReleaseBadge r={s.release} />}</span>
                            <span className="muted small">{s.nav ? 'menu' : 'linked'}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                  <h4 className="adm-area">Cannot open ({SCREENS.length - open.length})</h4>
                  <div className="muted small">{SCREENS.filter(s => !s.roles.includes(r)).map(s => s.title).join(', ') || 'Nothing is blocked'}</div>
                </section>
              )
            })}
          </div>
        )}
      </Card>
      <Card title="Role against area">
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Area</th>{ROLES.map(r => <th key={r}>{ROLE_LABEL[r]}</th>)}</tr></thead>
          <tbody>{AREAS.map(a => {
            const ss = SCREENS.filter(s => s.area === a)
            return <tr key={a}><td><b>{a}</b></td>{ROLES.map(r => {
              const n = ss.filter(s => s.roles.includes(r)).length
              return <td key={r}>{n === 0 ? <span className="muted">–</span> : n === ss.length ? <b>All</b> : `${n} of ${ss.length}`}</td>
            })}</tr>
          })}</tbody>
        </table></div>
      </Card>
      <Card title="Role against screen">
        <div className="tbl-wrap"><table className="tbl">
          <thead><tr><th>Screen</th>{ROLES.map(r => <th key={r}>{ROLE_LABEL[r]}</th>)}</tr></thead>
          <tbody>{SCREENS.map(s => <tr key={s.id}><td>{s.title}</td>{ROLES.map(r => <td key={r} aria-label={s.roles.includes(r) ? 'Allowed' : 'Not allowed'}>{s.roles.includes(r) ? '✓' : <span className="muted">–</span>}</td>)}</tr>)}</tbody>
        </table></div>
      </Card>
      <Card title="Data rules">
        <ul style={{ lineHeight: 1.9 }}>
          <li>Clients see only their own organisation’s bookings, learners, quotes (not drafts) and invoices.</li>
          <li>Learners see only their own enrolments, certificates and skills.</li>
          <li>Recruiters see anonymised, opted-in, self-paid profiles only. Employer-paid enrolments never reach them.</li>
          <li>Contact details are released only after the learner approves an introduction.</li>
          <li>Every recruiter view and request is written to the audit log.</li>
        </ul>
      </Card>
    </>
  )
}
