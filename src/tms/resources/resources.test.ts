import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  const m = new Map<string, string>()
  ;(globalThis as any).localStorage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) }, removeItem: (k: string) => { m.delete(k) }, clear: () => m.clear(), key: () => null, length: 0 }
})
import { useStore } from '../../shared/store'
import { buildSeed } from '../../shared/seed'
import { clashes } from '../../shared/calc'
import { conflictsFor } from '../ops/logic'
import { useResources, venueSeed, equipSeed } from './registry'
import { addEquipmentBatch, checkName, deleteResource, saveEquipment, saveVenue, usage } from './resourceActions'

beforeEach(() => { useStore.setState({ data: buildSeed() }); useResources.setState({ venues: venueSeed(), equipment: equipSeed() }) })

describe('resource register', () => {
  it('adds a venue and rejects duplicate or short names and bad seats', () => {
    const blank = { id: '', name: 'Durban Studio', city: 'Durban', seats: 14, status: 'Available' as const, notes: '' }
    expect(saveVenue(blank, true)).toEqual({})
    expect(useResources.getState().venues.some(v => v.name === 'Durban Studio')).toBe(true)
    expect(saveVenue({ ...blank, name: ' durban studio ' }, true).name).toMatch(/already exists/)
    expect(saveVenue({ ...blank, name: 'ab' }, true).name).toMatch(/3 characters/)
    expect(saveVenue({ ...blank, name: 'Other', seats: 0 }, true).seats).toMatch(/at least 1/)
    expect(checkName('equipment', 'projector')).toMatch(/already exists/)
  })
  it('renaming cascades to sessions and quotes', () => {
    const v = useResources.getState().venues[0]
    const before = useStore.getState().data.sessions.filter(s => s.venue === v.name).length
    expect(before).toBeGreaterThan(0)
    expect(saveVenue({ ...v, name: 'Room A (renamed)' }, false)).toEqual({})
    const d = useStore.getState().data
    expect(d.sessions.filter(s => s.venue === 'Room A (renamed)').length).toBe(before)
    expect(d.sessions.some(s => s.venue === v.name)).toBe(false)
    const eq = useResources.getState().equipment.find(e => e.name === 'Harness kit')!
    saveEquipment({ ...eq, name: 'Harness set' }, false)
    expect(useStore.getState().data.sessions.some(s => s.equipment.includes('Harness kit'))).toBe(false)
  })
  it('delete is blocked while upcoming sessions use it, and allowed once unused', () => {
    const used = useResources.getState().venues.find(v => usage('venue', v.name).sessions > 0)!
    expect(deleteResource('venue', used.id)).toMatch(/upcoming session/)
    expect(useResources.getState().venues.some(v => v.id === used.id)).toBe(true)
    saveVenue({ id: '', name: 'Spare room', city: '', seats: 5, status: 'Available', notes: '' }, true)
    const spare = useResources.getState().venues.find(v => v.name === 'Spare room')!
    expect(deleteResource('venue', spare.id)).toBe('')
    expect(deleteResource('venue', spare.id)).toMatch(/no longer exists/)
  })
  it('tracked stock: sessions on one day clash only when together they need more than is held', () => {
    const d = useStore.getState().data
    const day = '2031-03-03'
    const mk = (id: string, qty: number) => ({ id, courseId: d.courses[0].id, start: day, venue: 'Online (video call)', instructorId: id, capacity: 10, equipment: ['Loan laptops'], equipmentQty: { 'Loan laptops': qty }, status: 'Scheduled' as const })
    useStore.setState(st => ({ data: { ...st.data, sessions: [mk('t1', 8), mk('t2', 9)] } }))
    expect(Object.keys(clashes(useStore.getState().data)).sort()).toEqual(['t1', 't2'])
    saveEquipment({ ...useResources.getState().equipment.find(e => e.name === 'Loan laptops')!, quantity: 20 }, false)
    expect(Object.keys(clashes(useStore.getState().data))).toEqual([])
    const cand = { start: day, venue: 'Online (video call)', instructorId: 'zz', equipment: ['Loan laptops'], equipmentQty: { 'Loan laptops': 6 } }
    expect(conflictsFor(useStore.getState().data, cand).some(c => c.kind === 'equipment' && /23 needed/.test(c.text))).toBe(true)
    expect(conflictsFor(useStore.getState().data, { ...cand, equipmentQty: { 'Loan laptops': 3 } }).some(c => c.kind === 'equipment')).toBe(false)
  })
  it('untracked equipment never clashes; one tracked unit behaves like the old exclusive item', () => {
    const d = useStore.getState().data
    const base = { courseId: d.courses[0].id, start: '2031-04-01', venue: 'Online (video call)', capacity: 5, status: 'Scheduled' as const }
    useStore.setState(st => ({ data: { ...st.data, sessions: [{ ...base, id: 'u1', instructorId: 'a', equipment: ['Projector'] }, { ...base, id: 'u2', instructorId: 'b', equipment: ['Projector'] }, { ...base, id: 'u3', instructorId: 'c', equipment: ['Laptop trolley'] }, { ...base, id: 'u4', instructorId: 'd', equipment: ['Laptop trolley'] }] } }))
    expect(Object.keys(clashes(useStore.getState().data)).sort()).toEqual(['u3', 'u4'])
  })
  it('cannot reduce stock below upcoming demand, and renaming moves the per-session units', () => {
    const d = useStore.getState().data
    const l = useResources.getState().equipment.find(e => e.name === 'Loan laptops')!
    useStore.setState(st => ({ data: { ...st.data, sessions: [{ id: 'r1', courseId: d.courses[0].id, start: '2031-05-05', venue: 'Online (video call)', instructorId: 'a', capacity: 5, status: 'Scheduled' as const, equipment: ['Loan laptops'], equipmentQty: { 'Loan laptops': 12 } }] } }))
    expect(saveEquipment({ ...l, quantity: 10 }, false).quantity).toMatch(/need 12/)
    expect(saveEquipment({ ...l, name: 'Student laptops' }, false)).toEqual({})
    expect(useStore.getState().data.sessions[0].equipmentQty).toEqual({ 'Student laptops': 12 })
  })
  it('batch add imports valid lines only', () => {
    const r = addEquipmentBatch(['Flip chart stands, 8', 'Wireless microphones', 'loan laptops, 5', 'ab, 2', 'Bad qty, 0', 'Name\tQuantity'].join('\n'))
    expect(r.added).toBe(2)
    const eq = useResources.getState().equipment
    expect(eq.find(e => e.name === 'Flip chart stands')!.quantity).toBe(8)
    expect(eq.find(e => e.name === 'Wireless microphones')!.quantity).toBe(1)
    expect(r.rows.filter(x => x.errors.length).length).toBe(4)
    expect(r.rows.find(x => x.name === 'loan laptops')!.errors[0]).toMatch(/Already in the register/)
  })
  it('out-of-service resources are flagged as conflicts', () => {
    const v = useResources.getState().venues[2]
    saveVenue({ ...v, status: 'Out of service' }, false)
    const c = conflictsFor(useStore.getState().data, { start: '2030-01-01', venue: v.name, instructorId: 's3', equipment: [] })
    expect(c.some(x => x.kind === 'resource' && /out of service/.test(x.text))).toBe(true)
  })
})
