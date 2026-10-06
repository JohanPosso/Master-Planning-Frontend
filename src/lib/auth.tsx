import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAuthToken, mensajeError } from './api';
import type { Perfil, Rol } from './types';

const TOKEN_KEY = 'jornada:token';

export type { Perfil, Rol };

export interface Sesion {
  token: string;
  rol: Rol;
  perfil: Perfil;
}

interface AuthApi {
  sesion: Sesion | null;
  cargando: boolean;
  login: (usuario: string, password: string) => Promise<Sesion>;
  logout: () => void;
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
      .then((me) => aplicar({ token, rol: me.rol, perfil: me.perfil }))
      .catch(() => aplicar(null))
      .finally(() => setCargando(false));
  }, [aplicar]);

  const login = useCallback(
    async (usuario: string, password: string) => {
      const res = await api.login(usuario, password);
      const s: Sesion = { token: res.token, rol: res.rol, perfil: res.perfil };
      aplicar(s);
      return s;
    },
    [aplicar],
  );

  const logout = useCallback(() => {
    void api.logout().catch(() => undefined);
    aplicar(null);
  }, [aplicar]);

  const value = useMemo(() => ({ sesion, cargando, login, logout }), [sesion, cargando, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export { mensajeError };
