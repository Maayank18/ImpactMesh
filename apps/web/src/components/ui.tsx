import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

export function Button({
  variant = 'solid',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' | 'quiet' | 'danger' }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'solid' && 'bg-mint text-bg hover:bg-ink',
        variant === 'ghost' && 'border border-line bg-elev/60 text-ink hover:border-dim',
        variant === 'quiet' && 'text-dim hover:text-ink',
        variant === 'danger' && 'border border-rose/40 text-rose hover:bg-rose/10',
        className,
      )}
      {...props}
    />
  )
}

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'mint' | 'amber' | 'rose' | 'sky'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em]',
        tone === 'neutral' && 'bg-white/5 text-dim',
        tone === 'mint' && 'bg-mint-2 text-mint',
        tone === 'amber' && 'bg-amber/10 text-amber',
        tone === 'rose' && 'bg-rose/10 text-rose',
        tone === 'sky' && 'bg-sky/10 text-sky',
      )}
    >
      {children}
    </span>
  )
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-3xl border border-line bg-elev/80', className)}>{children}</section>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-faint">{children}</p>
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-faint">{label}</span>
      {children}
    </label>
  )
}

export const fieldClass =
  'w-full rounded-2xl border border-line bg-bg/60 px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-mint'

export function EvidenceImage({
  src,
  alt,
  className,
}: {
  src?: string | null
  alt: string
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <div className={cn('grid place-items-center bg-elev2 text-center', className)}>
        <span className="px-3 font-mono text-[10px] uppercase tracking-[0.16em] text-faint">Field asset</span>
      </div>
    )
  }
  return <img src={src} alt={alt} className={cn('object-cover', className)} onError={() => setFailed(true)} />
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-line px-6 py-12 text-center">
      <h3 className="font-serif text-2xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-dim">{body}</p>
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-line bg-elev p-6" onClick={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="font-serif text-3xl">{title}</h2>
          <button className="text-sm text-dim" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
