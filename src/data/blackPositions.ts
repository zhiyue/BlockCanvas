import { Challenge, PlacedBlock } from '../types/game';
import blackPositionsData from './black_positions.json';

// 黑色积木位置数据类型定义
export interface BlackPiecePosition {
  row: number;
  col: number;
}

export interface BlackPieceInfo {
  name: string;
  color: string;
  position: {
    top_left: BlackPiecePosition;
    bottom_right: BlackPiecePosition;
  };
  size: {
    width: number;
    height: number;
  };
  cells: BlackPiecePosition[];
}

export interface BlackPieceCombination {
  combination_id: number;
  solution_id: number;
  black_pieces: Record<string, BlackPieceInfo>;
  timestamp: string;
}

export interface BlackPositionsMetadata {
  total_solutions: number;
  unique_black_combinations: number;
  start_time: string;
  end_time: string;
  elapsed_time_seconds: number;
  board_size: number;
}

export interface BlackPositionsData {
  metadata: BlackPositionsMetadata;
  piece_definitions: Record<string, {
    name: string;
    size: {
      width: number;
      height: number;
    };
  }>;
  black_piece_combinations: BlackPieceCombination[];
}

// 导入的JSON数据
export const BLACK_POSITIONS_DATA = blackPositionsData as BlackPositionsData;

// 将黑色积木颜色代码映射到游戏中的block ID
const COLOR_TO_BLOCK_ID: Record<string, string> = {
  'K': 'black-1x3',
  'k': 'black-1x2', 
  'x': 'black-1x1'
};

// 将黑色积木位置信息转换为PlacedBlock格式
function convertBlackPieceToPlacedBlock(color: string, piece: BlackPieceInfo): PlacedBlock {
  const blockId = COLOR_TO_BLOCK_ID[color];
  if (!blockId) {
    throw new Error(`Unknown black piece color: ${color}`);
  }

  // 计算旋转角度
  // 根据积木的实际尺寸和期望尺寸来判断是否旋转
  const expectedSize = BLACK_POSITIONS_DATA.piece_definitions[color].size;
  const actualSize = piece.size;
  
  let rotation = 0;
  if (expectedSize.width !== actualSize.width || expectedSize.height !== actualSize.height) {
    // 如果尺寸不匹配，说明积木被旋转了
    if (expectedSize.width === actualSize.height && expectedSize.height === actualSize.width) {
      rotation = 1; // 90度旋转
    }
  }

  return {
    blockId,
    position: {
      x: piece.position.top_left.col,
      y: piece.position.top_left.row
    },
    rotation
  };
}

// 根据挑战复杂度确定难度等级
function getDifficultyLevel(combination: BlackPieceCombination, index: number): Challenge['difficulty'] {
  // 根据黑色积木的分布复杂度来判断难度
  const pieces = Object.values(combination.black_pieces);

  // 计算积木之间的距离和分散程度
  let totalDistance = 0;
  let minX = 8, maxX = -1, minY = 8, maxY = -1;

  pieces.forEach(piece => {
    const x = piece.position.top_left.col;
    const y = piece.position.top_left.row;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  const spread = (maxX - minX) + (maxY - minY);

  // 根据索引和分散程度确定难度
  if (index === 0) return 'beginner';
  if (spread <= 4) return 'beginner';
  if (spread <= 8) return 'advanced';
  if (spread <= 12) return 'master';
  return 'grandmaster';
}

// 生成更有意义的挑战名称
function generateChallengeName(combination: BlackPieceCombination, difficulty: Challenge['difficulty']): string {
  const difficultyNames = {
    beginner: '入门',
    advanced: '进阶',
    master: '大师',
    grandmaster: '宗师'
  };

  const pieces = Object.keys(combination.black_pieces);
  const pieceNames = {
    'K': '长条',
    'k': '短条',
    'x': '方点'
  };

  const description = pieces.map(p => pieceNames[p as keyof typeof pieceNames]).join('');

  return `${difficultyNames[difficulty]}挑战：${description}布局 ${combination.combination_id}`;
}

// 根据黑色积木位置数据生成挑战
export function generateChallengesFromBlackPositions(): Challenge[] {
  const challenges: Challenge[] = [];

  BLACK_POSITIONS_DATA.black_piece_combinations.forEach((combination, index) => {
    const starterBlocks: PlacedBlock[] = [];

    // 将每个黑色积木转换为starter block
    Object.entries(combination.black_pieces).forEach(([color, piece]) => {
      try {
        const placedBlock = convertBlackPieceToPlacedBlock(color, piece);
        starterBlocks.push(placedBlock);
      } catch (error) {
        console.warn(`Failed to convert black piece ${color}:`, error);
      }
    });

    // 确定难度等级
    const difficulty = getDifficultyLevel(combination, index);

    // 创建挑战
    const challenge: Challenge = {
      id: `solver-${combination.combination_id}`,
      name: generateChallengeName(combination, difficulty),
      difficulty,
      starterBlocks,
      availableBlocks: [
        'red-3x4', 'blue-3x3', 'blue-2x2',
        'white-1x5', 'white-1x4',
        'yellow-2x5', 'yellow-2x4', 'yellow-2x3'
      ]
    };

    challenges.push(challenge);
  });

  return challenges;
}

// 获取所有基于求解器的挑战
export const SOLVER_CHALLENGES = generateChallengesFromBlackPositions();

// 获取特定组合的挑战
export function getChallengeByCombinatioId(combinationId: number): Challenge | undefined {
  return SOLVER_CHALLENGES.find(challenge => challenge.id === `solver-${combinationId}`);
}

// 获取挑战的详细信息（包含原始黑色积木数据）
export function getChallengeDetails(challengeId: string) {
  const combinationId = parseInt(challengeId.replace('solver-', ''));
  const combination = BLACK_POSITIONS_DATA.black_piece_combinations.find(
    c => c.combination_id === combinationId
  );
  
  if (!combination) {
    return null;
  }

  return {
    challenge: getChallengeByCombinatioId(combinationId),
    originalData: combination,
    metadata: BLACK_POSITIONS_DATA.metadata
  };
}

// 验证挑战是否来自求解器
export function isSolverChallenge(challengeId: string): boolean {
  return challengeId.startsWith('solver-');
}

// 获取求解器统计信息
export function getSolverStats() {
  return {
    totalSolutions: BLACK_POSITIONS_DATA.metadata.total_solutions,
    uniqueCombinations: BLACK_POSITIONS_DATA.metadata.unique_black_combinations,
    elapsedTime: BLACK_POSITIONS_DATA.metadata.elapsed_time_seconds,
    boardSize: BLACK_POSITIONS_DATA.metadata.board_size,
    generatedChallenges: SOLVER_CHALLENGES.length
  };
}
