import { useState } from 'react'
import { Eyebrow, Pill } from '@/components/ui'
import { useMe, useProjects } from '@/hooks/queries'
import { api } from '@/lib/api'
import { canEdit } from '@/lib/format'
import { useWorkspace } from '@/stores/workspace'
import type { MediaAsset } from '@impactmesh/shared-types'

const STAGES = ['uploaded', 'analyzing', 'connecting', 'ready'] as const

interface Row {
  id: string
  name: string
  status: string
  preview: string
}

export function UploadPage() {
  const projects = useProjects()
  const me = useMe()
  const remember = useWorkspace((state) => state.rememberPreview)
  const toast = useWorkspace((state) => state.toast)
  const [projectId, setProjectId] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [over, setOver] = useState(false)
  const editable = canEdit(me.data?.user.role)

  async function take(files: FileList | File[]) {
    if (!editable) {
      toast('This role can read the record, not add to it.')
      return
    }
    const signature = await api<{ mode: string; uploadUrl?: string; apiKey?: string; timestamp?: number; signature?: string; folder?: string; context?: string; cloudName?: string }>(
      '/uploads/signature',
      { method: 'POST', body: JSON.stringify({ projectId }) },
    )
    for (const file of Array.from(files)) {
      const preview = URL.createObjectURL(file)
      if (signature.mode === 'cloudinary' && signature.uploadUrl) {
        const body = new FormData()
        body.append('file', file)
        body.append('api_key', signature.apiKey || '')
        body.append('timestamp', String(signature.timestamp))
        body.append('signature', signature.signature || '')
        body.append('folder', signature.folder || '')
        body.append('context', signature.context || '')
        const uploaded = await fetch(signature.uploadUrl, { method: 'POST', body }).then((response) => response.json())
        const media = await api<MediaAsset>('/media/register', {
          method: 'POST',
          body: JSON.stringify({
            publicId: uploaded.public_id,
            secureUrl: uploaded.secure_url,
            projectId,
            filename: file.name,
            width: uploaded.width,
            height: uploaded.height,
            format: uploaded.format,
            resourceType: uploaded.resource_type,
          }),
        })
        remember(media.id, preview)
        track(media.id, file.name, preview)
      } else {
        const body = new FormData()
        body.append('file', file)
        if (projectId) body.append('projectId', projectId)
        const media = await api<MediaAsset>('/uploads/direct', { method: 'POST', body })
        remember(media.id, preview)
        track(media.id, file.name, preview)
      }
    }
  }

  function track(id: string, name: string, preview: string) {
    setRows((current) => [{ id, name, status: 'uploaded', preview }, ...current])
    const timer = window.setInterval(async () => {
      const media = await api<MediaAsset>(`/media/${id}`)
      setRows((current) => current.map((row) => (row.id === id ? { ...row, status: media.aiStatus } : row)))
      if (media.aiStatus === 'ready' || media.aiStatus === 'failed') {
        window.clearInterval(timer)
        toast(media.aiStatus === 'ready' ? `${name} is in the record` : `${name} could not be analyzed`)
      }
    }, 700)
  }

  return (
    <div className="px-5 py-6 md:px-8">
      <Eyebrow>Ingestion</Eyebrow>
      <h1 className="mt-2 font-serif text-5xl">Drop the field set.</h1>
      <p className="mt-3 max-w-xl text-dim">
        Files go to Cloudinary when it is connected. Otherwise they stay on this machine, get a perceptual hash, and
        run through the same review route.
      </p>
      <label className="mt-6 block max-w-xs">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">File into</span>
        <select className="mt-2 w-full rounded-full border border-line bg-elev px-3 py-2 text-sm" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
          <option value="">Decide during review</option>
          {projects.data?.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      <label
        className={`mt-6 grid min-h-64 cursor-pointer place-items-center rounded-[28px] border border-dashed px-6 text-center ${over ? 'border-mint bg-mint/5' : 'border-line'}`}
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault()
          setOver(false)
          void take(event.dataTransfer.files)
        }}
      >
        <input
          type="file"
          accept="image/*,video/mp4,video/webm"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void take(event.target.files)
          }}
        />
        <div>
          <p className="font-serif text-4xl">Drop images or videos here</p>
          <p className="mt-3 text-sm text-dim">or browse files · JPEG, PNG, WebP, HEIC, MP4, WebM</p>
          <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Cloudinary when configured · local disk in the demo</p>
        </div>
      </label>
      <ul className="mt-6 space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-line p-3">
            <img src={row.preview} alt="" className="h-16 w-20 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs">{row.name}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {STAGES.map((stage) => (
                  <Pill key={stage} tone={row.status === stage || (row.status === 'ready' && stage !== 'uploaded') ? 'mint' : 'neutral'}>
                    {stage}
                  </Pill>
                ))}
                {row.status === 'failed' ? <Pill tone="rose">failed</Pill> : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
