import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Modal } from '../../shared/ui'
import { FArea, FSelect, FText } from '../../shared/fields'
import { addDays, today } from '../../shared/format'
import type { Stage } from '../../shared/types'
import { STAGES } from '../../shared/calc'
import { addOpportunity } from './mutate'

export const WIN_REASONS = ['Price', 'Facilitator quality', 'Existing relationship', 'On-site delivery', 'Speed of response', 'Other']
export const LOSS_REASONS = ['Price too high', 'Went in-house', 'Chose a competitor', 'Budget cut or postponed', 'No response', 'Other']

export function ReasonDialog({ open, stage, title, onCancel, onConfirm }: { open: boolean; stage: Stage; title: string; onCancel: () => void; onConfirm: (reason: string) => void }) {
  const won = stage === 'won'
  const options = won ? WIN_REASONS : LOSS_REASONS
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [err, setErr] = useState('')
  const go = () => {
    if (!reason) { setErr(`Choose a ${won ? 'win' : 'loss'} reason`); return }
    if (reason === 'Other' && detail.trim().length < 3) { setErr('Add a short explanation'); return }
    onConfirm(reason === 'Other' ? `Other: ${detail.trim()}` : detail.trim() ? `${reason}. ${detail.trim()}` : reason)
    setReason(''); setDetail(''); setErr('')
  }
  return (
    <Modal open={open} onClose={() => { setErr(''); onCancel() }} title={won ? 'Mark opportunity as won' : 'Mark opportunity as lost'} actions={<Button appearance="primary" onClick={go}>{won ? 'Confirm win' : 'Confirm loss'}</Button>}>
      <div className="form">
        <p style={{ margin: 0 }}><b>{title}</b></p>
        <FSelect label={won ? 'Why did we win?' : 'Why did we lose?'} value={reason} onChange={v => { setReason(v); setErr('') }} placeholder="Choose a reason" options={options.map(x => ({ value: x, label: x }))} error={err} />
        <FArea label="Details (optional unless Other)" value={detail} onChange={setDetail} rows={3} />
      </div>
    </Modal>
  )
}

export function NewOppDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const d = useStore(s => s.data)
  const blank = { orgId: '', title: '', contact: '', value: '', expectedClose: addDays(today(), 30), stage: 'enquiry' as Stage, owner: 's1', source: 'Inbound enquiry', notes: '' }
  const [f, setF] = useState(blank)
  const [err, setErr] = useState<Record<string, string>>({})
  const contacts = d.contacts.filter(c => c.orgId === f.orgId)
  const submit = () => {
    const e: Record<string, string> = {}
    if (!f.orgId) e.orgId = 'Choose a client'
    if (f.title.trim().length < 3) e.title = 'Give the opportunity a title (3+ characters)'
    if (!(Number(f.value) > 0)) e.value = 'Enter an estimated value above R0'
    if (!f.expectedClose) e.expectedClose = 'Choose an expected close date'
    setErr(e); if (Object.keys(e).length) return
    const id = addOpportunity({ orgId: f.orgId, title: f.title.trim(), value: Number(f.value), stage: f.stage, contact: f.contact || contacts[0]?.name || '', notes: f.notes, expectedClose: f.expectedClose }, f.owner, f.source)
    setF(blank); setErr({}); onCreated(id)
  }
  const owners = d.staff.filter(s => s.role === 'admin')
  return (
    <Modal open={open} onClose={() => { setErr({}); onClose() }} title="New opportunity" wide actions={<Button appearance="primary" onClick={submit}>Create opportunity</Button>}>
      <div className="form c2">
        <FSelect label="Client" value={f.orgId} onChange={v => setF({ ...f, orgId: v, contact: '' })} placeholder="Choose a client" options={d.orgs.map(o => ({ value: o.id, label: o.name }))} error={err.orgId} />
        <FSelect label="Contact" value={f.contact || contacts[0]?.name || ''} onChange={v => setF({ ...f, contact: v })} disabled={!f.orgId} options={contacts.map(c => ({ value: c.name, label: `${c.name} (${c.title})` }))} />
        <div style={{ gridColumn: '1 / -1' }}><FText label="Opportunity title" value={f.title} onChange={v => setF({ ...f, title: v })} error={err.title} placeholder="e.g. First aid for new depot staff" /></div>
        <FText label="Estimated value, excluding VAT (R)" type="number" value={f.value} onChange={v => setF({ ...f, value: v })} error={err.value} min={0} />
        <FText label="Expected close" type="date" value={f.expectedClose} onChange={v => setF({ ...f, expectedClose: v })} error={err.expectedClose} />
        <FSelect label="Stage" value={f.stage} onChange={v => setF({ ...f, stage: v as Stage })} options={STAGES.filter(s => s.id !== 'won' && s.id !== 'lost').map(s => ({ value: s.id, label: s.label }))} />
        <FSelect label="Owner" value={f.owner} onChange={v => setF({ ...f, owner: v })} options={owners.map(s => ({ value: s.id, label: s.name }))} />
        <FSelect label="Source" value={f.source} onChange={v => setF({ ...f, source: v })} options={['Inbound enquiry', 'Referral', 'Existing client', 'Tender', 'Website enquiry', 'Event'].map(x => ({ value: x, label: x }))} />
        <div style={{ gridColumn: '1 / -1' }}><FArea label="Notes" value={f.notes} onChange={v => setF({ ...f, notes: v })} rows={3} /></div>
      </div>
    </Modal>
  )
}
