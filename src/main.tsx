import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { aplicarTema } from './lib/theme';
import { StoreProvider } from './store';
import App from './App';
import './index.css';

aplicarTema((localStorage.getItem('jornada:tema') as 'claro' | 'oscuro') || 'claro');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <StoreProvider><App /></StoreProvider>
    </BrowserRouter>
  </StrictMode>
);
