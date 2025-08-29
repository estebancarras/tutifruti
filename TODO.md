# TODO - Pruebas exhaustivas y estabilización Tutifrutti

Aprobado por el usuario: realizar pruebas exhaustivas y aplicar correcciones mínimas para alinear E2E con el flujo real y mejorar estabilidad.

## 1) Cambios de código planificados
- [ ] E2E: Actualizar tests/e2e/room-flow.spec.js para:
  - [ ] Hacer clic en "#createRoomButton" dentro de create-room.html antes de leer el código.
  - [ ] Esperar a que "#roomCodeValue" tenga texto que cumpla /[a-z0-9]{5,}/i.
- [ ] views/game.html:
  - [ ] Corregir handlePlayerJoined (bloque truncado y uso de variable no definida).
  - [ ] Ocultar ruleta por defecto (mostrarla solo tras SHOW_ROULETTE).
  - [ ] Ocultar botón "Girar Ruleta" por defecto (mostrar solo para host tras SHOW_ROULETTE).
- [ ] views/create-room.html (opcional, aprobado por el usuario):
  - [ ] Quitar la pre-generación local de `roomId` (el servidor ya genera el ID); mantener solo actualización con ROOM_CREATED.
- [ ] Validar que no se introduzcan regresiones visuales/UX (accesibilidad básica, mensajes y notificaciones).

## 2) Pruebas a ejecutar
- [ ] Unitarias/Integración (Jest):
  - [ ] npm test (confirmar 3/3 PASS).
- [ ] E2E (Playwright):
  - [ ] npm run e2e
  - [ ] Si falla, revisar test-results/**/error-context.md y ajustar.
  - [ ] Opcional: npm run e2e:headed para depuración visual.
- [ ] Prueba manual rápida (smoke):
  - [ ] Flujo: index -> create-room -> crear sala -> join-room -> unir con código -> iniciar -> game -> ruleta -> temporizador -> enviar palabras -> resultados.

## 3) Criterios de aceptación
- [ ] Todas las pruebas Jest pasan (3/3).
- [ ] Prueba E2E room-flow pasa.
- [ ] No hay errores evidentes en consola del navegador (cliente) durante el flujo principal.
- [ ] La UI no muestra ruleta ni botón de girar hasta recibir SHOW_ROULETTE.
- [ ] handlePlayerJoined en game.html actualiza correctamente la lista de jugadores y notifica sin usar variables no definidas.

## 4) Notas y seguimiento
- Dependencias de producción (CORS restringido, session store con MongoStore) y limpieza de funciones legacy en server.js se dejarán para una fase posterior tras estabilizar pruebas.
- Tras completar, se valorará ampliar la batería de E2E para cubrir reconexión y edge cases.
