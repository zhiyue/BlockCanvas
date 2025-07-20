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
  // 如果实际尺寸与期望尺寸不匹配，说明积木在求解器中被旋转了
  // 我们需要计算需要多少次90度旋转来从期望形状变成实际形状
  if (expectedSize.width !== actualSize.width || expectedSize.height !== actualSize.height) {
    if (expectedSize.width === actualSize.height && expectedSize.height === actualSize.width) {
      // 尺寸正好相反，说明旋转了90度
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

// 难度评分详细信息接口
export interface DifficultyScore {
  totalScore: number;
  factors: {
    spread: { score: number; value: number; description: string };
    fragmentation: { score: number; value: number; description: string };
    edgeProximity: { score: number; value: number; description: string };
    connectivity: { score: number; value: number; description: string };
    symmetry: { score: number; value: number; description: string };
    cornerOccupation: { score: number; value: number; description: string };
  };
  difficulty: Challenge['difficulty'];
  explanation: string;
}

// 计算黑色方块布局的详细难度评分
function calculateDifficultyScore(combination: BlackPieceCombination): DifficultyScore {
  const pieces = Object.values(combination.black_pieces);
  const allCells = pieces.flatMap(piece => piece.cells);

  // 1. 分散程度评分 (Spread Score)
  let minX = 8, maxX = -1, minY = 8, maxY = -1;
  allCells.forEach(cell => {
    minX = Math.min(minX, cell.col);
    maxX = Math.max(maxX, cell.col);
    minY = Math.min(minY, cell.row);
    maxY = Math.max(maxY, cell.row);
  });

  const spreadX = maxX - minX;
  const spreadY = maxY - minY;
  const totalSpread = spreadX + spreadY;
  const spreadScore = Math.min(totalSpread * 10, 100); // 最大100分

  // 2. 碎片化程度评分 (Fragmentation Score)
  // 计算黑色方块形成的独立区域数量
  const cellSet = new Set(allCells.map(cell => `${cell.row},${cell.col}`));
  const visited = new Set<string>();
  let regions = 0;

  const dfs = (row: number, col: number) => {
    const key = `${row},${col}`;
    if (visited.has(key) || !cellSet.has(key)) return;
    visited.add(key);

    // 检查四个方向的相邻格子
    [[0,1], [0,-1], [1,0], [-1,0]].forEach(([dr, dc]) => {
      dfs(row + dr, col + dc);
    });
  };

  allCells.forEach(cell => {
    const key = `${cell.row},${cell.col}`;
    if (!visited.has(key)) {
      regions++;
      dfs(cell.row, cell.col);
    }
  });

  const fragmentationScore = (regions - 1) * 30; // 每个额外区域增加30分

  // 3. 边缘接近度评分 (Edge Proximity Score)
  let edgeDistance = 0;
  allCells.forEach(cell => {
    const distToEdge = Math.min(cell.row, cell.col, 7 - cell.row, 7 - cell.col);
    edgeDistance += distToEdge;
  });
  const avgEdgeDistance = edgeDistance / allCells.length;
  const edgeProximityScore = Math.max(0, (3 - avgEdgeDistance) * 20); // 越靠近边缘分数越高

  // 4. 连通性评分 (Connectivity Score)
  let adjacentPairs = 0;
  const cellMap = new Map<string, boolean>();
  allCells.forEach(cell => cellMap.set(`${cell.row},${cell.col}`, true));

  allCells.forEach(cell => {
    [[0,1], [0,-1], [1,0], [-1,0]].forEach(([dr, dc]) => {
      const neighborKey = `${cell.row + dr},${cell.col + dc}`;
      if (cellMap.has(neighborKey)) {
        adjacentPairs++;
      }
    });
  });

  const connectivityRatio = adjacentPairs / (allCells.length * 2); // 标准化
  const connectivityScore = (1 - connectivityRatio) * 40; // 连通性越低分数越高

  // 5. 对称性评分 (Symmetry Score)
  const centerX = 3.5, centerY = 3.5;
  let symmetryScore = 0;

  // 检查水平对称
  let horizontalSymmetric = true;
  allCells.forEach(cell => {
    const mirrorCol = 7 - cell.col;
    const mirrorKey = `${cell.row},${mirrorCol}`;
    if (!cellMap.has(mirrorKey)) {
      horizontalSymmetric = false;
    }
  });

  // 检查垂直对称
  let verticalSymmetric = true;
  allCells.forEach(cell => {
    const mirrorRow = 7 - cell.row;
    const mirrorKey = `${mirrorRow},${cell.col}`;
    if (!cellMap.has(mirrorKey)) {
      verticalSymmetric = false;
    }
  });

  if (horizontalSymmetric || verticalSymmetric) {
    symmetryScore = -20; // 对称布局降低难度
  }

  // 6. 角落占用评分 (Corner Occupation Score)
  const corners = [[0,0], [0,7], [7,0], [7,7]];
  let cornerOccupied = 0;
  corners.forEach(([row, col]) => {
    if (cellMap.has(`${row},${col}`)) {
      cornerOccupied++;
    }
  });
  const cornerOccupationScore = cornerOccupied * 15; // 每个角落增加15分

  // 计算总分
  const totalScore = Math.max(0,
    spreadScore +
    fragmentationScore +
    edgeProximityScore +
    connectivityScore +
    symmetryScore +
    cornerOccupationScore
  );

  // 确定难度等级
  let difficulty: Challenge['difficulty'];
  if (totalScore < 50) difficulty = 'beginner';
  else if (totalScore < 100) difficulty = 'advanced';
  else if (totalScore < 150) difficulty = 'master';
  else difficulty = 'grandmaster';

  // 生成解释
  const explanation = generateDifficultyExplanation(totalScore, {
    spread: totalSpread,
    regions,
    avgEdgeDistance,
    connectivityRatio,
    symmetric: horizontalSymmetric || verticalSymmetric,
    cornerOccupied
  });

  return {
    totalScore,
    factors: {
      spread: {
        score: spreadScore,
        value: totalSpread,
        description: `黑色方块分散程度：${totalSpread}格距离`
      },
      fragmentation: {
        score: fragmentationScore,
        value: regions,
        description: `碎片化程度：${regions}个独立区域`
      },
      edgeProximity: {
        score: edgeProximityScore,
        value: avgEdgeDistance,
        description: `边缘接近度：平均距离边缘${avgEdgeDistance.toFixed(1)}格`
      },
      connectivity: {
        score: connectivityScore,
        value: connectivityRatio,
        description: `连通性：${(connectivityRatio * 100).toFixed(1)}%相邻率`
      },
      symmetry: {
        score: symmetryScore,
        value: horizontalSymmetric || verticalSymmetric ? 1 : 0,
        description: `对称性：${horizontalSymmetric || verticalSymmetric ? '对称布局' : '非对称布局'}`
      },
      cornerOccupation: {
        score: cornerOccupationScore,
        value: cornerOccupied,
        description: `角落占用：${cornerOccupied}个角落被占用`
      }
    },
    difficulty,
    explanation
  };
}

// 生成难度解释
function generateDifficultyExplanation(score: number, factors: {
  spread: number;
  regions: number;
  avgEdgeDistance: number;
  connectivityRatio: number;
  symmetric: boolean;
  cornerOccupied: number;
}): string {
  const explanations: string[] = [];

  if (factors.spread > 10) {
    explanations.push("黑色方块分布极其分散");
  } else if (factors.spread > 6) {
    explanations.push("黑色方块分布较为分散");
  } else {
    explanations.push("黑色方块分布相对集中");
  }

  if (factors.regions > 2) {
    explanations.push("形成多个独立区域，增加布局复杂度");
  } else if (factors.regions === 2) {
    explanations.push("形成两个独立区域");
  } else {
    explanations.push("所有黑色方块连通");
  }

  if (factors.avgEdgeDistance < 1) {
    explanations.push("大量方块靠近边缘，限制放置选择");
  }

  if (factors.connectivityRatio < 0.3) {
    explanations.push("方块间连接度低，形成孤立结构");
  }

  if (factors.symmetric) {
    explanations.push("对称布局降低了一定难度");
  }

  if (factors.cornerOccupied >= 3) {
    explanations.push("多个角落被占用，显著增加难度");
  } else if (factors.cornerOccupied >= 1) {
    explanations.push("角落位置被占用");
  }

  return explanations.join("；");
}

// 根据挑战复杂度确定难度等级（保持向后兼容）
function getDifficultyLevel(combination: BlackPieceCombination, index: number): Challenge['difficulty'] {
  const scoreData = calculateDifficultyScore(combination);
  return scoreData.difficulty;
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

// 获取特定组合的详细难度评分
export function getDifficultyScoreForCombination(combinationId: number): DifficultyScore | null {
  const combination = BLACK_POSITIONS_DATA.black_piece_combinations.find(
    c => c.combination_id === combinationId
  );

  if (!combination) {
    return null;
  }

  return calculateDifficultyScore(combination);
}

// 获取所有组合的难度评分统计
export function getAllDifficultyScores(): DifficultyScore[] {
  return BLACK_POSITIONS_DATA.black_piece_combinations.map(combination =>
    calculateDifficultyScore(combination)
  );
}

// 获取难度分布统计
export function getDifficultyDistribution() {
  const scores = getAllDifficultyScores();
  const distribution = {
    beginner: 0,
    advanced: 0,
    master: 0,
    grandmaster: 0
  };

  scores.forEach(score => {
    distribution[score.difficulty]++;
  });

  const avgScore = scores.reduce((sum, score) => sum + score.totalScore, 0) / scores.length;
  const maxScore = Math.max(...scores.map(score => score.totalScore));
  const minScore = Math.min(...scores.map(score => score.totalScore));

  return {
    distribution,
    statistics: {
      total: scores.length,
      averageScore: avgScore,
      maxScore,
      minScore,
      scoreRange: maxScore - minScore
    }
  };
}

// 根据难度评分排序挑战
export function getChallengesSortedByDifficulty(ascending: boolean = true): Challenge[] {
  const challengesWithScores = SOLVER_CHALLENGES.map(challenge => {
    const combinationId = parseInt(challenge.id.replace('solver-', ''));
    const score = getDifficultyScoreForCombination(combinationId);
    return { challenge, score: score?.totalScore || 0 };
  });

  challengesWithScores.sort((a, b) =>
    ascending ? a.score - b.score : b.score - a.score
  );

  return challengesWithScores.map(item => item.challenge);
}
