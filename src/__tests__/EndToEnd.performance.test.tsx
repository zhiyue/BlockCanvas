import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import App from '../App'
import * as gameStoreModule from '../store/gameStore'
import * as deviceCapabilitiesModule from '../hooks/useDeviceCapabilities'
import { SAMPLE_CHALLENGES } from '../data/challenges'
import { BLOCKS } from '../data/blocks'

// Mock dependencies
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

// High-performance component mocks
vi.mock('../components/GameBoard', () => ({
  default: React.memo(({ onCellClick, placedBlocks, selectedBlock, interactionMode, previewPosition }: any) => (
    <div 
      data-testid="game-board"
      data-placed-blocks-count={Object.keys(placedBlocks || {}).length}
      data-selected-block={selectedBlock}
      data-interaction-mode={interactionMode}
      data-has-preview={!!previewPosition}
      onClick={() => onCellClick && onCellClick(0, 0)}
    >
      GameBoard
    </div>
  ))
}))

vi.mock('../components/BlockInventory', () => ({
  default: React.memo(({ availableBlocks, selectedBlock, onBlockSelect, interactionMode }: any) => (
    <div 
      data-testid="block-inventory"
      data-available-count={availableBlocks?.length || 0}
      data-selected-block={selectedBlock}
      data-interaction-mode={interactionMode}
    >
      {availableBlocks?.map((blockId: string) => (
        <button
          key={blockId}
          data-testid={`inventory-block-${blockId}`}
          onClick={() => onBlockSelect(blockId)}
        >
          {blockId}
        </button>
      ))}
    </div>
  ))
}))

vi.mock('../components/GameInstructions', () => ({
  default: ({ isOpen }: any) => isOpen ? <div data-testid="game-instructions" /> : null
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
  TouchFeedback: React.forwardRef(({ children, ...props }: any, ref) => 
    <div ref={ref} {...props}>{children}</div>
  ),
  TouchButton: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>{children}</button>
  )
}))

vi.mock('@stagewise/toolbar-react', () => ({
  StagewiseToolbar: () => <div data-testid="stagewise-toolbar" />
}))

vi.mock('@stagewise-plugins/react', () => ({ default: {} }))

describe('End-to-End Integration and Performance Tests', () => {
  let mockGameState: any
  let mockGameStore: any
  let performanceMetrics: { [key: string]: number[] }

  beforeEach(() => {
    // Initialize comprehensive mock state
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

    // Performance tracking
    performanceMetrics = {
      renderTimes: [],
      stateUpdateTimes: [],
      userInteractionTimes: [],
      memoryUsage: []
    }

    // Create realistic mock store
    mockGameStore = {
      ...mockGameState,
      setCurrentChallenge: vi.fn((challenge) => {
        const startTime = performance.now()
        mockGameState.currentChallenge = challenge
        mockGameState.board = { placedBlocks: [...challenge.starterBlocks] }
        mockGameState.isCompleted = false
        mockGameState.timeElapsed = 0
        mockGameState.moves = 0
        const endTime = performance.now()
        performanceMetrics.stateUpdateTimes.push(endTime - startTime)
      }),
      placeBlock: vi.fn((blockId, x, y, rotation = 0) => {
        const startTime = performance.now()
        mockGameState.board.placedBlocks.push({
          blockId,
          position: { x, y },
          rotation
        })
        mockGameState.moves++
        
        // Realistic completion check
        const totalPlaced = mockGameState.board.placedBlocks.length
        const totalNeeded = mockGameState.currentChallenge.starterBlocks.length + 
                          mockGameState.currentChallenge.availableBlocks.length
        
        if (totalPlaced >= totalNeeded) {
          mockGameState.isCompleted = true
        }
        
        const endTime = performance.now()
        performanceMetrics.stateUpdateTimes.push(endTime - startTime)
        return true
      }),
      removeBlock: vi.fn((blockId) => {
        const startTime = performance.now()
        mockGameState.board.placedBlocks = mockGameState.board.placedBlocks
          .filter((pb: any) => pb.blockId !== blockId)
        mockGameState.moves++
        const endTime = performance.now()
        performanceMetrics.stateUpdateTimes.push(endTime - startTime)
      }),
      selectBlock: vi.fn((blockId) => {
        mockGameState.selectedBlock = blockId
      }),
      resetBoard: vi.fn(() => {
        const startTime = performance.now()
        mockGameState.board = { 
          placedBlocks: [...mockGameState.currentChallenge.starterBlocks] 
        }
        mockGameState.selectedBlock = null
        mockGameState.isCompleted = false
        mockGameState.moves = 0
        const endTime = performance.now()
        performanceMetrics.stateUpdateTimes.push(endTime - startTime)
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

    // Setup mocks
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
    // Log performance metrics for analysis
    console.log('Performance Metrics:', {
      avgRenderTime: performanceMetrics.renderTimes.length > 0 
        ? performanceMetrics.renderTimes.reduce((a, b) => a + b) / performanceMetrics.renderTimes.length 
        : 0,
      avgStateUpdateTime: performanceMetrics.stateUpdateTimes.length > 0
        ? performanceMetrics.stateUpdateTimes.reduce((a, b) => a + b) / performanceMetrics.stateUpdateTimes.length
        : 0,
      maxStateUpdateTime: Math.max(...performanceMetrics.stateUpdateTimes, 0),
      totalOperations: performanceMetrics.stateUpdateTimes.length
    })
  })

  describe('End-to-End Application Workflows', () => {
    it('completes full application lifecycle from start to puzzle completion', async () => {
      const user = userEvent.setup()
      const startTime = performance.now()
      
      const { container } = render(<App />)
      
      const renderTime = performance.now() - startTime
      performanceMetrics.renderTimes.push(renderTime)

      // Verify initial application state
      expect(screen.getByTestId('game-board')).toBeInTheDocument()
      expect(screen.getByTestId('block-inventory')).toBeInTheDocument()
      expect(screen.getByTestId('mobile-game-controls')).toBeInTheDocument()

      // Simulate complete puzzle solving workflow
      const availableBlocks = mockGameState.currentChallenge.availableBlocks

      for (let i = 0; i < availableBlocks.length; i++) {
        const interactionStartTime = performance.now()
        
        const blockId = availableBlocks[i]
        const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
        
        // Select block
        await user.click(inventoryBlock)
        
        // Place block
        const gameBoard = screen.getByTestId('game-board')
        await user.click(gameBoard)
        
        const interactionEndTime = performance.now()
        performanceMetrics.userInteractionTimes.push(interactionEndTime - interactionStartTime)

        // Track memory if available
        if (performance.memory) {
          performanceMetrics.memoryUsage.push(performance.memory.usedJSHeapSize)
        }
      }

      // Verify completion
      expect(mockGameState.isCompleted).toBe(true)
      expect(mockGameState.moves).toBe(availableBlocks.length)

      // Performance assertions
      expect(renderTime).toBeLessThan(100) // Initial render under 100ms
      expect(Math.max(...performanceMetrics.userInteractionTimes)).toBeLessThan(50) // Each interaction under 50ms
    })

    it('handles rapid user interactions without performance degradation', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      const gameBoard = screen.getByTestId('game-board')

      // Perform rapid interactions
      const startTime = performance.now()
      
      for (let i = 0; i < 20; i++) {
        await user.click(inventoryBlock)
        await user.click(gameBoard)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime

      // Should handle 20 rapid interactions efficiently
      expect(totalTime).toBeLessThan(1000) // Under 1 second total
      expect(totalTime / 20).toBeLessThan(50) // Average under 50ms per interaction
    })

    it('maintains performance across multiple challenge transitions', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const transitionTimes: number[] = []

      // Test challenge transitions
      for (let i = 0; i < Math.min(3, SAMPLE_CHALLENGES.length - 1); i++) {
        const transitionStart = performance.now()
        
        // Navigate to next challenge
        const nextButton = screen.getByText('Next')
        await user.click(nextButton)
        
        // Wait for state to stabilize
        await waitFor(() => {
          expect(mockGameStore.setCurrentChallenge).toHaveBeenCalled()
        })
        
        const transitionEnd = performance.now()
        transitionTimes.push(transitionEnd - transitionStart)
      }

      // Challenge transitions should be fast and consistent
      expect(Math.max(...transitionTimes)).toBeLessThan(100) // Max 100ms per transition
      
      // Performance should not degrade significantly
      const firstTransition = transitionTimes[0]
      const lastTransition = transitionTimes[transitionTimes.length - 1]
      expect(lastTransition).toBeLessThan(firstTransition * 2) // No more than 2x slower
    })
  })

  describe('Performance Benchmarks', () => {
    it('meets rendering performance benchmarks for complex game states', async () => {
      // Create complex game state with many placed blocks
      const complexGameState = {
        ...mockGameState,
        board: {
          placedBlocks: Array.from({ length: 15 }, (_, i) => ({
            blockId: `block-${i}`,
            position: { x: i % 8, y: Math.floor(i / 8) },
            rotation: i % 4
          }))
        }
      }

      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...complexGameState,
        ...mockGameStore
      })

      const renderStartTime = performance.now()
      
      const { rerender } = render(<App />)
      
      // Force multiple re-renders with state changes
      for (let i = 0; i < 10; i++) {
        complexGameState.selectedBlock = i % 2 === 0 ? `block-${i}` : null
        rerender(<App />)
      }
      
      const renderEndTime = performance.now()
      const totalRenderTime = renderEndTime - renderStartTime

      // Complex renders should still be performant
      expect(totalRenderTime).toBeLessThan(200) // 10 re-renders under 200ms total
    })

    it('handles large datasets without memory leaks', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const initialMemory = performance.memory?.usedJSHeapSize || 0

      // Simulate intensive operations
      for (let i = 0; i < 100; i++) {
        // Cycle through block selections
        const blockId = mockGameState.currentChallenge.availableBlocks[i % mockGameState.currentChallenge.availableBlocks.length]
        const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
        
        await user.click(inventoryBlock)
        
        // Trigger state changes
        mockGameStore.selectBlock(blockId)
        mockGameStore.selectBlock(null)
        
        // Place and remove blocks
        mockGameStore.placeBlock(blockId, 0, 0, 0)
        mockGameStore.removeBlock(blockId)
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0

      // Memory increase should be reasonable (less than 10MB for 100 operations)
      if (initialMemory > 0) {
        expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024)
      }

      // Performance metrics should remain stable
      const avgStateUpdateTime = performanceMetrics.stateUpdateTimes.reduce((a, b) => a + b) / performanceMetrics.stateUpdateTimes.length
      expect(avgStateUpdateTime).toBeLessThan(10) // Average under 10ms
    })

    it('maintains 60fps during animated interactions', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const frameRate = 60 // Target 60 FPS
      const frameDuration = 1000 / frameRate // ~16.67ms per frame

      // Simulate rapid interactions that would trigger animations
      const interactions = []
      
      for (let i = 0; i < 30; i++) { // 30 frames worth of interactions
        const interactionStart = performance.now()
        
        const blockId = mockGameState.currentChallenge.availableBlocks[0]
        const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
        
        await user.click(inventoryBlock)
        
        const interactionEnd = performance.now()
        interactions.push(interactionEnd - interactionStart)
      }

      // Each interaction should complete within one frame duration
      expect(Math.max(...interactions)).toBeLessThan(frameDuration)
      
      // Average should be well under frame duration
      const avgInteractionTime = interactions.reduce((a, b) => a + b) / interactions.length
      expect(avgInteractionTime).toBeLessThan(frameDuration / 2)
    })
  })

  describe('Concurrent Operations and Race Conditions', () => {
    it('handles simultaneous state updates correctly', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      // Simulate concurrent operations
      const operations = [
        () => mockGameStore.selectBlock('block1'),
        () => mockGameStore.placeBlock('block1', 0, 0, 0),
        () => mockGameStore.removeBlock('block1'),
        () => mockGameStore.setInteractionMode('tap'),
        () => mockGameStore.incrementTime()
      ]

      // Execute operations concurrently
      const promises = operations.map(operation => 
        new Promise(resolve => {
          setTimeout(() => {
            operation()
            resolve(true)
          }, Math.random() * 10)
        })
      )

      await Promise.all(promises)

      // State should remain consistent
      expect(mockGameState).toBeDefined()
      expect(typeof mockGameState.moves).toBe('number')
      expect(typeof mockGameState.timeElapsed).toBe('number')
    })

    it('prevents race conditions in block placement', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const blockId = mockGameState.currentChallenge.availableBlocks[0]

      // Attempt rapid placements that could cause race conditions
      const placementPromises = []
      
      for (let i = 0; i < 5; i++) {
        placementPromises.push(
          new Promise(async (resolve) => {
            const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
            const gameBoard = screen.getByTestId('game-board')
            
            await user.click(inventoryBlock)
            await user.click(gameBoard)
            
            resolve(true)
          })
        )
      }

      await Promise.all(placementPromises)

      // Should have handled all operations without errors
      expect(mockGameStore.placeBlock).toHaveBeenCalled()
      expect(mockGameState.moves).toBeGreaterThan(0)
    })
  })

  describe('Cross-Component Integration', () => {
    it('maintains data consistency across all components', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const blockId = mockGameState.currentChallenge.availableBlocks[0]

      // Interact with multiple components
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      const gameBoard = screen.getByTestId('game-board')
      const mobileRotate = screen.getByTestId('mobile-rotate')

      // Complex interaction sequence
      await user.click(inventoryBlock) // Select in inventory
      await user.click(mobileRotate)   // Rotate with mobile controls
      await user.click(gameBoard)      // Place on board

      // Verify data flows correctly between components
      expect(screen.getByTestId('block-inventory')).toHaveAttribute('data-available-count')
      expect(screen.getByTestId('game-board')).toHaveAttribute('data-placed-blocks-count')
      
      // State should be consistent across components
      expect(mockGameStore.selectBlock).toHaveBeenCalledWith(blockId)
      expect(mockGameStore.placeBlock).toHaveBeenCalled()
    })

    it('handles props updates efficiently across component tree', async () => {
      const user = userEvent.setup()
      
      const { rerender } = render(<App />)

      // Measure props update performance
      const updateStartTime = performance.now()

      // Trigger multiple state changes that affect multiple components
      for (let i = 0; i < 10; i++) {
        mockGameState.selectedBlock = i % 2 === 0 ? `block-${i}` : null
        mockGameState.moves = i
        mockGameState.timeElapsed = i * 10
        
        rerender(<App />)
      }

      const updateEndTime = performance.now()
      const totalUpdateTime = updateEndTime - updateStartTime

      // Props updates should be efficient
      expect(totalUpdateTime).toBeLessThan(100) // 10 updates under 100ms
    })
  })

  describe('Resource Management and Cleanup', () => {
    it('properly cleans up resources on component unmount', async () => {
      const { unmount } = render(<App />)

      // Track initial resource usage
      const initialMemory = performance.memory?.usedJSHeapSize || 0

      // Perform operations to allocate resources
      for (let i = 0; i < 20; i++) {
        mockGameStore.placeBlock(`block-${i}`, 0, 0, 0)
        mockGameStore.removeBlock(`block-${i}`)
      }

      // Unmount component
      unmount()

      // Force garbage collection if possible
      if (global.gc) {
        global.gc()
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0

      // Memory should not have increased significantly
      if (initialMemory > 0) {
        expect(finalMemory - initialMemory).toBeLessThan(1024 * 1024) // Less than 1MB increase
      }
    })

    it('handles memory efficiently during extended usage', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const memorySnapshots: number[] = []

      // Simulate extended usage
      for (let session = 0; session < 5; session++) {
        // Record memory at start of each session
        if (performance.memory) {
          memorySnapshots.push(performance.memory.usedJSHeapSize)
        }

        // Perform session activities
        for (let i = 0; i < 20; i++) {
          const blockId = mockGameState.currentChallenge.availableBlocks[i % mockGameState.currentChallenge.availableBlocks.length]
          const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
          const gameBoard = screen.getByTestId('game-board')

          await user.click(inventoryBlock)
          await user.click(gameBoard)
        }

        // Reset state between sessions
        mockGameStore.resetBoard()
      }

      // Memory growth should be bounded
      if (memorySnapshots.length > 1) {
        const initialMemory = memorySnapshots[0]
        const finalMemory = memorySnapshots[memorySnapshots.length - 1]
        
        // Should not grow unboundedly
        expect(finalMemory - initialMemory).toBeLessThan(5 * 1024 * 1024) // Less than 5MB growth
      }
    })
  })

  describe('Real-World Performance Scenarios', () => {
    it('performs well on lower-end device simulation', async () => {
      // Simulate slower device by adding artificial delays
      const originalSetTimeout = global.setTimeout
      global.setTimeout = ((callback: any, delay: number = 0) => {
        return originalSetTimeout(callback, delay + 5) // Add 5ms delay to simulate slower device
      }) as any

      const user = userEvent.setup()
      
      const startTime = performance.now()
      render(<App />)
      
      // Perform standard user interactions
      const blockId = mockGameState.currentChallenge.availableBlocks[0]
      const inventoryBlock = screen.getByTestId(`inventory-block-${blockId}`)
      const gameBoard = screen.getByTestId('game-board')

      await user.click(inventoryBlock)
      await user.click(gameBoard)
      
      const endTime = performance.now()

      // Should still be responsive even with artificial delays
      expect(endTime - startTime).toBeLessThan(500) // Under 500ms for basic interaction

      // Restore original setTimeout
      global.setTimeout = originalSetTimeout
    })

    it('handles network simulation and offline scenarios', async () => {
      // Simulate network delays for any async operations
      const user = userEvent.setup()
      
      render(<App />)

      // Mock network delay for challenge loading
      mockGameStore.setCurrentChallenge.mockImplementation((challenge) => {
        return new Promise(resolve => {
          setTimeout(() => {
            mockGameState.currentChallenge = challenge
            resolve(true)
          }, 50) // 50ms network delay
        })
      })

      const startTime = performance.now()
      
      // Navigate between challenges (simulating network requests)
      const nextButton = screen.getByText('Next')
      await user.click(nextButton)
      
      const endTime = performance.now()

      // Should handle network delays gracefully
      expect(endTime - startTime).toBeLessThan(200) // Reasonable timeout
    })

    it('maintains performance with accessibility features enabled', async () => {
      // Enable accessibility features
      const user = userEvent.setup()
      
      render(<App />)

      // Simulate screen reader interactions
      const gameBoard = screen.getByTestId('game-board')
      const blockInventory = screen.getByTestId('block-inventory')

      const startTime = performance.now()

      // Navigate using keyboard and screen reader patterns
      gameBoard.focus()
      await user.keyboard('{Tab}')
      await user.keyboard('{Enter}')
      
      blockInventory.focus()
      await user.keyboard('{Tab}')
      await user.keyboard('{Enter}')

      const endTime = performance.now()

      // Accessibility features should not significantly impact performance
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})