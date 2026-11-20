// Fase 1 — Disponibilidad y reglas horarias (BR-01..BR-05, BR-09, BR-10, BR-15)
// Casos: TC-AV-01..12, TC-TZ-01 (se ejecuta con TZ distintas, ver "test:unit:tz"), TC-TZ-03
// Reloj base: miércoles 11-nov-2026 09:00 hora de Bogotá (14:00 UTC).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', async () => (await import('./helpers/fakeFirestore')).fakeFirestoreModule());

import {
  calculateAvailableSlots,
  getAvailableDates,
  getBogotaNow,
  formatDateIso,
  OPENING_MINUTES,
  CLOSING_MINUTES,
  ANTICIPACION_MINIMA_MINUTOS,
  type OcupacionSlot,
} from '../../src/lib/bookingLogic';

const HOY = '2026-11-11'; // miércoles
const MANANA = '2026-11-12';

/** Fija "ahora" en una hora de Bogotá (UTC-5, sin horario de verano). */
function ahoraBogota(fecha: string, hhmm: string, ss = '00') {
  vi.setSystemTime(new Date(`${fecha}T${hhmm}:${ss}-05:00`));
}

const horas = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => `${String(desde + i).padStart(2, '0')}:00`);

const occ = (inicio: string, fin: string, tipo: 'cita' | 'bloqueo' = 'cita'): OcupacionSlot => ({
  id: `${tipo}_${inicio}`,
  inicio,
  fin,
  tipo,
});

describe('Reglas de negocio — constantes (BR-01, BR-04)', () => {
  it('BR-01: horario de atención 10:00–20:00', () => {
    expect(OPENING_MINUTES).toBe(10 * 60);
    expect(CLOSING_MINUTES).toBe(20 * 60);
  });
  it('BR-04: anticipación mínima de 30 minutos', () => {
    expect(ANTICIPACION_MINIMA_MINUTOS).toBe(30);
  });
});

describe('Disponibilidad de horas', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    ahoraBogota(HOY, '09:00');
  });
  afterEach(() => vi.useRealTimers());

  it('TC-AV-01: Corte (90 min) sin citas → 10:00 … 18:00 (9 franjas), nunca 19:00', () => {
    const slots = calculateAvailableSlots(HOY, 90, []);
    expect(slots).toEqual(horas(10, 18));
    expect(slots).toHaveLength(9);
    expect(slots).not.toContain('19:00');
  });

  it('TC-AV-01b: Corte con barba tiene la misma duración (90) y las mismas franjas', () => {
    expect(calculateAvailableSlots(HOY, 90, [])).toEqual(horas(10, 18));
  });

  it.each([
    ['Marcada', 20],
    ['Cejas', 15],
  ])('TC-AV-02: %s (%i min) sin citas → 10:00 … 19:00 (10 franjas), nunca 20:00', (_n, dur) => {
    const slots = calculateAvailableSlots(HOY, dur, []);
    expect(slots).toEqual(horas(10, 19));
    expect(slots).toHaveLength(10);
    expect(slots).not.toContain('20:00');
  });

  it('TC-AV-02b: las franjas de un día futuro no dependen de la hora actual', () => {
    ahoraBogota(HOY, '17:45');
    expect(calculateAvailableSlots(MANANA, 90, [])).toEqual(horas(10, 18));
  });

  it('TC-AV-04: a las 09:29, la franja de 10:00 SÍ se ofrece (faltan 31 min)', () => {
    ahoraBogota(HOY, '09:29');
    expect(calculateAvailableSlots(HOY, 90, [])[0]).toBe('10:00');
  });

  it('TC-AV-05: a las 09:30, la franja de 10:00 NO se ofrece (frontera: se excluye si inicio <= ahora + 30)', () => {
    ahoraBogota(HOY, '09:30');
    const slots = calculateAvailableSlots(HOY, 90, []);
    expect(slots).not.toContain('10:00');
    expect(slots[0]).toBe('11:00');
  });

  it('TC-AV-05b: a las 09:30:59 sigue sin ofrecerse 10:00 (los segundos no cuentan)', () => {
    ahoraBogota(HOY, '09:30', '59');
    expect(calculateAvailableSlots(HOY, 90, [])).not.toContain('10:00');
  });

  it('TC-AV-06: a las 18:10 no quedan franjas hoy para Corte (la última, 18:00, ya pasó)', () => {
    ahoraBogota(HOY, '18:10');
    expect(calculateAvailableSlots(HOY, 90, [])).toEqual([]);
  });

  it('TC-AV-06b: a las 18:10 sí quedan franjas para servicios cortos (19:00 para Marcada)', () => {
    ahoraBogota(HOY, '18:10');
    expect(calculateAvailableSlots(HOY, 20, [])).toEqual(['19:00']);
  });

  it('TC-AV-07: cita 11:00–12:30 → desaparecen 10:00, 11:00 y 12:00; reaparece 13:00', () => {
    const slots = calculateAvailableSlots(MANANA, 90, [occ('11:00', '12:30')]);
    expect(slots).not.toContain('10:00'); // 10:00–11:30 se cruza
    expect(slots).not.toContain('11:00');
    expect(slots).not.toContain('12:00'); // 12:00–13:30 se cruza
    expect(slots).toEqual(horas(13, 18));
  });

  it('TC-AV-08: Marcada a las 11:00 se cruza con una cita 10:00–11:30', () => {
    const slots = calculateAvailableSlots(MANANA, 20, [occ('10:00', '11:30')]);
    expect(slots).not.toContain('10:00');
    expect(slots).not.toContain('11:00');
    expect(slots).toContain('12:00');
  });

  it('TC-AV-08b: con una cita corta 10:00–10:20, Cejas a las 11:00 sí está disponible, a las 10:00 no', () => {
    const slots = calculateAvailableSlots(MANANA, 15, [occ('10:00', '10:20')]);
    expect(slots).not.toContain('10:00');
    expect(slots).toContain('11:00');
  });

  it('BR-09: citas pegadas son válidas (fin de una = inicio de la siguiente)', () => {
    // Cita 10:00–11:00 (p. ej. manual de 60 min): el Corte de las 11:00 empieza justo al terminar
    const slots = calculateAvailableSlots(MANANA, 90, [occ('10:00', '11:00')]);
    expect(slots).not.toContain('10:00');
    expect(slots).toContain('11:00');
  });

  it('TC-AV-09: bloqueo 14:00–16:00 → desaparecen 13:00, 14:00 y 15:00 (Corte); reaparece 16:00', () => {
    const slots = calculateAvailableSlots(MANANA, 90, [occ('14:00', '16:00', 'bloqueo')]);
    expect(slots).toEqual(['10:00', '11:00', '12:00', '16:00', '17:00', '18:00']);
  });

  it('TC-AV-09b: un bloqueo trata igual que una cita (BR-10)', () => {
    const conCita = calculateAvailableSlots(MANANA, 90, [occ('14:00', '16:00', 'cita')]);
    const conBloqueo = calculateAvailableSlots(MANANA, 90, [occ('14:00', '16:00', 'bloqueo')]);
    expect(conBloqueo).toEqual(conCita);
  });

  it('TC-AV-09c: día completamente bloqueado → sin franjas', () => {
    expect(calculateAvailableSlots(MANANA, 90, [occ('10:00', '20:00', 'bloqueo')])).toEqual([]);
  });
});

describe('Fechas ofrecidas', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('TC-AV-11: desde hoy hasta hoy+6 días, sin domingos (miércoles 09:00 → 6 fechas)', () => {
    ahoraBogota(HOY, '09:00');
    const fechas = getAvailableDates();
    expect(fechas.map((d) => d.dateIso)).toEqual([
      '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-16', '2026-11-17',
    ]);
    expect(fechas.some((d) => d.dayName === 'Domingo')).toBe(false);
    expect(fechas.filter((d) => d.isToday)).toHaveLength(1);
    expect(fechas[0].isToday).toBe(true);
  });

  it('TC-AV-03: un sábado → el domingo se salta; ventana de 7 días da 6 fechas', () => {
    ahoraBogota('2026-11-14', '10:00');
    expect(getAvailableDates().map((d) => d.dateIso)).toEqual([
      '2026-11-14', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20',
    ]);
  });

  it('TC-AV-03b: un domingo → "hoy" no se ofrece y la primera fecha es el lunes', () => {
    ahoraBogota('2026-11-15', '10:00');
    const fechas = getAvailableDates();
    expect(fechas[0].dateIso).toBe('2026-11-16');
    expect(fechas.some((d) => d.isToday)).toBe(false);
    expect(fechas.some((d) => d.dayName === 'Domingo')).toBe(false);
  });

  it('hoy se ofrece hasta las 19:29 y deja de ofrecerse desde las 19:30 (cierre − anticipación)', () => {
    ahoraBogota(HOY, '19:29');
    expect(getAvailableDates()[0].isToday).toBe(true);
    ahoraBogota(HOY, '19:30');
    const fechas = getAvailableDates();
    expect(fechas.some((d) => d.isToday)).toBe(false);
    expect(fechas[0].dateIso).toBe('2026-11-12');
  });

  it('TC-AV-11b: nombres de día y mes en español', () => {
    ahoraBogota(HOY, '09:00');
    const f = getAvailableDates()[0];
    expect(f.dayName).toBe('Miércoles');
    expect(f.monthName).toBe('Nov');
    expect(f.dayNumber).toBe(11);
  });
});

describe('Zona horaria (BR-15) — se corre bajo varias TZ del sistema', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('TC-TZ-01: la hora de Bogotá no depende de la zona del equipo', () => {
    ahoraBogota(HOY, '09:00');
    const b = getBogotaNow();
    expect(b.getHours()).toBe(9);
    expect(b.getMinutes()).toBe(0);
    expect(formatDateIso(b)).toBe(HOY);
    // y por tanto las franjas son las mismas con cualquier TZ del sistema
    expect(calculateAvailableSlots(HOY, 90, [])).toEqual(horas(10, 18));
    ahoraBogota(HOY, '09:30');
    expect(calculateAvailableSlots(HOY, 90, [])[0]).toBe('11:00');
  });

  it('TC-TZ-03: 23:00 en Bogotá (ya es el día siguiente en UTC) sigue siendo "hoy" = 11-nov', () => {
    vi.setSystemTime(new Date('2026-11-12T04:00:00Z')); // 23:00 del 11-nov en Bogotá
    expect(formatDateIso(getBogotaNow())).toBe(HOY);
    // El 11-nov es "hoy" y a las 23:00 ya no queda ninguna franja
    expect(calculateAvailableSlots(HOY, 90, [])).toEqual([]);
    // El 12-nov todavía es mañana: franjas completas
    expect(calculateAvailableSlots(MANANA, 90, [])).toEqual(horas(10, 18));
  });

  it('TC-TZ-03b: medianoche exacta en Bogotá cambia el día', () => {
    vi.setSystemTime(new Date('2026-11-12T05:00:00Z')); // 00:00 del 12-nov en Bogotá
    expect(formatDateIso(getBogotaNow())).toBe(MANANA);
  });
});
