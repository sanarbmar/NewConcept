// Firestore simulado en memoria SOLO para probar la lógica de negocio de bookingLogic.ts.
// No evalúa reglas de seguridad (eso lo hace tests/rules contra el emulador real).
// Imita dos propiedades del Firestore real que importan para la lógica:
//  1) Atomicidad: las escrituras de una transacción solo se aplican si la función termina sin error.
//  2) Todas las lecturas deben ir antes de cualquier escritura (si no, el SDK real lanza error).

export const store = new Map<string, any>();

export function resetStore() {
  store.clear();
}

export function getDocData(path: string) {
  const d = store.get(path);
  return d === undefined ? undefined : structuredClone(d);
}

export const fakeFirestoreModule = () => ({
  doc: (_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` }),
  runTransaction: async (_db: unknown, fn: (tx: any) => Promise<any>) => {
    const pending: Array<() => void> = [];
    let wrote = false;
    const tx = {
      get: async (ref: { path: string }) => {
        if (wrote) {
          throw new Error('Firestore transactions require all reads to be executed before all writes.');
        }
        const d = store.get(ref.path);
        return { exists: () => d !== undefined, data: () => (d === undefined ? undefined : structuredClone(d)) };
      },
      set: (ref: { path: string }, data: any, opts?: { merge?: boolean }) => {
        wrote = true;
        pending.push(() => {
          const prev = store.get(ref.path) ?? {};
          store.set(ref.path, opts?.merge ? { ...prev, ...structuredClone(data) } : structuredClone(data));
        });
      },
      update: (ref: { path: string }, data: any) => {
        wrote = true;
        pending.push(() => {
          if (!store.has(ref.path)) throw new Error(`NOT_FOUND: ${ref.path}`);
          store.set(ref.path, { ...store.get(ref.path), ...structuredClone(data) });
        });
      },
    };
    const result = await fn(tx);
    pending.forEach((apply) => apply()); // solo si fn no lanzó error
    return result;
  },
  getDoc: async () => {
    throw new Error('getDoc no está simulado en estas pruebas');
  },
  updateDoc: async () => {
    throw new Error('updateDoc no está simulado en estas pruebas');
  },
  setDoc: async () => {
    throw new Error('setDoc no está simulado en estas pruebas');
  },
});
