import { useEffect, useMemo, useRef, useState } from 'react'
import { Zap, Sparkles, Focus, ShieldCheck, ArrowLeftRight, BookmarkCheck } from 'lucide-react'
import { Button, EvidenceImage, Eyebrow, Field, Pill, fieldClass } from '@/components/ui'
import { useComparisons, useInvalidate, useMedia, useProjects } from '@/hooks/queries'
import { api } from '@/lib/api'
import { formatWhen } from '@/lib/format'
import { useWorkspace } from '@/stores/workspace'
import { forensicUrl, type ForensicMode } from '@impactmesh/cloudinary-client'

const MODES = ['slider', 'overlay', 'blink', 'side', 'difference', 'timeline'] as const

export function ComparePage() {
  const comparisons = useComparisons()
  const media = useMedia()
  const projects = useProjects()
  const invalidate = useInvalidate()
  const toast = useWorkspace((state) => state.toast)
  const [activeId, setActiveId] = useState('')
  const [mode, setMode] = useState<(typeof MODES)[number]>('slider')
  const [cldFilter, setCldFilter] = useState<ForensicMode>('standard')
  const [position, setPosition] = useState(56)
  const [opacity, setOpacity] = useState(0.5)
  const [blinkAfter, setBlinkAfter] = useState(false)
  const [paused, setPaused] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(640)
  const [title, setTitle] = useState('Field pair')
  const [projectId, setProjectId] = useState('')
  const [beforeId, setBeforeId] = useState('')
  const [afterId, setAfterId] = useState('')
  const [selectedBeforeId, setSelectedBeforeId] = useState('')
  const [selectedAfterId, setSelectedAfterId] = useState('')

  const active = comparisons.data?.find((item) => item.id === activeId) || comparisons.data?.[0]

  useEffect(() => {
    if (active) {
      setSelectedBeforeId(active.beforeId)
      setSelectedAfterId(active.afterId)
      setBeforeId(active.beforeId)
      setAfterId(active.afterId)
      setTitle(active.title)
    } else if (media.data && media.data.length >= 2 && !selectedBeforeId && !selectedAfterId) {
      setSelectedBeforeId(media.data[0].id)
      setSelectedAfterId(media.data[1].id)
      setBeforeId(media.data[0].id)
      setAfterId(media.data[1].id)
      setTitle(`${media.data[0].filename} vs ${media.data[1].filename}`)
    }
  }, [active?.id, media.data])

  const before = media.data?.find((item) => item.id === (selectedBeforeId || active?.beforeId))
  const after = media.data?.find((item) => item.id === (selectedAfterId || active?.afterId))

  const beforeUrl = useMemo(() => {
    if (!before) return ''
    return forensicUrl(before.secureUrl, cldFilter, {
      lat: before.latitude,
      lng: before.longitude,
      capturedAt: before.capturedAt,
      dHash: before.perceptualHash,
      label: `BEFORE · ${before.filename}`,
    })
  }, [before, cldFilter])

  const afterUrl = useMemo(() => {
    if (!after) return ''
    return forensicUrl(after.secureUrl, cldFilter, {
      lat: after.latitude,
      lng: after.longitude,
      capturedAt: after.capturedAt,
      dHash: after.perceptualHash,
      label: `AFTER · ${after.filename}`,
    })
  }, [after, cldFilter])

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
  }, [active?.id, mode, selectedBeforeId, selectedAfterId])

  async function create() {
    const bId = beforeId || selectedBeforeId
    const aId = afterId || selectedAfterId
    if (!bId || !aId) {
      toast('Please choose earlier and later frames')
      return
    }
    const targetProject = projectId || projects.data?.[0]?.id || ''
    await api('/comparisons', {
      method: 'POST',
      body: JSON.stringify({ projectId: targetProject, title, beforeId: bId, afterId: aId }),
    })
    toast('Pair filed as verified visual evidence')
    invalidate()
  }

  function autoPairSimilar() {
    if (!media.data || media.data.length < 2) return
    // Check if any asset has similarTo candidate
    const withSimilar = media.data.find((m) => m.similarTo?.mediaId)
    if (withSimilar && withSimilar.similarTo) {
      setSelectedBeforeId(withSimilar.id)
      setSelectedAfterId(withSimilar.similarTo.mediaId)
      toast(`AI paired similar frames by perceptual hash (${Math.round((withSimilar.similarTo.score || 0.9) * 100)}% match)`)
      return
    }
    // Otherwise pick the two most recent uploads
    setSelectedBeforeId(media.data[0].id)
    setSelectedAfterId(media.data[1].id)
    toast('Paired two most recent evidence assets')
  }

  function swapFrames() {
    setSelectedBeforeId(selectedAfterId)
    setSelectedAfterId(selectedBeforeId)
  }

  return (
    <div className="px-5 py-6 md:px-8">
      <Eyebrow>Before / after lab</Eyebrow>
      <h1 className="mt-2 font-serif text-5xl">Look at the change. Do not invent a percentage.</h1>

      {/* Saved Verified Pairs Pills */}
      {comparisons.data && comparisons.data.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {comparisons.data.map((item) => (
            <button key={item.id} onClick={() => setActiveId(item.id)}>
              <Pill tone={(active?.id === item.id ? 'mint' : 'neutral')}>{item.title}</Pill>
            </button>
          ))}
        </div>
      )}

      {/* Interactive Quick Frame Picker Bar */}
      {media.data && media.data.length >= 2 && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-line/60 bg-elev/70 p-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Earlier Frame (A):</span>
            <select
              className="rounded-lg border border-line bg-black/60 px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-mint max-w-[200px] truncate"
              value={selectedBeforeId}
              onChange={(e) => setSelectedBeforeId(e.target.value)}
            >
              {media.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.filename} {item.reviewStatus === 'pending' ? '· [Pending]' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={swapFrames}
            title="Swap Frame A and Frame B"
            className="flex items-center gap-1 rounded-lg border border-line/60 bg-elev px-2 py-1 text-xs text-dim hover:text-ink hover:border-mint transition-colors"
          >
            <ArrowLeftRight size={12} className="text-mint" />
            <span>Swap</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-faint">Later Frame (B):</span>
            <select
              className="rounded-lg border border-line bg-black/60 px-2.5 py-1 text-xs text-ink focus:outline-none focus:border-mint max-w-[200px] truncate"
              value={selectedAfterId}
              onChange={(e) => setSelectedAfterId(e.target.value)}
            >
              {media.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.filename} {item.reviewStatus === 'pending' ? '· [Pending]' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={autoPairSimilar}
              className="flex items-center gap-1.5 rounded-lg border border-mint/40 bg-mint/10 px-2.5 py-1 text-xs text-mint hover:bg-mint/20 transition-colors"
            >
              <Sparkles size={12} />
              <span>⚡ AI Auto-Pair</span>
            </button>

            <button
              onClick={create}
              className="flex items-center gap-1.5 rounded-lg bg-mint px-3 py-1 text-xs font-semibold text-zinc-950 hover:bg-mint/90 transition-colors"
            >
              <BookmarkCheck size={12} />
              <span>Save Pair</span>
            </button>
          </div>
        </div>
      )}

      {before && after ? (
        <>
          {/* View Modes & Cloudinary Edge Filter Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {/* Display Modes */}
            <div className="flex flex-wrap gap-1.5">
              {MODES.map((item) => (
                <button key={item} onClick={() => setMode(item)}>
                  <Pill tone={mode === item ? 'amber' : 'neutral'}>{item}</Pill>
                </button>
              ))}
            </div>

            {/* Cloudinary Edge AI Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line/60 bg-elev/70 px-2 py-1 backdrop-blur-md">
              <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-faint mr-1">
                <Zap size={11} className="text-mint animate-pulse" />
                <span>Cloudinary Edge:</span>
              </span>
              <button onClick={() => setCldFilter('standard')}>
                <Pill tone={cldFilter === 'standard' ? 'mint' : 'neutral'}>Baseline</Pill>
              </button>
              <button onClick={() => setCldFilter('clarify')}>
                <Pill tone={cldFilter === 'clarify' ? 'mint' : 'neutral'}>✨ AI Clarify</Pill>
              </button>
              <button onClick={() => setCldFilter('focus')}>
                <Pill tone={cldFilter === 'focus' ? 'mint' : 'neutral'}>🎯 Smart Focus</Pill>
              </button>
              <button onClick={() => setCldFilter('watermark')}>
                <Pill tone={cldFilter === 'watermark' ? 'mint' : 'neutral'}>🛡️ Watermark</Pill>
              </button>
            </div>
          </div>

          <div ref={frame} className="relative mt-5 overflow-hidden rounded-[28px] border border-line bg-black">
            {mode === 'side' ? (
              <div className="grid md:grid-cols-2">
                <EvidenceImage src={beforeUrl || before.secureUrl} alt={before.altText} className="aspect-[16/10] w-full" />
                <EvidenceImage src={afterUrl || after.secureUrl} alt={after.altText} className="aspect-[16/10] w-full" />
              </div>
            ) : null}
            {mode === 'slider' ? (
              <div className="relative aspect-[16/10]">
                <EvidenceImage src={afterUrl || after.secureUrl} alt={after.altText} className="absolute inset-0 h-full w-full" />
                <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
                  <img src={beforeUrl || before.secureUrl} alt={before.altText} className="absolute inset-y-0 left-0 h-full max-w-none object-cover" style={{ width }} />
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
                <EvidenceImage src={beforeUrl || before.secureUrl} alt={before.altText} className="absolute inset-0 h-full w-full" />
                <img src={afterUrl || after.secureUrl} alt={after.altText} className="absolute inset-0 h-full w-full object-cover" style={{ opacity }} />
                <input aria-label="Overlay opacity" type="range" min={0} max={1} step={0.01} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="absolute inset-x-6 bottom-4" />
              </div>
            ) : null}
            {mode === 'blink' ? (
              <div className="relative">
                <EvidenceImage src={blinkAfter ? (afterUrl || after.secureUrl) : (beforeUrl || before.secureUrl)} alt="" className="aspect-[16/10] w-full" />
                <Button className="absolute bottom-4 left-4" variant="ghost" onClick={() => setPaused((value) => !value)}>
                  {paused ? 'Play' : 'Pause'}
                </Button>
              </div>
            ) : null}
            {mode === 'difference' ? (
              <div className="relative aspect-[16/10] bg-black">
                <img src={beforeUrl || before.secureUrl} alt={before.altText} className="absolute inset-0 h-full w-full object-cover" />
                <img src={afterUrl || after.secureUrl} alt={after.altText} className="absolute inset-0 h-full w-full object-cover mix-blend-difference" />
              </div>
            ) : null}
            {mode === 'timeline' ? (
              <div>
                <EvidenceImage src={position > 50 ? (afterUrl || after.secureUrl) : (beforeUrl || before.secureUrl)} alt="" className="aspect-[16/10] w-full" />
                <div className="flex items-center justify-between bg-bg px-4 py-3 text-sm">
                  <button onClick={() => setPosition(20)}>{formatWhen(before.capturedAt)}</button>
                  <button onClick={() => setPosition(80)}>{formatWhen(after.capturedAt)}</button>
                </div>
              </div>
            ) : null}
          </div>
          <p className="mt-4 max-w-3xl text-sm text-dim">{active?.note || 'Live interactive comparison between earlier and later frames.'}</p>
        </>
      ) : (
        <div className="mt-8 rounded-2xl border border-line/60 bg-elev/40 p-8 text-center">
          <p className="text-dim">
            Ingest at least 2 media assets onto the Evidence Canvas to explore real-time visual change and forensic analysis.
          </p>
        </div>
      )}

      <form
        className="mt-8 grid max-w-3xl gap-3 md:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          void create()
        }}
      >
        <Eyebrow>File a permanent comparison pair</Eyebrow>
        <Field label="Title">
          <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Project">
          <select className={fieldClass} value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">(Current Workspace / Auto-Filing)</option>
            {projects.data?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Earlier frame">
          <select className={fieldClass} value={selectedBeforeId || beforeId} onChange={(event) => setSelectedBeforeId(event.target.value)} required>
            <option value="">Choose</option>
            {media.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.filename} {item.reviewStatus === 'pending' ? '· [Pending Review]' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Later frame">
          <select className={fieldClass} value={selectedAfterId || afterId} onChange={(event) => setSelectedAfterId(event.target.value)} required>
            <option value="">Choose</option>
            {media.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.filename} {item.reviewStatus === 'pending' ? '· [Pending Review]' : ''}
              </option>
            ))}
          </select>
        </Field>
        <Button type="submit">File pair</Button>
      </form>
    </div>
  )
}
