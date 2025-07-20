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
  onTapModeRotate
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
    const gridCols = 3;
    const cellSize = CELL_SIZE * 0.6;
    const padding = 20;

    return allBlocks.map((blockId, index) => {
      const block = getBlockById(blockId);
      if (!block) return null;

      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const x = col * (cellSize * 5 + padding) + padding;
      const y = row * (cellSize * 4 + padding) + padding;

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

        return (
          <DraggableBlock
            key={block.id}
            block={block}
            isSelected={isSelected}
            onSelect={handleSelect}
            onDoubleClick={handleDoubleClick}
            rotation={currentRotation}
            scale={0.6}
            x={x}
            y={y}
            enableDrag={interactionMode === 'drag'}
            renderAsHTML={true}
          />
        );
      } else {
        // 渲染空白占位符
        return (
          <div
            key={`placeholder-${block.id}`}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: cellSize * 5,
              height: cellSize * 4,
              border: '2px dashed #e2e8f0',
              borderRadius: '6px',
              backgroundColor: 'rgba(248, 250, 252, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: '#94a3b8',
              fontWeight: '500'
            }}
          >
            {block.name}
          </div>
        );
      }
    });
  };

  const calculateInventorySize = () => {
    const blocks = allBlocks.length; // 使用所有 blocks 的数量来计算大小
    const gridCols = 3;
    const rows = Math.ceil(blocks / gridCols);
    const cellSize = CELL_SIZE * 0.6;
    const padding = 20;

    return {
      width: gridCols * (cellSize * 5 + padding) + padding,
      height: rows * (cellSize * 4 + padding) + padding
    };
  };

  const inventorySize = calculateInventorySize();

  return (
    <div className="block-inventory">
      <h3 className="inventory-title">Available Blocks</h3>
      
      <div
        ref={setNodeRef}
        className="inventory-container"
        style={{
          position: 'relative',
          width: inventorySize.width,
          height: inventorySize.height,
          border: isOver ? '3px solid #10b981' : '2px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: isOver ? '#ecfdf5' : '#f8fafc',
          transition: 'all 0.2s ease'
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
  );
};

export default BlockInventory;