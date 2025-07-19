import React, { useEffect, useState } from 'react'
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter } from '@dnd-kit/core'
import GameBoard from './components/GameBoard'
import BlockInventory from './components/BlockInventory'
import GameInstructions from './components/GameInstructions'
import DraggableBlock from './components/DraggableBlock'
import { useGameStore } from './store/gameStore'
import { SAMPLE_CHALLENGES } from './data/challenges'
import { getBlockById } from './data/blocks'
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
    incrementTime
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
    const placedBlocksDisplay: { [key: string]: { position: { x: number; y: number }; color: string; pattern: boolean[][] } } = {}
    
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
          pattern: pattern
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
    setDraggedBlock(blockId)
    
    // Check if dragging from board (already placed block)
    const isOnBoard = board.placedBlocks.some(pb => pb.blockId === blockId)
    setDraggedFromBoard(isOnBoard)
    
    // If dragging from board, remove it temporarily
    if (isOnBoard) {
      removeBlock(blockId)
    }
    
    selectBlock(blockId)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && draggedBlock) {
      const blockId = active.id as string
      
      if (over.id === 'game-board') {
        // Get drop position from board component
        const dropData = over.data.current as { x: number; y: number } | undefined
        if (dropData) {
          const rotation = blockRotations[blockId] || 0
          const success = placeBlock(blockId, dropData.x, dropData.y, rotation)
          
          if (success) {
            // Reset rotation for this block after placing
            setBlockRotations(prev => ({
              ...prev,
              [blockId]: 0
            }))
          } else if (draggedFromBoard) {
            // If placement failed and was dragged from board, try to put it back
            const originalPosition = board.placedBlocks.find(pb => pb.blockId === blockId)
            if (originalPosition) {
              placeBlock(blockId, originalPosition.position.x, originalPosition.position.y, originalPosition.rotation)
            }
          }
        }
      } else if (draggedFromBoard) {
        // If dropped outside valid area and was from board, put it back
        const originalPosition = board.placedBlocks.find(pb => pb.blockId === blockId)
        if (originalPosition) {
          placeBlock(blockId, originalPosition.position.x, originalPosition.position.y, originalPosition.rotation)
        }
      }
    } else if (draggedFromBoard && draggedBlock) {
      // If dropped in invalid area and was from board, put it back
      const originalPosition = board.placedBlocks.find(pb => pb.blockId === draggedBlock)
      if (originalPosition) {
        placeBlock(draggedBlock, originalPosition.position.x, originalPosition.position.y, originalPosition.rotation)
      }
    }
    
    setDraggedBlock(null)
    setDraggedFromBoard(false)
    selectBlock(null)
  }

  return (
    <DndContext
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
      
      <DragOverlay>
        {draggedBlock ? (
          <DraggableBlock
            block={getBlockById(draggedBlock)!}
            rotation={blockRotations[draggedBlock] || 0}
            scale={0.8}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default App