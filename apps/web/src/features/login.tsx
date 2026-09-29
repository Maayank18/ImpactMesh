import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Building,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileCheck,
  Globe,
  Info,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  User,
  Zap,
} from 'lucide-react'
import { Button, Eyebrow, Pill } from '@/components/ui'
import { ImpactMeshBrand } from '@/components/logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { useLogin, useRegister } from '@/hooks/queries'
import { useWorkspace } from '@/stores/workspace'
import type { Role } from '@impactmesh/shared-types'

interface DemoPerson {
  email: string
  name: string
  role: Role
  badgeTone: 'mint' | 'sky' | 'amber'
  title: string
  description: string
  capabilities: string[]
}

const DEMO_PEOPLE: DemoPerson[] = [
  {
    email: 'asha@greenyamuna.org',
    name: 'Asha Mehra',
    role: 'owner',
    badgeTone: 'mint',
    title: 'Field Lead & Workspace Owner',
    description: 'Full administrative control over projects, evidence reviews, and public reporting.',
    capabilities: [
      'Approve & reject evidence reviews',
      'Publish projects to public record',
      'Synthesize traceable AI briefs',
      'Manage workspace members & settings',
    ],
  },
  {
    email: 'rohit@greenyamuna.org',
    name: 'Rohit Kapoor',
    role: 'editor',
    badgeTone: 'sky',
    title: 'Field Evidence Editor',
    description: 'Responsible for ingesting field media, running Cloudinary AI vision, and preparing pairs.',
    capabilities: [
      'Upload & ingest raw field media',
      'Trigger Cloudinary AI vision pipelines',
      'Create before / after comparison pairs',
      'Edit metadata, GPS coordinates & tags',
    ],
  },
  {
    email: 'leela@greenyamuna.org',
    name: 'Leela Das',
    role: 'viewer',
    badgeTone: 'amber',
    title: 'Municipal Observer & Auditor',
    description: 'Independent oversight with strictly read-only inspection of evidence nodes and audit ledger.',
    capabilities: [
      'Explore 3D evidence graph & topological map',
      'Inspect perceptual hash lineage & ledger',
      'Read published project briefs & HTML reports',
      'Read-only: cannot ingest or alter records',
    ],
  },
]

export function LoginPage() {
  const navigate = useNavigate()
  const login = useLogin()
  const register = useRegister()
  const toast = useWorkspace((state) => state.toast)

  const [mode, setMode] = useState<'demo' | 'custom'>('demo')

  // Custom user sign-in / registration state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [selectedRole, setSelectedRole] = useState<Role>('owner')
  const [showPermissionsGuide, setShowPermissionsGuide] = useState(false)

  async function enterDemo(targetEmail: string) {
    try {
      const session = await login.mutateAsync({ email: targetEmail })
      localStorage.setItem('impactmesh.token', session.token)
      toast(`Signed in as ${session.user.name} (${session.user.role})`)
      navigate('/app')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Login failed')
    }
  }

  async function handleCustomSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    try {
      const session = await register.mutateAsync({
        email: email.trim(),
        name: name.trim() || undefined,
        organizationName: organizationName.trim() || undefined,
        role: selectedRole,
      })
      localStorage.setItem('impactmesh.token', session.token)
      toast(`Welcome, ${session.user.name}! Clean workspace ready.`)
      navigate('/app')
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-bg text-ink grid-bg flex flex-col justify-between">
      {/* Ambient Luminous Glassmorphism Background Orbs for Real Color Refraction */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Mint / Emerald Core Orb */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/4 h-[550px] w-[550px] rounded-full bg-gradient-to-tr from-mint/40 via-emerald-400/30 to-teal-300/15 blur-[120px] animate-float-slow" />
        
        {/* Electric Sky / Indigo Orb */}
        <div className="absolute top-1/4 right-1/4 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-sky-400/40 via-blue-500/30 to-indigo-500/20 blur-[130px] animate-float-reverse" />
        
        {/* Warm Amber / Gold Light Orb */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 h-[450px] w-[650px] rounded-full bg-gradient-to-t from-amber-400/30 via-orange-400/20 to-transparent blur-[110px] animate-float-medium" />
        
        {/* Rose / Violet Accent Orb */}
        <div className="absolute top-12 right-1/3 h-[320px] w-[320px] rounded-full bg-rose-400/20 blur-[90px]" />
      </div>

      {/* Top Header Glass Navigation Bar */}
      <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-12 border-b border-white/10 dark:border-white/5 backdrop-blur-xl bg-bg/40">
        <Link to="/" className="inline-block transition hover:opacity-90">
          <ImpactMeshBrand size="md" />
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-mint/40 glass-pill px-3 py-1 text-[11px] font-mono text-mint">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            <span>Cloudinary CDN Active</span>
          </div>

          <Link
            to="/feed"
            className="flex items-center gap-1.5 rounded-full glass-card px-3.5 py-1.5 text-xs text-dim hover:text-ink hover:border-mint transition"
          >
            <Globe size={13} />
            <span className="hidden sm:inline">Public Record</span>
          </Link>

          <ThemeToggle showLabel={false} />
        </div>
      </header>

      {/* Center Main Glassmorphic Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="glass-panel relative overflow-hidden w-full max-w-5xl rounded-[32px] p-6 sm:p-10 transition-all duration-300 shadow-[0_30px_90px_rgba(0,0,0,0.6)]">
          {/* Top Specular Glass Sheen Highlight */}
          <div className="glass-sheen" />
          
          {/* Subtle Internal Ambient Reflections */}
          <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-mint/10 blur-3xl" />

          {/* Eyebrow & Headline */}
          <div className="relative text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full glass-pill border-mint/40 px-3.5 py-1 text-[11px] font-mono uppercase tracking-widest text-mint font-semibold mb-3.5">
              <ShieldCheck size={14} />
              <span>Evidence-First Access Control</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight leading-tight text-ink drop-shadow-sm">
              Enter the Evidence Mesh.
            </h1>
            <p className="mt-3 text-sm sm:text-base text-dim font-normal max-w-xl mx-auto">
              Explore pre-seeded field verification records or launch an empty, private workspace with direct Cloudinary AI ingestion.
            </p>
          </div>

          {/* Mode Switcher Segmented Tabs */}
          <div className="relative mt-8 flex justify-center">
            <div className="inline-flex p-1.5 rounded-2xl bg-elev2/90 border border-line backdrop-blur-xl shadow-inner">
              <button
                type="button"
                onClick={() => setMode('demo')}
                className={`relative flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                  mode === 'demo'
                    ? 'bg-elev border border-mint/40 text-ink shadow-md'
                    : 'text-dim hover:text-ink'
                }`}
              >
                {mode === 'demo' && <div className="glass-sheen rounded-xl" />}
                <Zap size={15} className="text-mint" />
                <span>1-Click Demo Personas</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={`relative flex items-center gap-2 rounded-xl px-6 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                  mode === 'custom'
                    ? 'bg-elev border border-amber/40 text-ink shadow-md'
                    : 'text-dim hover:text-ink'
                }`}
              >
                {mode === 'custom' && <div className="glass-sheen rounded-xl" />}
                <Sparkles size={15} className="text-amber" />
                <span>Launch Clean Workspace</span>
              </button>
            </div>
          </div>

          {/* ================================================== */}
          {/* TAB 1: 1-CLICK DEMO PERSONAS */}
          {/* ================================================== */}
          {mode === 'demo' && (
            <div className="relative mt-8 space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-[11px] uppercase tracking-wider text-dim font-bold">
                  Pre-Seeded Demo Dataset (3 Projects · 486 Assets · 3D Mesh)
                </span>
                <button
                  type="button"
                  onClick={() => setShowPermissionsGuide(!showPermissionsGuide)}
                  className="inline-flex items-center gap-1.5 text-xs text-mint hover:underline font-mono font-bold"
                >
                  <Info size={13} />
                  <span>{showPermissionsGuide ? 'Hide Roles Guide' : 'Compare Role Permissions'}</span>
                </button>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                {DEMO_PEOPLE.map((person) => (
                  <div
                    key={person.email}
                    className="glass-card group relative flex flex-col justify-between rounded-2xl p-5 overflow-hidden border border-line bg-elev/80 hover:bg-elev transition-all"
                  >
                    <div className="glass-sheen" />
                    <div>
                      {/* Top Bar: Avatar & Role Pill on opposite sides with full breathing room */}
                      <div className="flex items-center justify-between gap-2 mb-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-elev2 border border-line font-mono text-base font-bold text-ink shadow-sm">
                          {person.name[0]}
                        </div>
                        <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold border ${
                          person.role === 'owner'
                            ? 'text-mint bg-mint/15 border-mint/40'
                            : person.role === 'editor'
                            ? 'text-sky bg-sky/15 border-sky/40'
                            : 'text-amber bg-amber/15 border-amber/40'
                        }`}>
                          {person.role}
                        </span>
                      </div>

                      {/* Persona Name & Email (Full Width, Zero Truncation) */}
                      <div className="mb-3">
                        <h3 className="font-sans text-xl font-bold leading-snug text-ink tracking-tight">
                          {person.name}
                        </h3>
                        <p className="font-mono text-xs text-dim truncate mt-0.5">
                          {person.email}
                        </p>
                      </div>

                      <p className="text-xs text-dim leading-relaxed mb-4 min-h-[44px]">
                        {person.description}
                      </p>

                      {/* Capabilities Checklist */}
                      <ul className="space-y-2.5 border-t border-line/60 pt-4 text-xs font-mono font-medium text-ink">
                        {person.capabilities.map((cap, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <CheckCircle2 size={14} className="shrink-0 text-mint mt-0.5" />
                            <span className="leading-snug text-ink/90">{cap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 1-Click Action Button */}
                    <button
                      type="button"
                      disabled={login.isPending}
                      onClick={() => void enterDemo(person.email)}
                      className={`relative mt-6 w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold uppercase tracking-wider transition-all shadow-md ${
                        person.role === 'owner'
                          ? 'bg-mint hover:bg-emerald-400 text-bg shadow-mint/30 hover:scale-[1.02]'
                          : 'bg-elev hover:bg-elev2 border border-line hover:border-mint text-ink hover:scale-[1.02]'
                      }`}
                    >
                      <span>Enter as {person.name.split(' ')[0]}</span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================== */}
          {/* TAB 2: SIGN IN / CREATE CLEAN WORKSPACE */}
          {/* ================================================== */}
          {mode === 'custom' && (
            <div className="relative mt-8 max-w-xl mx-auto space-y-5">
              <div className="relative overflow-hidden rounded-2xl border border-mint/40 bg-mint/10 p-4 flex items-start gap-3 backdrop-blur-md">
                <div className="glass-sheen" />
                <Sparkles size={18} className="text-mint shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-sm text-mint">Clean Workspace Auto-Provisioning</p>
                  <p className="mt-1 text-dim text-xs leading-relaxed">
                    Signing in with your email provisions a brand new, empty organization. You can create projects, drop field photos for real Cloudinary AI analysis, and verify evidence from scratch.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCustomSubmit} className="space-y-4">
                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-ink font-bold mb-2">
                    Your Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-3.5 text-dim" />
                    <input
                      type="text"
                      placeholder="e.g. Mayank Garg"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-elev border border-line text-ink placeholder:text-faint font-medium outline-none focus:border-mint shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-ink font-bold mb-2">
                    Work or Personal Email <span className="text-rose">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3.5 text-dim" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. mayank@fieldtrust.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-elev border border-line text-ink placeholder:text-faint font-medium outline-none focus:border-mint shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-ink font-bold mb-2">
                    Workspace / Organization Name (Optional)
                  </label>
                  <div className="relative">
                    <Building size={16} className="absolute left-3.5 top-3.5 text-dim" />
                    <input
                      type="text"
                      placeholder="e.g. Impact Verification Collective"
                      value={organizationName}
                      onChange={(e) => setOrganizationName(e.target.value)}
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm bg-elev border border-line text-ink placeholder:text-faint font-medium outline-none focus:border-mint shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-xs uppercase tracking-wider text-ink font-bold mb-2">
                    Select Your Role Authorization
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        { role: 'owner', label: 'Owner', desc: 'Full workspace administration' },
                        { role: 'editor', label: 'Editor', desc: 'Upload field media & reviews' },
                        { role: 'viewer', label: 'Viewer', desc: 'Read-only observation' },
                      ] as const
                    ).map((item) => (
                      <button
                        key={item.role}
                        type="button"
                        onClick={() => setSelectedRole(item.role)}
                        className={`relative overflow-hidden rounded-xl p-3.5 text-left transition ${
                          selectedRole === item.role
                            ? 'border-2 border-mint bg-mint/15 text-ink shadow-[0_0_20px_rgba(94,224,181,0.25)]'
                            : 'border border-line bg-elev/70 text-dim hover:text-ink hover:bg-elev'
                        }`}
                      >
                        {selectedRole === item.role && <div className="glass-sheen" />}
                        <p className="font-mono text-xs font-bold uppercase text-ink">{item.label}</p>
                        <p className="text-[11px] text-dim mt-1 line-clamp-1">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={register.isPending || !email.trim()}
                  className="w-full mt-5 py-3.5 rounded-xl bg-mint hover:bg-emerald-400 text-bg font-bold text-sm tracking-wide shadow-xl shadow-mint/30 hover:scale-[1.01] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  <span>{register.isPending ? 'Provisioning Workspace…' : 'Launch Clean Workspace'}</span>
                </button>
              </form>
            </div>
          )}

          {/* ================================================== */}
          {/* ROLE CAPABILITIES GUIDE (EXPANDABLE) */}
          {/* ================================================== */}
          {showPermissionsGuide && (
            <div className="glass-panel relative overflow-hidden mt-8 rounded-2xl p-6 border border-line shadow-2xl">
              <div className="glass-sheen" />
              <div className="flex items-center justify-between pb-3.5 border-b border-line">
                <div className="flex items-center gap-2.5">
                  <Shield size={18} className="text-mint" />
                  <span className="font-serif text-xl font-bold text-ink">ImpactMesh Role-Based Authorization (RBAC)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPermissionsGuide(false)}
                  className="text-xs text-dim hover:text-ink font-mono font-bold"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3 text-xs">
                <div className="space-y-2 rounded-xl border border-mint/40 bg-mint/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold uppercase text-mint text-sm">Owner</span>
                    <span className="bg-mint/20 border border-mint text-mint text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">Level 3</span>
                  </div>
                  <p className="text-dim text-xs">Primary collective lead with complete authority.</p>
                  <ul className="space-y-1.5 text-xs text-ink font-mono">
                    <li>✓ Publish projects to public records</li>
                    <li>✓ Final evidence approval & rejection</li>
                    <li>✓ Synthesize traceable markdown briefs</li>
                    <li>✓ Reset demo or manage members</li>
                  </ul>
                </div>

                <div className="space-y-2 rounded-xl border border-sky/40 bg-sky/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold uppercase text-sky text-sm">Editor</span>
                    <span className="bg-sky/20 border border-sky text-sky text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">Level 2</span>
                  </div>
                  <p className="text-dim text-xs">Field technician and evidence organizer.</p>
                  <ul className="space-y-1.5 text-xs text-ink font-mono">
                    <li>✓ Ingest field photos & videos</li>
                    <li>✓ Trigger Cloudinary AI & Jev routing</li>
                    <li>✓ Form before / after visual pairs</li>
                    <li>✓ Edit GPS metadata & tags</li>
                  </ul>
                </div>

                <div className="space-y-2 rounded-xl border border-amber/40 bg-amber/10 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold uppercase text-amber text-sm">Viewer</span>
                    <span className="bg-amber/20 border border-amber text-amber text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">Level 1</span>
                  </div>
                  <p className="text-dim text-xs">External auditor or municipal observer.</p>
                  <ul className="space-y-1.5 text-xs text-ink font-mono">
                    <li>✓ Interactive 3D graph exploration</li>
                    <li>✓ Cryptographic hash verification</li>
                    <li>✓ View spatial maps & evidence nodes</li>
                    <li>✗ Strictly read-only; no uploads or edits</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Footer Info Bar */}
      <footer className="relative z-20 flex flex-wrap items-center justify-between gap-4 px-6 py-4 sm:px-12 border-t border-line/40 backdrop-blur-md bg-bg/40 text-xs text-dim">
        <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
          ImpactMesh Multi-Tenant Verification Architecture · MongoDB Records · Three.js 3D Mesh
        </p>

        <div className="flex items-center gap-4 text-xs font-mono">
          <Link to="/" className="text-faint hover:text-ink transition">
            Home
          </Link>
          <Link to="/feed" className="text-faint hover:text-ink transition">
            Public Feed
          </Link>
          <span className="text-faint">Cloudinary: <span className="text-mint">dtixkwv7z</span></span>
        </div>
      </footer>
    </div>
  )
}
