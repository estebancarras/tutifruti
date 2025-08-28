# Configuración para Black Box - Proyecto Tutti Frutti

## Información del Proyecto

- **Nombre**: Tutti Frutti
- **Descripción**: Juego multijugador en tiempo real basado en el clásico juego de palabras
- **Tecnologías**: Node.js, Express, Socket.io, MongoDB (configurado pero no implementado completamente)

## Dependencias

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.17.1",
    "socket.io": "^4.7.2",
    "mongoose": "^7.5.0",
    "dotenv": "^16.3.1",
    "express-session": "^1.17.3",
    "connect-mongo": "^5.0.0"
  }
}
```

## Cómo Ejecutar el Proyecto

1. **Instalación de dependencias**:
   ```bash
   npm install
   ```

2. **Configuración de variables de entorno**:
   Crear o modificar el archivo `.env` con las siguientes variables:
   ```
   PORT=3000
   SESSION_SECRET=tutifruti_secret_key
   MONGODB_URI=mongodb://localhost:27017/tutifruti
   ```

3. **Iniciar el servidor**:
   ```bash
   npm start
   ```
   El servidor se ejecutará en `http://localhost:3000`

## Estructura de Archivos Principales

- **server.js**: Servidor principal y lógica del backend
- **game.js**: Lógica del cliente para el juego
- **game.html**: Interfaz principal del juego
- **gameStyles.css**: Estilos específicos del juego

## Flujo de Desarrollo

1. El servidor (server.js) maneja las conexiones de Socket.io y la lógica del juego
2. Los clientes se conectan al servidor y se unen a salas de juego
3. El juego se desarrolla en tiempo real con comunicación bidireccional

## Notas para Black Box

- El proyecto utiliza Socket.io para comunicación en tiempo real
- La estructura del juego está basada en una tabla de reglas y categorías
- Se ha implementado un sistema de validación de palabras según reglas específicas
- El sistema de puntuación está basado en palabras repetidas, únicas y complejas

## Comandos Útiles

- **Iniciar servidor**: `npm start`
- **Depurar**: Añadir `console.log()` en puntos clave del código
- **Verificar conexiones**: Revisar mensajes en la consola del servidor

## Próximos Pasos de Desarrollo

1. Implementar sistema de puntuación completo
2. Mejorar la validación de palabras
3. Añadir persistencia de datos con MongoDB
4. Mejorar la interfaz de usuario

Para más detalles sobre la estructura y lógica del proyecto, consulta el archivo `proyecto_contexto.md`.