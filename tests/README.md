# Pruebas automatizadas — New Concept 24k

| Capa | Comando | Requiere | Qué cubre |
|---|---|---|---|
| Unitarias (lógica) | `npm run test:unit` | nada | disponibilidad, reservas, cancelación, citas manuales, utilidades, catálogo |
| Unitarias en 4 zonas horarias | `npm run test:unit:tz` | nada | independencia de la zona horaria del navegador |
| UI en Chrome | `npm run build && CHROME_PATH=/ruta/chrome npm run test:e2e:ui` | Chrome o `npx playwright install chromium` | landing, FAQ, rutas, accesibilidad (axe), responsive |
| Reglas de Firestore | `npm run test:rules` | **Java 21+** (el emulador se descarga solo) | TC-SEC-01..13 |
| Flujo completo | `VITE_USE_EMULATOR=1 npm run build && npm run test:e2e:flow` | Java + cambio de `PATCH-emulador.md` | reserva, carrera, cancelación |

Seguridad: ninguna prueba escribe en el Firestore de producción (`newconcept24kbarberia`). Las de UI bloquean toda la red externa.
Los tests `it.fails` / `test.fail()` documentan defectos conocidos: están en verde mientras el defecto exista; al corregirlo se ponen en rojo y se quita la marca.
