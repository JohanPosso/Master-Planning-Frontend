import { Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { MobileNav, Sidebar } from './components/Sidebar';
import { useStore } from './store';
import Inicio from './pages/Inicio';
import Horario from './pages/Horario';
import Registro from './pages/Registro';
import Nomina from './pages/Nomina';
import Equipo from './pages/Equipo';
import Ajustes from './pages/Ajustes';

export default function App() {
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
        </Routes>
      </main>
      <MobileNav />
      <Toaster position="bottom-center" theme={tema === 'oscuro' ? 'dark' : 'light'} toastOptions={{ style: { background: 'var(--text)', color: 'var(--bg)', border: '0', fontFamily: 'Geist, sans-serif' } }} />
    </div>
  );
}
