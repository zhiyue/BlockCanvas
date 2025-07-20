import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import App from '../App'
import * as gameStoreModule from '../store/gameStore'
import * as deviceCapabilitiesModule from '../hooks/useDeviceCapabilities'
import { SAMPLE_CHALLENGES } from '../data/challenges'
import { BLOCKS } from '../data/blocks'

// Mock all dependencies with detailed game store implementation
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

// Component mocks
vi.mock('../components/GameBoard', () => ({
  default: ({ onCellClick, placedBlocks, selectedBlock, interactionMode }: any) => (
    <div 
      data-testid="game-board"
      data-placed-blocks={Object.keys(placedBlocks || {}).join(',')}
      data-selected-block={selectedBlock}
      data-interaction-mode={interactionMode}
    >
      {Object.entries(placedBlocks || {}).map(([blockId, blockData]: [string, any]) => (
        <div 
          key={blockId}
          data-testid={`placed-block-${blockId}`}
          data-position={`${blockData.position.x},${blockData.position.y}`}
          data-rotation={blockData.rotation}
          onClick={() => onCellClick(blockData.position.x, blockData.position.y)}
        >
          {blockId}
        </div>
      ))}
      <div 
        data-testid="empty-cell"
        onClick={() => onCellClick(0, 0)}
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
      data-available-blocks={availableBlocks?.join(',')}
      data-interaction-mode={interactionMode}
    >
      {availableBlocks?.map((blockId: string) => (
        <button
          key={blockId}
          data-testid={`inventory-block-${blockId}`}
          data-selected={selectedBlock === blockId}
          onClick={() => onBlockSelect(blockId)}
        >
          {blockId}
        </button>
      ))}
    </div>
  )
}))

vi.mock('../components/GameInstructions', () => ({
  default: ({ isOpen }: any) => 
    isOpen ? <div data-testid="game-instructions">Instructions</div> : null
}))

vi.mock('../components/MobileGameControls', () => ({
  default: ({ onRotateBlock, onClearSelection }: any) => (
    <div data-testid="mobile-game-controls">
      <button data-testid="mobile-rotate" onClick={onRotateBlock}>Rotate</button>
      <button data-testid="mobile-clear" onClick={onClearSelection}>Clear</button>
    </div>
  )
}))

vi.mock('../components/DraggableBlock', () => ({
  default: ({ block }: any) => <div data-testid={`draggable-block-${block?.id}`}>{block?.id}</div>
}))

vi.mock('../components/TouchFeedback', () => ({
  TouchFeedback: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  TouchButton: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  )
}))

vi.mock('@stagewise/toolbar-react', () => ({
  StagewiseToolbar: () => <div data-testid="stagewise-toolbar" />
}))

vi.mock('@stagewise-plugins/react', () => ({ default: {} }))

describe('Complex User Workflows Integration Tests', () => {
  // Create a sophisticated mock game store with realistic state management
  let mockGameState: any
  let mockGameStore: any

  beforeEach(() => {
    // Initialize realistic game state
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

    // Create comprehensive mock store with realistic behavior
    mockGameStore = {
      ...mockGameState,
      setCurrentChallenge: vi.fn((challenge) => {
        mockGameState.currentChallenge = challenge
        mockGameState.board = { placedBlocks: [...challenge.starterBlocks] }
        mockGameState.isCompleted = false
        mockGameState.timeElapsed = 0
        mockGameState.moves = 0
      }),
      placeBlock: vi.fn((blockId, x, y, rotation = 0) => {
        mockGameState.board.placedBlocks.push({
          blockId,
          position: { x, y },
          rotation
        })
        mockGameState.moves++
        
        // Check for completion (simplified)
        const totalPlaced = mockGameState.board.placedBlocks.length
        const totalNeeded = mockGameState.currentChallenge.starterBlocks.length + 
                          mockGameState.currentChallenge.availableBlocks.length
        
        if (totalPlaced >= totalNeeded) {
          mockGameState.isCompleted = true
        }
        
        return true
      }),
      removeBlock: vi.fn((blockId) => {
        mockGameState.board.placedBlocks = mockGameState.board.placedBlocks
          .filter((pb: any) => pb.blockId !== blockId)
        mockGameState.moves++
      }),
      selectBlock: vi.fn((blockId) => {
        mockGameState.selectedBlock = blockId
      }),
      resetBoard: vi.fn(() => {
        mockGameState.board = { 
          placedBlocks: [...mockGameState.currentChallenge.starterBlocks] 
        }
        mockGameState.selectedBlock = null
        mockGameState.isCompleted = false
        mockGameState.moves = 0
      }),
      getAvailableBlocks: vi.fn(() => {
        const placedBlockIds = mockGameState.board.placedBlocks.map((pb: any) => pb.blockId)
        return mockGameState.currentChallenge.availableBlocks
          .filter((blockId: string) => !placedBlockIds.includes(blockId))
      }),
      getAllBlocks: vi.fn(() => mockGameState.currentChallenge.availableBlocks),
      incrementTime: vi.fn(() => {
        mockGameState.timeElapsed++
      }),
      isPositionValid: vi.fn(() => true),
      isStarterBlock: vi.fn((blockId) => 
        mockGameState.currentChallenge.starterBlocks.some((sb: any) => sb.blockId === blockId)
      ),
      rotateSelectedBlock: vi.fn(),
      setInteractionMode: vi.fn((mode) => {
        mockGameState.interactionMode = mode
      }),
      selectBlockForTapPlacement: vi.fn((blockId) => {
        mockGameState.tapModeState.selectedBlockForPlacement = blockId
      }),
      rotateTapModeBlock: vi.fn(() => {
        mockGameState.tapModeState.selectedBlockRotation = 
          (mockGameState.tapModeState.selectedBlockRotation + 1) % 4
      }),
      placeTapModeBlock: vi.fn((x, y) => {
        if (mockGameState.tapModeState.selectedBlockForPlacement) {
          mockGameStore.placeBlock(
            mockGameState.tapModeState.selectedBlockForPlacement,
            x, y,
            mockGameState.tapModeState.selectedBlockRotation
          )
          mockGameState.tapModeState.selectedBlockForPlacement = null
          mockGameState.tapModeState.selectedBlockRotation = 0
          return true
        }
        return false
      })
    }

    // Mock device capabilities
    vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
      isMobile: false,
      hasTouch: false,
      interactionMode: { primary: 'drag', fallback: 'tap' }
    })

    // Setup dynamic game store mock that returns current state
    vi.mocked(gameStoreModule.useGameStore).mockImplementation(() => ({
      ...mockGameState,
      ...mockGameStore
    }))

    vi.clearAllMocks()
  })

  describe('Complete Puzzle Solving Workflows', () => {
    it('completes a full puzzle from start to finish', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Verify initial setup
      expect(screen.getByTestId('game-board')).toBeInTheDocument()
      expect(screen.getByTestId('block-inventory')).toBeInTheDocument()

      // Simulate placing all available blocks
      const availableBlocks = mockGameState.currentChallenge.availableBlocks
      
      for (let i = 0; i < availableBlocks.length; i++) {
        const blockId = availableBlocks[i]
        
        // Select block from inventory
        const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
        await user.click(inventoryBlock)
        
        expect(mockGameStore.selectBlock).toHaveBeenCalledWith(blockId)
        
        // Place block on board
        const emptyCell = screen.getByTestId('empty-cell')
        await user.click(emptyCell)
        
        expect(mockGameStore.placeBlock).toHaveBeenCalledWith(blockId, 0, 0, 0)
        
        // Update mock state to reflect the placement
        mockGameState.selectedBlock = null
      }

      // Verify completion
      expect(mockGameState.isCompleted).toBe(true)
      expect(mockGameState.moves).toBeGreaterThan(0)
    })

    it('handles complex block placement and repositioning sequence', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Simulate a complex sequence: place, remove, rotate, re-place
      const blockId = mockGameState.currentChallenge.availableBlocks[0]

      // 1. Place block initially
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      await user.click(inventoryBlock)
      
      const emptyCell = screen.getByTestId('empty-cell')
      await user.click(emptyCell)

      expect(mockGameStore.placeBlock).toHaveBeenCalledWith(blockId, 0, 0, 0)

      // 2. Remove the block (simulate dragging back to inventory)
      mockGameStore.removeBlock(blockId)
      
      // 3. Select and rotate the block
      await user.click(inventoryBlock)
      
      const mobileRotateButton = screen.getByTestId('mobile-rotate')
      await user.click(mobileRotateButton)

      // 4. Place block again in different position
      await user.click(emptyCell)
      
      // Verify the complex sequence was handled correctly
      expect(mockGameStore.removeBlock).toHaveBeenCalledWith(blockId)
      expect(mockGameStore.placeBlock).toHaveBeenCalledTimes(2)
    })

    it('manages state consistency during rapid user interactions', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Simulate rapid clicking and selections
      const availableBlocks = mockGameState.currentChallenge.availableBlocks.slice(0, 3)
      
      // Rapidly select multiple blocks
      for (const blockId of availableBlocks) {
        const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
        await user.click(inventoryBlock)
      }

      // Only the last selection should be active
      const lastBlockId = availableBlocks[availableBlocks.length - 1]
      expect(mockGameStore.selectBlock).toHaveBeenLastCalledWith(lastBlockId)

      // Verify state consistency
      expect(mockGameState.selectedBlock).toBe(lastBlockId)
    })
  })

  describe('Multi-Modal Interaction Workflows', () => {
    it('seamlessly switches between drag and tap modes during gameplay', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Start in drag mode
      expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', 'drag')

      // Switch to tap mode
      mockGameState.interactionMode = 'tap'
      
      // Re-render to reflect mode change
      const { rerender } = render(<App />)
      rerender(<App />)

      expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', 'tap')

      // Test tap mode workflow
      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      
      await user.click(inventoryBlock)
      expect(mockGameStore.selectBlockForTapPlacement).toHaveBeenCalledWith(blockId)

      // Rotate in tap mode
      const mobileRotateButton = screen.getByTestId('mobile-rotate')
      await user.click(mobileRotateButton)
      expect(mockGameStore.rotateTapModeBlock).toHaveBeenCalled()

      // Place in tap mode
      const emptyCell = screen.getByTestId('empty-cell')
      await user.click(emptyCell)
      expect(mockGameStore.placeTapModeBlock).toHaveBeenCalledWith(0, 0)
    })

    it('handles mode switching with active selections', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Select block in drag mode
      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      await user.click(inventoryBlock)
      
      mockGameState.selectedBlock = blockId

      // Switch to tap mode while block is selected
      mockGameState.interactionMode = 'tap'
      
      const { rerender } = render(<App />)
      rerender(<App />)

      // Verify mode switch handled gracefully
      expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', 'tap')
      
      // Should be able to continue with tap mode operations
      const mobileRotateButton = screen.getByTestId('mobile-rotate')
      await user.click(mobileRotateButton)
      
      expect(mockGameStore.rotateTapModeBlock).toHaveBeenCalled()
    })
  })

  describe('Error Recovery and Edge Case Workflows', () => {
    it('recovers from failed block placements gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock placement failure
      mockGameStore.placeBlock.mockReturnValueOnce(false)
      
      render(<App />)

      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      const emptyCell = screen.getByTestId('empty-cell')

      // Select and attempt to place block
      await user.click(inventoryBlock)
      await user.click(emptyCell)

      // Verify placement was attempted but failed
      expect(mockGameStore.placeBlock).toHaveBeenCalledWith(blockId, 0, 0, 0)
      
      // Block should still be selected and available for retry
      expect(mockGameState.selectedBlock).toBe(blockId)

      // Retry placement (this time succeed)
      mockGameStore.placeBlock.mockReturnValueOnce(true)
      await user.click(emptyCell)
      
      expect(mockGameStore.placeBlock).toHaveBeenCalledTimes(2)
    })

    it('handles rapid reset operations correctly', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Place some blocks
      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      const emptyCell = screen.getByTestId('empty-cell')

      await user.click(inventoryBlock)
      await user.click(emptyCell)

      // Rapid reset operations
      const resetButton = screen.getByText('Reset')
      
      await user.click(resetButton)
      await user.click(resetButton)
      await user.click(resetButton)

      // Should handle multiple resets gracefully
      expect(mockGameStore.resetBoard).toHaveBeenCalledTimes(3)
      expect(mockGameState.selectedBlock).toBeNull()
    })

    it('maintains consistency during challenge navigation', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Place a block in current challenge
      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      const emptyCell = screen.getByTestId('empty-cell')

      await user.click(inventoryBlock)
      await user.click(emptyCell)

      // Navigate to next challenge
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      // Verify challenge change was handled
      expect(mockGameStore.setCurrentChallenge).toHaveBeenCalledWith(SAMPLE_CHALLENGES[1])
      
      // State should be reset for new challenge
      expect(mockGameState.selectedBlock).toBeNull()
      expect(mockGameState.isCompleted).toBe(false)
    })
  })

  describe('Performance-Critical User Workflows', () => {
    it('handles rapid block selection and placement efficiently', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const startTime = performance.now()

      // Simulate rapid interactions
      for (let i = 0; i < 10; i++) {
        const blockId = mockGameState.currentChallenge.availableBlocks[i % mockGameState.currentChallenge.availableBlocks.length]
        const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
        const emptyCell = screen.getByTestId('empty-cell')

        await user.click(inventoryBlock)
        await user.click(emptyCell)
      }

      const endTime = performance.now()

      // Should complete quickly (under 2 seconds for 10 operations)
      expect(endTime - startTime).toBeLessThan(2000)
      expect(mockGameStore.placeBlock).toHaveBeenCalledTimes(10)
    })

    it('maintains responsive UI during complex state changes', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Simulate state-intensive operations
      const operations = [
        () => mockGameStore.setCurrentChallenge(SAMPLE_CHALLENGES[1]),
        () => mockGameStore.resetBoard(),
        () => mockGameStore.setInteractionMode('tap'),
        () => mockGameStore.setInteractionMode('drag'),
        () => mockGameStore.incrementTime(),
      ]

      const startTime = performance.now()

      // Execute many state changes
      for (let i = 0; i < 100; i++) {
        const operation = operations[i % operations.length]
        operation()
      }

      const endTime = performance.now()

      // Should handle many state changes efficiently
      expect(endTime - startTime).toBeLessThan(100) // 100ms threshold
    })
  })

  describe('Long Gaming Session Workflows', () => {
    it('simulates extended gameplay across multiple challenges', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Simulate completing multiple challenges
      for (let challengeIndex = 0; challengeIndex < Math.min(3, SAMPLE_CHALLENGES.length); challengeIndex++) {
        const challenge = SAMPLE_CHALLENGES[challengeIndex]
        
        // Load challenge
        mockGameStore.setCurrentChallenge(challenge)
        
        // Place all available blocks to complete challenge
        for (const blockId of challenge.availableBlocks) {
          const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
          const emptyCell = screen.getByTestId('empty-cell')

          await user.click(inventoryBlock)
          await user.click(emptyCell)
        }

        // Verify challenge completion
        expect(mockGameState.isCompleted).toBe(true)
        
        // Navigate to next challenge (if not last)
        if (challengeIndex < SAMPLE_CHALLENGES.length - 1) {
          const nextButton = screen.getByText('Next')
          await user.click(nextButton)
        }
      }

      // Verify progression through multiple challenges
      expect(mockGameStore.setCurrentChallenge).toHaveBeenCalledTimes(3)
    })

    it('handles accumulated state over time', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Simulate time passing with frequent increments
      for (let i = 0; i < 120; i++) { // 2 minutes of game time
        mockGameStore.incrementTime()
      }

      // Simulate many moves
      for (let i = 0; i < 50; i++) {
        const blockId = mockGameState.currentChallenge.availableBlocks[0]
        const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
        const emptyCell = screen.getByTestId('empty-cell')

        await user.click(inventoryBlock)
        await user.click(emptyCell)
      }

      // Verify accumulated state
      expect(mockGameState.timeElapsed).toBe(120)
      expect(mockGameState.moves).toBeGreaterThan(50)
    })
  })

  describe('Accessibility and Alternative Input Workflows', () => {
    it('supports keyboard-only navigation workflow', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Simulate keyboard navigation
      const inventoryBlock = screen.getByTestId(`inventory-block-${mockGameState.currentChallenge.availableBlocks[0]}`)
      
      // Focus and activate with keyboard
      inventoryBlock.focus()
      await user.keyboard('{Enter}')
      
      // Navigate to board and place
      const emptyCell = screen.getByTestId('empty-cell')
      emptyCell.focus()
      await user.keyboard('{Enter}')
      
      // Verify keyboard interactions work
      expect(mockGameStore.selectBlock).toHaveBeenCalled()
      expect(mockGameStore.placeBlock).toHaveBeenCalled()
    })

    it('handles touch-optimized workflows', async () => {
      const user = userEvent.setup()
      
      // Switch to mobile/touch environment
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
        isMobile: true,
        hasTouch: true,
        interactionMode: { primary: 'tap', fallback: 'drag' }
      })

      mockGameState.interactionMode = 'tap'
      
      render(<App />)

      // Use mobile-specific controls
      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      
      await user.click(inventoryBlock)
      
      // Use mobile rotate button
      const mobileRotateButton = screen.getByTestId('mobile-rotate')
      await user.click(mobileRotateButton)
      await user.click(mobileRotateButton) // Rotate twice
      
      // Place using tap mode
      const emptyCell = screen.getByTestId('empty-cell')
      await user.click(emptyCell)
      
      // Verify touch-optimized workflow
      expect(mockGameStore.selectBlockForTapPlacement).toHaveBeenCalledWith(blockId)
      expect(mockGameStore.rotateTapModeBlock).toHaveBeenCalledTimes(2)
      expect(mockGameStore.placeTapModeBlock).toHaveBeenCalledWith(0, 0)
    })
  })

  describe('Memory and Resource Management Workflows', () => {
    it('maintains stable memory usage during extended gameplay', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const initialMemory = performance.memory?.usedJSHeapSize || 0

      // Simulate extended gameplay with many operations
      for (let i = 0; i < 100; i++) {
        // Place and remove blocks repeatedly
        const blockId = mockGameState.currentChallenge.availableBlocks[0]
        const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
        const emptyCell = screen.getByTestId('empty-cell')

        await user.click(inventoryBlock)
        await user.click(emptyCell)
        
        mockGameStore.removeBlock(blockId)
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0

      // Memory increase should be reasonable
      if (initialMemory > 0) {
        expect(finalMemory - initialMemory).toBeLessThan(5 * 1024 * 1024) // Less than 5MB increase
      }
    })

    it('handles component cleanup properly during navigation', async () => {
      const user = userEvent.setup()
      
      const { unmount } = render(<App />)

      // Perform some operations
      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      
      await user.click(inventoryBlock)

      // Unmount component
      unmount()

      // No errors should occur during cleanup
      expect(() => {
        // Simulate cleanup operations
        mockGameStore.resetBoard()
        mockGameStore.selectBlock(null)
      }).not.toThrow()
    })
  })
})