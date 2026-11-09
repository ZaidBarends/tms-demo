import { useState } from 'react'
import { Button } from '@fluentui/react-components'
import { Card } from '../shared/ui'
import { money } from '../shared/format'
import { COUPONS, findCoupon, type Coupon, type Priced } from './pricing'
import type { Course } from '../shared/types'

export function OrderSummary({ course, priced, coupon, setCoupon, locked, dateLabel }: {
  course: Course; priced: Priced; coupon: Coupon | null; setCoupon: (c: Coupon | null) => void; locked: boolean; dateLabel: string
}) {
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('')
  const apply = () => {
    const c = findCoupon(code)
    if (!code.trim()) return setMsg('Enter a coupon code')
    if (!c) return setMsg('That code is not valid. Try WELCOME10 or DEMO15.')
    setCoupon(c); setMsg(''); setCode('')
  }
  return (
    <Card title="Order summary">
      <b>{course.title}</b>
      <div className="muted small">{course.code} · {course.hours} hours · {dateLabel}</div>
      <table className="tbl" style={{ marginTop: 10 }}><tbody>
        <tr><td>Price</td><td className="num">{money(priced.price)}</td></tr>
        {coupon && <tr><td>Coupon <span className="chip">{coupon.code}</span> {!locked && <button className="lms-linkbtn" onClick={() => setCoupon(null)}>remove</button>}</td><td className="num">-{money(priced.discount)}</td></tr>}
        <tr><td>Subtotal ex VAT</td><td className="num">{money(priced.net)}</td></tr>
        <tr><td>VAT (15%)</td><td className="num">{money(priced.vat)}</td></tr>
        <tr><td><b>Total to pay</b></td><td className="num"><b>{money(priced.total)}</b></td></tr>
      </tbody></table>
      {!locked && !coupon && (
        <div style={{ marginTop: 10 }}>
          <label htmlFor="co-code" className="small"><b>Have a coupon?</b></label>
          <div className="row" style={{ marginTop: 4 }}>
            <input id="co-code" className="b2c-input" value={code} onChange={e => setCode(e.target.value)} placeholder="WELCOME10" onKeyDown={e => e.key === 'Enter' && apply()} />
            <Button onClick={apply}>Apply</Button>
          </div>
          {msg && <div className="err" role="alert" style={{ marginTop: 4 }}>{msg}</div>}
          <div className="small muted" style={{ marginTop: 4 }}>Try {COUPONS.map(c => c.code).join(', ')}</div>
        </div>
      )}
    </Card>
  )
}

export function Stepper({ steps, step }: { steps: string[]; step: number }) {
  return (
    <ol className="lms-steps" aria-label="Checkout steps">
      {steps.map((s, i) => <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''} aria-current={i === step ? 'step' : undefined}><span>{i < step ? '✓' : i + 1}</span>{s}</li>)}
    </ol>
  )
}
