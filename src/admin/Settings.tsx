import { useState } from 'react'
import { Button, Switch } from '@fluentui/react-components'
import { PageHeader, Card } from '../shared/ui'
import { FText } from '../shared/fields'
import { VAT_RATE } from '../shared/format'
import { NOTIFICATIONS, formatNumber, isHex, useSettings } from './settingsStore'
import type { Settings as S } from './settingsStore'
import './admin.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

function validate(s: S) {
  const e: Record<string, string> = {}
  if (!s.profile.name.trim()) e.name = 'Legal name is required'
  if (!/^\S+@\S+\.\S+$/.test(s.profile.email)) e.email = 'Enter a valid email address'
  if (!/^\d{10}$/.test(s.profile.vatNo.replace(/\s/g, ''))) e.vatNo = 'VAT number is 10 digits'
  if (!/^\d{6,11}$/.test(s.banking.accountNo)) e.accountNo = 'Account number should be 6 to 11 digits'
  if (!s.numbering.invoicePrefix.trim()) e.invoicePrefix = 'Prefix is required'
  if (!s.numbering.creditPrefix.trim()) e.creditPrefix = 'Prefix is required'
  if (s.numbering.invoicePad < 3 || s.numbering.invoicePad > 8) e.invoicePad = 'Use 3 to 8 digits'
  if (s.numbering.paymentTermsDays < 0 || s.numbering.paymentTermsDays > 120) e.terms = 'Payment terms: 0 to 120 days'
  DAYS.forEach(k => { const h = s.hours[k]; if (h.open && h.start >= h.end) e[`h${k}`] = `${k}: closing time must be after opening` })
  if (!isHex(s.branding.primary)) e.primary = 'Use a hex colour like #597f2d'
  if (!isHex(s.branding.accent)) e.accent = 'Use a hex colour like #92ca61'
  return e
}

export default function Settings() {
  const saved = useSettings(s => s.settings)
  const save = useSettings(s => s.save)
  const [d, setD] = useState<S>(() => structuredClone(saved))
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [flash, setFlash] = useState('')
  const dirty = JSON.stringify(d) !== JSON.stringify(saved)
  const set = <K extends keyof S>(k: K, patch: Partial<S[K]>) => setD(prev => ({ ...prev, [k]: { ...(prev[k] as object), ...patch } as S[K] }))
  const doSave = () => {
    const e = validate(d); setErrs(e)
    if (Object.keys(e).length) return setFlash('')
    save(d); setFlash('Settings saved. Invoices and documents now use the new details.')
  }
  const revert = () => { setD(structuredClone(saved)); setErrs({}); setFlash('') }
  const hourErrs = DAYS.map(k => errs[`h${k}`]).filter(Boolean)

  return (
    <>
      <PageHeader id="settings" title="Settings" subtitle="Organisation profile, numbering, notifications, working hours and branding"
        actions={<><Button onClick={revert} disabled={!dirty}>Revert</Button><Button appearance="primary" onClick={doSave} disabled={!dirty}>Save changes</Button></>} />
      {flash && <div className="callout" role="status" style={{ marginBottom: 16 }}>{flash}</div>}
      {Object.keys(errs).length > 0 && <div className="callout" role="alert" style={{ marginBottom: 16, borderLeftColor: '#c50f1f' }}>Some fields need attention: {Object.keys(errs).length} issue(s) below.</div>}
      <div className="grid c2">
        <Card title="Organisation profile">
          <div className="form c2">
            <FText label="Legal name" value={d.profile.name} onChange={v => set('profile', { name: v })} error={errs.name} />
            <FText label="Trading as" value={d.profile.tradingAs} onChange={v => set('profile', { tradingAs: v })} />
            <FText label="Registration number" value={d.profile.regNo} onChange={v => set('profile', { regNo: v })} />
            <FText label="VAT number" value={d.profile.vatNo} onChange={v => set('profile', { vatNo: v })} error={errs.vatNo} />
            <FText label="Email" value={d.profile.email} onChange={v => set('profile', { email: v })} error={errs.email} />
            <FText label="Phone" value={d.profile.phone} onChange={v => set('profile', { phone: v })} />
          </div>
          <div style={{ marginTop: 12 }}><FText label="Address" value={d.profile.address} onChange={v => set('profile', { address: v })} /></div>
          <div style={{ marginTop: 12 }}><FText label="VAT rate" value={`${Math.round(VAT_RATE * 100)}%`} onChange={() => undefined} disabled hint="Fixed by South African law for standard-rated supplies; read-only" /></div>
        </Card>
        <Card title="Banking details (printed on invoices)">
          <div className="form c2">
            <FText label="Bank" value={d.banking.bank} onChange={v => set('banking', { bank: v })} />
            <FText label="Account type" value={d.banking.accountType} onChange={v => set('banking', { accountType: v })} />
            <FText label="Account name" value={d.banking.accountName} onChange={v => set('banking', { accountName: v })} />
            <FText label="Account number" value={d.banking.accountNo} onChange={v => set('banking', { accountNo: v })} error={errs.accountNo} />
            <FText label="Branch code" value={d.banking.branch} onChange={v => set('banking', { branch: v })} />
          </div>
        </Card>
        <Card title="Document numbering">
          <div className="form c2">
            <FText label="Invoice prefix" value={d.numbering.invoicePrefix} onChange={v => set('numbering', { invoicePrefix: v })} error={errs.invoicePrefix} />
            <FText label="Invoice digits" type="number" value={d.numbering.invoicePad} onChange={v => set('numbering', { invoicePad: Number(v) })} error={errs.invoicePad} />
            <FText label="Quote prefix" value={d.numbering.quotePrefix} onChange={v => set('numbering', { quotePrefix: v })} />
            <FText label="Credit note prefix" value={d.numbering.creditPrefix} onChange={v => set('numbering', { creditPrefix: v })} error={errs.creditPrefix} />
            <FText label="Receipt prefix" value={d.numbering.receiptPrefix} onChange={v => set('numbering', { receiptPrefix: v })} />
            <FText label="Payment terms (days)" type="number" value={d.numbering.paymentTermsDays} onChange={v => set('numbering', { paymentTermsDays: Number(v) })} error={errs.terms} />
          </div>
          <div className="callout" style={{ marginTop: 12 }}>
            Next numbers: <b>{formatNumber(d.numbering.invoicePrefix, d.numbering.invoicePad, 48)}</b> (invoice), <b>{formatNumber(d.numbering.creditPrefix, 4, 3)}</b> (credit note), <b>{formatNumber(d.numbering.receiptPrefix, 4, 5012)}</b> (receipt)
          </div>
        </Card>
        <Card title="Notifications">
          {NOTIFICATIONS.map(n => (
            <div key={n.id} className="adm-toggle">
              <div><b>{n.label}</b><div className="muted small">{n.hint}</div></div>
              <Switch checked={!!d.notifications[n.id]} onChange={(_, x) => setD(p => ({ ...p, notifications: { ...p.notifications, [n.id]: x.checked } }))} aria-label={n.label} />
            </div>
          ))}
        </Card>
        <Card title="Working hours calendar">
          {DAYS.map(k => (
            <div key={k} className="adm-hours">
              <b>{k}</b>
              <Switch checked={d.hours[k].open} label={d.hours[k].open ? 'Open' : 'Closed'} onChange={(_, x) => setD(p => ({ ...p, hours: { ...p.hours, [k]: { ...p.hours[k], open: x.checked } } }))} aria-label={`${k} open`} />
              <FText label="From" type="time" value={d.hours[k].start} onChange={v => setD(p => ({ ...p, hours: { ...p.hours, [k]: { ...p.hours[k], start: v } } }))} disabled={!d.hours[k].open} />
              <FText label="To" type="time" value={d.hours[k].end} onChange={v => setD(p => ({ ...p, hours: { ...p.hours, [k]: { ...p.hours[k], end: v } } }))} disabled={!d.hours[k].open} />
            </div>
          ))}
          {hourErrs.map(e => <div key={e} className="err">{e}</div>)}
          <h3 className="card-title" style={{ margin: '14px 0 6px' }}>Closures</h3>
          <div className="chips">{d.closures.map(c => <span key={c} className="chip">{c}</span>)}</div>
        </Card>
        <Card title="Branding">
          <div className="form c2">
            <FText label="Primary colour" value={d.branding.primary} onChange={v => set('branding', { primary: v })} error={errs.primary} />
            <FText label="Accent colour" value={d.branding.accent} onChange={v => set('branding', { accent: v })} error={errs.accent} />
          </div>
          <div style={{ margin: '12px 0' }}><FText label="Letterhead tagline" value={d.branding.letterhead} onChange={v => set('branding', { letterhead: v })} /></div>
          <div className="small muted" style={{ marginBottom: 6 }}>Preview</div>
          <div className="doc" style={{ padding: 16 }}>
            <div style={{ borderBottom: `3px solid ${isHex(d.branding.primary) ? d.branding.primary : '#999'}`, paddingBottom: 8, marginBottom: 10 }}>
              <b style={{ color: isHex(d.branding.primary) ? d.branding.primary : '#999', fontSize: 18 }}>{d.profile.tradingAs}</b>
              <div style={{ fontSize: 12 }}>{d.branding.letterhead}</div>
            </div>
            <div className="row">
              <span className="adm-swatch" style={{ background: isHex(d.branding.primary) ? d.branding.primary : '#ddd' }} title="Primary" />
              <span className="adm-swatch" style={{ background: isHex(d.branding.accent) ? d.branding.accent : '#ddd' }} title="Accent" />
              <button type="button" style={{ background: isHex(d.branding.primary) ? d.branding.primary : '#999', color: '#fff', border: 0, borderRadius: 6, padding: '8px 14px' }}>Book now</button>
              <span style={{ color: isHex(d.branding.accent) ? d.branding.accent : '#999', fontWeight: 600 }}>Accent link</span>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}
