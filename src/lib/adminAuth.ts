/**
 * Barbería New Concept 24k - Control de Acceso Administrativo
 * 
 * Consulta la colección 'admins' en Firestore donde cada documento usa el correo como ID.
 * Ejemplo: admins/sanarbmar@gmail.com con { nombre: "Santiago", activo: true }
 */

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface AdminRecord {
  nombre?: string;
  activo: boolean;
  creado_en?: string;
}

/**
 * Consulta en Firestore si el correo existe en la colección 'admins' y tiene 'activo === true'.
 */
export async function checkAdminAuthorization(email?: string | null): Promise<{
  authorized: boolean;
  nombre?: string;
  adminData?: AdminRecord;
}> {
  if (!email) {
    return { authorized: false };
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const adminDocRef = doc(db, 'admins', normalizedEmail);
    const snap = await getDoc(adminDocRef);

    if (snap.exists()) {
      const data = snap.data() as AdminRecord;
      if (data && data.activo === true) {
        return {
          authorized: true,
          nombre: data.nombre || 'Administrador',
          adminData: data,
        };
      }
    }
    return { authorized: false };
  } catch (error) {
    console.error('Error verificando credenciales de administrador en Firestore:', error);
    return { authorized: false };
  }
}
