import { useState } from 'react'
import { Button, Tab, TabList, Textarea } from '@fluentui/react-components'
import { ArrowDownload24Regular, Bookmark24Filled } from '@fluentui/react-icons'
import { Card, EmptyState } from '../../shared/ui'
import { downloadBlob } from '../csv'
import { fmtClock, type Lesson, type Resource } from '../content'

type Tabv = 'notes' | 'bookmarks' | 'resources'

export default function SidePanel({ enrolId, lesson, lessons, notes, setNote, bookmarks, jump, removeBookmark, resources, courseTitle }: {
  enrolId: string; lesson: Lesson | undefined; lessons: Lesson[]; notes: Record<string, string>; setNote: (lessonId: string, text: string) => void
  bookmarks: string[]; jump: (key: string) => void; removeBookmark: (key: string) => void; resources: Resource[]; courseTitle: string
}) {
  const [tab, setTab] = useState<Tabv>('notes')
  const allNotes = lessons.filter(l => (notes[`${enrolId}|${l.id}`] ?? '').trim())
  const label = (key: string) => {
    const [lid, pos] = key.split('#'); const l = lessons.find(x => x.id === lid)
    return `${l?.title ?? 'Lesson'} · ${pos.startsWith('t') ? `video at ${fmtClock(Number(pos.slice(1)))}` : `slide ${Number(pos) + 1}`}`
  }
  const exportNotes = () => downloadBlob(`${courseTitle.replace(/\W+/g, '-').toLowerCase()}-notes.txt`,
    `${courseTitle}\nMy notes\n\n` + allNotes.map(l => `## ${l.title}\n${notes[`${enrolId}|${l.id}`]}\n`).join('\n'))
  const cur = lesson ? notes[`${enrolId}|${lesson.id}`] ?? '' : ''
  return (
    <Card>
      <TabList selectedValue={tab} onTabSelect={(_, d) => setTab(d.value as Tabv)} size="small">
        <Tab value="notes">Notes{allNotes.length ? ` (${allNotes.length})` : ''}</Tab>
        <Tab value="bookmarks">Bookmarks{bookmarks.length ? ` (${bookmarks.length})` : ''}</Tab>
        <Tab value="resources">Resources</Tab>
      </TabList>
      <div style={{ marginTop: 12 }}>
        {tab === 'notes' && (lesson ? (
          <>
            <label htmlFor="lms-note" className="small muted">Notes for “{lesson.title}” are saved automatically.</label>
            <Textarea id="lms-note" value={cur} onChange={(_, d) => setNote(lesson.id, d.value)} rows={4} resize="vertical" style={{ width: '100%', marginTop: 6 }} placeholder="Write what you want to remember or ask your trainer" />
            <div className="row" style={{ marginTop: 8, justifyContent: 'space-between' }}>
              <span className="small muted">{cur.trim() ? `${cur.trim().split(/\s+/).length} words · saved` : 'Nothing written yet'}</span>
              <Button size="small" icon={<ArrowDownload24Regular />} disabled={!allNotes.length} onClick={exportNotes}>Download all notes</Button>
            </div>
          </>
        ) : <EmptyState title="Open a lesson to take notes" />)}
        {tab === 'bookmarks' && (bookmarks.length === 0 ? <EmptyState title="No bookmarks yet" text="Use the bookmark button on a slide or in the video." /> : (
          <ul className="lms-list">{bookmarks.map(k => (
            <li key={k}><button className="lms-linkbtn" onClick={() => jump(k)}><Bookmark24Filled style={{ verticalAlign: 'middle', color: '#f7630c' }} /> {label(k)}</button>
              <Button size="small" appearance="subtle" onClick={() => removeBookmark(k)} aria-label={`Remove bookmark ${label(k)}`}>Remove</Button></li>
          ))}</ul>
        ))}
        {tab === 'resources' && (
          <ul className="lms-list">{resources.map(r => (
            <li key={r.name}><span><b>{r.name}</b><div className="small muted">{r.kind} · {r.size}</div></span>
              <Button size="small" icon={<ArrowDownload24Regular />} onClick={() => downloadBlob(r.name.endsWith('.pdf') ? r.name.replace('.pdf', '.txt') : r.name, r.text)}>Download</Button></li>
          ))}</ul>
        )}
      </div>
    </Card>
  )
}
