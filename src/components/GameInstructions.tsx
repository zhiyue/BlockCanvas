import React from 'react';
import './GameInstructions.css';

interface GameInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
}

const GameInstructions: React.FC<GameInstructionsProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="instructions-overlay">
      <div className="instructions-modal">
        <div className="instructions-header">
          <h2>🧩 How to Play Mondrian Blocks</h2>
          <button onClick={onClose} className="close-button">×</button>
        </div>
        
        <div className="instructions-content">
          <div className="instruction-section">
            <h3>🎯 Objective</h3>
            <p>Fill the entire 8×8 grid with colorful blocks without overlapping. Each puzzle has only one correct solution!</p>
          </div>

          <div className="instruction-section">
            <h3>🎮 How to Play</h3>
            <ol>
              <li>
                <strong>Select a Block:</strong> Click on any colored block from the inventory on the right
              </li>
              <li>
                <strong>Rotate (Optional):</strong> Use the "Rotate (90°)" button to change the block's orientation
              </li>
              <li>
                <strong>Place the Block:</strong> Click on the grid where you want to place the selected block
              </li>
              <li>
                <strong>Complete the Puzzle:</strong> Continue until the entire grid is filled
              </li>
            </ol>
          </div>

          <div className="instruction-section">
            <h3>🔧 Controls</h3>
            <ul>
              <li><strong>Click Block:</strong> Select/deselect a block</li>
              <li><strong>Rotate Button:</strong> Rotate the selected block 90° clockwise</li>
              <li><strong>Click Grid:</strong> Place the selected block</li>
              <li><strong>Reset:</strong> Restart the current puzzle</li>
              <li><strong>Previous/Next:</strong> Navigate between challenges</li>
            </ul>
          </div>

          <div className="instruction-section">
            <h3>🎲 Difficulty Levels</h3>
            <div className="difficulty-grid">
              <div className="difficulty-item">
                <span className="difficulty difficulty-beginner">Beginner</span>
                <p>Simple layouts with obvious placements</p>
              </div>
              <div className="difficulty-item">
                <span className="difficulty difficulty-advanced">Advanced</span>
                <p>More complex patterns requiring strategy</p>
              </div>
              <div className="difficulty-item">
                <span className="difficulty difficulty-master">Master</span>
                <p>Challenging puzzles for experienced players</p>
              </div>
              <div className="difficulty-item">
                <span className="difficulty difficulty-grandmaster">Grandmaster</span>
                <p>Expert-level brain teasers</p>
              </div>
            </div>
          </div>

          <div className="instruction-section">
            <h3>💡 Tips</h3>
            <ul>
              <li>Start by placing the larger blocks first</li>
              <li>Pay attention to corner and edge pieces</li>
              <li>Use the rotation feature to find the perfect fit</li>
              <li>Some puzzles have starter blocks already placed</li>
              <li>Take your time - there's no time pressure!</li>
            </ul>
          </div>
        </div>

        <div className="instructions-footer">
          <button onClick={onClose} className="btn btn-primary">
            Got it! Let's Play 🎮
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameInstructions;