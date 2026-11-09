import { useNavigate } from 'react-router-dom'
import { Button } from '@fluentui/react-components'
import { useStore } from '../../shared/store'
import { Card, EmptyState } from '../../shared/ui'
import { buildAlerts } from './calc'
import { resendAllFailed } from './actions'
import { today } from '../../shared/format'
import './money.css'

export default function AlertCentre() {
  const d = useStore(s => s.data)
  const nav = useNavigate()
  const alerts = buildAlerts(d, today())
  return (
    <Card title={`Alert centre${alerts.length ? ` (${alerts.length})` : ''}`}>
      {alerts.length === 0 ? <EmptyState title="All clear" text="No overdue invoices, failed syncs, clashes or expiring certificates." /> : alerts.map(a => (
        <div key={a.id} className={`mny-alert ${a.severity}`} role="group" aria-label={a.title}>
          <div className="grow">
            <div><b>{a.title}</b></div>
            <div className="detail">{a.detail}</div>
          </div>
          {a.kind === 'workbook' && <Button size="small" onClick={() => resendAllFailed()}>Resend all</Button>}
          <Button size="small" appearance="primary" onClick={() => nav(a.to)}>{a.action}</Button>
        </div>
      ))}
    </Card>
  )
}
