import { Link, Route, Routes, useParams } from 'react-router-dom'
import { useStore, useCtx } from '../shared/store'
import { EmptyState } from '../shared/ui'
import { QuoteList, ClientQuote } from './ops/QuoteViews'
import { QuoteBuilder } from './ops/QuoteBuilder'
import './ops/ops.css'

/** A client contact only ever reaches their own organisation's non-draft quotes. */
function QuoteDetail() {
  const { id } = useParams()
  const d = useStore(s => s.data)
  const { persona, orgId } = useCtx()
  if (persona === 'client') {
    const q = d.quotes.find(x => x.id === id && x.orgId === orgId && x.status !== 'Draft')
    if (!q) return <EmptyState title="Quote not found" text="This quote is not available to your organisation." action={<Link to="/quotes">Back to quotes</Link>} />
    return <ClientQuote q={q} />
  }
  return <QuoteBuilder key={id} />
}

export default function Quotes() {
  return (
    <Routes>
      <Route index element={<QuoteList />} />
      <Route path=":id" element={<QuoteDetail />} />
    </Routes>
  )
}
