import { ReactNode } from 'react'
import { Badge, Button, Dialog, DialogBody, DialogContent, DialogSurface, DialogTitle, DialogActions, DialogTrigger, MessageBar, MessageBarBody, Text } from '@fluentui/react-components'
import type { Release } from './types'
import { SCREENS, ROLE_LABEL } from './access'
import { useStore } from './store'

export function ReleaseBadge({ r }: { r: Release }) {
  return <span className={`rel rel-${r}`} title={`Planned for release ${r.slice(1)}`}>{r}</span>
}

export function PageHeader({ id, title, subtitle, actions }: { id?: string; title: string; subtitle?: string; actions?: ReactNode }) {
  const explainer = useStore(s => s.explainer)
  const persona = useStore(s => s.persona)
  const screen = SCREENS.find(s => s.id === id)
  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{title} {screen && screen.release !== 'R1' && <ReleaseBadge r={screen.release} />}</h1>
          {subtitle && <Text className="muted">{subtitle}</Text>}
        </div>
        <div className="page-actions">{actions}</div>
      </div>
      {explainer && screen && (
        <MessageBar intent="info" className="explainer" role="note">
          <MessageBarBody>
            <strong>Why you see this:</strong> {screen.why}{' '}
            <span className="muted">Viewing as {persona === 'all' ? 'All access' : ROLE_LABEL[persona]}. Allowed: {screen.roles.length === 8 ? 'everyone' : screen.roles.map(r => ROLE_LABEL[r]).join(', ')}.</span>
          </MessageBarBody>
        </MessageBar>
      )}
      {screen?.note && <MessageBar intent="warning" className="explainer"><MessageBarBody><ReleaseBadge r="R2" /> {screen.note}</MessageBarBody></MessageBar>}
    </>
  )
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="empty" role="status">
      <div className="empty-icon" aria-hidden>∅</div>
      <Text weight="semibold" size={400}>{title}</Text>
      {text && <Text className="muted">{text}</Text>}
      {action}
    </div>
  )
}

const TONE: Record<string, 'success' | 'danger' | 'warning' | 'informative' | 'important' | 'subtle'> = {
  Paid: 'success', Synced: 'success', Accepted: 'success', Completed: 'success', Won: 'success', Approved: 'success', Active: 'success', Scheduled: 'informative',
  Sent: 'informative', Pending: 'warning', Draft: 'subtle', Booked: 'informative', 'In progress': 'warning', Requested: 'warning',
  Overdue: 'danger', Failed: 'danger', Expired: 'danger', Declined: 'danger', Lost: 'danger', Retired: 'subtle', Cancelled: 'subtle',
}
export function Status({ s }: { s: string }) {
  return <Badge appearance="tint" color={TONE[s] ?? 'brand'} shape="rounded">{s}</Badge>
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="stat" role="group" aria-label={label}>
      <Text className="muted" size={200}>{label}</Text>
      <div className="stat-value">{value}</div>
      {hint && <Text size={200} className="muted">{hint}</Text>}
    </div>
  )
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      {(title || actions) && <div className="card-head"><h2 className="card-title">{title}</h2><div>{actions}</div></div>}
      {children}
    </section>
  )
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={`${value}% complete`}>
      <div style={{ width: `${value}%` }} />
    </div>
  )
}

/** A mock email window. Nothing is sent anywhere. */
export function EmailPreview({ open, onClose, to, subject, body }: { open: boolean; onClose: () => void; to: string; subject: string; body: string }) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Email preview</DialogTitle>
          <DialogContent>
            <div className="email">
              <div className="email-meta"><b>To:</b> {to}<br /><b>From:</b> Training team &lt;no-reply@zimele.example&gt;<br /><b>Subject:</b> {subject}</div>
              <pre className="email-body">{body}</pre>
              <Text size={200} className="muted">Demo only: nothing was sent.</Text>
            </div>
          </DialogContent>
          <DialogActions><DialogTrigger disableButtonEnhancement><Button appearance="primary">Close</Button></DialogTrigger></DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

export function Modal({ open, onClose, title, children, actions, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface style={wide ? { maxWidth: 760, width: '92vw' } : undefined}>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>{children}</DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>Close</Button>
            {actions}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  )
}

export function NotFoundNote({ text }: { text: string }) {
  return <EmptyState title="Nothing to show" text={text} />
}
