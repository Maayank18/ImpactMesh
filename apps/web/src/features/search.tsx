import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EvidenceImage, Eyebrow, Pill } from '@/components/ui'
import { useSearch } from '@/hooks/queries'

const EXAMPLES = [
  'plantation work near Delhi from September 2026',
  'waste cleanup in Delhi',
  'solar installation in Jhajjar',
  'before photos for the Yamuna',
]

export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const initial = params.get('q') || ''
  const [text, setText] = useState(initial)
  const search = useSearch(initial)

  return (
    <div className="px-5 py-6 md:px-8">
      <Eyebrow>Search</Eyebrow>
      <h1 className="mt-2 font-serif text-5xl">Ask the record in plain language.</h1>
      <form
        className="mt-6 flex max-w-3xl gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setParams({ q: text })
        }}
      >
        <input value={text} onChange={(event) => setText(event.target.value)} className="min-w-0 flex-1 rounded-full border border-line bg-elev px-4 py-3 outline-none" />
        <button className="rounded-full bg-mint px-5 text-sm text-bg">Search</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button key={example} onClick={() => { setText(example); setParams({ q: example }) }}>
            <Pill>{example}</Pill>
          </button>
        ))}
      </div>
      {search.data ? (
        <div className="mt-8">
          <p className="text-sm text-dim">{search.data.routing.note}</p>
          <p className="mt-2 font-mono text-xs text-faint">
            {[
              search.data.query.activity,
              search.data.query.location,
              search.data.query.evidenceType,
            ]
              .filter(Boolean)
              .join(' · ') || 'Open text match'}
          </p>
          <div className="mt-5 space-y-3">
            {search.data.results.length === 0 ? <p className="text-dim">Nothing in the record matched that.</p> : null}
            {search.data.results.map((hit) => (
              <article key={hit.media.id} className="grid gap-4 rounded-3xl border border-line p-3 sm:grid-cols-[180px_1fr]">
                <EvidenceImage src={hit.media.secureUrl} alt={hit.media.altText} className="aspect-[4/3] w-full rounded-2xl" />
                <div>
                  <h2 className="font-mono text-sm">{hit.media.filename}</h2>
                  <p className="mt-2 text-sm text-dim">{hit.media.caption}</p>
                  <p className="mt-2 text-xs text-faint">
                    {hit.projectName} · {hit.locationName} · {hit.activityName}
                  </p>
                  <ul className="mt-2 text-sm text-dim">
                    {hit.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                  <Link className="mt-3 inline-block text-sm text-mint" to={`/app/graph?q=${encodeURIComponent(initial)}&focus=${hit.media.id}`}>
                    Show on the graph
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
