# Contexto del Proyecto Tutti Frutti

Este documento proporciona una visión general del proyecto Tutti Frutti para que Black Box pueda analizarlo y continuar con el desarrollo.

## Estructura del Proyecto

El proyecto es un juego web multijugador de Tutti Frutti (también conocido como Stop o Basta) implementado con Node.js, Express y Socket.io. La estructura principal es:

```
├── .env                  # Variables de entorno
├── create_room.html      # Página para crear salas
├── create_room.js        # Lógica para crear salas
├── game.html             # Interfaz principal del juego
├── game.js               # Lógica del cliente para el juego
├── gameStyles.css        # Estilos específicos del juego
├── index.html            # Página de inicio
├── join_room.html        # Página para unirse a salas
├── join_room.js          # Lógica para unirse a salas
├── package.json          # Dependencias del proyecto
├── server.js             # Servidor y lógica del backend
└── style.css             # Estilos generales
```

## Arquitectura del Sistema

### Backend (server.js)

- **Tecnologías**: Node.js, Express, Socket.io, MongoDB (configurado pero posiblemente no implementado completamente)
- **Funcionalidades principales**:
  - Gestión de salas de juego
  - Manejo de conexiones de jugadores
  - Control del flujo del juego (iniciar partida, girar ruleta, temporizador)
  - Validación de palabras enviadas
  - Cálculo de puntuaciones

### Frontend

- **Tecnologías**: HTML, CSS, JavaScript (vanilla), Socket.io (cliente)
- **Páginas principales**:
  - Página de inicio (index.html)
  - Crear sala (create_room.html)
  - Unirse a sala (join_room.html)
  - Juego (game.html)

## Lógica del Juego

### Reglas del Juego

El juego Tutti Frutti consiste en:

1. Los jugadores deben completar una tabla donde las filas son reglas (como "Contiene la A", "Empieza por S") y las columnas son categorías (FRUTA, PERSONAJE, ANIMAL, NOMBRE).
2. Los jugadores deben escribir palabras que cumplan con la regla de la fila y pertenezcan a la categoría de la columna.
3. Hay un temporizador (60 segundos por defecto) para completar la tabla.
4. Al finalizar el tiempo, se calculan puntuaciones basadas en palabras repetidas, sin repetir y palabras con más de 3 sílabas.

### Flujo del Juego

1. Un jugador crea una sala y se convierte en anfitrión.
2. Otros jugadores pueden unirse a la sala (hasta un máximo definido).
3. El anfitrión inicia el juego.
4. El juego muestra la tabla con reglas y categorías.
5. Los jugadores completan la tabla con palabras que cumplan las reglas.
6. Al finalizar el tiempo, se envían las palabras al servidor.
7. El servidor valida las palabras y calcula las puntuaciones.
8. Se muestran los resultados a todos los jugadores.

## Componentes Clave

### Tabla de Juego (tuttiTable)

La interfaz principal del juego es una tabla donde:
- Las columnas representan categorías (FRUTA, PERSONAJE, ANIMAL, NOMBRE)
- Las filas representan reglas ("Contiene la A", "Empieza por S", etc.)
- Cada celda contiene un campo de entrada para que el jugador escriba una palabra

### Tabla de Puntuación (scoreTable)

Muestra las puntuaciones con las siguientes columnas:
- REPETIDAS: Palabras que coinciden con otros jugadores
- SIN REPETIR: Palabras únicas (x2 puntos)
- +3 SÍLABAS: Palabras con más de 3 sílabas (x3 puntos)
- TOTAL: Suma total de puntos

### Temporizador

Cuenta regresiva que muestra el tiempo restante para completar la tabla. Cuando quedan 10 segundos o menos, se activa una animación de advertencia.

## Estado Actual y Próximos Pasos

El proyecto tiene implementada la estructura básica del juego con:
- Sistema de salas
- Interfaz de juego con tabla de reglas y categorías
- Temporizador con animación
- Validación básica de palabras según reglas

Posibles mejoras y próximos pasos:
1. Implementar sistema de puntuación completo
2. Mejorar la validación de palabras (diccionario, API externa)
3. Añadir más categorías y reglas
4. Implementar persistencia de datos con MongoDB
5. Mejorar la interfaz de usuario y experiencia de juego
6. Añadir funcionalidades sociales (chat, amigos, etc.)
7. Implementar sistema de niveles o logros

## Notas Técnicas

### Socket.io

El proyecto utiliza Socket.io para la comunicación en tiempo real entre el servidor y los clientes. Los principales eventos son:

- **Servidor a Cliente**:
  - `activeRooms`: Envía lista de salas activas
  - `roomCreated`: Notifica creación de nueva sala
  - `playerJoined`: Notifica cuando un jugador se une
  - `joinedRoom`: Confirma unión a sala
  - `gameStarted`: Notifica inicio del juego
  - `letterSelected`: Envía letra seleccionada
  - `timeUpdate`: Actualiza tiempo restante
  - `roundEnded`: Notifica fin de ronda
  - `gameEnded`: Notifica fin del juego

- **Cliente a Servidor**:
  - `createRoom`: Solicita crear sala
  - `joinRoom`: Solicita unirse a sala
  - `startGame`: Solicita iniciar juego
  - `spinWheel`: Solicita girar ruleta
  - `submitWords`: Envía palabras completadas

### Validación de Palabras

Actualmente, la validación de palabras se realiza en el cliente verificando si cumplen con la regla correspondiente (contiene letra, empieza por letra, etc.). Se podría mejorar implementando:

1. Verificación contra un diccionario
2. API externa de validación de palabras
3. Detección de palabras inapropiadas

## Conclusión

El proyecto Tutti Frutti es un juego web multijugador que implementa una versión digital del clásico juego de palabras. Tiene una arquitectura cliente-servidor con comunicación en tiempo real mediante Socket.io. La interfaz actual permite a los jugadores completar una tabla de palabras según reglas y categorías, con un sistema de puntuación basado en la originalidad y complejidad de las palabras.