import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import DraggableBlock from './DraggableBlock';
import { BlockShape } from '../types/game';
import { getBlockById } from '../data/blocks';
import { useCoordinateSystemDeviceCapabilities } from '../contexts/CoordinateSystemContext';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import './BlockInventory.css';

interface BlockInventoryProps {
  availableBlocks: string[];
  allBlocks: string[];
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
  responsiveCellSize?: number;
}

// 布局配置接口
interface LayoutConfig {
  gridCols: number;
  cellSize: number;
  padding: number;
  maxBlockSize: number;
  blockScale: number;
  containerWidth?: number;
}

// 桌面端布局配置
const getDesktopLayoutConfig = (): LayoutConfig => ({
  gridCols: 3,
  cellSize: 18, // 增加cellSize以更好地填充320px容器
  padding: 12,  // 增加padding
  maxBlockSize: 5,
  blockScale: 0.9, // 增加缩放比例
  containerWidth: 320 // 添加容器宽度
});

// 移动端布局配置
const getMobileLayoutConfig = (viewport: { width: number }, isSmallMobile: boolean): LayoutConfig => {
  const maxBlockSize = 5; // 增加到5以支持所有方块类型（包括1×5和2×5）
  const gridCols = 3;

  if (isSmallMobile) {
    const containerWidth = viewport.width - 50; // 增加边距以防止越界
    const cellSize = Math.max(6, Math.floor(containerWidth / (gridCols * (maxBlockSize + 0.8)))); // 更保守的计算
    return {
      gridCols,
      cellSize,
      padding: 1, // 减少padding以节省空间
      maxBlockSize,
      blockScale: 0.6, // 进一步减少缩放比例以适应更大的方块
      containerWidth
    };
  } else {
    const containerWidth = Math.min(viewport.width - 50, 360); // 进一步减少容器宽度
    const cellSize = Math.max(8, Math.floor(containerWidth / (gridCols * (maxBlockSize + 0.8)))); // 更保守的计算
    return {
      gridCols,
      cellSize,
      padding: 2,
      maxBlockSize,
      blockScale: 0.65, // 减少缩放比例以适应更大的方块
      containerWidth
    };
  }
};



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
  responsiveCellSize // 保留以备将来使用
}) => {
  // 设备能力检测
  const { isMobile, screenSize, viewport } = useDeviceCapabilities();
  const isSmallMobile = screenSize === 'small' && viewport.width <= 480;

  // 坐标系上下文（保留以备将来使用）
  const { responsiveCellSize: contextCellSize } = useCoordinateSystemDeviceCapabilities();

  // 避免未使用变量警告
  void responsiveCellSize;
  void contextCellSize;
  
  // 拖拽区域设置
  const { isOver, setNodeRef } = useDroppable({
    id: 'block-inventory',
    data: { type: 'inventory' }
  });
  
  // 获取 block 旋转角度
  const getBlockRotation = (blockId: string): number => {
    return blockRotations[blockId] || 0;
  };

  // 获取当前布局配置
  const layoutConfig = isMobile 
    ? getMobileLayoutConfig(viewport, isSmallMobile) 
    : getDesktopLayoutConfig();

  // 计算容器尺寸
  const calculateInventorySize = () => {
    const { gridCols, cellSize, padding, maxBlockSize } = layoutConfig;
    const rows = Math.ceil(allBlocks.length / gridCols);
    const blockSpacingMultiplier = isMobile ? maxBlockSize + 0.1 : maxBlockSize + 1; // 移动端进一步减少间距

    const width = gridCols * (cellSize * blockSpacingMultiplier + padding) + padding;
    const height = rows * (cellSize * blockSpacingMultiplier + padding) + padding;

    // 移动端增加更多的高度边距以确保完整显示，特别是第4行和避免按钮遮挡
    const extraHeight = isMobile ? 120 : 0; // 增加到120px以确保大方块完整显示且避免按钮遮挡

    console.log('BlockInventory size calculation:', {
      allBlocksLength: allBlocks.length,
      gridCols,
      rows,
      cellSize,
      maxBlockSize,
      blockSpacingMultiplier,
      baseHeight: height,
      extraHeight,
      finalHeight: height + extraHeight,
      isMobile
    });

    return {
      width,
      height: height + extraHeight
    };
  };

  // 渲染可用的 block
  const renderAvailableBlock = (
    block: BlockShape, 
    x: number, 
    y: number, 
    isSelected: boolean
  ) => {
    const { cellSize, maxBlockSize, blockScale } = layoutConfig;
    const currentRotation = getBlockRotation(block.id);

    const handleSelect = () => {
      if (interactionMode === 'tap') {
        onTapModeSelect?.(isSelected ? null : block.id);
      } else {
        onBlockSelect(isSelected ? null : block.id);
      }
    };

    const handleDoubleClick = () => {
      if (interactionMode === 'tap') {
        onTapModeRotate?.();
      } else {
        onBlockRotate?.(block.id);
      }
    };

    // 使用flex布局居中，不需要手动计算偏移
    return (
      <div key={`container-${block.id}`} style={{
        position: 'absolute',
        left: x,
        top: y,
        width: cellSize * maxBlockSize,
        height: cellSize * maxBlockSize,
        border: isSelected ? '2px solid #4f46e5' : '2px solid rgba(34, 197, 94, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.1)' : 'rgba(255, 255, 255, 0.8)',
        borderRadius: '6px',
        transition: 'all 0.2s ease',
        boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.05)',
        cursor: interactionMode === 'drag' ? 'grab' : 'pointer'
      }}>
        <DraggableBlock
          key={block.id}
          block={block}
          isSelected={isSelected}
          onSelect={handleSelect}
          onDoubleClick={handleDoubleClick}
          rotation={currentRotation}
          scale={blockScale}
          x={0} // 在flex容器中居中，不需要偏移
          y={0} // 在flex容器中居中，不需要偏移
          enableDrag={interactionMode === 'drag'}
          renderAsHTML={true}
          cellSize={cellSize}
          isInInventory={true}
        />
      </div>
    );
  };

  // 渲染占位符 block
  const renderPlaceholderBlock = (
    block: BlockShape, 
    x: number, 
    y: number
  ) => {
    const { cellSize, maxBlockSize, blockScale } = layoutConfig;
    
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
          border: '2px dashed rgba(156, 163, 175, 0.6)',
          backgroundColor: 'rgba(249, 250, 251, 0.4)',
          borderRadius: '6px',
          transition: 'all 0.2s ease'
        }}
      >
        <div
          style={{
            width: block.width * cellSize * blockScale,
            height: block.height * cellSize * blockScale,
            border: '2px dashed rgba(107, 114, 128, 0.8)',
            borderRadius: isMobile ? '2px' : '4px',
            backgroundColor: 'rgba(229, 231, 235, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '9px' : '10px',
            color: '#6b7280',
            fontWeight: '600',
            padding: '4px',
            textAlign: 'center',
            lineHeight: '1.2',
            opacity: '0.8'
          }}
        >
          {block.name.match(/\d+×\d+/)?.[0] || block.id}
        </div>
      </div>
    );
  };

  // 渲染单个 block
  const renderBlock = (blockId: string, index: number) => {
    const block = getBlockById(blockId);
    if (!block) {
      console.warn(`Block not found: ${blockId}`);
      return null;
    }

    const { gridCols, cellSize, padding, maxBlockSize, containerWidth } = layoutConfig;
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    const blockSpacingMultiplier = isMobile ? maxBlockSize + 0.3 : maxBlockSize + 1; // 移动端适当增加间距以适应更大方块

    // 计算网格的总宽度
    const gridWidth = gridCols * (cellSize * blockSpacingMultiplier + padding) + padding;

    // 计算居中偏移量 - 在所有设备上都启用居中
    const actualContainerWidth = isMobile ? (containerWidth || viewport.width - 50) : calculateInventorySize().width;
    const centerOffset = Math.max(0, (actualContainerWidth - gridWidth) / 2);




    const x = col * (cellSize * blockSpacingMultiplier + padding) + padding + centerOffset;
    const y = row * (cellSize * blockSpacingMultiplier + padding) + padding;

    const isAvailable = availableBlocks.includes(blockId);
    const isSelected = interactionMode === 'drag'
      ? selectedBlock === blockId
      : tapModeState?.selectedBlockForPlacement === blockId;

    if (isAvailable) {
      return renderAvailableBlock(block, x, y, isSelected);
    } else {
      return renderPlaceholderBlock(block, x, y);
    }
  };

  // 渲染 block 网格
  const renderBlockGrid = () => {
    return allBlocks.map((blockId, index) => renderBlock(blockId, index));
  };

  const inventorySize = calculateInventorySize();

  return (
    <div className="block-inventory">
      <h3 className="inventory-title">
        Available Blocks ({availableBlocks.length}/{allBlocks.length})
      </h3>

      <div
        className="inventory-wrapper"
        style={{
          width: isMobile ? '100%' : '320px',
          height: isMobile ? `${inventorySize.height + 120}px` : '400px', // 移动端使用计算的高度加上更多padding
          minHeight: isMobile ? `${inventorySize.height + 120}px` : '400px',
          border: isOver ? '3px solid #10b981' : '2px solid #d1d5db',
          borderRadius: isMobile ? '8px' : '12px',
          backgroundColor: isOver ? '#ecfdf5' : '#ffffff',
          transition: 'all 0.2s ease',
          overflowX: 'visible',
          overflowY: 'visible',
          position: 'relative',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          padding: isMobile ? '8px' : '12px'
        }}
      >
        <div
          ref={setNodeRef}
          className="inventory-container"
          style={{
            position: 'relative',
            width: isMobile ? '100%' : inventorySize.width,
            height: inventorySize.height,
            minWidth: isMobile ? '100%' : inventorySize.width,
            minHeight: inventorySize.height
          }}
        >
          {renderBlockGrid()}
        </div>
      </div>
    </div>
  );
};

export default BlockInventory;
