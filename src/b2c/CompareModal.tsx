import { Link } from 'react-router-dom'
import { Button, RatingDisplay } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { Modal } from '../shared/ui'
import { fmtDate, money } from '../shared/format'
import { useB2c } from './b2cStore'
import { formatOf, levelOf, ratingSummary, reviewsFor, seatsLeft, upcomingSessions } from './courseMeta'

export default function CompareModal({ open, onClose, ids }: { open: boolean; onClose: () => void; ids: string[] }) {
  const d = useStore(s => s.data)
  const reviews = useB2c(s => s.reviews)
  const cs = ids.map(id => d.courses.find(c => c.id === id)).filter(Boolean) as typeof d.courses
  const rows: [string, (c: typeof cs[number]) => React.ReactNode][] = [
    ['Price (incl. VAT)', c => <b>{money(c.price * 1.15)}</b>],
    ['Rating', c => { const r = ratingSummary(reviewsFor(c.id, reviews)); return <RatingDisplay value={r.avg} count={r.count} size="small" /> }],
    ['Duration', c => `${c.hours} hours`],
    ['Level', c => levelOf(c)],
    ['Format', c => formatOf(d, c)],
    ['Category', c => c.category],
    ['Next date', c => { const s = upcomingSessions(d, c.id)[0]; return s ? `${fmtDate(s.start)} (${seatsLeft(d, s)} seats)` : 'Start any time' }],
    ['Skills', c => c.skills.join(', ')],
  ]
  return (
    <Modal open={open} onClose={onClose} title="Compare courses" wide>
      <div className="tbl-wrap"><table className="tbl b2c-compare">
        <thead><tr><th />{cs.map(c => <th key={c.id} style={{ textTransform: 'none', fontSize: 14, color: 'inherit' }}>{c.title}</th>)}</tr></thead>
        <tbody>
          {rows.map(([label, fn]) => <tr key={label}><td className="muted">{label}</td>{cs.map(c => <td key={c.id}>{fn(c)}</td>)}</tr>)}
          <tr><td /> {cs.map(c => <td key={c.id}><Link to={`/catalogue/${c.id}`} onClick={onClose}><Button size="small" appearance="primary">View course</Button></Link></td>)}</tr>
        </tbody>
      </table></div>
    </Modal>
  )
}
