# Contexto del Proyecto Tutti Frutti para Black Box

## Descripción General

Tutti Frutti (también conocido como Stop o Basta) es un juego de palabras multijugador donde los participantes deben escribir palabras que cumplan con ciertas reglas y pertenezcan a categorías específicas. Esta implementación digital del juego permite a los usuarios jugar en línea en tiempo real.

## Estructura del Proyecto

### Arquitectura

- **Backend**: Node.js con Express y Socket.io para comunicación en tiempo real
- **Frontend**: HTML, CSS y JavaScript vanilla
- **Base de datos**: Preparado para MongoDB (aunque actualmente no implementado completamente)

### Archivos Principales

- `server.js`: Servidor Node.js que gestiona la lógica del juego, salas y comunicación Socket.io
- `game.html`: Interfaz principal del juego
- `game.js`: Lógica del cliente para interactuar con el servidor y actualizar la interfaz
- `gameStyles.css`: Estilos para la interfaz del juego

## Lógica del Juego

### Reglas

El juego se basa en una tabla donde:
- Las **filas** representan reglas (ej. "Contiene la A", "Empieza por S", "Acaba en N")
- Las **columnas** representan categorías (ej. "Fruta", "Personaje", "Animal", "Nombre")

Los jugadores deben completar la tabla con palabras que cumplan simultáneamente:
1. La regla de la fila (ej. "Contiene la A")
2. La categoría de la columna (ej. "Fruta")

### Flujo del Juego

1. Los jugadores se unen a una sala
2. El anfitrión inicia el juego
3. Se muestra la tabla con reglas y categorías
4. Los jugadores tienen un tiempo limitado para completar la tabla
5. Al finalizar el tiempo, se calculan las puntuaciones
6. Se muestran los resultados y se puede iniciar una nueva ronda

### Sistema de Puntuación

La puntuación se basa en:
- **Palabras repetidas**: 1 punto
- **Palabras sin repetir**: 2 puntos
- **Palabras con más de 3 sílabas**: 3 puntos adicionales

## Componentes Clave

### Tabla de Juego

La tabla principal (`tuttiTable`) es una matriz donde:
- Cada celda contiene un campo de entrada (`wordInput`)
- Los jugadores deben completar estas celdas con palabras válidas

### Tabla de Puntuación

La tabla de puntuación (`scoreTable`) muestra:
- Puntos por palabras repetidas
- Puntos por palabras sin repetir (x2)
- Puntos por palabras con más de 3 sílabas (x3)
- Puntuación total

### Temporizador

Un temporizador cuenta regresivamente desde el tiempo establecido (por defecto 60 segundos). Cuando llega a cero, se envían automáticamente las palabras ingresadas.

## Estado Actual

El proyecto ha sido recientemente actualizado para cambiar de un formato basado en una letra seleccionada aleatoriamente a un formato basado en reglas predefinidas. Las principales funciones que se han modificado son:

- `submitWords`: Ahora valida que las palabras cumplan con las reglas específicas de cada fila
- `spinWheel`: Simplificada para iniciar el juego directamente sin seleccionar una letra
- `updateScoreTable`: Actualizada para reflejar el nuevo sistema de puntuación
- `displaySubmittedWords`: Adaptada para mostrar las palabras en la nueva estructura de tabla

## Posibles Mejoras

1. **Sistema de puntuación completo**: Implementar la lógica para calcular puntos por palabras repetidas, únicas y con más de 3 sílabas
2. **Validación de palabras mejorada**: Verificar que las palabras existan en un diccionario y cumplan con las reglas
3. **Persistencia de datos**: Implementar completamente MongoDB para guardar usuarios, partidas y estadísticas
4. **Interfaz de usuario mejorada**: Añadir animaciones, feedback visual y diseño responsive
5. **Modos de juego adicionales**: Implementar variantes como tiempo limitado, categorías personalizadas, etc.

## Notas Técnicas

### Socket.io

El proyecto utiliza Socket.io para la comunicación en tiempo real entre clientes y servidor. Los principales eventos son:

- `createRoom`: Crear una nueva sala de juego
- `joinRoom`: Unirse a una sala existente
- `startGame`: Iniciar el juego
- `submitWords`: Enviar palabras al servidor
- `roundEnded`: Notificar el fin de una ronda
- `gameEnded`: Notificar el fin del juego

### Validación de Palabras

Actualmente, la validación básica verifica:
- Que la palabra no esté vacía
- Que cumpla con la regla específica (ej. contener una letra, empezar o terminar con cierta letra)

Se podría mejorar implementando:
- Verificación contra un diccionario
- Detección de palabras inapropiadas
- Verificación de categoría (ej. que "manzana" sea realmente una fruta)

### Estructura de Datos

Las principales estructuras de datos son:

- `gameStates`: Objeto que almacena el estado de cada sala de juego
- `players`: Array de jugadores en una sala
- `words`: Objeto que almacena las palabras enviadas por cada jugador
- `scores`: Objeto que almacena las puntuaciones de cada jugador

Esta información debería ser útil para que Black Box pueda analizar y entender el proyecto Tutti Frutti, facilitando la continuación del desarrollo con la IA.