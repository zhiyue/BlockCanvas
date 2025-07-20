import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GameState, GameBoard, Challenge, PlacedBlock, BOARD_SIZE } from '../types/game';
import { getBlockById } from '../data/blocks';

interface GameStore extends GameState {
  // Actions
  setCurrentChallenge: (challenge: Challenge) => void;
  placeBlock: (blockId: string, x: number, y: number, rotation?: number) => boolean;
  removeBlock: (blockId: string) => void;
  selectBlock: (blockId: string | null) => void;
  rotateSelectedBlock: () => void;
  resetBoard: () => void;
  checkWinCondition: () => boolean;
  incrementTime: () => void;
  incrementMoves: () => void;
  
  // Helper functions
  isPositionValid: (blockId: string, x: number, y: number, rotation?: number, ignoreBlockId?: string) => boolean;
  getAvailableBlocks: () => string[];
  getAllBlocks: () => string[];
  isStarterBlock: (blockId: string) => boolean;
}

const createEmptyBoard = (): GameBoard => ({
  grid: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
  placedBlocks: []
});

const rotatePattern = (pattern: boolean[][], times: number = 1): boolean[][] => {
  let rotated = pattern;
  for (let i = 0; i < times; i++) {
    const rows = rotated.length;
    const cols = rotated[0].length;
    const newPattern: boolean[][] = Array(cols).fill(null).map(() => Array(rows).fill(false));
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        newPattern[c][rows - 1 - r] = rotated[r][c];
      }
    }
    rotated = newPattern;
  }
  return rotated;
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentChallenge: null,
      board: createEmptyBoard(),
      selectedBlock: null,
      isCompleted: false,
      timeElapsed: 0,
      moves: 0,

      // Actions
      setCurrentChallenge: (challenge) => {
        // Create initial grid
        const newGrid = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
        
        // Place starter blocks on the grid
        challenge.starterBlocks.forEach(placedBlock => {
          const block = getBlockById(placedBlock.blockId);
          if (block) {
            const rotatedPattern = rotatePattern(block.pattern, placedBlock.rotation);
            
            rotatedPattern.forEach((row, rowIndex) => {
              row.forEach((isOccupied, colIndex) => {
                if (isOccupied) {
                  const gridX = placedBlock.position.x + colIndex;
                  const gridY = placedBlock.position.y + rowIndex;
                  if (gridY >= 0 && gridY < BOARD_SIZE && gridX >= 0 && gridX < BOARD_SIZE) {
                    newGrid[gridY][gridX] = placedBlock.blockId;
                  }
                }
              });
            });
          }
        });

        set({
          currentChallenge: challenge,
          board: {
            grid: newGrid,
            placedBlocks: [...challenge.starterBlocks]
          },
          isCompleted: false,
          timeElapsed: 0,
          moves: 0,
          selectedBlock: null
        });
      },

      placeBlock: (blockId, x, y, rotation = 0) => {
        const state = get();
        
        if (!state.isPositionValid(blockId, x, y, rotation)) {
          return false;
        }

        const block = getBlockById(blockId);
        if (!block) return false;

        const rotatedPattern = rotatePattern(block.pattern, rotation);
        const newGrid = state.board.grid.map(row => [...row]);

        // Place the block on the grid
        rotatedPattern.forEach((row, rowIndex) => {
          row.forEach((isOccupied, colIndex) => {
            if (isOccupied) {
              const gridX = x + colIndex;
              const gridY = y + rowIndex;
              newGrid[gridY][gridX] = blockId;
            }
          });
        });

        const newPlacedBlock: PlacedBlock = {
          blockId,
          position: { x, y },
          rotation
        };

        set(state => ({
          board: {
            ...state.board,
            grid: newGrid,
            placedBlocks: [...state.board.placedBlocks, newPlacedBlock]
          },
          moves: state.moves + 1
        }));

        // Check win condition
        if (get().checkWinCondition()) {
          set({ isCompleted: true });
        }

        return true;
      },

      removeBlock: (blockId) => {
        const state = get();
        const placedBlock = state.board.placedBlocks.find(pb => pb.blockId === blockId);
        
        if (!placedBlock) return;

        const block = getBlockById(blockId);
        if (!block) return;

        const rotatedPattern = rotatePattern(block.pattern, placedBlock.rotation);
        const newGrid = state.board.grid.map(row => [...row]);

        // Remove the block from the grid
        rotatedPattern.forEach((row, rowIndex) => {
          row.forEach((isOccupied, colIndex) => {
            if (isOccupied) {
              const gridX = placedBlock.position.x + colIndex;
              const gridY = placedBlock.position.y + rowIndex;
              if (gridY >= 0 && gridY < BOARD_SIZE && gridX >= 0 && gridX < BOARD_SIZE) {
                newGrid[gridY][gridX] = null;
              }
            }
          });
        });

        set({
          board: {
            ...state.board,
            grid: newGrid,
            placedBlocks: state.board.placedBlocks.filter(pb => pb.blockId !== blockId)
          }
        });
      },

      selectBlock: (blockId) => {
        set({ selectedBlock: blockId });
      },

      rotateSelectedBlock: () => {
        const state = get();
        if (!state.selectedBlock) return;

        const placedBlock = state.board.placedBlocks.find(pb => pb.blockId === state.selectedBlock);
        if (placedBlock) {
          // Remove, rotate, and place back
          state.removeBlock(state.selectedBlock);
          const newRotation = (placedBlock.rotation + 1) % 4;
          state.placeBlock(placedBlock.blockId, placedBlock.position.x, placedBlock.position.y, newRotation);
        }
      },

      resetBoard: () => {
        set({
          board: createEmptyBoard(),
          selectedBlock: null,
          isCompleted: false,
          timeElapsed: 0,
          moves: 0
        });
      },

      isPositionValid: (blockId, x, y, rotation = 0, ignoreBlockId) => {
        const state = get();
        const block = getBlockById(blockId);
        if (!block) return false;

        const rotatedPattern = rotatePattern(block.pattern, rotation);
        const height = rotatedPattern.length;
        const width = rotatedPattern[0].length;

        // Check bounds
        if (x < 0 || y < 0 || x + width > BOARD_SIZE || y + height > BOARD_SIZE) {
          return false;
        }

        // Check for collisions
        for (let row = 0; row < height; row++) {
          for (let col = 0; col < width; col++) {
            if (rotatedPattern[row][col]) {
              const gridX = x + col;
              const gridY = y + row;

              const occupyingBlockId = state.board.grid[gridY][gridX];
              // 忽略指定的 block（通常是当前被拖拽的 block）
              if (occupyingBlockId !== null && occupyingBlockId !== ignoreBlockId) {
                return false;
              }
            }
          }
        }

        return true;
      },

      getAvailableBlocks: () => {
        const state = get();
        if (!state.currentChallenge) return [];

        const placedBlockIds = state.board.placedBlocks.map(pb => pb.blockId);
        return state.currentChallenge.availableBlocks.filter(blockId => !placedBlockIds.includes(blockId));
      },

      getAllBlocks: () => {
        const state = get();
        if (!state.currentChallenge) return [];

        return state.currentChallenge.availableBlocks;
      },

      isStarterBlock: (blockId) => {
        const state = get();
        if (!state.currentChallenge) return false;

        return state.currentChallenge.starterBlocks.some(sb => sb.blockId === blockId);
      },

      checkWinCondition: () => {
        const state = get();
        const grid = state.board.grid;
        
        // Check if all cells are filled
        for (let row = 0; row < BOARD_SIZE; row++) {
          for (let col = 0; col < BOARD_SIZE; col++) {
            if (grid[row][col] === null) {
              return false;
            }
          }
        }
        
        return true;
      },

      incrementTime: () => {
        set(state => ({ timeElapsed: state.timeElapsed + 1 }));
      },

      incrementMoves: () => {
        set(state => ({ moves: state.moves + 1 }));
      }
    }),
    {
      name: 'mondrian-blocks-game',
      partialize: (state) => ({
        currentChallenge: state.currentChallenge,
        board: state.board,
        isCompleted: state.isCompleted,
        timeElapsed: state.timeElapsed,
        moves: state.moves
      })
    }
  )
);