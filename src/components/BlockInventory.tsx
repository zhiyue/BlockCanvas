import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import DraggableBlock from './DraggableBlock';
import { BlockShape, CELL_SIZE } from '../types/game';
import { getBlockById } from '../data/blocks';
import './BlockInventory.css';

interface BlockInventoryProps {
  availableBlocks: string[];
  allBlocks: string[]; // 所有 blocks 的列表，用于固定布局
  selectedBlock: string | null;
  onBlockSelect: (blockId: string | null) => void;
  onBlockPlace?: (blockId: string, x: number, y: number) => boolean;
  blockRotations?: {[key: string]: number};
  onBlockRotate?: (blockId: string) => void;
  interactionMode?: 'drag' | 'tap';
  tapModeState?: {
    selectedBlockForPlacement: string | null;
    selectedBlockRotation: number;
  };
  onTapModeSelect?: (blockId: string | null) => void;
  onTapModeRotate?: () => void;
  responsiveCellSize?: number; // Add responsive cell size prop
}

const BlockInventory: React.FC<BlockInventoryProps> = ({
  availableBlocks,
  allBlocks,
  selectedBlock,
  onBlockSelect,
  blockRotations = {},
  onBlockRotate,
  interactionMode = 'drag',
  tapModeState,
  onTapModeSelect,
  onTapModeRotate,
  responsiveCellSize = CELL_SIZE // Use responsive cell size or fallback
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'block-inventory',
    data: {
      type: 'inventory'
    }
  });
  const getBlockRotation = (blockId: string): number => {
    return blockRotations[blockId] || 0;
  };

  const renderBlockGrid = () => {
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;

    // Desktop: Use a flexible grid layout that shows all blocks
    if (!isMobile) {
      const gridCols = 3; // 3 columns to fit in container width
      const cellSize = 14; // Even smaller cell size to ensure fit
      const padding = 8;
      const maxBlockSize = 5;
      const blockSpacing = cellSize * (maxBlockSize + 1) + padding;

      console.log(`Desktop: Rendering ${allBlocks.length} blocks in ${gridCols} columns`);
      console.log(`Desktop: cellSize=${cellSize}, padding=${padding}, blockSpacing=${blockSpacing}`);
      console.log(`Desktop: Total width needed = ${gridCols * blockSpacing + padding}px`);

      return allBlocks.map((blockId, index) => {
        const block = getBlockById(blockId);
        if (!block) {
          console.warn(`Block not found: ${blockId}`);
          return null;
        }

        const col = index % gridCols;
        const row = Math.floor(index / gridCols);
        const x = col * blockSpacing + padding;
        const y = row * blockSpacing + padding;

        console.log(`Block ${blockId}: position (${col}, ${row}) -> (${x}, ${y})`);

        const isAvailable = availableBlocks.includes(blockId);
        const currentRotation = getBlockRotation(blockId);
        const isSelected = interactionMode === 'drag'
          ? selectedBlock === blockId
          : tapModeState?.selectedBlockForPlacement === blockId;

        const handleSelect = () => {
          if (interactionMode === 'tap') {
            onTapModeSelect?.(isSelected ? null : blockId);
          } else {
            onBlockSelect(isSelected ? null : blockId);
          }
        };

        const handleDoubleClick = () => {
          if (onBlockRotate && isAvailable) {
            onBlockRotate(blockId);
          }
        };

        // Calculate rotated dimensions for centering
        let rotatedDimensions = { width: block.width, height: block.height };
        if (currentRotation % 2 === 1) {
          rotatedDimensions = { width: block.height, height: block.width };
        }

        const blockScale = 0.8; // Slightly larger scale to compensate for smaller cell size
        const centerOffsetX = (cellSize * maxBlockSize - rotatedDimensions.width * cellSize * blockScale) / 2;
        const centerOffsetY = (cellSize * maxBlockSize - rotatedDimensions.height * cellSize * blockScale) / 2;

        if (isAvailable) {
          return (
            <div key={`container-${block.id}`} style={{
              position: 'absolute',
              left: x,
              top: y,
              width: cellSize * maxBlockSize,
              height: cellSize * maxBlockSize,
              border: '1px solid rgba(0,0,0,0.1)', // More visible border for debugging
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255,255,255,0.5)' // Light background for visibility
            }}>
              <DraggableBlock
                key={block.id}
                block={block}
                isSelected={isSelected}
                onSelect={handleSelect}
                onDoubleClick={handleDoubleClick}
                rotation={currentRotation}
                scale={blockScale}
                x={centerOffsetX}
                y={centerOffsetY}
                enableDrag={interactionMode === 'drag'}
                renderAsHTML={true}
                cellSize={cellSize}
              />
            </div>
          );
        } else {
          // Show placeholder for unavailable blocks
          return (
            <div
              key={`placeholder-${block.id}`}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: cellSize * maxBlockSize,
                height: cellSize * maxBlockSize,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed rgba(200,200,200,0.5)',
                backgroundColor: 'rgba(241, 245, 249, 0.2)'
              }}
            >
              <div
                style={{
                  width: block.width * cellSize * blockScale,
                  height: block.height * cellSize * blockScale,
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: '3px',
                  backgroundColor: 'rgba(241, 245, 249, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  color: '#94a3b8',
                  fontWeight: '500',
                  padding: '4px',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}
              >
                {block.name.match(/\d+×\d+/)?.[0] || block.id}
              </div>
            </div>
          );
        }
      });
    }

    // Mobile layout (existing logic)
    const gridCols = 3;
    const maxBlockSize = 5;
    let containerWidth, cellSize, padding;

    if (isSmallMobile) {
      containerWidth = window.innerWidth - 30;
      cellSize = Math.max(4, responsiveCellSize * 0.3);
      padding = 4;
    } else {
      containerWidth = Math.min(window.innerWidth - 40, 320);
      cellSize = Math.max(5, responsiveCellSize * 0.4);
      padding = 6;
    }

    return allBlocks.map((blockId, index) => {
      const block = getBlockById(blockId);
      if (!block) {
        console.warn(`Block not found: ${blockId}`);
        return null;
      }

      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      // Use 5x5 grid for each block slot to accommodate all rotations
      const maxBlockSize = 5; // Maximum dimension any block can have when rotated
      const blockSpacingMultiplier = isMobile ? maxBlockSize + 1 : maxBlockSize + 1.5; // Optimized spacing for desktop
      const x = col * (cellSize * blockSpacingMultiplier + padding) + padding;
      const y = row * (cellSize * blockSpacingMultiplier + padding) + padding;
      
      // Debug positioning for desktop
      if (!isMobile && process.env.NODE_ENV === 'development') {
        console.log(`Block ${blockId}: col=${col}, row=${row}, x=${x}, y=${y}, cellSize=${cellSize}, padding=${padding}, multiplier=${blockSpacingMultiplier}`);
      }

      const isAvailable = availableBlocks.includes(blockId);

      if (isAvailable) {
        // 渲染可用的 block
        const isSelectedForDrag = selectedBlock === block.id;
        const isSelectedForTap = tapModeState?.selectedBlockForPlacement === block.id;
        const isSelected = interactionMode === 'tap' ? isSelectedForTap : isSelectedForDrag;
        
        const handleSelect = () => {
          if (interactionMode === 'tap') {
            // Tap mode: select for placement
            if (onTapModeSelect) {
              onTapModeSelect(isSelectedForTap ? null : block.id);
            }
          } else {
            // Drag mode: use original selection
            onBlockSelect(isSelectedForDrag ? null : block.id);
          }
        };

        const currentRotation = interactionMode === 'tap' 
          ? (isSelectedForTap ? tapModeState.selectedBlockRotation : 0)
          : getBlockRotation(block.id);

        const handleDoubleClick = () => {
          if (interactionMode === 'tap' && isSelectedForTap) {
            // In tap mode, double-click rotates the selected block
            onTapModeRotate?.();
          } else if (interactionMode === 'drag') {
            // In drag mode, double-click can also rotate
            onBlockRotate?.(block.id);
          }
        };

        // Calculate the actual block dimensions after rotation
        const rotatedDimensions = currentRotation % 2 === 1 
          ? { width: block.height, height: block.width }
          : { width: block.width, height: block.height };
        
        // Center the block within the 5x5 grid - improved scaling for desktop
        const blockScale = isMobile ? 0.4 : 0.8; // Further increased scale for desktop
        const centerOffsetX = (cellSize * maxBlockSize - rotatedDimensions.width * cellSize * blockScale) / 2;
        const centerOffsetY = (cellSize * maxBlockSize - rotatedDimensions.height * cellSize * blockScale) / 2;

        return (
          <div key={`container-${block.id}`} style={{
            position: 'absolute',
            left: x,
            top: y,
            width: cellSize * maxBlockSize,
            height: cellSize * maxBlockSize,
            border: '1px dashed rgba(0,0,0,0.1)', // Debug border
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DraggableBlock
              key={block.id}
              block={block}
              isSelected={isSelected}
              onSelect={handleSelect}
              onDoubleClick={handleDoubleClick}
              rotation={currentRotation}
              scale={blockScale}
              x={centerOffsetX}
              y={centerOffsetY}
              enableDrag={interactionMode === 'drag'}
              renderAsHTML={true}
              cellSize={cellSize}
            />
          </div>
        );
      } else {
        // 渲染空白占位符
        // 为占位符创建一个容器，显示整个网格位置
        return (
          <div
            key={`placeholder-container-${block.id}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: cellSize * maxBlockSize,
              height: cellSize * maxBlockSize,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* 内部占位符，显示实际的 block 轮廓 */}
            <div
              style={{
                width: block.width * cellSize * (isMobile ? 0.4 : 0.8),
                height: block.height * cellSize * (isMobile ? 0.4 : 0.8),
                border: '1.5px dashed #cbd5e1',
                borderRadius: isMobile ? 0 : '3px',
                backgroundColor: 'rgba(241, 245, 249, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isMobile ? '10px' : '11px',
                color: '#94a3b8',
                fontWeight: '500',
                padding: '4px',
                textAlign: 'center',
                lineHeight: '1.2'
              }}
            >
              {block.name.match(/\d+×\d+/)?.[0] || block.id}
            </div>
          </div>
        );
      }
    });
  };

  const calculateInventorySize = () => {
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;

    if (!isMobile) {
      // Desktop: Calculate size for scrollable container
      const gridCols = 3;
      const cellSize = 14;
      const padding = 8;
      const maxBlockSize = 5;
      const blockSpacing = cellSize * (maxBlockSize + 1) + padding;
      const rows = Math.ceil(allBlocks.length / gridCols);

      return {
        width: gridCols * blockSpacing + padding,
        height: rows * blockSpacing + padding
      };
    }

    // Mobile: Use existing logic
    const blocks = allBlocks.length;
    const gridCols = 3;
    const rows = Math.ceil(blocks / gridCols);
    let containerWidth, cellSize, padding;

    if (isSmallMobile) {
      containerWidth = window.innerWidth - 30;
      cellSize = Math.max(4, responsiveCellSize * 0.3);
      padding = 4;
    } else {
      containerWidth = Math.min(window.innerWidth - 40, 320);
      cellSize = Math.max(5, responsiveCellSize * 0.4);
      padding = 6;
    }

    const maxBlockSize = 5;
    const blockSpacingMultiplier = maxBlockSize + 1;
    return {
      width: Math.max(containerWidth, gridCols * (cellSize * blockSpacingMultiplier + padding) + padding),
      height: rows * (cellSize * blockSpacingMultiplier + padding) + padding
    };
  };

  const inventorySize = calculateInventorySize();

  const isMobile = window.innerWidth <= 768;

  return (
    <div className="block-inventory">
      <h3 className="inventory-title">Available Blocks ({availableBlocks.length}/{allBlocks.length})</h3>

      <div
        className="inventory-wrapper"
        style={{
          width: isMobile ? '100%' : '320px', // Reduced width to fit content
          height: isMobile ? 'auto' : '400px',
          border: isOver ? '3px solid #10b981' : '2px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: isOver ? '#ecfdf5' : '#f8fafc',
          transition: 'all 0.2s ease',
          overflowX: isMobile ? 'visible' : 'hidden', // No horizontal scroll
          overflowY: isMobile ? 'visible' : 'auto', // Only vertical scroll on desktop
          position: 'relative'
        }}
      >
        <div
          ref={setNodeRef}
          className="inventory-container"
          style={{
            position: 'relative',
            width: inventorySize.width,
            height: inventorySize.height,
            minWidth: isMobile ? 'auto' : inventorySize.width,
            minHeight: isMobile ? 'auto' : inventorySize.height
          }}
        >
          {renderBlockGrid()}
          {isOver && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#059669',
              pointerEvents: 'none'
            }}>
              Drop here to return block
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockInventory;