import { describe, it, expect, vi } from 'vitest'

vi.hoisted(() => {
  const m: Record<string, string> = {}
  ;(globalThis as any).localStorage = { getItem: (k: string) => m[k] ?? null, setItem: (k: string, v: string) => { m[k] = v }, removeItem: (k: string) => { delete m[k] } }
})
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { FluentProvider, webLightTheme } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { invTotal } from '../../shared/calc'
import Dashboard from '../Dashboard'
import Invoicing from '../Invoicing'
import Workbook from '../Workbook'
import Reports from '../Reports'
import Comms from '../Comms'
import FinanceDashboard from './FinanceDashboard'
import Orgs from '../../admin/Orgs'
import AccessRules from '../../admin/AccessRules'
import AuditTrail from '../../admin/AuditTrail'
import Settings from '../../admin/Settings'
import { applyCreditNote, markPaid, resendAllFailed, sendReminder } from './actions'
import { useMoney } from './store'

const render = (el: JSX.Element) => renderToString(<FluentProvider theme={webLightTheme}><MemoryRouter>{el}</MemoryRouter></FluentProvider>)

describe('money and admin screens render', () => {
  const screens: [string, JSX.Element][] = [['dashboard', <Dashboard />], ['invoicing', <Invoicing />], ['workbook', <Workbook />], ['reports', <Reports />], ['comms', <Comms />],
    ['finance', <FinanceDashboard />], ['orgs', <Orgs />], ['access', <AccessRules />], ['audit', <AuditTrail />], ['settings', <Settings />]]
  for (const [name, el] of screens) it(name, () => { expect(render(el).length).toBeGreaterThan(500) })
})

describe('money actions', () => {
  const inv = (n: string) => useStore.getState().data.invoices.find(i => i.number === n)!
  it('credit note reduces the balance and is logged', () => {
    useStore.getState().reset()
    const before = invTotal(inv('INV-0041')), logs = useStore.getState().data.activity.length
    applyCreditNote('INV-0041', 1000, 'Pricing error', '')
    expect(invTotal(inv('INV-0041'))).toBeCloseTo(before - 1000)
    expect(useStore.getState().data.activity.length).toBe(logs + 1)
    expect(useMoney.getState().credits.some(c => c.invoice === 'INV-0041')).toBe(true)
  })
  it('bulk paid, reminders and resend all failed', () => {
    markPaid(['INV-0039', 'INV-0040'])
    expect(inv('INV-0039').status).toBe('Paid')
    const sent = useStore.getState().data.sent.length
    sendReminder(inv('INV-0036'))
    expect(useStore.getState().data.sent.length).toBe(sent + 1)
    expect(resendAllFailed()).toContain('INV-0042')
    expect(inv('INV-0042').wb).toBe('Synced')
    useStore.getState().reset()
    expect(inv('INV-0042').wb).toBe('Failed')
    expect(useMoney.getState().credits.some(c => c.invoice === 'INV-0041')).toBe(false)
  })
})
