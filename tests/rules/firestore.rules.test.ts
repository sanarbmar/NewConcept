/**
 * Pruebas de firestore.rules contra el EMULADOR (nunca contra producción).
 * Cubre TC-SEC-01..13. Ejecutar con:  npm run test:rules
 *
 * Los tests marcados `it.fails` documentan RIESGOS conocidos de las reglas actuales:
 * pasan (en verde) mientras el riesgo exista y se pondrán en rojo cuando lo corrijas -> entonces quita `.fails`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

let env: RulesTestEnvironment;

const ADMIN = 'admin@nc24k.test';
const ADMIN_INACTIVO = 'inactivo@nc24k.test';
const FECHA = '2026-11-11';
const BARBERO = 'barbero_sebas';
const TOKEN = 'nc24k_ABCDEFGHIJKLMNOPQR'; // nc24k_ + 18
const TOKEN2 = 'nc24k_ZYXWVUTSRQPONMLKJI';
const TEL = '3112352517';

const anon = () => env.unauthenticatedContext().firestore();
const admin = () => env.authenticatedContext('uid-admin', { email: ADMIN }).firestore();
const inactivo = () => env.authenticatedContext('uid-inac', { email: ADMIN_INACTIVO }).firestore();
const otroUsuario = () => env.authenticatedContext('uid-x', { email: 'otro@nc24k.test' }).firestore();

const citaBase = (token = TOKEN, extra: Record<string, unknown> = {}) => ({
  cliente_nombre: 'Carlos Prueba',
  cliente_telefono: TEL,
  barbero_id: BARBERO,
  servicio_id: 'corte',
  fecha: FECHA,
  hora_inicio: '10:00',
  hora_fin: '11:30',
  estado: 'confirmada',
  token_gestion: token,
  consentimiento_datos: true,
  ...extra,
});

const slot = (token = TOKEN, inicio = '10:00', fin = '11:30') => ({ id: token, inicio, fin, tipo: 'cita' });

/** Reserva atómica como lo hace createBookingTransaction (cita + agenda_dia + indice). */
async function reservar(db: any, token = TOKEN, cita = citaBase(token), existentes: any[] = [], tokensTel: string[] = []) {
  const b = writeBatch(db);
  b.set(doc(db, 'citas', token), cita);
  b.set(
    doc(db, 'agenda_dia', `${cita.barbero_id}_${cita.fecha}`),
    {
      barbero_id: cita.barbero_id,
      fecha: cita.fecha,
      ocupaciones: [...existentes, slot(token, cita.hora_inicio, cita.hora_fin)],
      cita_agregada_id: token,
    },
    { merge: true },
  );
  b.set(doc(db, 'indice_telefonos', cita.cliente_telefono), { telefono: cita.cliente_telefono, tokens: [...tokensTel, token] }, { merge: true });
  return b.commit();
}

/** Cancelación como cancelBooking (cita + liberar slot). */
async function cancelar(db: any, token = TOKEN, restantes: any[] = []) {
  const b = writeBatch(db);
  b.update(doc(db, 'citas', token), { estado: 'cancelada', cancelado_en: new Date().toISOString(), motivo_cancelacion: 'test' });
  b.update(doc(db, 'agenda_dia', `${BARBERO}_${FECHA}`), {
    barbero_id: BARBERO,
    fecha: FECHA,
    ocupaciones: restantes,
    cita_cancelada_id: token,
  });
  return b.commit();
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-nc24k',
    firestore: { rules: readFileSync(resolve(__dirname, '../../', process.env.RULES_FILE || 'firestore.rules'), 'utf8') },
  });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins', ADMIN), { activo: true, nombre: 'Admin' });
    await setDoc(doc(db, 'admins', ADMIN_INACTIVO), { activo: false });
    await setDoc(doc(db, 'barberos', BARBERO), { nombre: 'Sebastián' });
    await setDoc(doc(db, 'servicios', 'corte'), { nombre: 'Corte' });
    await setDoc(doc(db, 'bloqueos', 'b1'), { fecha: FECHA });
  });
});

/** Siembra una cita ya reservada (sin pasar por reglas). */
async function sembrarReserva(token = TOKEN, cita = citaBase(token), existentes: any[] = []) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'citas', token), cita);
    await setDoc(doc(db, 'agenda_dia', `${cita.barbero_id}_${cita.fecha}`), {
      barbero_id: cita.barbero_id, fecha: cita.fecha,
      ocupaciones: [...existentes, slot(token, cita.hora_inicio, cita.hora_fin)],
      cita_agregada_id: token,
    });
    await setDoc(doc(db, 'indice_telefonos', cita.cliente_telefono), { telefono: cita.cliente_telefono, tokens: [token] });
  });
}

describe('Citas — creación por cliente anónimo (TC-SEC-04/05)', () => {
  it('TC-SEC-04 reserva atómica válida (cita + agenda + índice) es aceptada', async () => {
    await assertSucceeds(reservar(anon()));
  });
  it('TC-SEC-05a rechaza estado distinto de "confirmada"', async () => {
    await assertFails(reservar(anon(), TOKEN, citaBase(TOKEN, { estado: 'completada' })));
  });
  it('TC-SEC-05b rechaza teléfono inválido', async () => {
    await assertFails(reservar(anon(), TOKEN, citaBase(TOKEN, { cliente_telefono: '2112352517' })));
    await assertFails(reservar(anon(), TOKEN, citaBase(TOKEN, { cliente_telefono: '311235251' })));
  });
  it('TC-SEC-05c rechaza sin consentimiento de datos', async () => {
    await assertFails(reservar(anon(), TOKEN, citaBase(TOKEN, { consentimiento_datos: false })));
  });
  it('TC-SEC-05d rechaza token distinto al ID o menor a 16 caracteres', async () => {
    await assertFails(setDoc(doc(anon(), 'citas', TOKEN), citaBase(TOKEN2)));
    await assertFails(setDoc(doc(anon(), 'citas', 'corto'), citaBase('corto')));
  });
  it('TC-SEC-05e rechaza nombre de 1 carácter', async () => {
    await assertFails(reservar(anon(), TOKEN, citaBase(TOKEN, { cliente_nombre: 'A' })));
  });
  it('TC-SEC-05f rechaza cita sin su franja en agenda_dia coherente (hora distinta)', async () => {
    const db = anon();
    const b = writeBatch(db);
    b.set(doc(db, 'citas', TOKEN), citaBase(TOKEN));
    b.set(doc(db, 'agenda_dia', `${BARBERO}_${FECHA}`), {
      barbero_id: BARBERO, fecha: FECHA, ocupaciones: [slot(TOKEN, '15:00', '16:30')], cita_agregada_id: TOKEN,
    });
    await assertFails(b.commit());
  });
  it('TC-SEC-05g agenda_dia: no se puede crear con 2 franjas de golpe', async () => {
    const db = anon();
    const b = writeBatch(db);
    b.set(doc(db, 'citas', TOKEN), citaBase(TOKEN));
    b.set(doc(db, 'agenda_dia', `${BARBERO}_${FECHA}`), {
      barbero_id: BARBERO, fecha: FECHA, ocupaciones: [slot(TOKEN), slot(TOKEN2, '12:00', '13:30')], cita_agregada_id: TOKEN,
    });
    await assertFails(b.commit());
  });
});

describe('Citas — lectura (TC-SEC-01/02/03)', () => {
  beforeEach(async () => { await sembrarReserva(); });
  it('TC-SEC-01 anónimo NO puede listar citas', async () => {
    await assertFails(getDocs(collection(anon(), 'citas')));
  });
  it('TC-SEC-02 anónimo con el token (ID) puede leer su cita', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'citas', TOKEN)));
  });
  it('TC-SEC-03 leer un token inexistente es denegado (la UI lo muestra como "Cita no encontrada")', async () => {
    await assertFails(getDoc(doc(anon(), 'citas', 'nc24k_NOEXISTE00000000000')));
  });
  it('admin activo puede listar; admin inactivo y usuario no admin no', async () => {
    await assertSucceeds(getDocs(collection(admin(), 'citas')));
    await assertFails(getDocs(collection(inactivo(), 'citas')));
    await assertFails(getDocs(collection(otroUsuario(), 'citas')));
  });
});

describe('Citas — actualización y borrado por cliente (TC-SEC-06/07/08)', () => {
  beforeEach(async () => { await sembrarReserva(); });
  it('TC-SEC-06 cancelar su cita libera la franja (cita + agenda_dia atómico)', async () => {
    await assertSucceeds(cancelar(anon(), TOKEN, []));
  });
  it('TC-SEC-06b cancelar dejando otras citas del día intactas', async () => {
    await env.clearFirestore();
    await sembrarReserva(TOKEN, citaBase(TOKEN), [slot(TOKEN2, '14:00', '15:30')]);
    await assertSucceeds(cancelar(anon(), TOKEN, [slot(TOKEN2, '14:00', '15:30')]));
  });
  it('TC-SEC-07a cliente NO puede cambiar hora/nombre/teléfono', async () => {
    await assertFails(updateDoc(doc(anon(), 'citas', TOKEN), { hora_inicio: '12:00' }));
    await assertFails(updateDoc(doc(anon(), 'citas', TOKEN), { cliente_nombre: 'Otro', estado: 'cancelada' }));
  });
  it('TC-SEC-07b cliente NO puede marcar completada / no_show', async () => {
    await assertFails(updateDoc(doc(anon(), 'citas', TOKEN), { estado: 'completada' }));
    await assertFails(updateDoc(doc(anon(), 'citas', TOKEN), { estado: 'no_show' }));
  });
  it('TC-SEC-08 cliente NO puede borrar citas; admin sí', async () => {
    await assertFails(deleteDoc(doc(anon(), 'citas', TOKEN)));
    await assertSucceeds(deleteDoc(doc(admin(), 'citas', TOKEN)));
  });
  it('cancelar sin liberar la franja ES permitido por las reglas (riesgo: franja "fantasma") — documentado', async () => {
    // Las reglas no obligan a liberar agenda_dia al cancelar: solo la lógica del cliente lo hace.
    await assertSucceeds(updateDoc(doc(anon(), 'citas', TOKEN), { estado: 'cancelada', cancelado_en: 'x', motivo_cancelacion: 'y' }));
  });
});

describe('Colecciones de catálogo y admins (TC-SEC-09/10)', () => {
  it('TC-SEC-09 barberos/servicios/bloqueos: lectura pública, escritura solo admin', async () => {
    for (const [col, id] of [['barberos', BARBERO], ['servicios', 'corte'], ['bloqueos', 'b1']] as const) {
      await assertSucceeds(getDoc(doc(anon(), col, id)));
      await assertFails(setDoc(doc(anon(), col, id), { x: 1 }));
      await assertFails(setDoc(doc(inactivo(), col, id), { x: 1 }));
      await assertSucceeds(setDoc(doc(admin(), col, id), { x: 1 }));
    }
  });
  it('TC-SEC-10a admins: solo get de su propio documento; nunca list ni write', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'admins', ADMIN)));
    await assertFails(getDoc(doc(admin(), 'admins', ADMIN_INACTIVO)));
    await assertFails(getDoc(doc(anon(), 'admins', ADMIN)));
    await assertFails(getDocs(collection(admin(), 'admins')));
    await assertFails(setDoc(doc(admin(), 'admins', 'nuevo@x.com'), { activo: true }));
  });
  it('TC-SEC-10b colección desconocida: todo denegado, incluso admin', async () => {
    await assertFails(getDoc(doc(admin(), 'otra_cosa', 'x')));
    await assertFails(setDoc(doc(admin(), 'otra_cosa', 'x'), { a: 1 }));
  });
});

describe('indice_telefonos (TC-SEC-11)', () => {
  beforeEach(async () => { await sembrarReserva(); });
  it('get por ID de 10 caracteres permitido (RIESGO: quien conozca un celular obtiene todos sus tokens)', async () => {
    await assertSucceeds(getDoc(doc(anon(), 'indice_telefonos', TEL)));
  });
  it('anónimo NO puede listar; ID que no mide 10 caracteres denegado', async () => {
    await assertFails(getDocs(collection(anon(), 'indice_telefonos')));
    await assertFails(getDoc(doc(anon(), 'indice_telefonos', '311235251')));
  });
  it('anónimo NO puede quitar tokens del índice', async () => {
    await assertFails(setDoc(doc(anon(), 'indice_telefonos', TEL), { telefono: TEL, tokens: [] }));
  });
  it.fails('RIESGO-R1: cualquiera puede AGREGAR tokens ajenos a un celular (contaminación del índice) — debería denegarse', async () => {
    await assertFails(setDoc(doc(anon(), 'indice_telefonos', TEL), { telefono: TEL, tokens: [TOKEN, 'nc24k_basuraaaaaaaaaaaaaa'] }));
  });
});

describe('agenda_dia — integridad (TC-SEC-12/13)', () => {
  beforeEach(async () => { await sembrarReserva(); });
  it('TC-SEC-12a nadie puede borrar agenda_dia salvo admin', async () => {
    await assertFails(deleteDoc(doc(anon(), 'agenda_dia', `${BARBERO}_${FECHA}`)));
    await assertSucceeds(deleteDoc(doc(admin(), 'agenda_dia', `${BARBERO}_${FECHA}`)));
  });
  it('TC-SEC-12b anónimo no puede vaciar ocupaciones sin una cita cancelada que lo respalde', async () => {
    await assertFails(updateDoc(doc(anon(), 'agenda_dia', `${BARBERO}_${FECHA}`), { ocupaciones: [] }));
  });
  it('TC-SEC-12c anónimo no puede agregar franja sin cita que la respalde', async () => {
    await assertFails(updateDoc(doc(anon(), 'agenda_dia', `${BARBERO}_${FECHA}`), {
      ocupaciones: [slot(TOKEN), slot('nc24k_fantasmaaaaaaaaaaaa', '16:00', '17:30')],
      cita_agregada_id: 'nc24k_fantasmaaaaaaaaaaaa',
    }));
  });
  it.fails('RIESGO-R2 (= DEFECTO-01/02 a nivel servidor): las reglas aceptan una cita en domingo y a las 03:00 — debería denegarse', async () => {
    const domingo = '2026-11-15';
    await assertFails(reservar(anon(), TOKEN2, citaBase(TOKEN2, { fecha: domingo, hora_inicio: '03:00', hora_fin: '04:30' })));
  });
  it.fails('RIESGO-R3: las reglas aceptan una cita con barbero_id/servicio_id inexistentes — debería denegarse', async () => {
    await assertFails(reservar(anon(), TOKEN2, citaBase(TOKEN2, { barbero_id: 'inventado', servicio_id: 'xyz', hora_inicio: '12:00', hora_fin: '13:30' })));
  });
  it.fails('RIESGO-R4: las reglas no impiden solapar dos citas en la misma franja (solo la transacción del cliente lo evita)', async () => {
    // Un cliente "malicioso" salta la transacción y agrega otra cita 10:30-12:00 encima de la existente.
    await assertFails(reservar(anon(), TOKEN2, citaBase(TOKEN2, { hora_inicio: '10:30', hora_fin: '12:00', cliente_telefono: '3009998877' }), [slot(TOKEN)]));
  });
});
