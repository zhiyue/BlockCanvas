import React, { useEffect, useState } from 'react'
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import GameBoard from './components/GameBoard'
import BlockInventory from './components/BlockInventory'
import GameInstructions from './components/GameInstructions'
import DraggableBlock from './components/DraggableBlock'
import { useGameStore } from './store/gameStore'
import { SAMPLE_CHALLENGES } from './data/challenges'
import { getBlockById } from './data/blocks'
import { BOARD_SIZE, CoordinateSystem } from './types/game'
import { StagewiseToolbar } from '@stagewise/toolbar-react'
import ReactPlugin from '@stagewise-plugins/react'
import './App.css'

function App() {
  const {
    currentChallenge,
    board,
    selectedBlock,
    isCompleted,
    timeElapsed,
    moves,
    setCurrentChallenge,
    placeBlock,
    removeBlock,
    selectBlock,
    resetBoard,
    getAvailableBlocks,
    incrementTime,
    isPositionValid
  } = useGameStore()

  // Timer effect
  useEffect(() => {
    if (currentChallenge && !isCompleted) {
      const timer = setInterval(() => {
        incrementTime()
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [currentChallenge, isCompleted, incrementTime])

  // Initialize with first challenge
  useEffect(() => {
    if (!currentChallenge) {
      setCurrentChallenge(SAMPLE_CHALLENGES[0])
    }
  }, [currentChallenge, setCurrentChallenge])

  const [blockRotations, setBlockRotations] = React.useState<{[key: string]: number}>({})
  const [showInstructions, setShowInstructions] = React.useState(false)
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null)
  const [draggedFromBoard, setDraggedFromBoard] = useState(false)
  const [originalPosition, setOriginalPosition] = useState<{x: number, y: number, rotation: number} | null>(null)
  const [lastMousePosition, setLastMousePosition] = useState<{x: number, y: number} | null>(null)
  const [previewPosition, setPreviewPosition] = useState<{x: number, y: number} | null>(null)

  // Track mouse position during drag and calculate preview position
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (draggedBlock) {
        setLastMousePosition({ x: event.clientX, y: event.clientY })

        // Calculate preview position for snap effect
        const gameBoardOverlay = document.querySelector('.game-board-container [style*="position: absolute"]') as HTMLElement
        if (gameBoardOverlay) {
          const rect = gameBoardOverlay.getBoundingClientRect()
          const canvasX = event.clientX - rect.left
          const canvasY = event.clientY - rect.top

          const { x: gridX, y: gridY } = CoordinateSystem.canvasToGrid(canvasX, canvasY)

          // Only set preview if within bounds and position is valid
          if (gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE) {
            const rotation = blockRotations[draggedBlock] || 0
            if (isPositionValid(draggedBlock, gridX, gridY, rotation)) {
              setPreviewPosition({ x: gridX, y: gridY })
            } else {
              setPreviewPosition(null)
            }
          } else {
            setPreviewPosition(null)
          }
        }
      }
    }

    if (draggedBlock) {
      document.addEventListener('mousemove', handleMouseMove)
      return () => document.removeEventListener('mousemove', handleMouseMove)
    } else {
      setPreviewPosition(null)
    }
  }, [draggedBlock, blockRotations, isPositionValid])
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleCellClick = (x: number, y: number) => {
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

  const handleBlockPlace = (blockId: string, x: number, y: number): boolean => {
    const rotation = blockRotations[blockId] || 0
    return placeBlock(blockId, x, y, rotation)
  }

  const handleBlockRotate = (blockId: string) => {
    setBlockRotations(prev => ({
      ...prev,
      [blockId]: ((prev[blockId] || 0) + 1) % 4
    }))
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
    console.log('Drag started for block:', blockId)
    setDraggedBlock(blockId)

    // Check if dragging from board (already placed block)
    const isOnBoard = board.placedBlocks.some(pb => pb.blockId === blockId)
    setDraggedFromBoard(isOnBoard)

    // If dragging from board, store original position and remove it temporarily
    if (isOnBoard) {
      const placedBlock = board.placedBlocks.find(pb => pb.blockId === blockId)
      if (placedBlock) {
        setOriginalPosition({
          x: placedBlock.position.x,
          y: placedBlock.position.y,
          rotation: placedBlock.rotation
        })
      }
      removeBlock(blockId)
    } else {
      setOriginalPosition(null)
    }

    selectBlock(blockId)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    console.log('Drag ended:', { activeId: active.id, overId: over?.id, lastMousePosition })

    if (over && draggedBlock && lastMousePosition) {
      const blockId = active.id as string

      if (over.id === 'game-board') {
        const rotation = blockRotations[blockId] || 0

        // Get the game board overlay element to calculate relative coordinates
        const gameBoardOverlay = document.querySelector('.game-board-container [style*="position: absolute"]') as HTMLElement
        console.log('Found overlay:', !!gameBoardOverlay)
        if (gameBoardOverlay) {
          const rect = gameBoardOverlay.getBoundingClientRect()
          const canvasX = lastMousePosition.x - rect.left
          const canvasY = lastMousePosition.y - rect.top
          console.log('Canvas coordinates:', { canvasX, canvasY })

          const { x: gridX, y: gridY } = CoordinateSystem.canvasToGrid(canvasX, canvasY)
          console.log('Grid coordinates:', { gridX, gridY })

          // Ensure coordinates are within bounds
          if (gridX >= 0 && gridX < BOARD_SIZE && gridY >= 0 && gridY < BOARD_SIZE) {
            const success = placeBlock(blockId, gridX, gridY, rotation)
            console.log('Place block result:', success)

            if (success) {
              // Reset rotation for this block after placing
              setBlockRotations(prev => ({
                ...prev,
                [blockId]: 0
              }))
            } else if (draggedFromBoard && originalPosition) {
              // If placement failed and was dragged from board, put it back to original position
              placeBlock(blockId, originalPosition.x, originalPosition.y, originalPosition.rotation)
            }
          } else if (draggedFromBoard && originalPosition) {
            // If coordinates are out of bounds and was dragged from board, put it back
            placeBlock(blockId, originalPosition.x, originalPosition.y, originalPosition.rotation)
          }
        }
      } else if (draggedFromBoard && originalPosition) {
        // If dropped outside valid area and was from board, put it back
        placeBlock(blockId, originalPosition.x, originalPosition.y, originalPosition.rotation)
      }
    } else if (draggedFromBoard && draggedBlock && originalPosition) {
      // If dropped in invalid area and was from board, put it back to original position
      placeBlock(draggedBlock, originalPosition.x, originalPosition.y, originalPosition.rotation)
    }

    // Clean up drag state
    setDraggedBlock(null)
    setDraggedFromBoard(false)
    setOriginalPosition(null)
    setLastMousePosition(null)
    setPreviewPosition(null)
    selectBlock(null)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
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
                <button 
                  onClick={() => setShowInstructions(true)}
                  className="btn btn-primary"
                >
                  How to Play
                </button>
                <button 
                  onClick={() => loadChallenge(getCurrentChallengeIndex() - 1)}
                  disabled={getCurrentChallengeIndex() <= 0}
                  className="btn btn-secondary"
                >
                  Previous
                </button>
                <button 
                  onClick={resetBoard}
                  className="btn btn-warning"
                >
                  Reset
                </button>
                <button 
                  onClick={() => loadChallenge(getCurrentChallengeIndex() + 1)}
                  disabled={getCurrentChallengeIndex() >= SAMPLE_CHALLENGES.length - 1}
                  className="btn btn-secondary"
                >
                  Next
                </button>
              </div>
              
              {isCompleted && (
                <div className="completion-message">
                  <h3>🎉 Puzzle Completed!</h3>
                  <p>Time: {formatTime(timeElapsed)} | Moves: {moves}</p>
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
              />
              
              <BlockInventory
                availableBlocks={getAvailableBlocks()}
                selectedBlock={selectedBlock}
                onBlockSelect={selectBlock}
                onBlockPlace={handleBlockPlace}
                blockRotations={blockRotations}
                onBlockRotate={handleBlockRotate}
              />
            </div>
          </div>
        </main>

        <GameInstructions
          isOpen={showInstructions}
          onClose={() => setShowInstructions(false)}
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
            />
          </div>
        ) : null}
      </DragOverlay>
      
      <StagewiseToolbar 
        config={{
          plugins: [ReactPlugin]
        }}
      />
    </DndContext>
  )
}

export default App