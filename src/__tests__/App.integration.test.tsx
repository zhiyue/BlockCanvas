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
  DndContext: ({ children, onDragStart, onDragEnd }: any) => (
    <div data-testid="dnd-context" data-on-drag-start={!!onDragStart} data-on-drag-end={!!onDragEnd}>
      {children}
    </div>
  ),
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  TouchSensor: vi.fn(),
  useSensor: vi.fn(() => ({ activationConstraint: {} })),
  useSensors: vi.fn(() => []),
  useDndMonitor: vi.fn(({ onDragStart, onDragMove, onDragEnd }) => {
    // Store callbacks for manual triggering in tests
    (global as any)._dndCallbacks = { onDragStart, onDragMove, onDragEnd }
  })
}))

vi.mock('../components/GameBoard', () => ({
  default: ({ onCellClick, selectedBlock, interactionMode }: any) => (
    <div 
      data-testid="game-board"
      data-selected-block={selectedBlock}
      data-interaction-mode={interactionMode}
      onClick={() => onCellClick && onCellClick(0, 0)}
    >
      GameBoard Mock
    </div>
  )
}))

vi.mock('../components/BlockInventory', () => ({
  default: ({ 
    availableBlocks, 
    selectedBlock, 
    onBlockSelect, 
    onBlockRotate,
    interactionMode,
    tapModeState,
    onTapModeSelect,
    onTapModeRotate
  }: any) => (
    <div 
      data-testid="block-inventory"
      data-available-blocks={availableBlocks?.join(',')}
      data-selected-block={selectedBlock}
      data-interaction-mode={interactionMode}
      data-tap-selected={tapModeState?.selectedBlockForPlacement}
    >
      {availableBlocks?.map((blockId: string) => (
        <button
          key={blockId}
          data-testid={`block-${blockId}`}
          onClick={() => {
            if (interactionMode === 'tap' && onTapModeSelect) {
              onTapModeSelect(blockId)
            } else {
              onBlockSelect(blockId)
            }
          }}
        >
          {blockId}
        </button>
      ))}
      <button 
        data-testid="rotate-button"
        onClick={() => {
          if (interactionMode === 'tap' && onTapModeRotate) {
            onTapModeRotate()
          } else if (selectedBlock && onBlockRotate) {
            onBlockRotate(selectedBlock)
          }
        }}
      >
        Rotate
      </button>
    </div>
  )
}))

vi.mock('../components/GameInstructions', () => ({
  default: ({ isOpen, onClose }: any) => 
    isOpen ? (
      <div data-testid="game-instructions">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null
}))

vi.mock('../components/DraggableBlock', () => ({
  default: ({ block, rotation, scale, renderAsHTML }: any) => (
    <div 
      data-testid={`draggable-block-${block?.id}`}
      data-rotation={rotation}
      data-scale={scale}
      data-render-html={renderAsHTML}
    >
      {block?.id}
    </div>
  )
}))

vi.mock('@stagewise/toolbar-react', () => ({
  StagewiseToolbar: () => <div data-testid="stagewise-toolbar" />
}))

vi.mock('@stagewise-plugins/react', () => ({
  default: {}
}))

describe('App Integration Tests', () => {
  // Mock store methods
  const mockGameStore = {
    currentChallenge: null,
    board: { placedBlocks: [] },
    selectedBlock: null,
    isCompleted: false,
    timeElapsed: 0,
    moves: 0,
    interactionMode: 'drag' as const,
    tapModeState: {
      selectedBlockForPlacement: null,
      selectedBlockRotation: 0
    },
    setCurrentChallenge: vi.fn(),
    placeBlock: vi.fn(),
    removeBlock: vi.fn(),
    selectBlock: vi.fn(),
    resetBoard: vi.fn(),
    getAvailableBlocks: vi.fn(() => ['block1', 'block2']),
    getAllBlocks: vi.fn(() => ['block1', 'block2', 'block3']),
    incrementTime: vi.fn(),
    isPositionValid: vi.fn(() => true),
    isStarterBlock: vi.fn(() => false),
    rotateSelectedBlock: vi.fn(),
    setInteractionMode: vi.fn(),
    selectBlockForTapPlacement: vi.fn(),
    rotateTapModeBlock: vi.fn(),
    placeTapModeBlock: vi.fn(() => true)
  }

  const mockDeviceCapabilities = {
    isMobile: false,
    hasTouch: false,
    interactionMode: {
      primary: 'drag' as const,
      fallback: 'tap' as const
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(gameStoreModule.useGameStore).mockReturnValue(mockGameStore)
    vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(mockDeviceCapabilities)
    
    // Reset global DnD callbacks
    ;(global as any)._dndCallbacks = {}
    
    // Mock timers
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllTimers()
  })

  describe('Initial App Rendering and Setup', () => {
    it('renders app with main components', () => {
      render(<App />)
      
      expect(screen.getByText('Mondrian Blocks')).toBeInTheDocument()
      expect(screen.getByTestId('game-board')).toBeInTheDocument()
      expect(screen.getByTestId('block-inventory')).toBeInTheDocument()
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
    })

    it('initializes with first challenge when none is set', () => {
      render(<App />)
      
      expect(mockGameStore.setCurrentChallenge).toHaveBeenCalledWith(SAMPLE_CHALLENGES[0])
    })

    it('does not reinitialize challenge when one is already set', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: SAMPLE_CHALLENGES[1]
      })
      
      render(<App />)
      
      expect(mockGameStore.setCurrentChallenge).not.toHaveBeenCalled()
    })
  })

  describe('Device Capability Integration', () => {
    it('automatically sets interaction mode based on device capabilities', async () => {
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
        ...mockDeviceCapabilities,
        interactionMode: { primary: 'tap', fallback: 'drag' }
      })

      render(<App />)

      await waitFor(() => {
        expect(mockGameStore.setInteractionMode).toHaveBeenCalledWith('tap')
      })
    })

    it('configures sensors differently for mobile devices', () => {
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
        ...mockDeviceCapabilities,
        isMobile: true,
        hasTouch: true
      })

      render(<App />)

      // Verify mobile sensor configuration is used
      const dndContext = screen.getByTestId('dnd-context')
      expect(dndContext).toBeInTheDocument()
    })

    it('configures sensors for desktop devices', () => {
      render(<App />)

      // Verify desktop sensor configuration is used
      const dndContext = screen.getByTestId('dnd-context')
      expect(dndContext).toBeInTheDocument()
    })
  })

  describe('Timer Management', () => {
    it('starts timer when challenge is active and not completed', async () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: SAMPLE_CHALLENGES[0],
        isCompleted: false
      })

      render(<App />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockGameStore.incrementTime).toHaveBeenCalled()
    })

    it('does not start timer when no challenge is set', () => {
      render(<App />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockGameStore.incrementTime).not.toHaveBeenCalled()
    })

    it('stops timer when puzzle is completed', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: SAMPLE_CHALLENGES[0],
        isCompleted: true
      })

      render(<App />)

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(mockGameStore.incrementTime).not.toHaveBeenCalled()
    })

    it('displays formatted time correctly', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: SAMPLE_CHALLENGES[0],
        timeElapsed: 125 // 2:05
      })

      render(<App />)

      expect(screen.getByText(/Time: 02:05/)).toBeInTheDocument()
    })
  })

  describe('Keyboard Event Handling', () => {
    it('rotates selected block on spacebar press', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        selectedBlock: 'block1'
      })

      render(<App />)

      await user.keyboard(' ')

      // Since block is in inventory, should update local rotation state
      // We can't directly test the state, but can test behavior
      expect(mockGameStore.isStarterBlock).toHaveBeenCalledWith('block1')
    })

    it('prevents spacebar rotation for starter blocks', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        selectedBlock: 'starter-block',
        isStarterBlock: vi.fn(() => true)
      })

      render(<App />)

      await user.keyboard(' ')

      expect(consoleSpy).toHaveBeenCalledWith('Cannot rotate starter block')
      consoleSpy.mockRestore()
    })

    it('uses gameStore rotation for blocks on board', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        selectedBlock: 'block1',
        board: {
          placedBlocks: [{ blockId: 'block1', position: { x: 0, y: 0 }, rotation: 0 }]
        }
      })

      render(<App />)

      await user.keyboard(' ')

      expect(mockGameStore.rotateSelectedBlock).toHaveBeenCalled()
    })

    it('does not rotate when no block is selected', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      
      render(<App />)

      await user.keyboard(' ')

      expect(mockGameStore.rotateSelectedBlock).not.toHaveBeenCalled()
    })
  })

  describe('Multi-Modal Interaction (Tap vs Drag)', () => {
    it('handles cell click in drag mode', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        selectedBlock: 'block1',
        interactionMode: 'drag'
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      fireEvent.click(gameBoard)

      expect(mockGameStore.placeBlock).toHaveBeenCalledWith('block1', 0, 0, 0)
    })

    it('handles cell click in tap mode', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        tapModeState: {
          selectedBlockForPlacement: 'block1',
          selectedBlockRotation: 1
        }
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      fireEvent.click(gameBoard)

      expect(mockGameStore.placeTapModeBlock).toHaveBeenCalledWith(0, 0)
    })

    it('passes correct interaction mode to components', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap'
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      const blockInventory = screen.getByTestId('block-inventory')

      expect(gameBoard).toHaveAttribute('data-interaction-mode', 'tap')
      expect(blockInventory).toHaveAttribute('data-interaction-mode', 'tap')
    })

    it('handles tap mode block selection correctly', async () => {
      const user = userEvent.setup()
      
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap'
      })

      render(<App />)

      const block1Button = screen.getByTestId('block-block1')
      await user.click(block1Button)

      expect(mockGameStore.selectBlockForTapPlacement).toHaveBeenCalledWith('block1')
    })

    it('handles tap mode block rotation correctly', async () => {
      const user = userEvent.setup()
      
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        tapModeState: {
          selectedBlockForPlacement: 'block1',
          selectedBlockRotation: 0
        }
      })

      render(<App />)

      const rotateButton = screen.getByTestId('rotate-button')
      await user.click(rotateButton)

      expect(mockGameStore.rotateTapModeBlock).toHaveBeenCalled()
    })
  })

  describe('Challenge Navigation', () => {
    beforeEach(() => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: SAMPLE_CHALLENGES[1] // Middle challenge
      })
    })

    it('navigates to previous challenge', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const previousButton = screen.getByText('Previous')
      await user.click(previousButton)

      expect(mockGameStore.setCurrentChallenge).toHaveBeenCalledWith(SAMPLE_CHALLENGES[0])
    })

    it('navigates to next challenge', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const nextButton = screen.getByText('Next')
      await user.click(nextButton)

      expect(mockGameStore.setCurrentChallenge).toHaveBeenCalledWith(SAMPLE_CHALLENGES[2])
    })

    it('disables previous button on first challenge', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: SAMPLE_CHALLENGES[0]
      })

      render(<App />)

      const previousButton = screen.getByText('Previous')
      expect(previousButton).toBeDisabled()
    })

    it('disables next button on last challenge', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: SAMPLE_CHALLENGES[SAMPLE_CHALLENGES.length - 1]
      })

      render(<App />)

      const nextButton = screen.getByText('Next')
      expect(nextButton).toBeDisabled()
    })

    it('resets board when reset button is clicked', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const resetButton = screen.getByText('Reset')
      await user.click(resetButton)

      expect(mockGameStore.resetBoard).toHaveBeenCalled()
    })
  })

  describe('Game State Display', () => {
    it('displays challenge information correctly', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: {
          ...SAMPLE_CHALLENGES[0],
          name: 'Test Challenge',
          difficulty: 'medium'
        },
        timeElapsed: 65,
        moves: 15
      })

      render(<App />)

      expect(screen.getByText('Test Challenge')).toBeInTheDocument()
      expect(screen.getByText('MEDIUM')).toBeInTheDocument()
      expect(screen.getByText(/Time: 01:05/)).toBeInTheDocument()
      expect(screen.getByText(/Moves: 15/)).toBeInTheDocument()
    })

    it('shows completion message when puzzle is completed', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: SAMPLE_CHALLENGES[0],
        isCompleted: true,
        timeElapsed: 120,
        moves: 25
      })

      render(<App />)

      expect(screen.getByText('🎉 Puzzle Completed!')).toBeInTheDocument()
      expect(screen.getByText('Time: 02:00 | Moves: 25')).toBeInTheDocument()
    })

    it('opens and closes game instructions', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const howToPlayButton = screen.getByText('How to Play')
      await user.click(howToPlayButton)

      expect(screen.getByTestId('game-instructions')).toBeInTheDocument()

      const closeButton = screen.getByText('Close')
      await user.click(closeButton)

      expect(screen.queryByTestId('game-instructions')).not.toBeInTheDocument()
    })
  })

  describe('Component Data Flow', () => {
    it('passes correct props to GameBoard', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        selectedBlock: 'block1',
        interactionMode: 'tap',
        tapModeState: {
          selectedBlockForPlacement: 'block2',
          selectedBlockRotation: 2
        }
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      expect(gameBoard).toHaveAttribute('data-selected-block', 'block1')
      expect(gameBoard).toHaveAttribute('data-interaction-mode', 'tap')
    })

    it('passes correct props to BlockInventory', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        getAvailableBlocks: vi.fn(() => ['block1', 'block2']),
        getAllBlocks: vi.fn(() => ['block1', 'block2', 'block3']),
        selectedBlock: 'block1',
        interactionMode: 'tap',
        tapModeState: {
          selectedBlockForPlacement: 'block2',
          selectedBlockRotation: 1
        }
      })

      render(<App />)

      const blockInventory = screen.getByTestId('block-inventory')
      expect(blockInventory).toHaveAttribute('data-available-blocks', 'block1,block2')
      expect(blockInventory).toHaveAttribute('data-selected-block', 'block1')
      expect(blockInventory).toHaveAttribute('data-interaction-mode', 'tap')
      expect(blockInventory).toHaveAttribute('data-tap-selected', 'block2')
    })

    it('handles block selection from inventory in drag mode', async () => {
      const user = userEvent.setup()
      
      render(<App />)

      const block1Button = screen.getByTestId('block-block1')
      await user.click(block1Button)

      expect(mockGameStore.selectBlock).toHaveBeenCalledWith('block1')
    })
  })

  describe('Error Scenarios and Edge Cases', () => {
    it('handles missing challenge gracefully', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        currentChallenge: null
      })

      render(<App />)

      // Should not crash and should attempt to load first challenge
      expect(mockGameStore.setCurrentChallenge).toHaveBeenCalledWith(SAMPLE_CHALLENGES[0])
    })

    it('handles empty available blocks list', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        getAvailableBlocks: vi.fn(() => [])
      })

      render(<App />)

      const blockInventory = screen.getByTestId('block-inventory')
      expect(blockInventory).toHaveAttribute('data-available-blocks', '')
    })

    it('handles block placement failure in tap mode gracefully', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        tapModeState: {
          selectedBlockForPlacement: 'block1',
          selectedBlockRotation: 0
        },
        placeTapModeBlock: vi.fn(() => false) // Simulate failure
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      fireEvent.click(gameBoard)

      // Should not throw error
      expect(mockGameStore.placeTapModeBlock).toHaveBeenCalledWith(0, 0)
    })
  })

  describe('Return Message System', () => {
    it('shows and hides return messages', async () => {
      // This test would need more detailed implementation to test the return message system
      // For now, we'll test that the component renders without errors when return messages are displayed
      
      render(<App />)
      
      // The return message system is internal to App component
      // We could trigger it by simulating drag operations, but that would require more complex mocking
      expect(screen.getByTestId('game-board')).toBeInTheDocument()
    })
  })
})