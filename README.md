# 🍎 Tutifrutti - Juego de Palabras Online

Un juego multijugador de palabras moderno y accesible desarrollado con HTML5, CSS3, JavaScript ES6+ y Node.js.

## ✨ Características

- **🎮 Multijugador en tiempo real** - Hasta 5 jugadores por sala
- **📱 Diseño responsive** - Funciona en móviles, tablets y desktop
- **♿ Accesible** - Compatible con lectores de pantalla y navegación por teclado
- **🎨 Interfaz moderna** - Diseño atractivo con animaciones suaves
- **🔧 Arquitectura modular** - Código organizado y mantenible
- **🚀 Alto rendimiento** - Optimizado para velocidad y fluidez

## 🛠️ Tecnologías

### Frontend
- **HTML5** - Semántico y accesible
- **CSS3** - Grid, Flexbox, Custom Properties, animaciones
- **JavaScript ES6+** - Módulos, async/await, clases
- **Socket.IO Client** - Comunicación en tiempo real

### Backend
- **Node.js** - Servidor JavaScript
- **Express.js** - Framework web
- **Socket.IO** - WebSockets para tiempo real
- **CORS** - Cross-Origin Resource Sharing

### Herramientas de desarrollo
- **ESLint** - Linting de código
- **Prettier** - Formateo de código
- **Jest** - Testing
- **Nodemon** - Desarrollo con hot reload

## 📁 Estructura del proyecto

```
tutifruti/
├── public/                 # Archivos estáticos del cliente
│   ├── css/               # Hojas de estilo
│   │   ├── base.css       # Reset, variables y utilidades
│   │   ├── components.css # Componentes reutilizables
│   │   └── game.css       # Estilos específicos del juego
│   ├── js/                # Módulos JavaScript
│   │   ├── socket-manager.js  # Gestión de Socket.IO
│   │   ├── game-state.js      # Estado del juego
│   │   └── ui-manager.js      # Interfaz de usuario
│   └── assets/            # Imágenes, iconos, etc.
├── views/                 # Páginas HTML
│   ├── create-room.html   # Crear sala
│   ├── join-room.html     # Unirse a sala
│   └── game.html          # Juego principal
├── utils/                 # Utilidades compartidas
│   ├── constants.js       # Constantes del juego
│   └── helpers.js         # Funciones auxiliares
├── game/                  # Lógica del juego (servidor)
│   └── players.js         # Modelo de jugador
├── tests/                 # Pruebas
│   └── setup.js          # Configuración de tests
├── index.html            # Página principal
├── server.js             # Servidor principal
└── package.json          # Dependencias y scripts
```

## 🚀 Instalación y uso

### Prerrequisitos
- Node.js 16+ 
- npm 8+

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd tutifruti
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor**
   ```bash
   npm start
   ```

4. **Abrir en el navegador**
   ```
   http://localhost:3000/
   ```

### Scripts disponibles

```bash
npm start          # Iniciar servidor en producción
npm run dev        # Desarrollo con hot reload
npm test           # Ejecutar tests
npm run test:watch # Tests en modo watch
npm run lint       # Verificar código con ESLint
npm run lint:fix   # Corregir errores de ESLint automáticamente
npm run format     # Formatear código con Prettier
```

## 🔌 Contratos de eventos Socket.IO (resumen)

- Salas: `createRoom`, `joinRoom`, `activeRooms`, `roomCreated`, `joinedRoom`, `playerJoined`, `playerLeft`
- Estado: `getRoomState`, `roomState`, `youAreCreator`, `newRound`, `reconnectPlayer`
- Juego: `startGame`, `showRoulette`, `spinRoulette`, `rouletteSpinning`, `rouletteResult`, `timerUpdate`, `submitWords`, `roundEnded`

El servidor es la única fuente de verdad del temporizador y del scoring. El cliente solo renderiza `timerUpdate` y no ejecuta un `setInterval` propio.

## 🎮 Cómo jugar

1. **Crear o unirse a una sala**
   - Ingresa tu nombre
   - Crea una nueva sala o únete con un código

2. **Esperar jugadores**
   - Comparte el código de sala con tus amigos
   - El anfitrión puede iniciar cuando hay al menos 2 jugadores

3. **Jugar**
   - El anfitrión gira la ruleta para seleccionar una letra
   - Todos los jugadores completan las categorías con palabras que empiecen con esa letra
   - ¡Envía antes de que se acabe el tiempo!

4. **Puntuación**
   - **Palabras repetidas**: 1 punto
   - **Palabras únicas**: 2 puntos  
   - **Palabras con +3 sílabas**: 3 puntos adicionales

## 🏗️ Arquitectura

### Modularidad
El proyecto está organizado en módulos ES6+ con responsabilidades claras:

- **socket-manager.js**: Gestiona toda la comunicación WebSocket
- **game-state.js**: Maneja el estado del juego en el cliente
- **ui-manager.js**: Controla la interfaz y interacciones
- **constants.js**: Configuración centralizada
- **helpers.js**: Utilidades reutilizables

### Responsive Design
Utiliza CSS Grid y Flexbox para una experiencia óptima en todos los dispositivos:

- **Mobile-first**: Diseño optimizado para móviles
- **Breakpoints**: Adaptación fluida a diferentes tamaños
- **Touch-friendly**: Controles optimizados para touch

### Accesibilidad
Implementa las mejores prácticas de accesibilidad:

- **HTML semántico**: Estructura correcta con roles ARIA
- **Navegación por teclado**: Soporte completo para keyboard-only
- **Lectores de pantalla**: Compatible con tecnologías asistivas
- **Contraste**: Colores que cumplen estándares WCAG

## 🔧 Configuración

### Variables de entorno
Crea un archivo `.env` para configuración personalizada:

```env
PORT=3000
SESSION_SECRET=tu_clave_secreta_aqui
NODE_ENV=development
```

### Personalización
Modifica las constantes en `utils/constants.js`:

```javascript
export const GAME_CONFIG = {
  MAX_PLAYERS: 5,        // Máximo jugadores por sala
  TIME_LIMIT: 60,        // Tiempo límite en segundos
  CATEGORIES: [          // Categorías del juego
    'NOMBRE', 
    'ANIMAL', 
    'COSA', 
    'FRUTA'
  ]
};
```

## 🧪 Testing

```bash
# Ejecutar todos los tests
npm test

# Tests en modo watch
npm run test:watch

# Coverage report
npm run test:coverage
```

## 🚀 Despliegue

### Producción
```bash
# Instalar dependencias de producción
npm ci --only=production

# Iniciar servidor
npm start
```

### Compartir en Internet (rápido) – LocalTunnel

Permite que otras personas se conecten a tu servidor local desde Internet.

1) En una terminal, inicia el servidor:
```bash
npm start
```

2) En una segunda terminal, abre el túnel público:
```bash
npm run online
```

3) Copia la URL pública que aparece (por ejemplo: `https://xxxxx.loca.lt`) y compártela. Esa URL carga tu `index.html` y funcionará en móviles/PC de otros.

Notas importantes:
- Mantén abiertas ambas terminales (servidor y túnel) mientras juegan.
- Si ves advertencias del navegador al abrir la URL, continúa (LocalTunnel usa certificados propios).
- Si tu red corporativa bloquea túneles, prueba desde otra red o usa alternativas como `ngrok` o `cloudflared`.
- Socket.IO ya está configurado con CORS abiertos para clientes externos.

Troubleshooting rápido:
- 404 o recursos que no cargan: asegúrate de usar la URL pública completa y que las rutas comiencen con `/` (ya está implementado así en este proyecto).
- La URL cambia cada vez: LocalTunnel genera subdominios aleatorios; para subdominios fijos se requiere plan/alternativa.

### Docker (opcional)
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

### Estándares de código
- Usar ESLint y Prettier
- Escribir tests para nuevas funcionalidades
- Mantener accesibilidad (WCAG 2.1 AA)
- Documentar funciones complejas

## 📝 Licencia

Este proyecto está bajo la Licencia ISC. Ver el archivo `LICENSE` para más detalles.

## 👥 Créditos

Desarrollado con ❤️ para la comunidad de juegos online.

---

## 🆕 Últimas mejoras (v2.0)

- ✅ **Arquitectura modular** con ES6 modules
- ✅ **Diseño responsive** completo
- ✅ **Accesibilidad mejorada** (ARIA, keyboard navigation)
- ✅ **UI/UX moderna** con animaciones
- ✅ **Código limpio** y buenas prácticas
- ✅ **Performance optimizada**
- ✅ **Estructura organizada** por funcionalidad

¡Disfruta jugando Tutifrutti! 🎉
