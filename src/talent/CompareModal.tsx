import { Modal } from '../shared/ui'
import { Candidate, MatchResult } from './talentLogic'
import { MatchBar, RadarCompare } from './TalentBits'

export function CompareModal({ open, onClose, items }: { open: boolean; onClose: () => void; items: { c: Candidate; m: MatchResult | null }[] }) {
  return (
    <Modal open={open} onClose={onClose} title={`Compare ${items.length} candidates`} wide>
      <RadarCompare people={items.map(i => ({ name: i.c.code, radar: i.c.radar }))} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead><tr><th scope="col">Detail</th>{items.map(i => <th key={i.c.code} scope="col">{i.c.code}</th>)}</tr></thead>
          <tbody>
            <tr><th scope="row">Region</th>{items.map(i => <td key={i.c.code}>{i.c.region}</td>)}</tr>
            <tr><th scope="row">Availability</th>{items.map(i => <td key={i.c.code}>{i.c.availability}</td>)}</tr>
            <tr><th scope="row">Courses completed</th>{items.map(i => <td key={i.c.code}>{i.c.completed}</td>)}</tr>
            <tr><th scope="row">Skills</th>{items.map(i => <td key={i.c.code}>{i.c.skills.length}</td>)}</tr>
            <tr><th scope="row">Completeness</th>{items.map(i => <td key={i.c.code}>{i.c.completeness}%</td>)}</tr>
            {items.some(i => i.m) && <tr><th scope="row">Brief match</th>{items.map(i => <td key={i.c.code}>{i.m ? <MatchBar score={i.m.score} /> : '–'}</td>)}</tr>}
            {items.some(i => i.m) && <tr><th scope="row">Missing required</th>{items.map(i => <td key={i.c.code}>{i.m ? (i.m.missing.join(', ') || 'None') : '–'}</td>)}</tr>}
            <tr><th scope="row">Summary</th>{items.map(i => <td key={i.c.code} className="small">{i.c.summary || '–'}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </Modal>
  )
}
