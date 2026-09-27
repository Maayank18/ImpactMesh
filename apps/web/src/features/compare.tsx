import { useEffect, useRef, useState } from 'react'
import { Button, EvidenceImage, Eyebrow, Field, Pill, fieldClass } from '@/components/ui'
import { useComparisons, useInvalidate, useMedia, useProjects } from '@/hooks/queries'
import { api } from '@/lib/api'
import { formatWhen } from '@/lib/format'
import { useWorkspace } from '@/stores/workspace'

const MODES = ['slider', 'overlay', 'blink', 'side', 'difference', 'timeline'] as const

export function ComparePage() {
  const comparisons = useComparisons()
  const media = useMedia()
  const projects = useProjects()
  const invalidate = useInvalidate()
  const toast = useWorkspace((state) => state.toast)
  const [activeId, setActiveId] = useState('')
  const [mode, setMode] = useState<(typeof MODES)[number]>('slider')
  const [position, setPosition] = useState(56)
  const [opacity, setOpacity] = useState(0.5)
  const [blinkAfter, setBlinkAfter] = useState(false)
  const [paused, setPaused] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const active = comparisons.data?.find((item) => item.id === activeId) || comparisons.data?.[0]
  const before = media.data?.find((item) => item.id === active?.beforeId)
  const after = media.data?.find((item) => item.id === active?.afterId)
  const [title, setTitle] = useState('Field pair')
  const [projectId, setProjectId] = useState('proj_yamuna')
  const [beforeId, setBeforeId] = useState('')
  const [afterId, setAfterId] = useState('')

  useEffect(() => {
    if (mode !== 'blink' || paused) return
    const timer = window.setInterval(() => setBlinkAfter((value) => !value), 700)
    return () => window.clearInterval(timer)
  }, [mode, paused])

  useEffect(() => {
    const element = frame.current
    if (!element) return
    const observer = new ResizeObserver(() => setWidth(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [active?.id, mode])

  async function create() {
    await api('/comparisons', {
      method: 'POST',
      body: JSON.stringify({ projectId, title, beforeId, afterId }),
    })
    toast('Pair filed as visual evidence')
    invalidate()
  }

  return (
    <div className="px-5 py-6 md:px-8">
      <Eyebrow>Before / after lab</Eyebrow>
      <h1 className="mt-2 font-serif text-5xl">Look at the change. Do not invent a percentage.</h1>
      <div className="mt-4 flex flex-wrap gap-2">
        {comparisons.data?.map((item) => (
          <button key={item.id} onClick={() => setActiveId(item.id)}>
            <Pill tone={(active?.id === item.id ? 'mint' : 'neutral')}>{item.title}</Pill>
          </button>
        ))}
      </div>
      {before && after ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {MODES.map((item) => (
              <button key={item} onClick={() => setMode(item)}>
                <Pill tone={mode === item ? 'amber' : 'neutral'}>{item}</Pill>
              </button>
            ))}
          </div>
          <div ref={frame} className="relative mt-5 overflow-hidden rounded-[28px] border border-line bg-black">
            {mode === 'side' ? (
              <div className="grid md:grid-cols-2">
                <EvidenceImage src={before.secureUrl} alt={before.altText} className="aspect-[16/10] w-full" />
                <EvidenceImage src={after.secureUrl} alt={after.altText} className="aspect-[16/10] w-full" />
              </div>
            ) : null}
            {mode === 'slider' ? (
              <div className="relative aspect-[16/10]">
                <EvidenceImage src={after.secureUrl} alt={after.altText} className="absolute inset-0 h-full w-full" />
                <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
                  <img src={before.secureUrl} alt={before.altText} className="absolute inset-y-0 left-0 h-full max-w-none object-cover" style={{ width }} />
                </div>
                <input
                  aria-label="Comparison position"
                  type="range"
                  min={0}
                  max={100}
                  value={position}
                  onChange={(event) => setPosition(Number(event.target.value))}
                  className="absolute inset-x-6 bottom-4"
                />
              </div>
            ) : null}
            {mode === 'overlay' ? (
              <div className="relative aspect-[16/10]">
                <EvidenceImage src={before.secureUrl} alt={before.altText} className="absolute inset-0 h-full w-full" />
                <img src={after.secureUrl} alt={after.altText} className="absolute inset-0 h-full w-full object-cover" style={{ opacity }} />
                <input aria-label="Overlay opacity" type="range" min={0} max={1} step={0.01} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="absolute inset-x-6 bottom-4" />
              </div>
            ) : null}
            {mode === 'blink' ? (
              <div className="relative">
                <EvidenceImage src={blinkAfter ? after.secureUrl : before.secureUrl} alt="" className="aspect-[16/10] w-full" />
                <Button className="absolute bottom-4 left-4" variant="ghost" onClick={() => setPaused((value) => !value)}>
                  {paused ? 'Play' : 'Pause'}
                </Button>
              </div>
            ) : null}
            {mode === 'difference' ? (
              <div className="relative aspect-[16/10] bg-black">
                <img src={before.secureUrl} alt={before.altText} className="absolute inset-0 h-full w-full object-cover" />
                <img src={after.secureUrl} alt={after.altText} className="absolute inset-0 h-full w-full object-cover mix-blend-difference" />
              </div>
            ) : null}
            {mode === 'timeline' ? (
              <div>
                <EvidenceImage src={position > 50 ? after.secureUrl : before.secureUrl} alt="" className="aspect-[16/10] w-full" />
                <div className="flex items-center justify-between bg-bg px-4 py-3 text-sm">
                  <button onClick={() => setPosition(20)}>{formatWhen(before.capturedAt)}</button>
                  <button onClick={() => setPosition(80)}>{formatWhen(after.capturedAt)}</button>
                </div>
              </div>
            ) : null}
          </div>
          <p className="mt-4 max-w-3xl text-sm text-dim">{active?.note}</p>
        </>
      ) : (
        <p className="mt-6 text-dim">File two approved assets to start a visual pair.</p>
      )}
      <form
        className="mt-8 grid max-w-3xl gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
      >
        <Eyebrow>File a new pair</Eyebrow>
        <Field label="Title">
          <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Project">
          <select className={fieldClass} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.data?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Earlier frame">
          <select className={fieldClass} value={beforeId} onChange={(event) => setBeforeId(event.target.value)} required>
            <option value="">Choose</option>
            {media.data?.filter((item) => item.reviewStatus === 'approved').map((item) => (
              <option key={item.id} value={item.id}>
                {item.filename}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Later frame">
          <select className={fieldClass} value={afterId} onChange={(event) => setAfterId(event.target.value)} required>
            <option value="">Choose</option>
            {media.data?.filter((item) => item.reviewStatus === 'approved').map((item) => (
              <option key={item.id} value={item.id}>
                {item.filename}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit">File pair</Button>
      </form>
    </div>
  )
}
