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

// Enhanced coordinate system configuration
export interface CoordinateSystemConfig {
  cellSize: number;
  borderWidth: number;
  gridLineWidth: number;
  cellPadding: number;
  boardSize: number;
}

// Default coordinate system configuration
export const DEFAULT_COORDINATE_CONFIG: CoordinateSystemConfig = {
  cellSize: CELL_SIZE,
  borderWidth: BOARD_CONFIG.BORDER_WIDTH,
  gridLineWidth: BOARD_CONFIG.GRID_LINE_WIDTH,
  cellPadding: BOARD_CONFIG.CELL_PADDING,
  boardSize: BOARD_SIZE,
};

// Enhanced coordinate conversion utilities with responsive support
export class EnhancedCoordinateSystem {
  private config: CoordinateSystemConfig;

  constructor(config: CoordinateSystemConfig = DEFAULT_COORDINATE_CONFIG) {
    this.config = config;
  }

  // Update configuration (useful for responsive changes)
  updateConfig(newConfig: Partial<CoordinateSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get current configuration
  getConfig(): CoordinateSystemConfig {
    return { ...this.config };
  }

  // Convert grid coordinates to canvas coordinates
  gridToCanvas(gridX: number, gridY: number): Position {
    return {
      x: gridX * this.config.cellSize + this.config.borderWidth,
      y: gridY * this.config.cellSize + this.config.borderWidth,
    };
  }

  // Convert canvas coordinates to grid coordinates
  canvasToGrid(canvasX: number, canvasY: number): Position {
    return {
      x: Math.floor((canvasX - this.config.borderWidth) / this.config.cellSize),
      y: Math.floor((canvasY - this.config.borderWidth) / this.config.cellSize),
    };
  }

  // Get cell bounds in canvas coordinates
  getCellBounds(gridX: number, gridY: number): { x: number; y: number; width: number; height: number } {
    const { x, y } = this.gridToCanvas(gridX, gridY);
    return {
      x: x + this.config.cellPadding,
      y: y + this.config.cellPadding,
      width: this.config.cellSize - 2 * this.config.cellPadding,
      height: this.config.cellSize - 2 * this.config.cellPadding,
    };
  }

  // Get board dimensions
  getBoardDimensions(): { width: number; height: number; totalWidth: number; totalHeight: number } {
    return {
      width: this.config.boardSize * this.config.cellSize,
      height: this.config.boardSize * this.config.cellSize,
      totalWidth: this.config.boardSize * this.config.cellSize + 2 * this.config.borderWidth,
      totalHeight: this.config.boardSize * this.config.cellSize + 2 * this.config.borderWidth,
    };
  }

  // Validate grid coordinates
  isValidGridPosition(gridX: number, gridY: number): boolean {
    return (
      gridX >= 0 &&
      gridY >= 0 &&
      gridX < this.config.boardSize &&
      gridY < this.config.boardSize
    );
  }

  // Check if canvas coordinates are within board bounds
  isWithinBoardBounds(canvasX: number, canvasY: number): boolean {
    const dimensions = this.getBoardDimensions();
    return (
      canvasX >= this.config.borderWidth &&
      canvasY >= this.config.borderWidth &&
      canvasX <= dimensions.width + this.config.borderWidth &&
      canvasY <= dimensions.height + this.config.borderWidth
    );
  }

  // Convert DOM element coordinates to grid coordinates
  domToGrid(domX: number, domY: number, containerRect: DOMRect): Position {
    const canvasX = domX - containerRect.left;
    const canvasY = domY - containerRect.top;
    return this.canvasToGrid(canvasX, canvasY);
  }

  // Get responsive cell size based on viewport
  getResponsiveCellSize(viewportWidth: number): number {
    const isMobile = viewportWidth <= 768;
    const isSmallMobile = viewportWidth <= 480;

    if (isSmallMobile) {
      return Math.max(35, Math.floor((viewportWidth - 40) / (this.config.boardSize + 2)));
    } else if (isMobile) {
      return Math.max(40, Math.floor((viewportWidth - 60) / (this.config.boardSize + 1)));
    }
    return this.config.cellSize;
  }

  // Create a responsive coordinate system
  createResponsiveSystem(viewportWidth: number): EnhancedCoordinateSystem {
    const responsiveCellSize = this.getResponsiveCellSize(viewportWidth);
    return new EnhancedCoordinateSystem({
      ...this.config,
      cellSize: responsiveCellSize,
    });
  }
}

// Legacy coordinate system for backward compatibility
export const CoordinateSystem = {
  gridToCanvas: (gridX: number, gridY: number) => ({
    x: gridX * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH,
    y: gridY * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH,
  }),

  canvasToGrid: (canvasX: number, canvasY: number) => ({
    x: Math.floor((canvasX - BOARD_CONFIG.BORDER_WIDTH) / CELL_SIZE),
    y: Math.floor((canvasY - BOARD_CONFIG.BORDER_WIDTH) / CELL_SIZE),
  }),

  getCellBounds: (gridX: number, gridY: number) => {
    const { x, y } = CoordinateSystem.gridToCanvas(gridX, gridY);
    return {
      x: x + BOARD_CONFIG.CELL_PADDING,
      y: y + BOARD_CONFIG.CELL_PADDING,
      width: CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING,
      height: CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING,
    };
  },

  getBoardDimensions: () => ({
    width: BOARD_SIZE * CELL_SIZE,
    height: BOARD_SIZE * CELL_SIZE,
    totalWidth: BOARD_SIZE * CELL_SIZE + 2 * BOARD_CONFIG.BORDER_WIDTH,
    totalHeight: BOARD_SIZE * CELL_SIZE + 2 * BOARD_CONFIG.BORDER_WIDTH,
  }),
};