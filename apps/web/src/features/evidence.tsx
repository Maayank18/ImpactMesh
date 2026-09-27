import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EvidenceDrawer, usePreview } from '@/components/evidence'
import { EvidenceImage, Eyebrow, Pill } from '@/components/ui'
import { useMedia, useMediaDetail, useProjects } from '@/hooks/queries'
import { formatWhen } from '@/lib/format'

export function EvidencePage() {
  const { mediaId } = useParams()
  const projects = useProjects()
  const [projectId, setProjectId] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<string | null>(mediaId ?? null)
  const media = useMedia({ projectId: projectId || undefined, reviewStatus: status || undefined })
  const detail = useMediaDetail(selected)
  const preview = usePreview(selected, detail.data?.media.secureUrl)
  const items = media.data ?? []
  const active = useMemo(() => items.find((item) => item.id === selected) ?? null, [items, selected])

  return (
    <div className="flex h-full min-h-[calc(100vh-65px)]">
      <div className="min-w-0 flex-1 overflow-auto px-5 py-6 md:px-8">
        <Eyebrow>Evidence library</Eyebrow>
        <h1 className="mt-2 font-serif text-5xl">Every frame in the record.</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <select className="rounded-full border border-line bg-elev px-3 py-2 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="">All projects</option>
            {projects.data?.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <select className="rounded-full border border-line bg-elev px-3 py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">Any review state</option>
            <option value="approved">Verified</option>
            <option value="pending">Needs review</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              className={`overflow-hidden rounded-2xl border text-left ${active?.id === item.id ? 'border-mint' : 'border-line'}`}
              onClick={() => setSelected(item.id)}
            >
              <EvidenceImage src={item.secureUrl} alt={item.altText} className="aspect-[4/3] w-full" />
              <div className="space-y-2 p-3">
                <p className="truncate font-mono text-xs">{item.filename}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-dim">{formatWhen(item.capturedAt)}</span>
                  <Pill tone={item.reviewStatus === 'approved' ? 'mint' : item.reviewStatus === 'pending' ? 'amber' : 'rose'}>
                    {item.reviewStatus}
                  </Pill>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      {detail.data ? <EvidenceDrawer detail={detail.data} preview={preview} onClose={() => setSelected(null)} /> : null}
    </div>
  )
}
