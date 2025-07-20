import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Challenge, PlacedBlock, BOARD_SIZE } from '../../types/game'

// Mock the blocks data
const mockBlocks = {
  'test-1x1': {
    id: 'test-1x1',
    name: 'Test 1x1',
    width: 1,
    height: 1,
    color: '#000000',
    pattern: [[true]]
  },
  'test-2x1': {
    id: 'test-2x1',
    name: 'Test 2x1',
    width: 2,
    height: 1,
    color: '#000000',
    pattern: [[true, true]]
  },
  'test-2x2': {
    id: 'test-2x2',
    name: 'Test 2x2',
    width: 2,
    height: 2,
    color: '#000000',
    pattern: [
      [true, true],
      [true, true]
    ]
  },
  'test-l-shape': {
    id: 'test-l-shape',
    name: 'Test L',
    width: 2,
    height: 2,
    color: '#000000',
    pattern: [
      [true, false],
      [true, true]
    ]
  }
}

vi.mock('../../data/blocks', () => ({
  getBlockById: vi.fn().mockImplementation((id: string) => mockBlocks[id as keyof typeof mockBlocks])
}))

// Import the store after mocking
const { useGameStore } = await import('../gameStore')

// Helper function to get fresh store state for each test
const createTestStore = () => {
  // Get the store instance
  const store = useGameStore.getState()
  
  // Manually reset to a clean initial state without depending on resetBoard
  useGameStore.setState({
    currentChallenge: null,
    board: {
      grid: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
      placedBlocks: []
    },
    selectedBlock: null,
    isCompleted: false,
    timeElapsed: 0,
    moves: 0,
    interactionMode: 'drag',
    tapModeState: {
      selectedBlockForPlacement: null,
      selectedBlockRotation: 0,
    }
  })
  
  return store
}

describe('Game Store', () => {
  beforeEach(() => {
    // Manually reset to a clean initial state without depending on resetBoard
    useGameStore.setState({
      currentChallenge: null,
      board: {
        grid: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
        placedBlocks: []
      },
      selectedBlock: null,
      isCompleted: false,
      timeElapsed: 0,
      moves: 0,
      interactionMode: 'drag',
      tapModeState: {
        selectedBlockForPlacement: null,
        selectedBlockRotation: 0,
      }
    })
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = createTestStore()
      
      expect(store.currentChallenge).toBeNull()
      expect(store.selectedBlock).toBeNull()
      expect(store.isCompleted).toBe(false)
      expect(store.timeElapsed).toBe(0)
      expect(store.moves).toBe(0)
      expect(store.board.grid).toHaveLength(BOARD_SIZE)
      expect(store.board.grid[0]).toHaveLength(BOARD_SIZE)
      expect(store.board.placedBlocks).toHaveLength(0)
    })

    it('should create empty board with null cells', () => {
      const store = createTestStore()
      
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          expect(store.board.grid[row][col]).toBeNull()
        }
      }
    })
  })

  describe('setCurrentChallenge', () => {
    it('should set challenge and initialize board with starter blocks', () => {
      const store = createTestStore()
      
      const starterBlocks: PlacedBlock[] = [
        { blockId: 'test-1x1', position: { x: 0, y: 0 }, rotation: 0 }
      ]
      
      const challenge: Challenge = {
        id: 'test-challenge',
        name: 'Test Challenge',
        difficulty: 'beginner',
        starterBlocks,
        availableBlocks: ['test-2x1', 'test-2x2']
      }
      
      store.setCurrentChallenge(challenge)
      
      // Get fresh state after the action
      const updatedStore = useGameStore.getState()
      
      expect(updatedStore.currentChallenge).toEqual(challenge)
      expect(updatedStore.board.placedBlocks).toEqual(starterBlocks)
      expect(updatedStore.board.grid[0][0]).toBe('test-1x1')
      expect(updatedStore.timeElapsed).toBe(0)
      expect(updatedStore.moves).toBe(0)
      expect(updatedStore.isCompleted).toBe(false)
    })

    it('should handle starter blocks with rotation', () => {
      const store = createTestStore()
      
      const starterBlocks: PlacedBlock[] = [
        { blockId: 'test-2x1', position: { x: 1, y: 1 }, rotation: 1 }
      ]
      
      const challenge: Challenge = {
        id: 'test-challenge',
        name: 'Test Challenge',
        difficulty: 'beginner',
        starterBlocks,
        availableBlocks: []
      }
      
      store.setCurrentChallenge(challenge)
      
      // After 1 rotation, 2x1 becomes 1x2
      expect(store.board.grid[1][1]).toBe('test-2x1')
      expect(store.board.grid[2][1]).toBe('test-2x1')
    })
  })

  describe('isPositionValid', () => {
    it('should return true for valid position', () => {
      const store = createTestStore()
      
      const isValid = store.isPositionValid('test-1x1', 0, 0)
      expect(isValid).toBe(true)
    })

    it('should return false for out-of-bounds position', () => {
      const store = createTestStore()
      
      expect(store.isPositionValid('test-1x1', -1, 0)).toBe(false)
      expect(store.isPositionValid('test-1x1', BOARD_SIZE, 0)).toBe(false)
      expect(store.isPositionValid('test-1x1', 0, -1)).toBe(false)
      expect(store.isPositionValid('test-1x1', 0, BOARD_SIZE)).toBe(false)
    })

    it('should return false when block extends beyond board', () => {
      const store = createTestStore()
      
      // 2x2 block at bottom-right corner
      expect(store.isPositionValid('test-2x2', BOARD_SIZE - 1, BOARD_SIZE - 1)).toBe(false)
      expect(store.isPositionValid('test-2x2', BOARD_SIZE - 2, BOARD_SIZE - 2)).toBe(true)
    })

    it('should return false for collision with existing blocks', () => {
      const store = createTestStore()
      
      // Place a block first
      store.placeBlock('test-1x1', 0, 0)
      
      // Try to place another block at the same position
      expect(store.isPositionValid('test-1x1', 0, 0)).toBe(false)
    })

    it('should return false for unknown block', () => {
      const store = createTestStore()
      
      expect(store.isPositionValid('unknown-block', 0, 0)).toBe(false)
    })

    it('should handle rotated blocks correctly', () => {
      const store = createTestStore()
      
      // 2x1 block rotated becomes 1x2
      expect(store.isPositionValid('test-2x1', BOARD_SIZE - 1, BOARD_SIZE - 1, 0)).toBe(false) // 2x1 exceeds
      expect(store.isPositionValid('test-2x1', BOARD_SIZE - 1, BOARD_SIZE - 1, 1)).toBe(false) // 1x2 exceeds
      expect(store.isPositionValid('test-2x1', BOARD_SIZE - 2, BOARD_SIZE - 1, 0)).toBe(true)  // 2x1 fits
      expect(store.isPositionValid('test-2x1', BOARD_SIZE - 1, BOARD_SIZE - 2, 1)).toBe(true)  // 1x2 fits
    })
  })

  describe('placeBlock', () => {
    it('should place block successfully and increment moves', () => {
      const store = createTestStore()
      
      const result = store.placeBlock('test-1x1', 1, 1)
      
      expect(result).toBe(true)
      expect(store.board.grid[1][1]).toBe('test-1x1')
      expect(store.moves).toBe(1)
      expect(store.board.placedBlocks).toHaveLength(1)
      expect(store.board.placedBlocks[0]).toEqual({
        blockId: 'test-1x1',
        position: { x: 1, y: 1 },
        rotation: 0
      })
    })

    it('should fail to place block at invalid position', () => {
      const store = createTestStore()
      
      const result = store.placeBlock('test-1x1', -1, 0)
      
      expect(result).toBe(false)
      expect(store.moves).toBe(0)
      expect(store.board.placedBlocks).toHaveLength(0)
    })

    it('should place rotated block correctly', () => {
      const store = createTestStore()
      
      const result = store.placeBlock('test-2x1', 0, 0, 1)
      
      expect(result).toBe(true)
      expect(store.board.grid[0][0]).toBe('test-2x1')
      expect(store.board.grid[1][0]).toBe('test-2x1')
      expect(store.board.placedBlocks[0].rotation).toBe(1)
    })

    it('should place complex shaped block correctly', () => {
      const store = createTestStore()
      
      const result = store.placeBlock('test-l-shape', 0, 0)
      
      expect(result).toBe(true)
      expect(store.board.grid[0][0]).toBe('test-l-shape')
      expect(store.board.grid[1][0]).toBe('test-l-shape')
      expect(store.board.grid[1][1]).toBe('test-l-shape')
      expect(store.board.grid[0][1]).toBeNull()
    })
  })

  describe('removeBlock', () => {
    it('should remove placed block successfully', () => {
      const store = createTestStore()
      
      store.placeBlock('test-1x1', 1, 1)
      store.removeBlock('test-1x1')
      
      expect(store.board.grid[1][1]).toBeNull()
      expect(store.board.placedBlocks).toHaveLength(0)
    })

    it('should remove complex shaped block completely', () => {
      const store = createTestStore()
      
      store.placeBlock('test-l-shape', 0, 0)
      store.removeBlock('test-l-shape')
      
      expect(store.board.grid[0][0]).toBeNull()
      expect(store.board.grid[1][0]).toBeNull()
      expect(store.board.grid[1][1]).toBeNull()
      expect(store.board.placedBlocks).toHaveLength(0)
    })

    it('should handle removing non-existent block gracefully', () => {
      const store = createTestStore()
      
      store.removeBlock('non-existent')
      
      expect(store.board.placedBlocks).toHaveLength(0)
    })

    it('should remove rotated block correctly', () => {
      const store = createTestStore()
      
      store.placeBlock('test-2x1', 0, 0, 1) // Rotated to 1x2
      store.removeBlock('test-2x1')
      
      expect(store.board.grid[0][0]).toBeNull()
      expect(store.board.grid[1][0]).toBeNull()
      expect(store.board.placedBlocks).toHaveLength(0)
    })
  })

  describe('selectBlock', () => {
    it('should select block', () => {
      const store = createTestStore()
      
      store.selectBlock('test-1x1')
      
      expect(store.selectedBlock).toBe('test-1x1')
    })

    it('should deselect block', () => {
      const store = createTestStore()
      
      store.selectBlock('test-1x1')
      store.selectBlock(null)
      
      expect(store.selectedBlock).toBeNull()
    })
  })

  describe('rotateSelectedBlock', () => {
    it('should rotate selected placed block', () => {
      const store = createTestStore()
      
      store.placeBlock('test-2x1', 0, 0, 0)
      store.selectBlock('test-2x1')
      store.rotateSelectedBlock()
      
      const placedBlock = store.board.placedBlocks.find(pb => pb.blockId === 'test-2x1')
      expect(placedBlock?.rotation).toBe(1)
      
      // Check grid placement after rotation
      expect(store.board.grid[0][0]).toBe('test-2x1')
      expect(store.board.grid[1][0]).toBe('test-2x1')
    })

    it('should handle rotation when no block is selected', () => {
      const store = createTestStore()
      
      store.placeBlock('test-2x1', 0, 0)
      store.rotateSelectedBlock()
      
      // Should not change anything
      const placedBlock = store.board.placedBlocks.find(pb => pb.blockId === 'test-2x1')
      expect(placedBlock?.rotation).toBe(0)
    })

    it('should handle rotation when selected block is not placed', () => {
      const store = createTestStore()
      
      store.selectBlock('test-2x1')
      store.rotateSelectedBlock()
      
      // Should not crash or affect the board
      expect(store.board.placedBlocks).toHaveLength(0)
    })
  })

  describe('checkWinCondition', () => {
    it('should return false for empty board', () => {
      const store = createTestStore()
      
      expect(store.checkWinCondition()).toBe(false)
    })

    it('should return false for partially filled board', () => {
      const store = createTestStore()
      
      store.placeBlock('test-1x1', 0, 0)
      
      expect(store.checkWinCondition()).toBe(false)
    })

    it('should return true when board is completely filled', () => {
      const store = createTestStore()
      
      // Fill the entire board
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          store.board.grid[row][col] = 'filled'
        }
      }
      
      expect(store.checkWinCondition()).toBe(true)
    })
  })

  describe('getAvailableBlocks', () => {
    it('should return empty array when no challenge is set', () => {
      const store = createTestStore()
      
      expect(store.getAvailableBlocks()).toEqual([])
    })

    it('should return all available blocks when none are placed', () => {
      const store = createTestStore()
      
      const challenge: Challenge = {
        id: 'test',
        name: 'Test',
        difficulty: 'beginner',
        starterBlocks: [],
        availableBlocks: ['test-1x1', 'test-2x1', 'test-2x2']
      }
      
      store.setCurrentChallenge(challenge)
      
      expect(store.getAvailableBlocks()).toEqual(['test-1x1', 'test-2x1', 'test-2x2'])
    })

    it('should exclude placed blocks', () => {
      const store = createTestStore()
      
      const challenge: Challenge = {
        id: 'test',
        name: 'Test',
        difficulty: 'beginner',
        starterBlocks: [],
        availableBlocks: ['test-1x1', 'test-2x1', 'test-2x2']
      }
      
      store.setCurrentChallenge(challenge)
      store.placeBlock('test-1x1', 0, 0)
      
      expect(store.getAvailableBlocks()).toEqual(['test-2x1', 'test-2x2'])
    })
  })

  describe('resetBoard', () => {
    it('should reset board to initial challenge state with starter blocks', () => {
      const store = createTestStore()
      
      // Create a test challenge
      const starterBlocks: PlacedBlock[] = [
        { blockId: 'test-1x1', position: { x: 0, y: 0 }, rotation: 0 },
        { blockId: 'test-2x1', position: { x: 2, y: 2 }, rotation: 0 }
      ]
      
      const challenge: Challenge = {
        id: 'test-challenge',
        name: 'Test Challenge',
        difficulty: 'beginner',
        starterBlocks,
        availableBlocks: ['test-1x1', 'test-2x1', 'test-2x2']
      }
      
      // Set the challenge first
      store.setCurrentChallenge(challenge)
      const initialGrid = store.board.grid.map(row => [...row])
      const initialPlacedBlocks = [...store.board.placedBlocks]
      
      // Modify state - place an additional block
      store.placeBlock('test-2x2', 5, 5)
      store.selectBlock('test-2x2')
      store.incrementTime()
      store.incrementMoves()
      
      // Verify state was modified
      expect(store.board.placedBlocks).toHaveLength(3)
      expect(store.timeElapsed).toBeGreaterThan(0)
      expect(store.moves).toBeGreaterThan(0)
      
      // Reset the board
      store.resetBoard()
      
      // Should reset to initial challenge state
      expect(store.selectedBlock).toBeNull()
      expect(store.isCompleted).toBe(false)
      expect(store.timeElapsed).toBe(0)
      expect(store.moves).toBe(0)
      
      // Should have starter blocks only
      expect(store.board.placedBlocks).toHaveLength(starterBlocks.length)
      expect(store.board.placedBlocks).toEqual(starterBlocks)
      
      // Grid should match initial state
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          expect(store.board.grid[row][col]).toBe(initialGrid[row][col])
        }
      }
    })

    it('should reset to empty board if no challenge is set', () => {
      const store = createTestStore()
      
      // Don't set a challenge
      store.resetBoard()
      
      expect(store.selectedBlock).toBeNull()
      expect(store.isCompleted).toBe(false)
      expect(store.timeElapsed).toBe(0)
      expect(store.moves).toBe(0)
      expect(store.board.placedBlocks).toHaveLength(0)
      
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          expect(store.board.grid[row][col]).toBeNull()
        }
      }
    })
  })

  describe('incrementTime', () => {
    it('should increment time by 1', () => {
      const store = createTestStore()
      
      expect(store.timeElapsed).toBe(0)
      store.incrementTime()
      expect(store.timeElapsed).toBe(1)
      store.incrementTime()
      expect(store.timeElapsed).toBe(2)
    })
  })

  describe('incrementMoves', () => {
    it('should increment moves by 1', () => {
      const store = createTestStore()
      
      expect(store.moves).toBe(0)
      store.incrementMoves()
      expect(store.moves).toBe(1)
      store.incrementMoves()
      expect(store.moves).toBe(2)
    })
  })

  describe('Win Condition Integration', () => {
    it('should set isCompleted when placeBlock triggers win condition', () => {
      const store = createTestStore()
      
      // Fill board except one cell
      for (let row = 0; row < BOARD_SIZE; row++) {
        for (let col = 0; col < BOARD_SIZE; col++) {
          if (row !== 0 || col !== 0) {
            store.board.grid[row][col] = 'filled'
          }
        }
      }
      
      expect(store.isCompleted).toBe(false)
      
      store.placeBlock('test-1x1', 0, 0)
      
      expect(store.isCompleted).toBe(true)
    })
  })
})