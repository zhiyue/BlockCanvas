import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import BlockInventory from '../BlockInventory'
import { BlockShape } from '../../types/game'

// Mock DraggableBlock component
vi.mock('../DraggableBlock', () => ({
  default: ({ block, isSelected, onSelect, rotation, x, y }: any) => (
    <div 
      data-testid={`draggable-block-${block.id}`}
      data-selected={isSelected}
      data-rotation={rotation}
      data-x={x}
      data-y={y}
      onClick={onSelect}
    >
      {block.name}
    </div>
  )
}))

// Mock blocks data
const mockBlocks: { [key: string]: BlockShape } = {
  'block-1': {
    id: 'block-1',
    name: 'Block 1',
    width: 1,
    height: 1,
    color: '#ff0000',
    pattern: [[true]]
  },
  'block-2': {
    id: 'block-2',
    name: 'Block 2',
    width: 2,
    height: 1,
    color: '#00ff00',
    pattern: [[true, true]]
  },
  'block-3': {
    id: 'block-3',
    name: 'Block 3',
    width: 2,
    height: 2,
    color: '#0000ff',
    pattern: [
      [true, true],
      [true, true]
    ]
  },
  'block-4': {
    id: 'block-4',
    name: 'Block 4',
    width: 1,
    height: 2,
    color: '#ff00ff',
    pattern: [[true], [true]]
  }
}

vi.mock('../../data/blocks', () => ({
  getBlockById: vi.fn().mockImplementation((id: string) => mockBlocks[id])
}))

describe('BlockInventory', () => {
  const defaultProps = {
    availableBlocks: ['block-1', 'block-2', 'block-3'],
    selectedBlock: null,
    onBlockSelect: vi.fn(),
    blockRotations: {},
    onBlockRotate: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the inventory title', () => {
      render(<BlockInventory {...defaultProps} />)
      
      expect(screen.getByText('Available Blocks')).toBeInTheDocument()
    })

    it('should render all available blocks', () => {
      render(<BlockInventory {...defaultProps} />)
      
      expect(screen.getByTestId('draggable-block-block-1')).toBeInTheDocument()
      expect(screen.getByTestId('draggable-block-block-2')).toBeInTheDocument()
      expect(screen.getByTestId('draggable-block-block-3')).toBeInTheDocument()
    })

    it('should render inventory container with correct styling', () => {
      render(<BlockInventory {...defaultProps} />)
      
      const container = screen.getByText('Available Blocks').nextElementSibling
      expect(container).toBeInTheDocument()
      expect(container).toHaveClass('inventory-container')
      expect(container).toHaveStyle('position: relative')
      expect(container).toHaveStyle('border: 2px solid rgb(229, 231, 235)')
      expect(container).toHaveStyle('background-color: rgb(248, 250, 252)')
    })

    it('should calculate inventory size correctly for different block counts', () => {
      const { rerender } = render(
        <BlockInventory {...defaultProps} availableBlocks={['block-1']} />
      )
      
      let container = screen.getByText('Available Blocks').nextElementSibling
      // width = gridCols * (cellSize * 5 + padding) + padding = 3 * (30 * 5 + 20) + 20 = 3 * 170 + 20 = 530
      expect(container).toHaveStyle('width: 530px')
      // height = rows * (cellSize * 4 + padding) + padding = 1 * (30 * 4 + 20) + 20 = 140 + 20 = 160
      expect(container).toHaveStyle('height: 160px')

      rerender(
        <BlockInventory {...defaultProps} availableBlocks={['block-1', 'block-2', 'block-3', 'block-4']} />
      )
      
      container = screen.getByText('Available Blocks').nextElementSibling
      // height for 2 rows = 2 * (30 * 4 + 20) + 20 = 2 * 140 + 20 = 300
      expect(container).toHaveStyle('height: 300px')
    })

    it('should handle empty blocks list', () => {
      render(<BlockInventory {...defaultProps} availableBlocks={[]} />)
      
      expect(screen.queryByTestId(/draggable-block-/)).not.toBeInTheDocument()
      expect(screen.getByText('Available Blocks')).toBeInTheDocument()
    })

    it('should filter out invalid blocks', () => {
      render(
        <BlockInventory 
          {...defaultProps} 
          availableBlocks={['block-1', 'invalid-block', 'block-2']} 
        />
      )
      
      expect(screen.getByTestId('draggable-block-block-1')).toBeInTheDocument()
      expect(screen.getByTestId('draggable-block-block-2')).toBeInTheDocument()
      expect(screen.queryByTestId('draggable-block-invalid-block')).not.toBeInTheDocument()
    })
  })

  describe('Block Selection', () => {
    it('should show selected block correctly', () => {
      render(
        <BlockInventory {...defaultProps} selectedBlock="block-2" />
      )
      
      const block1 = screen.getByTestId('draggable-block-block-1')
      const block2 = screen.getByTestId('draggable-block-block-2')
      const block3 = screen.getByTestId('draggable-block-block-3')

      expect(block1).toHaveAttribute('data-selected', 'false')
      expect(block2).toHaveAttribute('data-selected', 'true')
      expect(block3).toHaveAttribute('data-selected', 'false')
    })

    it('should call onBlockSelect when block is clicked', () => {
      const mockOnBlockSelect = vi.fn()
      
      render(
        <BlockInventory {...defaultProps} onBlockSelect={mockOnBlockSelect} />
      )
      
      const block1 = screen.getByTestId('draggable-block-block-1')
      fireEvent.click(block1)
      
      expect(mockOnBlockSelect).toHaveBeenCalledWith('block-1')
    })

    it('should deselect block when already selected block is clicked', () => {
      const mockOnBlockSelect = vi.fn()
      
      render(
        <BlockInventory 
          {...defaultProps} 
          selectedBlock="block-1"
          onBlockSelect={mockOnBlockSelect} 
        />
      )
      
      const block1 = screen.getByTestId('draggable-block-block-1')
      fireEvent.click(block1)
      
      expect(mockOnBlockSelect).toHaveBeenCalledWith(null)
    })

    it('should display selected block info when a block is selected', () => {
      render(
        <BlockInventory {...defaultProps} selectedBlock="block-1" />
      )
      
      expect(screen.getByText('Selected: Block 1')).toBeInTheDocument()
      expect(screen.getByText('Click on the board to place the block')).toBeInTheDocument()
    })

    it('should not display selected block info when no block is selected', () => {
      render(
        <BlockInventory {...defaultProps} selectedBlock={null} />
      )
      
      expect(screen.queryByText(/Selected:/)).not.toBeInTheDocument()
      expect(screen.queryByText('Click on the board to place the block')).not.toBeInTheDocument()
    })
  })

  describe('Block Rotation', () => {
    it('should apply rotation from blockRotations prop', () => {
      render(
        <BlockInventory 
          {...defaultProps} 
          blockRotations={{ 'block-1': 2, 'block-2': 1 }} 
        />
      )
      
      const block1 = screen.getByTestId('draggable-block-block-1')
      const block2 = screen.getByTestId('draggable-block-block-2')
      const block3 = screen.getByTestId('draggable-block-block-3')

      expect(block1).toHaveAttribute('data-rotation', '2')
      expect(block2).toHaveAttribute('data-rotation', '1')
      expect(block3).toHaveAttribute('data-rotation', '0') // default
    })

    it('should default to 0 rotation when not specified', () => {
      render(<BlockInventory {...defaultProps} />)
      
      const block1 = screen.getByTestId('draggable-block-block-1')
      expect(block1).toHaveAttribute('data-rotation', '0')
    })

    it('should show rotate button when block is selected', () => {
      render(
        <BlockInventory {...defaultProps} selectedBlock="block-1" />
      )
      
      expect(screen.getByText('Rotate (90°)')).toBeInTheDocument()
    })

    it('should call onBlockRotate when rotate button is clicked', () => {
      const mockOnBlockRotate = vi.fn()
      
      render(
        <BlockInventory 
          {...defaultProps} 
          selectedBlock="block-1"
          onBlockRotate={mockOnBlockRotate}
        />
      )
      
      const rotateButton = screen.getByText('Rotate (90°)')
      fireEvent.click(rotateButton)
      
      expect(mockOnBlockRotate).toHaveBeenCalledWith('block-1')
    })

    it('should handle missing onBlockRotate gracefully', () => {
      render(
        <BlockInventory 
          {...defaultProps} 
          selectedBlock="block-1"
          onBlockRotate={undefined}
        />
      )
      
      const rotateButton = screen.getByText('Rotate (90°)')
      
      expect(() => {
        fireEvent.click(rotateButton)
      }).not.toThrow()
    })
  })

  describe('Control Buttons', () => {
    it('should show deselect button when block is selected', () => {
      render(
        <BlockInventory {...defaultProps} selectedBlock="block-1" />
      )
      
      expect(screen.getByText('Deselect')).toBeInTheDocument()
    })

    it('should call onBlockSelect with null when deselect button is clicked', () => {
      const mockOnBlockSelect = vi.fn()
      
      render(
        <BlockInventory 
          {...defaultProps} 
          selectedBlock="block-1"
          onBlockSelect={mockOnBlockSelect}
        />
      )
      
      const deselectButton = screen.getByText('Deselect')
      fireEvent.click(deselectButton)
      
      expect(mockOnBlockSelect).toHaveBeenCalledWith(null)
    })

    it('should have correct button classes', () => {
      render(
        <BlockInventory {...defaultProps} selectedBlock="block-1" />
      )
      
      const rotateButton = screen.getByText('Rotate (90°)')
      const deselectButton = screen.getByText('Deselect')
      
      expect(rotateButton).toHaveClass('btn', 'btn-primary')
      expect(deselectButton).toHaveClass('btn', 'btn-secondary')
    })
  })

  describe('Block Positioning', () => {
    it('should position blocks in a grid layout', () => {
      render(<BlockInventory {...defaultProps} />)
      
      const block1 = screen.getByTestId('draggable-block-block-1')
      const block2 = screen.getByTestId('draggable-block-block-2')
      const block3 = screen.getByTestId('draggable-block-block-3')

      // cellSize = CELL_SIZE * 0.6 = 50 * 0.6 = 30
      // x = col * (cellSize * 5 + padding) + padding = col * (30 * 5 + 20) + 20 = col * 170 + 20
      expect(block1).toHaveAttribute('data-x', '20')   // col 0: 0 * 170 + 20 = 20
      expect(block1).toHaveAttribute('data-y', '20')   // row 0
      
      expect(block2).toHaveAttribute('data-x', '190')  // col 1: 1 * 170 + 20 = 190
      expect(block2).toHaveAttribute('data-y', '20')   // row 0
      
      expect(block3).toHaveAttribute('data-x', '360')  // col 2: 2 * 170 + 20 = 360
      expect(block3).toHaveAttribute('data-y', '20')   // row 0
    })

    it('should wrap to next row after 3 columns', () => {
      render(
        <BlockInventory 
          {...defaultProps} 
          availableBlocks={['block-1', 'block-2', 'block-3', 'block-4']} 
        />
      )
      
      const blocks = screen.getAllByTestId(/draggable-block-/)
      const fourthBlock = blocks[3]
      
      expect(fourthBlock).toHaveAttribute('data-x', '20')  // col 0
      // y = row * (cellSize * 4 + padding) + padding = 1 * (30 * 4 + 20) + 20 = 140 + 20 = 160
      expect(fourthBlock).toHaveAttribute('data-y', '160') // row 1
    })
  })

  describe('Component Props', () => {
    it('should handle all required props', () => {
      expect(() => {
        render(
          <BlockInventory 
            availableBlocks={[]}
            selectedBlock={null}
            onBlockSelect={vi.fn()}
          />
        )
      }).not.toThrow()
    })

    it('should handle all optional props', () => {
      expect(() => {
        render(
          <BlockInventory 
            availableBlocks={['block-1']}
            selectedBlock="block-1"
            onBlockSelect={vi.fn()}
            onBlockPlace={vi.fn()}
            blockRotations={{ 'block-1': 1 }}
            onBlockRotate={vi.fn()}
          />
        )
      }).not.toThrow()
    })
  })
})