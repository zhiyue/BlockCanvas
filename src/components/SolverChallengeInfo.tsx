import React, { useState } from 'react';
import { getChallengeDetails, getSolverStats, isSolverChallenge } from '../data/blackPositions';
import './SolverChallengeInfo.css';

interface SolverChallengeInfoProps {
  challengeId: string;
}

export const SolverChallengeInfo: React.FC<SolverChallengeInfoProps> = ({ challengeId }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  // 如果不是求解器挑战，不显示任何内容
  if (!isSolverChallenge(challengeId)) {
    return null;
  }

  const challengeDetails = getChallengeDetails(challengeId);
  const solverStats = getSolverStats();

  if (!challengeDetails) {
    return null;
  }

  const { originalData, metadata } = challengeDetails;

  return (
    <div className="solver-challenge-info">
      <div className="solver-badge">
        <span className="solver-icon">🤖</span>
        <span className="solver-text">AI求解器生成</span>
      </div>
      
      <div className="solver-summary">
        <p>
          这是基于AI求解器找到的真实解生成的挑战。
          黑色积木的位置来自第 <strong>{originalData.solution_id}</strong> 个解的
          第 <strong>{originalData.combination_id}</strong> 种黑色积木组合。
        </p>
      </div>

      <button 
        className="details-toggle"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? '隐藏详情' : '显示详情'} 
        <span className={`arrow ${showDetails ? 'up' : 'down'}`}>▼</span>
      </button>

      {showDetails && (
        <div className="solver-details">
          <div className="detail-section">
            <h4>🎯 挑战信息</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">组合编号:</span>
                <span className="value">{originalData.combination_id}</span>
              </div>
              <div className="detail-item">
                <span className="label">来源解:</span>
                <span className="value">第 {originalData.solution_id} 个解</span>
              </div>
              <div className="detail-item">
                <span className="label">生成时间:</span>
                <span className="value">{originalData.timestamp}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>🧩 黑色积木详情</h4>
            <div className="black-pieces-grid">
              {Object.entries(originalData.black_pieces).map(([color, piece]) => (
                <div key={color} className="black-piece-card">
                  <div className="piece-header">
                    <span className="piece-color" style={{
                      backgroundColor: color === 'K' ? '#2c3e50' : 
                                     color === 'k' ? '#34495e' : '#1a1a1a',
                      color: 'white'
                    }}>
                      {color}
                    </span>
                    <span className="piece-name">{piece.name}</span>
                  </div>
                  <div className="piece-details">
                    <div className="position-info">
                      <span>位置: ({piece.position.top_left.row}, {piece.position.top_left.col})</span>
                      <span>尺寸: {piece.size.width}×{piece.size.height}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-section">
            <h4>📊 求解器统计</h4>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-value">{solverStats.totalSolutions}</span>
                <span className="stat-label">总解数</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{solverStats.uniqueCombinations}</span>
                <span className="stat-label">唯一组合</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{(solverStats.elapsedTime * 1000).toFixed(1)}ms</span>
                <span className="stat-label">求解用时</span>
              </div>
              <div className="stat-item">
                <span className="stat-value">{solverStats.generatedChallenges}</span>
                <span className="stat-label">生成挑战</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>ℹ️ 关于这个挑战</h4>
            <div className="about-text">
              <p>
                这个挑战的黑色积木位置是通过Dancing Links算法求解8×8棋盘积木铺砌问题得出的。
                算法在 <strong>{(solverStats.elapsedTime * 1000).toFixed(1)}毫秒</strong> 内找到了 
                <strong>{solverStats.totalSolutions}</strong> 个解，其中包含 
                <strong>{solverStats.uniqueCombinations}</strong> 种不同的黑色积木位置组合。
              </p>
              <p>
                每个组合都代表一个可能的完整解，您的任务是使用提供的彩色积木填满剩余的空间，
                重现AI求解器找到的完整解决方案。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolverChallengeInfo;
