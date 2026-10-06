import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ');
export { cx };

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export function Button({ variant = 'secondary', className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant }) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-primary text-primary-fg font-semibold border-transparent hover:opacity-90',
    secondary: 'bg-surface border-border hover:bg-hover font-medium',
    ghost: 'border-transparent hover:bg-hover font-medium',
    danger: 'border-transparent text-error-fg hover:bg-error-bg font-semibold'
  };
  return <button {...p} className={cx('inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-45', v[variant], className)}>{children}</button>;
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cx('flex h-9 gap-0.5 rounded-lg bg-sunken p-[3px]', className)}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={cx('rounded-md px-3 text-[13px] transition-all', o.value === value ? 'bg-surface font-medium shadow-sm' : 'text-muted hover:text-text')}>{o.label}</button>
      ))}
    </div>
  );
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={cx('relative h-[22px] w-9 flex-none rounded-full transition-colors', on ? 'bg-primary' : 'bg-border-strong')}>
      <span className={cx('absolute top-[3px] h-4 w-4 rounded-full transition-all', on ? 'left-[17px] bg-primary-fg' : 'left-[3px] bg-surface')} />
    </button>
  );
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'error' | 'primary'; children: ReactNode }) {
  const t = { neutral: 'bg-sunken text-muted border border-border', ok: 'bg-ok-bg text-ok-fg', warn: 'bg-warn-bg text-warn-fg', error: 'bg-error-bg text-error-fg', primary: 'bg-primary-tint text-text' }[tone];
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap', t)}>{children}</span>;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-xl border border-border bg-surface', className)}>{children}</div>;
}

export function Modal({ open, onClose, title, children, footer, width = 440 }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'var(--scrim)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={e => e.target === e.currentTarget && onClose()}>
          <motion.div role="dialog" aria-modal className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-modal" style={{ maxWidth: width }}
            initial={{ y: 12, opacity: 0, scale: .98 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 34 }}>
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <div className="flex-1 text-base font-semibold">{title}</div>
              <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-hover" aria-label="Cerrar"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-auto px-5 py-4">{children}</div>
            {footer && <div className="flex items-center gap-2 border-t border-border px-5 py-3">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const inputCls = 'h-9 rounded-lg border border-border bg-bg px-3 text-sm outline-none focus:border-primary focus:shadow-[0_0_0_3px_var(--primary-tint)] num';

export function PageHeader({ title, children, badge }: { title: string; children?: ReactNode; badge?: ReactNode }) {
  return (
    <header className="no-print flex flex-none flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center md:px-6">
      <div className="flex min-w-0 items-center gap-2.5">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {badge}
      </div>
      {children && (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-end">
          {children}
        </div>
      )}
    </header>
  );
}
