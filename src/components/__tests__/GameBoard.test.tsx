import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import GameBoard from '../GameBoard'
import { Position } from '../../types/game'

// Mock react-konva components
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: any) => <div data-testid="konva-stage" {...props}>{children}</div>,
  Layer: ({ children, ...props }: any) => <div data-testid="konva-layer" {...props}>{children}</div>,
  Rect: (props: any) => <div data-testid="konva-rect" data-props={JSON.stringify(props)} />,
  Group: ({ children, ...props }: any) => <div data-testid="konva-group" {...props}>{children}</div>
}))

// Mock DraggableBlock component
vi.mock('../DraggableBlock', () => ({
  default: ({ block, isSelected, onSelect, x, y }: any) => (
    <div 
      data-testid={`draggable-block-${block.id}`}
      data-selected={isSelected}
      data-x={x}
      data-y={y}
      onClick={onSelect}
    >
      {block.name}
    </div>
  )
}))

// Mock blocks data
vi.mock('../../data/blocks', () => ({
  getBlockById: vi.fn().mockImplementation((id: string) => ({
    id,
    name: `Block ${id}`,
    width: 1,
    height: 1,
    color: '#000000',
    pattern: [[true]]
  }))
}))

describe('GameBoard', () => {
  const mockPlacedBlocks = {
    'block-1': {
      position: { x: 0, y: 0 } as Position,
      color: '#ff0000',
      pattern: [[true]],
      rotation: 0
    },
    'block-2': {
      position: { x: 2, y: 3 } as Position,
      color: '#00ff00',
      pattern: [
        [true, true],
        [true, false]
      ],
      rotation: 1
    }
  }

  const defaultProps = {
    placedBlocks: {},
    onCellClick: vi.fn(),
    selectedBlock: null,
    onBlockSelect: vi.fn()
  }

  // Wrapper component to provide DndContext
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <DndContext>
      {children}
    </DndContext>
  )

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the game board with Stage and Layer', () => {
      render(
        <TestWrapper>
          <GameBoard {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByTestId('konva-stage')).toBeInTheDocument()
      expect(screen.getByTestId('konva-layer')).toBeInTheDocument()
    })

    it('should render the correct board dimensions', () => {
      render(
        <TestWrapper>
          <GameBoard {...defaultProps} />
        </TestWrapper>
      )

      const stage = screen.getByTestId('konva-stage')
      expect(stage).toHaveAttribute('width', '404') // 8*50 + 2*2 = 404
      expect(stage).toHaveAttribute('height', '404')
    })

    it('should render board background', () => {
      render(
        <TestWrapper>
          <GameBoard {...defaultProps} />
        </TestWrapper>
      )

      const rects = screen.getAllByTestId('konva-rect')
      const backgroundRect = rects.find(rect => {
        const props = JSON.parse(rect.getAttribute('data-props') || '{}')
        return props.width === 404 && props.height === 404 && props.fill === '#f8f9fa'
      })

      expect(backgroundRect).toBeDefined()
    })

    it('should render grid cells', () => {
      render(
        <TestWrapper>
          <GameBoard {...defaultProps} />
        </TestWrapper>
      )

      const rects = screen.getAllByTestId('konva-rect')
      const cellRects = rects.filter(rect => {
        const props = JSON.parse(rect.getAttribute('data-props') || '{}')
        return props.fill === '#ffffff' && props.stroke === '#f0f0f0'
      })

      expect(cellRects).toHaveLength(64) // 8x8 grid
    })

    it('should render grid lines', () => {
      render(
        <TestWrapper>
          <GameBoard {...defaultProps} />
        </TestWrapper>
      )

      const rects = screen.getAllByTestId('konva-rect')
      const gridLines = rects.filter(rect => {
        const props = JSON.parse(rect.getAttribute('data-props') || '{}')
        return props.fill === '#cccccc'
      })

      expect(gridLines).toHaveLength(18) // 9 vertical + 9 horizontal lines
    })
  })

  describe('Placed Blocks', () => {
    it('should render draggable blocks for placed blocks', () => {
      render(
        <TestWrapper>
          <GameBoard {...defaultProps} placedBlocks={mockPlacedBlocks} />
        </TestWrapper>
      )

      expect(screen.getByTestId('draggable-block-block-1')).toBeInTheDocument()
      expect(screen.getByTestId('draggable-block-block-2')).toBeInTheDocument()
    })

    it('should position draggable blocks correctly', () => {
      render(
        <TestWrapper>
          <GameBoard {...defaultProps} placedBlocks={mockPlacedBlocks} />
        </TestWrapper>
      )

      const block1 = screen.getByTestId('draggable-block-block-1')
      const block2 = screen.getByTestId('draggable-block-block-2')

      expect(block1).toHaveAttribute('data-x', '2') // 0*50 + 2
      expect(block1).toHaveAttribute('data-y', '2') // 0*50 + 2
      expect(block2).toHaveAttribute('data-x', '102') // 2*50 + 2
      expect(block2).toHaveAttribute('data-y', '152') // 3*50 + 2
    })

    it('should handle empty placed blocks', () => {
      render(
        <TestWrapper>
          <GameBoard {...defaultProps} placedBlocks={{}} />
        </TestWrapper>
      )

      expect(screen.queryByTestId(/draggable-block-/)).not.toBeInTheDocument()
    })
  })

  describe('Block Selection', () => {
    it('should show selected block correctly', () => {
      render(
        <TestWrapper>
          <GameBoard 
            {...defaultProps} 
            placedBlocks={mockPlacedBlocks}
            selectedBlock="block-1"
          />
        </TestWrapper>
      )

      const block1 = screen.getByTestId('draggable-block-block-1')
      const block2 = screen.getByTestId('draggable-block-block-2')

      expect(block1).toHaveAttribute('data-selected', 'true')
      expect(block2).toHaveAttribute('data-selected', 'false')
    })

    it('should call onBlockSelect when block is clicked', () => {
      const mockOnBlockSelect = vi.fn()

      render(
        <TestWrapper>
          <GameBoard 
            {...defaultProps} 
            placedBlocks={mockPlacedBlocks}
            onBlockSelect={mockOnBlockSelect}
          />
        </TestWrapper>
      )

      const block1 = screen.getByTestId('draggable-block-block-1')
      fireEvent.click(block1)

      expect(mockOnBlockSelect).toHaveBeenCalledWith('block-1')
    })

    it('should deselect block when already selected block is clicked', () => {
      const mockOnBlockSelect = vi.fn()

      render(
        <TestWrapper>
          <GameBoard 
            {...defaultProps} 
            placedBlocks={mockPlacedBlocks}
            selectedBlock="block-1"
            onBlockSelect={mockOnBlockSelect}
          />
        </TestWrapper>
      )

      const block1 = screen.getByTestId('draggable-block-block-1')
      fireEvent.click(block1)

      expect(mockOnBlockSelect).toHaveBeenCalledWith(null)
    })
  })

  describe('Cell Click Handling', () => {
    it('should call onCellClick when overlay is clicked', () => {
      const mockOnCellClick = vi.fn()

      const { container } = render(
        <TestWrapper>
          <GameBoard {...defaultProps} onCellClick={mockOnCellClick} />
        </TestWrapper>
      )

      const overlay = container.querySelector('[style*="position: absolute"]')
      expect(overlay).toBeInTheDocument()

      // Mock getBoundingClientRect
      const mockGetBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 400,
        height: 400
      }))
      
      overlay!.getBoundingClientRect = mockGetBoundingClientRect

      fireEvent.click(overlay!, {
        clientX: 52, // Position for grid cell (1, 1)
        clientY: 52
      })

      expect(mockOnCellClick).toHaveBeenCalledWith(1, 1)
    })

    it('should not call onCellClick when clicked outside board', () => {
      const mockOnCellClick = vi.fn()

      const { container } = render(
        <TestWrapper>
          <GameBoard {...defaultProps} onCellClick={mockOnCellClick} />
        </TestWrapper>
      )

      const overlay = container.querySelector('[style*="position: absolute"]')

      overlay!.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 400,
        height: 400
      }))

      fireEvent.click(overlay!, {
        clientX: -10, // Outside board
        clientY: -10
      })

      expect(mockOnCellClick).not.toHaveBeenCalled()
    })

    it('should handle missing onCellClick gracefully', () => {
      const { container } = render(
        <TestWrapper>
          <GameBoard {...defaultProps} onCellClick={undefined} />
        </TestWrapper>
      )

      const overlay = container.querySelector('[style*="position: absolute"]')

      overlay!.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 400,
        height: 400
      }))

      expect(() => {
        fireEvent.click(overlay!, {
          clientX: 52,
          clientY: 52
        })
      }).not.toThrow()
    })
  })

  describe('Drag and Drop Styling', () => {
    it('should apply correct styles when not dragging over', () => {
      const { container } = render(
        <TestWrapper>
          <GameBoard {...defaultProps} />
        </TestWrapper>
      )

      const overlay = container.querySelector('[style*="position: absolute"]')

      expect(overlay).toHaveStyle('background-color: rgba(0, 0, 0, 0)')
      expect(overlay).toHaveStyle('border: none')
      expect(overlay).toHaveStyle('pointer-events: auto')
    })

    // Note: Testing drag-over state requires mocking @dnd-kit/core's useDroppable hook
    // which is complex and would require additional setup
  })

  describe('Props Validation', () => {
    it('should handle all required props', () => {
      expect(() => {
        render(
          <TestWrapper>
            <GameBoard placedBlocks={{}} />
          </TestWrapper>
        )
      }).not.toThrow()
    })

    it('should handle optional props', () => {
      expect(() => {
        render(
          <TestWrapper>
            <GameBoard 
              placedBlocks={{}}
              onCellClick={vi.fn()}
              selectedBlock="test"
              onBlockSelect={vi.fn()}
            />
          </TestWrapper>
        )
      }).not.toThrow()
    })
  })
})