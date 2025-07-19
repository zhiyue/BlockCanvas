import React from 'react';
import DraggableBlock from './DraggableBlock';
import { BlockShape, CELL_SIZE } from '../types/game';
import { getBlockById } from '../data/blocks';
import './BlockInventory.css';

interface BlockInventoryProps {
  availableBlocks: string[];
  selectedBlock: string | null;
  onBlockSelect: (blockId: string | null) => void;
  onBlockPlace?: (blockId: string, x: number, y: number) => boolean;
  blockRotations?: {[key: string]: number};
  onBlockRotate?: (blockId: string) => void;
}

const BlockInventory: React.FC<BlockInventoryProps> = ({
  availableBlocks,
  selectedBlock,
  onBlockSelect,
  blockRotations = {},
  onBlockRotate
}) => {
  const getBlockRotation = (blockId: string): number => {
    return blockRotations[blockId] || 0;
  };

  const renderBlockGrid = () => {
    const blocks = availableBlocks.map(blockId => getBlockById(blockId)).filter(Boolean) as BlockShape[];
    const gridCols = 3;
    const cellSize = CELL_SIZE * 0.6;
    const padding = 20;
    
    return blocks.map((block, index) => {
      const col = index % gridCols;
      const row = Math.floor(index / gridCols);
      const x = col * (cellSize * 5 + padding) + padding;
      const y = row * (cellSize * 4 + padding) + padding;
      
      return (
        <DraggableBlock
          key={block.id}
          block={block}
          isSelected={selectedBlock === block.id}
          onSelect={() => onBlockSelect(selectedBlock === block.id ? null : block.id)}
          rotation={getBlockRotation(block.id)}
          scale={0.6}
          x={x}
          y={y}
          enableDrag={true}
          renderAsHTML={true}
        />
      );
    });
  };

  const calculateInventorySize = () => {
    const blocks = availableBlocks.length;
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
        className="inventory-container"
        style={{
          position: 'relative',
          width: inventorySize.width,
          height: inventorySize.height,
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: '#f8fafc'
        }}
      >
        {renderBlockGrid()}
      </div>
      
      {selectedBlock && (
        <div className="selected-block-info">
          <p>Selected: {getBlockById(selectedBlock)?.name}</p>
          <p className="instruction">Click on the board to place the block</p>
          <div className="block-controls">
            <button 
              onClick={() => onBlockRotate && onBlockRotate(selectedBlock)}
              className="btn btn-primary"
            >
              Rotate (90°)
            </button>
            <button 
              onClick={() => onBlockSelect(null)}
              className="btn btn-secondary"
            >
              Deselect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockInventory;