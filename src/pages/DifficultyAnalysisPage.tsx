import React from 'react';
import DifficultyAnalysis from '../components/DifficultyAnalysis';

const DifficultyAnalysisPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            黑色方块布局难度分析
          </h1>
          <p className="text-lg text-gray-600">
            基于多维度评分系统分析每种黑色方块布局的难度等级
          </p>
        </div>

        {/* 总览分析 */}
        <DifficultyAnalysis showOverview={true} />
      </div>
    </div>
  );
};

export default DifficultyAnalysisPage;
