# Plan de Mejoras para Tutti Frutti

## Mejora de la Lógica de Gestión de Salas

### 1. Revisar y Modificar la Lógica de Unión de Salas
- Asegurar que al unirse a una sala, todos los jugadores reciban la lista actualizada de jugadores.
- Emitir un evento `playerJoined` a todos los sockets en la sala después de que un jugador se una.

### 2. Actualizar la Lógica de Desconexión
- Modificar la lógica de desconexión para que, al eliminar un jugador, se emita un evento `playerLeft` a todos los jugadores en la sala.
- Asegurar que la sala se elimine correctamente si no quedan jugadores y no está en juego.

### 3. Implementar Pruebas
- Crear pruebas para verificar que la lógica de unión y desconexión funcione correctamente y que todos los jugadores reciban las actualizaciones adecuadas.

### 4. Documentar Cambios
- Actualizar la documentación del proyecto para reflejar los cambios realizados en la lógica de gestión de salas.

### 5. Próximos Pasos
- Implementar las modificaciones necesarias en `server.js`.
- Ejecutar nuevamente las pruebas para confirmar que todo funcione como se espera.
