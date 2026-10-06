import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MobileNav, Sidebar } from './components/Sidebar';
import { useAuth } from './lib/auth';
import { useStore } from './store';
import Inicio from './pages/Inicio';
import Horario from './pages/Horario';
import Registro from './pages/Registro';
import Nomina from './pages/Nomina';
import Equipo from './pages/Equipo';
import Ajustes from './pages/Ajustes';
import Login from './pages/Login';
import Portal from './pages/Portal';
import { StoreProvider } from './store';

function AdminShell() {
  const { tema } = useStore();
  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-auto pb-20 md:pb-0">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/horario" element={<Horario />} />
          <Route path="/horas" element={<Registro />} />
          <Route path="/nomina" element={<Nomina />} />
          <Route path="/equipo" element={<Equipo />} />
          <Route path="/ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <MobileNav />
      <Toaster position="bottom-center" theme={tema === 'oscuro' ? 'dark' : 'light'} toastOptions={{ style: { background: 'var(--text)', color: 'var(--bg)', border: '0', fontFamily: 'Geist, sans-serif' } }} />
    </div>
  );
}

export default function App() {
  const { sesion, cargando } = useAuth();

  if (cargando) {
    return <div className="grid h-full place-items-center text-sm text-muted">Cargando…</div>;
  }

  if (!sesion) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  if (sesion.rol === 'empleada') {
    return (
      <Routes>
        <Route path="/portal" element={<Portal />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Routes>
    );
  }

  return (
    <StoreProvider>
      <AdminShell />
    </StoreProvider>
  );
}
