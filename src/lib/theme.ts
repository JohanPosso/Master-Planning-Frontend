import type { CSSProperties } from 'react';
import type { ColorKey } from './types';

/** [sólido, fondo de chip, texto] — validados WCAG AA (texto ≥ 4,5:1, sólido ≥ 3:1). */
export const PALETA: Record<'claro' | 'oscuro', Record<ColorKey, [string, string, string]>> = {
  claro: { rosa: ['#D6336F', '#FBE3EE', '#9A1F52'], morado: ['#7B52D9', '#ECE4FB', '#5530A8'], turq: ['#0D9490', '#D9F2F0', '#0A5F5C'], naranja: ['#D2650A', '#FCE8D4', '#8F4305'], azul: ['#2F6FD6', '#E2ECFB', '#1D4C9C'], verde: ['#3C8A3A', '#E3F1DF', '#2A6228'], ambar: ['#B8860B', '#F8EDCF', '#7A5800'], rojo: ['#D23B2F', '#FCE4E1', '#9C251C'], indigo: ['#4F57D6', '#E6E7FB', '#353BA6'], gris: ['#7A6C5D', '#EEE8E0', '#4E4338'] },
  oscuro: { rosa: ['#F06AA0', '#3A1A29', '#F9B3CF'], morado: ['#A585F2', '#2A2142', '#CDB9FA'], turq: ['#2CC4BE', '#0F2E2D', '#86E0DA'], naranja: ['#F59342', '#3A2513', '#F8BE87'], azul: ['#6EA2F5', '#16253D', '#B0CDFA'], verde: ['#73C36E', '#172C16', '#B1DFAD'], ambar: ['#E5B53F', '#33290F', '#F2D68E'], rojo: ['#F07368', '#3A1714', '#F8B4AD'], indigo: ['#8E94F5', '#1E2042', '#C3C6FA'], gris: ['#B3A391', '#2A231D', '#DDD2C5'] }
};
export const NOMBRE_COLOR: Record<ColorKey, string> = { rosa: 'Rosa', morado: 'Morado', turq: 'Turquesa', naranja: 'Naranja', azul: 'Azul', verde: 'Verde', ambar: 'Ámbar', rojo: 'Rojo', indigo: 'Índigo', gris: 'Topo' };
export const COLORES = Object.keys(NOMBRE_COLOR) as ColorKey[];

const NEUTROS = {
  claro: { '--bg': '#FAF6F0', '--surface': '#FFFFFF', '--sunken': '#F2ECE3', '--hover': '#F5EFE7', '--border': '#E5DCCF', '--border-strong': '#D3C6B4', '--text': '#2B2119', '--muted': '#6E5F50', '--primary': '#5B3A26', '--primaryFg': '#FFF8EF', '--primary-tint': '#F1E6DA', '--rest-a': '#F2ECE3', '--rest-b': '#EAE2D6', '--warn-bg': '#FFF4D6', '--warn-fg': '#7A4F00', '--warn-line': '#E8C66A', '--error-bg': '#FDE7E4', '--error-fg': '#A3201A', '--error-line': '#F1B2AB', '--error-solid': '#D23B2F', '--ok-bg': '#E3F4E8', '--ok-fg': '#1F6B37', '--ok-solid': '#4FA36A', '--shadow-sm': '0 1px 2px rgba(43,33,25,.08)', '--shadow-md': '0 1px 2px rgba(43,33,25,.06),0 4px 12px rgba(43,33,25,.08)', '--shadow-drag': '0 4px 8px rgba(43,33,25,.08),0 16px 32px rgba(43,33,25,.16)', '--shadow-modal': '0 8px 16px rgba(43,33,25,.10),0 24px 48px rgba(43,33,25,.18)', '--scrim': 'rgba(43,33,25,.32)' },
  oscuro: { '--bg': '#16110D', '--surface': '#1F1813', '--sunken': '#120E0B', '--hover': '#2A211A', '--border': '#33291F', '--border-strong': '#4A3D31', '--text': '#F2EADF', '--muted': '#B3A391', '--primary': '#E9C9A3', '--primaryFg': '#2B1C12', '--primary-tint': '#3A2E24', '--rest-a': '#1A1410', '--rest-b': '#241C16', '--warn-bg': '#33270C', '--warn-fg': '#F5C866', '--warn-line': '#6B5216', '--error-bg': '#3A1613', '--error-fg': '#FF9C92', '--error-line': '#6E2A24', '--error-solid': '#F07368', '--ok-bg': '#13301D', '--ok-fg': '#7FD69B', '--ok-solid': '#4FA36A', '--shadow-sm': 'none', '--shadow-md': '0 0 0 1px rgba(0,0,0,.2)', '--shadow-drag': '0 8px 24px rgba(0,0,0,.5)', '--shadow-modal': '0 16px 48px rgba(0,0,0,.6)', '--scrim': 'rgba(0,0,0,.55)' }
};

export type Tema = 'claro' | 'oscuro';
export function aplicarTema(tema: Tema) {
  const root = document.documentElement;
  Object.entries(NEUTROS[tema]).forEach(([k, v]) => root.style.setProperty(k, v));
  Object.entries(PALETA[tema]).forEach(([k, [s, t, f]]) => {
    root.style.setProperty(`--${k}-solid`, s);
    root.style.setProperty(`--${k}-tint`, t);
    root.style.setProperty(`--${k}-fg`, f);
    root.style.setProperty(`--${k}-line`, s + (tema === 'claro' ? '55' : '66'));
  });
  root.classList.toggle('dark', tema === 'oscuro');
  root.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
}

/** Variables --c-* del color de una empleada; los hijos usan bg-c-tint, text-c-fg, etc. */
export const colorVars = (c: ColorKey): CSSProperties => ({
  '--c-solid': `var(--${c}-solid)`, '--c-tint': `var(--${c}-tint)`, '--c-fg': `var(--${c}-fg)`, '--c-line': `var(--${c}-line)`
} as CSSProperties);
