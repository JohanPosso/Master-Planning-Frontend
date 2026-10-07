import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CalendarDays, Clock, Euro, Home, LogOut, Moon, MoreHorizontal, SlidersHorizontal, Sun, Users } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useStore } from '../store';
import { cx } from './ui';

const NAV = [
  { to: '/', label: 'Inicio', corto: 'Inicio', icon: Home },
  { to: '/horario', label: 'Horario', corto: 'Horario', icon: CalendarDays },
  { to: '/horas', label: 'Registro de horas', corto: 'Horas', icon: Clock },
  { to: '/nomina', label: 'Nómina', corto: 'Nómina', icon: Euro },
  { to: '/equipo', label: 'Equipo', corto: 'Equipo', icon: Users },
  { to: '/ajustes', label: 'Ajustes', corto: 'Ajustes', icon: SlidersHorizontal }
];

export function Sidebar() {
  const { tema, setTema } = useStore();
  const { sesion, logout } = useAuth();
  return (
    <aside className="hidden w-56 flex-none flex-col gap-0.5 border-r border-border bg-sunken px-3 py-4 md:flex">
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-1">
        <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-primary text-sm font-bold text-primary-fg">J</span>
        <div className="flex flex-col"><span className="text-sm font-semibold">Jornada</span><span className="text-xs text-muted">Cafetería</span></div>
      </div>
      {NAV.map(n => (
        <NavLink key={n.to} to={n.to} end={n.to === '/'}
          className={({ isActive }) => cx('flex h-9 items-center gap-2.5 rounded-lg border px-2.5 text-sm no-underline transition-colors',
            isActive ? 'border-border bg-surface font-semibold text-text shadow-sm' : 'border-transparent font-medium text-muted hover:text-text')}>
          <n.icon size={17} strokeWidth={1.9} />{n.label}
        </NavLink>
      ))}
      <div className="mt-auto flex flex-col gap-2 border-t border-border px-2 pt-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-tint text-[11px] font-semibold">EN</span>
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px] font-semibold">{sesion?.perfil.nombre ?? 'Encargado'}</span>
            <span className="text-[11px] text-muted">Administrador</span>
          </div>
          <button onClick={() => setTema(tema === 'claro' ? 'oscuro' : 'claro')} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-hover" aria-label="Cambiar tema">
            {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
        <button onClick={logout} className="flex h-8 items-center gap-2 rounded-lg px-2 text-[13px] font-medium text-muted hover:bg-hover hover:text-text">
          <LogOut size={15} />Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

/** Lo que no cabe en la barra inferior del móvil: va dentro de «Más». */
const NAV_MAS = NAV.slice(4);

export function MobileNav() {
  const { tema, setTema } = useStore();
  const { logout } = useAuth();
  const { pathname } = useLocation();
  const [abierto, setAbierto] = useState(false);
  // Ignora los toques justo al abrir: un doble toque o el «toque fantasma» del móvil caería sobre el panel.
  const abiertoEn = useRef(0);
  const reciénAbierto = () => Date.now() - abiertoEn.current < 400;
  const enMas = NAV_MAS.some(n => pathname.startsWith(n.to));

  useEffect(() => { setAbierto(false); }, [pathname]);
  useEffect(() => {
    if (!abierto) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setAbierto(false); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [abierto]);

  const item = 'flex min-h-11 flex-1 flex-col items-center gap-0.5 text-[10px] no-underline';
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface px-1.5 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 md:hidden">
        {NAV.slice(0, 4).map(n => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => cx(item, isActive ? 'font-semibold text-text' : 'font-medium text-muted')}>
            <n.icon size={22} strokeWidth={1.9} />{n.corto}
          </NavLink>
        ))}
        <button onClick={() => { if (!abierto) abiertoEn.current = Date.now(); setAbierto(v => !v); }} aria-expanded={abierto} aria-haspopup="dialog" className={cx(item, enMas || abierto ? 'font-semibold text-text' : 'font-medium text-muted')}>
          <MoreHorizontal size={22} strokeWidth={1.9} />Más
        </button>
      </nav>

      <AnimatePresence>
        {abierto && (
          <motion.div className="fixed inset-0 z-50 md:hidden" style={{ background: 'var(--scrim)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { if (!reciénAbierto()) setAbierto(false); }}
            onClickCapture={e => { if (reciénAbierto()) { e.preventDefault(); e.stopPropagation(); } }}>
            <motion.div role="dialog" aria-label="Más opciones" onClick={e => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface px-3 pb-[max(env(safe-area-inset-bottom),12px)] pt-2 shadow-modal"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 500, damping: 40 }}>
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border-strong" />
              <button onClick={logout} className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-error-fg hover:bg-error-bg">
                <LogOut size={20} />Cerrar sesión
              </button>
              <button onClick={() => setTema(tema === 'claro' ? 'oscuro' : 'claro')} className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-[15px] font-medium hover:bg-hover">
                {tema === 'claro' ? <Moon size={20} /> : <Sun size={20} />}{tema === 'claro' ? 'Tema oscuro' : 'Tema claro'}
              </button>
              <div className="my-2 border-t border-border" />
              {NAV_MAS.map(n => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => cx('flex h-12 items-center gap-3 rounded-xl px-3 text-[15px] no-underline', isActive ? 'bg-sunken font-semibold' : 'font-medium hover:bg-hover')}>
                  <n.icon size={20} strokeWidth={1.9} />{n.label}
                </NavLink>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
