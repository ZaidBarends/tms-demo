import { useState } from 'react'
import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmptyState } from '../../shared/ui'
import { FSelect, FText } from '../../shared/fields'
import { addDays, fmtDate, today } from '../../shared/format'
import { useLms } from '../lmsStore'
import { downloadCsv } from '../csv'
import { cellStatus, compliancePct, staffLearners, teamKey, teamName, type Cell } from './logic'

const LABEL: Record<Cell, string> = { complete: 'Done', progress: 'In progress', assigned: 'Assigned', overdue: 'Overdue', none: '–' }

export default function Matrix({ onNudge }: { onNudge: (enrolId: string) => void }) {
  const d = useStore(s => s.data)
  const assign = useStore(s => s.assign)
  const { mandatory, toggleMandatory } = useLms()
  const [team, setTeam] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const on = today()
  const staff = staffLearners(d)
  const teams = Array.from(new Set(staff.map(teamKey)))
  const people = staff.filter(l => (!team || teamKey(l) === team) && l.name.toLowerCase().includes(q.toLowerCase()))
  const courses = mandatory.map(code => d.courses.find(c => c.code === code)).filter(Boolean) as typeof d.courses
  const ids = courses.map(c => c.id)

  const exportCsv = () => downloadCsv('compliance-matrix.csv', [
    ['Learner', 'Team', ...courses.map(c => c.code), 'Compliance %'],
    ...people.map(l => [l.name, teamName(d, teamKey(l)), ...courses.map(c => LABEL[cellStatus(d.enrolments, l.id, c.id, on).status]), compliancePct(d.enrolments, l.id, ids)]),
  ])

  return (
    <Card title="Compliance matrix" actions={<Button size="small" onClick={exportCsv} disabled={!people.length}>Export CSV</Button>}>
      <div className="form c2" style={{ alignItems: 'end', marginBottom: 12 }}>
        <FText label="Find a learner" value={q} onChange={setQ} placeholder="Type a name" />
        <FSelect label="Team" value={team} onChange={setTeam} placeholder="All teams" options={teams.map(t => ({ value: t, label: teamName(d, t) }))} />
      </div>
      <div className="chips" role="group" aria-label="Mandatory courses" style={{ marginBottom: 10 }}>
        <span className="small muted" style={{ alignSelf: 'center' }}>Mandatory courses:</span>
        {d.courses.filter(c => c.status === 'Active' && ['Health & Safety', 'Compliance', 'Cybersecurity'].includes(c.category)).map(c => (
          <Button key={c.id} size="small" appearance={mandatory.includes(c.code) ? 'primary' : 'outline'} aria-pressed={mandatory.includes(c.code)} onClick={() => toggleMandatory(c.code)}>{c.code}</Button>
        ))}
      </div>
      <div className="lms-legend" aria-label="Legend">{(['complete', 'progress', 'assigned', 'overdue', 'none'] as Cell[]).map(k => <span key={k}><i className={`lms-cell ${k}`} />{k === 'none' ? 'Not assigned' : LABEL[k]}</span>)}</div>
      {msg && <div className="callout" role="status" style={{ margin: '8px 0' }}>{msg}</div>}
      {courses.length === 0 ? <EmptyState title="No mandatory courses selected" text="Pick at least one course above." /> : people.length === 0 ? <EmptyState title="No learners match" /> : (
        <div className="tbl-wrap"><table className="tbl lms-matrix">
          <thead><tr><th>Learner</th>{courses.map(c => <th key={c.id} title={c.title}>{c.code}</th>)}<th className="num">Compliant</th></tr></thead>
          <tbody>
            {people.map(l => (
              <tr key={l.id}>
                <td><b>{l.name}</b><div className="small muted">{teamName(d, teamKey(l))}</div></td>
                {courses.map(c => {
                  const { status, e } = cellStatus(d.enrolments, l.id, c.id, on)
                  return (
                    <td key={c.id}>
                      <Menu>
                        <MenuTrigger disableButtonEnhancement><button className={`lms-cell-btn ${status}`} aria-label={`${l.name}, ${c.code}: ${status === 'none' ? 'not assigned' : LABEL[status]}`}>{LABEL[status]}</button></MenuTrigger>
                        <MenuPopover><MenuList>
                          {status === 'none' && <MenuItem onClick={() => { assign([l.id], c.id, addDays(on, 30)); setMsg(`${c.title} assigned to ${l.name}, due ${fmtDate(addDays(on, 30))}.`) }}>Assign, due in 30 days</MenuItem>}
                          {status === 'overdue' && e && <MenuItem onClick={() => onNudge(e.id)}>Send nudge</MenuItem>}
                          {e && <MenuItem disabled>{e.progress}% done{e.deadline ? `, due ${fmtDate(e.deadline)}` : ''}</MenuItem>}
                        </MenuList></MenuPopover>
                      </Menu>
                    </td>
                  )
                })}
                <td className="num"><b>{compliancePct(d.enrolments, l.id, ids)}%</b></td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td><b>Team coverage</b></td>{courses.map(c => <td key={c.id}><b>{Math.round((people.filter(l => cellStatus(d.enrolments, l.id, c.id, on).status === 'complete').length / people.length) * 100)}%</b></td>)}<td /></tr></tfoot>
        </table></div>
      )}
    </Card>
  )
}
