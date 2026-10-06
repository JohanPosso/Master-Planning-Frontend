import { motion } from 'motion/react';
import type { Tramo } from '../lib/types';
import { dur, hhmm, minutos } from '../lib/time';
import { cx } from './ui';

/** Chip de turno: inicio y fin apilados. Usa las variables --c-* del contenedor. */
export function ChipBody({ tramos, overlay, duplicar }: { tramos: Tramo[]; overlay?: boolean; duplicar?: boolean }) {
  const base = 'rounded-md border bg-c-tint text-c-fg num transition-shadow';
  const ring = overlay ? 'border-c-solid shadow-drag' : 'border-c-line group-hover/chip:shadow-[0_0_0_2px_var(--c-solid)]';
  return (
    <div className={cx('relative flex flex-1 flex-col gap-[3px]', overlay && 'rotate-[-1.5deg] scale-[1.04]')}>
      {tramos.length === 1 ? (
        <div className={cx(base, ring, 'flex flex-1 flex-col px-2 py-[7px]')}>
          <span className="text-sm font-semibold leading-tight">{hhmm(tramos[0].inicio)}</span>
          <span className="text-sm font-semibold leading-tight">{hhmm(tramos[0].fin)}</span>
          <span className="mt-auto pt-1 text-[11px] opacity-80">{dur(minutos(tramos))}</span>
        </div>
      ) : (
        <>
          {tramos.map((t, i) => (
            <div key={i} className={cx(base, ring, 'flex flex-1 flex-col justify-center px-[7px] py-1')}>
              <span className="text-xs font-semibold leading-tight">{hhmm(t.inicio)}</span>
              <span className="text-xs font-semibold leading-tight">{hhmm(t.fin)}</span>
            </div>
          ))}
          {!overlay && <span className="pl-0.5 text-[11px] text-muted num">Partido · {dur(minutos(tramos))}</span>}
        </>
      )}
      {duplicar && <span className="absolute -right-2.5 -top-2.5 rounded-full bg-text px-2 py-0.5 text-[11px] font-semibold text-bg">+ Duplicar</span>}
    </div>
  );
}

export const AnimatedChip = motion.div;
