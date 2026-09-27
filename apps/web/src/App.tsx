import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/shell'
import { useMe } from '@/hooks/queries'
import { ComparePage } from '@/features/compare'
import { DashboardPage } from '@/features/dashboard'
import { EvidencePage } from '@/features/evidence'
import { GraphPage } from '@/features/graph'
import { LandingPage } from '@/features/landing'
import { LoginPage } from '@/features/login'
import { MapPage } from '@/features/map'
import { FeedPage, PublicProjectPage } from '@/features/public'
import { ProjectPage, ProjectsPage } from '@/features/projects'
import { ReportPage, ReportsPage } from '@/features/reports'
import { ReviewPage } from '@/features/review'
import { SearchPage } from '@/features/search'
import { SettingsPage } from '@/features/settings'
import { UploadPage } from '@/features/upload'

import { useLocation } from 'react-router-dom'
import { WorkspacePage } from '@/features/workspace'

function RequireAuth() {
  const me = useMe()
  const location = useLocation()
  if (!localStorage.getItem('impactmesh.token')) return <Navigate to="/login" replace />
  if (me.isLoading) {
    return (
      <div className="grid h-screen place-items-center bg-bg text-ink">
        <div>
          <p className="font-serif text-4xl italic text-mint">ImpactMesh</p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-faint">Opening the evidence canvas…</p>
        </div>
      </div>
    )
  }
  if (me.isError) return <Navigate to="/login" replace />

  const isCanvasRoute =
    location.pathname === '/app' ||
    location.pathname === '/app/' ||
    location.pathname === '/app/graph' ||
    location.pathname === '/app/graph/'

  if (isCanvasRoute) {
    return <WorkspacePage />
  }

  return <AppShell />
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/feed" element={<FeedPage />} />
      <Route path="/feed/:slug" element={<PublicProjectPage />} />
      <Route path="/app" element={<RequireAuth />}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectPage />} />
        <Route path="evidence" element={<EvidencePage />} />
        <Route path="evidence/:mediaId" element={<EvidencePage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="review" element={<ReviewPage />} />
        <Route path="graph" element={<GraphPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="compare" element={<ComparePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/:reportId" element={<ReportPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
