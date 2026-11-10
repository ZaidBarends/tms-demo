import { useStore } from '../../shared/store'
import { today } from '../../shared/format'
import { useResources, type EquipRec, type VenueRec } from './registry'
import { parseBatch, peakDemand, type BatchRow } from './stock'

export type Kind = 'venue' | 'equipment'
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()
const uid = (p: string) => `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`
const names = (kind: Kind) => (kind === 'venue' ? useResources.getState().venues : useResources.getState().equipment).map(r => ({ id: r.id, name: r.name }))

/** Upcoming sessions (not cancelled) and open quotes that use the resource. Deleting is blocked while either exists. */
export function usage(kind: Kind, name: string) {
  const d = useStore.getState().data
  const sessions = d.sessions.filter(s => s.status === 'Scheduled' && s.start >= today() && (kind === 'venue' ? s.venue === name : s.equipment.includes(name))).length
  const quotes = kind === 'venue' ? d.quotes.filter(q => (q.status === 'Draft' || q.status === 'Sent') && q.venue === name).length : 0
  return { sessions, quotes }
}

/** Returns '' when the name is acceptable, otherwise the problem. */
export function checkName(kind: Kind, name: string, selfId?: string): string {
  const n = name.trim()
  if (n.length < 3) return 'Name must be at least 3 characters'
  if (names(kind).some(r => r.id !== selfId && same(r.name, n))) return `A ${kind} called “${n}” already exists`
  return ''
}

export function checkVenue(v: Pick<VenueRec, 'name' | 'seats'>, selfId?: string): Record<string, string> {
  const e: Record<string, string> = {}
  const m = checkName('venue', v.name, selfId); if (m) e.name = m
  if (!Number.isInteger(v.seats) || v.seats < 1) e.seats = 'Seats must be a whole number, at least 1'
  return e
}

/** Renames cascade to every session (and quote) that used the old name so nothing is orphaned. */
function renameEverywhere(kind: Kind, from: string, to: string) {
  if (from === to) return
  useStore.setState(s => {
    const data = structuredClone(s.data)
    data.sessions.forEach(x => { if (kind === 'venue') { if (x.venue === from) x.venue = to } else { x.equipment = x.equipment.map(e => e === from ? to : e); if (x.equipmentQty && from in x.equipmentQty) { x.equipmentQty = { ...x.equipmentQty, [to]: x.equipmentQty[from] }; delete x.equipmentQty[from] } } })
    if (kind === 'venue') data.quotes.forEach(q => { if (q.venue === from) q.venue = to })
    return { data }
  })
}

export function saveVenue(v: VenueRec, isNew: boolean): Record<string, string> {
  const e = checkVenue(v, isNew ? undefined : v.id); if (Object.keys(e).length) return e
  const st = useResources.getState(); const clean = { ...v, name: v.name.trim(), city: v.city.trim(), notes: v.notes.trim() }
  const old = st.venues.find(x => x.id === v.id)
  st.setVenues(isNew ? [...st.venues, { ...clean, id: uid('v') }] : st.venues.map(x => x.id === v.id ? clean : x))
  if (old) renameEverywhere('venue', old.name, clean.name)
  useStore.getState().log(`Venue ${isNew ? 'added' : 'updated'}: ${clean.name}${old && old.name !== clean.name ? ` (was ${old.name})` : ''}${old && old.status !== clean.status ? `, now ${clean.status.toLowerCase()}` : ''}`)
  return {}
}

/** Adds many equipment items at once from pasted `name, quantity` lines. Only valid lines are added; returns how many, plus the parsed rows. */
export function addEquipmentBatch(text: string): { added: number; rows: BatchRow[] } {
  const st = useResources.getState()
  const rows = parseBatch(text, st.equipment.map(x => x.name))
  const good = rows.filter(r => r.errors.length === 0)
  if (good.length) {
    st.setEquipment([...st.equipment, ...good.map((r, i) => ({ id: uid('q') + i, name: r.name, quantity: r.quantity, perLearner: r.perLearner, status: 'Available' as const, notes: '' }))])
    useStore.getState().log(`Equipment batch added: ${good.map(r => `${r.name} x${r.quantity}`).join(', ')}`)
  }
  return { added: good.length, rows }
}

export function saveEquipment(q: EquipRec, isNew: boolean): Record<string, string> {
  const e: Record<string, string> = {}
  const m = checkName('equipment', q.name, isNew ? undefined : q.id); if (m) e.name = m
  if (!Number.isInteger(q.quantity) || q.quantity < 0 || q.quantity > 1000) e.quantity = 'Stock must be a whole number from 0 to 1000 (0 means not tracked)'
  else if (!isNew && q.quantity > 0) {
    // Reducing stock may not go below what upcoming sessions already need on their busiest day.
    const old = useResources.getState().equipment.find(x => x.id === q.id)
    if (old && q.quantity < old.quantity) {
    const peak = peakDemand(useStore.getState().data.sessions, useStore.getState().data.enrolments, old?.name ?? q.name, today())
    if (peak.units > q.quantity) e.quantity = `Upcoming sessions need ${peak.units} on ${peak.date}. Reschedule or reduce them first.`
    }
  }
  if (Object.keys(e).length) return e
  const st = useResources.getState(); const clean = { ...q, name: q.name.trim(), notes: q.notes.trim() }
  const old = st.equipment.find(x => x.id === q.id)
  st.setEquipment(isNew ? [...st.equipment, { ...clean, id: uid('q') }] : st.equipment.map(x => x.id === q.id ? clean : x))
  if (old) renameEverywhere('equipment', old.name, clean.name)
  useStore.getState().log(`Equipment ${isNew ? 'added' : 'updated'}: ${clean.name}${old && old.name !== clean.name ? ` (was ${old.name})` : ''}${old && old.status !== clean.status ? `, now ${clean.status.toLowerCase()}` : ''}`)
  return {}
}

/** Removes a resource. Returns an error message, or '' on success. Blocked while upcoming sessions or open quotes use it. */
export function deleteResource(kind: Kind, id: string): string {
  const st = useResources.getState()
  const rec = (kind === 'venue' ? st.venues : st.equipment).find(r => r.id === id)
  if (!rec) return 'That resource no longer exists.'
  const u = usage(kind, rec.name)
  if (u.sessions || u.quotes) {
    const parts = [u.sessions && `${u.sessions} upcoming session${u.sessions === 1 ? '' : 's'}`, u.quotes && `${u.quotes} open quote${u.quotes === 1 ? '' : 's'}`].filter(Boolean).join(' and ')
    return `${rec.name} is used by ${parts}. Move them first, or mark the ${kind} out of service instead.`
  }
  if (kind === 'venue') st.setVenues(st.venues.filter(r => r.id !== id)); else st.setEquipment(st.equipment.filter(r => r.id !== id))
  useStore.getState().log(`${kind === 'venue' ? 'Venue' : 'Equipment'} removed: ${rec.name}`)
  return ''
}
