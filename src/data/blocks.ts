import { BlockShape } from '../types/game';

// Mondrian-inspired colors based on Piet Mondrian's style
const COLORS = {
  RED: '#dc2626',     // Mondrian red
  BLUE: '#2563eb',    // Mondrian blue
  YELLOW: '#facc15',  // Mondrian yellow
  WHITE: '#8b5a3c',   // Warm brown
  BLACK: '#1f2937',   // Dark gray-black
  ORANGE: '#ea580c',  // Secondary color
  GREEN: '#16a34a',   // Secondary color
  PURPLE: '#9333ea',  // Secondary color
  PINK: '#ec4899',    // Secondary color
  TEAL: '#0d9488',    // Secondary color
  INDIGO: '#4f46e5',  // Secondary color
};

export const BLOCK_SHAPES: BlockShape[] = [
  // 红色 - 3×4长方形 (12格) - 最大积木
  {
    id: 'red-3x4',
    name: '红色 3×4长方形',
    width: 4,
    height: 3,
    color: COLORS.RED,
    pattern: [
      [true, true, true, true],
      [true, true, true, true],
      [true, true, true, true]
    ]
  },

  // 蓝色 - 3×3正方形 (9格)
  {
    id: 'blue-3x3',
    name: '蓝色 3×3正方形',
    width: 3,
    height: 3,
    color: COLORS.BLUE,
    pattern: [
      [true, true, true],
      [true, true, true],
      [true, true, true]
    ]
  },

  // 蓝色 - 2×2正方形 (4格)
  {
    id: 'blue-2x2',
    name: '蓝色 2×2正方形',
    width: 2,
    height: 2,
    color: COLORS.BLUE,
    pattern: [
      [true, true],
      [true, true]
    ]
  },

  // 白色 - 1×5长条 (5格)
  {
    id: 'white-1x5',
    name: '白色 1×5长条',
    width: 5,
    height: 1,
    color: COLORS.WHITE,
    pattern: [
      [true, true, true, true, true]
    ]
  },

  // 白色 - 1×4长条 (4格)
  {
    id: 'white-1x4',
    name: '白色 1×4长条',
    width: 4,
    height: 1,
    color: COLORS.WHITE,
    pattern: [
      [true, true, true, true]
    ]
  },

  // 黄色 - 2×5长条 (10格)
  {
    id: 'yellow-2x5',
    name: '黄色 2×5长条',
    width: 5,
    height: 2,
    color: COLORS.YELLOW,
    pattern: [
      [true, true, true, true, true],
      [true, true, true, true, true]
    ]
  },

  // 黄色 - 2×4长条 (8格)
  {
    id: 'yellow-2x4',
    name: '黄色 2×4长条',
    width: 4,
    height: 2,
    color: COLORS.YELLOW,
    pattern: [
      [true, true, true, true],
      [true, true, true, true]
    ]
  },

  // 黄色 - 2×3长条 (6格)
  {
    id: 'yellow-2x3',
    name: '黄色 2×3长条',
    width: 3,
    height: 2,
    color: COLORS.YELLOW,
    pattern: [
      [true, true, true],
      [true, true, true]
    ]
  },

  // 黑色 - 1×3长条 (3格) ★起始块
  {
    id: 'black-1x3',
    name: '黑色 1×3长条 ★',
    width: 3,
    height: 1,
    color: COLORS.BLACK,
    pattern: [
      [true, true, true]
    ]
  },

  // 黑色 - 1×2长条 (2格) ★起始块
  {
    id: 'black-1x2',
    name: '黑色 1×2长条 ★',
    width: 2,
    height: 1,
    color: COLORS.BLACK,
    pattern: [
      [true, true]
    ]
  },

  // 黑色 - 1×1单方块 (1格) ★起始块
  {
    id: 'black-1x1',
    name: '黑色 1×1单方块 ★',
    width: 1,
    height: 1,
    color: COLORS.BLACK,
    pattern: [
      [true]
    ]
  }
];

// Utility function to rotate a block pattern 90 degrees clockwise
export const rotateBlockPattern = (pattern: boolean[][]): boolean[][] => {
  const rows = pattern.length;
  const cols = pattern[0].length;
  const rotated: boolean[][] = Array(cols).fill(null).map(() => Array(rows).fill(false));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      rotated[j][rows - 1 - i] = pattern[i][j];
    }
  }
  
  return rotated;
};

// Get a block by ID
export const getBlockById = (id: string): BlockShape | undefined => {
  return BLOCK_SHAPES.find(block => block.id === id);
};

// Calculate total area of all blocks (should be 64 for 8x8 grid)
export const getTotalBlockArea = (): number => {
  return BLOCK_SHAPES.reduce((total, block) => {
    const area = block.pattern.reduce((blockArea, row) => 
      blockArea + row.filter(cell => cell).length, 0
    );
    return total + area;
  }, 0);
};

console.log('Total block area:', getTotalBlockArea()); // Should be 64