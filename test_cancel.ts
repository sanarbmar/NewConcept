import { doc, getDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';
import { createBookingTransaction, cancelBooking, OcupacionSlot } from './src/lib/bookingLogic';

async function testCancelConcurrenceAndPreservation() {
  console.log('=== TEST: CANCELACIÓN ATÓMICA Y PRESERVACIÓN DE OTRAS CITAS ===\n');

  // Usar fecha única para aislar de pruebas anteriores
  const testFecha = '2026-11-26';
  const barberoId = 'sebas';
  const barberoNombre = 'Sebastián';

  // 1. Reservar Cita A (09:00 - 09:45)
  console.log('1. Reservando Cita A (09:00)...');
  const resA = await createBookingTransaction({
    cliente_nombre: 'Cliente A (Para Cancelar)',
    cliente_telefono: '3112352517',
    barbero_id: barberoId,
    barbero_nombre: barberoNombre,
    servicio_id: 'corte-tradicional',
    servicio_nombre: 'Corte Tradicional',
    precio: 25000,
    duracion_minutos: 45,
    fecha: testFecha,
    hora_inicio: '09:00',
    consentimiento_datos: true,
  });
  const tokenA = resA.token;
  console.log('✅ Cita A creada con token:', tokenA);

  // 2. Reservar Cita B (10:30 - 11:15)
  console.log('\n2. Reservando Cita B (10:30)...');
  const resB = await createBookingTransaction({
    cliente_nombre: 'Cliente B (Permanente)',
    cliente_telefono: '3123456789',
    barbero_id: barberoId,
    barbero_nombre: barberoNombre,
    servicio_id: 'corte-tradicional',
    servicio_nombre: 'Corte Tradicional',
    precio: 25000,
    duracion_minutos: 45,
    fecha: testFecha,
    hora_inicio: '10:30',
    consentimiento_datos: true,
  });
  const tokenB = resB.token;
  console.log('✅ Cita B creada con token:', tokenB);

  // Verificar estado de agenda_dia previo a cancelación
  const agendaRef = doc(db, 'agenda_dia', `${barberoId}_${testFecha}`);
  let agendaSnap = await getDoc(agendaRef);
  let ocupaciones: OcupacionSlot[] = agendaSnap.data()?.ocupaciones || [];
  console.log('\nEstado de agenda_dia antes de cancelar:');
  console.log('Total ocupaciones:', ocupaciones.length);
  console.log('Slots:', ocupaciones.map(o => `${o.inicio}-${o.fin} (${o.id})`));

  if (ocupaciones.length !== 2) {
    throw new Error(`Se esperaban 2 ocupaciones, pero hay ${ocupaciones.length}`);
  }

  // 3. Cancelar la Cita A desde cancelBooking (como lo hace el cliente en enlace de gestión)
  console.log('\n3. Cancelando Cita A con cancelBooking...');
  await cancelBooking(tokenA, 'Cancelación de prueba por el cliente');
  console.log('✅ cancelBooking finalizó sin errores.');

  // 4. Verificaciones
  console.log('\n--- VERIFICACIONES TRAS CANCELACIÓN ---');

  // a) Verificar que en la colección 'citas', Cita A esté cancelada
  const citaASnap = await getDoc(doc(db, 'citas', tokenA));
  const estadoCitaA = citaASnap.data()?.estado;
  console.log('(a) Estado de Cita A en Firestore:', estadoCitaA);
  const esCancelada = estadoCitaA === 'cancelada';

  // b) y (c) Verificar en agenda_dia que A ya no esté y B siga intacta
  agendaSnap = await getDoc(agendaRef);
  ocupaciones = agendaSnap.data()?.ocupaciones || [];
  console.log('(b y c) Ocupaciones restantes en agenda_dia:', ocupaciones.length);
  console.log('Slots restantes:', ocupaciones.map(o => `${o.inicio}-${o.fin} (${o.id})`));

  const contieneA = ocupaciones.some(o => o.id === tokenA);
  const contieneB = ocupaciones.some(o => o.id === tokenB);

  console.log('\nRESULTADOS FINALES:');
  console.log('¿Cancelación completada SIN error de permisos?: true');
  console.log('¿Franja de A ya NO está en agenda_dia?:', !contieneA);
  console.log('¿Franja de B sigue INTACTA en agenda_dia?:', contieneB);
  console.log('¿Total de franjas es exactamente 1?:', ocupaciones.length === 1);

  if (!esCancelada || contieneA || !contieneB || ocupaciones.length !== 1) {
    throw new Error('Falla en las verificaciones de cancelación.');
  }

  console.log('\n🎉 TEST SUPERADO EXITOSAMENTE.');
  process.exit(0);
}

testCancelConcurrenceAndPreservation().catch((err) => {
  console.error('\n❌ ERROR EN EL TEST:', err);
  process.exit(1);
});
