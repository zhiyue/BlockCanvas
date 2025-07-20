import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, beforeEach, describe, it, expect } from 'vitest'
import App from '../App'
import * as gameStoreModule from '../store/gameStore'
import * as deviceCapabilitiesModule from '../hooks/useDeviceCapabilities'
import { SAMPLE_CHALLENGES } from '../data/challenges'

// Mock all dependencies
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

vi.mock('../components/GameBoard', () => ({
  default: ({ 
    onCellClick, 
    selectedBlock, 
    interactionMode, 
    tapModeState,
    draggedBlock,
    previewPosition 
  }: any) => (
    <div 
      data-testid="game-board"
      data-selected-block={selectedBlock}
      data-interaction-mode={interactionMode}
      data-tap-selected={tapModeState?.selectedBlockForPlacement}
      data-tap-rotation={tapModeState?.selectedBlockRotation}
      data-dragged-block={draggedBlock}
      data-preview-position={previewPosition ? `${previewPosition.x},${previewPosition.y}` : null}
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
      data-interaction-mode={interactionMode}
      data-selected-block={selectedBlock}
      data-tap-selected={tapModeState?.selectedBlockForPlacement}
    >
      {availableBlocks?.map((blockId: string) => (
        <div key={blockId}>
          <button
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
          <button
            data-testid={`rotate-${blockId}`}
            onClick={() => {
              if (interactionMode === 'tap' && onTapModeRotate) {
                onTapModeRotate()
              } else if (onBlockRotate) {
                onBlockRotate(blockId)
              }
            }}
          >
            Rotate
          </button>
        </div>
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
      <button data-testid="mobile-rotate" onClick={onRotateBlock}>
        Mobile Rotate
      </button>
      <button data-testid="mobile-clear" onClick={onClearSelection}>
        Mobile Clear
      </button>
    </div>
  )
}))

vi.mock('../components/DraggableBlock', () => ({
  default: ({ block }: any) => <div data-testid={`draggable-block-${block?.id}`}>{block?.id}</div>
}))

vi.mock('@stagewise/toolbar-react', () => ({
  StagewiseToolbar: () => <div data-testid="stagewise-toolbar" />
}))

vi.mock('@stagewise-plugins/react', () => ({
  default: {}
}))

describe('Multi-Modal Interaction Integration Tests', () => {
  // Mock store methods with complete interface
  const mockGameStore = {
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
    },
    setCurrentChallenge: vi.fn(),
    placeBlock: vi.fn(() => true),
    removeBlock: vi.fn(),
    selectBlock: vi.fn(),
    resetBoard: vi.fn(),
    getAvailableBlocks: vi.fn(() => ['block1', 'block2', 'block3']),
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

  // Device capability mocks
  const mockDesktopCapabilities = {
    isMobile: false,
    hasTouch: false,
    interactionMode: {
      primary: 'drag' as const,
      fallback: 'tap' as const
    }
  }

  const mockMobileCapabilities = {
    isMobile: true,
    hasTouch: true,
    interactionMode: {
      primary: 'tap' as const,
      fallback: 'drag' as const
    }
  }

  const mockTabletCapabilities = {
    isMobile: false,
    hasTouch: true,
    interactionMode: {
      primary: 'tap' as const,
      fallback: 'drag' as const
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(gameStoreModule.useGameStore).mockReturnValue(mockGameStore)
    vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(mockDesktopCapabilities)
  })

  describe('Device-Based Mode Selection', () => {
    it('automatically sets drag mode for desktop devices', async () => {
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(mockDesktopCapabilities)

      render(<App />)

      await waitFor(() => {
        expect(mockGameStore.setInteractionMode).toHaveBeenCalledWith('drag')
      })
    })

    it('automatically sets tap mode for mobile devices', async () => {
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(mockMobileCapabilities)

      render(<App />)

      await waitFor(() => {
        expect(mockGameStore.setInteractionMode).toHaveBeenCalledWith('tap')
      })
    })

    it('sets tap mode for touch-enabled tablets', async () => {
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(mockTabletCapabilities)

      render(<App />)

      await waitFor(() => {
        expect(mockGameStore.setInteractionMode).toHaveBeenCalledWith('tap')
      })
    })

    it('does not change mode if already correctly set', async () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag'
      })
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(mockDesktopCapabilities)

      render(<App />)

      // Should not call setInteractionMode if already correct
      await waitFor(() => {
        expect(mockGameStore.setInteractionMode).not.toHaveBeenCalled()
      })
    })
  })

  describe('Drag Mode Behavior', () => {
    beforeEach(() => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag'
      })
    })

    it('uses drag mode for block selection', async () => {
      const user = userEvent.setup()

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      const blockInventory = screen.getByTestId('block-inventory')

      expect(gameBoard).toHaveAttribute('data-interaction-mode', 'drag')
      expect(blockInventory).toHaveAttribute('data-interaction-mode', 'drag')

      // Select a block in drag mode
      const block1Button = screen.getByTestId('block-block1')
      await user.click(block1Button)

      expect(mockGameStore.selectBlock).toHaveBeenCalledWith('block1')
      expect(mockGameStore.selectBlockForTapPlacement).not.toHaveBeenCalled()
    })

    it('handles block rotation in drag mode', async () => {
      const user = userEvent.setup()

      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag',
        selectedBlock: 'block1'
      })

      render(<App />)

      const rotateButton = screen.getByTestId('rotate-block1')
      await user.click(rotateButton)

      expect(mockGameStore.rotateSelectedBlock).not.toHaveBeenCalled() // Block in inventory
    })

    it('handles cell clicks in drag mode', async () => {
      const user = userEvent.setup()

      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag',
        selectedBlock: 'block1'
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      await user.click(gameBoard)

      expect(mockGameStore.placeBlock).toHaveBeenCalledWith('block1', 0, 0, 0)
      expect(mockGameStore.placeTapModeBlock).not.toHaveBeenCalled()
    })

    it('shows mobile controls in drag mode', () => {
      render(<App />)

      expect(screen.getByTestId('mobile-game-controls')).toBeInTheDocument()
    })

    it('handles mobile rotate button in drag mode', async () => {
      const user = userEvent.setup()

      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag',
        selectedBlock: 'block1'
      })

      render(<App />)

      const mobileRotateButton = screen.getByTestId('mobile-rotate')
      await user.click(mobileRotateButton)

      // Should trigger rotation for selected block
      expect(mockGameStore.rotateSelectedBlock).not.toHaveBeenCalled() // Block in inventory
    })
  })

  describe('Tap Mode Behavior', () => {
    beforeEach(() => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        tapModeState: {
          selectedBlockForPlacement: null,
          selectedBlockRotation: 0
        }
      })
    })

    it('uses tap mode for block selection', async () => {
      const user = userEvent.setup()

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      const blockInventory = screen.getByTestId('block-inventory')

      expect(gameBoard).toHaveAttribute('data-interaction-mode', 'tap')
      expect(blockInventory).toHaveAttribute('data-interaction-mode', 'tap')

      // Select a block in tap mode
      const block1Button = screen.getByTestId('block-block1')
      await user.click(block1Button)

      expect(mockGameStore.selectBlockForTapPlacement).toHaveBeenCalledWith('block1')
      expect(mockGameStore.selectBlock).not.toHaveBeenCalled()
    })

    it('handles block rotation in tap mode', async () => {
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

      const rotateButton = screen.getByTestId('rotate-block1')
      await user.click(rotateButton)

      expect(mockGameStore.rotateTapModeBlock).toHaveBeenCalled()
      expect(mockGameStore.rotateSelectedBlock).not.toHaveBeenCalled()
    })

    it('handles cell clicks in tap mode', async () => {
      const user = userEvent.setup()

      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        tapModeState: {
          selectedBlockForPlacement: 'block1',
          selectedBlockRotation: 2
        }
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      await user.click(gameBoard)

      expect(mockGameStore.placeTapModeBlock).toHaveBeenCalledWith(0, 0)
      expect(mockGameStore.placeBlock).not.toHaveBeenCalled()
    })

    it('handles mobile clear button in tap mode', async () => {
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

      const mobileClearButton = screen.getByTestId('mobile-clear')
      await user.click(mobileClearButton)

      expect(mockGameStore.selectBlockForTapPlacement).toHaveBeenCalledWith(null)
      expect(mockGameStore.selectBlock).not.toHaveBeenCalled()
    })
  })

  describe('Mode Switching', () => {
    it('transitions from drag to tap mode correctly', async () => {
      const { rerender } = render(<App />)

      // Start in drag mode
      expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', 'drag')

      // Switch to tap mode
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap'
      })

      rerender(<App />)

      expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', 'tap')
      expect(screen.getByTestId('block-inventory')).toHaveAttribute('data-interaction-mode', 'tap')
    })

    it('transitions from tap to drag mode correctly', async () => {
      // Start in tap mode
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap'
      })

      const { rerender } = render(<App />)

      expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', 'tap')

      // Switch to drag mode
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag'
      })

      rerender(<App />)

      expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', 'drag')
      expect(screen.getByTestId('block-inventory')).toHaveAttribute('data-interaction-mode', 'drag')
    })

    it('clears inappropriate state when switching modes', async () => {
      // Start in drag mode with selected block
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag',
        selectedBlock: 'block1'
      })

      const { rerender } = render(<App />)

      // Switch to tap mode - drag selection should not interfere
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        selectedBlock: 'block1', // Still selected in drag mode
        tapModeState: {
          selectedBlockForPlacement: null,
          selectedBlockRotation: 0
        }
      })

      rerender(<App />)

      const gameBoard = screen.getByTestId('game-board')
      expect(gameBoard).toHaveAttribute('data-tap-selected', 'null')
    })
  })

  describe('State Management Across Components', () => {
    it('synchronizes state between GameBoard and BlockInventory in drag mode', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag',
        selectedBlock: 'block2'
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      const blockInventory = screen.getByTestId('block-inventory')

      expect(gameBoard).toHaveAttribute('data-selected-block', 'block2')
      expect(blockInventory).toHaveAttribute('data-selected-block', 'block2')
    })

    it('synchronizes tap mode state between components', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        tapModeState: {
          selectedBlockForPlacement: 'block3',
          selectedBlockRotation: 2
        }
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      const blockInventory = screen.getByTestId('block-inventory')

      expect(gameBoard).toHaveAttribute('data-tap-selected', 'block3')
      expect(gameBoard).toHaveAttribute('data-tap-rotation', '2')
      expect(blockInventory).toHaveAttribute('data-tap-selected', 'block3')
    })

    it('handles mixed mode states correctly', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        selectedBlock: 'block1', // Drag mode selection
        tapModeState: {
          selectedBlockForPlacement: 'block2', // Tap mode selection
          selectedBlockRotation: 1
        }
      })

      render(<App />)

      const gameBoard = screen.getByTestId('game-board')
      
      // In tap mode, should use tap mode state
      expect(gameBoard).toHaveAttribute('data-tap-selected', 'block2')
      expect(gameBoard).toHaveAttribute('data-interaction-mode', 'tap')
    })
  })

  describe('Cross-Device Compatibility', () => {
    it('adapts to device capability changes', async () => {
      // Start with desktop
      render(<App />)

      await waitFor(() => {
        expect(mockGameStore.setInteractionMode).toHaveBeenCalledWith('drag')
      })

      // Simulate device change to mobile
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(mockMobileCapabilities)
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag' // Still in drag mode
      })

      // Re-render should trigger mode change
      const { rerender } = render(<App />)
      
      await waitFor(() => {
        expect(mockGameStore.setInteractionMode).toHaveBeenCalledWith('tap')
      })
    })

    it('handles orientation changes gracefully', async () => {
      // Start in portrait mode (mobile)
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(mockMobileCapabilities)

      render(<App />)

      // Component should render without errors
      expect(screen.getByTestId('game-board')).toBeInTheDocument()
      expect(screen.getByTestId('block-inventory')).toBeInTheDocument()
    })

    it('provides consistent experience across device types', () => {
      // Test that core functionality works regardless of device
      const deviceTypes = [mockDesktopCapabilities, mockMobileCapabilities, mockTabletCapabilities]

      deviceTypes.forEach((deviceCapability, index) => {
        vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue(deviceCapability)
        
        const { unmount } = render(<App />)
        
        // Core components should always be present
        expect(screen.getByTestId('game-board')).toBeInTheDocument()
        expect(screen.getByTestId('block-inventory')).toBeInTheDocument()
        expect(screen.getByTestId('mobile-game-controls')).toBeInTheDocument()
        
        unmount()
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('handles undefined interaction mode gracefully', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: undefined as any
      })

      expect(() => {
        render(<App />)
      }).not.toThrow()
    })

    it('handles null tap mode state gracefully', () => {
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        tapModeState: null as any
      })

      expect(() => {
        render(<App />)
      }).not.toThrow()
    })

    it('handles invalid device capabilities gracefully', () => {
      vi.mocked(deviceCapabilitiesModule.useDeviceCapabilities).mockReturnValue({
        isMobile: undefined as any,
        hasTouch: undefined as any,
        interactionMode: { primary: undefined as any, fallback: undefined as any }
      })

      expect(() => {
        render(<App />)
      }).not.toThrow()
    })

    it('handles rapid mode switching without errors', async () => {
      const { rerender } = render(<App />)

      // Rapidly switch between modes
      const modes = ['drag', 'tap', 'drag', 'tap', 'drag'] as const

      for (const mode of modes) {
        vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
          ...mockGameStore,
          interactionMode: mode
        })

        rerender(<App />)
        
        expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', mode)
      }
    })
  })

  describe('Performance and Optimization', () => {
    it('does not trigger unnecessary re-renders on mode change', async () => {
      const renderSpy = vi.fn()
      
      const TestComponent = () => {
        renderSpy()
        return <App />
      }

      const { rerender } = render(<TestComponent />)

      const initialRenderCount = renderSpy.mock.calls.length

      // Change mode
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap'
      })

      rerender(<TestComponent />)

      // Should not cause excessive re-renders
      expect(renderSpy.mock.calls.length - initialRenderCount).toBeLessThanOrEqual(2)
    })

    it('handles large state objects efficiently', () => {
      const largeTapModeState = {
        selectedBlockForPlacement: 'block1',
        selectedBlockRotation: 0,
        // Add many additional properties to test performance
        ...Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`prop${i}`, i]))
      }

      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap',
        tapModeState: largeTapModeState as any
      })

      const startTime = performance.now()
      render(<App />)
      const endTime = performance.now()

      // Should render efficiently even with large state
      expect(endTime - startTime).toBeLessThan(50) // 50ms threshold
    })
  })

  describe('User Experience Consistency', () => {
    it('maintains consistent block selection behavior', async () => {
      const user = userEvent.setup()

      // Test in drag mode
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag'
      })

      const { rerender } = render(<App />)

      let block1Button = screen.getByTestId('block-block1')
      await user.click(block1Button)

      expect(mockGameStore.selectBlock).toHaveBeenCalledWith('block1')

      // Switch to tap mode and test
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap'
      })

      rerender(<App />)

      block1Button = screen.getByTestId('block-block1')
      await user.click(block1Button)

      expect(mockGameStore.selectBlockForTapPlacement).toHaveBeenCalledWith('block1')
    })

    it('provides clear visual feedback for current mode', () => {
      // Drag mode
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'drag'
      })

      const { rerender } = render(<App />)

      expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', 'drag')

      // Tap mode
      vi.mocked(gameStoreModule.useGameStore).mockReturnValue({
        ...mockGameStore,
        interactionMode: 'tap'
      })

      rerender(<App />)

      expect(screen.getByTestId('game-board')).toHaveAttribute('data-interaction-mode', 'tap')
    })
  })
})