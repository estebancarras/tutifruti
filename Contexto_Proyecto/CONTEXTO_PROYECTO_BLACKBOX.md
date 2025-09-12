# TUTIFRUTTI - Contexto Completo del Proyecto para BlackBox AI

## 📋 RESUMEN EJECUTIVO

**Tutifrutti** es un juego web multijugador en tiempo real desarrollado con HTML5, CSS3, JavaScript vanilla, Node.js, Express y Socket.IO. Los jugadores se conectan a salas virtuales donde deben completar categorías con palabras que empiecen con una letra específica, compitiendo por puntuaciones basadas en originalidad y complejidad silábica.

### Estado Actual del Proyecto
- ✅ **Backend robusto** con manejo de reconexiones, rate limiting y sanitización
- ✅ **Frontend modularizado** con ES Modules y diseño responsive
- ✅ **Flujo dual** manteniendo compatibilidad legacy (ruleta) y preparado para flujo moderno
- ✅ **Testing exhaustivo** con Jest (backend) y Playwright (E2E)
- ⚠️ **3 tests E2E intermitentes** necesitan estabilización
- 🚀 **Listo para activar flujo moderno** con auto-letra y 10 categorías

---

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Tecnológico
```
Frontend: HTML5 + CSS3 + JavaScript (ES Modules)
Backend: Node.js + Express.js + Socket.IO
Testing: Jest (backend) + Playwright (E2E)
Deployment: Local + LocalTunnel para acceso público
```

### Estructura de Archivos
```
tutifruti/
├── server.js                      # Servidor principal con lógica de juego
├── index.html                     # Página de inicio
├── views/
│   ├── create-room.html           # Crear sala (host)
│   ├── join-room.html            # Unirse a sala
│   └── game.html                 # Interfaz principal del juego
├── public/
│   ├── js/
│   │   ├── socket-manager.js     # Cliente Socket.IO
│   │   ├── game-state.js         # Estado del juego
│   │   └── ui-manager.js         # Gestión de UI
│   └── css/
│       ├── base.css              # Estilos base
│       ├── components.css        # Componentes
│       └── game.css              # Específicos del juego
├── utils/
│   ├── constants.js              # Constantes globales
│   └── helpers.js                # Funciones auxiliares
├── tests/
│   ├── *.test.js                 # Tests Jest backend
│   └── e2e/                      # Tests Playwright E2E
└── scripts/
    └── tunnel.js                 # LocalTunnel para acceso público
```

---

## 🎮 LÓGICA DE JUEGO

### Flujos Disponibles

#### 1. Flujo Legacy (Ruleta) - ACTIVO
```
1. Host crea sala → jugadores se unen
2. Host inicia juego → SHOW_ROULETTE
3. Host gira ruleta → ROULETTE_RESULT + letra
4. Todos escriben palabras (60s)
5. Envío automático → scoring clásico → resultados
6. Siguiente ronda o fin de juego
```

#### 2. Flujo Moderno - PREPARADO
```
1. Host crea sala → jugadores se unen  
2. Host inicia juego → ROUND_START + letra automática
3. Todos escriben en 10 categorías (60s)
4. Fase de revisión/votación (20s)
5. Host avanza → scoring con votos → resultados
6. Auto-letra siguiente ronda
```

### Sistema de Puntuación (Clásico)
```javascript
REPETIDAS = 1 punto
ÚNICAS = 2 puntos  
+3 SÍLABAS = +3 puntos adicionales
```

### Categorías Soportadas
**Por defecto (10):** NOMBRE, ANIMAL, COSA, FRUTA, PAIS, COLOR, COMIDA, CIUDAD, PROFESION, MARCA

---

## 🔧 COMPONENTES CLAVE

### Server.js - Backend Core
```javascript
// CARACTERÍSTICAS PRINCIPALES:
- Temporizador con fuente de verdad en servidor
- Reconexión robusta con período de gracia (15s)
- Rate limiting básico por socket
- Sanitización de inputs (normalización Unicode, límites)
- Compatibilidad dual: eventos legacy + nuevos
- Reasignación automática de anfitrión
- Limpieza tardía de salas vacías (5min)
- API REST: GET /activeRooms

// EVENTOS SOCKET.IO CLAVE:
- createRoom, joinRoom, startGame, spinRoulette
- getRoomState, reconnectPlayer (rehidratación)
- submitWords, castVote, nextRound
- timerUpdate, roundEnded, gameEnded
```

### Frontend Modular

#### socket-manager.js
```javascript
// Abstracción Socket.IO con:
- Reconexión automática transparente
- Gestión centralizada de eventos
- Métodos específicos del juego
- Limpieza de listeners
```

#### game-state.js  
```javascript
// Estado centralizado del cliente:
- Lista de jugadores y rol de host
- Letra actual y tiempo restante
- Puntuaciones acumuladas
- Control de inputs (enable/disable)
- Sincronización con servidor vía TIMER_UPDATE
```

#### ui-manager.js
```javascript
// Gestión completa de UI:
- Accesibilidad (ARIA, navegación por teclado)
- Grilla dinámica de categorías
- Modal de revisión/votación
- Ruleta con animaciones precisas
- Anuncios para lectores de pantalla
```

### Vistas HTML

#### views/game.html
```html
<!-- CARACTERÍSTICAS: -->
- Grilla dinámica hasta 10 categorías
- Validación visual en tiempo real
- Navegación por teclado (Enter, Tab)
- Temporizador sincronizado con servidor
- Modal de resultados con puntuaciones detalladas
- Controles diferenciados host/invitado
```

#### views/create-room.html
```html
<!-- FLUJO HOST: -->
- Configuración de sala (nombre, rondas 1-20)
- Lista dinámica de jugadores conectados
- Código de sala copiable al portapapeles  
- Redirección coordinada al iniciar juego
- Prevención de doble clic con spinners
```

#### views/join-room.html
```html
<!-- FLUJO INVITADO: -->
- Unión por código o lista de salas activas
- Sala de espera hasta que host inicie
- Actualización en tiempo real de jugadores
- Redirección automática cuando inicia el juego
- Funcionalidad de salir de sala
```

---

## 🧪 TESTING Y CALIDAD

### Tests Backend (Jest) - 6 suites/10 tests ✅
```
✅ create-join.test.js - Creación y unión de salas
✅ rounds-flow.test.js - Flujo completo de rondas  
✅ reconnection-and-scoring.test.js - Reconexión y scoring
✅ edge-cases.test.js - Casos límite y validaciones
✅ timer-source-of-truth.test.js - Temporizador servidor
✅ active-rooms.api.test.js - API REST de salas
```

### Tests E2E (Playwright) - Estado Mixto
```
✅ room-flow.spec.js - Crear→unirse→jugar (PASSED)
✅ rounds-flow.spec.js - Múltiples rondas (PASSED)  
✅ a11y.spec.js - Accesibilidad (PASSED)
⚠️ frontend-robustness-fixed.spec.js - 7/10 PASSED

TESTS INTERMITENTES (necesitan estabilización):
- "Navegación por teclado - Crear sala"
- "Prevención doble clic - Botones críticos"  
- "Limpieza de memoria - Múltiples navegaciones"

CAUSA: Timing de revelado de #roomInfo dependiente de llegada del evento ROOM_CREATED
```

### Problemas de Estabilización Identificados
```javascript
// PROBLEMA:
await expect(page.locator('#roomInfo')).not.toHaveClass('hidden');
// Compite con el tiempo de emisión del servidor

// SOLUCIÓN RECOMENDADA:
1. Añadir data-testid cuando se revela roomInfo
2. Usar expect.poll para esperar estado listo
3. Señales inequívocas vs timing arbitrario
4. Mock de socket para determinismo (avanzado)
```

---

## 🚀 DEPLOYMENT Y CONFIGURACIÓN

### Ejecución Local
```bash
# Instalar dependencias
npm install

# Desarrollo local
npm start  # http://localhost:3000

# Acceso público (LocalTunnel)
npm run online  # Genera URL pública compartible

# Testing
npm test           # Jest backend
npm run e2e        # Playwright E2E
npm run e2e:headed # Con interfaz visual
```

### Variables de Entorno
```bash
PORT=3000                    # Puerto del servidor
SESSION_SECRET=tutifruti_secret_key  # Clave de sesión
```

### Configuración de Red
```javascript
// server.js - CORS configurado para desarrollo
cors: {
  origin: '*',              // En producción: dominios específicos
  methods: ['GET', 'POST']
}
```

---

## 🐛 PROBLEMAS CONOCIDOS Y SOLUCIONES

### 1. Tests E2E Intermitentes
**Problema:** 3 tests fallan esporádicamente por timing
**Causa:** Dependencia de `networkidle` y revelado asíncrono de UI
**Solución:** Implementar señales deterministas con data-testid

### 2. Compatibilidad de Flujos
**Situación:** Flujo legacy activo, moderno preparado
**Objetivo:** Migración gradual sin romper tests existentes
**Plan:** Activar flujo moderno progresivamente

### 3. Rate Limiting Básico
**Estado:** Implementación simple por socket
**Mejora:** Rate limiting distribuido para escalabilidad

---

## 🔮 ROADMAP Y PRÓXIMOS PASOS

### Inmediato (Sprint Actual)
1. **Estabilizar 3 tests E2E intermitentes**
2. **Activar flujo moderno progresivamente**
3. **QA adicional para revisión/voto**

### Corto Plazo
```
- Métricas de performance bajo concurrencia
- Tests específicos para grilla 10 categorías  
- Instrumentación opcional de métricas
- Eliminación gradual de dependencias ruleta
```

### Medio Plazo
```
- Salas privadas con contraseña
- Configuración dinámica de categorías
- Modo competitivo con reglas avanzadas
- Persistencia de puntuaciones históricas
```

---

## 📚 GUÍAS DE DESARROLLO

### Agregar Nueva Categoría
```javascript
// 1. utils/constants.js
CATEGORIES: [...existing, 'NUEVA_CATEGORIA']

// 2. Automático: UI se adapta dinámicamente
// 3. Testing: Verificar en rounds-flow.spec.js
```

### Crear Nuevo Evento Socket.IO
```javascript
// 1. utils/constants.js
SOCKET_EVENTS: { NEW_EVENT: 'newEvent' }

// 2. server.js  
socket.on(SOCKET_EVENTS.NEW_EVENT, (data) => { /* lógica */ });

// 3. socket-manager.js
newEvent(data) { this.emit(SOCKET_EVENTS.NEW_EVENT, data); }

// 4. Testing: Añadir caso en tests Jest
```

### Añadir Test E2E
```javascript
// tests/e2e/new-feature.spec.js
test('Nueva funcionalidad', async ({ page }) => {
  // Usar patrones existentes para consistencia
  await page.goto(BASE);
  await expect(page.locator('#elemento')).toBeVisible();
});
```

---

## 🎯 CRITERIOS DE ACEPTACIÓN

### Para Tests Robustos
```
✅ Esperar señales inequívocas (data-testid)
✅ Usar expect.poll para estados asincrónicos  
✅ Timeouts apropriados (15s para operaciones de red)
✅ Navegación explícita vs goBack()
✅ Verificar estados enabled/disabled antes de interactuar
```

### Para Funcionalidades
```
✅ Reconexión exitosa en <300ms
✅ Sincronización de temporizador ±1s
✅ Prevención de doble envío
✅ Accesibilidad (navegación por teclado completa)
✅ Responsive en móvil/tablet
```

---

## 🔐 SEGURIDAD Y VALIDACIÓN

### Sanitización Implementada
```javascript
// server.js
function sanitizeName(name) {
  const normalized = name.normalize('NFC');
  const trimmed = normalized.trim().slice(0, 20);
  return trimmed.replace(/\s+/g, ' ');
}

// Validaciones:
- Longitud máxima de inputs (20-50 chars)
- Normalización Unicode (NFC)
- Whitelist de caracteres en palabras
- Rate limiting por evento crítico
- Prevención de nombres duplicados
```

### Rate Limiting Configurado
```javascript
// Límites actuales:
createRoom: 2 requests/60s
joinRoom: 5 requests/60s  
submitWords: 3 requests/20s
```

---

## 📞 INFORMACIÓN DE CONTACTO Y RECURSOS

### Comandos Útiles para Desarrollo
```bash
# Debug modo verbose
DEBUG=socket.io* npm start

# Tests específicos
npm test -- --testNamePattern="reconnection"
npx playwright test --headed --grep="robustness"

# Análisis de coverage
npm run test:coverage

# Linting
npm run lint

# Build para producción  
npm run build
```

### Logs Estructurados
```javascript
// server.js utiliza logging JSON:
{
  "ts": "2024-01-01T12:00:00.000Z",
  "level": "info", 
  "event": "createRoom",
  "roomId": "abc123def",
  "socketId": "xyz789",
  "message": "Sala creada"
}
```

---

## 🔍 MÉTRICAS Y MONITOREO

### KPIs Sugeridos
```
- Tiempo de unión a sala: <2s
- Latencia de evento Socket.IO: <100ms
- Tasa de reconexión exitosa: >95%
- Errores 4xx/5xx: <1%
- Desync temporizador: <1s
- Memory leaks: 0 detectados en 1h
```

### Health Checks
```javascript
// GET /activeRooms - Estado de salas
// Socket.IO ping/pong automático
// Limpieza automática de salas vacías
```

---

**NOTA IMPORTANTE:** Este proyecto está en estado de producción temprana. El flujo legacy (ruleta) es completamente funcional y testeado. El flujo moderno está preparado y listo para activación gradual. Los 3 tests E2E intermitentes son el único bloqueador menor identificado.

**ÚLTIMA ACTUALIZACIÓN:** Todas las funcionalidades principales están implementadas y el sistema es estable para uso multijugador en tiempo real.

