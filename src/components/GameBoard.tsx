import React from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { useDroppable } from '@dnd-kit/core';
import { BOARD_SIZE, Position, CoordinateSystem, BOARD_CONFIG } from '../types/game';
import DraggableBlock from './DraggableBlock';
import { getBlockById } from '../data/blocks';
import { useGameStore } from '../store/gameStore';
import './GameBoard.css';

interface GameBoardProps {
  placedBlocks: { [key: string]: { position: Position; color: string; pattern: boolean[][]; rotation: number } };
  onCellClick?: (x: number, y: number) => void;
  selectedBlock?: string | null;
  onBlockSelect?: (blockId: string | null) => void;
  draggedBlock?: string | null;
  blockRotations?: {[key: string]: number};
  previewPosition?: {x: number, y: number} | null;
}

const GameBoard: React.FC<GameBoardProps> = ({
  placedBlocks,
  onCellClick,
  selectedBlock,
  onBlockSelect,
  draggedBlock,
  blockRotations = {},
  previewPosition
}) => {
  const boardDimensions = CoordinateSystem.getBoardDimensions();
  const { isPositionValid, isStarterBlock } = useGameStore();

  const { isOver, setNodeRef } = useDroppable({
    id: 'game-board',
    data: {
      type: 'board'
    }
  });



  // Get valid positions for the dragged block
  const getValidPositions = (): Position[] => {
    if (!draggedBlock) return [];

    const block = getBlockById(draggedBlock);
    if (!block) return [];

    const rotation = blockRotations[draggedBlock] || 0;
    const validPositions: Position[] = [];

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        // 在检查位置有效性时，忽略当前被拖拽的 block
        if (isPositionValid(draggedBlock, x, y, rotation, draggedBlock)) {
          validPositions.push({ x, y });
        }
      }
    }

    return validPositions;
  };

  // Render preview block at the preview position
  const renderPreviewBlock = (): React.ReactElement[] => {
    if (!previewPosition || !draggedBlock) return [];

    const block = getBlockById(draggedBlock);
    if (!block) return [];

    const rotation = blockRotations[draggedBlock] || 0;
    const rotatedPattern = rotatePattern(block.pattern, rotation);
    const previewCells: React.ReactElement[] = [];

    rotatedPattern.forEach((row, rowIndex) => {
      row.forEach((isOccupied, colIndex) => {
        if (isOccupied) {
          const cellBounds = CoordinateSystem.getCellBounds(
            previewPosition.x + colIndex,
            previewPosition.y + rowIndex
          );

          previewCells.push(
            <Rect
              key={`preview-${draggedBlock}-${rowIndex}-${colIndex}`}
              x={cellBounds.x}
              y={cellBounds.y}
              width={cellBounds.width}
              height={cellBounds.height}
              fill={block.color}
              opacity={0.4}
              stroke="#4f46e5"
              strokeWidth={2}
              dash={[8, 4]}
              cornerRadius={3}
              shadowColor="#4f46e5"
              shadowBlur={8}
              shadowOpacity={0.3}
            />
          );
        }
      });
    });

    return previewCells;
  };

  // Helper function to rotate pattern (same as in DraggableBlock)
  const rotatePattern = (pattern: boolean[][], times: number): boolean[][] => {
    let rotated = pattern;
    for (let i = 0; i < times; i++) {
      const rows = rotated.length;
      const cols = rotated[0].length;
      const newPattern: boolean[][] = Array(cols).fill(null).map(() => Array(rows).fill(false));

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          newPattern[c][rows - 1 - r] = rotated[r][c];
        }
      }
      rotated = newPattern;
    }
    return rotated;
  };

  const handleCellClick = (x: number, y: number) => {
    if (onCellClick) {
      onCellClick(x, y);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    const { x: gridX, y: gridY } = CoordinateSystem.canvasToGrid(canvasX, canvasY);

    if (gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE) {
      handleCellClick(gridX, gridY);
    }
  };

  const renderGrid = () => {
    const gridLines = [];

    // Vertical lines with subtle gradient
    for (let i = 0; i <= BOARD_SIZE; i++) {
      const { x } = CoordinateSystem.gridToCanvas(i, 0);
      gridLines.push(
        <Rect
          key={`v-line-${i}`}
          x={x}
          y={BOARD_CONFIG.BORDER_WIDTH}
          width={BOARD_CONFIG.GRID_LINE_WIDTH}
          height={boardDimensions.height}
          fill="#e2e8f0"
          opacity={0.6}
        />
      );
    }

    // Horizontal lines with subtle gradient
    for (let i = 0; i <= BOARD_SIZE; i++) {
      const { y } = CoordinateSystem.gridToCanvas(0, i);
      gridLines.push(
        <Rect
          key={`h-line-${i}`}
          x={BOARD_CONFIG.BORDER_WIDTH}
          y={y}
          width={boardDimensions.width}
          height={BOARD_CONFIG.GRID_LINE_WIDTH}
          fill="#e2e8f0"
          opacity={0.6}
        />
      );
    }

    return gridLines;
  };

  const renderCells = () => {
    const cells = [];
    const validPositions = getValidPositions();
    const validPositionSet = new Set(validPositions.map(pos => `${pos.x}-${pos.y}`));

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cellBounds = CoordinateSystem.getCellBounds(col, row);
        const isValidPosition = validPositionSet.has(`${col}-${row}`);

        cells.push(
          <Rect
            key={`cell-${row}-${col}`}
            x={cellBounds.x}
            y={cellBounds.y}
            width={cellBounds.width}
            height={cellBounds.height}
            fill={isValidPosition ? "rgba(79, 70, 229, 0.08)" : "rgba(248, 250, 252, 0.9)"}
            stroke={isValidPosition ? "rgba(79, 70, 229, 0.3)" : "rgba(226, 232, 240, 0.5)"}
            strokeWidth={isValidPosition ? 1.5 : 0.5}
            cornerRadius={2}
            shadowColor={isValidPosition ? "rgba(79, 70, 229, 0.1)" : "transparent"}
            shadowBlur={isValidPosition ? 4 : 0}
            shadowOffset={{ x: 0, y: 1 }}
            shadowOpacity={0.3}
            onClick={() => handleCellClick(col, row)}
            onTap={() => handleCellClick(col, row)}
          />
        );
      }
    }

    return cells;
  };



  const renderDraggablePlacedBlocks = (): React.ReactElement[] => {
    const draggableBlocks: React.ReactElement[] = [];

    Object.entries(placedBlocks).forEach(([blockId, blockData]) => {
      // 如果这个 block 正在被拖拽，就不渲染它
      if (draggedBlock === blockId) {
        return;
      }

      const { position, rotation } = blockData;
      const block = getBlockById(blockId);

      if (block) {
        const blockPosition = CoordinateSystem.gridToCanvas(position.x, position.y);
        const isStarter = isStarterBlock(blockId);

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
            enableDrag={!isStarter} // starter blocks 不可拖拽
            renderAsHTML={true}
            isStarterBlock={isStarter} // 传递 starter block 标识
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
          {/* Board background with clean modern look */}
          <Rect
            x={0}
            y={0}
            width={boardDimensions.totalWidth}
            height={boardDimensions.totalHeight}
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth={1}
            cornerRadius={8}
            shadowColor="rgba(0, 0, 0, 0.08)"
            shadowBlur={8}
            shadowOffset={{ x: 0, y: 2 }}
            shadowOpacity={1}
          />

          {/* Grid cells */}
          {renderCells()}

          {/* Grid lines */}
          {renderGrid()}

          {/* Preview block */}
          {renderPreviewBlock()}

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
          backgroundColor: isOver ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
          border: isOver ? '2px dashed rgba(79, 70, 229, 0.6)' : 'none',
          pointerEvents: draggedBlock ? 'auto' : 'none',
          cursor: draggedBlock ? 'crosshair' : 'default',
          zIndex: draggedBlock ? 100 : 1,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '6px',
          boxShadow: isOver ? 'inset 0 0 20px rgba(79, 70, 229, 0.1)' : 'none'
        }}
        onClick={handleOverlayClick}
      />
    </div>
  );
};

export default GameBoard;