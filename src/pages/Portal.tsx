import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { LogOut, Moon, Sun } from 'lucide-react';
import { useAuth, mensajeError } from '../lib/auth';
import { api, type PortalEstado, type PortalNomina } from '../lib/api';
import { colorVars } from '../lib/theme';
import { capital, diaIdx, diasSemana, dur, eur, fmt, iso, lunesDe, minutos, rangoSemana, rangoTramos } from '../lib/time';
import { aplicarTema, type Tema } from '../lib/theme';
import { ChipBody } from '../components/ShiftChip';
import { WeekSelector } from '../components/WeekSelector';
import { Badge, Button, PageHeader, Segmented, cx } from '../components/ui';

export default function Portal() {
  const { logout } = useAuth();
  const [tema, setTema] = useState<Tema>((localStorage.getItem('jornada:tema') as Tema) || 'claro');
  const [estado, setEstado] = useState<PortalEstado | null>(null);
  const [nomina, setNomina] = useState<PortalNomina | null>(null);
  const [cargandoNomina, setCargandoNomina] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lunes, setLunes] = useState(() => lunesDe(new Date()));
  const [dir, setDir] = useState(0);
  const [vista, setVista] = useState<'semana' | 'dia'>('semana');
  const [dia, setDia] = useState(() => diaIdx(new Date()));

  useEffect(() => {
    aplicarTema(tema);
    localStorage.setItem('jornada:tema', tema);
  }, [tema]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const e = await api.portalEstado();
        if (vivo) setEstado(e);
      } catch (err) {
        if (vivo) setError(mensajeError(err));
      }
    })();
    return () => { vivo = false; };
  }, []);

  const dias = useMemo(() => diasSemana(lunes), [lunes]);
  const fechas = useMemo(() => dias.map(iso), [dias]);
  const hoy = iso(new Date());

  const periodoPago = useMemo(() => {
    if (vista === 'dia') {
      const f = fechas[dia];
      return { inicio: f, fin: f, etiqueta: capital(fmt(dias[dia], 'EEEE d MMM')) };
    }
    return {
      inicio: fechas[0],
      fin: fechas[6],
      etiqueta: rangoSemana(lunes),
    };
  }, [vista, fechas, dia, dias, lunes]);

  useEffect(() => {
    if (!estado) return;
    let vivo = true;
    setCargandoNomina(true);
    api
      .portalNomina(periodoPago.inicio, periodoPago.fin)
      .then((n) => { if (vivo) setNomina(n); })
      .catch((err) => { if (vivo) setError(mensajeError(err)); })
      .finally(() => { if (vivo) setCargandoNomina(false); });
    return () => { vivo = false; };
  }, [estado, periodoPago.inicio, periodoPago.fin]);

  const emps = estado?.empleadas ?? [];
  const publicada = estado?.semanas.some((s) => s.lunes === iso(lunes)) ?? false;

  const turnoDe = (empId: string, f: string) => estado?.turnos.find((t) => t.empleadaId === empId && t.fecha === f);
  const minDia = (f: string) => minutos(emps.flatMap((e) => turnoDe(e.id, f)?.tramos ?? []));
  const total = fechas.reduce((a, f) => a + minDia(f), 0);
  const misMinutos = estado
    ? fechas.reduce((a, f) => a + minutos(turnoDe(estado.empleada.id, f)?.tramos), 0)
    : 0;

  const irA = (d: Date, dd: number) => { setDir(dd); setLunes(d); };

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
    return <div className="grid min-h-full place-items-center text-sm text-muted">Cargando horario…</div>;
  }

  const { empleada } = estado;

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-none items-center gap-3 border-b border-border px-4 py-3 md:px-6">
        <span style={colorVars(empleada.color)} className="grid h-9 w-9 place-items-center rounded-full border-[1.5px] border-c-solid bg-c-tint text-sm font-semibold text-c-fg">
          {empleada.nombre[0]?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{empleada.nombre}</div>
          <div className="text-[11px] text-muted">Horario del equipo · solo lectura</div>
        </div>
        <button onClick={() => setTema(tema === 'claro' ? 'oscuro' : 'claro')} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-hover" aria-label="Tema">
          {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        <Button onClick={logout}><LogOut size={15} />Salir</Button>
      </header>

      <PageHeader
        title="Horario"
        badge={<Badge tone={publicada ? 'ok' : 'neutral'}>{publicada ? 'Publicado' : 'Sin publicar'}</Badge>}
      >
        {vista === 'semana' ? (
          <WeekSelector lunes={lunes} onChange={irA} />
        ) : (
          <WeekSelector
            lunes={lunes}
            onChange={(d, dd) => {
              if (dd === 0) { irA(d, 0); setDia(diaIdx(new Date())); }
              else {
                const n = dia + dd;
                if (n < 0) { irA(d, -1); setDia(6); }
                else if (n > 6) { irA(d, 1); setDia(0); }
                else setDia(n);
              }
            }}
            label={capital(fmt(dias[dia], 'EEEE, d MMM yyyy'))}
          />
        )}
        <Segmented className="hidden md:flex" value={vista} onChange={setVista} options={[{ value: 'semana', label: 'Semana' }, { value: 'dia', label: 'Día' }]} />
      </PageHeader>

      {!publicada && (
        <div className="border-b border-border bg-sunken px-4 py-2 text-[13px] text-muted md:px-6">
          Esta semana aún no está publicada. Solo verás semanas que el encargado haya publicado.
        </div>
      )}

      {/* Móvil */}
      <div className="flex flex-col gap-3 p-4 md:hidden">
        <div className="flex gap-1">
          {dias.map((d, i) => (
            <button key={i} onClick={() => setDia(i)} className={cx('flex h-[62px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border', i === dia ? 'border-text bg-text text-bg' : 'border-border bg-surface')}>
              <span className="text-[11px] opacity-75">{['L', 'M', 'X', 'J', 'V', 'S', 'D'][i]}</span>
              <span className="num text-base font-semibold">{fmt(d, 'd')}</span>
            </button>
          ))}
        </div>
        <div className="flex items-baseline justify-between num">
          <span className="font-semibold">{capital(fmt(dias[dia], 'EEEE d'))}</span>
          <span className="text-[13px] text-muted">{dur(minDia(fechas[dia]))}</span>
        </div>
        {emps.map((e) => {
          const t = turnoDe(e.id, fechas[dia]);
          const soyYo = e.id === empleada.id;
          return (
            <div key={e.id} style={colorVars(e.color)}
              className={cx('flex min-h-16 items-center gap-3 rounded-xl border px-3.5 py-3', t ? 'border-c-line bg-c-tint text-c-fg' : 'rest-stripes border-transparent', soyYo && 'ring-2 ring-text/20')}>
              <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-surface text-[13px] font-bold text-c-fg">{e.nombre[0]}</span>
              <div className="flex flex-1 flex-col">
                <span className="text-[15px] font-semibold">{e.nombre}{soyYo ? ' (tú)' : ''}</span>
                <span className={cx('num text-sm', !t && 'text-xs font-semibold tracking-[.1em] text-muted')}>{t ? rangoTramos(t.tramos) : 'DESCANSO'}</span>
              </div>
              {t && <span className="num text-[13px] font-semibold">{dur(minutos(t.tramos))}</span>}
            </div>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden min-h-0 flex-1 flex-col overflow-auto p-5 pl-6 md:flex">
        <div className="mb-3.5 flex flex-wrap items-baseline gap-5 num">
          <div className="flex items-baseline gap-1.5"><span className="text-[22px] font-semibold tracking-tight">{dur(total)}</span><span className="text-[13px] text-muted">planificadas</span></div>
          <div className="flex items-baseline gap-1.5"><span className="text-[15px] font-semibold">{dur(misMinutos)}</span><span className="text-[13px] text-muted">tuyas esta semana</span></div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={iso(lunes) + vista + (vista === 'dia' ? dia : '')} initial={{ opacity: 0, x: dir * 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -24 }} transition={{ duration: .18 }}>
            {vista === 'dia' ? (
              <div className="flex flex-col gap-2.5">
                {emps.map((e) => {
                  const t = turnoDe(e.id, fechas[dia]);
                  const soyYo = e.id === empleada.id;
                  return (
                    <div key={e.id} style={colorVars(e.color)}
                      className={cx('flex min-h-[72px] items-stretch gap-3 rounded-xl border px-3 py-2', t ? 'border-c-line bg-c-tint' : 'border-border bg-surface', soyYo && 'ring-2 ring-text/15')}>
                      <div className="flex w-36 flex-none flex-col justify-center">
                        <span className="text-sm font-semibold text-c-fg">{e.nombre}{soyYo ? ' (tú)' : ''}</span>
                        <span className="text-xs text-muted">{e.rol}</span>
                      </div>
                      {t ? (
                        <div className="flex min-h-[64px] flex-1"><ChipBody tramos={t.tramos} /></div>
                      ) : (
                        <div className="rest-stripes flex flex-1 items-center justify-center rounded-md text-[11px] font-semibold tracking-[.1em] text-muted">DESCANSO</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid min-w-[860px] overflow-hidden rounded-xl border border-border bg-surface" style={{ gridTemplateColumns: '150px repeat(7,minmax(0,1fr)) 78px' }}>
                <div className="flex items-end border-b border-r border-border px-3 py-2.5 text-[11px] font-medium uppercase tracking-[.06em] text-muted">Equipo</div>
                {dias.map((d, i) => (
                  <button key={i} onClick={() => { setDia(i); setVista('dia'); }} className={cx('flex flex-col items-center gap-0.5 border-b border-r border-border px-2 py-2.5 hover:bg-hover', fechas[i] === hoy && 'bg-primary-tint')}>
                    <span className="text-[11px] font-medium uppercase tracking-[.06em] text-muted">{fmt(d, 'EEE')}</span>
                    <span className="num text-[17px] font-semibold">{fmt(d, 'd')}</span>
                  </button>
                ))}
                <div className="flex items-end justify-end border-b border-border px-2.5 py-2.5 text-[11px] font-medium uppercase tracking-[.06em] text-muted">Total</div>
                {emps.map((e) => {
                  const tot = fechas.reduce((a, f) => a + minutos(turnoDe(e.id, f)?.tramos), 0);
                  const n = fechas.filter((f) => turnoDe(e.id, f)).length;
                  const soyYo = e.id === empleada.id;
                  return (
                    <div key={e.id} className="contents" style={colorVars(e.color)}>
                      <div className={cx('flex flex-col justify-center gap-1 border-b border-r border-border px-3 py-2.5', soyYo && 'bg-c-tint/40')}>
                        <div className="flex items-center gap-2">
                          <span className="h-[9px] w-[9px] flex-none rounded-full bg-c-solid" />
                          <span className="text-sm font-semibold">{e.nombre}{soyYo ? ' (tú)' : ''}</span>
                        </div>
                        <span className="pl-[17px] text-xs text-muted">{e.rol}</span>
                      </div>
                      {fechas.map((f) => {
                        const t = turnoDe(e.id, f);
                        return (
                          <div key={f} className={cx('relative flex min-h-24 flex-col gap-[3px] border-b border-r border-border p-[5px]', f === hoy && 'bg-primary-tint/40')}>
                            {t ? (
                              <div className="flex flex-1"><ChipBody tramos={t.tramos} /></div>
                            ) : (
                              <div className="rest-stripes flex flex-1 items-center justify-center rounded-md">
                                <span className="text-[10px] font-semibold tracking-[.1em] text-muted">DESCANSO</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div className="num flex flex-col items-end justify-center gap-0.5 border-b border-border p-2.5">
                        <span className="text-[15px] font-semibold">{dur(tot)}</span>
                        <span className="text-[11px] text-muted">{n} días</span>
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center border-r border-border bg-sunken px-3 py-2.5 text-xs font-semibold text-muted">Total día</div>
                {fechas.map((f) => (
                  <div key={f} className="num flex flex-col items-center gap-0.5 border-r border-border bg-sunken px-2 py-2.5">
                    <span className="text-[13px] font-semibold">{dur(minDia(f))}</span>
                  </div>
                ))}
                <div className="num flex items-center justify-end bg-sunken p-2.5 text-[13px] font-semibold">{dur(total)}</div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <section className="border-t border-border px-4 py-4 md:px-6">
        <h2 className="mb-3 text-base font-semibold">Mi pago</h2>
        {cargandoNomina && !nomina ? (
          <p className="text-sm text-muted">Cargando estimación…</p>
        ) : nomina ? (
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            <div className={cx('rounded-xl border border-border bg-surface p-4', cargandoNomina && 'opacity-60')}>
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                Estimación · {periodoPago.etiqueta}
              </div>
              {nomina.estimacion.excluida ? (
                <p className="text-sm text-muted">No estás incluida en la nómina.</p>
              ) : nomina.estimacion.minutos === 0 ? (
                <p className="text-sm text-muted">Sin horas en este periodo del calendario.</p>
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
              {estado.pagos.length === 0 ? (
                <p className="text-[13px] text-muted">Aún no hay periodos pagados.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {estado.pagos.map((p) => {
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
