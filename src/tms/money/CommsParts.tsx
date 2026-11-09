import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Field, Textarea } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmailPreview, EmptyState } from '../../shared/ui'
import { FSelect, FText } from '../../shared/fields'
import { addDays, fmtDate, today } from '../../shared/format'
import { useMoney } from './store'
import type { Campaign } from './store'
import { MERGE_FIELDS, SAMPLE, audience, deliveryStats, fillMerge, unknownFields } from './commsLogic'
import type { AudienceKind } from './commsLogic'

export interface AnyTemplate { id: string; name: string; subject: string; body: string; custom: boolean }
export function useTemplates(): AnyTemplate[] {
  const core = useStore(s => s.data.templates)
  const custom = useMoney(s => s.customTemplates)
  return useMemo(() => [...core.map(t => ({ ...t, custom: false })), ...custom.map(t => ({ ...t, custom: true }))], [core, custom])
}

export function TemplateEditor() {
  const templates = useTemplates()
  const saveCore = useStore(s => s.saveTemplate)
  const sendEmail = useStore(s => s.sendEmail)
  const saveCustom = useMoney(s => s.saveCustomTemplate)
  const delCustom = useMoney(s => s.deleteCustomTemplate)
  const [sel, setSel] = useState(templates[0]?.id ?? '')
  const tpl = templates.find(t => t.id === sel) ?? templates[0]
  const [draft, setDraft] = useState<AnyTemplate | undefined>(tpl)
  const [errs, setErrs] = useState<{ name?: string; subject?: string; body?: string }>({})
  const [flash, setFlash] = useState('')
  const [preview, setPreview] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { setDraft(tpl); setErrs({}) }, [sel]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!draft) return <EmptyState title="No templates" />

  const insert = (f: string) => {
    const tag = `{{${f}}}`, el = ref.current
    if (!el) return setDraft({ ...draft, body: draft.body + tag })
    const a = el.selectionStart ?? draft.body.length, b = el.selectionEnd ?? a
    setDraft({ ...draft, body: draft.body.slice(0, a) + tag + draft.body.slice(b) })
    setTimeout(() => { el.focus(); el.setSelectionRange(a + tag.length, a + tag.length) }, 0)
  }
  const validate = () => {
    const e: typeof errs = {}
    if (!draft.name.trim()) e.name = 'Name is required'
    if (!draft.subject.trim()) e.subject = 'Subject is required'
    if (!draft.body.trim()) e.body = 'Message body is required'
    else { const u = unknownFields(draft.body + draft.subject); if (u.length) e.body = `Unknown merge field${u.length > 1 ? 's' : ''}: ${u.map(x => `{{${x}}}`).join(', ')}` }
    setErrs(e); return Object.keys(e).length === 0
  }
  const save = () => {
    if (!validate()) return
    if (draft.custom) saveCustom({ id: draft.id, name: draft.name, subject: draft.subject, body: draft.body })
    else saveCore({ id: draft.id, name: draft.name, subject: draft.subject, body: draft.body })
    setFlash(`Saved “${draft.name}”.`)
  }
  const create = () => {
    const id = `ct${Date.now().toString(36)}`
    saveCustom({ id, name: 'New template', subject: 'Subject line', body: 'Hi {{name}},\n\n\n\nKind regards,\nThe training team' })
    setSel(id)
  }

  return (
    <div className="grid c2">
      <Card title="Template editor" actions={<Button size="small" onClick={create}>New template</Button>}>
        <div className="row" style={{ marginBottom: 12 }} role="tablist" aria-label="Templates">
          {templates.map(t => <Button key={t.id} role="tab" aria-selected={t.id === sel} appearance={t.id === sel ? 'primary' : 'secondary'} size="small" onClick={() => { setSel(t.id); setFlash('') }}>{t.name}</Button>)}
        </div>
        {flash && <div className="callout" role="status" style={{ marginBottom: 10 }}>{flash}</div>}
        <div className="form">
          <FText label="Template name" value={draft.name} onChange={v => setDraft({ ...draft, name: v })} error={errs.name} disabled={!draft.custom} hint={draft.custom ? undefined : 'Built-in templates keep their name'} />
          <FText label="Subject" value={draft.subject} onChange={v => setDraft({ ...draft, subject: v })} error={errs.subject} />
          <Field label="Body" validationState={errs.body ? 'error' : 'none'} validationMessage={errs.body}>
            <Textarea ref={ref} value={draft.body} onChange={(_, d) => setDraft({ ...draft, body: d.value })} rows={9} resize="vertical" />
          </Field>
          <div>
            <div className="small muted">Insert merge field at the cursor</div>
            <div className="mny-chips">{MERGE_FIELDS.map(f => <button key={f} type="button" className="mny-chip-btn" onClick={() => insert(f)} aria-label={`Insert merge field ${f}`}>{`{{${f}}}`}</button>)}</div>
          </div>
          <div className="row">
            <Button appearance="primary" onClick={save}>Save template</Button>
            <Button onClick={() => setPreview(true)}>Preview email</Button>
            <Button onClick={() => { sendEmail(draft.id, 'test@trainco.example', fillMerge(draft.subject)); setFlash('Test email sent to test@trainco.example (see the sent log).') }}>Send test</Button>
            {draft.custom && <Button appearance="subtle" onClick={() => { delCustom(draft.id); setSel(templates[0].id) }}>Delete</Button>}
          </div>
        </div>
      </Card>
      <Card title="Live preview">
        <div className="email" aria-live="polite">
          <div className="email-meta"><b>To:</b> {SAMPLE.name.toLowerCase()}.ndlovu@mail.example<br /><b>From:</b> Training team &lt;no-reply@trainco.example&gt;<br /><b>Subject:</b> {fillMerge(draft.subject)}</div>
          <pre className="email-body">{fillMerge(draft.body)}</pre>
        </div>
        <p className="muted small">Sample values: {Object.entries(SAMPLE).map(([k, v]) => `${k} = ${v}`).join(' · ')}</p>
      </Card>
      <EmailPreview open={preview} onClose={() => setPreview(false)} to="zanele.ndlovu@mail.example" subject={fillMerge(draft.subject)} body={fillMerge(draft.body)} />
    </div>
  )
}

export function CampaignComposer({ onDone }: { onDone: (msg: string) => void }) {
  const d = useStore(s => s.data)
  const templates = useTemplates()
  const upsert = useMoney(s => s.upsertCampaign)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<AudienceKind>('course')
  const [param, setParam] = useState('')
  const [tid, setTid] = useState(templates[1]?.id ?? templates[0].id)
  const [subject, setSubject] = useState(templates[1]?.subject ?? '')
  const [body, setBody] = useState(templates[1]?.body ?? '')
  const [when, setWhen] = useState<'now' | 'later'>('now')
  const [date, setDate] = useState(addDays(today(), 2)); const [time, setTime] = useState('08:00')
  const [errs, setErrs] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState(false)
  const aud = audience(d, kind, param)
  const pickTemplate = (id: string) => { setTid(id); const t = templates.find(x => x.id === id); if (t) { setSubject(t.subject); setBody(t.body) } }
  const needsParam = kind !== 'overdue'

  const send = () => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Give the campaign a name'
    if (needsParam && !param) e.param = kind === 'course' ? 'Choose a course' : 'Choose a client'
    if (!subject.trim()) e.subject = 'Subject is required'
    if (!body.trim()) e.body = 'Message is required'
    if (!e.param && aud.list.length === 0) e.param = 'This audience has no recipients'
    if (when === 'later' && `${date}T${time}` <= new Date().toISOString().slice(0, 16)) e.date = 'Choose a date and time in the future'
    setErrs(e); if (Object.keys(e).length) return
    const id = `cm${Date.now().toString(36)}`
    const base: Campaign = { id, name: name.trim(), templateId: tid, subject, body, audience: aud.label, recipients: aud.list.length, status: when === 'now' ? 'Sent' : 'Scheduled', at: when === 'now' ? new Date().toISOString() : `${date}T${time}:00`, sent: 0, opened: 0, clicked: 0, bounced: 0 }
    if (when === 'now') {
      Object.assign(base, deliveryStats(aud.list.length, aud.list.length + 3))
      const now = new Date().toISOString()
      useStore.setState(s => {
        const data = structuredClone(s.data)
        aud.list.slice(0, 80).forEach((r, i) => data.sent.unshift({ id: `n${Date.now().toString(36)}${i}`, at: now, templateId: tid, to: r.email, subject: fillMerge(subject, { ...SAMPLE, name: r.name.split(' ')[0] }) }))
        data.activity.unshift({ id: `ac${Date.now().toString(36)}`, at: now, text: `Campaign “${base.name}” sent to ${aud.list.length} recipient${aud.list.length === 1 ? '' : 's'}` })
        return { data }
      })
    } else useStore.getState().log(`Campaign “${base.name}” scheduled for ${fmtDate(date)} ${time}`)
    upsert(base)
    onDone(when === 'now' ? `Campaign “${base.name}” sent to ${aud.list.length} recipient(s).` : `Campaign “${base.name}” scheduled for ${fmtDate(date)} at ${time}.`)
    setName(''); setErrs({})
  }

  return (
    <Card title="Campaign composer">
      <div className="form c2">
        <FText label="Campaign name" value={name} onChange={setName} error={errs.name} placeholder="e.g. Heights refresher reminder" />
        <FSelect label="Audience" value={kind} onChange={v => { setKind(v as AudienceKind); setParam('') }} options={[{ value: 'course', label: 'All learners in a course' }, { value: 'client', label: 'A client’s learners' }, { value: 'overdue', label: 'Clients with overdue invoices' }]} />
        {kind === 'course' && <FSelect label="Course" value={param} onChange={setParam} error={errs.param} placeholder="Choose a course" options={d.courses.map(c => ({ value: c.id, label: c.title }))} />}
        {kind === 'client' && <FSelect label="Client" value={param} onChange={setParam} error={errs.param} placeholder="Choose a client" options={d.orgs.map(o => ({ value: o.id, label: o.name }))} />}
        {kind === 'overdue' && errs.param && <div className="err">{errs.param}</div>}
        <FSelect label="Start from template" value={tid} onChange={pickTemplate} options={templates.map(t => ({ value: t.id, label: t.name }))} />
        <FText label="Subject" value={subject} onChange={setSubject} error={errs.subject} />
      </div>
      <div style={{ margin: '12px 0' }}>
        <Field label="Message" validationState={errs.body ? 'error' : 'none'} validationMessage={errs.body}><Textarea value={body} onChange={(_, x) => setBody(x.value)} rows={5} resize="vertical" /></Field>
      </div>
      <div className="callout" style={{ marginBottom: 12 }}>
        <b>{aud.list.length}</b> recipient{aud.list.length === 1 ? '' : 's'} · {aud.label}
        <div className="mny-chips">{aud.list.slice(0, 6).map(r => <span key={r.email} className="chip">{r.name}</span>)}{aud.list.length > 6 && <span className="chip">+{aud.list.length - 6} more</span>}</div>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: '0 0 12px' }}>
        <legend className="small muted">Delivery</legend>
        <div className="row">
          <label className="row" style={{ gap: 6 }}><input type="radio" name="when" checked={when === 'now'} onChange={() => setWhen('now')} /> Send now</label>
          <label className="row" style={{ gap: 6 }}><input type="radio" name="when" checked={when === 'later'} onChange={() => setWhen('later')} /> Schedule</label>
          {when === 'later' && <><FText label="Date" type="date" value={date} onChange={setDate} error={errs.date} /><FText label="Time" type="time" value={time} onChange={setTime} /></>}
        </div>
      </fieldset>
      <div className="row">
        <Button appearance="primary" onClick={send}>{when === 'now' ? 'Send campaign' : 'Schedule campaign'}</Button>
        <Button onClick={() => setPreview(true)}>Preview first message</Button>
      </div>
      <EmailPreview open={preview} onClose={() => setPreview(false)} to={aud.list[0]?.email ?? 'recipient@mail.example'} subject={fillMerge(subject, { ...SAMPLE, name: aud.list[0]?.name.split(' ')[0] ?? SAMPLE.name })} body={fillMerge(body, { ...SAMPLE, name: aud.list[0]?.name.split(' ')[0] ?? SAMPLE.name })} />
    </Card>
  )
}
