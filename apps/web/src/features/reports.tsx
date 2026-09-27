import { Link, useParams } from 'react-router-dom'
import { EvidenceImage, Eyebrow, Pill } from '@/components/ui'
import { useReport, useReports } from '@/hooks/queries'
import { formatWhen } from '@/lib/format'

export function ReportsPage() {
  const reports = useReports()
  return (
    <div className="px-5 py-6 md:px-8">
      <Eyebrow>Reports</Eyebrow>
      <h1 className="mt-2 font-serif text-5xl">Briefs that cite their sources.</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {reports.data?.map((report) => (
          <Link key={report.id} to={`/app/reports/${report.id}`} className="rounded-3xl border border-line p-5">
            <Pill>{report.projectName}</Pill>
            <h2 className="mt-4 font-serif text-3xl">{report.title}</h2>
            <p className="mt-2 text-sm text-dim">
              Version {report.version} · {formatWhen(report.generatedAt)} · {report.evidenceIds.length} sources
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function ReportPage() {
  const { reportId = '' } = useParams()
  const report = useReport(reportId)
  const detail = report.data
  if (!detail) return <p className="p-8 text-dim">Opening the brief…</p>
  return (
    <div className="px-4 py-8">
      <article className="print-area paper mx-auto max-w-3xl rounded-[28px] px-6 py-10 sm:px-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-paper-dim">
          {detail.project?.name} · {formatWhen(detail.report.generatedAt)}
        </p>
        <h1 className="mt-3 font-serif text-5xl leading-none">{detail.report.title}</h1>
        <p className="mt-6 leading-7">{detail.report.narrative.summary}</p>
        {detail.report.narrative.observations.map((observation) => (
          <section key={observation.text} className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-paper-dim">{observation.kind}</p>
            <p className="mt-2 leading-7">{observation.text}</p>
            {observation.evidenceIds.length ? (
              <p className="mt-2 font-mono text-xs text-paper-dim">Sources: {observation.evidenceIds.join(', ')}</p>
            ) : null}
          </section>
        ))}
        <h2 className="mt-10 font-serif text-3xl">Organization-reported figures</h2>
        <ul className="mt-3 space-y-3">
          {detail.report.narrative.orgReportedMetrics.map((metric) => (
            <li key={metric.label}>
              <strong>{metric.value}</strong> {metric.label}
              <span className="mt-1 block text-sm text-paper-dim">{metric.note}</span>
            </li>
          ))}
        </ul>
        <h2 className="mt-10 font-serif text-3xl">Limits of this brief</h2>
        <p className="mt-2 leading-7">{detail.report.narrative.limitations}</p>
        <h2 className="mt-10 font-serif text-3xl">Source assets</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {detail.evidence.map((item) => (
            <figure key={item.id}>
              <EvidenceImage src={item.secureUrl} alt={item.altText} className="aspect-[4/3] w-full rounded-2xl" />
              <figcaption className="mt-2 font-mono text-xs">
                {item.filename}
                <span className="mt-1 block font-sans text-sm text-paper-dim">{item.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="no-print mt-8 flex gap-3">
          <button className="rounded-full bg-paper-ink px-4 py-2 text-sm text-paper" onClick={() => window.print()}>
            Print or save as PDF
          </button>
          <a className="rounded-full border border-paper-ink/20 px-4 py-2 text-sm" href={`/api/v1/reports/${detail.report.id}/html`} target="_blank" rel="noreferrer">
            Open HTML
          </a>
        </div>
      </article>
    </div>
  )
}
