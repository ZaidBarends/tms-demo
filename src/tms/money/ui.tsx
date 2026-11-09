import { ReactNode } from 'react'
import { Area, AreaChart } from 'recharts'
import { Button, DrawerBody, DrawerHeader, DrawerHeaderTitle, OverlayDrawer, Tab, TabList } from '@fluentui/react-components'
import { Dismiss24Regular } from '@fluentui/react-icons'
import './money.css'

export function SideDrawer({ open, onClose, title, subtitle, children, size = 'medium' }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; size?: 'small' | 'medium' | 'large' }) {
  return (
    <OverlayDrawer open={open} onOpenChange={(_, d) => !d.open && onClose()} position="end" size={size} style={size === 'large' ? { width: 720, maxWidth: '100vw' } : undefined}>
      <DrawerHeader>
        <DrawerHeaderTitle action={<Button appearance="subtle" aria-label="Close panel" icon={<Dismiss24Regular />} onClick={onClose} />}>{title}</DrawerHeaderTitle>
        {subtitle && <div className="muted small" style={{ marginTop: 4 }}>{subtitle}</div>}
      </DrawerHeader>
      <DrawerBody>{children}</DrawerBody>
    </OverlayDrawer>
  )
}

export function Spark({ data, color = '#0f6cbd' }: { data: number[]; color?: string }) {
  const rows = data.map((v, i) => ({ i, v }))
  const id = `sp${color.slice(1)}`
  return (
    <AreaChart width={96} height={34} data={rows} margin={{ top: 3, right: 2, bottom: 2, left: 2 }} aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.35} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#${id})`} isAnimationActive={false} dot={false} />
    </AreaChart>
  )
}

export function Delta({ pct, goodWhenUp = true }: { pct: number; goodWhenUp?: boolean }) {
  const up = pct >= 0
  const good = pct === 0 ? true : up === goodWhenUp
  return <span className={`mny-delta ${good ? 'good' : 'bad'}`} aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(pct)} percent versus last month`}>{up ? '▲' : '▼'} {Math.abs(pct)}%</span>
}

export function Kpi({ label, value, delta, goodWhenUp, spark, color, hint }: { label: string; value: ReactNode; delta?: number; goodWhenUp?: boolean; spark?: number[]; color?: string; hint?: string }) {
  return (
    <div className="stat mny-kpi" role="group" aria-label={label}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div className="mny-kpi-row">
        <div className="stat-value">{value}</div>
        {spark && <Spark data={spark} color={color} />}
      </div>
      <div className="small muted">{delta !== undefined && <Delta pct={delta} goodWhenUp={goodWhenUp} />} {hint ?? (delta !== undefined ? 'vs last month' : '')}</div>
    </div>
  )
}

export function Tabs({ tabs, value, onChange }: { tabs: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <TabList selectedValue={value} onTabSelect={(_, d) => onChange(String(d.value))} style={{ marginBottom: 16 }}>
      {tabs.map(t => <Tab key={t.id} value={t.id}>{t.label}</Tab>)}
    </TabList>
  )
}

export function Timeline({ items }: { items: { id: string; at: string; text: string; tone?: 'ok' | 'bad' | 'info' | 'warn'; meta?: string }[] }) {
  return (
    <ol className="mny-timeline">
      {items.map(e => (
        <li key={e.id} className={e.tone ?? 'info'}>
          <div>{e.text}</div>
          <div className="muted small">{e.meta}</div>
        </li>
      ))}
    </ol>
  )
}
