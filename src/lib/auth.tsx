import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { api, setAlNoAutorizado, setAuthToken, mensajeError } from './api';
import type { Perfil, Rol } from './types';

const TOKEN_KEY = 'jornada:token';

export type { Perfil, Rol };

export interface Sesion {
  token: string;
  rol: Rol;
  perfil: Perfil;
  /** Instante en que caduca (ISO): la sesión se cierra sola entonces. */
  expiraEn: string;
}

/** Por qué se cerró la sesión sin que la persona pulsara «Salir» (se explica en la pantalla de entrada). */
export type MotivoCierre = 'caducada' | 'invalida' | null;

const AVISO_ANTES_MS = 5 * 60_000;

interface AuthApi {
  sesion: Sesion | null;
  cargando: boolean;
  login: (usuario: string, password: string) => Promise<Sesion>;
  logout: () => void;
  motivoCierre: MotivoCierre;
  actualizarPerfil: (perfil: Partial<Perfil>) => void;
}

const Ctx = createContext<AuthApi | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('AuthProvider ausente');
  return c;
};

function leerToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [motivoCierre, setMotivoCierre] = useState<MotivoCierre>(null);
  const temporizadores = useRef<number[]>([]);

  const aplicar = useCallback((s: Sesion | null) => {
    setSesion(s);
    setAuthToken(s?.token ?? null);
    try {
      if (s) localStorage.setItem(TOKEN_KEY, s.token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const token = leerToken();
    if (!token) {
      setCargando(false);
      return;
    }
    setAuthToken(token);
    api
      .me()
      .then((me) => aplicar({ token, rol: me.rol, perfil: me.perfil, expiraEn: me.expiraEn }))
      .catch(() => aplicar(null))
      .finally(() => setCargando(false));
  }, [aplicar]);

  const login = useCallback(
    async (usuario: string, password: string) => {
      const res = await api.login(usuario, password);
      const s: Sesion = { token: res.token, rol: res.rol, perfil: res.perfil, expiraEn: res.expiraEn };
      setMotivoCierre(null);
      aplicar(s);
      return s;
    },
    [aplicar],
  );

  const logout = useCallback(() => {
    void api.logout().catch(() => undefined);
    setMotivoCierre(null);
    aplicar(null);
  }, [aplicar]);

  /** Cierre forzado (caducidad o token rechazado): sin llamar al servidor y explicando el motivo. */
  const cerrarPor = useCallback((motivo: Exclude<MotivoCierre, null>) => {
    setMotivoCierre(motivo);
    aplicar(null);
  }, [aplicar]);

  useEffect(() => {
    setAlNoAutorizado(codigo => cerrarPor(codigo === 'SESION_CADUCADA' ? 'caducada' : 'invalida'));
    return () => setAlNoAutorizado(null);
  }, [cerrarPor]);

  // Aviso 5 min antes y cierre exacto al caducar. Al volver a la pestaña (el móvil congela los
  // temporizadores en segundo plano) se comprueba de nuevo por si ya caducó.
  useEffect(() => {
    temporizadores.current.forEach(clearTimeout);
    temporizadores.current = [];
    if (!sesion) return;
    const restante = () => Date.parse(sesion.expiraEn) - Date.now();
    const comprobar = () => { if (restante() <= 0) cerrarPor('caducada'); };
    if (restante() <= 0) { cerrarPor('caducada'); return; }
    if (restante() > AVISO_ANTES_MS) {
      temporizadores.current.push(window.setTimeout(() => toast.warning('Tu sesión se cerrará en 5 minutos', { description: 'Guarda lo que estés haciendo; después tendrás que volver a entrar.', duration: 15_000 }), restante() - AVISO_ANTES_MS));
    }
    temporizadores.current.push(window.setTimeout(comprobar, restante() + 250));
    document.addEventListener('visibilitychange', comprobar);
    return () => { temporizadores.current.forEach(clearTimeout); document.removeEventListener('visibilitychange', comprobar); };
  }, [sesion, cerrarPor]);

  const actualizarPerfil = useCallback((perfil: Partial<Perfil>) => {
    setSesion((s) => (s ? { ...s, perfil: { ...s.perfil, ...perfil } } : s));
  }, []);

  const value = useMemo(
    () => ({ sesion, cargando, login, logout, actualizarPerfil, motivoCierre }),
    [sesion, cargando, login, logout, actualizarPerfil, motivoCierre],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { mensajeError };
