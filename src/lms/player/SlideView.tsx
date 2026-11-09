import { useEffect, useRef } from 'react'
import { Button, Tooltip } from '@fluentui/react-components'
import { Bookmark24Filled, Bookmark24Regular, ArrowLeft24Regular, ArrowRight24Regular } from '@fluentui/react-icons'
import type { Lesson } from '../content'

export default function SlideView({ lesson, index, setIndex, bookmarked, onBookmark, onSeenAll }: {
  lesson: Lesson; index: number; setIndex: (n: number) => void; bookmarked: boolean; onBookmark: () => void; onSeenAll: () => void
}) {
  const slides = lesson.slides ?? []
  const last = slides.length - 1
  const s = slides[Math.min(index, last)]
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { if (index >= last) onSeenAll() }, [index, last, onSeenAll])
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
      if (document.querySelector('[role="dialog"]')) return
      if (ev.key === 'ArrowRight') { ev.preventDefault(); setIndex(Math.min(last, index + 1)) }
      if (ev.key === 'ArrowLeft') { ev.preventDefault(); setIndex(Math.max(0, index - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, last, setIndex])

  if (!s) return null
  return (
    <div ref={ref}>
      <div className="lms-slide" role="region" aria-roledescription="slide" aria-label={`Slide ${index + 1} of ${slides.length}: ${s.title}`} aria-live="polite">
        <div className="lms-slide-top">
          <span className="small" style={{ opacity: .85 }}>Packaged lesson (SCORM mock) · slide {index + 1} of {slides.length}</span>
          <Tooltip content={bookmarked ? 'Remove bookmark' : 'Bookmark this slide'} relationship="label">
            <Button appearance="transparent" style={{ color: '#fff' }} icon={bookmarked ? <Bookmark24Filled /> : <Bookmark24Regular />} onClick={onBookmark} aria-pressed={bookmarked} />
          </Tooltip>
        </div>
        <h2>{s.title}</h2>
        {s.body && <p className="lms-slide-body">{s.body}</p>}
        {s.bullets && <ul>{s.bullets.map(b => <li key={b}>{b}</li>)}</ul>}
        {s.callout && <div className="lms-slide-callout">{s.callout}</div>}
      </div>
      <div className="lms-slide-nav">
        <Button icon={<ArrowLeft24Regular />} disabled={index === 0} onClick={() => setIndex(index - 1)} aria-label="Previous slide">Previous</Button>
        <div className="lms-dots" role="tablist" aria-label="Slides">
          {slides.map((x, i) => <button key={i} role="tab" aria-selected={i === index} aria-label={`Slide ${i + 1}: ${x.title}`} className={i === index ? 'on' : ''} onClick={() => setIndex(i)} />)}
        </div>
        <Button icon={<ArrowRight24Regular />} iconPosition="after" disabled={index === last} onClick={() => setIndex(index + 1)} aria-label="Next slide">Next</Button>
      </div>
      <p className="muted small" style={{ textAlign: 'center', margin: '6px 0 0' }}>Tip: use the left and right arrow keys to move between slides.</p>
    </div>
  )
}
