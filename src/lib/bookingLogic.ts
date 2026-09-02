import { doc, runTransaction, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Cita, Bloqueo } from '../types';

export const BUSINESS_PHONE = '3112352517';
export const BUSINESS_PHONE_INTL = '573112352517';
export const BUSINESS_INSTAGRAM = '@sebas_thebarber24k';
export const BUSINESS_ADDRESS = 'Cra. 82 # 18AA-4, Belén La Nubia, Medellín';

// Obtener fecha y hora actual en la zona horaria de Colombia (America/Bogota)
export function getBogotaNow(): Date {
  const now = new Date();
  const bogotaStr = now.toLocaleString('en-US', { timeZone: 'America/Bogota' });
  return new Date(bogotaStr);
}

// Formatear fecha a YYYY-MM-DD
export function formatDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Convertir hora HH:mm a minutos desde medianoche
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Convertir minutos desde medianoche a HH:mm
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Formatear precio en pesos colombianos con punto de miles
export function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Validar teléfono colombiano: 10 dígitos iniciando con 3
export function isValidColombianPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s\-().]/g, '');
  return /^3[0-9]{9}$/.test(cleanPhone);
}

export function cleanPhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '');
}

// Generar token único y criptográficamente seguro de 20 caracteres
export function generateTokenGestion(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // caracteres claros y legibles
  let randomPart = '';
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : null;
  if (cryptoObj && cryptoObj.getRandomValues) {
    const bytes = new Uint8Array(18);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < bytes.length; i++) {
      randomPart += chars[bytes[i] % chars.length];
    }
  } else {
    for (let i = 0; i < 18; i++) {
      randomPart += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return `nc24k_${randomPart}`;
}

// Obtener las fechas disponibles para agendar:
// Desde hoy hasta 6 días adelante. Domingo cerrado (0).
export interface AvailableDate {
  dateIso: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}

export function getAvailableDates(): AvailableDate[] {
  const dates: AvailableDate[] = [];
  const bogotaNow = getBogotaNow();
  
  const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  // Revisar los próximos 7 días (hoy + 6 días)
  for (let i = 0; i <= 6; i++) {
    const d = new Date(bogotaNow);
    d.setDate(bogotaNow.getDate() + i);
    
    // Domingo (0) está cerrado
    if (d.getDay() === 0) {
      continue;
    }

    // Si es hoy, verificar si aún es antes de las 19:00 (para alcanzar a cumplir 2 horas antes de las 21:00)
    if (i === 0) {
      const currentMinutes = d.getHours() * 60 + d.getMinutes();
      // Si ya son más de las 19:00 en Colombia, hoy ya no hay citas viables con 2h de anticipación
      if (currentMinutes >= 19 * 60) {
        continue;
      }
    }

    dates.push({
      dateIso: formatDateIso(d),
      dayName: daysOfWeek[d.getDay()],
      dayNumber: d.getDate(),
      monthName: months[d.getMonth()],
      isToday: i === 0,
    });
  }

  return dates;
}

// Estructura de intervalo de ocupación
export interface OcupacionSlot {
  id: string;
  inicio: string; // HH:mm
  fin: string; // HH:mm
  tipo: 'cita' | 'bloqueo';
}

// Generar franjas horarias disponibles para un día y duración dada
// Horario: Lunes a Sábado, 8:00 a.m. a 9:00 p.m. (480 a 1260 minutos)
export function calculateAvailableSlots(
  selectedDateIso: string,
  duracionMinutos: number,
  ocupaciones: OcupacionSlot[]
): string[] {
  const bogotaNow = getBogotaNow();
  const isToday = selectedDateIso === formatDateIso(bogotaNow);
  const currentMinutesBogota = isToday ? bogotaNow.getHours() * 60 + bogotaNow.getMinutes() : 0;

  const openingMinutes = 8 * 60; // 08:00 a.m. (480 min)
  const closingMinutes = 21 * 60; // 21:00 (1260 min)
  
  const step = 15; // Intervalos cada 15 minutos para encajar servicios de 15, 20, 60 y 75 min
  const slots: string[] = [];

  for (let startMin = openingMinutes; startMin + duracionMinutos <= closingMinutes; startMin += step) {
    // Si es hoy: regla de mínimo 2 horas de anticipación (120 minutos)
    // Ej: si son las 2:00 p.m. (840 min), startMin debe ser estrictamente mayor a 840 + 120 (960 min = 4:00 p.m.)
    if (isToday && startMin <= currentMinutesBogota + 120) {
      continue;
    }

    const endMin = startMin + duracionMinutos;

    // Verificar si hay choque con alguna ocupación existente
    const hasConflict = ocupaciones.some((occ) => {
      const occStart = timeToMinutes(occ.inicio);
      const occEnd = timeToMinutes(occ.fin);
      // Traslape de rangos: start < occEnd && end > occStart
      return startMin < occEnd && endMin > occStart;
    });

    if (!hasConflict) {
      slots.push(minutesToTime(startMin));
    }
  }

  return slots;
}

// Crear la cita de forma atómica dentro de runTransaction para evitar doble-reserva
export async function createBookingTransaction(params: {
  cliente_nombre: string;
  cliente_telefono: string;
  barbero_id: string;
  barbero_nombre: string;
  servicio_id: string;
  servicio_nombre: string;
  precio: number;
  duracion_minutos: number;
  fecha: string;
  hora_inicio: string;
  consentimiento_datos: boolean;
}): Promise<{ cita: Cita; token: string }> {
  const token = generateTokenGestion();
  const citaRef = doc(db, 'citas', token);
  const agendaRef = doc(db, 'agenda_dia', `${params.barbero_id}_${params.fecha}`);
  const telefonoLimpio = cleanPhone(params.cliente_telefono);
  const indiceRef = doc(db, 'indice_telefonos', telefonoLimpio);

  const duracion = params.duracion_minutos;
  const startMinutes = timeToMinutes(params.hora_inicio);
  const endMinutes = startMinutes + duracion;
  const hora_fin = minutesToTime(endMinutes);

  if (endMinutes > 21 * 60) {
    throw new Error('La cita no puede terminar después del horario de cierre (9:00 p.m.).');
  }

    // 4. Preparar el documento de la cita
    const nuevaCita: Cita = {
      id: token,
      cliente_nombre: params.cliente_nombre.trim(),
      cliente_telefono: telefonoLimpio,
      barbero_id: params.barbero_id,
      barbero_nombre: params.barbero_nombre,
      servicio_id: params.servicio_id,
      servicio_nombre: params.servicio_nombre,
      precio: params.precio,
      duracion_minutos: params.duracion_minutos,
      fecha: params.fecha,
      hora_inicio: params.hora_inicio,
      hora_fin: hora_fin,
      estado: 'confirmada',
      token_gestion: token,
      consentimiento_datos: params.consentimiento_datos,
      creado_en: new Date().toISOString(),
    };

    // 5. Transacción atómica única:
    // Lee la agenda del día y el índice telefónico, valida la ausencia de colisiones,
    // y si todo está libre, escribe simultáneamente citaRef, agendaRef e indiceRef.
    // Si hay colisión o falla alguna precondición, NINGÚN documento se escribe ni se confirma.
    await runTransaction(db, async (transaction) => {
      // 1. Leer la agenda del día para ese barbero y el índice de teléfonos
      const agendaSnap = await transaction.get(agendaRef);
      const indiceSnap = await transaction.get(indiceRef);

      const ocupacionesExistentes: OcupacionSlot[] = agendaSnap.exists()
        ? (agendaSnap.data().ocupaciones as OcupacionSlot[]) || []
        : [];

      const tokensExistentes: string[] = indiceSnap.exists()
        ? (indiceSnap.data().tokens as string[]) || []
        : [];

      // 2. Verificar que NO haya conflicto de horario
      const hayConflicto = ocupacionesExistentes.some((occ) => {
        const occStart = timeToMinutes(occ.inicio);
        const occEnd = timeToMinutes(occ.fin);
        return startMinutes < occEnd && endMinutes > occStart;
      });

      if (hayConflicto) {
        throw new Error(
          'El horario seleccionado acaba de ser reservado por otro cliente o bloqueado. Por favor regresa y elige otro horario.'
        );
      }

      // 3. Crear el nuevo slot de ocupación
      const nuevaOcupacion: OcupacionSlot = {
        id: token,
        inicio: params.hora_inicio,
        fin: hora_fin,
        tipo: 'cita',
      };

      const nuevasOcupaciones = [...ocupacionesExistentes, nuevaOcupacion];

      // 4. Escrituras atómicas coordinadas (agenda_dia, citas e indice_telefonos)
      transaction.set(agendaRef, {
        barbero_id: params.barbero_id,
        fecha: params.fecha,
        ocupaciones: nuevasOcupaciones,
        cita_agregada_id: token,
        actualizado_en: new Date().toISOString(),
      }, { merge: true });

      transaction.set(citaRef, nuevaCita);

      const nuevosTokens = tokensExistentes.includes(token)
        ? tokensExistentes
        : [...tokensExistentes, token];

      transaction.set(indiceRef, {
        telefono: telefonoLimpio,
        tokens: nuevosTokens,
        actualizado_en: new Date().toISOString(),
      }, { merge: true });
    });

  return {
    token,
    cita: {
      id: token,
      cliente_nombre: params.cliente_nombre.trim(),
      cliente_telefono: cleanPhone(params.cliente_telefono),
      barbero_id: params.barbero_id,
      barbero_nombre: params.barbero_nombre,
      servicio_id: params.servicio_id,
      servicio_nombre: params.servicio_nombre,
      precio: params.precio,
      duracion_minutos: params.duracion_minutos,
      fecha: params.fecha,
      hora_inicio: params.hora_inicio,
      hora_fin: hora_fin,
      estado: 'confirmada',
      token_gestion: token,
      consentimiento_datos: params.consentimiento_datos,
      creado_en: new Date().toISOString(),
    },
  };
}

// Verificar política de cancelación (hasta 3 horas antes)
export function checkCancellationEligibility(fecha: string, hora_inicio: string): {
  puedeCancelar: boolean;
  horasRestantes: number;
  mensaje: string;
} {
  const bogotaNow = getBogotaNow();
  
  // Construir fecha de la cita en Colombia
  const [year, month, day] = fecha.split('-').map(Number);
  const [hours, minutes] = hora_inicio.split(':').map(Number);
  
  const citaDateTime = new Date(year, month - 1, day, hours, minutes);
  const diffMs = citaDateTime.getTime() - bogotaNow.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours >= 3) {
    return {
      puedeCancelar: true,
      horasRestantes: diffHours,
      mensaje: 'Puedes cancelar tu cita libremente.',
    };
  }

  return {
    puedeCancelar: false,
    horasRestantes: diffHours,
    mensaje:
      'Faltan menos de 3 horas para la cita. Por políticas del negocio, no es posible cancelar desde este enlace. Por favor comunícate directamente por WhatsApp al 311 235 2517.',
  };
}

// Cancelar una cita por su token de gestión de forma atómica
export async function cancelBooking(token: string, motivo?: string): Promise<void> {
  const citaRef = doc(db, 'citas', token);

  await runTransaction(db, async (transaction) => {
    const citaSnap = await transaction.get(citaRef);

    if (!citaSnap.exists()) {
      throw new Error('La cita solicitada no fue encontrada.');
    }

    const cita = citaSnap.data() as Cita;

    if (cita.estado === 'cancelada') {
      return; // Ya fue cancelada previamente
    }

    const eligibility = checkCancellationEligibility(cita.fecha, cita.hora_inicio);
    if (!eligibility.puedeCancelar) {
      throw new Error(eligibility.mensaje);
    }

    const agendaRef = doc(db, 'agenda_dia', `${cita.barbero_id}_${cita.fecha}`);
    const agendaSnap = await transaction.get(agendaRef);

    // 1. Marcar cita como cancelada
    transaction.update(citaRef, {
      estado: 'cancelada',
      cancelado_en: new Date().toISOString(),
      motivo_cancelacion: motivo || 'Cancelada por el cliente desde enlace de gestión',
    });

    // 2. Liberar el espacio en agenda_dia de forma transaccional concurrente
    if (agendaSnap.exists()) {
      const data = agendaSnap.data();
      const ocupaciones: OcupacionSlot[] = (data.ocupaciones as OcupacionSlot[]) || [];
      const filtradas = ocupaciones.filter((occ) => occ.id !== token);
      transaction.update(agendaRef, {
        barbero_id: cita.barbero_id,
        fecha: cita.fecha,
        ocupaciones: filtradas,
        cita_cancelada_id: token,
      });
    }
  });
}

// Generar link de WhatsApp con mensaje listo
export function getWhatsAppBookingLink(cita: Cita): string {
  const texto = `Hola Barbería New Concept 24k, acabo de agendar una cita para *${cita.servicio_nombre}* con *${cita.barbero_nombre}* el día *${cita.fecha}* a las *${cita.hora_inicio}*.\n\nMi nombre es *${cita.cliente_nombre}* y mi código de reserva es *${cita.token_gestion}*.\n\n¡Muchas gracias!`;
  return `https://wa.me/${BUSINESS_PHONE_INTL}?text=${encodeURIComponent(texto)}`;
}

export function getWhatsAppGeneralLink(): string {
  const texto = `Hola Barbería New Concept 24k, me gustaría consultar información sobre sus cortes y disponibilidad.`;
  return `https://wa.me/${BUSINESS_PHONE_INTL}?text=${encodeURIComponent(texto)}`;
}

export function getWhatsAppCancellationNoticeLink(cita: Cita): string {
  const texto = `Hola Barbería New Concept 24k, me comunico respecto a mi cita de *${cita.servicio_nombre}* programada para el *${cita.fecha}* a las *${cita.hora_inicio}* con *${cita.barbero_nombre}* (Código: *${cita.token_gestion}*). Necesito cancelarla o reprogramarla.`;
  return `https://wa.me/${BUSINESS_PHONE_INTL}?text=${encodeURIComponent(texto)}`;
}
