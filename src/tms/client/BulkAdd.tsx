import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { useStore, useCtx } from '../../shared/store'
import { Modal } from '../../shared/ui'
import { parseBulk } from './clientLogic'
import './client.css'

const SAMPLE = 'name,email,course\nAbel Nkosi,abel.nkosi@capefreight.example,HSE-101\nRené Jordaan,rene.jordaan@capefreight.example,Cybersecurity Awareness\nZoe Williams,zoe.williams@capefreight.example,POP-120'

export function BulkAdd({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = useStore(s => s.data)
  const add = useStore(s => s.addClientLearner)
  const { orgId } = useCtx()
  const [text, setText] = useState('')
  const [result, setResult] = useState('')
  const rows = parseBulk(text, d.courses, d.learners.map(l => l.email))
  const good = rows.filter(r => r.errors.length === 0)
  const submit = () => {
    good.forEach(r => add(orgId, r.name, r.email, r.courseId))
    setResult(`${good.length} learner(s) added.`); setText('')
  }
  return (
    <Modal open={open} onClose={() => { setResult(''); onClose() }} title="Add many learners" wide
      actions={<Button appearance="primary" disabled={good.length === 0} onClick={submit}>Add {good.length} valid learner(s)</Button>}>
      <p className="muted small" style={{ marginTop: 0 }}>Paste one learner per line as <code>name,email,course</code>. The course can be its code (for example HSE-101) or its title. Nothing is added until you confirm.</p>
      <label htmlFor="cl-bulk" className="small muted">Learners</label>
      <textarea id="cl-bulk" rows={6} value={text} onChange={e => { setText(e.target.value); setResult('') }} placeholder={SAMPLE}
        style={{ width: '100%', font: 'inherit', padding: 8, boxSizing: 'border-box', background: 'var(--card)', color: 'inherit', border: '1px solid var(--line)', borderRadius: 6 }} />
      <div className="row" style={{ margin: '8px 0' }}><Button size="small" onClick={() => setText(SAMPLE)}>Use an example</Button>{result && <span role="status" className="muted">{result}</span>}</div>
      {rows.length > 0 && (
        <div className="tbl-wrap"><table className="tbl"><thead><tr><th>Line</th><th>Name</th><th>Email</th><th>Course</th><th>Check</th></tr></thead><tbody>
          {rows.map(r => (
            <tr key={r.line}><td>{r.line}</td><td>{r.name}</td><td>{r.email}</td><td>{r.courseTitle}</td>
              <td>{r.errors.length ? <span className="err">{r.errors.join('; ')}</span> : <span style={{ color: '#13a10e' }}>✓ Ready</span>}</td></tr>
          ))}
        </tbody></table></div>
      )}
    </Modal>
  )
}
