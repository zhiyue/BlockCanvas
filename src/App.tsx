import React, { useEffect, useState } from 'react'
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, useDndMonitor } from '@dnd-kit/core'
import GameBoard from './components/GameBoard'
import BlockInventory from './components/BlockInventory'
import GameInstructions from './components/GameInstructions'
import DraggableBlock from './components/DraggableBlock'
import MobileGameControls from './components/MobileGameControls'
import SolverChallengeInfo from './components/SolverChallengeInfo'
import { TouchButton } from './components/TouchFeedback'
import { BlockRotationHint } from './components/SwipeIndicator'
import { CoordinateSystemProvider, useCoordinateSystemDeviceCapabilities, useOptimizedCoordinateConverter } from './contexts/CoordinateSystemContext'
import { useGameStore } from './store/gameStore'
import { SAMPLE_CHALLENGES } from './data/challenges'
import { getBlockById } from './data/blocks'
import { BOARD_SIZE, CELL_SIZE } from './types/game'
import { useDeviceCapabilities } from './hooks/useDeviceCapabilities'
import { StagewiseToolbar } from '@stagewise/toolbar-react'
import ReactPlugin from '@stagewise-plugins/react'
import './App.css'

// Internal component that uses coordinate system context
function GameApp() {
  const {
    currentChallenge,
    board,
    selectedBlock,
    isCompleted,
    timeElapsed,
    moves,
    interactionMode: gameInteractionMode,
    tapModeState,
    setCurrentChallenge,
    placeBlock,
    removeBlock,
    selectBlock,
    resetBoard,
    getAvailableBlocks,
    getAllBlocks,
    incrementTime,
    isPositionValid,
    isStarterBlock,
    rotateSelectedBlock,
    setInteractionMode,
    selectBlockForTapPlacement,
    rotateTapModeBlock,
    placeTapModeBlock
  } = useGameStore()

  const { isMobile, hasTouch, interactionMode } = useDeviceCapabilities()

  // Use coordinate system context
  const { responsiveCellSize, coordinateSystem: responsiveCoordinateSystem } = useCoordinateSystemDeviceCapabilities()
  const { canvasToGrid } = useOptimizedCoordinateConverter()



  // Auto-set interaction mode based on device capabilities
  useEffect(() => {
    const preferredMode = interactionMode.primary
    if (gameInteractionMode !== preferredMode) {
      setInteractionMode(preferredMode)
    }
  }, [interactionMode.primary, gameInteractionMode, setInteractionMode])

  // Timer effect
  useEffect(() => {
    if (currentChallenge && !isCompleted) {
      const timer = setInterval(() => {
        incrementTime()
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [currentChallenge, isCompleted, incrementTime])

  // Initialize with first challenge on mount
  useEffect(() => {
    // Always load the first challenge if no challenge is currently set
    // This ensures that when the app first loads, it shows a challenge
    if (!currentChallenge && SAMPLE_CHALLENGES.length > 0) {
      setCurrentChallenge(SAMPLE_CHALLENGES[0])
    }
  }, [currentChallenge, setCurrentChallenge])

  // 键盘事件监听器
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // 空格键旋转选中的 block
      if (event.code === 'Space' && selectedBlock) {
        event.preventDefault() // 防止页面滚动

        // 检查是否是 starter block
        if (isStarterBlock(selectedBlock)) {
          console.log('Cannot rotate starter block')
          return
        }

        handleBlockRotate(selectedBlock)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedBlock, isStarterBlock])

  const [blockRotations, setBlockRotations] = React.useState<{[key: string]: number}>({})
  const [showInstructions, setShowInstructions] = React.useState(false)
  const [showSwipeHint, setShowSwipeHint] = React.useState(true)
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null)
  const [draggedFromBoard, setDraggedFromBoard] = useState(false)
  const [originalPosition, setOriginalPosition] = useState<{x: number, y: number, rotation: number} | null>(null)
  const [lastMousePosition, setLastMousePosition] = useState<{x: number, y: number} | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{x: number, y: number} | null>(null)
  const [dragStartOffset, setDragStartOffset] = useState<{x: number, y: number} | null>(null)
  const [returnMessage, setReturnMessage] = useState<string | null>(null)

  // 显示返回消息的函数
  const showReturnMessage = (message: string) => {
    setReturnMessage(message)
    setTimeout(() => setReturnMessage(null), 2000) // 2秒后自动消失
  }

  // DragMonitor component using useDndMonitor
  const DragMonitor: React.FC = () => {
    useDndMonitor({
      onDragStart() {
        // This is handled by handleDragStart
      },
      onDragMove(event) {
        if (!draggedBlock || !dragStartOffset) return

        const { over, delta, activatorEvent } = event

        // Update mouse position for drag end
        if (activatorEvent && 'clientX' in activatorEvent && 'clientY' in activatorEvent) {
          const mouseEvent = activatorEvent as MouseEvent
          setLastMousePosition({
            x: mouseEvent.clientX + delta.x,
            y: mouseEvent.clientY + delta.y
          })
        }

        if (over && over.id === 'game-board') {
          // Get the game board overlay element
          const gameBoardOverlay = document.querySelector('.game-board-container [style*="position: absolute"]') as HTMLElement
          if (gameBoardOverlay && activatorEvent && 'clientX' in activatorEvent && 'clientY' in activatorEvent) {
            const rect = gameBoardOverlay.getBoundingClientRect()
            const mouseEvent = activatorEvent as MouseEvent

            // Calculate current mouse position with delta
            const currentMouseX = mouseEvent.clientX + delta.x
            const currentMouseY = mouseEvent.clientY + delta.y

            // Calculate where the block's top-left corner would be (using offset)
            const blockTopLeftX = currentMouseX - dragStartOffset.x - rect.left
            const blockTopLeftY = currentMouseY - dragStartOffset.y - rect.top

            const { x: gridX, y: gridY } = responsiveCoordinateSystem.canvasToGrid(blockTopLeftX, blockTopLeftY)

            // Only set preview if within bounds and position is valid
            if (gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE) {
              const rotation = blockRotations[draggedBlock] || 0
              // 在检查预览位置时，忽略当前被拖拽的 block
              if (isPositionValid(draggedBlock, gridX, gridY, rotation, draggedBlock)) {
                setPreviewPosition({ x: gridX, y: gridY })
                return
              }
            }
          }
        }

        // Clear preview if not over valid area
        setPreviewPosition(null)
      },
      onDragEnd() {
        // This is handled by handleDragEnd
      }
    })

    return null
  }
  
  // Optimized sensor configuration based on device capabilities
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: isMobile || hasTouch ? {
        // Mobile/touch device configuration
        distance: 5,
        delay: 150,
        tolerance: 5,
      } : {
        // Desktop configuration - optimized for mouse
        distance: 8,
      },
    }),
    // TouchSensor for better touch support on mobile
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
      // Only enable TouchSensor on touch devices
      disabled: !hasTouch
    })
  )

  const handleCellClick = (x: number, y: number) => {
    if (gameInteractionMode === 'tap') {
      // Tap mode: use tap placement system
      if (tapModeState.selectedBlockForPlacement) {
        const success = placeTapModeBlock(x, y)
        if (success) {
          // Block is automatically cleared from tapModeState in the store
        }
      }
    } else {
      // Drag mode: use legacy system
      if (selectedBlock) {
        const rotation = blockRotations[selectedBlock] || 0
        const success = placeBlock(selectedBlock, x, y, rotation)
        if (success) {
          selectBlock(null)
          // Reset rotation for this block after placing
          setBlockRotations(prev => ({
            ...prev,
            [selectedBlock]: 0
          }))
        }
      }
    }
  }

  const handleBlockPlace = (blockId: string, x: number, y: number): boolean => {
    const rotation = blockRotations[blockId] || 0
    return placeBlock(blockId, x, y, rotation)
  }

  const handleBlockRotate = (blockId: string) => {
    // 检查 block 是否在棋盘上
    const isOnBoard = board.placedBlocks.some(pb => pb.blockId === blockId)

    if (isOnBoard) {
      // 如果在棋盘上，使用 gameStore 的旋转方法
      rotateSelectedBlock()
    } else {
      // 如果在 inventory 中，更新本地旋转状态
      setBlockRotations(prev => ({
        ...prev,
        [blockId]: ((prev[blockId] || 0) + 1) % 4
      }))
    }
  }

  const getPlacedBlocksForDisplay = () => {
    const placedBlocksDisplay: { [key: string]: { position: { x: number; y: number }; color: string; pattern: boolean[][]; rotation: number } } = {}
    
    board.placedBlocks.forEach(placedBlock => {
      const block = getBlockById(placedBlock.blockId)
      if (block) {
        // Apply rotation to pattern
        let pattern = block.pattern
        for (let i = 0; i < placedBlock.rotation; i++) {
          const rows = pattern.length
          const cols = pattern[0].length
          const rotated: boolean[][] = Array(cols).fill(null).map(() => Array(rows).fill(false))
          
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              rotated[c][rows - 1 - r] = pattern[r][c]
            }
          }
          pattern = rotated
        }
        
        placedBlocksDisplay[placedBlock.blockId] = {
          position: placedBlock.position,
          color: block.color,
          pattern: pattern,
          rotation: placedBlock.rotation
        }
      }
    })
    
    return placedBlocksDisplay
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const loadChallenge = (challengeIndex: number) => {
    if (challengeIndex >= 0 && challengeIndex < SAMPLE_CHALLENGES.length) {
      setCurrentChallenge(SAMPLE_CHALLENGES[challengeIndex])
    }
  }

  const getCurrentChallengeIndex = () => {
    return SAMPLE_CHALLENGES.findIndex(c => c.id === currentChallenge?.id)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const blockId = event.active.id as string

    // 检查是否是 starter block，如果是则阻止拖拽
    if (isStarterBlock(blockId)) {
      console.log(`Cannot drag starter block: ${blockId}`)
      return
    }

    setDraggedBlock(blockId)

    // Calculate offset between mouse and block's top-left corner
    const { activatorEvent } = event
    if (activatorEvent && 'clientX' in activatorEvent && 'clientY' in activatorEvent) {
      const mouseEvent = activatorEvent as MouseEvent

      // Find the draggable element
      const draggableElement = (mouseEvent.target as HTMLElement).closest('[data-dnd-kit-draggable]') as HTMLElement
      if (draggableElement) {
        const rect = draggableElement.getBoundingClientRect()
        const offsetX = mouseEvent.clientX - rect.left
        const offsetY = mouseEvent.clientY - rect.top
        setDragStartOffset({ x: offsetX, y: offsetY })
      }
    }

    // Check if dragging from board (already placed block)
    const isOnBoard = board.placedBlocks.some(pb => pb.blockId === blockId)
    setDraggedFromBoard(isOnBoard)

    // If dragging from board, store original position but DON'T remove it yet
    if (isOnBoard) {
      const placedBlock = board.placedBlocks.find(pb => pb.blockId === blockId)
      if (placedBlock) {
        setOriginalPosition({
          x: placedBlock.position.x,
          y: placedBlock.position.y,
          rotation: placedBlock.rotation
        })
      }
      // 不在这里移除 block，避免影响 availableBlocks 列表
    } else {
      setOriginalPosition(null)
    }

    selectBlock(blockId)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && draggedBlock) {
      const blockId = active.id as string

      if (over.id === 'game-board') {
        const rotation = blockRotations[blockId] || 0

        // Use preview position if available (calculated by DragMonitor)
        if (previewPosition) {
          // If dragging from board, remove the original block first
          if (draggedFromBoard) {
            removeBlock(blockId)
          }

          const success = placeBlock(blockId, previewPosition.x, previewPosition.y, rotation)

          if (success) {
            // Reset rotation for this block after placing
            setBlockRotations(prev => ({
              ...prev,
              [blockId]: 0
            }))
          } else if (draggedFromBoard) {
            // If placement failed and was dragged from board, return to inventory
            console.log(`Block ${blockId} automatically returned to inventory (placement failed)`)
            showReturnMessage('Block returned to available blocks')
            // Reset rotation when returning to inventory
            setBlockRotations(prev => ({
              ...prev,
              [blockId]: 0
            }))
          }
        } else if (lastMousePosition && dragStartOffset) {
          // Fallback: use mouse position with block's top-left corner calculation
          const gameBoardOverlay = document.querySelector('.game-board-container [style*="position: absolute"]') as HTMLElement
          if (gameBoardOverlay) {
            const rect = gameBoardOverlay.getBoundingClientRect()

            // Calculate where the block's top-left corner would be
            const blockTopLeftX = lastMousePosition.x - dragStartOffset.x - rect.left
            const blockTopLeftY = lastMousePosition.y - dragStartOffset.y - rect.top

            const { x: gridX, y: gridY } = responsiveCoordinateSystem.canvasToGrid(blockTopLeftX, blockTopLeftY)

            if (gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE) {
              // If dragging from board, remove the original block first
              if (draggedFromBoard) {
                removeBlock(blockId)
              }

              const success = placeBlock(blockId, gridX, gridY, rotation)
              if (success) {
                setBlockRotations(prev => ({ ...prev, [blockId]: 0 }))
              } else if (draggedFromBoard) {
                // If placement failed and was dragged from board, return to inventory
                console.log(`Block ${blockId} automatically returned to inventory (fallback placement failed)`)
                showReturnMessage('Block returned to available blocks')
                setBlockRotations(prev => ({ ...prev, [blockId]: 0 }))
              }
            } else if (draggedFromBoard) {
              // If dropped outside board bounds and was from board, return to inventory
              removeBlock(blockId)
              console.log(`Block ${blockId} automatically returned to inventory (dropped outside board)`)
              showReturnMessage('Block returned to available blocks')
              setBlockRotations(prev => ({ ...prev, [blockId]: 0 }))
            }
          }
        }
      } else if (over.id === 'block-inventory') {
        // If dropped on inventory, remove from board (return to available blocks)
        if (draggedFromBoard) {
          removeBlock(blockId)
          console.log(`Block ${blockId} returned to inventory`)
        }
        // Reset rotation when returning to inventory
        setBlockRotations(prev => ({
          ...prev,
          [blockId]: 0
        }))
      } else {
        // If dropped outside valid drop zones, return to inventory
        if (draggedFromBoard) {
          // Remove from board and return to inventory
          removeBlock(blockId)
          console.log(`Block ${blockId} automatically returned to inventory (dropped outside valid area)`)
          showReturnMessage('Block returned to available blocks')
        }
        // Reset rotation when returning to inventory
        setBlockRotations(prev => ({
          ...prev,
          [blockId]: 0
        }))
      }
    } else if (draggedFromBoard && draggedBlock) {
      // If dropped in invalid area and was from board, return to inventory
      removeBlock(draggedBlock)
      console.log(`Block ${draggedBlock} automatically returned to inventory (no drop target)`)
      showReturnMessage('Block returned to available blocks')
      // Reset rotation when returning to inventory
      setBlockRotations(prev => ({
        ...prev,
        [draggedBlock]: 0
      }))
    }

    // Clean up drag state
    setDraggedBlock(null)
    setDraggedFromBoard(false)
    setOriginalPosition(null)
    setLastMousePosition(null)
    setPreviewPosition(null)
    setDragStartOffset(null)
    selectBlock(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <DragMonitor />
      <div className="app">
        <header className="app-header">
          <h1>Mondrian Blocks</h1>
          <p>A colorful logic puzzle game</p>
        </header>
        
        <main className="app-main">
          <div className="game-container">
            <div className="game-info">
              <div className="challenge-info">
                <h2>{currentChallenge?.name}</h2>
                <div className="challenge-meta">
                  <span className={`difficulty difficulty-${currentChallenge?.difficulty}`}>
                    {currentChallenge?.difficulty?.toUpperCase()}
                  </span>
                  <span className="stats">
                    Time: {formatTime(timeElapsed)} | Moves: {moves}
                  </span>
                </div>
              </div>

              <div className="game-controls">
                <TouchButton
                  onClick={() => setShowInstructions(true)}
                  className="btn btn-primary"
                  enableHaptic={true}
                  enableRipple={true}
                >
                  How to Play
                </TouchButton>
                <TouchButton
                  onClick={() => loadChallenge(getCurrentChallengeIndex() - 1)}
                  disabled={getCurrentChallengeIndex() <= 0}
                  className="btn btn-secondary"
                  enableHaptic={true}
                  enableRipple={true}
                >
                  Previous
                </TouchButton>
                <TouchButton
                  onClick={resetBoard}
                  className="btn btn-warning"
                  enableHaptic={true}
                  enableRipple={true}
                >
                  Reset
                </TouchButton>
                <TouchButton
                  onClick={() => loadChallenge(getCurrentChallengeIndex() + 1)}
                  disabled={getCurrentChallengeIndex() >= SAMPLE_CHALLENGES.length - 1}
                  className="btn btn-secondary"
                  enableHaptic={true}
                  enableRipple={true}
                >
                  Next
                </TouchButton>
              </div>

              {isCompleted && (
                <div className="completion-message">
                  <h3>🎉 Puzzle Completed!</h3>
                  <p>Time: {formatTime(timeElapsed)} | Moves: {moves}</p>
                </div>
              )}

              {/* 桌面端显示求解器挑战信息 */}
              {currentChallenge && (
                <div className="solver-info-desktop">
                  <SolverChallengeInfo challengeId={currentChallenge.id} />
                </div>
              )}
            </div>
            
            <div className="game-area">
              <GameBoard
                placedBlocks={getPlacedBlocksForDisplay()}
                onCellClick={handleCellClick}
                selectedBlock={selectedBlock}
                onBlockSelect={selectBlock}
                draggedBlock={draggedBlock}
                blockRotations={blockRotations}
                previewPosition={previewPosition}
                interactionMode={gameInteractionMode}
                tapModeState={tapModeState}
              />
              
              <BlockInventory
                availableBlocks={getAvailableBlocks()}
                allBlocks={getAllBlocks()}
                selectedBlock={selectedBlock}
                onBlockSelect={selectBlock}
                onBlockPlace={handleBlockPlace}
                blockRotations={blockRotations}
                onBlockRotate={handleBlockRotate}
                interactionMode={gameInteractionMode}
                tapModeState={tapModeState}
                onTapModeSelect={selectBlockForTapPlacement}
                onTapModeRotate={rotateTapModeBlock}
                responsiveCellSize={responsiveCellSize}
              />

              {/* 移动端显示求解器挑战信息 - 在积木选择区域下面 */}
              {currentChallenge && (
                <div className="solver-info-mobile">
                  <SolverChallengeInfo challengeId={currentChallenge.id} />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* 返回消息提示 */}
        {returnMessage && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            zIndex: 10000,
            fontSize: '14px',
            fontWeight: '500',
            animation: 'slideInRight 0.3s ease-out'
          }}>
            {returnMessage}
          </div>
        )}

        <GameInstructions
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
        />

        <MobileGameControls
          onRotateBlock={() => {
            if (selectedBlock) {
              handleBlockRotate(selectedBlock);
            }
          }}
          onSwitchMode={() => {
            const newMode = gameInteractionMode === 'tap' ? 'drag' : 'tap';
            setInteractionMode(newMode);
          }}
          onClearSelection={() => {
            if (gameInteractionMode === 'tap') {
              selectBlockForTapPlacement(null);
            } else {
              selectBlock(null);
            }
          }}
        />
      </div>
      
      <DragOverlay
        style={{
          zIndex: 9999,
          pointerEvents: 'none'
        }}
        dropAnimation={null}
      >
        {draggedBlock ? (
          <div style={{
            opacity: previewPosition ? 0.3 : 0.9,
            filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))',
            transition: 'opacity 0.1s ease-out'
          }}>
            <DraggableBlock
              block={getBlockById(draggedBlock)!}
              rotation={blockRotations[draggedBlock] || 0}
              scale={1.0}
              renderAsHTML={true}
              cellSize={responsiveCellSize}
            />
          </div>
        ) : null}
      </DragOverlay>
      
      {/* Swipe rotation hint for mobile users */}
      {hasTouch && gameInteractionMode === 'tap' && (
        <BlockRotationHint 
          visible={showSwipeHint && 
            tapModeState.selectedBlockForPlacement !== null && 
            !isStarterBlock(tapModeState.selectedBlockForPlacement || '')}
          onDismiss={() => setShowSwipeHint(false)}
        />
      )}
      
    </DndContext>
  )
}

// Main App component with coordinate system provider
function App() {
  return (
    <CoordinateSystemProvider>
      <GameApp />
    </CoordinateSystemProvider>
  );
}

export default App