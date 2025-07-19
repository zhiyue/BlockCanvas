import React from 'react';
import { Group, Rect } from 'react-konva';
import { useDraggable } from '@dnd-kit/core';
import { BlockShape, CELL_SIZE } from '../types/game';

interface DraggableBlockProps {
  block: BlockShape;
  isSelected?: boolean;
  onSelect?: () => void;
  rotation?: number;
  scale?: number;
  x?: number;
  y?: number;
  enableDrag?: boolean;
  renderAsHTML?: boolean;
}

const DraggableBlock: React.FC<DraggableBlockProps> = ({ 
  block, 
  isSelected = false, 
  onSelect,
  rotation = 0,
  scale = 0.8,
  x = 0,
  y = 0,
  enableDrag = false,
  renderAsHTML = false
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    disabled: !enableDrag,
  });

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

  const currentPattern = rotatePattern(block.pattern, rotation);
  const cellSize = CELL_SIZE * scale;

  const renderBlock = (): React.ReactElement[] => {
    const cells: React.ReactElement[] = [];
    
    currentPattern.forEach((row, rowIndex) => {
      row.forEach((isOccupied, colIndex) => {
        if (isOccupied) {
          cells.push(
            <Rect
              key={`${block.id}-${rowIndex}-${colIndex}`}
              x={colIndex * cellSize}
              y={rowIndex * cellSize}
              width={cellSize - 2}
              height={cellSize - 2}
              fill={block.color}
              stroke={isSelected ? '#4f46e5' : '#000000'}
              strokeWidth={isSelected ? 4 : 1}
              shadowColor={isSelected ? "#4f46e5" : "#000000"}
              shadowBlur={isSelected ? 8 : 3}
              shadowOffset={{ x: isSelected ? 3 : 1, y: isSelected ? 3 : 1 }}
              shadowOpacity={isSelected ? 0.6 : 0.2}
            />
          );
        }
      });
    });
    
    return cells;
  };

  const blockWidth = currentPattern[0].length * cellSize;
  const blockHeight = currentPattern.length * cellSize;

  const renderHTMLBlock = (): React.ReactElement => {
    const cells: React.ReactElement[] = [];
    
    currentPattern.forEach((row, rowIndex) => {
      row.forEach((isOccupied, colIndex) => {
        if (isOccupied) {
          cells.push(
            <div
              key={`${block.id}-${rowIndex}-${colIndex}`}
              style={{
                position: 'absolute',
                left: colIndex * cellSize,
                top: rowIndex * cellSize,
                width: cellSize - 2,
                height: cellSize - 2,
                backgroundColor: block.color,
                border: isSelected ? '4px solid #4f46e5' : '1px solid #000000',
                borderRadius: '2px',
                boxShadow: isSelected 
                  ? '3px 3px 8px rgba(79, 70, 229, 0.6)' 
                  : '1px 1px 3px rgba(0, 0, 0, 0.2)'
              }}
            />
          );
        }
      });
    });
    
    return (
      <div style={{ position: 'relative', width: blockWidth, height: blockHeight }}>
        {cells}
      </div>
    );
  };

  if (renderAsHTML) {
    const dragStyle = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      opacity: isDragging ? 0.5 : 1,
    } : {};

    return (
      <div
        ref={setNodeRef}
        style={{
          position: 'absolute',
          left: x,
          top: y,
          cursor: enableDrag ? 'grab' : 'pointer',
          padding: '4px',
          borderRadius: '6px',
          backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.15)' : 'rgba(255, 255, 255, 0.05)',
          border: isSelected ? '3px solid #4f46e5' : 'none',
          boxShadow: isSelected ? '0 0 10px rgba(79, 70, 229, 0.4)' : 'none',
          ...dragStyle,
        }}
        onClick={onSelect}
        {...listeners}
        {...attributes}
      >
        {renderHTMLBlock()}
      </div>
    );
  }

  return (
    <Group
      x={x}
      y={y}
      onClick={onSelect}
      onTap={onSelect}
    >
      {/* Background for better visibility */}
      <Rect
        x={-4}
        y={-4}
        width={blockWidth + 8}
        height={blockHeight + 8}
        fill={isSelected ? "rgba(79, 70, 229, 0.15)" : "rgba(255, 255, 255, 0.05)"}
        stroke={isSelected ? '#4f46e5' : 'transparent'}
        strokeWidth={isSelected ? 3 : 0}
        cornerRadius={6}
        shadowColor={isSelected ? "#4f46e5" : "transparent"}
        shadowBlur={isSelected ? 10 : 0}
        shadowOpacity={isSelected ? 0.4 : 0}
      />
      
      {renderBlock()}
    </Group>
  );
};

export default DraggableBlock;