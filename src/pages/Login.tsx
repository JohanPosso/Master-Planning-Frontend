import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, mensajeError } from '../lib/auth';
import { Button, inputCls } from '../components/ui';

export default function Login() {
  const { sesion, login } = useAuth();
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (sesion) return <Navigate to={sesion.rol === 'empleada' ? '/portal' : '/'} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const s = await login(usuario.trim().toLowerCase(), password);
      navigate(s.rol === 'empleada' ? '/portal' : '/', { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="grid min-h-full place-items-center bg-sunken px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-fg">J</span>
          <h1 className="text-xl font-semibold tracking-tight">Jornada</h1>
          <p className="text-[13px] text-muted">Encargado o empleada: entra con tu usuario</p>
        </div>
        <label className="mb-3 flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Usuario</span>
          <input autoFocus value={usuario} onChange={(e) => setUsuario(e.target.value)} autoComplete="username" className={inputCls} />
        </label>
        <label className="mb-4 flex flex-col gap-1.5">
          <span className="text-xs font-semibold">Contraseña / PIN</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className={inputCls} />
        </label>
        {error && <p className="mb-3 rounded-lg bg-error-bg px-3 py-2 text-[13px] text-error-fg">{error}</p>}
        <Button type="submit" variant="primary" disabled={enviando || !usuario.trim() || !password} className="w-full">
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
