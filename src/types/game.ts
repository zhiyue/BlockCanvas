export interface Position {
  x: number;
  y: number;
}

export interface BlockShape {
  id: string;
  name: string;
  pattern: boolean[][];
  color: string;
  width: number;
  height: number;
}

export interface PlacedBlock {
  blockId: string;
  position: Position;
  rotation: number;
}

export interface GameBoard {
  grid: (string | null)[][];
  placedBlocks: PlacedBlock[];
}

export interface Challenge {
  id: string;
  name: string;
  difficulty: 'beginner' | 'advanced' | 'master' | 'grandmaster';
  starterBlocks: PlacedBlock[];
  availableBlocks: string[];
}

export interface GameState {
  currentChallenge: Challenge | null;
  board: GameBoard;
  selectedBlock: string | null;
  isCompleted: boolean;
  timeElapsed: number;
  moves: number;
  // Multi-modal interaction state
  interactionMode: 'drag' | 'tap';
  tapModeState: {
    selectedBlockForPlacement: string | null;
    selectedBlockRotation: number;
  };
}

export const BOARD_SIZE = 8;
export const CELL_SIZE = 50;
export const BLOCK_GAP = 2; // Gap between blocks for visual separation

// Coordinate system constants
export const BOARD_CONFIG = {
  BORDER_WIDTH: 2,
  GRID_LINE_WIDTH: 1,
  CELL_PADDING: 1,
} as const;

// Coordinate conversion utilities
export const CoordinateSystem = {
  // Convert grid coordinates to canvas coordinates
  gridToCanvas: (gridX: number, gridY: number) => ({
    x: gridX * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH,
    y: gridY * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH,
  }),

  // Convert canvas coordinates to grid coordinates
  canvasToGrid: (canvasX: number, canvasY: number) => ({
    x: Math.floor((canvasX - BOARD_CONFIG.BORDER_WIDTH) / CELL_SIZE),
    y: Math.floor((canvasY - BOARD_CONFIG.BORDER_WIDTH) / CELL_SIZE),
  }),

  // Get cell bounds in canvas coordinates
  getCellBounds: (gridX: number, gridY: number) => {
    const { x, y } = CoordinateSystem.gridToCanvas(gridX, gridY);
    return {
      x: x + BOARD_CONFIG.CELL_PADDING,
      y: y + BOARD_CONFIG.CELL_PADDING,
      width: CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING,
      height: CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING,
    };
  },

  // Get board dimensions
  getBoardDimensions: () => ({
    width: BOARD_SIZE * CELL_SIZE,
    height: BOARD_SIZE * CELL_SIZE,
    totalWidth: BOARD_SIZE * CELL_SIZE + 2 * BOARD_CONFIG.BORDER_WIDTH,
    totalHeight: BOARD_SIZE * CELL_SIZE + 2 * BOARD_CONFIG.BORDER_WIDTH,
  }),
};