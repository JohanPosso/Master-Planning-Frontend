import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, setAlNoAutorizado, setAuthToken } from './api';

const responder = (status: number, error?: { code: string; message: string }) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(error ? { error } : {}), { status })));

describe('sesión rechazada por el servidor', () => {
  afterEach(() => { vi.unstubAllGlobals(); setAuthToken(null); setAlNoAutorizado(null); });

  it('un 401 con sesión abierta avisa para cerrarla, con el código', async () => {
    const aviso = vi.fn();
    setAlNoAutorizado(aviso);
    setAuthToken('token');
    responder(401, { code: 'SESION_CADUCADA', message: 'Tu sesión ha caducado' });
    await expect(api.estado()).rejects.toThrow('Tu sesión ha caducado');
    expect(aviso).toHaveBeenCalledWith('SESION_CADUCADA');
  });

  it('una contraseña incorrecta en el login no cuenta como sesión caducada', async () => {
    const aviso = vi.fn();
    setAlNoAutorizado(aviso);
    setAuthToken('token-anterior');
    responder(401, { code: 'UNAUTHORIZED', message: 'Usuario o contraseña incorrectos' });
    await expect(api.login('ana', 'mala')).rejects.toThrow('incorrectos');
    expect(aviso).not.toHaveBeenCalled();
  });

  it('otros errores (403, 409…) no cierran la sesión', async () => {
    const aviso = vi.fn();
    setAlNoAutorizado(aviso);
    setAuthToken('token');
    responder(409, { code: 'CONFLICT', message: 'Ya fichaste' });
    await expect(api.estado()).rejects.toThrow();
    expect(aviso).not.toHaveBeenCalled();
  });
});
