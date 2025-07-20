import React from 'react';
import { BlackPieceCombination } from '../data/blackPositions';

interface BlackPieceVisualizerProps {
  combination: BlackPieceCombination;
  showDifficulty?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const BlackPieceVisualizer: React.FC<BlackPieceVisualizerProps> = ({
  combination,
  showDifficulty = true,
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };

  const cellSize = sizeClasses[size];

  // 创建8x8网格
  const createGrid = () => {
    const grid = Array(8).fill(null).map(() => Array(8).fill(false));
    
    // 标记黑色方块占用的格子
    Object.values(combination.black_pieces).forEach(piece => {
      piece.cells.forEach(cell => {
        grid[cell.row][cell.col] = true;
      });
    });
    
    return grid;
  };

  const grid = createGrid();

  // 获取难度颜色
  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      beginner: 'text-green-600 bg-green-100',
      advanced: 'text-blue-600 bg-blue-100',
      master: 'text-orange-600 bg-orange-100',
      grandmaster: 'text-red-600 bg-red-100'
    };
    return colors[difficulty as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getDifficultyName = (difficulty: string) => {
    const names = {
      beginner: '入门',
      advanced: '进阶',
      master: '大师',
      grandmaster: '宗师'
    };
    return names[difficulty as keyof typeof names] || difficulty;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      {/* 标题和难度信息 */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">
          组合 #{combination.combination_id}
        </h4>
        {showDifficulty && combination.difficulty_score && (
          <div className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(combination.difficulty_score.difficulty)}`}>
            {getDifficultyName(combination.difficulty_score.difficulty)} 
            ({combination.difficulty_score.total_score.toFixed(1)})
          </div>
        )}
      </div>

      {/* 8x8网格 */}
      <div className="grid grid-cols-8 gap-0.5 bg-gray-200 p-1 rounded">
        {grid.map((row, rowIndex) =>
          row.map((isBlack, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`${cellSize} border border-gray-300 ${
                isBlack 
                  ? 'bg-gray-800' 
                  : 'bg-white'
              }`}
              title={`(${rowIndex}, ${colIndex})`}
            />
          ))
        )}
      </div>

      {/* 方块信息 */}
      <div className="mt-3 text-xs text-gray-600">
        <div className="flex flex-wrap gap-2">
          {Object.entries(combination.black_pieces).map(([color, piece]) => (
            <span key={color} className="bg-gray-100 px-2 py-1 rounded">
              {piece.name}
            </span>
          ))}
        </div>
      </div>

      {/* 难度因子（可选显示） */}
      {showDifficulty && combination.difficulty_score && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="text-xs text-gray-600">
            <div className="grid grid-cols-2 gap-1">
              {Object.entries(combination.difficulty_score.factors).map(([key, factor]) => (
                <div key={key} className="flex justify-between">
                  <span className="truncate">
                    {key === 'spread' && '分散'}
                    {key === 'fragmentation' && '碎片'}
                    {key === 'edge_proximity' && '边缘'}
                    {key === 'connectivity' && '连通'}
                    {key === 'symmetry' && '对称'}
                    {key === 'corner_occupation' && '角落'}
                  </span>
                  <span className="font-medium">{factor.score.toFixed(0)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlackPieceVisualizer;
