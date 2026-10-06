import type { Aviso } from '../lib/types';
import { cx } from './ui';

export function AvisoItem({ a }: { a: Aviso }) {
  const err = a.nivel === 'error';
  return (
    <div className={cx('flex gap-2.5 rounded-lg border p-2.5', err ? 'border-error-line bg-error-bg text-error-fg' : 'border-warn-line bg-warn-bg text-warn-fg')}>
      <span className={cx('mt-[5px] h-2 w-2 flex-none', err ? 'rounded-full bg-error-solid' : 'rotate-45 rounded-[2px] bg-warn-fg')} />
      <div className="flex min-w-0 flex-col gap-0.5"><span className="num text-xs font-semibold">{a.titulo}</span><span className="text-xs leading-snug opacity-90">{a.detalle}</span></div>
    </div>
  );
}
