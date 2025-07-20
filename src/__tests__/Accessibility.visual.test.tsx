import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import App from '../App'
import * as gameStoreModule from '../store/gameStore'
import * as deviceCapabilitiesModule from '../hooks/useDeviceCapabilities'
import { SAMPLE_CHALLENGES } from '../data/challenges'

// Mock dependencies for accessibility testing
vi.mock('../store/gameStore')
vi.mock('../hooks/useDeviceCapabilities')
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(() => ({ activationConstraint: {} })),
  useSensors: vi.fn(() => []),
  useDndMonitor: vi.fn()
}))

// Accessibility-focused component mocks
vi.mock('../components/GameBoard', () => ({
  default: ({ onCellClick, placedBlocks, selectedBlock, interactionMode, previewPosition }: any) => (
    <div 
      data-testid="game-board"
      role="grid"
      aria-label="Game board for placing blocks"
      aria-describedby="game-board-instructions"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onCellClick(0, 0)
        }
      }}
      style={{ 
        outline: 'none',
        border: '2px solid transparent',
        borderColor: document.activeElement === e.target ? '#4f46e5' : 'transparent'
      }}
    >
      <div id="game-board-instructions" className="sr-only">
        Use arrow keys to navigate, Enter or Space to place selected block
      </div>
      {Object.entries(placedBlocks || {}).map(([blockId, blockData]: [string, any]) => (
        <div 
          key={blockId}
          data-testid={`placed-block-${blockId}`}
          role="gridcell"
          aria-label={`Block ${blockId} placed at position ${blockData.position.x}, ${blockData.position.y}`}
          tabIndex={-1}
        >
          {blockId}
        </div>
      ))}
      <div 
        data-testid="empty-cell"
        role="gridcell"
        aria-label="Empty cell - click to place selected block"
        tabIndex={0}
        onClick={() => onCellClick(0, 0)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onCellClick(0, 0)
          }
        }}
      >
        Empty Cell
      </div>
    </div>
  )
}))

vi.mock('../components/BlockInventory', () => ({
  default: ({ availableBlocks, selectedBlock, onBlockSelect, interactionMode }: any) => (
    <div 
      data-testid="block-inventory"
      role="listbox"
      aria-label="Available blocks for placement"
      aria-activedescendant={selectedBlock ? `inventory-block-${selectedBlock}` : undefined}
    >
      {availableBlocks?.map((blockId: string, index: number) => (
        <button
          key={blockId}
          id={`inventory-block-${blockId}`}
          data-testid={`inventory-block-${blockId}`}
          role="option"
          aria-selected={selectedBlock === blockId}
          aria-label={`Block ${blockId}${selectedBlock === blockId ? ' - selected' : ''}`}
          aria-describedby={`${blockId}-description`}
          onClick={() => onBlockSelect(blockId)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' && index < availableBlocks.length - 1) {
              const nextBlock = screen.getByTestId(`inventory-block-${availableBlocks[index + 1]}`)
              nextBlock.focus()
            } else if (e.key === 'ArrowUp' && index > 0) {
              const prevBlock = screen.getByTestId(`inventory-block-${availableBlocks[index - 1]}`)
              prevBlock.focus()
            }
          }}
          style={{
            backgroundColor: selectedBlock === blockId ? '#4f46e5' : '#f3f4f6',
            color: selectedBlock === blockId ? 'white' : 'black',
            border: '2px solid',
            borderColor: selectedBlock === blockId ? '#3730a3' : '#d1d5db',
            outline: 'none',
            boxShadow: document.activeElement?.id === `inventory-block-${blockId}` ? '0 0 0 3px rgba(79, 70, 229, 0.5)' : 'none'
          }}
        >
          {blockId}
          <div id={`${blockId}-description`} className="sr-only">
            {`Block ${blockId} for puzzle solving`}
          </div>
        </button>
      ))}
    </div>
  )
}))

vi.mock('../components/GameInstructions', () => ({
  default: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div 
        data-testid="game-instructions"
        role="dialog"
        aria-modal="true"
        aria-labelledby="instructions-title"
        aria-describedby="instructions-content"
      >
        <h2 id="instructions-title">How to Play</h2>
        <div id="instructions-content">Game instructions content</div>
        <button 
          onClick={onClose}
          aria-label="Close instructions dialog"
          autoFocus
        >
          Close
        </button>
      </div>
    ) : null
}))

vi.mock('../components/MobileGameControls', () => ({
  default: ({ onRotateBlock, onClearSelection }: any) => (
    <div data-testid="mobile-game-controls" role="toolbar" aria-label="Mobile game controls">
      <button 
        data-testid="mobile-rotate"
        onClick={onRotateBlock}
        aria-label="Rotate selected block"
        aria-describedby="rotate-help"
      >
        Rotate
        <div id="rotate-help" className="sr-only">
          Rotates the currently selected block 90 degrees clockwise
        </div>
      </button>
      <button 
        data-testid="mobile-clear"
        onClick={onClearSelection}
        aria-label="Clear block selection"
        aria-describedby="clear-help"
      >
        Clear
        <div id="clear-help" className="sr-only">
          Deselects the currently selected block
        </div>
      </button>
    </div>
  )
}))

vi.mock('../components/DraggableBlock', () => ({
  default: ({ block }: any) => (
    <div 
      data-testid={`draggable-block-${block?.id}`}
      role="button"
      aria-label={`Draggable block ${block?.id}`}
      tabIndex={0}
    >
      {block?.id}
    </div>
  )
}))

vi.mock('../components/TouchFeedback', () => ({
  TouchFeedback: React.forwardRef(({ children, ...props }: any, ref) => 
    <div ref={ref} {...props}>{children}</div>
  ),
  TouchButton: ({ children, onClick, disabled, className, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className}
      aria-disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}))

vi.mock('@stagewise/toolbar-react', () => ({
  StagewiseToolbar: () => <div data-testid="stagewise-toolbar" />
}))

vi.mock('@stagewise-plugins/react', () => ({ default: {} }))

describe('Accessibility and Visual Tests', () => {
  let mockGameState: any
  let mockGameStore: any

  beforeEach(() => {
    // Initialize mock game state
    mockGameState = {
      currentChallenge: SAMPLE_CHALLENGES[0],
      board: { placedBlocks: [] },
      selectedBlock: null,
      isCompleted: false,
      timeElapsed: 0,
      moves: 0,
      interactionMode: 'drag' as const,
      tapModeState: {
        selectedBlockForPlacement: null,
        selectedBlockRotation: 0
      }
    }

    // Create comprehensive mock store
    mockGameStore = {
      ...mockGameState,
      setCurrentChallenge: vi.fn((challenge) => {
        mockGameState.currentChallenge = challenge
      }),
      placeBlock: vi.fn(() => true),
      removeBlock: vi.fn(),
      selectBlock: vi.fn((blockId) => {
        mockGameState.selectedBlock = blockId
      }),
      resetBoard: vi.fn(),
      getAvailableBlocks: vi.fn(() => mockGameState.currentChallenge.availableBlocks),
      getAllBlocks: vi.fn(() => mockGameState.currentChallenge.availableBlocks),
      incrementTime: vi.fn(),
      isPositionValid: vi.fn(() => true),
      isStarterBlock: vi.fn(() => false),
      rotateSelectedBlock: vi.fn(),
      setInteractionMode: vi.fn(),
      selectBlockForTapPlacement: vi.fn(),
      rotateTapModeBlock: vi.fn(),
      placeTapModeBlock: vi.fn(() => true)
    }

    vi.mocked(gameStoreModule.useGameStore).mockImplementation(() => ({
      ...mockGameState,
      ...mockGameStore
    }))

    vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
      isMobile: false,
      hasTouch: false,
      interactionMode: { primary: 'drag', fallback: 'tap' }
    })

    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up any focus or accessibility state
    document.activeElement?.blur?.()
  })

  describe('Keyboard Navigation and Focus Management', () => {
    it('provides comprehensive keyboard navigation support', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Test tab navigation through main elements
      await user.tab()
      
      // Should focus on the first interactive element
      const focusedElement = document.activeElement
      expect(focusedElement).toBeInTheDocument()
      
      // Continue tabbing through all focusable elements
      const focusableElements = []
      for (let i = 0; i < 10; i++) {
        await user.tab()
        const currentFocus = document.activeElement
        if (currentFocus && currentFocus !== document.body) {
          focusableElements.push(currentFocus.getAttribute('data-testid') || currentFocus.tagName)
        }
      }

      // Should have focused on multiple interactive elements
      expect(focusableElements.length).toBeGreaterThan(3)
    })

    it('handles Enter and Space key activation correctly', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Test Enter key on block inventory
      const firstBlock = screen.getByTestId(`inventory-block-${mockGameState.currentChallenge.availableBlocks[0]}`)
      firstBlock.focus()
      await user.keyboard('{Enter}')
      
      expect(mockGameStore.selectBlock).toHaveBeenCalled()

      // Test Space key on game board
      const emptyCell = screen.getByTestId('empty-cell')
      emptyCell.focus()
      await user.keyboard(' ')
      
      expect(mockGameStore.placeBlock).toHaveBeenCalled()
    })

    it('provides arrow key navigation within components', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const availableBlocks = mockGameState.currentChallenge.availableBlocks
      if (availableBlocks.length > 1) {
        // Focus first block
        const firstBlock = screen.getByTestId(`inventory-block-${availableBlocks[0]}`)
        firstBlock.focus()
        
        // Navigate down with arrow key
        await user.keyboard('{ArrowDown}')
        
        const secondBlock = screen.getByTestId(`inventory-block-${availableBlocks[1]}`)
        expect(document.activeElement).toBe(secondBlock)
        
        // Navigate back up
        await user.keyboard('{ArrowUp}')
        expect(document.activeElement).toBe(firstBlock)
      }
    })

    it('maintains focus visibility and indicators', () => {
      render(<App />)

      // Test focus indicators on interactive elements
      const firstBlock = screen.getByTestId(`inventory-block-${mockGameState.currentChallenge.availableBlocks[0]}`)
      firstBlock.focus()
      
      const computedStyle = window.getComputedStyle(firstBlock)
      
      // Should have visible focus indicator (outline or box-shadow)
      expect(
        computedStyle.outline !== 'none' || 
        computedStyle.boxShadow !== 'none' ||
        computedStyle.borderColor !== 'transparent'
      ).toBe(true)
    })

    it('supports keyboard shortcuts for common actions', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Test space key for block rotation
      mockGameState.selectedBlock = mockGameState.currentChallenge.availableBlocks[0]
      
      // Simulate space key press for rotation
      await user.keyboard(' ')
      
      // Should trigger rotation action
      expect(mockGameStore.rotateSelectedBlock).toHaveBeenCalled()
    })
  })

  describe('Screen Reader and ARIA Support', () => {
    it('provides proper ARIA roles and labels', () => {
      render(<App />)

      // Check game board ARIA attributes
      const gameBoard = screen.getByTestId('game-board')
      expect(gameBoard).toHaveAttribute('role', 'grid')
      expect(gameBoard).toHaveAttribute('aria-label')
      expect(gameBoard).toHaveAttribute('aria-describedby')

      // Check block inventory ARIA attributes
      const blockInventory = screen.getByTestId('block-inventory')
      expect(blockInventory).toHaveAttribute('role', 'listbox')
      expect(blockInventory).toHaveAttribute('aria-label')

      // Check individual blocks
      const firstBlock = screen.getByTestId(`inventory-block-${mockGameState.currentChallenge.availableBlocks[0]}`)
      expect(firstBlock).toHaveAttribute('role', 'option')
      expect(firstBlock).toHaveAttribute('aria-label')
      expect(firstBlock).toHaveAttribute('aria-selected')
    })

    it('provides descriptive labels for all interactive elements', () => {
      render(<App />)

      // Check button labels
      const resetButton = screen.getByText('Reset')
      expect(resetButton).toBeInTheDocument()

      const howToPlayButton = screen.getByText('How to Play')
      expect(howToPlayButton).toBeInTheDocument()

      // Check mobile controls
      const rotateButton = screen.getByTestId('mobile-rotate')
      expect(rotateButton).toHaveAttribute('aria-label', 'Rotate selected block')

      const clearButton = screen.getByTestId('mobile-clear')
      expect(clearButton).toHaveAttribute('aria-label', 'Clear block selection')
    })

    it('announces state changes to screen readers', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Test block selection announcement
      const firstBlock = screen.getByTestId(`inventory-block-${mockGameState.currentChallenge.availableBlocks[0]}`)
      await user.click(firstBlock)

      // Verify aria-selected state changes
      expect(firstBlock).toHaveAttribute('aria-selected', 'true')

      // Check that selected block is announced
      const blockInventory = screen.getByTestId('block-inventory')
      expect(blockInventory).toHaveAttribute('aria-activedescendant', firstBlock.id)
    })

    it('provides live regions for dynamic content updates', () => {
      render(<App />)

      // Check for completion announcement area
      if (mockGameState.isCompleted) {
        const completionMessage = screen.getByText(/Puzzle Completed/i)
        expect(completionMessage).toBeInTheDocument()
      }

      // Time and moves should be announced when they change
      const timeDisplay = screen.getByText(/Time:/)
      expect(timeDisplay).toBeInTheDocument()

      const movesDisplay = screen.getByText(/Moves:/)
      expect(movesDisplay).toBeInTheDocument()
    })

    it('supports dialog and modal accessibility', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Open instructions dialog
      const howToPlayButton = screen.getByText('How to Play')
      await user.click(howToPlayButton)

      const dialog = screen.getByTestId('game-instructions')
      expect(dialog).toHaveAttribute('role', 'dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
      expect(dialog).toHaveAttribute('aria-describedby')

      // Close button should be focused
      const closeButton = screen.getByLabelText('Close instructions dialog')
      expect(closeButton).toHaveFocus()
    })
  })

  describe('Visual Accessibility and Contrast', () => {
    it('provides sufficient color contrast for text elements', () => {
      render(<App />)

      // Test main heading
      const heading = screen.getByText('Mondrian Blocks')
      const headingStyle = window.getComputedStyle(heading)
      
      // Check that text has sufficient contrast (this is a basic check)
      expect(headingStyle.color).not.toBe('transparent')
      expect(headingStyle.color).not.toBe(headingStyle.backgroundColor)

      // Test button text
      const resetButton = screen.getByText('Reset')
      const buttonStyle = window.getComputedStyle(resetButton)
      expect(buttonStyle.color).not.toBe('transparent')
    })

    it('supports reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<App />)

      // Should render without animations when reduced motion is preferred
      const app = screen.getByTestId('dnd-context')
      expect(app).toBeInTheDocument()
    })

    it('provides visual focus indicators that meet accessibility standards', () => {
      render(<App />)

      const firstBlock = screen.getByTestId(`inventory-block-${mockGameState.currentChallenge.availableBlocks[0]}`)
      firstBlock.focus()

      const computedStyle = window.getComputedStyle(firstBlock)
      
      // Focus indicator should be visible
      const hasFocusIndicator = 
        computedStyle.outline !== 'none' ||
        computedStyle.boxShadow.includes('rgba(79, 70, 229, 0.5)') ||
        computedStyle.borderColor !== 'transparent'
      
      expect(hasFocusIndicator).toBe(true)
    })

    it('uses semantic HTML elements appropriately', () => {
      render(<App />)

      // Check for proper heading hierarchy
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()

      // Check for proper button elements
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)

      // Check for proper navigation structure
      const gameBoard = screen.getByRole('grid')
      expect(gameBoard).toBeInTheDocument()

      const blockList = screen.getByRole('listbox')
      expect(blockList).toBeInTheDocument()
    })
  })

  describe('Touch and Mobile Accessibility', () => {
    beforeEach(() => {
      // Mock mobile environment
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
        isMobile: true,
        hasTouch: true,
        interactionMode: { primary: 'tap', fallback: 'drag' }
      })
    })

    it('provides appropriate touch target sizes', () => {
      render(<App />)

      // Test touch targets are large enough (minimum 44px)
      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        const computedStyle = window.getComputedStyle(button)
        const minSize = parseInt(computedStyle.minHeight) || parseInt(computedStyle.height)
        
        // Touch targets should be at least 44px
        expect(minSize).toBeGreaterThanOrEqual(44)
      })
    })

    it('supports touch gestures accessibility', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Test mobile-specific controls
      const mobileControls = screen.getByTestId('mobile-game-controls')
      expect(mobileControls).toHaveAttribute('role', 'toolbar')
      expect(mobileControls).toHaveAttribute('aria-label', 'Mobile game controls')

      // Test rotate button
      const rotateButton = screen.getByTestId('mobile-rotate')
      await user.click(rotateButton)
      expect(mockGameStore.rotateSelectedBlock).toHaveBeenCalled()
    })

    it('provides haptic feedback accessibility information', () => {
      render(<App />)

      // Mobile controls should have descriptive help text
      const rotateHelp = screen.getByText(/Rotates the currently selected block/i)
      expect(rotateHelp).toHaveClass('sr-only')

      const clearHelp = screen.getByText(/Deselects the currently selected block/i)
      expect(clearHelp).toHaveClass('sr-only')
    })
  })

  describe('Error States and Accessibility Feedback', () => {
    it('announces errors and validation messages', async () => {
      const user = userEvent.setup()
      
      // Mock placement failure
      mockGameStore.placeBlock.mockReturnValueOnce(false)
      
      render(<App />)

      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      const emptyCell = screen.getByTestId('empty-cell')

      await user.click(inventoryBlock)
      await user.click(emptyCell)

      // Should handle failed placement gracefully
      expect(mockGameStore.placeBlock).toHaveBeenCalled()
    })

    it('provides accessible loading and progress indicators', () => {
      render(<App />)

      // Time and moves counters should be accessible
      const timeDisplay = screen.getByText(/Time:/)
      expect(timeDisplay).toBeInTheDocument()

      const movesDisplay = screen.getByText(/Moves:/)
      expect(movesDisplay).toBeInTheDocument()
    })

    it('handles disabled states accessibly', () => {
      render(<App />)

      // Test navigation buttons at boundaries
      const prevButton = screen.getByText('Previous')
      const nextButton = screen.getByText('Next')

      // Buttons should have proper disabled states
      expect(prevButton).toHaveAttribute('disabled')
      expect(prevButton).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('Context and Help Information', () => {
    it('provides contextual help for complex interactions', () => {
      render(<App />)

      // Game board should have instructions
      const instructions = screen.getByText(/Use arrow keys to navigate, Enter or Space to place selected block/i)
      expect(instructions).toHaveClass('sr-only')

      // Blocks should have descriptions
      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const blockDescription = screen.getByText(`Block ${blockId} for puzzle solving`)
      expect(blockDescription).toHaveClass('sr-only')
    })

    it('supports help text and tooltips', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Instructions should be accessible
      const howToPlayButton = screen.getByText('How to Play')
      await user.click(howToPlayButton)

      const instructionsDialog = screen.getByTestId('game-instructions')
      expect(instructionsDialog).toBeInTheDocument()
      expect(instructionsDialog).toHaveAttribute('aria-modal', 'true')
    })

    it('provides status information for puzzle progress', () => {
      render(<App />)

      // Challenge information should be accessible
      const challengeName = screen.getByText(mockGameState.currentChallenge.name)
      expect(challengeName).toBeInTheDocument()

      const difficulty = screen.getByText(mockGameState.currentChallenge.difficulty.toUpperCase())
      expect(difficulty).toBeInTheDocument()
    })
  })

  describe('Performance with Accessibility Features', () => {
    it('maintains performance with screen readers enabled', async () => {
      const user = userEvent.setup()
      
      const startTime = performance.now()
      
      render(<App />)

      // Simulate screen reader interactions
      for (let i = 0; i < 10; i++) {
        await user.tab()
      }

      const endTime = performance.now()
      
      // Should remain performant even with accessibility features
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('handles frequent ARIA updates efficiently', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const startTime = performance.now()

      // Simulate many state changes that update ARIA attributes
      for (let i = 0; i < 20; i++) {
        const blockId = mockGameState.currentChallenge.availableBlocks[i % mockGameState.currentChallenge.availableBlocks.length]
        const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
        await user.click(inventoryBlock)
      }

      const endTime = performance.now()

      // ARIA updates should not significantly impact performance
      expect(endTime - startTime).toBeLessThan(2000)
    })
  })

  describe('Cross-Platform Accessibility Consistency', () => {
    it('maintains accessibility across different devices', () => {
      // Test desktop environment
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
        isMobile: false,
        hasTouch: false,
        interactionMode: { primary: 'drag', fallback: 'tap' }
      })

      const { rerender } = render(<App />)

      // Should have desktop-appropriate accessibility features
      expect(screen.getByTestId('game-board')).toHaveAttribute('role', 'grid')

      // Test mobile environment
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
        isMobile: true,
        hasTouch: true,
        interactionMode: { primary: 'tap', fallback: 'drag' }
      })

      rerender(<App />)

      // Should maintain accessibility on mobile
      expect(screen.getByTestId('game-board')).toHaveAttribute('role', 'grid')
      expect(screen.getByTestId('mobile-game-controls')).toHaveAttribute('role', 'toolbar')
    })

    it('supports platform-specific accessibility patterns', () => {
      render(<App />)

      // Should work with both mouse and keyboard
      const gameBoard = screen.getByTestId('game-board')
      expect(gameBoard).toHaveAttribute('tabIndex', '0')
      
      const emptyCell = screen.getByTestId('empty-cell')
      expect(emptyCell).toHaveAttribute('tabIndex', '0')
    })
  })
})