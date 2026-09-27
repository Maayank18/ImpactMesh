import { Link, useParams } from 'react-router-dom'
import { ArrowRight, Compass, Folder, Globe, MapPin, ShieldCheck } from 'lucide-react'
import { ImpactMeshBrand, ImpactMeshLogo } from '@/components/logo'
import { EvidenceGraph } from '@/components/graph'
import { EvidenceImage, Eyebrow, Pill } from '@/components/ui'
import { usePublicGraph, usePublicProject, usePublicProjects } from '@/hooks/queries'
import { formatWhen } from '@/lib/format'

function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/50 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
        <Link to="/" className="transition hover:opacity-90">
          <ImpactMeshBrand size="md" />
        </Link>
        <nav className="flex items-center gap-5 sm:gap-7 text-xs font-mono uppercase tracking-wider text-dim">
          <Link to="/" className="hover:text-ink transition hidden sm:inline">Explore</Link>
          <Link to="/feed" className="text-mint font-semibold transition">Public Record</Link>
          <Link
            to="/app"
            className="rounded-full bg-mint px-4 py-1.5 text-xs font-sans font-semibold text-bg hover:bg-[#7ff3cd] hover:shadow-[0_0_20px_rgba(94,224,181,0.35)] transition"
          >
            Enter Workspace →
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function FeedPage() {
  const projects = usePublicProjects()

  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-mint-2 selection:text-ink font-sans">
      <PublicHeader />
      <main className="mx-auto max-w-7xl px-6 py-12 sm:px-8 sm:py-16">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-elev/60 px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-mint" />
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-dim">
              Verified Public Transparency Record
            </span>
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl text-ink leading-tight">
            Published records, <span className="italic text-mint">tied to raw evidence.</span>
          </h1>
          <p className="text-base text-dim leading-relaxed">
            Every project below represents an active restoration record where claims link back to original,
            unaltered field captures and sensor logs.
          </p>
        </div>

        {/* Media-led Project Cards Grid */}
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {projects.data?.map((project) => (
            <Link
              key={project.id}
              to={`/feed/${project.slug}`}
              className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-elev/60 transition-all duration-300 hover:border-mint/40 hover:shadow-[0_0_40px_rgba(0,0,0,0.8)] flex flex-col"
            >
              {/* Hero Image Container with hover zoom */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                <EvidenceImage
                  src={project.coverUrl}
                  alt={project.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent opacity-80" />

                {/* Badges on Image */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                  <Pill tone="mint">
                    <span className="flex items-center gap-1">
                      <ShieldCheck size={11} />
                      <span>Verified Record</span>
                    </span>
                  </Pill>
                  <Pill tone="neutral">{project.city || 'Delhi'}</Pill>
                </div>

                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs font-mono text-ink">
                  <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                    {project.mediaCount} Evidence Assets
                  </span>
                  <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 text-dim">
                    {formatWhen(project.period)}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="flex-1 p-6 flex flex-col justify-between space-y-4">
                <div>
                  <h2 className="font-serif text-3xl text-ink group-hover:text-mint transition">
                    {project.name}
                  </h2>
                  <p className="mt-2 text-sm text-dim leading-relaxed line-clamp-2">
                    {project.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-line/60 flex items-center justify-between font-mono text-[11px] text-faint">
                  <span className="flex items-center gap-1.5 text-dim">
                    <MapPin size={12} className="text-amber" />
                    <span>{project.locationCount} GPS Centroids</span>
                  </span>

                  <span className="inline-flex items-center gap-1 text-mint group-hover:underline">
                    <span>Inspect Record</span>
                    <ArrowRight size={12} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

export function PublicProjectPage() {
  const { slug = '' } = useParams()
  const project = usePublicProject(slug)
  const graph = usePublicGraph(slug)
  const page = project.data

  if (!page) {
    return (
      <div className="min-h-screen bg-bg text-ink flex items-center justify-center font-mono text-xs uppercase tracking-widest text-dim">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-mint animate-ping" />
          <span>Opening Public Story…</span>
        </span>
      </div>
    )
  }

  const before = page.media.find((item) => item.id === page.comparisons[0]?.beforeId)
  const after = page.media.find((item) => item.id === page.comparisons[0]?.afterId)

  return (
    <div className="min-h-screen bg-bg text-ink selection:bg-mint-2 selection:text-ink font-sans pb-24">
      <PublicHeader />

      <main className="mx-auto max-w-7xl px-6 pt-12 sm:px-8">
        {/* Project Header Dossier */}
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center pb-12 border-b border-line/50">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Pill tone="mint">Verified Public Record</Pill>
              <Pill tone="neutral">{page.locations[0]?.city || 'Delhi'}</Pill>
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl text-ink leading-[1.08]">{page.project.name}</h1>
            <p className="text-base sm:text-lg text-dim leading-relaxed">{page.project.description}</p>

            <div className="pt-2 flex flex-wrap gap-4 font-mono text-xs text-faint">
              <span>{page.media.length} Verified Assets</span>
              <span>·</span>
              <span>{page.locations.length} Spatial Locations</span>
              <span>·</span>
              <span>{page.comparisons.length} Before / After Sets</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-white/10 bg-elev shadow-2xl">
            <EvidenceImage
              src={page.media[0]?.secureUrl}
              alt={page.media[0]?.altText || ''}
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </section>

        {/* Documented Figures Strip */}
        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {page.documented.map((item) => (
            <div key={item.label} className="rounded-3xl border border-white/10 bg-elev/60 p-6">
              <p className="font-serif text-4xl text-mint">{item.value}</p>
              <p className="mt-1 text-sm text-dim">{item.label}</p>
            </div>
          ))}
        </section>

        {/* Visual Before / After Comparison */}
        {before && after && (
          <section className="mt-16 rounded-[32px] border border-white/10 bg-elev/40 p-8">
            <div className="flex items-center justify-between pb-4 border-b border-line">
              <div>
                <Eyebrow>Visual Comparison</Eyebrow>
                <h3 className="mt-1 font-serif text-3xl text-ink">Field Change Over Time</h3>
              </div>
              <Pill tone="sky">Synchronized Pair</Pill>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <figure className="overflow-hidden rounded-2xl border border-line bg-black">
                <EvidenceImage src={before.secureUrl} alt={before.altText} className="aspect-[16/10] w-full" />
                <figcaption className="p-3 font-mono text-xs text-dim">
                  Baseline · {formatWhen(before.capturedAt)}
                </figcaption>
              </figure>
              <figure className="overflow-hidden rounded-2xl border border-line bg-black">
                <EvidenceImage src={after.secureUrl} alt={after.altText} className="aspect-[16/10] w-full" />
                <figcaption className="p-3 font-mono text-xs text-dim">
                  Restored · {formatWhen(after.capturedAt)}
                </figcaption>
              </figure>
            </div>

            {page.visualObservations[0] && (
              <p className="mt-4 text-xs italic text-dim border-l-2 border-mint/40 pl-3 leading-relaxed">
                "{page.visualObservations[0]}"
              </p>
            )}
          </section>
        )}

        {/* Relational 3D Evidence Graph */}
        <section className="mt-16">
          <div className="flex items-center justify-between pb-4">
            <div>
              <Eyebrow>Evidence Topology</Eyebrow>
              <h3 className="mt-1 font-serif text-3xl text-ink">Connected Impact Mesh</h3>
            </div>
            <span className="font-mono text-xs text-mint">Interactive Three.js</span>
          </div>

          <div className="h-[480px] overflow-hidden rounded-[32px] border border-white/10 bg-[#08090b] shadow-2xl">
            {graph.data ? (
              <EvidenceGraph
                data={graph.data}
                showLabels={false}
                onNode={() => undefined}
                onLink={() => undefined}
                onDouble={() => undefined}
              />
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}
