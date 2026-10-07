export type ColorKey = 'rosa' | 'morado' | 'turq' | 'naranja' | 'azul' | 'verde' | 'ambar' | 'rojo' | 'indigo' | 'gris';
/** Minutos desde las 00:00 (hora local). 400 = 06:40. */
export interface Tramo { inicio: number; fin: number }

export interface Empleada {
  id: string; nombre: string; rol: 'Empleada' | 'Jefa'; color: ColorKey;
  tarifaCent: number; diasDescanso: number[]; descansoSeguido: boolean;
  excluirNomina: boolean; activa: boolean; eliminadaEn?: string;
  usuario?: string | null; tieneAccesoPortal?: boolean;
}
export interface Plantilla { id: string; nombre: string; tramos: Tramo[] }
export interface Turno { id: string; empleadaId: string; fecha: string; tramos: Tramo[]; plantillaId?: string; avisosIgnorados?: string[] }
export interface Registro { id: string; empleadaId: string; fecha: string; tramos: Tramo[]; nota?: string; estado: 'previsto' | 'confirmado'; origen?: 'fichaje' }

/** Marca de entrada/salida (solo lectura): `minuto` en hora local del negocio, `marca` el instante exacto. */
export interface Fichaje {
  id: string; empleadaId: string; fecha: string; minuto: number; tipo: 'entrada' | 'salida'; marca: string; distanciaM?: number;
  /** Sin valor: lo fichó la empleada. */
  origen?: 'encargado' | 'automatico';
  verificacion?: 'gps' | 'red' | 'sin_verificar';
  /** Instante en que se anuló (corrección del encargado); queda en el historial. */
  anulado?: string; motivo?: string; sustituyeA?: string;
}
export interface Geocerca { activa: boolean; latitud: number | null; longitud: number | null; radioM: number }
export interface FichajeConfig {
  geocerca: Geocerca;
  red: { activa: boolean; ips: string[] };
  sinVerificar: 'revisar' | 'bloquear';
  cierreAutomaticoHoras: number;
}
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
  /** Fichajes de los últimos ~2 meses (se refrescan solos) y su configuración. */
  fichajes: Fichaje[]; fichaje: FichajeConfig;
}
export interface Aviso { nivel: 'error' | 'warn'; fecha?: string; empleadaId?: string; titulo: string; detalle: string }

export type Rol = 'admin' | 'empleada';
export interface Perfil {
  id: string;
  usuario: string | null;
  nombre: string;
  rol: Rol;
  color?: string;
}
