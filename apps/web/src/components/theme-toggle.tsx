import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/stores/theme'
import { cn } from './ui'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={isDark ? 'Switch to Bright Graph Paper (Light Mode)' : 'Switch to Dark Canvas (Dark Mode)'}
      aria-label="Toggle Bright / Dark Theme"
      className={cn(
        'group relative inline-flex items-center gap-2 rounded-full border p-1.5 transition-all duration-300 backdrop-blur-md select-none',
        isDark
          ? 'border-white/15 bg-elev text-dim hover:text-ink hover:border-mint/50'
          : 'border-black/10 bg-white/90 text-gray-700 shadow-sm hover:border-amber-400 hover:text-black',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-6 w-6 items-center justify-center rounded-full transition-transform duration-300',
          isDark
            ? 'bg-sky-950/60 text-sky-400'
            : 'bg-amber-100 text-amber-600 rotate-180',
        )}
      >
        {isDark ? <Moon size={13} /> : <Sun size={13} />}
      </div>

      {showLabel && (
        <span className="pr-2 font-mono text-[11px] font-medium tracking-wider">
          {isDark ? 'Dark Blueprint' : 'Bright Grid'}
        </span>
      )}
    </button>
  )
}
