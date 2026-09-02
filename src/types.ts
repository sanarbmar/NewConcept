export type EstadoCita = 'confirmada' | 'completada' | 'cancelada' | 'no_show';

export interface Barbero {
  id: string;
  nombre: string;
  rol: string;
  especialidad: string;
  foto_url: string;
  activo: boolean;
  orden: number;
  es_dueno?: boolean;
}

export interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  duracion_minutos: number;
  duracion_label: string;
  descripcion: string;
  activo: boolean;
  orden: number;
}

export interface Cita {
  id: string; // Es el mismo token_gestion
  cliente_nombre: string;
  cliente_telefono: string;
  barbero_id: string;
  barbero_nombre: string;
  servicio_id: string;
  servicio_nombre: string;
  precio: number;
  duracion_minutos: number;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  estado: EstadoCita;
  token_gestion: string;
  consentimiento_datos: boolean;
  creado_en: string;
  cancelado_en?: string | null;
  motivo_cancelacion?: string | null;
}

export interface Bloqueo {
  id: string;
  barbero_id: string;
  fecha: string; // YYYY-MM-DD
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  motivo: string;
  creado_en: string;
}

export interface ReporteMetricas {
  totalCitas: number;
  totalCompletadas: number;
  totalCanceladas: number;
  totalNoShow: number;
  ingresosEstimados: number;
  citasPorBarbero: Record<string, number>;
  serviciosPopulares: { nombre: string; cantidad: number }[];
}
