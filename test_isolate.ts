import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function testWithAllFields() {
  const token = 'nc24k_2bjenzwg3dbzkt3jny';
  const barberoId = 'sebas';
  const fecha = '2026-11-26';

  const agendaRef = doc(db, 'agenda_dia', `${barberoId}_${fecha}`);
  const snap = await getDoc(agendaRef);
  const data = snap.data()!;

  const filtradas = (data.ocupaciones as any[]).filter(o => o.id !== token);

  try {
    await updateDoc(agendaRef, {
      ...data,
      ocupaciones: filtradas,
      cita_cancelada_id: token,
      actualizado_en: new Date().toISOString(),
    });
    console.log('✅ updateDoc con todos los campos preservados exitoso');
  } catch (err: any) {
    console.error('❌ Falló updateDoc con todos los campos:', err.message);
  }

  process.exit(0);
}

testWithAllFields();
