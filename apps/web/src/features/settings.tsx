import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Cloud, ExternalLink, Key, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Button, Eyebrow, Field, Panel, fieldClass, cn } from '@/components/ui'
import { useInvalidate, useJobs, useMe } from '@/hooks/queries'
import { api } from '@/lib/api'
import { formatWhenTime } from '@/lib/format'
import { useWorkspace } from '@/stores/workspace'

export function SettingsPage() {
  const me = useMe()
  const jobs = useJobs()
  const invalidate = useInvalidate()
  const toast = useWorkspace((state) => state.toast)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [focus, setFocus] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!me.data) return
    setName(me.data.organization.name)
    setFocus(me.data.organization.focusArea)
    setDescription(me.data.organization.description)
  }, [me.data])
  const owner = me.data?.user.role === 'owner'
  const isCloudinaryActive = Boolean(me.data?.services.cloudinary)

  async function save() {
    await api('/org', { method: 'PATCH', body: JSON.stringify({ name, focusArea: focus, description }) })
    toast('Organization updated')
    invalidate()
  }

  async function reset() {
    await api('/admin/reset', { method: 'POST' })
    toast('Demo record restored')
    invalidate()
  }

  return (
    <div className="space-y-8 px-5 py-6 md:px-8">
      <div>
        <Eyebrow>Organization</Eyebrow>
        <h1 className="mt-2 font-serif text-5xl">{me.data?.organization.name}</h1>
      </div>

      {/* CLOUDINARY MEDIA INTELLIGENCE CONTROL CENTER */}
      <Panel className="max-w-2xl p-6 border-line bg-elev space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky/15 text-sky">
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="font-serif text-2xl text-ink">Cloudinary Media Intelligence</h3>
              <p className="font-mono text-[10px] text-faint">Core Asset Storage, AI Vision & Transformation Backbone</p>
            </div>
          </div>

          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1 font-mono text-[11px] font-semibold',
              isCloudinaryActive
                ? 'bg-mint/15 text-mint border border-mint/30'
                : 'bg-amber/15 text-amber border border-amber/30',
            )}
          >
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                isCloudinaryActive ? 'bg-mint animate-pulse' : 'bg-amber animate-pulse',
              )}
            />
            <span>{isCloudinaryActive ? 'Connected & Active' : 'Demo Sandbox Active'}</span>
          </div>
        </div>

        {/* Cloudinary Active Capabilities List */}
        <div className="grid gap-3 sm:grid-cols-2 pt-1 font-mono text-[11px]">
          <div className="flex items-start gap-2 rounded-xl border border-line bg-elev2/50 p-2.5">
            <Zap size={14} className="text-sky mt-0.5 shrink-0" />
            <div>
              <strong className="text-ink block">Direct Browser Uploads</strong>
              <span className="text-dim text-[10px]">HMAC SHA-1 signed direct uploads</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-elev2/50 p-2.5">
            <Sparkles size={14} className="text-mint mt-0.5 shrink-0" />
            <div>
              <strong className="text-ink block">Cloudinary Vision AI</strong>
              <span className="text-dim text-[10px]">ai_vision_tagging & factual captions</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-elev2/50 p-2.5">
            <CheckCircle2 size={14} className="text-amber mt-0.5 shrink-0" />
            <div>
              <strong className="text-ink block">Smart Transformations</strong>
              <span className="text-dim text-[10px]">f_auto, q_auto, c_fill, g_auto</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-line bg-elev2/50 p-2.5">
            <ShieldCheck size={14} className="text-mint mt-0.5 shrink-0" />
            <div>
              <strong className="text-ink block">Structured Hierarchy</strong>
              <span className="text-dim text-[10px]">impactmesh/org/project/year/month</span>
            </div>
          </div>
        </div>

        {/* Quick Setup Instructions */}
        <div className="rounded-2xl border border-line bg-elev2/40 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-ink flex items-center gap-1.5">
              <Key size={13} className="text-amber" />
              <span>How to Connect Your Cloudinary Account</span>
            </span>
            <a
              href="https://cloudinary.com/users/register_free"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[10px] text-sky hover:underline"
            >
              <span>Get Free Cloudinary Key</span>
              <ExternalLink size={10} />
            </a>
          </div>

          <p className="text-xs text-dim leading-relaxed">
            In your Cloudinary Console dashboard, copy your <strong>API Environment variable</strong> (or Cloud Name, API Key, API Secret) and paste it into <code className="rounded bg-elev px-1.5 py-0.5 font-mono text-[11px] text-ink border border-line">.env</code> at the project root:
          </p>

          <pre className="overflow-x-auto rounded-xl border border-line bg-elev p-3 font-mono text-[11px] text-ink select-all">
{`# Option A: Single 1-Click String from Cloudinary Console:
CLOUDINARY_URL=cloudinary://<API_KEY>:<API_SECRET>@<CLOUD_NAME>

# Option B: Individual Credentials:
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret`}
          </pre>

          <p className="text-[11px] text-faint">
            Once saved in <code className="font-mono">.env</code>, restart the dev server. ImpactMesh will immediately switch from the demo sandbox to live Cloudinary uploads and Vision AI tagging.
          </p>
        </div>
      </Panel>

      <Panel className="max-w-2xl space-y-4 p-5">
        <Field label="Name">
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Focus">
          <input className={fieldClass} value={focus} onChange={(event) => setFocus(event.target.value)} />
        </Field>
        <Field label="Description">
          <textarea className={fieldClass} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        {owner || me.data?.user.role === 'admin' ? <Button onClick={() => void save()}>Save</Button> : <p className="text-sm text-dim">Only an admin can edit the organization.</p>}
      </Panel>
      <Panel className="p-5">
        <Eyebrow>Members</Eyebrow>
        <Members />
      </Panel>
      <Panel className="p-5">
        <Eyebrow>Recent jobs</Eyebrow>
        <ul className="mt-3 space-y-2 text-sm">
          {jobs.data?.map((job) => (
            <li key={job.id} className="flex flex-wrap justify-between gap-2">
              <span>
                {job.type} · {job.status}
              </span>
              <span className="font-mono text-xs text-dim">{formatWhenTime(job.createdAt)}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="ghost"
          onClick={() => {
            localStorage.removeItem('impactmesh.token')
            navigate('/login')
          }}
        >
          Sign out
        </Button>
        {owner ? (
          <Button variant="danger" onClick={() => void reset()}>
            Reset demo evidence
          </Button>
        ) : null}
      </div>
      <p className="max-w-xl text-sm text-dim">
        Records live in MongoDB. The 3D graph is drawn in this browser with Three.js, so it does not need a map or media API key.
        Cloudinary {me.data?.services.cloudinary ? 'on' : 'off'} · Jev {me.data?.services.jev ? 'on' : 'off'} · Redis{' '}
        {me.data?.services.redis ? 'on' : 'off'} · MongoDB {me.data?.services.mongodb ? 'on' : 'off'}
      </p>
    </div>
  )
}

function Members() {
  const [people, setPeople] = useState<Array<{ id: string; name: string; email: string; role: string; title: string }>>([])
  useEffect(() => {
    void api<typeof people>('/members').then(setPeople)
  }, [])
  return (
    <ul className="mt-3 space-y-3">
      {people.map((person) => (
        <li key={person.id} className="flex items-center justify-between gap-3 text-sm">
          <span>
            {person.name}
            <span className="block text-dim">{person.title}</span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{person.role}</span>
        </li>
      ))}
    </ul>
  )
}
