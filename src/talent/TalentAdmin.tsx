import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Tab, TabList } from '@fluentui/react-components'
import { useStore } from '../shared/store'
import { PageHeader, Stat } from '../shared/ui'
import { ringfenceStats } from './ringfence'
import { useTalent } from './talentStore'
import { Approvals } from './admin/Approvals'
import { AuditLog, RecruiterActivity } from './admin/ActivityAudit'
import { Ringfence } from './admin/Ringfence'
import './talent.css'

type TabId = 'approvals' | 'activity' | 'audit' | 'ringfence'

export default function TalentAdmin() {
  const d = useStore(s => s.data)
  const apps = useTalent(s => s.applications)
  const [params] = useSearchParams()
  const wanted = (['approvals', 'activity', 'audit', 'ringfence'] as TabId[]).find(t => t === params.get('tab'))
  const [tab, setTab] = useState<TabId>(wanted ?? 'approvals')
  const focusQueue = params.get('focus') === 'approvals'
  useEffect(() => {
    if (!focusQueue) return
    const t = setTimeout(() => document.getElementById('approval-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250)
    return () => clearTimeout(t)
  }, [focusQueue])
  const s = ringfenceStats(d)
  const pending = apps.filter(a => a.linkedId ? !d.recruiters.find(r => r.id === a.linkedId)?.approved && a.status !== 'Rejected' : a.status === 'Pending').length
  return (
    <>
      <PageHeader id="talent-admin" title="Talent admin" subtitle="Recruiter approvals, activity, audit log and the ringfencing check" />
      <div className="grid c4" style={{ marginBottom: 16 }}>
        <Stat label="Awaiting approval" value={pending} />
        <Stat label="Approved recruiters" value={d.recruiters.filter(r => r.approved).length} />
        <Stat label="Audit entries" value={d.audit.length} />
        <Stat label="Profiles visible" value={s.visible} hint={`${s.excludedLearners} learners ringfenced`} />
      </div>
      <TabList className="tal-tabs" selectedValue={tab} onTabSelect={(_, x) => setTab(x.value as TabId)}>
        <Tab value="approvals">Approvals ({pending})</Tab><Tab value="activity">Recruiter activity</Tab><Tab value="audit">Audit log</Tab><Tab value="ringfence">Ringfencing</Tab>
      </TabList>
      {tab === 'approvals' && <div id="approval-queue" className={focusQueue ? 'focus-pulse' : undefined} style={{ scrollMarginTop: 'calc(var(--stick-top, 72px) + var(--head-h, 0px) + 56px)' }}><Approvals /></div>}
      {tab === 'activity' && <RecruiterActivity />}
      {tab === 'audit' && <AuditLog />}
      {tab === 'ringfence' && <Ringfence />}
    </>
  )
}
