export class Room {
  constructor(id, name, creator, maxPlayers) {
    this.id = id;
    this.name = name;
    this.creator = creator;
    this.maxPlayers = maxPlayers;
    this.players = [];
  }
}
