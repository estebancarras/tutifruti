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

---

## EPIC: Jugabilidad 2.0 (Aprobado por el usuario – sin tests hasta el final)

Objetivo: Rediseñar la jugabilidad y la interfaz para soportar 8–12 categorías en rejilla compacta, eliminar la ruleta, introducir fase de revisión/votación colaborativa y un sistema de puntuación más justo (Clásico+), finalizando la partida tras maxRounds.

### 1) Backend (server.js)
- [ ] Estado y fases:
  - [ ] Incorporar `roundPhase`: lobby → roundStart → writing → review → results → nextRound | gameEnded.
  - [ ] Añadir `reviewEndsAt`, `reviewDuration`, `votes`, `categories` dinámicas y `maxRounds` robusto.
- [ ] Eventos nuevos:
  - [ ] `roundStart` (server→clients): { letter, round, timeLimit, categories } – sustituye SHOW_ROULETTE/ROULETTE_RESULT.
  - [ ] `startReview` (server→clients): snapshot de palabras por jugador/categoría al terminar writing.
  - [ ] `castVote` (client→server): { roomId, voterName, targetPlayer, category, decision }.
  - [ ] `voteUpdate` (server→clients): progreso (opcional).
  - [ ] `reviewEnded` (server→clients): validez final por palabra.
  - [ ] `nextRound` (client→server, solo host): avanzar tras la revisión.
- [ ] Reglas de votación:
  - [ ] 1 voto por (voter, target, category); autor no vota; rate limit ligero.
  - [ ] Mayoría simple. Empate: el anfitrión decide manualmente (UI de resolución).
  - [ ] Política de timeout: preferencia bloquear hasta resolución del host (confirmado con el usuario).
- [ ] Scoring Clásico+:
  - [ ] Única: +10, Repetida: +5, Inválida: 0, +3 sílabas: +2, bonus letra rara (Q/X/Z/W) opcional.
  - [ ] Integrar con consolidación de validez por votos.

### 2) Frontend – Constants y Managers
- [ ] `utils/constants.js`:
  - [ ] Definir `GAME_PHASES`, `REVIEW_TIME`, `SCORING_MODE`, `RARE_LETTER_BONUS_ENABLED`.
  - [ ] Ampliar `CATEGORIES` (propuesta base de 10): NOMBRE, ANIMAL, COSA, FRUTA, PAIS, COLOR, COMIDA, CIUDAD, PROFESION, MARCA.
- [ ] `public/js/socket-manager.js`:
  - [ ] Soporte a eventos nuevos (on/emit): roundStart, startReview, castVote, voteUpdate, reviewEnded, nextRound.
- [ ] `public/js/game-state.js`:
  - [ ] Manejo de `roundPhase` y bloqueo de inputs fuera de writing.
  - [ ] Validaciones previas al submit (todas las palabras deben iniciar con la letra).

### 3) Frontend – UI/UX del juego (views/game.html + public/css/game.css + ui-manager)
- [ ] Rejilla de categorías (sin ruleta):
  - [ ] Header sticky: “Letra X” grande + timer + botón “Enviar” sticky (mobile-first).
  - [ ] Grid responsive: repeat(auto-fit, minmax(220–260px, 1fr)), 2–4 columnas.
  - [ ] Inputs compactos: título + input; validación instantánea y colorización accesible.
- [ ] Pantalla de Revisión/Votación (inspiración bastaonline.net):
  - [ ] Modal/Sección: agrupación por categoría; por cada jugador: palabra + botones ✔️/❌, sin auto-voto.
  - [ ] Barra de progreso de tiempo de revisión; accesos de teclado (V/X); navegación por Tab.
  - [ ] Resolución de empates por parte del host (UI lista de empates).
  - [ ] Botón “Siguiente Ronda” visible solo para el host al finalizar la revisión.
- [ ] Resultados de ronda:
  - [ ] Desglose por categoría (válida/ inválida, única/repetida, bonus) + ranking parcial.

### 4) Accesibilidad y Atajos
- [ ] Aria-live para letra y timer; focus inicial; Ctrl+Enter para Enviar.
- [ ] En revisión: atajos V (válida), X (inválida), ESC cierra modales si corresponde.

### 5) Integración sin tests (hasta el final)
- [ ] Implementar todo el flujo anterior.
- [ ] Validación manual rápida para UX y consistencia.
- [ ] Al terminar, crear/ajustar batería de tests (Jest + Playwright) para cubrir:
  - [ ] Fases completas con 3–5 rondas.
  - [ ] Revisión y consolidación de votos (incl. empates resueltos por host).
  - [ ] Scoring Clásico+ y ranking.
  - [ ] Rehidratación, límites y robustez.

Seguimiento:
- Tras cerrar esta EPIC, evaluar personalización de categorías por sala y almacenamiento persistente.
