import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button, Empty, EvidenceImage, Eyebrow, Field, Modal, Panel, Pill, fieldClass } from '@/components/ui'
import { useAudit, useInvalidate, useMe, useProject, useProjects } from '@/hooks/queries'
import { api } from '@/lib/api'
import { canEdit, formatWhen, formatWhenTime } from '@/lib/format'
import { useWorkspace } from '@/stores/workspace'

export function ProjectsPage() {
  const projects = useProjects()
  const me = useMe()
  const invalidate = useInvalidate()
  const toast = useWorkspace((state) => state.toast)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')

  async function create() {
    const project = await api<{ id: string }>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description, city }),
    })
    toast('Project opened')
    setOpen(false)
    invalidate()
    window.location.assign(`/app/projects/${project.id}`)
  }

  return (
    <div className="px-5 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Projects</Eyebrow>
          <h1 className="mt-2 font-serif text-5xl">The work being documented.</h1>
        </div>
        {canEdit(me.data?.user.role) ? (
          <Button onClick={() => setOpen(true)}>New project</Button>
        ) : null}
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.data?.map((project) => (
          <Link key={project.id} to={`/app/projects/${project.id}`} className="overflow-hidden rounded-3xl border border-line">
            <EvidenceImage src={project.coverUrl} alt="" className="aspect-[16/9] w-full" />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-3xl">{project.name}</h2>
                <Pill tone={project.public ? 'mint' : 'neutral'}>{project.status}</Pill>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-dim">{project.description}</p>
            </div>
          </Link>
        ))}
      </div>
      <Modal open={open} title="Open a project" onClose={() => setOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void create()
          }}
        >
          <Field label="Name">
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="What is being documented">
            <textarea className={fieldClass} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Field label="City, if you already know it">
            <input className={fieldClass} value={city} onChange={(event) => setCity(event.target.value)} />
          </Field>
          <Button type="submit">Create project</Button>
        </form>
      </Modal>
    </div>
  )
}

export function ProjectPage() {
  const { projectId = '' } = useParams()
  const project = useProject(projectId)
  const audit = useAudit()
  const me = useMe()
  const invalidate = useInvalidate()
  const toast = useWorkspace((state) => state.toast)
  const bundle = project.data
  const editable = canEdit(me.data?.user.role)

  async function publish() {
    await api(`/projects/${projectId}/publish`, { method: 'POST' })
    toast('Published to the public record')
    invalidate()
  }

  async function generate() {
    const report = await api<{ id: string }>(`/projects/${projectId}/reports`, { method: 'POST' })
    toast('Brief assembled from approved evidence')
    invalidate()
    window.location.assign(`/app/reports/${report.id}`)
  }

  if (!bundle && project.isLoading) return <p className="p-8 text-dim">Opening the project…</p>
  if (!bundle) return <p className="p-8">Project not found.</p>

  const replay = (audit.data ?? []).filter(
    (event) =>
      event.entityId === bundle.project.id ||
      bundle.media.some((item) => item.id === event.entityId) ||
      bundle.reports.some((item) => item.id === event.entityId),
  )

  return (
    <div className="space-y-8 px-5 py-6 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl">
          <Eyebrow>{bundle.project.public ? 'Public project' : 'Private project'} · {bundle.project.status}</Eyebrow>
          <h1 className="mt-2 font-serif text-5xl">{bundle.project.name}</h1>
          <p className="mt-4 text-dim">{bundle.project.description}</p>
        </div>
        {editable ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => void publish()}>
              Publish
            </Button>
            <Button onClick={() => void generate()}>Generate brief</Button>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <Panel className="p-5">
          <Eyebrow>Documented</Eyebrow>
          <ul className="mt-3 space-y-2 text-sm">
            {bundle.documented.map((item) => (
              <li key={item.label} className="flex justify-between gap-3">
                <span className="text-dim">{item.label}</span>
                <span className="font-mono">{item.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <Eyebrow>Visual observations</Eyebrow>
          <ul className="mt-3 space-y-2 text-sm text-dim">
            {bundle.visualObservations.length ? bundle.visualObservations.map((item) => <li key={item}>{item}</li>) : <li>No visual pair filed.</li>}
          </ul>
        </Panel>
        <Panel className="p-5">
          <Eyebrow>Reported by the organization</Eyebrow>
          <ul className="mt-3 space-y-3 text-sm">
            {bundle.project.orgMetrics.length === 0 ? <li className="text-dim">No organization figures filed.</li> : null}
            {bundle.project.orgMetrics.map((metric) => (
              <li key={metric.label}>
                <p className="font-serif text-3xl">{metric.value}</p>
                <p>{metric.label}</p>
                <p className="text-xs text-dim">{metric.note}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div>
        <Eyebrow>Evidence</Eyebrow>
        {bundle.media.length === 0 ? (
          <div className="mt-4">
            <Empty title="No assets yet" body="Upload field media and it will wait in review before it joins this project." />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {bundle.media.map((item) => (
              <Link key={item.id} to={`/app/evidence/${item.id}`} className="overflow-hidden rounded-2xl border border-line">
                <EvidenceImage src={item.secureUrl} alt={item.altText} className="aspect-[4/3] w-full" />
                <div className="p-3">
                  <p className="truncate font-mono text-xs">{item.filename}</p>
                  <p className="mt-1 text-xs text-dim">{formatWhen(item.capturedAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="p-5">
          <Eyebrow>Activities and places</Eyebrow>
          <ul className="mt-3 space-y-2 text-sm">
            {bundle.activities.map((activity) => (
              <li key={activity.id} className="flex justify-between">
                <span>{activity.name}</span>
                <span className="font-mono text-xs text-dim">{activity.evidenceCount} approved</span>
              </li>
            ))}
          </ul>
          <ul className="mt-4 space-y-1 text-sm text-dim">
            {bundle.locations.map((location) => (
              <li key={location.id}>
                {location.name} · {location.city}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="p-5">
          <Eyebrow>How this record was built</Eyebrow>
          <ul className="mt-3 space-y-3">
            {replay.slice(0, 8).map((event) => (
              <li key={event.id} className="text-sm">
                <p>{event.action.replaceAll('.', ' · ')}</p>
                <p className="text-xs text-dim">
                  {event.actorName} · {formatWhenTime(event.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
