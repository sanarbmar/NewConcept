# Cambio propuesto (NO aplicado) en `src/lib/firebase.ts`

Para que la app hable con el emulador cuando se construye con `VITE_USE_EMULATOR=1` (producción no se afecta):

```ts
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const useEmulator = import.meta.env.VITE_USE_EMULATOR === '1';

export const db = useEmulator
  ? getFirestore(app)                       // base "(default)" del emulador
  : (firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
      : getFirestore(app));

export const auth = getAuth(app);

if (useEmulator) {
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
}
```

Luego: `VITE_USE_EMULATOR=1 npx vite build && npm run test:e2e:flow`.
(El `projectId` de la app debe ser el del emulador: exporta también `VITE_FIREBASE_PROJECT_ID=demo-nc24k` o deja que el emulador acepte cualquier proyecto con `singleProjectMode:false`.)
