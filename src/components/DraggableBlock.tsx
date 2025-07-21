import React, { memo, useMemo } from 'react';
import { Group, Rect } from 'react-konva';
import { useDraggable } from '@dnd-kit/core';
import { BlockShape, CELL_SIZE } from '../types/game';
import { useMultiModalDoubleInteraction } from '../hooks/useDoubleClick';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import { useBlockRotationGestures } from '../hooks/useSwipeGestures';
import { useThrottledCallback, usePerformanceMonitor } from '../hooks/usePerformanceOptimization';
import { TouchFeedback } from './TouchFeedback';

interface DraggableBlockProps {
  block: BlockShape;
  isSelected?: boolean;
  onSelect?: () => void;
  onDoubleClick?: () => void;
  rotation?: number;
  scale?: number;
  x?: number;
  y?: number;
  enableDrag?: boolean;
  renderAsHTML?: boolean;
  isStarterBlock?: boolean;
  cellSize?: number; // Add responsive cell size prop
  isInInventory?: boolean; // 标识是否在 inventory 中
}

const DraggableBlock: React.FC<DraggableBlockProps> = memo(({
  block,
  isSelected = false,
  onSelect,
  onDoubleClick,
  rotation = 0,
  scale = 0.8,
  x = 0,
  y = 0,
  enableDrag = false,
  renderAsHTML = false,
  isStarterBlock = false,
  cellSize = CELL_SIZE, // Use responsive cell size or fallback
  isInInventory = false // 新增属性来标识是否在 inventory 中
}) => {
  // Performance monitoring
  usePerformanceMonitor(`DraggableBlock-${block.id}`);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    disabled: !enableDrag,
  });

  const { hasTouch, interactionMode } = useDeviceCapabilities();

  // Throttled callbacks for better performance
  const throttledSelect = useThrottledCallback(() => {
    if (onSelect) {
      onSelect();
    }
  }, 150);

  const throttledDoubleClick = useThrottledCallback(() => {
    if (onDoubleClick) {
      onDoubleClick();
    }
  }, 200);

  // Double click/tap handling for rotation
  const doubleInteraction = useMultiModalDoubleInteraction({
    onSingleClick: throttledSelect,
    onDoubleClick: throttledDoubleClick,
    onSingleTap: throttledSelect,
    onDoubleTap: throttledDoubleClick,
    touchEnabled: hasTouch && interactionMode.primary === 'tap'
  });

  // Swipe gestures for rotation (only enabled when not starter block and not dragging)
  const swipeGestures = useBlockRotationGestures({
    onRotateClockwise: throttledDoubleClick,
    onRotateCounterClockwise: throttledDoubleClick,
    enabled: !isStarterBlock && !enableDrag && hasTouch
  });

  // Memoize expensive pattern rotation calculation
  const currentPattern = useMemo(() => {
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
    
    return rotatePattern(block.pattern, rotation);
  }, [block.pattern, rotation]);

  const effectiveCellSize = useMemo(() => cellSize * scale, [cellSize, scale]);

  const renderBlock = (): React.ReactElement[] => {
    const cells: React.ReactElement[] = [];
    
    currentPattern.forEach((row, rowIndex) => {
      row.forEach((isOccupied, colIndex) => {
        if (isOccupied) {
          cells.push(
            <Rect
              key={`${block.id}-${rowIndex}-${colIndex}`}
              x={colIndex * effectiveCellSize}
              y={rowIndex * effectiveCellSize}
              width={effectiveCellSize - 2}
              height={effectiveCellSize - 2}
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

  const blockWidth = currentPattern[0].length * effectiveCellSize;
  const blockHeight = currentPattern.length * effectiveCellSize;

  const renderHTMLBlock = (): React.ReactElement => {
    const cells: React.ReactElement[] = [];

    // Scale the gap based on the scale factor
    const gap = Math.max(1, Math.round(scale * 2));
    
    // Check if mobile for borderRadius
    const isMobile = window.innerWidth <= 768;

    // 在inventory模式下计算居中偏移
    let centerOffsetX = 0;
    let centerOffsetY = 0;

    if (isInInventory) {
      const patternWidth = currentPattern[0].length * effectiveCellSize;
      const patternHeight = currentPattern.length * effectiveCellSize;
      centerOffsetX = (blockWidth - patternWidth) / 2;
      centerOffsetY = (blockHeight - patternHeight) / 2;
    }

    currentPattern.forEach((row, rowIndex) => {
      row.forEach((isOccupied, colIndex) => {
        if (isOccupied) {
          cells.push(
            <div
              key={`${block.id}-${rowIndex}-${colIndex}`}
              style={{
                position: 'absolute',
                left: colIndex * effectiveCellSize + gap + centerOffsetX,
                top: rowIndex * effectiveCellSize + gap + centerOffsetY,
                width: effectiveCellSize - gap * 2,
                height: effectiveCellSize - gap * 2,
                backgroundColor: block.color,
                borderRadius: 0, // Keep blocks square for consistent tetris-like appearance
                background: `linear-gradient(135deg, ${block.color} 0%, ${block.color}e6 100%)`,
                // 防止iOS文本选择和长按菜单
                userSelect: 'none',
                WebkitUserSelect: 'none',
                WebkitTouchCallout: 'none',
                WebkitUserDrag: 'none',
                pointerEvents: 'none' // cells不需要直接交互
              }}
            />
          );
        }
      });
    });

    return (
      <div style={{
        position: 'relative', // 在inventory中也使用relative定位
        left: 0, // 在inventory中不使用x偏移
        top: 0,  // 在inventory中不使用y偏移
        width: blockWidth,
        height: blockHeight,
        borderRadius: 0, // Keep block containers square for consistent tetris-like appearance
        // 移除选中状态的视觉效果
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
        boxSizing: 'border-box',
        // 防止iOS文本选择和长按菜单
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitUserDrag: 'none',
        pointerEvents: isInInventory ? 'none' : 'auto' // 在 inventory 中时让容器处理事件
      }}>
        {cells}
      </div>
    );
  };

  if (renderAsHTML) {
    const dragStyle = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      opacity: isDragging ? 0 : 1, // 完全隐藏拖拽中的原始 block
      transition: isDragging ? 'none' : 'all 0.2s ease',
    } : {};

    // Optimized touch handlers with throttling for better performance
    const combinedTouchStart = useThrottledCallback((event: React.TouchEvent) => {
      // Call double interaction handler first
      doubleInteraction.onTouchStart?.(event);
      // Then call swipe gesture handler
      if (!isStarterBlock && !enableDrag) {
        swipeGestures.gestureHandlers.onTouchStart(event);
      }
    }, 50);

    const combinedTouchMove = useThrottledCallback((event: React.TouchEvent) => {
      if (!isStarterBlock && !enableDrag) {
        swipeGestures.gestureHandlers.onTouchMove(event);
      }
    }, 16); // Limit to 60fps

    const combinedTouchEnd = useThrottledCallback((event: React.TouchEvent) => {
      if (!isStarterBlock && !enableDrag) {
        swipeGestures.gestureHandlers.onTouchEnd(event);
      }
    }, 50);

    return (
      <TouchFeedback
        as="div"
        ref={setNodeRef}
        data-dnd-kit-draggable="true"
        data-block-id={block.id}
        variant="subtle"
        enableHaptic={!isStarterBlock}
        enableRipple={!isStarterBlock}
        disabled={isStarterBlock}
        className={`game-element ${enableDrag ? 'draggable-element' : ''} ${hasTouch ? 'ios-drag-safe' : ''}`}
        style={{
          position: 'absolute',
          left: isInInventory ? 0 : x, // 在 inventory 中时从容器左上角开始
          top: isInInventory ? 0 : y,  // 在 inventory 中时从容器左上角开始
          // 只在 inventory 中时填充整个容器
          ...(isInInventory ? {
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          } : {}),
          cursor: isStarterBlock ? 'not-allowed' : (enableDrag ? (isDragging ? 'grabbing' : 'grab') : 'pointer'),
          zIndex: isDragging ? 1000 : 10,
          willChange: 'transform',
          opacity: isStarterBlock ? 0.9 : 1,
          borderRadius: '0 !important', // Force square appearance for blocks
          ...dragStyle,
        }}
        onClick={doubleInteraction.onClick}
        onTouchStart={combinedTouchStart}
        onTouchMove={combinedTouchMove}
        onTouchEnd={combinedTouchEnd}
        {...listeners}
        {...attributes}
      >
        {renderHTMLBlock()}
      </TouchFeedback>
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
});

// Display name for better debugging
DraggableBlock.displayName = 'DraggableBlock';

export default DraggableBlock;