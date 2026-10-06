import { useEffect, useMemo, useState } from 'react';
import { addDays, endOfMonth, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, LogOut, Moon, Sun } from 'lucide-react';
import { useAuth, mensajeError } from '../lib/auth';
import { api, type PortalEstado, type PortalNomina } from '../lib/api';
import { colorVars } from '../lib/theme';
import { diasSemana, dur, eur, fmt, iso, lunesDe, minutos, rangoSemana, rangoTramos } from '../lib/time';
import { aplicarTema, type Tema } from '../lib/theme';
import { Badge, Button, cx } from '../components/ui';

export default function Portal() {
  const { sesion, logout } = useAuth();
  const [tema, setTema] = useState<Tema>((localStorage.getItem('jornada:tema') as Tema) || 'claro');
  const [estado, setEstado] = useState<PortalEstado | null>(null);
  const [nomina, setNomina] = useState<PortalNomina | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lunes, setLunes] = useState(() => lunesDe(new Date()));

  useEffect(() => {
    aplicarTema(tema);
    localStorage.setItem('jornada:tema', tema);
  }, [tema]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const e = await api.portalEstado();
        if (!vivo) return;
        setEstado(e);
        const inicio = iso(startOfMonth(new Date()));
        const fin = iso(endOfMonth(new Date()));
        const n = await api.portalNomina(inicio, fin);
        if (vivo) setNomina(n);
      } catch (err) {
        if (vivo) setError(mensajeError(err));
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const dias = useMemo(() => diasSemana(lunes), [lunes]);
  const turnosSemana = useMemo(() => {
    if (!estado) return [];
    const set = new Set(dias.map(iso));
    return estado.turnos.filter((t) => set.has(t.fecha));
  }, [estado, dias]);

  const minutosSemana = turnosSemana.reduce((a, t) => a + minutos(t.tramos), 0);

  if (error) {
    return (
      <div className="grid min-h-full place-items-center p-6">
        <div className="max-w-sm text-center">
          <p className="mb-3 text-sm text-error-fg">{error}</p>
          <Button variant="primary" onClick={logout}>Cerrar sesión</Button>
        </div>
      </div>
    );
  }

  if (!estado) {
    return <div className="grid min-h-full place-items-center text-sm text-muted">Cargando tu horario…</div>;
  }

  const { empleada } = estado;

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col">
      <header className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span style={colorVars(empleada.color)} className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-c-solid bg-c-tint text-sm font-semibold text-c-fg">
          {empleada.nombre[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{empleada.nombre}</div>
          <div className="text-[11px] text-muted">Mi horario y pago</div>
        </div>
        <button onClick={() => setTema(tema === 'claro' ? 'oscuro' : 'claro')} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-hover" aria-label="Tema">
          {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <Button onClick={logout}><LogOut size={15} />Salir</Button>
      </header>

      <section className="border-b border-border px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-base font-semibold">Mi horario</h2>
          <Badge tone="neutral">{dur(minutosSemana)}</Badge>
          <div className="flex-1" />
          <button onClick={() => setLunes(addDays(lunes, -7))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-hover" aria-label="Semana anterior"><ChevronLeft size={18} /></button>
          <span className="text-[13px] font-medium">{rangoSemana(lunes)}</span>
          <button onClick={() => setLunes(addDays(lunes, 7))} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-hover" aria-label="Semana siguiente"><ChevronRight size={18} /></button>
        </div>
        <div className="flex flex-col gap-2">
          {dias.map((d) => {
            const fecha = iso(d);
            const turno = turnosSemana.find((t) => t.fecha === fecha);
            return (
              <div key={fecha} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                <div className="w-16 flex-none">
                  <div className="text-[13px] font-semibold capitalize">{fmt(d, 'EEE')}</div>
                  <div className="text-[11px] text-muted">{fmt(d, 'd MMM')}</div>
                </div>
                {turno ? (
                  <div style={colorVars(empleada.color)} className={cx('flex-1 rounded-lg border border-c-line bg-c-tint px-3 py-2 text-[13px] font-medium text-c-fg')}>
                    {rangoTramos(turno.tramos)}
                    <span className="ml-2 text-[11px] opacity-70">{dur(minutos(turno.tramos))}</span>
                  </div>
                ) : (
                  <div className="flex-1 rounded-lg border border-dashed border-border px-3 py-2 text-[13px] text-muted">Descanso</div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted">Solo se muestran semanas publicadas por el encargado.</p>
      </section>

      <section className="px-4 py-4">
        <h2 className="mb-3 text-base font-semibold">Mi pago</h2>
        {nomina ? (
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-border bg-surface p-4">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">Estimación del mes</div>
              {nomina.estimacion.excluida ? (
                <p className="text-sm text-muted">No estás incluida en la nómina.</p>
              ) : (
                <>
                  <div className="text-2xl font-semibold tabular-nums">{eur(nomina.estimacion.importeCent)}</div>
                  <div className="mt-1 text-[13px] text-muted">
                    {dur(nomina.estimacion.minutos)}
                    {nomina.estimacion.recargosCent > 0 ? ` · recargos ${eur(nomina.estimacion.recargosCent)}` : ''}
                  </div>
                  {nomina.estimacion.pendientes.length > 0 && (
                    <p className="mt-2 text-[12px] text-warn-fg">Hay días sin confirmar; el importe puede cambiar.</p>
                  )}
                </>
              )}
            </div>
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted">Histórico pagado</div>
              {nomina.historico.length === 0 && estado.pagos.length === 0 ? (
                <p className="text-[13px] text-muted">Aún no hay periodos pagados.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(nomina.historico.length ? nomina.historico : estado.pagos).map((p) => {
                    const linea = p.lineas[0];
                    return (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold">{p.etiqueta}</div>
                          <div className="text-[11px] text-muted">{p.inicio} → {p.fin}{linea ? ` · ${dur(linea.minutos)}` : ''}</div>
                        </div>
                        <div className="text-[13px] font-semibold tabular-nums">{eur(p.totalCent)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Cargando estimación…</p>
        )}
      </section>
    </div>
  );
}
