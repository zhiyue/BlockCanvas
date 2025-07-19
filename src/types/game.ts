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
}

export const BOARD_SIZE = 8;
export const CELL_SIZE = 50;