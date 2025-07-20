import React, { useState } from 'react';
import {
  getDifficultyScoreForCombination,
  getAllDifficultyScores,
  getDifficultyDistribution,
  DifficultyScore,
  BLACK_POSITIONS_DATA
} from '../data/blackPositions';
import BlackPieceVisualizer from './BlackPieceVisualizer';

interface DifficultyAnalysisProps {
  combinationId?: number;
  showOverview?: boolean;
}

const DifficultyAnalysis: React.FC<DifficultyAnalysisProps> = ({ 
  combinationId, 
  showOverview = false 
}) => {
  const [selectedCombination, setSelectedCombination] = useState<number | null>(
    combinationId || null
  );

  // 获取单个组合的评分
  const getScoreDisplay = (score: DifficultyScore) => {
    const difficultyColors = {
      beginner: 'text-green-600 bg-green-100',
      advanced: 'text-blue-600 bg-blue-100',
      master: 'text-orange-600 bg-orange-100',
      grandmaster: 'text-red-600 bg-red-100'
    };

    const difficultyNames = {
      beginner: '入门',
      advanced: '进阶',
      master: '大师',
      grandmaster: '宗师'
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">难度评分分析</h3>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${difficultyColors[score.difficulty]}`}>
            {difficultyNames[score.difficulty]} ({score.totalScore.toFixed(1)}分)
          </div>
        </div>

        <div className="mb-4">
          <p className="text-gray-700 text-sm">{score.explanation}</p>
        </div>

        <div className="space-y-3">
          {Object.entries(score.factors).map(([key, factor]) => (
            <div key={key} className="flex items-center justify-between">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-700">
                  {factor.description}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(factor.score / 100 * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div className="ml-4 text-sm font-semibold text-gray-600">
                {factor.score.toFixed(1)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 获取总览统计
  const getOverviewDisplay = () => {
    const distribution = getDifficultyDistribution();
    const allScores = getAllDifficultyScores();

    const difficultyColors = {
      beginner: 'bg-green-500',
      advanced: 'bg-blue-500',
      master: 'bg-orange-500',
      grandmaster: 'bg-red-500'
    };

    const difficultyNames = {
      beginner: '入门',
      advanced: '进阶',
      master: '大师',
      grandmaster: '宗师'
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">难度分布总览</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(distribution.distribution).map(([difficulty, count]) => (
            <div key={difficulty} className="text-center">
              <div className={`w-16 h-16 rounded-full ${difficultyColors[difficulty as keyof typeof difficultyColors]} mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg`}>
                {count}
              </div>
              <div className="text-sm font-medium text-gray-700">
                {difficultyNames[difficulty as keyof typeof difficultyNames]}
              </div>
              <div className="text-xs text-gray-500">
                {((count / distribution.statistics.total) * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {distribution.statistics.total}
            </div>
            <div className="text-sm text-gray-600">总挑战数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {distribution.statistics.averageScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">平均分数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {distribution.statistics.maxScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">最高分数</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {distribution.statistics.minScore.toFixed(1)}
            </div>
            <div className="text-sm text-gray-600">最低分数</div>
          </div>
        </div>

        {/* 组合选择器 */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            查看特定组合的详细评分：
          </label>
          <select
            value={selectedCombination || ''}
            onChange={(e) => setSelectedCombination(e.target.value ? parseInt(e.target.value) : null)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">选择一个组合...</option>
            {allScores.map((score, index) => (
              <option key={index} value={index + 1}>
                组合 {index + 1} - {difficultyNames[score.difficulty]} ({score.totalScore.toFixed(1)}分)
              </option>
            ))}
          </select>
        </div>

        {/* 所有组合的网格视图 */}
        <div className="mt-8">
          <h4 className="text-lg font-medium text-gray-900 mb-4">所有组合预览</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {BLACK_POSITIONS_DATA.black_piece_combinations.map((combination) => (
              <div
                key={combination.combination_id}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  selectedCombination === combination.combination_id
                    ? 'ring-2 ring-blue-500'
                    : ''
                }`}
                onClick={() => setSelectedCombination(combination.combination_id)}
              >
                <BlackPieceVisualizer
                  combination={combination}
                  showDifficulty={true}
                  size="small"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 渲染内容
  if (showOverview) {
    return (
      <div className="space-y-6">
        {getOverviewDisplay()}
        {selectedCombination && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 可视化展示 */}
            <div>
              {(() => {
                const combination = BLACK_POSITIONS_DATA.black_piece_combinations.find(
                  c => c.combination_id === selectedCombination
                );
                return combination ? (
                  <BlackPieceVisualizer
                    combination={combination}
                    showDifficulty={true}
                    size="large"
                  />
                ) : null;
              })()}
            </div>

            {/* 详细评分 */}
            <div>
              {(() => {
                const score = getDifficultyScoreForCombination(selectedCombination);
                return score ? getScoreDisplay(score) : null;
              })()}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (combinationId) {
    const score = getDifficultyScoreForCombination(combinationId);
    return score ? getScoreDisplay(score) : (
      <div className="text-center text-gray-500 py-8">
        未找到组合 {combinationId} 的评分数据
      </div>
    );
  }

  return (
    <div className="text-center text-gray-500 py-8">
      请提供组合ID或启用总览模式
    </div>
  );
};

export default DifficultyAnalysis;
