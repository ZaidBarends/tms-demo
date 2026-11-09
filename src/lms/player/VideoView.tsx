import { useEffect, useRef, useState } from 'react'
import { Button, Menu, MenuItem, MenuList, MenuPopover, MenuTrigger, ToggleButton } from '@fluentui/react-components'
import { Play24Filled, Pause24Filled, ClosedCaption24Regular, Bookmark24Regular, Bookmark24Filled } from '@fluentui/react-icons'
import { fmtClock, type Lesson } from '../content'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]

export default function VideoView({ lesson, courseTitle, startAt, bookmarks, onBookmark, onWatched, watched }: {
  lesson: Lesson; courseTitle: string; startAt: number; bookmarks: number[]; onBookmark: (t: number) => void; onWatched: () => void; watched: boolean
}) {
  const duration = lesson.duration ?? 200
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(startAt)
  const [speed, setSpeed] = useState(1)
  const [cc, setCc] = useState(true)
  const fired = useRef(false)

  useEffect(() => { setT(startAt) }, [startAt])
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setT(x => {
      const n = x + 0.25 * speed
      if (n >= duration) { setPlaying(false); return duration }
      return n
    }), 250)
    return () => clearInterval(id)
  }, [playing, speed, duration])
  useEffect(() => { if (!fired.current && t >= duration * 0.9) { fired.current = true; onWatched() } }, [t, duration, onWatched])

  const captions = lesson.captions ?? []
  const caption = captions[Math.min(captions.length - 1, Math.floor((t / duration) * captions.length))]
  const chapter = [...(lesson.chapters ?? [])].reverse().find(c => t >= c.t)
  const marked = bookmarks.some(b => Math.abs(b - t) < 5)
  const toggle = () => { if (t >= duration) setT(0); setPlaying(p => !p) }

  return (
    <div>
      <div className="lms-video" role="region" aria-label={`Video: ${lesson.title} (demo player, no real media)`}>
        <button className="lms-video-stage" onClick={toggle} aria-label={playing ? 'Pause video' : 'Play video'}>
          {!playing && <span className="lms-video-big" aria-hidden><Play24Filled /></span>}
          <span className="lms-video-title">{courseTitle}<small>{chapter?.title}</small></span>
          {cc && <span className="lms-video-cc" aria-live="off">{caption}</span>}
        </button>
        <div className="lms-video-bar">
          <Button appearance="transparent" style={{ color: '#fff' }} icon={playing ? <Pause24Filled /> : <Play24Filled />} onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} />
          <span className="lms-time" aria-live="off">{fmtClock(t)} / {fmtClock(duration)}</span>
          <input type="range" className="lms-scrub" min={0} max={duration} step={1} value={Math.round(t)} onChange={e => setT(Number(e.target.value))}
            aria-label="Seek" aria-valuetext={`${fmtClock(t)} of ${fmtClock(duration)}`} style={{ ['--pct' as any]: `${(t / duration) * 100}%` }} />
          <Menu>
            <MenuTrigger disableButtonEnhancement><Button size="small" appearance="transparent" style={{ color: '#fff' }} aria-label="Playback speed">{speed}x</Button></MenuTrigger>
            <MenuPopover><MenuList>{SPEEDS.map(s => <MenuItem key={s} onClick={() => setSpeed(s)}>{s}x{s === speed ? ' (current)' : ''}</MenuItem>)}</MenuList></MenuPopover>
          </Menu>
          <ToggleButton size="small" appearance="transparent" style={{ color: '#fff' }} checked={cc} onClick={() => setCc(!cc)} icon={<ClosedCaption24Regular />} aria-label="Captions">{cc ? 'On' : 'Off'}</ToggleButton>
          <Button size="small" appearance="transparent" style={{ color: '#fff' }} icon={marked ? <Bookmark24Filled /> : <Bookmark24Regular />} onClick={() => onBookmark(Math.round(t))} aria-label="Bookmark this moment" />
        </div>
      </div>
      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <div className="chips" aria-label="Chapters">
          {lesson.chapters?.map(c => <button key={c.t} className={`lms-chapter ${chapter?.t === c.t ? 'on' : ''}`} onClick={() => { setT(c.t); setPlaying(true) }}>{fmtClock(c.t)} {c.title}</button>)}
        </div>
        {!watched && <Button size="small" onClick={() => { setT(duration); onWatched() }}>Mark as watched</Button>}
        {watched && <span className="chip">Watched</span>}
      </div>
    </div>
  )
}
