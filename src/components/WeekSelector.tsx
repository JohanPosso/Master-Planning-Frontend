import { addDays, getISOWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { lunesDe, rangoSemana } from '../lib/time';
import { Button } from './ui';

export function WeekSelector({ lunes, onChange, label }: { lunes: Date; onChange: (d: Date, dir: number) => void; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 items-center rounded-lg border border-border bg-surface">
        <button className="grid h-[34px] w-[34px] place-items-center hover:bg-hover rounded-l-lg" aria-label="Anterior" onClick={() => onChange(addDays(lunes, -7), -1)}><ChevronLeft size={16} /></button>
        <div className="flex h-[34px] items-center gap-2 border-x border-border px-3">
          <span className="num text-sm font-semibold">{label ?? rangoSemana(lunes)}</span>
          {!label && <span className="text-xs text-muted">Sem. {getISOWeek(lunes)}</span>}
        </div>
        <button className="grid h-[34px] w-[34px] place-items-center hover:bg-hover rounded-r-lg" aria-label="Siguiente" onClick={() => onChange(addDays(lunes, 7), 1)}><ChevronRight size={16} /></button>
      </div>
      <Button onClick={() => onChange(lunesDe(new Date()), 0)}>Hoy</Button>
    </div>
  );
}
