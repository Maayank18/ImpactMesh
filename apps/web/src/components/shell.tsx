import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Columns2,
  FileText,
  FolderKanban,
  Globe,
  Images,
  LayoutDashboard,
  Map,
  PanelLeft,
  PanelLeftClose,
  ScanSearch,
  Settings,
  Share2,
  Upload,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDashboard, useMe } from '@/hooks/queries'
import { useWorkspace } from '@/stores/workspace'
import { ImpactMeshBrand, ImpactMeshLogo } from './logo'
import { cn } from './ui'

const NAV = [
  { to: '/app', label: 'Canvas', icon: Share2, end: true },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/evidence', label: 'Evidence', icon: Images },
  { to: '/app/upload', label: 'Upload', icon: Upload },
  { to: '/app/review', label: 'Review', icon: ScanSearch },
  { to: '/app/map', label: 'Map', icon: Map },
  { to: '/app/compare', label: 'Compare', icon: Columns2 },
  { to: '/app/reports', label: 'Reports', icon: FileText },
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const me = useMe()
  const dashboard = useDashboard()
  const toasts = useWorkspace((state) => state.toasts)
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('impactmesh.sidebar_collapsed') === 'true')
  const [alerts, setAlerts] = useState(false)
  const [query, setQuery] = useState('')
  const bleed = location.pathname.startsWith('/app/graph') || location.pathname.startsWith('/app/map')
  const pending = dashboard.data?.stats.pendingReviews ?? 0

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem('impactmesh.sidebar_collapsed', String(next))
      return next
    })
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        toggleCollapsed()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Desktop & Mobile Sidebar */}
      <aside
        className={cn(
          'no-print fixed inset-y-0 left-0 z-30 flex flex-col border-r border-line bg-bg/95 backdrop-blur transition-all duration-300 md:static',
          collapsed ? 'w-16 p-2.5' : 'w-64 p-4',
          open ? 'flex' : 'hidden md:flex',
        )}
      >
        {/* Brand / Logo + Collapse Button */}
        <div className="flex items-center justify-between gap-2">
          {collapsed ? (
            <NavLink to="/" className="mx-auto py-1" title="ImpactMesh Home">
              <ImpactMeshLogo size="sm" variant="badge" />
            </NavLink>
          ) : (
            <NavLink to="/" className="px-2 py-1 transition hover:opacity-90" onClick={() => setOpen(false)}>
              <ImpactMeshBrand size="md" />
            </NavLink>
          )}

          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              title="Collapse sidebar (Ctrl+B)"
              className="hidden h-8 w-8 items-center justify-center rounded-xl border border-line/60 text-dim transition hover:bg-white/5 hover:text-ink md:flex"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          )}
        </div>

        {/* Collapsed Toggle Button at top center */}
        {collapsed && (
          <div className="mt-3 flex justify-center border-b border-line/50 pb-2">
            <button
              onClick={toggleCollapsed}
              title="Expand sidebar (Ctrl+B)"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line/60 text-dim transition hover:bg-white/5 hover:text-mint"
              aria-label="Expand sidebar"
            >
              <PanelLeft size={15} />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className={cn('flex flex-1 flex-col gap-1', collapsed ? 'mt-3' : 'mt-8')}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center rounded-2xl text-sm transition',
                  collapsed ? 'justify-center p-2.5 text-dim' : 'justify-between px-3 py-2 text-dim',
                  isActive && 'bg-white/5 text-ink font-medium shadow-sm',
                  isActive && collapsed && 'text-mint border border-mint/20 bg-mint/5',
                )
              }
            >
              <span className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
                <item.icon size={collapsed ? 18 : 16} className={cn('shrink-0', item.to === '/app/graph' && 'text-mint')} />
                {!collapsed && <span>{item.label}</span>}
              </span>

              {/* Review Badge */}
              {item.to === '/app/review' && pending > 0 ? (
                collapsed ? (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber shadow-[0_0_8px_rgba(228,177,90,0.8)]" />
                ) : (
                  <span className="rounded-full bg-amber/15 px-2 py-0.5 font-mono text-[10px] text-amber">{pending}</span>
                )
              ) : null}
            </NavLink>
          ))}
        </nav>

        {/* Secondary Navigation */}
        <div className="space-y-1 border-t border-line/60 pt-3">
          <NavLink
            to="/feed"
            title={collapsed ? 'Public Record' : undefined}
            className={cn(
              'flex items-center rounded-2xl text-sm text-dim transition hover:text-ink',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
            )}
          >
            <Globe size={16} className="shrink-0" />
            {!collapsed && <span>Public record</span>}
          </NavLink>

          <NavLink
            to="/app/settings"
            title={collapsed ? 'Settings' : undefined}
            className={cn(
              'flex items-center rounded-2xl text-sm text-dim transition hover:text-ink',
              collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2',
            )}
          >
            <Settings size={16} className="shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </div>

        {/* User Card */}
        <div className={cn('border-t border-line/60 pt-3', collapsed ? 'text-center' : 'px-2')}>
          {collapsed ? (
            <div
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-mint/10 border border-mint/30 font-mono text-xs text-mint font-semibold"
              title={`${me.data?.user.name} (${me.data?.user.role})`}
            >
              {me.data?.user.name?.[0] || 'U'}
            </div>
          ) : (
            <div>
              <p className="truncate text-sm font-medium">{me.data?.user.name}</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">{me.data?.user.role}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header */}
        <header className="no-print flex items-center gap-3 border-b border-line px-4 py-3 md:px-6 bg-bg/80 backdrop-blur z-20">
          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <button className="rounded-full border border-line px-3 py-1 text-sm" onClick={() => setOpen((value) => !value)}>
              Menu
            </button>
            <NavLink to="/" className="inline-flex">
              <ImpactMeshLogo size="sm" />
            </NavLink>
          </div>

          {/* Desktop Sidebar Toggle Button */}
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
            className="hidden h-9 w-9 items-center justify-center rounded-full border border-line text-dim transition hover:bg-white/5 hover:text-ink md:flex"
            aria-label="Toggle sidebar"
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {/* Quick Search */}
          <form
            className="min-w-0 flex-1 max-w-xl"
            onSubmit={(event) => {
              event.preventDefault()
              navigate(`/app/search?q=${encodeURIComponent(query)}`)
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search evidence, places, activities..."
              className="w-full rounded-full border border-line bg-elev/70 px-4 py-2 text-sm outline-none placeholder:text-faint focus:border-mint transition"
            />
          </form>

          {/* Notifications / Pending Review Queue */}
          <div className="relative">
            <button
              className="relative grid h-9 w-9 place-items-center rounded-full border border-line text-dim hover:text-ink transition"
              onClick={() => setAlerts((value) => !value)}
              aria-label="Alerts"
            >
              <Bell size={16} />
              {pending > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber" />
                </span>
              ) : null}
            </button>
            {alerts ? (
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-line bg-elev p-4 text-sm shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-mono text-xs uppercase tracking-wider text-dim">Verification Queue</span>
                  <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] text-amber">{pending} pending</span>
                </div>
                <p className="mt-2 text-xs text-dim leading-relaxed">
                  {pending ? `${pending} assets require human gatekeeper signoff before joining the graph.` : 'All field media verified.'}
                </p>
                <button
                  className="mt-3 w-full rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-bg hover:bg-[#7ff3cd] transition"
                  onClick={() => {
                    setAlerts(false)
                    navigate('/app/review')
                  }}
                >
                  Open Review Queue
                </button>
              </div>
            ) : null}
          </div>

          {/* Org & Status Info */}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-ink">{me.data?.organization.name}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint flex items-center justify-end gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-mint" />
              {me.data?.services.mode === 'demo' ? 'Demo record active' : 'Connected'}
            </p>
          </div>
        </header>

        {/* Viewport Content */}
        <main className={cn('min-h-0 flex-1', bleed ? 'overflow-hidden' : 'overflow-auto')}>
          <Outlet />
        </main>
      </div>

      {/* Floating System Toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto flex items-center gap-2 rounded-full border border-mint/30 bg-elev px-4 py-2.5 text-xs text-ink shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
            <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
            {toast.text}
          </div>
        ))}
      </div>
    </div>
  )
}
