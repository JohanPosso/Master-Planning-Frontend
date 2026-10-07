import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Loader2, LogIn, LogOut, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { api, mensajeError, type ResumenFichaje, type Ubicacion } from '../lib/api';
import { minutoEn, minutosEnVivo } from '../lib/fichaje';
import { capital, desdeIso, dur, fmt, hhmm, rangoTramos } from '../lib/time';
import { Badge, Card, cx } from './ui';

const REFRESCO_MS = 60_000;

/** Pide la ubicación al navegador con mensajes que la empleada entienda. */
function pedirUbicacion(): Promise<Ubicacion> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('Este dispositivo no permite obtener la ubicación.'));
    navigator.geolocation.getCurrentPosition(
      p => resolve({ latitud: p.coords.latitude, longitud: p.coords.longitude, precisionM: Math.round(p.coords.accuracy) }),
      e => reject(new Error(e.code === e.PERMISSION_DENIED
        ? 'Permite el acceso a la ubicación en el navegador: solo se puede fichar desde la cafetería.'
        : 'No se pudo obtener tu ubicación. Inténtalo de nuevo junto a una ventana o con el GPS activado.')),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 }
    );
  });
}

/** Reloj sincronizado con el servidor: muestra la hora que quedará registrada al fichar. */
function useRelojServidor(resumen: ResumenFichaje | null) {
  const desfase = useRef(0);
  const [ahora, setAhora] = useState(() => new Date());
  useEffect(() => { if (resumen) desfase.current = Date.parse(resumen.ahora) - Date.now(); }, [resumen]);
  useEffect(() => { const t = setInterval(() => setAhora(new Date(Date.now() + desfase.current)), 1000); return () => clearInterval(t); }, []);
  return ahora;
}

export function Fichador() {
  const [resumen, setResumen] = useState<ResumenFichaje | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  // Guardia síncrona: el estado de React no cambia entre dos toques del mismo instante (doble toque en el móvil).
  const enCurso = useRef(false);
  const [verHistorial, setVerHistorial] = useState(false);
  const ahora = useRelojServidor(resumen);

  const cargar = useCallback(async () => {
    try { setResumen(await api.portalFichaje()); setError(null); }
    catch (e) { setError(mensajeError(e)); }
  }, []);

  useEffect(() => {
    void cargar();
    const t = setInterval(() => { if (document.visibilityState === 'visible') void cargar(); }, REFRESCO_MS);
    const alVolver = () => { if (document.visibilityState === 'visible') void cargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', alVolver); };
  }, [cargar]);

  const fichar = async () => {
    if (!resumen || enCurso.current) return;
    enCurso.current = true;
    setEnviando(true);
    try {
      const ubicacion = resumen.geocerca.activa ? await pedirUbicacion() : undefined;
      const { fichaje } = await api.fichar(resumen.toca, ubicacion);
      toast.success(`${fichaje.tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada a las ${hhmm(fichaje.minuto)}`);
      if (navigator.vibrate) navigator.vibrate(30);
    } catch (e) {
      toast.error(mensajeError(e));
    } finally {
      // También tras un 409 (se fichó desde otro dispositivo): así el botón muestra lo que toca de verdad.
      await cargar();
      enCurso.current = false;
      setEnviando(false);
    }
  };

  if (!resumen) {
    return (
      <section className="border-b border-border px-4 py-5 md:px-6">
        <Card className="mx-auto max-w-3xl p-5 text-sm text-muted">{error ?? 'Cargando fichaje…'}</Card>
      </section>
    );
  }

  const zona = resumen.zonaHoraria;
  const minutoAhora = minutoEn(zona, ahora);
  const dentro = resumen.dentroDesde !== null;
  const trabajadoHoy = minutosEnVivo(resumen.minutosHoy, resumen.dentroDesde, minutoAhora);
  const { minutosFichados, minutosPlanificados } = resumen.semana;
  const fichadoSemana = minutosFichados + (dentro ? Math.max(minutoAhora - resumen.dentroDesde!, 0) : 0);
  const progreso = minutosPlanificados ? Math.min(fichadoSemana / minutosPlanificados, 1) : 0;
  const hora = new Intl.DateTimeFormat('es-ES', { timeZone: zona, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ahora);
  const segundos = new Intl.DateTimeFormat('es-ES', { timeZone: zona, second: '2-digit' }).format(ahora).padStart(2, '0');
  const esEntrada = resumen.toca === 'entrada';

  return (
    <section className="border-b border-border px-4 py-5 md:px-6" aria-label="Fichaje">
      <div className="mx-auto grid max-w-3xl gap-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-muted">{capital(fmt(desdeIso(resumen.hoy), "EEEE, d 'de' MMMM"))}</span>
            {dentro
              ? <Badge tone="ok"><span className="mr-1.5 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-ok-solid" />Trabajando</Badge>
              : <Badge>Fuera</Badge>}
          </div>

          <div className="flex items-end gap-1 num" aria-live="off">
            <span className="text-[52px] font-semibold leading-none tracking-tight">{hora}</span>
            <span className="mb-1.5 text-lg font-medium text-muted">:{segundos}</span>
          </div>

          <div className="flex flex-col gap-1 text-[13px]">
            <span className="text-muted">
              {resumen.turnoHoy ? <>Tu turno hoy: <span className="num font-semibold text-text">{rangoTramos(resumen.turnoHoy.tramos)}</span></> : 'Hoy no tienes turno planificado'}
            </span>
            {dentro && (
              <span className="num">Desde las <b>{hhmm(resumen.dentroDesde!)}</b> · {dur(Math.max(minutoAhora - resumen.dentroDesde!, 0))} en este tramo</span>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => void fichar()}
            disabled={enviando}
            className={cx('flex h-14 w-full items-center justify-center gap-2.5 rounded-xl text-base font-semibold transition-opacity disabled:opacity-60',
              esEntrada ? 'bg-primary text-primary-fg hover:opacity-90' : 'bg-text text-bg hover:opacity-90')}>
            {enviando ? <Loader2 size={20} className="animate-spin" /> : esEntrada ? <LogIn size={20} /> : <LogOut size={20} />}
            {enviando ? (resumen.geocerca.activa ? 'Comprobando ubicación…' : 'Fichando…') : esEntrada ? 'Fichar entrada' : 'Fichar salida'}
          </motion.button>

          {resumen.geocerca.activa && (
            <span className="flex items-center gap-1.5 text-[12px] text-muted"><MapPin size={13} />Solo se puede fichar en la cafetería (radio {resumen.geocerca.radioM} m)</span>
          )}
        </Card>

        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold">Hoy</span>
            <span className="num text-[13px] font-semibold">{dur(trabajadoHoy)}</span>
          </div>
          {resumen.fichajesHoy.length === 0 ? (
            <p className="text-[13px] text-muted">Aún no has fichado hoy.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              <AnimatePresence initial={false}>
                {resumen.fichajesHoy.map(f => (
                  <motion.li key={f.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2.5 text-[13px]">
                    <span className={cx('grid h-6 w-6 place-items-center rounded-full', f.tipo === 'entrada' ? 'bg-ok-bg text-ok-fg' : 'bg-sunken text-muted')}>
                      {f.tipo === 'entrada' ? <LogIn size={13} /> : <LogOut size={13} />}
                    </span>
                    <span className="flex-1">{f.tipo === 'entrada' ? 'Entrada' : 'Salida'}</span>
                    <span className="num font-semibold">{hhmm(f.minuto)}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ol>
          )}

          <div className="mt-auto flex flex-col gap-1.5 border-t border-border pt-3.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-muted">Esta semana</span>
              <span className="num"><b>{dur(fichadoSemana)}</b>{minutosPlanificados > 0 && <span className="text-muted"> de {dur(minutosPlanificados)}</span>}</span>
            </div>
            {minutosPlanificados > 0 && (
              <div className="h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={Math.round(progreso * 100)} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${progreso * 100}%` }} />
              </div>
            )}
          </div>
        </Card>

        <div className="md:col-span-2">
          <button onClick={() => setVerHistorial(v => !v)} className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-text" aria-expanded={verHistorial}>
            <ChevronDown size={15} className={cx('transition-transform', verHistorial && 'rotate-180')} />Mis fichajes (últimos 14 días)
          </button>
          <AnimatePresence initial={false}>
            {verHistorial && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <Card className="mt-2 divide-y divide-border">
                  {resumen.historial.length === 0 && <p className="px-4 py-3 text-[13px] text-muted">Sin fichajes todavía.</p>}
                  {resumen.historial.map(d => (
                    <div key={d.fecha} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-[13px]">
                      <span className="w-28 font-medium">{capital(fmt(desdeIso(d.fecha), 'EEE d MMM'))}</span>
                      <span className="num flex-1 text-muted">{d.fichajes.map(f => `${f.tipo === 'entrada' ? '↘' : '↗'} ${hhmm(f.minuto)}`).join('   ')}</span>
                      {d.incompleto && <Badge tone="warn">Falta salida</Badge>}
                      <span className="num w-14 text-right font-semibold">{dur(d.minutos)}</span>
                    </div>
                  ))}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

