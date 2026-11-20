// Fase 1 — Reserva, cancelación y citas manuales (lógica con Firestore simulado en memoria)
// Casos: TC-E2E-01/06/07/08 (nivel lógica), TC-AV-12, TC-CAN-02/03/05/07, TC-ADM-09..14, regresiones Rondas 6, 8, 18, 27
// IMPORTANTE: esto prueba la lógica de bookingLogic.ts, NO las reglas de seguridad (ver tests/rules).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/lib/firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', async () => (await import('./helpers/fakeFirestore')).fakeFirestoreModule());

import { store, resetStore, getDocData } from './helpers/fakeFirestore';
import {
  createBookingTransaction,
  createManualBookingTransaction,
  cancelBooking,
  checkCancellationEligibility,
  calculateAvailableSlots,
  type OcupacionSlot,
} from '../../src/lib/bookingLogic';

const TOKEN_RE = /^nc24k_[a-hjkmnp-z2-9]{18}$/;
const FECHA = '2026-11-13'; // viernes, dos días después del reloj base

function ahoraBogota(fecha: string, hhmm: string, ss = '00') {
  vi.setSystemTime(new Date(`${fecha}T${hhmm}:${ss}-05:00`));
}

const reservar = (o: Partial<Parameters<typeof createBookingTransaction>[0]> = {}) =>
  createBookingTransaction({
    cliente_nombre: 'ZZ_TEST Cliente Uno',
    cliente_telefono: '3000000001',
    barbero_id: 'barbero_sebas',
    barbero_nombre: 'Sebastián Correa',
    servicio_id: 'srv_corte',
    servicio_nombre: 'Corte',
    precio: 25000,
    duracion_minutos: 90,
    fecha: FECHA,
    hora_inicio: '10:00',
    consentimiento_datos: true,
    ...o,
  });

const manual = (o: Partial<Parameters<typeof createManualBookingTransaction>[0]> = {}) =>
  createManualBookingTransaction({
    cliente_nombre: 'ZZ_TEST Walk-in',
    barbero_id: 'barbero_sebas',
    barbero_nombre: 'Sebastián Correa',
    servicio_id: 'srv_corte',
    servicio_nombre: 'Corte',
    precio: 25000,
    duracion_minutos: 30,
    fecha: FECHA,
    hora_inicio: '10:30',
    ...o,
  });

const agenda = (barbero = 'barbero_sebas', fecha = FECHA) => getDocData(`agenda_dia/${barbero}_${fecha}`);
const ocupaciones = (barbero = 'barbero_sebas', fecha = FECHA): OcupacionSlot[] => agenda(barbero, fecha)?.ocupaciones ?? [];

beforeEach(() => {
  resetStore();
  vi.useFakeTimers({ toFake: ['Date'] });
  ahoraBogota('2026-11-11', '09:00');
  vi.stubGlobal('window', { crypto: globalThis.crypto });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('Reserva (RF-06..RF-10)', () => {
  it('TC-E2E-01 (lógica): camino feliz escribe cita, agenda_dia e indice_telefonos juntos', async () => {
    const { token, cita } = await reservar();

    expect(token).toMatch(TOKEN_RE);
    expect(cita.estado).toBe('confirmada');
    expect(cita.hora_inicio).toBe('10:00');
    expect(cita.hora_fin).toBe('11:30');

    const guardada = getDocData(`citas/${token}`);
    expect(guardada).toMatchObject({
      id: token,
      token_gestion: token,
      cliente_nombre: 'ZZ_TEST Cliente Uno',
      cliente_telefono: '3000000001',
      barbero_id: 'barbero_sebas',
      servicio_id: 'srv_corte',
      fecha: FECHA,
      hora_inicio: '10:00',
      hora_fin: '11:30',
      estado: 'confirmada',
      consentimiento_datos: true,
    });

    expect(ocupaciones()).toEqual([{ id: token, inicio: '10:00', fin: '11:30', tipo: 'cita' }]);
    expect(agenda()?.cita_agregada_id).toBe(token);
    expect(getDocData('indice_telefonos/3000000001')?.tokens).toEqual([token]);
  });

  it('el celular se limpia de espacios y guiones antes de guardarse', async () => {
    const { token } = await reservar({ cliente_telefono: '300 000-0001' });
    expect(getDocData(`citas/${token}`)?.cliente_telefono).toBe('3000000001');
    expect(getDocData('indice_telefonos/3000000001')).toBeDefined();
  });

  it('el nombre se guarda sin espacios sobrantes', async () => {
    const { token } = await reservar({ cliente_nombre: '  ZZ_TEST Con Espacios  ' });
    expect(getDocData(`citas/${token}`)?.cliente_nombre).toBe('ZZ_TEST Con Espacios');
  });

  it('TC-E2E-02 (lógica): tras reservar, la franja y las que se cruzan dejan de ofrecerse', async () => {
    await reservar(); // 10:00–11:30
    const slots = calculateAvailableSlots(FECHA, 90, ocupaciones());
    expect(slots).not.toContain('10:00');
    expect(slots).not.toContain('11:00');
    expect(slots).toContain('12:00');
  });

  it('TC-E2E-06 (lógica): reservar la misma franja dos veces → la segunda falla y no deja nada escrito', async () => {
    const primera = await reservar();
    await expect(reservar({ cliente_nombre: 'ZZ_TEST Cliente Dos', cliente_telefono: '3000000002' })).rejects.toThrow(
      /acaba de ser reservado/
    );

    const citas = [...store.keys()].filter((k) => k.startsWith('citas/'));
    expect(citas).toEqual([`citas/${primera.token}`]); // ninguna cita huérfana
    expect(ocupaciones()).toHaveLength(1); // una sola ocupación
    expect(getDocData('indice_telefonos/3000000002')).toBeUndefined(); // ni índice del perdedor
  });

  it('TC-E2E-06b: cruce parcial (11:00 sobre una cita 10:00–11:30) también se rechaza', async () => {
    await reservar({ hora_inicio: '10:00' });
    await expect(reservar({ hora_inicio: '11:00', cliente_telefono: '3000000002' })).rejects.toThrow(/acaba de ser reservado/);
  });

  it('TC-E2E-06c: una cita cae justo sobre un bloqueo del admin → se rechaza', async () => {
    store.set(`agenda_dia/barbero_sebas_${FECHA}`, {
      barbero_id: 'barbero_sebas',
      fecha: FECHA,
      ocupaciones: [{ id: 'bloq_1', inicio: '14:00', fin: '16:00', tipo: 'bloqueo' }],
    });
    await expect(reservar({ hora_inicio: '15:00' })).rejects.toThrow(/reservado por otro cliente o bloqueado/);
  });

  it('BR-09: citas pegadas se aceptan (Corte 10:00–11:30 y luego otra a las 11:30)', async () => {
    await reservar({ hora_inicio: '10:00' });
    await expect(reservar({ hora_inicio: '11:30', cliente_telefono: '3000000002' })).resolves.toBeDefined();
    expect(ocupaciones()).toHaveLength(2);
  });

  it('TC-E2E-07: franjas distintas del mismo barbero → ambas se crean', async () => {
    await reservar({ hora_inicio: '10:00' });
    await reservar({ hora_inicio: '13:00', cliente_telefono: '3000000002' });
    expect(ocupaciones().map((o) => o.inicio)).toEqual(['10:00', '13:00']);
  });

  it('TC-E2E-08: mismo horario con barberos distintos → ambas se crean, cada una en su agenda', async () => {
    await reservar({ barbero_id: 'barbero_sebas' });
    await reservar({ barbero_id: 'barbero_ciro', barbero_nombre: 'Sebastián Ciro', cliente_telefono: '3000000002' });
    expect(ocupaciones('barbero_sebas')).toHaveLength(1);
    expect(ocupaciones('barbero_ciro')).toHaveLength(1);
  });

  it('mismo barbero y misma hora en otro día → se crea (cada día tiene su propia agenda)', async () => {
    await reservar({ fecha: '2026-11-13' });
    await reservar({ fecha: '2026-11-14', cliente_telefono: '3000000002' });
    expect(ocupaciones('barbero_sebas', '2026-11-13')).toHaveLength(1);
    expect(ocupaciones('barbero_sebas', '2026-11-14')).toHaveLength(1);
  });

  it('un mismo celular con dos citas acumula ambos tokens en el índice', async () => {
    const a = await reservar({ hora_inicio: '10:00' });
    const b = await reservar({ hora_inicio: '13:00' });
    expect(getDocData('indice_telefonos/3000000001')?.tokens).toEqual([a.token, b.token]);
  });

  it('cada reserva genera un token distinto', async () => {
    const a = await reservar({ hora_inicio: '10:00' });
    const b = await reservar({ hora_inicio: '13:00' });
    expect(a.token).not.toBe(b.token);
  });
});

describe('Horario de cierre (BR-03 / TC-AV-12)', () => {
  it('Corte a las 18:00 termina 19:30 → válido', async () => {
    await expect(reservar({ hora_inicio: '18:00' })).resolves.toMatchObject({ cita: { hora_fin: '19:30' } });
  });

  it('Corte a las 19:00 termina 20:30 → rechazado con mensaje de cierre y sin escribir nada', async () => {
    await expect(reservar({ hora_inicio: '19:00' })).rejects.toThrow(/horario de cierre \(8:00 p\.m\.\)/);
    expect(store.size).toBe(0);
  });

  it('Marcada a las 19:40 termina justo a las 20:00 → válido; a las 19:50 → rechazado', async () => {
    await expect(reservar({ servicio_id: 'srv_marcada', duracion_minutos: 20, hora_inicio: '19:40' })).resolves.toBeDefined();
    await expect(
      reservar({ servicio_id: 'srv_marcada', duracion_minutos: 20, hora_inicio: '19:50', cliente_telefono: '3000000002' })
    ).rejects.toThrow(/horario de cierre/);
  });

  // HALLAZGOS: la apertura y el domingo solo se controlan en la interfaz (selector de fechas/horas).
  // createBookingTransaction no los valida y firestore.rules tampoco. Estas pruebas están marcadas como
  // "fails" (defecto conocido): pasan en verde mientras el defecto exista y empezarán a fallar cuando se
  // corrija, momento en que hay que quitar el ".fails".
  it.fails('DEFECTO-01: debería rechazar una cita que empieza antes de la apertura (03:00)', async () => {
    await expect(reservar({ hora_inicio: '03:00' })).rejects.toThrow();
  });

  it.fails('DEFECTO-02: debería rechazar una cita en domingo (2026-11-15)', async () => {
    await expect(reservar({ fecha: '2026-11-15' })).rejects.toThrow();
  });
});

describe('Cancelación (RF-14, BR-06)', () => {
  it('TC-CAN-02: cancelar marca la cita, libera la franja y el horario vuelve a ofrecerse', async () => {
    const a = await reservar({ hora_inicio: '10:00' });
    await cancelBooking(a.token);

    const cita = getDocData(`citas/${a.token}`);
    expect(cita?.estado).toBe('cancelada');
    expect(cita?.cancelado_en).toBeTruthy();
    expect(cita?.motivo_cancelacion).toBeTruthy();
    expect(ocupaciones()).toEqual([]);
    expect(agenda()?.cita_cancelada_id).toBe(a.token); // el campo que exigen las reglas (Caso b)

    expect(calculateAvailableSlots(FECHA, 90, ocupaciones())).toContain('10:00');
  });

  it('TC-CAN-03 (regresión Ronda 8): cancelar A deja intacta la franja de B', async () => {
    const a = await reservar({ hora_inicio: '10:00' });
    const b = await reservar({ hora_inicio: '13:00', cliente_telefono: '3000000002' });
    await cancelBooking(a.token);

    expect(ocupaciones()).toEqual([{ id: b.token, inicio: '13:00', fin: '14:30', tipo: 'cita' }]);
    expect(getDocData(`citas/${b.token}`)?.estado).toBe('confirmada');
  });

  it('cancelar no toca la agenda de otro barbero ni de otro día', async () => {
    const a = await reservar({ hora_inicio: '10:00' });
    const otroBarbero = await reservar({ barbero_id: 'barbero_ciro', cliente_telefono: '3000000002' });
    const otroDia = await reservar({ fecha: '2026-11-14', cliente_telefono: '3000000003' });
    await cancelBooking(a.token);

    expect(ocupaciones('barbero_ciro').map((o) => o.id)).toEqual([otroBarbero.token]);
    expect(ocupaciones('barbero_sebas', '2026-11-14').map((o) => o.id)).toEqual([otroDia.token]);
  });

  it('TC-CAN-07: cancelar dos veces es inocuo (no cambia la fecha de cancelación ni la agenda)', async () => {
    const a = await reservar();
    await cancelBooking(a.token);
    const primera = getDocData(`citas/${a.token}`);
    const agendaAntes = agenda();

    ahoraBogota('2026-11-11', '10:00');
    await expect(cancelBooking(a.token)).resolves.toBeUndefined();
    expect(getDocData(`citas/${a.token}`)).toEqual(primera);
    expect(agenda()).toEqual(agendaAntes);
  });

  it('token inexistente → "no fue encontrada"', async () => {
    await expect(cancelBooking('nc24k_noexiste0000000000')).rejects.toThrow(/no fue encontrada/);
  });

  it('con menos de 3 h se rechaza y no cambia nada (cita de hoy a las 11:00, son las 09:00)', async () => {
    const a = await reservar({ fecha: '2026-11-11', hora_inicio: '11:00' });
    await expect(cancelBooking(a.token)).rejects.toThrow(/menos de 3 horas/);
    expect(getDocData(`citas/${a.token}`)?.estado).toBe('confirmada');
    expect(ocupaciones('barbero_sebas', '2026-11-11')).toHaveLength(1);
  });

  describe('TC-CAN-05: frontera de las 3 horas (cita a las 12:00 del 11-nov)', () => {
    const FECHA_CITA = '2026-11-11';
    const HORA_CITA = '12:00';

    it('faltan 3:00:01 → se puede cancelar', () => {
      ahoraBogota(FECHA_CITA, '08:59', '59');
      expect(checkCancellationEligibility(FECHA_CITA, HORA_CITA).puedeCancelar).toBe(true);
    });
    it('faltan exactamente 3:00:00 → se puede cancelar (la regla es ">= 3 h")', () => {
      ahoraBogota(FECHA_CITA, '09:00', '00');
      const r = checkCancellationEligibility(FECHA_CITA, HORA_CITA);
      expect(r.puedeCancelar).toBe(true);
      expect(r.horasRestantes).toBe(3);
    });
    it('faltan 2:59:59 → NO se puede cancelar y el mensaje remite a WhatsApp', () => {
      ahoraBogota(FECHA_CITA, '09:00', '01');
      const r = checkCancellationEligibility(FECHA_CITA, HORA_CITA);
      expect(r.puedeCancelar).toBe(false);
      expect(r.mensaje).toMatch(/WhatsApp al 311 235 2517/);
    });
    it('una cita en el pasado no se puede cancelar', () => {
      ahoraBogota(FECHA_CITA, '13:00');
      const r = checkCancellationEligibility(FECHA_CITA, HORA_CITA);
      expect(r.puedeCancelar).toBe(false);
      expect(r.horasRestantes).toBeLessThan(0);
    });
  });
});

describe('Citas manuales del administrador (RF-24, BR-13)', () => {
  it('TC-ADM-09: cita de 30 min a las 10:30 sin celular se guarda como manual y sin índice telefónico', async () => {
    const { token, cita } = await manual();

    expect(cita).toMatchObject({ origen: 'manual', estado: 'confirmada', hora_inicio: '10:30', hora_fin: '11:00', cliente_telefono: '', consentimiento_datos: false });
    expect(getDocData(`citas/${token}`)?.origen).toBe('manual');
    expect(ocupaciones()).toEqual([{ id: token, inicio: '10:30', fin: '11:00', tipo: 'cita' }]);
    expect([...store.keys()].some((k) => k.startsWith('indice_telefonos/'))).toBe(false);
  });

  it('TC-ADM-09b: en el sitio público desaparece la franja de 10:00 (por el cruce) pero NO la de 11:00', async () => {
    await manual(); // 10:30–11:00
    const slots = calculateAvailableSlots(FECHA, 90, ocupaciones());
    expect(slots).not.toContain('10:00');
    expect(slots).toContain('11:00');
  });

  it('TC-ADM-10: se cruza con una cita web → rechazo con mensaje "otra cita"', async () => {
    await reservar({ hora_inicio: '10:00' }); // 10:00–11:30
    await expect(manual({ hora_inicio: '11:00' })).rejects.toThrow(/se cruza con otra cita de 10:00 a 11:30/);
  });

  it('TC-ADM-10b: se cruza con un bloqueo → rechazo con mensaje "un bloqueo"', async () => {
    store.set(`agenda_dia/barbero_sebas_${FECHA}`, {
      barbero_id: 'barbero_sebas',
      fecha: FECHA,
      ocupaciones: [{ id: 'bloq_1', inicio: '14:00', fin: '16:00', tipo: 'bloqueo' }],
    });
    await expect(manual({ hora_inicio: '15:00' })).rejects.toThrow(/se cruza con un bloqueo de 14:00 a 16:00/);
  });

  it('TC-ADM-11: cita pegada a otra (termina 11:30, la manual empieza 11:30) → permitida', async () => {
    await reservar({ hora_inicio: '10:00' });
    await expect(manual({ hora_inicio: '11:30' })).resolves.toBeDefined();
  });

  it('TC-ADM-12: fuera de 10:00–20:00 se permite (la interfaz solo advierte)', async () => {
    await expect(manual({ hora_inicio: '08:00' })).resolves.toMatchObject({ cita: { hora_fin: '08:30' } });
  });

  it('TC-ADM-13: celular válido → se indexa; inválido → se rechaza', async () => {
    const { token } = await manual({ cliente_telefono: '311 235 2517', hora_inicio: '12:00' });
    expect(getDocData('indice_telefonos/3112352517')?.tokens).toEqual([token]);

    await expect(manual({ cliente_telefono: '2000000000', hora_inicio: '14:00' })).rejects.toThrow(/10 dígitos y empezar por 3/);
    expect(ocupaciones().some((o) => o.inicio === '14:00')).toBe(false);
  });

  it('TC-ADM-14: "ya atendida" se guarda como completada', async () => {
    const { cita } = await manual({ estado_inicial: 'completada' });
    expect(cita.estado).toBe('completada');
  });

  it('el nombre exige mínimo 2 letras', async () => {
    await expect(manual({ cliente_nombre: ' a ' })).rejects.toThrow(/nombre del cliente/);
  });

  it.each([
    [4, false],
    [5, true],
    [600, true],
    [601, false],
  ])('duración libre de %i min → válida: %s', async (dur, ok) => {
    const p = manual({ duracion_minutos: dur, hora_inicio: '00:00' });
    if (ok) await expect(p).resolves.toBeDefined();
    else await expect(p).rejects.toThrow(/entre 5 y 600 minutos/);
  });

  it('no puede pasar de la medianoche', async () => {
    await expect(manual({ hora_inicio: '23:30', duracion_minutos: 60 })).rejects.toThrow(/medianoche/);
  });

  it('notas: se guardan recortadas; si vienen vacías el campo no existe', async () => {
    const con = await manual({ notas: '  llamó por teléfono  ', hora_inicio: '12:00' });
    expect(getDocData(`citas/${con.token}`)?.notas).toBe('llamó por teléfono');
    const sin = await manual({ notas: '   ', hora_inicio: '14:00' });
    expect(getDocData(`citas/${sin.token}`)).not.toHaveProperty('notas');
  });

  it('precio negativo o vacío se guarda como 0; decimales se redondean', async () => {
    const a = await manual({ precio: -500, hora_inicio: '12:00' });
    const b = await manual({ precio: 12500.6, hora_inicio: '14:00' });
    expect(getDocData(`citas/${a.token}`)?.precio).toBe(0);
    expect(getDocData(`citas/${b.token}`)?.precio).toBe(12501);
  });

  it('TC-ADM-16: cancelar una cita manual libera su hueco', async () => {
    const { token } = await manual({ hora_inicio: '16:00' });
    ahoraBogota('2026-11-11', '09:00');
    await cancelBooking(token);
    expect(ocupaciones()).toEqual([]);
  });
});
