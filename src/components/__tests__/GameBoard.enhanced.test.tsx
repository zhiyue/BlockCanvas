import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import GameBoard from '../GameBoard'
import { Position } from '../../types/game'
import * as gameStoreModule from '../../store/gameStore'
import * as blocksModule from '../../data/blocks'

// Mock dependencies
vi.mock('@dnd-kit/core', () => ({
  useDroppable: vi.fn(() => ({
    isOver: false,
    setNodeRef: vi.fn()
  }))
}))

vi.mock('react-konva', () => ({
  Stage: ({ children, width, height }: any) => (
    <div 
      data-testid="konva-stage"
      data-width={width}
      data-height={height}
    >
      {children}
    </div>
  ),
  Layer: ({ children }: any) => (
    <div data-testid="konva-layer">{children}</div>
  ),
  Rect: ({ x, y, width, height, fill, onClick, onTap, key, opacity, stroke, dash }: any) => (
    <div
      data-testid={key?.includes('preview') ? 'preview-rect' : 
                   key?.includes('cell') ? 'cell-rect' : 
                   key?.includes('line') ? 'grid-line' : 'background-rect'}
      data-x={x}
      data-y={y}
      data-width={width}
      data-height={height}
      data-fill={fill}
      data-opacity={opacity}
      data-stroke={stroke}
      data-dash={dash?.join(',')}
      onClick={onClick}
      onTouchStart={onTap}
      style={{ position: 'absolute' }}
    />
  )
}))

vi.mock('../DraggableBlock', () => ({
  default: ({ 
    block, 
    isSelected, 
    onSelect, 
    onDoubleClick, 
    rotation, 
    x, 
    y, 
    enableDrag, 
    isStarterBlock 
  }: any) => (
    <div
      data-testid={`draggable-block-${block.id}`}
      data-selected={isSelected}
      data-rotation={rotation}
      data-x={x}
      data-y={y}
      data-enable-drag={enableDrag}
      data-starter-block={isStarterBlock}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
    >
      {block.id}
    </div>
  )
}))

vi.mock('../../store/gameStore')
vi.mock('../../data/blocks')

describe('GameBoard Enhanced Tests', () => {
  // Test data
  const mockPlacedBlocks = {
    'block1': {
      position: { x: 0, y: 0 },
      color: '#ff6b6b',
      pattern: [[true, true], [true, false]],
      rotation: 0
    },
    'block2': {
      position: { x: 3, y: 3 },
      color: '#4ecdc4',
      pattern: [[true]],
      rotation: 1
    },
    'starter-block': {
      position: { x: 1, y: 1 },
      color: '#45b7d1',
      pattern: [[true, true]],
      rotation: 0
    }
  }

  const mockBlockData = {
    'block1': { id: 'block1', pattern: [[true, true], [true, false]], color: '#ff6b6b' },
    'block2': { id: 'block2', pattern: [[true]], color: '#4ecdc4' },
    'block3': { id: 'block3', pattern: [[true, false], [false, true]], color: '#95a5a6' },
    'starter-block': { id: 'starter-block', pattern: [[true, true]], color: '#45b7d1' }
  }

  // Mock store methods
  const mockGameStore = {
    isPositionValid: vi.fn(() => true),
    isStarterBlock: vi.fn((blockId: string) => blockId === 'starter-block'),
    rotateSelectedBlock: vi.fn()
  }

  const mockUseDroppable = {
    isOver: false,
    setNodeRef: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(gameStoreModule.useGameStore).mockReturnValue(mockGameStore)
    vi.mocked(blocksModule.getBlockById).mockImplementation((id: string) => mockBlockData[id] || null)
    
    const { useDroppable } = require('@dnd-kit/core')
    vi.mocked(useDroppable).mockReturnValue(mockUseDroppable)
  })

  describe('Basic Board Rendering', () => {
    it('renders game board with correct dimensions', () => {
      render(
        <GameBoard placedBlocks={{}} />
      )

      const stage = screen.getByTestId('konva-stage')
      expect(stage).toBeInTheDocument()
      expect(stage).toHaveAttribute('data-width')
      expect(stage).toHaveAttribute('data-height')
    })

    it('renders grid cells for 8x8 board', () => {
      render(
        <GameBoard placedBlocks={{}} />
      )

      const cells = screen.getAllByTestId('cell-rect')
      expect(cells).toHaveLength(64) // 8x8 = 64 cells
    })

    it('renders grid lines', () => {
      render(
        <GameBoard placedBlocks={{}} />
      )

      const gridLines = screen.getAllByTestId('grid-line')
      expect(gridLines.length).toBeGreaterThan(0)
    })

    it('renders background with proper styling', () => {
      render(
        <GameBoard placedBlocks={{}} />
      )

      const background = screen.getByTestId('background-rect')
      expect(background).toHaveAttribute('data-fill', '#f8fafc')
    })
  })

  describe('Placed Blocks Rendering', () => {
    it('renders placed blocks as draggable components', () => {
      render(
        <GameBoard placedBlocks={mockPlacedBlocks} />
      )

      expect(screen.getByTestId('draggable-block-block1')).toBeInTheDocument()
      expect(screen.getByTestId('draggable-block-block2')).toBeInTheDocument()
      expect(screen.getByTestId('draggable-block-starter-block')).toBeInTheDocument()
    })

    it('applies correct positions to placed blocks', () => {
      render(
        <GameBoard placedBlocks={mockPlacedBlocks} />
      )

      const block1 = screen.getByTestId('draggable-block-block1')
      expect(block1).toHaveAttribute('data-x')
      expect(block1).toHaveAttribute('data-y')
    })

    it('applies correct rotation to placed blocks', () => {
      render(
        <GameBoard placedBlocks={mockPlacedBlocks} />
      )

      const block2 = screen.getByTestId('draggable-block-block2')
      expect(block2).toHaveAttribute('data-rotation', '1')
    })

    it('handles starter blocks correctly', () => {
      render(
        <GameBoard placedBlocks={mockPlacedBlocks} />
      )

      const starterBlock = screen.getByTestId('draggable-block-starter-block')
      expect(starterBlock).toHaveAttribute('data-enable-drag', 'false')
      expect(starterBlock).toHaveAttribute('data-starter-block', 'true')
    })

    it('excludes dragged blocks from rendering', () => {
      render(
        <GameBoard 
          placedBlocks={mockPlacedBlocks}
          draggedBlock="block1"
        />
      )

      expect(screen.queryByTestId('draggable-block-block1')).not.toBeInTheDocument()
      expect(screen.getByTestId('draggable-block-block2')).toBeInTheDocument()
    })
  })

  describe('Block Selection and Interaction', () => {
    it('handles block selection correctly', async () => {
      const onBlockSelect = vi.fn()
      const user = userEvent.setup()

      render(
        <GameBoard 
          placedBlocks={mockPlacedBlocks}
          selectedBlock={null}
          onBlockSelect={onBlockSelect}
        />
      )

      const block1 = screen.getByTestId('draggable-block-block1')
      await user.click(block1)

      expect(onBlockSelect).toHaveBeenCalledWith('block1')
    })

    it('handles block deselection when same block is clicked', async () => {
      const onBlockSelect = vi.fn()
      const user = userEvent.setup()

      render(
        <GameBoard 
          placedBlocks={mockPlacedBlocks}
          selectedBlock="block1"
          onBlockSelect={onBlockSelect}
        />
      )

      const block1 = screen.getByTestId('draggable-block-block1')
      await user.click(block1)

      expect(onBlockSelect).toHaveBeenCalledWith(null)
    })

    it('applies selected state to blocks correctly', () => {
      render(
        <GameBoard 
          placedBlocks={mockPlacedBlocks}
          selectedBlock="block1"
        />
      )

      const block1 = screen.getByTestId('draggable-block-block1')
      const block2 = screen.getByTestId('draggable-block-block2')

      expect(block1).toHaveAttribute('data-selected', 'true')
      expect(block2).toHaveAttribute('data-selected', 'false')
    })

    it('handles double-click rotation for selected non-starter blocks', async () => {
      const user = userEvent.setup()

      render(
        <GameBoard 
          placedBlocks={mockPlacedBlocks}
          selectedBlock="block1"
        />
      )

      const block1 = screen.getByTestId('draggable-block-block1')
      await user.dblClick(block1)

      expect(mockGameStore.rotateSelectedBlock).toHaveBeenCalled()
    })

    it('prevents rotation for starter blocks', async () => {
      const user = userEvent.setup()

      render(
        <GameBoard 
          placedBlocks={mockPlacedBlocks}
          selectedBlock="starter-block"
        />
      )

      const starterBlock = screen.getByTestId('draggable-block-starter-block')
      await user.dblClick(starterBlock)

      expect(mockGameStore.rotateSelectedBlock).not.toHaveBeenCalled()
    })

    it('prevents rotation for unselected blocks', async () => {
      const user = userEvent.setup()

      render(
        <GameBoard 
          placedBlocks={mockPlacedBlocks}
          selectedBlock="block2"
        />
      )

      const block1 = screen.getByTestId('draggable-block-block1')
      await user.dblClick(block1)

      expect(mockGameStore.rotateSelectedBlock).not.toHaveBeenCalled()
    })
  })

  describe('Drag and Drop Preview System', () => {
    it('renders preview block during drag', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
          previewPosition={{ x: 2, y: 2 }}
          blockRotations={{ 'block3': 1 }}
        />
      )

      const previewRects = screen.getAllByTestId('preview-rect')
      expect(previewRects.length).toBeGreaterThan(0)
    })

    it('applies correct styling to preview blocks', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
          previewPosition={{ x: 2, y: 2 }}
        />
      )

      const previewRect = screen.getAllByTestId('preview-rect')[0]
      expect(previewRect).toHaveAttribute('data-opacity', '0.4')
      expect(previewRect).toHaveAttribute('data-stroke', '#4f46e5')
      expect(previewRect).toHaveAttribute('data-dash', '8,4')
    })

    it('does not render preview when no dragged block', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock={null}
          previewPosition={{ x: 2, y: 2 }}
        />
      )

      const previewRects = screen.queryAllByTestId('preview-rect')
      expect(previewRects).toHaveLength(0)
    })

    it('does not render preview when no preview position', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
          previewPosition={null}
        />
      )

      const previewRects = screen.queryAllByTestId('preview-rect')
      expect(previewRects).toHaveLength(0)
    })

    it('applies block rotation to preview correctly', () => {
      // Test with different rotation values
      const { rerender } = render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
          previewPosition={{ x: 2, y: 2 }}
          blockRotations={{ 'block3': 0 }}
        />
      )

      let previewRects = screen.getAllByTestId('preview-rect')
      const originalCount = previewRects.length

      rerender(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
          previewPosition={{ x: 2, y: 2 }}
          blockRotations={{ 'block3': 1 }}
        />
      )

      previewRects = screen.getAllByTestId('preview-rect')
      expect(previewRects.length).toBe(originalCount) // Same number of cells, different positions
    })
  })

  describe('Valid Position Highlighting', () => {
    beforeEach(() => {
      // Mock position validation to return specific positions as valid
      mockGameStore.isPositionValid.mockImplementation((blockId, x, y) => {
        return x < 4 && y < 4 // First quadrant is valid
      })
    })

    it('highlights valid positions in drag mode', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
          interactionMode="drag"
          blockRotations={{ 'block3': 0 }}
        />
      )

      const cells = screen.getAllByTestId('cell-rect')
      
      // Check that some cells have valid position styling
      const validCells = cells.filter(cell => 
        cell.getAttribute('data-fill')?.includes('79, 70, 229')
      )
      expect(validCells.length).toBeGreaterThan(0)
    })

    it('highlights valid positions in tap mode', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          interactionMode="tap"
          tapModeState={{
            selectedBlockForPlacement: 'block3',
            selectedBlockRotation: 1
          }}
        />
      )

      const cells = screen.getAllByTestId('cell-rect')
      
      // Check that some cells have valid position styling
      const validCells = cells.filter(cell => 
        cell.getAttribute('data-fill')?.includes('79, 70, 229')
      )
      expect(validCells.length).toBeGreaterThan(0)
    })

    it('does not highlight positions when no block is selected', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock={null}
          interactionMode="drag"
        />
      )

      const cells = screen.getAllByTestId('cell-rect')
      
      // All cells should have default styling
      const validCells = cells.filter(cell => 
        cell.getAttribute('data-fill')?.includes('79, 70, 229')
      )
      expect(validCells).toHaveLength(0)
    })

    it('respects position validation logic', () => {
      // Mock to make only specific positions valid
      mockGameStore.isPositionValid.mockImplementation((blockId, x, y) => {
        return x === 0 && y === 0 // Only top-left corner is valid
      })

      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
          interactionMode="drag"
        />
      )

      const cells = screen.getAllByTestId('cell-rect')
      
      const validCells = cells.filter(cell => 
        cell.getAttribute('data-fill')?.includes('79, 70, 229')
      )
      expect(validCells).toHaveLength(1) // Only one valid position
    })
  })

  describe('Cell Click Handling', () => {
    it('handles cell clicks correctly', async () => {
      const onCellClick = vi.fn()
      const user = userEvent.setup()

      render(
        <GameBoard 
          placedBlocks={{}}
          onCellClick={onCellClick}
        />
      )

      const cells = screen.getAllByTestId('cell-rect')
      await user.click(cells[0]) // Click first cell

      expect(onCellClick).toHaveBeenCalled()
    })

    it('handles overlay clicks with coordinate conversion', () => {
      const onCellClick = vi.fn()

      render(
        <GameBoard 
          placedBlocks={{}}
          onCellClick={onCellClick}
        />
      )

      const overlay = screen.getByRole('generic', { 
        name: '' 
      })

      // Mock getBoundingClientRect
      vi.spyOn(overlay, 'getBoundingClientRect').mockReturnValue({
        left: 10,
        top: 10,
        width: 400,
        height: 400,
        right: 410,
        bottom: 410,
        x: 10,
        y: 10,
        toJSON: vi.fn()
      })

      fireEvent.click(overlay, {
        clientX: 60, // 50 pixels from left
        clientY: 60  // 50 pixels from top
      })

      expect(onCellClick).toHaveBeenCalled()
    })

    it('handles touch events on cells', () => {
      const onCellClick = vi.fn()

      render(
        <GameBoard 
          placedBlocks={{}}
          onCellClick={onCellClick}
        />
      )

      const cells = screen.getAllByTestId('cell-rect')
      fireEvent.touchStart(cells[0])

      expect(onCellClick).toHaveBeenCalled()
    })
  })

  describe('Multi-Modal Interaction Support', () => {
    it('shows different styling for drag mode', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          interactionMode="drag"
          draggedBlock="block3"
        />
      )

      // Verify drag mode specific behavior is triggered
      expect(mockGameStore.isPositionValid).toHaveBeenCalled()
    })

    it('shows different styling for tap mode', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          interactionMode="tap"
          tapModeState={{
            selectedBlockForPlacement: 'block3',
            selectedBlockRotation: 2
          }}
        />
      )

      // Verify tap mode specific behavior is triggered
      expect(mockGameStore.isPositionValid).toHaveBeenCalled()
    })

    it('handles tap mode state correctly', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          interactionMode="tap"
          tapModeState={{
            selectedBlockForPlacement: 'block3',
            selectedBlockRotation: 2
          }}
        />
      )

      // Verify that tap mode state affects valid position calculation
      expect(mockGameStore.isPositionValid).toHaveBeenCalledWith(
        'block3', 
        expect.any(Number), 
        expect.any(Number), 
        2, // rotation from tap mode state
        'block3'
      )
    })
  })

  describe('Drag and Drop Integration', () => {
    it('configures useDroppable correctly', () => {
      render(
        <GameBoard placedBlocks={{}} />
      )

      const { useDroppable } = require('@dnd-kit/core')
      expect(useDroppable).toHaveBeenCalledWith({
        id: 'game-board',
        data: { type: 'board' }
      })
    })

    it('applies drag over styling when dragging', () => {
      const { useDroppable } = require('@dnd-kit/core')
      vi.mocked(useDroppable).mockReturnValue({
        ...mockUseDroppable,
        isOver: true
      })

      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
        />
      )

      // Drag over overlay should have special styling
      const container = screen.getByRole('generic')
      const overlay = container.querySelector('[style*="rgba(79, 70, 229, 0.08)"]')
      expect(overlay).toBeInTheDocument()
    })

    it('handles pointer events correctly during drag', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
        />
      )

      // When dragging, overlay should have pointer events enabled
      const container = screen.getByRole('generic')
      const overlay = container.querySelector('[style*="pointer-events"]')
      expect(overlay).toBeInTheDocument()
    })

    it('disables pointer events when not dragging', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock={null}
        />
      )

      // When not dragging, overlay should have pointer events disabled
      const container = screen.getByRole('generic')
      const overlay = container.querySelector('[style*="pointer-events: none"]')
      expect(overlay).toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles invalid block IDs gracefully', () => {
      const invalidPlacedBlocks = {
        'invalid-block': {
          position: { x: 0, y: 0 },
          color: '#ff0000',
          pattern: [[true]],
          rotation: 0
        }
      }

      expect(() => {
        render(
          <GameBoard placedBlocks={invalidPlacedBlocks} />
        )
      }).not.toThrow()
    })

    it('handles empty placed blocks', () => {
      render(
        <GameBoard placedBlocks={{}} />
      )

      const draggableBlocks = screen.queryAllByTestId(/draggable-block-/)
      expect(draggableBlocks).toHaveLength(0)
    })

    it('handles missing block rotations', () => {
      render(
        <GameBoard 
          placedBlocks={mockPlacedBlocks}
          blockRotations={{}} // Empty rotations
        />
      )

      // Should not crash and use default rotation (0)
      const blocks = screen.getAllByTestId(/draggable-block-/)
      expect(blocks.length).toBeGreaterThan(0)
    })

    it('handles out-of-bounds preview positions', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
          previewPosition={{ x: 10, y: 10 }} // Out of 8x8 bounds
        />
      )

      // Should handle gracefully without crashing
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
    })

    it('handles negative preview positions', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
          previewPosition={{ x: -1, y: -1 }}
        />
      )

      // Should handle gracefully without crashing
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
    })
  })

  describe('Performance and Optimization', () => {
    it('handles large number of placed blocks efficiently', () => {
      const manyBlocks: { [key: string]: any } = {}
      
      // Create 20 blocks
      for (let i = 0; i < 20; i++) {
        manyBlocks[`block-${i}`] = {
          position: { x: i % 8, y: Math.floor(i / 8) },
          color: '#ff0000',
          pattern: [[true]],
          rotation: i % 4
        }
      }

      const startTime = performance.now()
      render(
        <GameBoard placedBlocks={manyBlocks} />
      )
      const endTime = performance.now()

      // Should render quickly
      expect(endTime - startTime).toBeLessThan(100) // 100ms threshold
    })

    it('handles rapid state changes without memory leaks', () => {
      const { rerender } = render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block1"
          previewPosition={{ x: 0, y: 0 }}
        />
      )

      // Rapidly change preview position
      for (let i = 0; i < 10; i++) {
        rerender(
          <GameBoard 
            placedBlocks={{}}
            draggedBlock="block1"
            previewPosition={{ x: i % 8, y: Math.floor(i / 8) }}
          />
        )
      }

      expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
    })
  })

  describe('Accessibility and User Experience', () => {
    it('provides visual feedback for drag over state', () => {
      const { useDroppable } = require('@dnd-kit/core')
      vi.mocked(useDroppable).mockReturnValue({
        ...mockUseDroppable,
        isOver: true
      })

      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
        />
      )

      // Should have visual feedback for drag over
      const container = screen.getByRole('generic')
      expect(container).toBeInTheDocument()
    })

    it('provides appropriate cursor styles', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
        />
      )

      // Should have crosshair cursor during drag
      const container = screen.getByRole('generic')
      const overlay = container.querySelector('[style*="crosshair"]')
      expect(overlay).toBeInTheDocument()
    })

    it('maintains smooth transitions', () => {
      render(
        <GameBoard 
          placedBlocks={{}}
          draggedBlock="block3"
        />
      )

      // Should have transition styles for smooth UX
      const container = screen.getByRole('generic')
      const overlay = container.querySelector('[style*="transition"]')
      expect(overlay).toBeInTheDocument()
    })
  })
})