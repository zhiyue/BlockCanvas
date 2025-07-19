import React from 'react';
import { Stage, Layer, Rect, Group } from 'react-konva';
import { useDroppable } from '@dnd-kit/core';
import { BOARD_SIZE, CELL_SIZE, Position } from '../types/game';
import './GameBoard.css';

interface GameBoardProps {
  placedBlocks: { [key: string]: { position: Position; color: string; pattern: boolean[][] } };
  onCellClick?: (x: number, y: number) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ placedBlocks, onCellClick }) => {
  const boardWidth = BOARD_SIZE * CELL_SIZE;
  const boardHeight = BOARD_SIZE * CELL_SIZE;

  const handleCellClick = (x: number, y: number) => {
    if (onCellClick) {
      onCellClick(x, y);
    }
  };

  const renderGrid = () => {
    const gridLines = [];
    
    // Vertical lines
    for (let i = 0; i <= BOARD_SIZE; i++) {
      gridLines.push(
        <Rect
          key={`v-line-${i}`}
          x={i * CELL_SIZE}
          y={0}
          width={1}
          height={boardHeight}
          fill="#cccccc"
        />
      );
    }
    
    // Horizontal lines
    for (let i = 0; i <= BOARD_SIZE; i++) {
      gridLines.push(
        <Rect
          key={`h-line-${i}`}
          x={0}
          y={i * CELL_SIZE}
          width={boardWidth}
          height={1}
          fill="#cccccc"
        />
      );
    }
    
    return gridLines;
  };

  const renderCells = () => {
    const cells = [];
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        cells.push(
          <Rect
            key={`cell-${row}-${col}`}
            x={col * CELL_SIZE + 1}
            y={row * CELL_SIZE + 1}
            width={CELL_SIZE - 2}
            height={CELL_SIZE - 2}
            fill="#ffffff"
            stroke="#f0f0f0"
            strokeWidth={1}
            onClick={() => handleCellClick(col, row)}
            onTap={() => handleCellClick(col, row)}
          />
        );
      }
    }
    
    return cells;
  };

  const renderPlacedBlocks = (): React.ReactElement[] => {
    const blocks: React.ReactElement[] = [];
    
    Object.entries(placedBlocks).forEach(([blockId, blockData]) => {
      const { position, color, pattern } = blockData;
      
      pattern.forEach((row, rowIndex) => {
        row.forEach((isOccupied, colIndex) => {
          if (isOccupied) {
            const x = (position.x + colIndex) * CELL_SIZE + 1;
            const y = (position.y + rowIndex) * CELL_SIZE + 1;
            
            blocks.push(
              <Rect
                key={`block-${blockId}-${rowIndex}-${colIndex}`}
                x={x}
                y={y}
                width={CELL_SIZE - 2}
                height={CELL_SIZE - 2}
                fill={color}
                stroke="#ffffff"
                strokeWidth={2}
                shadowColor="#000000"
                shadowBlur={5}
                shadowOffset={{ x: 2, y: 2 }}
                shadowOpacity={0.3}
              />
            );
          }
        });
      });
    });
    
    return blocks;
  };

  return (
    <div className="game-board-container">
      <Stage width={boardWidth + 2} height={boardHeight + 2}>
        <Layer>
          {/* Board background */}
          <Rect
            x={0}
            y={0}
            width={boardWidth + 2}
            height={boardHeight + 2}
            fill="#f8f9fa"
            stroke="#dee2e6"
            strokeWidth={2}
          />
          
          {/* Grid cells */}
          {renderCells()}
          
          {/* Grid lines */}
          {renderGrid()}
          
          {/* Placed blocks */}
          <Group>
            {renderPlacedBlocks()}
          </Group>
        </Layer>
      </Stage>
    </div>
  );
};

export default GameBoard;