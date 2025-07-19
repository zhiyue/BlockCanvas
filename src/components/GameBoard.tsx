import React from 'react';
import { Stage, Layer, Rect, Group } from 'react-konva';
import { useDroppable } from '@dnd-kit/core';
import { BOARD_SIZE, CELL_SIZE, Position, CoordinateSystem, BOARD_CONFIG } from '../types/game';
import DraggableBlock from './DraggableBlock';
import { getBlockById } from '../data/blocks';
import './GameBoard.css';

interface GameBoardProps {
  placedBlocks: { [key: string]: { position: Position; color: string; pattern: boolean[][]; rotation: number } };
  onCellClick?: (x: number, y: number) => void;
  selectedBlock?: string | null;
  onBlockSelect?: (blockId: string | null) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ placedBlocks, onCellClick, selectedBlock, onBlockSelect }) => {
  const boardDimensions = CoordinateSystem.getBoardDimensions();

  const { isOver, setNodeRef } = useDroppable({
    id: 'game-board',
    data: {
      type: 'board'
    }
  });

  const handleCellClick = (x: number, y: number) => {
    if (onCellClick) {
      onCellClick(x, y);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - 1; // Subtract border offset
    const y = event.clientY - rect.top - 1;
    
    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);
    
    if (gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE) {
      handleCellClick(gridX, gridY);
    }
  };

  const renderGrid = () => {
    const gridLines = [];

    // Vertical lines
    for (let i = 0; i <= BOARD_SIZE; i++) {
      const { x } = CoordinateSystem.gridToCanvas(i, 0);
      gridLines.push(
        <Rect
          key={`v-line-${i}`}
          x={x}
          y={BOARD_CONFIG.BORDER_WIDTH}
          width={BOARD_CONFIG.GRID_LINE_WIDTH}
          height={boardDimensions.height}
          fill="#cccccc"
        />
      );
    }

    // Horizontal lines
    for (let i = 0; i <= BOARD_SIZE; i++) {
      const { y } = CoordinateSystem.gridToCanvas(0, i);
      gridLines.push(
        <Rect
          key={`h-line-${i}`}
          x={BOARD_CONFIG.BORDER_WIDTH}
          y={y}
          width={boardDimensions.width}
          height={BOARD_CONFIG.GRID_LINE_WIDTH}
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
        const cellBounds = CoordinateSystem.getCellBounds(col, row);
        cells.push(
          <Rect
            key={`cell-${row}-${col}`}
            x={cellBounds.x}
            y={cellBounds.y}
            width={cellBounds.width}
            height={cellBounds.height}
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
            const cellBounds = CoordinateSystem.getCellBounds(
              position.x + colIndex,
              position.y + rowIndex
            );

            blocks.push(
              <Rect
                key={`block-${blockId}-${rowIndex}-${colIndex}`}
                x={cellBounds.x}
                y={cellBounds.y}
                width={cellBounds.width}
                height={cellBounds.height}
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

  const renderDraggablePlacedBlocks = (): React.ReactElement[] => {
    const draggableBlocks: React.ReactElement[] = [];

    Object.entries(placedBlocks).forEach(([blockId, blockData]) => {
      const { position, rotation } = blockData;
      const block = getBlockById(blockId);

      if (block) {
        const blockPosition = CoordinateSystem.gridToCanvas(position.x, position.y);
        draggableBlocks.push(
          <DraggableBlock
            key={`draggable-${blockId}`}
            block={block}
            isSelected={selectedBlock === blockId}
            onSelect={() => onBlockSelect && onBlockSelect(selectedBlock === blockId ? null : blockId)}
            rotation={rotation}
            scale={1}
            x={blockPosition.x}
            y={blockPosition.y}
            enableDrag={true}
            renderAsHTML={true}
          />
        );
      }
    });

    return draggableBlocks;
  };

  return (
    <div className="game-board-container" style={{ position: 'relative' }}>
      <Stage width={boardDimensions.totalWidth} height={boardDimensions.totalHeight}>
        <Layer>
          {/* Board background */}
          <Rect
            x={0}
            y={0}
            width={boardDimensions.totalWidth}
            height={boardDimensions.totalHeight}
            fill="#f8f9fa"
            stroke="#dee2e6"
            strokeWidth={BOARD_CONFIG.BORDER_WIDTH}
          />

          {/* Grid cells */}
          {renderCells()}

          {/* Grid lines */}
          {renderGrid()}

          {/* Note: Placed blocks are now rendered as HTML draggable overlays instead of Canvas */}
        </Layer>
      </Stage>

      {/* Draggable overlays for placed blocks */}
      {renderDraggablePlacedBlocks()}

      {/* Invisible overlay for drag-and-drop */}
      <div
        ref={setNodeRef}
        style={{
          position: 'absolute',
          top: BOARD_CONFIG.BORDER_WIDTH,
          left: BOARD_CONFIG.BORDER_WIDTH,
          width: boardDimensions.width,
          height: boardDimensions.height,
          backgroundColor: isOver ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
          border: isOver ? '2px dashed #4f46e5' : 'none',
          pointerEvents: isOver ? 'auto' : 'none',
          cursor: 'crosshair',
          zIndex: 100
        }}
        onClick={handleOverlayClick}
      />
    </div>
  );
};

export default GameBoard;