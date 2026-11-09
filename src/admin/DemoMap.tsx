import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger } from '@fluentui/react-components'
import { AREAS, SCREENS, ROLE_LABEL, ROLES, canOpen, personaDef } from '../shared/access'
import { useStore } from '../shared/store'
import { PageHeader, Card, ReleaseBadge, EmptyState } from '../shared/ui'
import { FSelect, FText } from '../shared/fields'
import { navIcon } from '../shared/navIcons'
import type { Role } from '../shared/types'

export default function DemoMap() {
  const persona = useStore(s => s.persona)
  const setPersona = useStore(s => s.setPersona)
  const setNotice = useStore(s => s.setNotice)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [area, setArea] = useState('')
  const [role, setRole] = useState('')
  const [rel, setRel] = useState('')

  const list = useMemo(() => SCREENS.filter(s =>
    (!area || s.area === area) && (!role || s.roles.includes(role as Role)) && (!rel || s.release === rel)
    && (s.title + ' ' + s.why + ' ' + s.path).toLowerCase().includes(q.toLowerCase())), [q, area, role, rel])
  const openable = SCREENS.filter(s => canOpen(persona, s)).length

  const openAs = (path: string, r: Role) => { setPersona(r); setNotice(`Opened as ${personaDef(r).label} (${personaDef(r).name}).`); nav(path) }

  return (
    <>
      <PageHeader id="demo-map" title="Demo map" subtitle="Every screen in the demo. Opening one your current persona cannot use switches to a persona that can." />
      <div className="map-stat">
        <span className="chip">{SCREENS.length} screens</span>
        <span className="chip">{openable} open for the current persona</span>
        {(['R1', 'R2', 'R3'] as const).map(r => <span className="chip" key={r}><ReleaseBadge r={r} /> {SCREENS.filter(s => s.release === r).length}</span>)}
      </div>
      <Card>
        <div className="map-filters">
          <div style={{ minWidth: 220, flex: 1 }}><FText label="Search screens" value={q} onChange={setQ} placeholder="Name, path or description" /></div>
          <FSelect label="Area" value={area} onChange={setArea} placeholder="All areas" options={AREAS.map(a => ({ value: a, label: a }))} />
          <FSelect label="Role can open" value={role} onChange={setRole} placeholder="Any role" options={ROLES.map(r => ({ value: r, label: ROLE_LABEL[r] }))} />
          <FSelect label="Release" value={rel} onChange={setRel} placeholder="All releases" options={['R1', 'R2', 'R3'].map(r => ({ value: r, label: r }))} />
          <Button onClick={() => { setQ(''); setArea(''); setRole(''); setRel('') }}>Clear</Button>
        </div>
      </Card>
      {list.length === 0 ? <EmptyState title="No screens match" text="Try clearing a filter." /> : (
        <div className="grid c2">
          {AREAS.map(a => {
            const ss = list.filter(s => s.area === a)
            if (!ss.length) return null
            return (
              <Card key={a} title={`${a} (${ss.length})`}>
                <table className="tbl"><tbody>
                  {ss.map(s => {
                    const ok = canOpen(persona, s)
                    return (
                      <tr key={s.id}>
                        <td style={{ width: 28 }} aria-hidden>{navIcon(s.id)}</td>
                        <td>
                          <Link to={s.path}><b>{s.title}</b></Link> <ReleaseBadge r={s.release} />
                          <div className="chips" style={{ marginTop: 4 }}>{s.roles.length === 8 ? <span className="chip">Everyone</span> : s.roles.map(r => <span className="chip" key={r}>{ROLE_LABEL[r]}</span>)}</div>
                        </td>
                        <td className="small muted" style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
                          {ok ? 'You can open' : 'Will switch role'}
                          {s.roles.length < 8 && (
                            <Menu>
                              <MenuTrigger disableButtonEnhancement><Button size="small" appearance="subtle" aria-label={`Open ${s.title} as…`}>Open as…</Button></MenuTrigger>
                              <MenuPopover><MenuList>{s.roles.map(r => <MenuItem key={r} onClick={() => openAs(s.path, r)}>{ROLE_LABEL[r]} · {personaDef(r).name}</MenuItem>)}</MenuList></MenuPopover>
                            </Menu>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody></table>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
