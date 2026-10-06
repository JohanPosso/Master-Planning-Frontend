import { NavLink } from 'react-router-dom';
import { CalendarDays, Clock, Euro, Home, Moon, MoreHorizontal, SlidersHorizontal, Sun, Users } from 'lucide-react';
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
      <div className="mt-auto flex items-center gap-2.5 border-t border-border px-2 pt-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-tint text-[11px] font-semibold">EN</span>
        <div className="flex min-w-0 flex-1 flex-col"><span className="text-[13px] font-semibold">Encargado</span><span className="text-[11px] text-muted">Administrador</span></div>
        <button onClick={() => setTema(tema === 'claro' ? 'oscuro' : 'claro')} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-hover" aria-label="Cambiar tema">
          {tema === 'claro' ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const items = [...NAV.slice(0, 4), { to: '/equipo', label: 'Más', corto: 'Más', icon: MoreHorizontal }];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface px-1.5 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 md:hidden">
      {items.map(n => (
        <NavLink key={n.corto} to={n.to} end={n.to === '/'}
          className={({ isActive }) => cx('flex min-h-11 flex-1 flex-col items-center gap-0.5 text-[10px] no-underline', isActive ? 'font-semibold text-text' : 'font-medium text-muted')}>
          <n.icon size={22} strokeWidth={1.9} />{n.corto}
        </NavLink>
      ))}
    </nav>
  );
}
