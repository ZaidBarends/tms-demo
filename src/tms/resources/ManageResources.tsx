import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmptyState, Modal } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { useResources, type EquipRec, type VenueRec } from './registry'
import { addEquipmentBatch, deleteResource, saveEquipment, saveVenue, usage, type Kind } from './resourceActions'
import { parseBatch, peakDemand } from './stock'
import { today } from '../../shared/format'

type Draft = { kind: 'venue'; isNew: boolean; v: VenueRec } | { kind: 'equipment'; isNew: boolean; q: EquipRec }

const pill = (status: string) => <span className={`ops-pill ${status === 'Available' ? 'ok' : 'warn'}`}>{status}</span>

/** Administrator tools to add, edit, take out of service and delete venues and equipment. */
export default function ManageResources() {
  useStore(s => s.data) // re-render when sessions change so "in use" counts stay current
  const venues = useResources(s => s.venues)
  const equipment = useResources(s => s.equipment)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [err, setErr] = useState<Record<string, string>>({})
  const [del, setDel] = useState<{ kind: Kind; id: string; name: string } | null>(null)
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)
  const [batch, setBatch] = useState<string | null>(null)
  const sessions = useStore(s => s.data.sessions)
  const batchRows = batch === null ? [] : parseBatch(batch, equipment.map(x => x.name))
  const batchGood = batchRows.filter(r => r.errors.length === 0)
  const addBatch = () => { if (batch === null) return; const r = addEquipmentBatch(batch); setMsg({ text: `${r.added} equipment item${r.added === 1 ? '' : 's'} added.` }); setBatch(null) }

  const newVenue = () => { setErr({}); setDraft({ kind: 'venue', isNew: true, v: { id: '', name: '', city: '', seats: 12, status: 'Available', notes: '' } }) }
  const newEquip = () => { setErr({}); setDraft({ kind: 'equipment', isNew: true, q: { id: '', name: '', quantity: 1, status: 'Available', notes: '' } }) }
  const save = () => {
    if (!draft) return
    const e = draft.kind === 'venue' ? saveVenue(draft.v, draft.isNew) : saveEquipment(draft.q, draft.isNew)
    setErr(e); if (Object.keys(e).length) return
    const name = draft.kind === 'venue' ? draft.v.name : draft.q.name
    setMsg({ text: `${name.trim()} ${draft.isNew ? 'added' : 'saved'}.` }); setDraft(null)
  }
  const confirmDelete = () => {
    if (!del) return
    const m = deleteResource(del.kind, del.id)
    setMsg(m ? { text: m, bad: true } : { text: `${del.name} removed.` }); setDel(null)
  }
  const ask = (kind: Kind, r: { id: string; name: string }) => setDel({ kind, id: r.id, name: r.name })

  return (
    <>
      {msg && <div className="callout" role={msg.bad ? 'alert' : 'status'} style={{ marginBottom: 12, borderLeftColor: msg.bad ? '#c50f1f' : undefined }}>{msg.text}</div>}
      <div className="grid c2">
        <Card title={`Venues (${venues.length})`} actions={<Button size="small" appearance="primary" onClick={newVenue}>Add venue</Button>}>
          {venues.length === 0 ? <EmptyState title="No venues" text="Add a venue so sessions can be scheduled." /> : (
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Venue</th><th className="num">Seats</th><th>Status</th><th className="num">Upcoming</th><th /></tr></thead><tbody>
              {venues.map(v => (
                <tr key={v.id}><td><b>{v.name}</b><div className="small muted">{v.city}{v.notes ? ` · ${v.notes}` : ''}</div></td><td className="num">{v.seats}</td><td>{pill(v.status)}</td><td className="num">{usage('venue', v.name).sessions}</td>
                  <td><div className="row" style={{ gap: 4 }}><Button size="small" onClick={() => { setErr({}); setDraft({ kind: 'venue', isNew: false, v: { ...v } }) }}>Edit</Button><Button size="small" appearance="subtle" onClick={() => ask('venue', v)}>Delete</Button></div></td></tr>
              ))}
            </tbody></table></div>
          )}
        </Card>
        <Card title={`Equipment (${equipment.length})`} actions={<div className="row" style={{ gap: 6 }}><Button size="small" onClick={() => setBatch('')}>Add a batch</Button><Button size="small" appearance="primary" onClick={newEquip}>Add equipment</Button></div>}>
          {equipment.length === 0 ? <EmptyState title="No equipment" /> : (
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Item</th><th className="num">In stock</th><th>Status</th><th className="num">Upcoming</th><th /></tr></thead><tbody>
              {equipment.map(q => (
                <tr key={q.id}><td><b>{q.name}</b>{q.notes && <div className="small muted">{q.notes}</div>}</td><td className="num">{q.quantity > 0 ? <>{q.quantity}<div className="small muted">peak need {peakDemand(sessions, q.name, today()).units}</div></> : <span className="muted small">Not tracked</span>}</td><td>{pill(q.status)}</td><td className="num">{usage('equipment', q.name).sessions}</td>
                  <td><div className="row" style={{ gap: 4 }}><Button size="small" onClick={() => { setErr({}); setDraft({ kind: 'equipment', isNew: false, q: { ...q } }) }}>Edit</Button><Button size="small" appearance="subtle" onClick={() => ask('equipment', q)}>Delete</Button></div></td></tr>
              ))}
            </tbody></table></div>
          )}
        </Card>
      </div>
      <p className="muted small" style={{ marginTop: -8 }}>Instructors are managed under <Link to="/facilitators">Facilitators</Link>. Out-of-service resources cannot be chosen for new sessions, and sessions that already use one are flagged.</p>

      {draft && (
        <Modal open onClose={() => setDraft(null)} title={`${draft.isNew ? 'Add' : 'Edit'} ${draft.kind}`} actions={<Button appearance="primary" onClick={save}>{draft.isNew ? 'Add' : 'Save'}</Button>}>
          {draft.kind === 'venue' ? (
            <div className="form c2">
              <div style={{ gridColumn: '1 / -1' }}><FText label="Name" value={draft.v.name} onChange={x => setDraft({ ...draft, v: { ...draft.v, name: x } })} error={err.name} hint="A name starting with “Online” is never treated as a clash. Renaming updates every session that uses it." /></div>
              <FText label="City" value={draft.v.city} onChange={x => setDraft({ ...draft, v: { ...draft.v, city: x } })} />
              <FText label="Seats" type="number" min={1} value={draft.v.seats} onChange={x => setDraft({ ...draft, v: { ...draft.v, seats: Number(x) } })} error={err.seats} />
              <FSelect label="Status" value={draft.v.status} onChange={x => setDraft({ ...draft, v: { ...draft.v, status: x as VenueRec['status'] } })} options={['Available', 'Out of service'].map(x => ({ value: x, label: x }))} />
              <div style={{ gridColumn: '1 / -1' }}><FArea label="Notes" rows={2} value={draft.v.notes} onChange={x => setDraft({ ...draft, v: { ...draft.v, notes: x } })} /></div>
            </div>
          ) : (
            <div className="form c2">
              <div style={{ gridColumn: '1 / -1' }}><FText label="Name" value={draft.q.name} onChange={x => setDraft({ ...draft, q: { ...draft.q, name: x } })} error={err.name} hint="Renaming updates every session that uses it." /></div>
              <FText label="Units in stock" type="number" min={0} value={draft.q.quantity} onChange={x => setDraft({ ...draft, q: { ...draft.q, quantity: Number(x) } })} error={err.quantity} hint="For a batch such as 16 laptops. Sessions on the same day clash when they need more than this. 0 = not tracked." />
              <FSelect label="Status" value={draft.q.status} onChange={x => setDraft({ ...draft, q: { ...draft.q, status: x as EquipRec['status'] } })} options={['Available', 'Out of service'].map(x => ({ value: x, label: x }))} />
              <div style={{ gridColumn: '1 / -1' }}><FArea label="Notes" rows={2} value={draft.q.notes} onChange={x => setDraft({ ...draft, q: { ...draft.q, notes: x } })} /></div>
            </div>
          )}
        </Modal>
      )}
      {batch !== null && (
        <Modal open wide onClose={() => setBatch(null)} title="Add a batch of equipment" actions={<Button appearance="primary" disabled={batchGood.length === 0} onClick={addBatch}>Add {batchGood.length} item{batchGood.length === 1 ? '' : 's'}</Button>}>
          <p className="muted small" style={{ marginTop: 0 }}>Paste one item per line as <code>name, quantity</code>, for example <code>Loan laptops, 16</code>. The quantity is how many units you hold; leave it off for one. Nothing is added until you confirm, and existing items are left alone (use Edit to change their stock).</p>
          <label htmlFor="eq-batch" className="small muted">Items</label>
          <textarea id="eq-batch" rows={6} value={batch} onChange={e => setBatch(e.target.value)} placeholder={['Loan laptops, 16', 'Flip chart stands, 8', 'Wireless microphones, 4'].join('\n')}
            style={{ width: '100%', font: 'inherit', padding: 8, boxSizing: 'border-box', background: 'var(--card)', color: 'inherit', border: '1px solid var(--line)', borderRadius: 6 }} />
          <div className="row" style={{ margin: '8px 0' }}><Button size="small" onClick={() => setBatch(['Loan laptops 2, 10', 'Flip chart stands, 8', 'Wireless microphones, 4', 'Name only'].join('\n'))}>Use an example</Button></div>
          {batchRows.length > 0 && (
            <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Line</th><th>Item</th><th className="num">Quantity</th><th>Check</th></tr></thead><tbody>
              {batchRows.map(r => <tr key={r.line}><td>{r.line}</td><td>{r.name}</td><td className="num">{r.quantity || ''}</td><td>{r.errors.length ? <span className="err">{r.errors.join('; ')}</span> : <span style={{ color: '#13a10e' }}>✓ Ready</span>}</td></tr>)}
            </tbody></table></div>
          )}
        </Modal>
      )}
      {del && (
        <Modal open onClose={() => setDel(null)} title={`Delete ${del.kind}`} actions={<Button appearance="primary" onClick={confirmDelete}>Delete</Button>}>
          <p>Delete <b>{del.name}</b>? Past sessions keep the name. This cannot be undone.</p>
          {(() => { const u = usage(del.kind, del.name); return u.sessions || u.quotes ? <div className="ops-warnbox" role="alert">It is still used by {u.sessions} upcoming session{u.sessions === 1 ? '' : 's'}{u.quotes ? ` and ${u.quotes} open quote${u.quotes === 1 ? '' : 's'}` : ''}, so it cannot be deleted yet. Mark it out of service instead.</div> : null })()}
        </Modal>
      )}
    </>
  )
}
