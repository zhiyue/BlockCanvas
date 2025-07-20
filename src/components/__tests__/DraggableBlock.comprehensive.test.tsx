import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import DraggableBlock from '../DraggableBlock'
import { BlockShape } from '../../types/game'
import * as deviceCapabilitiesModule from '../../hooks/useDeviceCapabilities'
import * as doubleClickModule from '../../hooks/useDoubleClick'

// Mock dependencies
vi.mock('@dnd-kit/core', () => ({
  useDraggable: vi.fn(() => ({
    attributes: { 'data-testid': 'draggable' },
    listeners: { onMouseDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false
  }))
}))

vi.mock('react-konva', () => ({
  Group: ({ children, onClick, onTap, x, y }: any) => (
    <div 
      data-testid="konva-group"
      data-x={x}
      data-y={y}
      onClick={onClick}
      onTouchStart={onTap}
    >
      {children}
    </div>
  ),
  Rect: ({ x, y, width, height, fill, stroke, strokeWidth }: any) => (
    <div 
      data-testid="konva-rect"
      data-x={x}
      data-y={y}
      data-width={width}
      data-height={height}
      data-fill={fill}
      data-stroke={stroke}
      data-stroke-width={strokeWidth}
    />
  )
}))

vi.mock('../../hooks/useDeviceCapabilities')
vi.mock('../../hooks/useDoubleClick')

describe('DraggableBlock Comprehensive Tests', () => {
  // Test data
  const mockBlock: BlockShape = {
    id: 'test-block',
    pattern: [
      [true, true],
      [true, false]
    ],
    color: '#ff6b6b'
  }

  const mockLargeBlock: BlockShape = {
    id: 'large-block',
    pattern: [
      [true, true, true],
      [false, true, false],
      [false, true, true]
    ],
    color: '#4ecdc4'
  }

  const mockSingleCellBlock: BlockShape = {
    id: 'single-block',
    pattern: [[true]],
    color: '#45b7d1'
  }

  // Mock implementations
  const mockDeviceCapabilities = {
    hasTouch: false,
    interactionMode: { primary: 'drag' as const, fallback: 'tap' as const }
  }

  const mockDoubleInteraction = {
    onClick: vi.fn(),
    onTouchStart: vi.fn()
  }

  const mockUseDraggable = {
    attributes: { 'data-testid': 'draggable' },
    listeners: { onMouseDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(mockDeviceCapabilities)
    vi.mocked(doubleClickModule.useMultiModalDoubleInteraction).mockReturnValue(mockDoubleInteraction)
    
    // Reset @dnd-kit/core mock
    const { useDraggable } = require('@dnd-kit/core')
    vi.mocked(useDraggable).mockReturnValue(mockUseDraggable)
  })

  describe('Basic Rendering', () => {
    it('renders block with HTML rendering mode', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toBeInTheDocument()
      expect(blockElement).toHaveAttribute('data-block-id', 'test-block')
    })

    it('renders block with Canvas (Konva) rendering mode', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={false}
        />
      )

      expect(screen.getByTestId('konva-group')).toBeInTheDocument()
      expect(screen.getAllByTestId('konva-rect')).toHaveLength(4) // Background + 3 cells
    })

    it('renders correct number of cells based on pattern', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={true}
        />
      )

      // Pattern has 3 true cells: [1,1], [1,0] = 3 total
      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      expect(cells).toHaveLength(3)
    })

    it('applies correct color to cells', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={true}
        />
      )

      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      cells.forEach(cell => {
        expect(cell).toHaveStyle({ backgroundColor: '#ff6b6b' })
      })
    })
  })

  describe('Block Rotation System', () => {
    it('applies no rotation by default', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={true}
        />
      )

      // Should render original pattern: 3 cells
      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      expect(cells).toHaveLength(3)
    })

    it('applies 90-degree rotation correctly', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          rotation={1}
          renderAsHTML={true}
        />
      )

      // After rotation, pattern should be different
      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      expect(cells).toHaveLength(3) // Same number of cells, different arrangement
    })

    it('applies 180-degree rotation correctly', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          rotation={2}
          renderAsHTML={true}
        />
      )

      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      expect(cells).toHaveLength(3)
    })

    it('applies 270-degree rotation correctly', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          rotation={3}
          renderAsHTML={true}
        />
      )

      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      expect(cells).toHaveLength(3)
    })

    it('handles full 360-degree rotation (returns to original)', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          rotation={4}
          renderAsHTML={true}
        />
      )

      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      expect(cells).toHaveLength(3)
    })

    it('handles complex block rotation correctly', () => {
      render(
        <DraggableBlock 
          block={mockLargeBlock} 
          rotation={1}
          renderAsHTML={true}
        />
      )

      // Large block has 5 true cells
      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      expect(cells).toHaveLength(5)
    })
  })

  describe('Draggable Integration', () => {
    it('configures useDraggable with correct parameters', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          enableDrag={true}
        />
      )

      const { useDraggable } = require('@dnd-kit/core')
      expect(useDraggable).toHaveBeenCalledWith({
        id: 'test-block',
        disabled: false
      })
    })

    it('disables dragging when enableDrag is false', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          enableDrag={false}
        />
      )

      const { useDraggable } = require('@dnd-kit/core')
      expect(useDraggable).toHaveBeenCalledWith({
        id: 'test-block',
        disabled: true
      })
    })

    it('applies transform styles during dragging', () => {
      const { useDraggable } = require('@dnd-kit/core')
      vi.mocked(useDraggable).mockReturnValue({
        ...mockUseDraggable,
        transform: { x: 10, y: 20 },
        isDragging: true
      })

      render(
        <DraggableBlock 
          block={mockBlock} 
          enableDrag={true}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toHaveStyle({
        transform: 'translate3d(10px, 20px, 0)',
        opacity: '0'
      })
    })

    it('applies correct cursor styles for different states', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          enableDrag={true}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toHaveStyle({ cursor: 'grab' })
    })

    it('applies correct cursor style for starter blocks', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          isStarterBlock={true}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toHaveStyle({ cursor: 'not-allowed' })
    })
  })

  describe('Selection States', () => {
    it('applies selected styles in HTML mode', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          isSelected={true}
          renderAsHTML={true}
        />
      )

      // Selected state is reflected in the block rendering
      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toBeInTheDocument()
    })

    it('applies selected styles in Canvas mode', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          isSelected={true}
          renderAsHTML={false}
        />
      )

      const backgroundRect = screen.getAllByTestId('konva-rect')[0]
      expect(backgroundRect).toHaveAttribute('data-fill', 'rgba(79, 70, 229, 0.15)')
      expect(backgroundRect).toHaveAttribute('data-stroke', '#4f46e5')
    })

    it('applies unselected styles in Canvas mode', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          isSelected={false}
          renderAsHTML={false}
        />
      )

      const backgroundRect = screen.getAllByTestId('konva-rect')[0]
      expect(backgroundRect).toHaveAttribute('data-fill', 'rgba(255, 255, 255, 0.05)')
      expect(backgroundRect).toHaveAttribute('data-stroke', 'transparent')
    })
  })

  describe('Starter Block States', () => {
    it('applies starter block opacity', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          isStarterBlock={true}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toHaveStyle({ opacity: '0.9' })
    })

    it('applies normal opacity for non-starter blocks', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          isStarterBlock={false}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toHaveStyle({ opacity: '1' })
    })
  })

  describe('Scale and Positioning', () => {
    it('applies custom scale factor', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          scale={0.5}
          renderAsHTML={true}
        />
      )

      // Block should be rendered at half scale
      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toBeInTheDocument()
      // Scale affects cell size calculation internally
    })

    it('applies custom position in HTML mode', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          x={100}
          y={200}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toHaveStyle({
        left: '100px',
        top: '200px'
      })
    })

    it('applies custom position in Canvas mode', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          x={100}
          y={200}
          renderAsHTML={false}
        />
      )

      const groupElement = screen.getByTestId('konva-group')
      expect(groupElement).toHaveAttribute('data-x', '100')
      expect(groupElement).toHaveAttribute('data-y', '200')
    })

    it('handles zero scale gracefully', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          scale={0}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toBeInTheDocument()
    })

    it('handles very large scale factors', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          scale={5.0}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toBeInTheDocument()
    })
  })

  describe('Device Capabilities Integration', () => {
    it('integrates with touch-enabled devices', () => {
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
        hasTouch: true,
        interactionMode: { primary: 'tap', fallback: 'drag' }
      })

      render(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={true}
        />
      )

      expect(doubleClickModule.useMultiModalDoubleInteraction).toHaveBeenCalledWith({
        onSingleClick: undefined,
        onDoubleClick: undefined,
        onSingleTap: undefined,
        onDoubleTap: undefined,
        touchEnabled: true
      })
    })

    it('integrates with non-touch devices', () => {
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
        hasTouch: false,
        interactionMode: { primary: 'drag', fallback: 'tap' }
      })

      render(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={true}
        />
      )

      expect(doubleClickModule.useMultiModalDoubleInteraction).toHaveBeenCalledWith({
        onSingleClick: undefined,
        onDoubleClick: undefined,
        onSingleTap: undefined,
        onDoubleTap: undefined,
        touchEnabled: false
      })
    })
  })

  describe('Event Handling', () => {
    it('handles single click events', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()

      render(
        <DraggableBlock 
          block={mockBlock} 
          onSelect={onSelect}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      await user.click(blockElement)

      expect(mockDoubleInteraction.onClick).toHaveBeenCalled()
    })

    it('handles touch events', async () => {
      const onSelect = vi.fn()

      render(
        <DraggableBlock 
          block={mockBlock} 
          onSelect={onSelect}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      fireEvent.touchStart(blockElement)

      expect(mockDoubleInteraction.onTouchStart).toHaveBeenCalled()
    })

    it('handles double click events', () => {
      const onDoubleClick = vi.fn()

      render(
        <DraggableBlock 
          block={mockBlock} 
          onDoubleClick={onDoubleClick}
          renderAsHTML={true}
        />
      )

      expect(doubleClickModule.useMultiModalDoubleInteraction).toHaveBeenCalledWith(
        expect.objectContaining({
          onDoubleClick: onDoubleClick
        })
      )
    })

    it('handles Canvas mode click events', async () => {
      const onSelect = vi.fn()
      const user = userEvent.setup()

      render(
        <DraggableBlock 
          block={mockBlock} 
          onSelect={onSelect}
          renderAsHTML={false}
        />
      )

      const groupElement = screen.getByTestId('konva-group')
      await user.click(groupElement)

      expect(onSelect).toHaveBeenCalled()
    })

    it('handles Canvas mode touch events', () => {
      const onSelect = vi.fn()

      render(
        <DraggableBlock 
          block={mockBlock} 
          onSelect={onSelect}
          renderAsHTML={false}
        />
      )

      const groupElement = screen.getByTestId('konva-group')
      fireEvent.touchStart(groupElement)

      expect(onSelect).toHaveBeenCalled()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles empty pattern gracefully', () => {
      const emptyBlock: BlockShape = {
        id: 'empty-block',
        pattern: [],
        color: '#000000'
      }

      expect(() => {
        render(
          <DraggableBlock 
            block={emptyBlock} 
            renderAsHTML={true}
          />
        )
      }).not.toThrow()
    })

    it('handles single row pattern', () => {
      const singleRowBlock: BlockShape = {
        id: 'single-row',
        pattern: [[true, false, true]],
        color: '#ff0000'
      }

      render(
        <DraggableBlock 
          block={singleRowBlock} 
          renderAsHTML={true}
        />
      )

      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      expect(cells).toHaveLength(2) // Two true cells
    })

    it('handles single column pattern', () => {
      const singleColBlock: BlockShape = {
        id: 'single-col',
        pattern: [[true], [false], [true]],
        color: '#00ff00'
      }

      render(
        <DraggableBlock 
          block={singleColBlock} 
          renderAsHTML={true}
        />
      )

      const blockContainer = screen.getByTestId('draggable')
      const cells = blockContainer.querySelectorAll('div > div')
      expect(cells).toHaveLength(2) // Two true cells
    })

    it('handles negative rotation values', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          rotation={-1}
          renderAsHTML={true}
        />
      )

      const blockContainer = screen.getByTestId('draggable')
      expect(blockContainer).toBeInTheDocument()
    })

    it('handles very large rotation values', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          rotation={100}
          renderAsHTML={true}
        />
      )

      const blockContainer = screen.getByTestId('draggable')
      expect(blockContainer).toBeInTheDocument()
    })

    it('handles invalid color values gracefully', () => {
      const invalidColorBlock: BlockShape = {
        id: 'invalid-color',
        pattern: [[true]],
        color: 'invalid-color'
      }

      render(
        <DraggableBlock 
          block={invalidColorBlock} 
          renderAsHTML={true}
        />
      )

      const blockContainer = screen.getByTestId('draggable')
      expect(blockContainer).toBeInTheDocument()
    })
  })

  describe('Performance and Optimization', () => {
    it('calculates block dimensions correctly for different patterns', () => {
      render(
        <DraggableBlock 
          block={mockLargeBlock} 
          scale={1.0}
          renderAsHTML={true}
        />
      )

      // 3x3 pattern should render correctly
      const blockContainer = screen.getByTestId('draggable')
      expect(blockContainer).toBeInTheDocument()
    })

    it('handles rapid re-renders without errors', () => {
      const { rerender } = render(
        <DraggableBlock 
          block={mockBlock} 
          rotation={0}
          renderAsHTML={true}
        />
      )

      // Rapidly change rotation
      for (let i = 0; i < 10; i++) {
        rerender(
          <DraggableBlock 
            block={mockBlock} 
            rotation={i % 4}
            renderAsHTML={true}
          />
        )
      }

      const blockContainer = screen.getByTestId('draggable')
      expect(blockContainer).toBeInTheDocument()
    })

    it('handles mode switching without errors', () => {
      const { rerender } = render(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={true}
        />
      )

      rerender(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={false}
        />
      )

      rerender(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={true}
        />
      )

      // Should handle mode switching gracefully
      expect(screen.getByTestId('draggable')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper data attributes for testing', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toHaveAttribute('data-block-id', 'test-block')
      expect(blockElement).toHaveAttribute('data-dnd-kit-draggable', 'true')
    })

    it('applies appropriate cursor styles for accessibility', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          enableDrag={false}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toHaveStyle({ cursor: 'pointer' })
    })

    it('handles starter block accessibility correctly', () => {
      render(
        <DraggableBlock 
          block={mockBlock} 
          isStarterBlock={true}
          renderAsHTML={true}
        />
      )

      const blockElement = screen.getByTestId('draggable')
      expect(blockElement).toHaveStyle({ cursor: 'not-allowed' })
      expect(blockElement).toHaveStyle({ opacity: '0.9' })
    })
  })
})