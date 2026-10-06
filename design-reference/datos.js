export const PAL = {
  light: { rosa: ['#D6336F', '#FBE3EE', '#9A1F52'], morado: ['#7B52D9', '#ECE4FB', '#5530A8'], turq: ['#0D9490', '#D9F2F0', '#0A5F5C'], naranja: ['#D2650A', '#FCE8D4', '#8F4305'], azul: ['#2F6FD6', '#E2ECFB', '#1D4C9C'], verde: ['#3C8A3A', '#E3F1DF', '#2A6228'], ambar: ['#B8860B', '#F8EDCF', '#7A5800'], rojo: ['#D23B2F', '#FCE4E1', '#9C251C'], indigo: ['#4F57D6', '#E6E7FB', '#353BA6'], gris: ['#7A6C5D', '#EEE8E0', '#4E4338'] },
  dark: { rosa: ['#F06AA0', '#3A1A29', '#F9B3CF'], morado: ['#A585F2', '#2A2142', '#CDB9FA'], turq: ['#2CC4BE', '#0F2E2D', '#86E0DA'], naranja: ['#F59342', '#3A2513', '#F8BE87'], azul: ['#6EA2F5', '#16253D', '#B0CDFA'], verde: ['#73C36E', '#172C16', '#B1DFAD'], ambar: ['#E5B53F', '#33290F', '#F2D68E'], rojo: ['#F07368', '#3A1714', '#F8B4AD'], indigo: ['#8E94F5', '#1E2042', '#C3C6FA'], gris: ['#B3A391', '#2A231D', '#DDD2C5'] }
};
export const COLOR_NAMES = { rosa: 'Rosa', morado: 'Morado', turq: 'Turquesa', naranja: 'Naranja', azul: 'Azul', verde: 'Verde', ambar: 'Ámbar', rojo: 'Rojo', indigo: 'Índigo', gris: 'Topo' };

export function themeVars(mode) {
  const L = mode !== 'oscuro';
  const v = L
    ? { '--bg': '#FAF6F0', '--surface': '#FFFFFF', '--sunken': '#F2ECE3', '--hover': '#F5EFE7', '--border': '#E5DCCF', '--border-strong': '#D3C6B4', '--text': '#2B2119', '--muted': '#6E5F50', '--primary': '#5B3A26', '--primaryFg': '#FFF8EF', '--primary-tint': '#F1E6DA', '--rest-a': '#F2ECE3', '--rest-b': '#EAE2D6', '--warn-bg': '#FFF4D6', '--warn-fg': '#7A4F00', '--warn-line': '#E8C66A', '--error-bg': '#FDE7E4', '--error-fg': '#A3201A', '--error-line': '#F1B2AB', '--error-solid': '#D23B2F', '--ok-bg': '#E3F4E8', '--ok-fg': '#1F6B37', '--ok-solid': '#4FA36A', '--toast-bg': '#2B2119', '--toast-fg': '#F2EADF', '--toast-btn': '#4A3D31', '--shadow-sm': '0 1px 2px rgba(43,33,25,.08)', '--shadow-md': '0 1px 2px rgba(43,33,25,.06),0 4px 12px rgba(43,33,25,.08)', '--shadow-drag': '0 4px 8px rgba(43,33,25,.08),0 16px 32px rgba(43,33,25,.16)', '--shadow-modal': '0 8px 16px rgba(43,33,25,.10),0 24px 48px rgba(43,33,25,.18)', '--scrim': 'rgba(43,33,25,.32)' }
    : { '--bg': '#16110D', '--surface': '#1F1813', '--sunken': '#120E0B', '--hover': '#2A211A', '--border': '#33291F', '--border-strong': '#4A3D31', '--text': '#F2EADF', '--muted': '#B3A391', '--primary': '#E9C9A3', '--primaryFg': '#2B1C12', '--primary-tint': '#3A2E24', '--rest-a': '#1A1410', '--rest-b': '#241C16', '--warn-bg': '#33270C', '--warn-fg': '#F5C866', '--warn-line': '#6B5216', '--error-bg': '#3A1613', '--error-fg': '#FF9C92', '--error-line': '#6E2A24', '--error-solid': '#F07368', '--ok-bg': '#13301D', '--ok-fg': '#7FD69B', '--ok-solid': '#4FA36A', '--toast-bg': '#F2EADF', '--toast-fg': '#2B2119', '--toast-btn': '#E2D6C6', '--shadow-sm': 'none', '--shadow-md': '0 0 0 1px rgba(0,0,0,.2)', '--shadow-drag': '0 8px 24px rgba(0,0,0,.5)', '--shadow-modal': '0 16px 48px rgba(0,0,0,.6)', '--scrim': 'rgba(0,0,0,.55)' };
  const P = PAL[L ? 'light' : 'dark'];
  Object.keys(P).forEach(k => { const [s, t, f] = P[k]; v[`--${k}-solid`] = s; v[`--${k}-tint`] = t; v[`--${k}-fg`] = f; v[`--${k}-line`] = s + (L ? '55' : '66'); });
  return v;
}
export const rowVars = c => ({ '--c-solid': `var(--${c}-solid)`, '--c-tint': `var(--${c}-tint)`, '--c-fg': `var(--${c}-fg)`, '--c-line': `var(--${c}-line)` });

export const EMP = [
  { id: 'val', nombre: 'Valentina', rol: 'Jefa', color: 'rosa', excluir: true, tarifa: 10, descanso: 'Domingo', activa: true },
  { id: 'sil', nombre: 'Silvia', rol: 'Empleada', color: 'morado', excluir: false, tarifa: 10, descanso: 'Jueves y viernes', activa: true },
  { id: 'dul', nombre: 'Dulce', rol: 'Empleada', color: 'turq', excluir: false, tarifa: 10, descanso: 'Miércoles', activa: true },
  { id: 'car', nombre: 'Carolina', rol: 'Empleada', color: 'naranja', excluir: false, tarifa: 10, descanso: 'Domingo', activa: true }
];
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, i) => ({ d, n: 5 + i, largo: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][i] }));
const O = [['06:40', '12:00']], OF = [['06:40', '13:40']], J = [['09:00', '21:00']];
export const SEMANA = {
  val: [J, J, J, J, J, J, null],
  sil: [O, O, O, null, null, OF, OF],
  dul: [[['09:30', '13:00']], [['09:00', '12:00'], ['18:00', '20:00']], null, O, O, [['18:00', '20:00']], [['09:30', '13:00']]],
  car: [[['18:00', '20:00']], [['09:30', '13:00']], [['09:00', '12:00'], ['18:00', '20:00']], [['09:30', '13:00']], [['10:35', '12:00'], ['18:00', '20:00']], [['09:00', '13:00']], null]
};
export const PLANTILLAS = [
  { n: 'Apertura', h: '06:40 – 12:00', d: '5 h 20' }, { n: 'Apertura fin de semana', h: '06:40 – 13:40', d: '7 h' },
  { n: 'Jefa', h: '09:00 – 21:00', d: '12 h' }, { n: 'Mañana', h: '09:00 – 12:00', d: '3 h' },
  { n: 'Mañana larga', h: '09:30 – 13:00', d: '3 h 30' }, { n: 'Refuerzo de tarde', h: '18:00 – 20:00', d: '2 h' },
  { n: 'Partido', h: '09:30 – 11:00 + 18:00 – 20:00', d: '3 h 30' }
];
export const AVISOS = [
  { lvl: 'error', t: 'Dom 11 · 13:40 – 21:00 sin nadie', d: 'Franja descubierta. Valentina descansa.' },
  { lvl: 'warn', t: 'Mié 7 · 12:00 – 13:00 solo Valentina', d: 'Mínimo 2 personas de 09:00 a 13:00.' },
  { lvl: 'warn', t: 'Vie 9 · 12:00 – 13:00 solo Valentina', d: 'Mínimo 2 personas de 09:00 a 13:00.' },
  { lvl: 'warn', t: 'Dom 11 · 09:00 – 09:30 solo Silvia', d: 'Mínimo 2 personas de 09:00 a 13:00.' }
];
export const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const dur = min => { const h = Math.floor(min / 60), r = min % 60; return r ? `${h} h ${String(r).padStart(2, '0')}` : `${h} h`; };
export const eur = n => { const [i, d] = Math.abs(n).toFixed(2).split('.'); return (n < 0 ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + d + ' €'; };
export const segMin = segs => (segs || []).reduce((a, [s, e]) => a + toMin(e) - toMin(s), 0);
export const css = s => Object.fromEntries(s.split(';').filter(x => x.trim()).map(p => { const i = p.indexOf(':'); return [p.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase()), p.slice(i + 1).trim()]; }));
export const ICON = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  cal: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  clock: 'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  euro: 'M4 10h12M4 14h9M19 6a7.4 7.4 0 0 0-5.1-2C9.5 4 6 7.6 6 12s3.5 8 7.9 8a7.4 7.4 0 0 0 5.1-2',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'
};
export function nav(active) {
  return [['home', 'Inicio'], ['cal', 'Horario'], ['clock', 'Registro de horas'], ['euro', 'Nómina'], ['users', 'Equipo'], ['sliders', 'Ajustes']].map(([k, t]) => ({
    t, d: ICON[k],
    st: css(`display:flex;align-items:center;gap:10px;height:36px;padding:0 10px;border-radius:8px;font-size:14px;font-weight:${t === active ? 600 : 500};color:${t === active ? 'var(--text)' : 'var(--muted)'};background:${t === active ? 'var(--surface)' : 'transparent'};box-shadow:${t === active ? 'var(--shadow-sm)' : 'none'};border:1px solid ${t === active ? 'var(--border)' : 'transparent'}`)
  }));
}
export function coverage(day) {
  const segs = EMP.flatMap(e => (SEMANA[e.id][day] || []).map(s => [toMin(s[0]), toMin(s[1]), e.nombre]));
  const out = [];
  for (let t = 360; t < 1260; t += 10) {
    const c = segs.filter(([a, b]) => t >= a && t < b).length;
    const open = t >= 400;
    const req = !open ? 0 : (t >= 540 && t < 780 ? 2 : 1);
    out.push({ t, c, req });
  }
  return out;
}
export const NOMINA = [
  { id: 'sil', h: 132 * 60, prev: 128 * 60 + 40 },
  { id: 'dul', h: 106 * 60 + 40, prev: 104 * 60 + 20 },
  { id: 'car', h: 94 * 60 + 15, prev: 90 * 60 + 40 },
  { id: 'val', h: 288 * 60, prev: 276 * 60 }
];
export const COSTE_SEMANAS = [['S34', 742.5], ['S35', 768.33], ['S36', 731.67], ['S37', 755], ['S38', 790.83], ['S39', 748.33], ['S40', 737.5], ['S41', 760.83]];
