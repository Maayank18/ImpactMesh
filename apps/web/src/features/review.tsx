import { useState } from 'react'
import { EvidenceImage, Eyebrow, Button, Pill, fieldClass } from '@/components/ui'
import { useInvalidate, useMe, useProjects, useReviews } from '@/hooks/queries'
import { api } from '@/lib/api'
import { canEdit, percent } from '@/lib/format'
import { useWorkspace } from '@/stores/workspace'
import type { Activity, Location } from '@impactmesh/shared-types'

export function ReviewPage() {
  const reviews = useReviews()
  const projects = useProjects()
  const me = useMe()
  const invalidate = useInvalidate()
  const toast = useWorkspace((state) => state.toast)
  const editable = canEdit(me.data?.user.role)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState({ projectId: '', activityId: '', locationId: '', caption: '' })
  const [options, setOptions] = useState<{ activities: Activity[]; locations: Location[] }>({ activities: [], locations: [] })

  async function act(id: string, path: 'approve' | 'reject') {
    await api(`/media/${id}/${path}`, { method: 'POST' })
    toast(path === 'approve' ? 'Approved and added to the graph' : 'Rejected. Hidden from the graph.')
    invalidate()
  }

  async function edit(id: string, projectId: string | null, caption: string) {
    setEditing(id)
    setDraft({ projectId: projectId || '', activityId: '', locationId: '', caption })
    if (projectId) {
      const detail = await api<{ activities: Activity[]; locations: Location[] }>(`/projects/${projectId}`)
      setOptions({ activities: detail.activities, locations: detail.locations })
    }
  }

  async function save(id: string) {
    await api(`/media/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        projectId: draft.projectId || null,
        activityId: draft.activityId || null,
        locationId: draft.locationId || null,
        caption: draft.caption,
      }),
    })
    await api(`/media/${id}/approve`, { method: 'POST' })
    toast('Edited, then approved')
    setEditing(null)
    invalidate()
  }

  return (
    <div className="px-5 py-6 md:px-8">
      <Eyebrow>Human in the loop</Eyebrow>
      <h1 className="mt-2 max-w-3xl font-serif text-5xl">Nothing is trusted just because a model was confident.</h1>
      <p className="mt-3 max-w-2xl text-dim">
        Jev, when a key is present, chooses among bounded routes. The application still holds anything under the
        confidence line, anything that disagrees with policy, and anything that looks like a duplicate.
      </p>
      <div className="mt-8 space-y-4">
        {reviews.data?.length === 0 ? <p className="text-dim">The queue is clear.</p> : null}
        {reviews.data?.map((item) => (
          <article key={item.media.id} className="grid gap-5 rounded-[28px] border border-line p-4 md:grid-cols-[220px_1fr]">
            <EvidenceImage src={item.media.secureUrl} alt={item.media.altText} className="aspect-[4/3] w-full rounded-2xl" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-sm">{item.media.filename}</h2>
                <Pill tone="sky">{item.media.decision?.source || 'pending'}</Pill>
                <Pill tone="amber">{percent(item.media.decision?.confidence)}</Pill>
              </div>
              <p className="mt-3 text-sm text-dim">{item.media.caption}</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-faint">Suggested project</dt>
                  <dd>{item.project?.name || item.media.decision?.projectChoice}</dd>
                </div>
                <div>
                  <dt className="text-faint">Activity</dt>
                  <dd>{item.activity?.name || item.media.decision?.activityCategory || 'Unassigned'}</dd>
                </div>
                <div>
                  <dt className="text-faint">Location</dt>
                  <dd>{item.location?.name || item.media.locationSource}</dd>
                </div>
              </dl>
              {item.media.similarTo ? (
                <p className="mt-4 text-sm text-amber">
                  {Math.round(item.media.similarTo.score * 100)}% similar to {item.media.similarTo.label}. Merge by
                  rejecting this frame, or keep both.
                </p>
              ) : null}
              <ul className="mt-3 list-disc pl-5 text-sm text-dim">
                {item.media.decision?.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              {editable ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => void act(item.media.id, 'approve')}>Approve</Button>
                  <Button variant="ghost" onClick={() => void edit(item.media.id, item.media.projectId, item.media.caption)}>
                    Edit
                  </Button>
                  <Button variant="danger" onClick={() => void act(item.media.id, 'reject')}>
                    Reject
                  </Button>
                </div>
              ) : (
                <p className="mt-4 text-sm text-dim">Viewers can read the suggestion. An editor has to approve it.</p>
              )}
              {editing === item.media.id ? (
                <form
                  className="mt-4 grid gap-3 md:grid-cols-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void save(item.media.id)
                  }}
                >
                  <select
                    className={fieldClass}
                    value={draft.projectId}
                    onChange={(event) => setDraft({ ...draft, projectId: event.target.value })}
                  >
                    <option value="">No project</option>
                    {projects.data?.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <select className={fieldClass} value={draft.activityId} onChange={(event) => setDraft({ ...draft, activityId: event.target.value })}>
                    <option value="">Activity</option>
                    {options.activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                  <select className={fieldClass} value={draft.locationId} onChange={(event) => setDraft({ ...draft, locationId: event.target.value })}>
                    <option value="">Location</option>
                    {options.locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.name}
                      </option>
                    ))}
                  </select>
                  <input className={fieldClass} value={draft.caption} onChange={(event) => setDraft({ ...draft, caption: event.target.value })} />
                  <Button type="submit">Save and approve</Button>
                </form>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
