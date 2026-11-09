import { useEffect, useRef, useState } from 'react'
import { Button, Input } from '@fluentui/react-components'
import { fmtDateTime } from '../shared/format'
import { useTalent } from './talentStore'

const REPLIES = {
  learner: ['Thanks for the details. Could you tell me more about the team?', 'That works for me. Please send a calendar invite.', 'I would like to understand the salary range before we go further.'],
  recruiter: ['Great, I will set that up and confirm by email.', 'Thanks, the hiring manager will be in touch this week.', 'Understood. I will share the job description shortly.'],
}

/** Mock message thread. Opens only once an introduction is approved. */
export function Thread({ introId, me, firstMessage, firstFrom, firstAt, open }: {
  introId: string; me: 'recruiter' | 'learner'; firstMessage: string; firstFrom: 'recruiter'; firstAt: string; open: boolean
}) {
  const msgs = useTalent(s => s.threads[introId]) ?? []
  const post = useTalent(s => s.postMessage)
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight }, [msgs.length, introId])
  const other = me === 'recruiter' ? 'learner' : 'recruiter'
  const send = () => {
    if (!text.trim()) return setErr('Type a message first.')
    post(introId, me, text.trim()); setText(''); setErr('')
  }
  const simulate = () => { const pool = REPLIES[other]; post(introId, other, pool[msgs.length % pool.length]) }
  const all = [{ id: 'first', from: firstFrom, text: firstMessage, at: firstAt }, ...msgs]
  return (
    <div>
      <div className="tal-thread" ref={box} role="log" aria-label="Message thread">
        {all.map(m => (
          <div key={m.id} className={`tal-msg${m.from === me ? ' mine' : ''}`}>
            {m.text}
            <div className="when">{m.from === 'recruiter' ? 'Recruiter' : 'Candidate'} · {fmtDateTime(m.at)}</div>
          </div>
        ))}
      </div>
      {open ? (
        <div style={{ marginTop: 8 }}>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <Input style={{ flex: 1 }} value={text} onChange={(_, d) => setText(d.value)} placeholder="Write a message" aria-label="Message" onKeyDown={e => { if (e.key === 'Enter') send() }} />
            <Button appearance="primary" onClick={send}>Send</Button>
          </div>
          {err && <span className="err">{err}</span>}
          <div style={{ marginTop: 6 }}><Button size="small" appearance="subtle" onClick={simulate}>Demo: simulate a reply from the {other}</Button></div>
        </div>
      ) : <p className="muted small">Messaging opens once the candidate approves the introduction.</p>}
    </div>
  )
}
