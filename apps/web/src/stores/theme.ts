import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark'

interface ThemeState {
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
}

function getInitialTheme(): ThemeMode {
  const stored = localStorage.getItem('impactmesh.theme')
  if (stored === 'light' || stored === 'dark') {
    return stored
  }
  // Default to light (bright studio graph paper mode) as requested
  return 'light'
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.setAttribute('data-theme', theme)
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')
  } else {
    document.documentElement.classList.add('light')
    document.documentElement.classList.remove('dark')
  }
  localStorage.setItem('impactmesh.theme', theme)
}

export const useTheme = create<ThemeState>((set, get) => {
  const initial = getInitialTheme()
  if (typeof window !== 'undefined') {
    applyTheme(initial)
  }

  return {
    theme: initial,
    setTheme: (theme) => {
      applyTheme(theme)
      set({ theme })
    },
    toggleTheme: () => {
      const next = get().theme === 'dark' ? 'light' : 'dark'
      applyTheme(next)
      set({ theme: next })
    },
  }
})
