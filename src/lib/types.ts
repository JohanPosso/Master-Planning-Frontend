export type ColorKey = 'rosa' | 'morado' | 'turq' | 'naranja' | 'azul' | 'verde' | 'ambar' | 'rojo' | 'indigo' | 'gris';
/** Minutos desde las 00:00 (hora local). 400 = 06:40. */
export interface Tramo { inicio: number; fin: number }

export interface Empleada {
  id: string; nombre: string; rol: 'Empleada' | 'Jefa'; color: ColorKey;
  tarifaCent: number; diasDescanso: number[]; descansoSeguido: boolean;
  excluirNomina: boolean; activa: boolean; eliminadaEn?: string;
}
export interface Plantilla { id: string; nombre: string; tramos: Tramo[] }
export interface Turno { id: string; empleadaId: string; fecha: string; tramos: Tramo[]; plantillaId?: string; avisosIgnorados?: string[] }
export interface Registro { id: string; empleadaId: string; fecha: string; tramos: Tramo[]; nota?: string; estado: 'previsto' | 'confirmado' }
export interface LineaPago { empleadaId: string; minutos: number; importeCent: number; tarifaCent?: number; recargosCent?: number }
export interface PeriodoPago { id: string; inicio: string; fin: string; etiqueta: string; pagadoEn: string; totalCent: number; lineas: LineaPago[] }
export interface Semana { lunes: string; publicada: boolean }

export interface Reglas {
  apertura: { desde: number; hasta: number };
  franjaVacia: boolean;
  minPersonas: { activa: boolean; desde: number; hasta: number; valor: number };
  maxHorasDia: { activa: boolean; valor: number };
  maxHorasSemana: { activa: boolean; valor: number };
  diaLibre: boolean;
  descansoSeguido: boolean;
}
export interface Ajustes { recargoDomingoPct: number; recargoFestivoPct: number; festivos: string[] }

export interface State {
  version: number;
  empleadas: Empleada[]; plantillas: Plantilla[]; turnos: Turno[]; registros: Registro[];
  pagos: PeriodoPago[]; semanas: Semana[]; reglas: Reglas; ajustes: Ajustes;
}
export interface Aviso { nivel: 'error' | 'warn'; fecha?: string; empleadaId?: string; titulo: string; detalle: string }
