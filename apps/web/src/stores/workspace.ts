import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface GraphSnapshot {
  id: string
  name: string
  projectId: string
  reportId: string
  includeMedia: boolean
  mode: 'explore' | 'evidence'
  minConfidence: number
  year: string
  createdAt: string
}

interface Toast {
  id: string
  text: string
}

interface WorkspaceState {
  selectedNodeId: string | null
  selectedLinkId: string | null
  showMedia: boolean
  showLabels: boolean
  mode: 'explore' | 'evidence'
  minConfidence: number
  projectId: string
  reportId: string
  year: string
  focusLocationId: string | null
  localPreviews: Record<string, string>
  snapshots: GraphSnapshot[]
  toasts: Toast[]
  setSelectedNode: (id: string | null) => void
  setSelectedLink: (id: string | null) => void
  patch: (partial: Partial<WorkspaceState>) => void
  rememberPreview: (id: string, url: string) => void
  saveSnapshot: (name: string) => void
  toast: (text: string) => void
  dismiss: (id: string) => void
}

export const useWorkspace = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      selectedNodeId: null,
      selectedLinkId: null,
      showMedia: true,
      showLabels: true,
      mode: 'explore',
      minConfidence: 0,
      projectId: '',
      reportId: '',
      year: 'all',
      focusLocationId: null,
      localPreviews: {},
      snapshots: [],
      toasts: [],
      setSelectedNode: (id) => set({ selectedNodeId: id, selectedLinkId: null }),
      setSelectedLink: (id) => set({ selectedLinkId: id }),
      patch: (partial) => set(partial),
      rememberPreview: (id, url) => set({ localPreviews: { ...get().localPreviews, [id]: url } }),
      saveSnapshot: (name) => {
        const state = get()
        const snapshot: GraphSnapshot = {
          id: `snap_${Date.now()}`,
          name,
          projectId: state.projectId,
          reportId: state.reportId,
          includeMedia: state.showMedia,
          mode: state.mode,
          minConfidence: state.minConfidence,
          year: state.year,
          createdAt: new Date().toISOString(),
        }
        set({ snapshots: [snapshot, ...state.snapshots].slice(0, 12) })
      },
      toast: (text) => {
        const id = `toast_${Date.now()}`
        set({ toasts: [...get().toasts, { id, text }] })
        setTimeout(() => get().dismiss(id), 3200)
      },
      dismiss: (id) => set({ toasts: get().toasts.filter((toast) => toast.id !== id) }),
    }),
    {
      name: 'impactmesh-workspace',
      partialize: (state) => ({
        snapshots: state.snapshots,
        showMedia: state.showMedia,
        showLabels: state.showLabels,
        mode: state.mode,
      }),
    },
  ),
)
