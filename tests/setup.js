// Jest setup file
// This file runs before all tests

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Silenciar logs para evitar "Cannot log after tests are done" por timeouts tardíos
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Set test timeout
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
  // Helper function to create mock socket
  createMockSocket: (id = 'test-socket-id') => ({
    id,
    emit: jest.fn(),
    on: jest.fn(),
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn()
  }),

  // Helper function to create mock room data
  createMockRoom: (overrides = {}) => ({
    roomId: 'test-room-id',
    roomName: 'Test Room',
    creator: 'TestUser',
    currentPlayers: 1,
    maxPlayers: 5,
    isPrivate: false,
    createdAt: new Date(),
    ...overrides
  }),

  // Helper function to create mock player data
  createMockPlayer: (overrides = {}) => ({
    id: 'test-player-id',
    name: 'TestPlayer',
    isCreator: false,
    score: 0,
    ready: false,
    ...overrides
  })
};
