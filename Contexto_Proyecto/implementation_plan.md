# Implementation Plan for Tutti Frutti Project

## Overview
The goal of this implementation plan is to refactor the room management logic in the Tutti Frutti game to ensure consistent synchronization of player data across all clients, including the room creator.

The current implementation has issues with real-time updates and player management, which need to be addressed to improve the user experience and maintainability of the codebase.

## Types
This implementation will involve changes to the following types:
- Room

### Room Type Definition
```javascript
class Room {
  constructor(id, name, creator, maxPlayers) {
    this.id = id; // Unique identifier for the room
    this.name = name; // Name of the room
    this.creator = creator; // Creator of the room
    this.maxPlayers = maxPlayers; // Maximum number of players allowed
    this.players = []; // List of players in the room
    this.isPlaying = false; // Indicates if the game is currently in progress
    this.currentRound = 0; // Current round number
    this.currentLetter = ''; // Letter for the current round
    this.words = {}; // Words submitted by players
  }
}
```

## Files
The following files will be modified or created:
- **New Files:**
  - `src/controllers/roomController.js`: Handles room-related logic and events.
  - `src/services/roomService.js`: Contains business logic for room management.
  - `src/repositories/roomRepository.js`: Manages data persistence for rooms.

- **Modified Files:**
  - `server.js`: Update to use the new room controller and service.
  - `public/js/socket-manager.js`: Adjust event handling for room management.
  - `public/js/ui-manager.js`: Update UI interactions based on new room logic.

## Functions
The following functions will be added or modified:
- **New Functions:**
  - `createRoom(roomData)`: Creates a new room and initializes its state.
  - `joinRoom(playerData)`: Adds a player to an existing room.
  - `updateRoomState(roomId)`: Emits the current state of the room to all players.

- **Modified Functions:**
  - `socket.on('playerJoined', ...)`: Update to handle new player joining logic.
  - `socket.on('roomCreated', ...)`: Adjust to notify all clients of the new room.

## Classes
The following classes will be added or modified:
- **New Classes:**
  - `Room`: Represents a game room with its properties and methods.

- **Modified Classes:**
  - `Player`: Update to include methods for managing player state in rooms.

## Dependencies
The following dependencies will be added or updated:
- **New Packages:**
  - `express-session`: For session management.
  - `connect-mongo`: For session storage in MongoDB.

## Testing
Testing will be implemented as follows:
- **Unit Tests**: For all new functions and classes.
- **Integration Tests**: To ensure that the room management logic works correctly with the Socket.IO events.
- **E2E Tests**: To validate the entire flow of creating and joining rooms.

## Implementation Order
1. Create the new files in the `src` directory.
2. Implement the `Room` class and its methods.
3. Update `server.js` to use the new room controller.
4. Modify the socket manager and UI manager to reflect the new logic.
5. Write unit tests for the new functionality.
6. Conduct integration and E2E testing.
7. Review and finalize the implementation.

---

This plan will guide the implementation of the necessary changes to improve the room management logic in the Tutti Frutti game.
