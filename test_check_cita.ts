import { doc, getDoc } from 'firebase/firestore';
import { db } from './src/lib/firebase';

async function checkCitaA() {
  const token = 'nc24k_2bjenzwg3dbzkt3jny';
  const citaSnap = await getDoc(doc(db, 'citas', token));
  console.log('Datos de Cita A:', citaSnap.data());
  process.exit(0);
}

checkCitaA();
