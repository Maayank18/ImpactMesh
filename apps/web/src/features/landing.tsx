import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Compass,
  FileText,
  Images,
  Layers,
  MapPin,
  Share2,
  Sparkles,
  Zap,
  SlidersHorizontal,
} from 'lucide-react'
import { ImpactMeshBrand, ImpactMeshLogo } from '@/components/logo'
import { Pill, Eyebrow, cn } from '@/components/ui'
import { ThemeToggle } from '@/components/theme-toggle'

// Floating Right Tool Dock Items (Matching playful creative reference)
const DOCK_ITEMS = [
  { id: 'media', emoji: '📸', label: 'Field Assets', sub: 'EXIF & Raw Photos', to: '/feed' },
  { id: 'geo', emoji: '📍', label: 'Spatial GPS', sub: 'Centroid Coordinates', to: '/app?overlay=map' },
  { id: 'eco', emoji: '🌱', label: 'Restoration Species', sub: '1,200 Saplings', to: '/app' },
  { id: 'ai', emoji: '⚡', label: 'AI Truth Engine', sub: 'Cloudinary Vision', to: '/app' },
  { id: 'proof', emoji: '🏆', label: 'Evidence Mesh', sub: '0 Collisions Hash', to: '/feed' },
  { id: 'lens', emoji: '🌓', label: 'Before / After', sub: '13-Mo Comparison', to: '/app?overlay=compare' },
]

// Interactive nodes in the Hero Evidence Universe
interface HeroNode {
  id: string
  label: string
  category: 'project' | 'media' | 'location' | 'activity' | 'compare' | 'report' | 'evidence'
  x: number // percentage
  y: number // percentage
  color: string
  image?: string
  meta: string
  detail: string
}

const HERO_NODES: HeroNode[] = [
  {
    id: 'node-project',
    label: 'YAMUNA RESTORATION',
    category: 'project',
    x: 50,
    y: 50,
    color: '#5ee0b5',
    meta: 'Active Project · 486 Assets',
    detail: 'Gravity center connecting ecological field captures, monsoon flood data, and community cleanups.',
  },
  {
    id: 'node-media-after',
    label: 'IMG_2026_0918_AFTER.JPG',
    category: 'media',
    x: 78,
    y: 28,
    color: '#5ee0b5',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80',
    meta: 'Monsoon Sapling Bed · 95% Verified',
    detail: 'EXIF GPS 28.6694° N, 77.2318° E. Cloudinary Vision detected native saplings with 0.94 confidence.',
  },
  {
    id: 'node-media-before',
    label: 'IMG_2025_0814_BEFORE.JPG',
    category: 'media',
    x: 18,
    y: 72,
    color: '#5ee0b5',
    image: 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=600&q=80',
    meta: 'Baseline Bank · Pre-Restoration',
    detail: 'Eroded silt bank prior to plantation. Verified as primary comparator frame.',
  },
  {
    id: 'node-location',
    label: 'NIGAMBODH GHAT',
    category: 'location',
    x: 82,
    y: 75,
    color: '#e4b15a',
    meta: '28.6694° N, 77.2318° E · Delhi',
    detail: 'Spatial centroid anchored to Yamuna flood basin. Clusters 42 verified field captures.',
  },
  {
    id: 'node-activity',
    label: 'TREE PLANTING',
    category: 'activity',
    x: 22,
    y: 26,
    color: '#8eb7ff',
    meta: 'Native Species · 1,200 Saplings',
    detail: 'Monsoon afforestation campaign mapped against watershed biodiversity criteria.',
  },
  {
    id: 'node-compare',
    label: 'BEFORE / AFTER SET',
    category: 'compare',
    x: 48,
    y: 86,
    color: '#8eb7ff',
    meta: '13-Month Pair · Synchronized',
    detail: 'Dual-lens comparison highlighting canopy expansion without uncalibrated metric claims.',
  },
  {
    id: 'node-report',
    label: 'SEPTEMBER 2026 BRIEF',
    category: 'report',
    x: 52,
    y: 14,
    color: '#f0d7b0',
    meta: 'Traceable Report · 18 Citations',
    detail: 'Stakeholder brief where every finding embeds cryptographic hash references back to source assets.',
  },
  {
    id: 'node-evidence',
    label: 'EVIDENCE MESH #73',
    category: 'evidence',
    x: 88,
    y: 52,
    color: '#7ddec8',
    meta: 'Cryptographic Hash Validated',
    detail: 'Perceptual dHash verified with zero collision across 486 ingested frames.',
  },
]

// Pipeline steps for Section 2
const PIPELINE_STEPS = [
  {
    id: 'photo',
    name: 'PHOTO / VIDEO',
    sub: 'Field capture with raw EXIF',
    color: '#f4f0e6',
    icon: Images,
    example: 'Raw mobile upload',
  },
  {
    id: 'project',
    name: 'PROJECT',
    sub: 'Semantic gravity center',
    color: '#5ee0b5',
    icon: Layers,
    example: 'Yamuna River Restoration',
  },
  {
    id: 'location',
    name: 'LOCATION',
    sub: 'GPS coordinates & bounds',
    color: '#e4b15a',
    icon: MapPin,
    example: '28.6694° N, 77.2318° E',
  },
  {
    id: 'activity',
    name: 'ACTIVITY',
    sub: 'Action taxonomy classification',
    color: '#8eb7ff',
    icon: Zap,
    example: 'Native riparian planting',
  },
  {
    id: 'compare',
    name: 'BEFORE / AFTER',
    sub: 'Spatial temporal comparison',
    color: '#8eb7ff',
    icon: SlidersHorizontal,
    example: '13-month canopy diff',
  },
  {
    id: 'report',
    name: 'VERIFIED REPORT',
    sub: 'Traceable stakeholder story',
    color: '#f0d7b0',
    icon: FileText,
    example: 'Cited public brief',
  },
]

export function LandingPage() {
  const [selectedNode, setSelectedNode] = useState<HeroNode>(HERO_NODES[0])
  const [activeStep, setActiveStep] = useState(0)

  return (
    <div className="relative min-h-screen bg-bg text-ink selection:bg-mint-2 selection:text-ink font-sans grid-bg">
      {/* 0. FLOATING VERTICAL TOOL DOCK (Right Margin - Matches creative toy-box reference) */}
      <aside className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-40 hidden lg:flex flex-col items-center gap-2.5 rounded-full border border-line bg-elev/90 p-2 shadow-2xl backdrop-blur-2xl">
        {DOCK_ITEMS.map((item) => (
          <div key={item.id} className="group relative">
            <Link
              to={item.to}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line/60 bg-elev text-ink transition-all duration-300 hover:scale-110 hover:border-mint hover:bg-mint/10 hover:shadow-lg"
              aria-label={item.label}
            >
              <span className="text-base select-none">{item.emoji}</span>
            </Link>
            {/* Tooltip on hover */}
            <div className="pointer-events-none absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border border-line bg-elev px-3 py-1.5 font-mono text-[11px] font-medium text-ink opacity-0 shadow-xl backdrop-blur-xl transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
              <span className="font-bold text-ink block">{item.label}</span>
              <span className="block text-[9px] text-dim">{item.sub}</span>
            </div>
          </div>
        ))}
      </aside>

      {/* 1. MINIMAL EDITORIAL NAVIGATION */}
      <header className="sticky top-0 z-40 border-b border-line/50 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
          <Link to="/" className="transition hover:opacity-90">
            <ImpactMeshBrand size="md" />
          </Link>

          <nav className="flex items-center gap-4 sm:gap-6">
            <Link to="/feed" className="text-sm font-medium text-dim transition hover:text-ink">
              Public Record
            </Link>
            <ThemeToggle showLabel={false} />
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 rounded-full border border-mint/40 bg-mint/10 px-4 py-1.5 text-xs font-semibold text-mint transition hover:bg-mint hover:text-bg hover:shadow-[0_0_20px_rgba(94,224,181,0.35)]"
            >
              <span>Enter Workspace</span>
              <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* ================================================== */}
        {/* SECTION 1: HERO + INTERACTIVE EVIDENCE VISUALIZATION */}
        {/* ================================================== */}
        <section className="relative overflow-hidden pt-8 pb-16 md:pt-14 md:pb-24 border-b border-line/40">
          {/* Subtle background ambient glows */}
          <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-mint/5 blur-[120px]" />

          <div className="mx-auto max-w-7xl px-6 sm:px-8">
            {/* Top Announcement Banner Pill (like Nexprint creator banner) */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2.5 rounded-full border border-amber/40 bg-amber/10 px-4 py-1.5 text-xs text-ink backdrop-blur-md shadow-sm transition hover:scale-[1.01]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber/20 text-xs">🌱</span>
                <span className="font-mono text-[11px] tracking-wide text-dim">
                  Yamuna Restoration: <strong className="text-ink font-semibold">1,200 Native Saplings</strong> verified across 486 field captures
                </span>
                <span className="hidden sm:inline-block rounded-full bg-amber/25 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber">
                  Live Record
                </span>
              </div>
            </div>

            {/* Editorial Headline & Supporting Copy */}
            <div className="mx-auto max-w-4xl text-center space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-elev/80 px-3.5 py-1 text-xs backdrop-blur-md shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-dim">
                  Spatial Evidence Graph
                </span>
              </div>

              <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-normal tracking-tight text-ink leading-[1.06]">
                From field media
                <br />
                <span className="italic text-mint">to verifiable impact.</span>
              </h1>

              {/* Big bold stat counter lockup (Creative & high impact like reference) */}
              <div className="pt-1 flex flex-col items-center">
                <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
                  Verified Ecological Canopy Growth
                </div>
                <div className="mt-1 font-mono text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-ink drop-shadow-sm">
                  1,200 <span className="text-mint text-4xl sm:text-5xl font-serif font-normal italic">Saplings</span>
                </div>
                <div className="mt-1 font-mono text-[11px] text-dim">
                  486 Field Frames · 0 Perceptual Hash Collisions · 100% EXIF Audited
                </div>
              </div>

              <p className="mx-auto max-w-2xl text-base text-dim leading-relaxed pt-1">
                ImpactMesh turns scattered field photos and videos into a connected evidence record — searchable,
                traceable, and ready to become a story.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                <Link
                  to="/app"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-mint px-6 py-3 text-sm font-semibold text-bg transition hover:bg-[#7ff3cd] hover:shadow-[0_0_30px_rgba(94,224,181,0.4)]"
                >
                  <span>Open Evidence Workspace</span>
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/feed"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-elev/80 px-6 py-3 text-sm font-medium text-ink transition hover:bg-elev hover:border-line/80 shadow-sm"
                >
                  <span>Explore Public Record</span>
                  <ArrowUpRight size={14} className="text-dim" />
                </Link>
              </div>
            </div>

            {/* HERO VISUAL: Interactive Miniature Evidence Universe with Playful Floating Badges */}
            <div className="mt-14 relative">
              {/* Playful Floating Creative Badges around Hero (matches reference style) */}
              {/* Badge 1: Top-Left ⭐ */}
              <div className="absolute -top-6 left-2 sm:left-8 z-30 hidden sm:flex items-center gap-2.5 rounded-2xl border border-line bg-elev/95 px-3.5 py-2 shadow-xl backdrop-blur-xl animate-float-slow transition hover:scale-105 select-none">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber/15 text-amber text-sm font-bold">⭐</span>
                <div>
                  <p className="font-mono text-xs font-bold text-ink leading-tight">95% Truth Score</p>
                  <p className="font-mono text-[9px] text-faint">Cloudinary Vision AI</p>
                </div>
              </div>

              {/* Badge 2: Top-Right ⚡ */}
              <div className="absolute -top-5 right-2 sm:right-10 z-30 hidden sm:flex items-center gap-2.5 rounded-2xl border border-line bg-elev/95 px-3.5 py-2 shadow-xl backdrop-blur-xl animate-float-medium transition hover:scale-105 select-none">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky/15 text-sky text-sm">⚡</span>
                <div>
                  <p className="font-mono text-xs font-bold text-ink leading-tight">Native Species Match</p>
                  <p className="font-mono text-[9px] text-faint">Tamarix dioica detected</p>
                </div>
              </div>

              {/* Badge 3: Mid-Left 🌱 */}
              <div className="absolute top-1/2 -left-6 -translate-y-1/2 z-30 hidden lg:flex items-center gap-2.5 rounded-2xl border border-line bg-elev/95 px-3.5 py-2 shadow-2xl backdrop-blur-xl animate-float-reverse transition hover:scale-105 select-none">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint/15 text-mint text-sm">🌱</span>
                <div>
                  <p className="font-mono text-xs font-bold text-ink leading-tight">1,200 Native Saplings</p>
                  <p className="font-mono text-[9px] text-faint">Phase 1 Monsoons</p>
                </div>
              </div>

              {/* Badge 4: Mid-Right 📍 */}
              <div className="absolute top-1/2 -right-6 -translate-y-1/2 z-30 hidden lg:flex items-center gap-2.5 rounded-2xl border border-line bg-elev/95 px-3.5 py-2 shadow-2xl backdrop-blur-xl animate-float-slow transition hover:scale-105 select-none">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose/15 text-rose text-sm">📍</span>
                <div>
                  <p className="font-mono text-xs font-bold text-ink leading-tight">28.6694° N, 77.2318° E</p>
                  <p className="font-mono text-[9px] text-faint">Nigambodh Ghat Basin</p>
                </div>
              </div>

              {/* Badge 5: Bottom-Left 🌊 */}
              <div className="absolute -bottom-6 left-8 z-30 hidden sm:flex items-center gap-2.5 rounded-2xl border border-line bg-elev/95 px-3.5 py-2 shadow-xl backdrop-blur-xl animate-float-medium transition hover:scale-105 select-none">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky/15 text-sky text-sm">🌊</span>
                <div>
                  <p className="font-mono text-xs font-bold text-ink leading-tight">Restored Flood Bank</p>
                  <p className="font-mono text-[9px] text-faint">Silt stabilization active</p>
                </div>
              </div>

              {/* Badge 6: Bottom-Right 🏆 */}
              <div className="absolute -bottom-6 right-8 z-30 hidden sm:flex items-center gap-2.5 rounded-2xl border border-line bg-elev/95 px-3.5 py-2 shadow-xl backdrop-blur-xl animate-float-reverse transition hover:scale-105 select-none">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-mint/15 text-mint text-sm">🏆</span>
                <div>
                  <p className="font-mono text-xs font-bold text-ink leading-tight">Zero Data Tampering</p>
                  <p className="font-mono text-[9px] text-faint">Perceptual dHash verified</p>
                </div>
              </div>

              {/* Visual Container Canvas */}
              <div className="relative mx-auto aspect-[16/9] w-full max-w-5xl overflow-hidden rounded-[32px] border border-line bg-elev/75 shadow-2xl backdrop-blur-xl transition-colors">
                {/* Background dot-grid coordinate texture */}
                <div className="absolute inset-0 grid-bg opacity-35" />

                {/* Ambient celestial lights */}
                <div className="pointer-events-none absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-mint/10 blur-[100px]" />
                <div className="pointer-events-none absolute bottom-10 right-20 h-64 w-64 rounded-full bg-amber/5 blur-[80px]" />

                {/* SVG Animated Connections */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none">
                  {HERO_NODES.filter((n) => n.id !== 'node-project').map((node) => (
                    <g key={node.id}>
                      {/* Connection curve */}
                      <path
                        d={`M 50% 50% Q ${(50 + node.x) / 2}% ${(50 + node.y) / 2 + (node.y > 50 ? -6 : 6)}% ${node.x}% ${node.y}%`}
                        stroke={selectedNode.id === node.id ? '#5ee0b5' : 'currentColor'}
                        strokeOpacity={selectedNode.id === node.id ? 1 : 0.2}
                        strokeWidth={selectedNode.id === node.id ? 2 : 1}
                        strokeDasharray={selectedNode.id === node.id ? 'none' : '4 4'}
                        fill="none"
                        className="transition-colors duration-300 text-line"
                      />
                      {/* Flowing signal particle */}
                      <circle r={selectedNode.id === node.id ? 3 : 2} fill={node.color} opacity={0.8}>
                        <animateMotion
                          path={`M 50% 50% Q ${(50 + node.x) / 2}% ${(50 + node.y) / 2 + (node.y > 50 ? -6 : 6)}% ${node.x}% ${node.y}%`}
                          dur={`${4 + (node.x % 3)}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    </g>
                  ))}
                </svg>

                {/* Interactive Floating Nodes */}
                {HERO_NODES.map((node) => {
                  const isProject = node.category === 'project'
                  const isSelected = selectedNode.id === node.id

                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      style={{
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={cn(
                        'absolute z-20 cursor-pointer select-none transition-all duration-300 group',
                        isSelected ? 'scale-110 z-30' : 'hover:scale-105',
                      )}
                    >
                      {/* Project Nucleus Center */}
                      {isProject ? (
                        <div className="relative flex flex-col items-center">
                          {/* Pulsing Orbit Rings */}
                          <div className="absolute -inset-4 rounded-full border border-mint/30 animate-ping opacity-25" />
                          <div className="absolute -inset-3 rounded-full border border-mint/40" />

                          <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-mint bg-elev text-mint shadow-[0_0_35px_rgba(94,224,181,0.4)]">
                            <ImpactMeshLogo size="sm" variant="badge" />
                          </div>

                          <div className="mt-2 whitespace-nowrap rounded-full border border-mint/40 bg-elev/95 px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-mint backdrop-blur-md shadow-lg">
                            {node.label}
                          </div>
                        </div>
                      ) : node.image ? (
                        /* Media Photo Card Node */
                        <div
                          className={cn(
                            'overflow-hidden rounded-2xl border bg-elev/95 p-1 shadow-2xl backdrop-blur-md transition-all duration-300',
                            isSelected
                              ? 'border-mint shadow-[0_0_25px_rgba(94,224,181,0.4)]'
                              : 'border-line group-hover:border-mint/50',
                          )}
                        >
                          <img
                            src={node.image}
                            alt=""
                            className="h-14 w-20 sm:h-16 sm:w-24 rounded-xl object-cover"
                          />
                          <p className="mt-1 truncate max-w-[90px] font-mono text-[9px] text-faint px-1">
                            {node.label}
                          </p>
                        </div>
                      ) : (
                        /* Geometric Semantic Node */
                        <div
                          className={cn(
                            'flex items-center gap-2 rounded-2xl border px-3 py-1.5 shadow-xl backdrop-blur-md transition-all duration-300',
                            isSelected
                              ? 'border-mint bg-mint/10 text-ink shadow-[0_0_20px_rgba(94,224,181,0.3)]'
                              : 'border-line bg-elev/90 text-dim group-hover:text-ink group-hover:border-mint/40',
                          )}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: node.color }}
                          />
                          <span className="font-mono text-[11px] font-medium whitespace-nowrap">
                            {node.label}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Dynamic Node Inspection Callout overlay at bottom right */}
                <div className="absolute bottom-4 right-4 z-30 max-w-sm rounded-2xl border border-line bg-elev/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-line">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-faint">
                      Active Node In Focus
                    </span>
                    <span
                      className="font-mono text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: selectedNode.color }}
                    >
                      {selectedNode.category}
                    </span>
                  </div>

                  <h4 className="mt-2 font-serif text-lg text-ink font-medium leading-tight">
                    {selectedNode.label}
                  </h4>
                  <p className="mt-0.5 font-mono text-[10px] text-dim">{selectedNode.meta}</p>
                  <p className="mt-2 text-xs leading-relaxed text-dim">{selectedNode.detail}</p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-line/60">
                    <span className="font-mono text-[9px] text-faint">Click any node to inspect</span>
                    <Link
                      to="/app"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-mint hover:underline font-semibold"
                    >
                      <span>Fly to in 3D Canvas</span>
                      <ArrowRight size={10} />
                    </Link>
                  </div>
                </div>

                {/* Subtle visual helper badge at top left */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2 rounded-xl border border-line bg-elev/90 px-3 py-1 text-[11px] font-mono text-dim backdrop-blur-md shadow-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  <span>Interactive Evidence Constellation · Click nodes</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 2: ONE RECORD. EVERY CONNECTION. */}
        {/* ================================================== */}
        <section className="py-20 md:py-28 border-b border-line/40">
          <div className="mx-auto max-w-7xl px-6 sm:px-8">
            <div className="text-center space-y-3">
              <Eyebrow>Evidence Architecture</Eyebrow>
              <h2 className="font-serif text-4xl sm:text-5xl text-ink">
                One record. <span className="italic text-mint">Every connection.</span>
              </h2>
              <p className="mx-auto max-w-xl text-sm sm:text-base text-dim">
                Field assets don't sit in isolated folders. Every capture traverses a deterministic pipeline into a
                permanent evidence mesh.
              </p>
            </div>

            {/* Horizontal Lineage Pipeline */}
            <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 relative">
              {PIPELINE_STEPS.map((step, idx) => {
                const isSelected = activeStep === idx
                const Icon = step.icon

                return (
                  <div
                    key={step.id}
                    onClick={() => setActiveStep(idx)}
                    className={cn(
                      'group relative flex flex-col justify-between rounded-3xl border p-5 cursor-pointer transition-all duration-300',
                      isSelected
                        ? 'border-mint bg-mint/5 shadow-[0_0_30px_rgba(94,224,181,0.15)] -translate-y-1'
                        : 'border-line bg-elev/70 hover:border-mint/40 hover:bg-elev shadow-sm',
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3">
                        <span className="font-mono text-[10px] text-faint">0{idx + 1}</span>
                        <Icon size={16} style={{ color: step.color }} />
                      </div>

                      <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
                        {step.name}
                      </h3>
                      <p className="mt-1 text-[11px] text-dim leading-snug">{step.sub}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-line/60">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-faint block">
                        Evidence binding:
                      </span>
                      <p className="font-mono text-[10px] text-mint truncate mt-0.5">{step.example}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 3: BUILT AROUND THE EVIDENCE (4 CAPABILITIES) */}
        {/* ================================================== */}
        <section className="py-20 md:py-28 border-b border-line/40 bg-elev2/40">
          <div className="mx-auto max-w-7xl px-6 sm:px-8">
            <div className="text-center space-y-3">
              <Eyebrow>Core Capabilities</Eyebrow>
              <h2 className="font-serif text-4xl sm:text-5xl text-ink">
                Built around the <span className="italic text-mint">evidence.</span>
              </h2>
              <p className="mx-auto max-w-xl text-sm sm:text-base text-dim">
                Four dedicated capabilities designed strictly for verifiable impact, not conventional admin dashboards.
              </p>
            </div>

            {/* Exactly 4 Capabilities Grid */}
            <div className="mt-14 grid gap-6 sm:grid-cols-2">
              {/* 1. Understand Media */}
              <div className="group rounded-[32px] border border-line bg-elev/80 p-8 shadow-sm transition-all hover:border-mint/50 hover:bg-elev hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-mint/30 bg-mint/10 text-mint">
                    <Sparkles size={22} />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-faint">01 / Media</span>
                </div>
                <h3 className="mt-6 font-serif text-3xl text-ink">Understand media</h3>
                <p className="mt-3 text-sm text-dim leading-relaxed">
                  Automated EXIF extraction, Cloudinary Vision classification, and perceptual dHash indexing. Raw
                  photos receive tamper-evident fingerprints and automated taxonomy routing upon ingest.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 pt-2 border-t border-line/60 font-mono text-[10px] text-dim">
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Cloudinary AI Vision</span>
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">64-bit dHash</span>
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">EXIF GPS</span>
                </div>
              </div>

              {/* 2. Connect Evidence */}
              <div className="group rounded-[32px] border border-line bg-elev/80 p-8 shadow-sm transition-all hover:border-sky/50 hover:bg-elev hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-sky/30 bg-sky/10 text-sky">
                    <Share2 size={22} />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-faint">02 / Graph</span>
                </div>
                <h3 className="mt-6 font-serif text-3xl text-ink">Connect evidence</h3>
                <p className="mt-3 text-sm text-dim leading-relaxed">
                  Full 3D knowledge graph tying media assets to project nuclei, spatial GPS centroids, and restoration
                  actions. Semantic gravity clusters ensure massive asset collections remain effortless to explore.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 pt-2 border-t border-line/60 font-mono text-[10px] text-dim">
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Three.js Graph</span>
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Project Clusters</span>
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Multi-Node Selection</span>
                </div>
              </div>

              {/* 3. Compare Change */}
              <div className="group rounded-[32px] border border-line bg-elev/80 p-8 shadow-sm transition-all hover:border-amber/50 hover:bg-elev hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber/30 bg-amber/10 text-amber">
                    <SlidersHorizontal size={22} />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-faint">03 / Compare</span>
                </div>
                <h3 className="mt-6 font-serif text-3xl text-ink">Compare change</h3>
                <p className="mt-3 text-sm text-dim leading-relaxed">
                  Forensic comparison lab featuring synchronized split-sliders, blink comparators, and opacity diffs.
                  Enforces honest data reporting: rigorously separates AI visual suggestions from verified human findings.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 pt-2 border-t border-line/60 font-mono text-[10px] text-dim">
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Split-View Slider</span>
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Blink Comparator</span>
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Honest AI Observations</span>
                </div>
              </div>

              {/* 4. Publish Verified Stories */}
              <div className="group rounded-[32px] border border-line bg-elev/80 p-8 shadow-sm transition-all hover:border-mint/50 hover:bg-elev hover:shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-mint/30 bg-mint/10 text-mint">
                    <FileText size={22} />
                  </div>
                  <span className="font-mono text-[11px] uppercase tracking-widest text-faint">04 / Publish</span>
                </div>
                <h3 className="mt-6 font-serif text-3xl text-ink">Publish verified stories</h3>
                <p className="mt-3 text-sm text-dim leading-relaxed">
                  Traceable public records and stakeholder briefs where every metric and observation links directly to
                  cryptographically referenced field captures. Fully auditable from brief to original camera sensor.
                </p>
                <div className="mt-6 flex flex-wrap gap-2 pt-2 border-t border-line/60 font-mono text-[10px] text-dim">
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Source Traceability</span>
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Public Feed</span>
                  <span className="rounded-full bg-elev2 border border-line/60 px-2.5 py-1">Audit Ready</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 4: LARGE HIGH-IMPACT CLOSING CTA */}
        {/* ================================================== */}
        <section className="py-24 md:py-32 relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-[450px] w-[750px] rounded-full bg-mint/10 blur-[140px]" />
          </div>

          <div className="relative mx-auto max-w-4xl px-6 sm:px-8 text-center space-y-6">
            <ImpactMeshLogo size="lg" className="mx-auto" />

            <h2 className="font-serif text-4xl sm:text-6xl text-ink tracking-tight">
              Ready to enter the <span className="italic text-mint">evidence workspace?</span>
            </h2>

            <p className="mx-auto max-w-xl text-base sm:text-lg text-dim">
              Explore the Yamuna River Restoration and Haryana Solar records in a full-screen, interactive spatial canvas.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                to="/app"
                className="group inline-flex items-center gap-2.5 rounded-full bg-mint px-8 py-4 text-sm font-semibold text-bg transition hover:bg-[#7ff3cd] hover:shadow-[0_0_35px_rgba(94,224,181,0.5)]"
              >
                <span>Open Evidence Workspace</span>
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                to="/feed"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-elev/80 px-8 py-4 text-sm font-medium text-ink transition hover:bg-elev shadow-sm"
              >
                <span>Explore Public Record</span>
                <ArrowUpRight size={15} className="text-dim" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* MINIMAL EDITORIAL FOOTER */}
      <footer className="border-t border-line/60 bg-bg py-8">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-4 px-6 sm:px-8 text-xs text-dim">
          <div className="flex items-center gap-3">
            <ImpactMeshLogo size="sm" variant="badge" />
            <span className="font-mono text-[11px] text-faint">
              IMPACTMESH · Field media to verifiable impact
            </span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <Link to="/feed" className="hover:text-ink transition">
              Public Record
            </Link>
            <Link to="/login" className="hover:text-ink transition">
              Workspace Login
            </Link>
            <span className="flex items-center gap-1.5 text-mint">
              <span className="h-1.5 w-1.5 rounded-full bg-mint animate-pulse" />
              <span>Mesh Active</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
