import { cn } from './ui'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  variant?: 'badge' | 'icon' | 'glow'
  animated?: boolean
  className?: string
}

const SIZES = {
  xs: 20,
  sm: 28,
  md: 36,
  lg: 48,
  xl: 64,
}

export function ImpactMeshLogo({
  size = 'md',
  variant = 'badge',
  animated = false,
  className,
}: LogoProps) {
  const pixelSize = typeof size === 'number' ? size : SIZES[size] || 36
  const rx = Math.round(pixelSize * 0.26)

  if (variant === 'icon') {
    return (
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn('shrink-0 select-none overflow-visible', className)}
        aria-label="ImpactMesh Logo"
      >
        <defs>
          <filter id="mint-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Connecting Edges */}
        <path
          d="M16 16 L8 11 M16 16 L24 12 M16 16 L23 22"
          stroke="#f4f0e6"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.65"
        />

        {/* Location Node (Amber) */}
        <circle cx="8" cy="11" r="2.2" fill="#e4b15a" />
        <circle cx="8" cy="11" r="3.2" stroke="#e4b15a" strokeWidth="0.5" opacity="0.35" />

        {/* Activity Node (Sky Blue) */}
        <circle cx="24" cy="12" r="2.2" fill="#8eb7ff" />
        <circle cx="24" cy="12" r="3.2" stroke="#8eb7ff" strokeWidth="0.5" opacity="0.35" />

        {/* Media Asset Node (White/Paper) */}
        <circle cx="23" cy="22" r="1.8" fill="#f4f0e6" />
        <circle cx="23" cy="22" r="2.6" stroke="#f4f0e6" strokeWidth="0.4" opacity="0.3" />

        {/* Central Project Node (Vibrant Mint with Aura) */}
        <circle
          cx="16"
          cy="16"
          r="4.2"
          fill="#5ee0b5"
          filter={animated ? 'url(#mint-glow)' : undefined}
          className={animated ? 'animate-pulse' : undefined}
        />
        <circle cx="16" cy="16" r="6" stroke="#5ee0b5" strokeWidth="0.75" opacity="0.4" />
      </svg>
    )
  }

  return (
    <div
      style={{ width: pixelSize, height: pixelSize }}
      className={cn(
        'group relative inline-flex shrink-0 select-none items-center justify-center rounded-[26%] transition-transform duration-300 hover:scale-105',
        variant === 'glow' && 'shadow-lg shadow-mint/20',
        className,
      )}
      aria-label="ImpactMesh Logo"
    >
      <svg
        width={pixelSize}
        height={pixelSize}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full overflow-hidden rounded-[26%]"
      >
        <defs>
          {/* Subtle badge gradient */}
          <linearGradient id="badge-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14171d" />
            <stop offset="100%" stopColor="#08090b" />
          </linearGradient>

          {/* Border shine */}
          <linearGradient id="badge-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="50%" stopColor="rgba(94,224,181,0.3)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
          </linearGradient>

          {/* Mint node glow */}
          <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5ee0b5" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#5ee0b5" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Badge Base */}
        <rect
          width="32"
          height="32"
          rx={rx > 0 ? (rx * 32) / pixelSize : 8}
          fill="url(#badge-bg)"
        />

        {/* Outer Highlight Border */}
        <rect
          x="0.5"
          y="0.5"
          width="31"
          height="31"
          rx={(rx > 0 ? (rx * 32) / pixelSize : 8) - 0.5}
          stroke="url(#badge-border)"
          strokeWidth="1"
          fill="none"
        />

        {/* Soft Ambient Node Glow in Background */}
        <circle cx="16" cy="16" r="9" fill="url(#center-glow)" opacity="0.6" />

        {/* Connecting Edges */}
        <path
          d="M16 16 L8 11 M16 16 L24 12 M16 16 L23 22"
          stroke="#f4f0e6"
          strokeWidth="1.1"
          strokeLinecap="round"
          opacity="0.75"
        />

        {/* Location Node (Amber Gold) */}
        <circle cx="8" cy="11" r="2.2" fill="#e4b15a" />
        <circle cx="8" cy="11" r="3.2" stroke="#e4b15a" strokeWidth="0.5" opacity="0.4" />

        {/* Activity Node (Sky Blue) */}
        <circle cx="24" cy="12" r="2.2" fill="#8eb7ff" />
        <circle cx="24" cy="12" r="3.2" stroke="#8eb7ff" strokeWidth="0.5" opacity="0.4" />

        {/* Media Asset Node (White/Paper) */}
        <circle cx="23" cy="22" r="1.8" fill="#f4f0e6" />
        <circle cx="23" cy="22" r="2.6" stroke="#f4f0e6" strokeWidth="0.5" opacity="0.35" />

        {/* Center Node (Emerald Mint Core) */}
        <circle
          cx="16"
          cy="16"
          r="4.2"
          fill="#5ee0b5"
          className={animated ? 'animate-pulse' : undefined}
        />
        <circle cx="16" cy="16" r="5.6" stroke="#5ee0b5" strokeWidth="0.7" opacity="0.45" />
      </svg>
    </div>
  )
}

interface BrandProps {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  tagline?: string
  className?: string
  linkTo?: string
}

export function ImpactMeshBrand({
  size = 'md',
  showTagline = false,
  tagline,
  className,
}: BrandProps) {
  const logoSizes = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
  }

  const titleSizes = {
    sm: 'text-2xl sm:text-3xl leading-none',
    md: 'text-3xl sm:text-4xl leading-none',
    lg: 'text-4xl sm:text-5xl leading-none',
  }

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <ImpactMeshLogo size={logoSizes[size]} variant="badge" animated />
      <div className="flex flex-col justify-center">
        <span
          className={cn(
            'font-script font-bold text-ink tracking-wide antialiased select-none transition-colors',
            titleSizes[size],
          )}
          style={{ fontFamily: 'var(--font-script), "Caveat", "Satisfy", "Kaushan Script", cursive' }}
        >
          ImpactMesh
        </span>
        {showTagline && tagline && (
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-faint">
            {tagline}
          </span>
        )}
      </div>
    </div>
  )
}
