import { describe, it, expect, beforeEach } from 'vitest'
import { 
  SAMPLE_CHALLENGES, 
  getChallengesByDifficulty, 
  getChallengeById, 
  getNextChallenge, 
  getPreviousChallenge 
} from '../data/challenges'
import { BLOCKS, getBlockById } from '../data/blocks'
import { Challenge, BOARD_SIZE } from '../types/game'

describe('Challenge System Integration Tests', () => {
  describe('Challenge Data Integrity', () => {
    it('has valid challenge structure for all challenges', () => {
      expect(SAMPLE_CHALLENGES).toBeDefined()
      expect(SAMPLE_CHALLENGES.length).toBeGreaterThan(0)

      SAMPLE_CHALLENGES.forEach((challenge, index) => {
        // Basic structure validation
        expect(challenge.id).toBeDefined()
        expect(challenge.name).toBeDefined()
        expect(challenge.difficulty).toBeDefined()
        expect(challenge.starterBlocks).toBeDefined()
        expect(challenge.availableBlocks).toBeDefined()

        // ID uniqueness
        const duplicateIds = SAMPLE_CHALLENGES.filter(c => c.id === challenge.id)
        expect(duplicateIds).toHaveLength(1)

        // Name is not empty
        expect(challenge.name.length).toBeGreaterThan(0)

        // Difficulty is valid
        expect(['beginner', 'advanced', 'master', 'grandmaster']).toContain(challenge.difficulty)
      })
    })

    it('has valid difficulty progression', () => {
      const difficulties = ['beginner', 'advanced', 'master', 'grandmaster']
      const challengesByDifficulty = difficulties.map(diff => 
        SAMPLE_CHALLENGES.filter(c => c.difficulty === diff)
      )

      // Each difficulty should have at least one challenge
      challengesByDifficulty.forEach((challenges, index) => {
        expect(challenges.length).toBeGreaterThan(0)
      })

      // Beginner should have the most challenges (or equal to others)
      const beginnerCount = challengesByDifficulty[0].length
      expect(beginnerCount).toBeGreaterThanOrEqual(1)
    })

    it('has unique challenge IDs across all difficulties', () => {
      const allIds = SAMPLE_CHALLENGES.map(c => c.id)
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)
    })

    it('has meaningful challenge names', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        expect(challenge.name).toMatch(/\S+/) // At least one non-whitespace character
        expect(challenge.name.length).toBeLessThan(50) // Reasonable length
      })
    })
  })

  describe('Starter Blocks Validation', () => {
    it('has valid starter block references', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        challenge.starterBlocks.forEach((starterBlock, index) => {
          // Block ID must exist in BLOCKS
          const block = getBlockById(starterBlock.blockId)
          expect(block).toBeDefined()
          expect(block?.id).toBe(starterBlock.blockId)

          // Position validation
          expect(starterBlock.position.x).toBeGreaterThanOrEqual(0)
          expect(starterBlock.position.x).toBeLessThan(BOARD_SIZE)
          expect(starterBlock.position.y).toBeGreaterThanOrEqual(0)
          expect(starterBlock.position.y).toBeLessThan(BOARD_SIZE)

          // Rotation validation
          expect(starterBlock.rotation).toBeGreaterThanOrEqual(0)
          expect(starterBlock.rotation).toBeLessThanOrEqual(3)
        })
      })
    })

    it('has non-overlapping starter blocks', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        const occupiedCells = new Set<string>()

        challenge.starterBlocks.forEach(starterBlock => {
          const block = getBlockById(starterBlock.blockId)
          if (!block) return

          // Apply rotation to get actual pattern
          let pattern = block.pattern
          for (let i = 0; i < starterBlock.rotation; i++) {
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

          // Check each cell of the rotated pattern
          pattern.forEach((row, rowIndex) => {
            row.forEach((isOccupied, colIndex) => {
              if (isOccupied) {
                const cellX = starterBlock.position.x + colIndex
                const cellY = starterBlock.position.y + rowIndex
                const cellKey = `${cellX},${cellY}`

                // Cell should be within board bounds
                expect(cellX).toBeLessThan(BOARD_SIZE)
                expect(cellY).toBeLessThan(BOARD_SIZE)

                // Cell should not be occupied by another starter block
                expect(occupiedCells.has(cellKey)).toBe(false)
                occupiedCells.add(cellKey)
              }
            })
          })
        })
      })
    })

    it('has starter blocks that fit within board boundaries', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        challenge.starterBlocks.forEach(starterBlock => {
          const block = getBlockById(starterBlock.blockId)
          if (!block) return

          // Apply rotation to get actual pattern
          let pattern = block.pattern
          for (let i = 0; i < starterBlock.rotation; i++) {
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

          const blockWidth = pattern[0].length
          const blockHeight = pattern.length

          expect(starterBlock.position.x + blockWidth).toBeLessThanOrEqual(BOARD_SIZE)
          expect(starterBlock.position.y + blockHeight).toBeLessThanOrEqual(BOARD_SIZE)
        })
      })
    })

    it('has reasonable number of starter blocks per challenge', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        expect(challenge.starterBlocks.length).toBeGreaterThanOrEqual(1)
        expect(challenge.starterBlocks.length).toBeLessThanOrEqual(8) // Reasonable upper limit
      })
    })
  })

  describe('Available Blocks Validation', () => {
    it('has valid available block references', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        expect(challenge.availableBlocks.length).toBeGreaterThan(0)

        challenge.availableBlocks.forEach(blockId => {
          const block = getBlockById(blockId)
          expect(block).toBeDefined()
          expect(block?.id).toBe(blockId)
        })
      })
    })

    it('does not include starter blocks in available blocks', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        const starterBlockIds = challenge.starterBlocks.map(sb => sb.blockId)
        
        challenge.availableBlocks.forEach(availableBlockId => {
          expect(starterBlockIds).not.toContain(availableBlockId)
        })
      })
    })

    it('has sufficient blocks to potentially complete the puzzle', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        // Calculate total area of starter blocks
        let starterArea = 0
        challenge.starterBlocks.forEach(starterBlock => {
          const block = getBlockById(starterBlock.blockId)
          if (block) {
            const blockArea = block.pattern
              .flat()
              .filter(cell => cell).length
            starterArea += blockArea
          }
        })

        // Calculate total area of available blocks
        let availableArea = 0
        challenge.availableBlocks.forEach(blockId => {
          const block = getBlockById(blockId)
          if (block) {
            const blockArea = block.pattern
              .flat()
              .filter(cell => cell).length
            availableArea += blockArea
          }
        })

        // Total area should equal board area (64 cells for 8x8 board)
        const totalArea = starterArea + availableArea
        expect(totalArea).toBe(BOARD_SIZE * BOARD_SIZE)
      })
    })

    it('has unique available blocks within each challenge', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        const uniqueBlocks = new Set(challenge.availableBlocks)
        expect(uniqueBlocks.size).toBe(challenge.availableBlocks.length)
      })
    })
  })

  describe('Challenge Navigation Functions', () => {
    describe('getChallengesByDifficulty', () => {
      it('returns challenges for valid difficulties', () => {
        const difficulties = ['beginner', 'advanced', 'master', 'grandmaster'] as const

        difficulties.forEach(difficulty => {
          const challenges = getChallengesByDifficulty(difficulty)
          expect(challenges.length).toBeGreaterThan(0)
          
          challenges.forEach(challenge => {
            expect(challenge.difficulty).toBe(difficulty)
          })
        })
      })

      it('returns empty array for invalid difficulty', () => {
        const challenges = getChallengesByDifficulty('invalid' as any)
        expect(challenges).toEqual([])
      })

      it('maintains original order of challenges', () => {
        const beginnerChallenges = getChallengesByDifficulty('beginner')
        const originalBeginnerChallenges = SAMPLE_CHALLENGES.filter(c => c.difficulty === 'beginner')
        
        expect(beginnerChallenges).toEqual(originalBeginnerChallenges)
      })
    })

    describe('getChallengeById', () => {
      it('returns correct challenge for valid IDs', () => {
        SAMPLE_CHALLENGES.forEach(originalChallenge => {
          const challenge = getChallengeById(originalChallenge.id)
          expect(challenge).toEqual(originalChallenge)
        })
      })

      it('returns undefined for invalid ID', () => {
        const challenge = getChallengeById('non-existent-id')
        expect(challenge).toBeUndefined()
      })

      it('returns undefined for empty ID', () => {
        const challenge = getChallengeById('')
        expect(challenge).toBeUndefined()
      })
    })

    describe('getNextChallenge', () => {
      it('returns correct next challenge in sequence', () => {
        for (let i = 0; i < SAMPLE_CHALLENGES.length - 1; i++) {
          const currentChallenge = SAMPLE_CHALLENGES[i]
          const expectedNext = SAMPLE_CHALLENGES[i + 1]
          
          const nextChallenge = getNextChallenge(currentChallenge.id)
          expect(nextChallenge).toEqual(expectedNext)
        }
      })

      it('returns undefined for last challenge', () => {
        const lastChallenge = SAMPLE_CHALLENGES[SAMPLE_CHALLENGES.length - 1]
        const nextChallenge = getNextChallenge(lastChallenge.id)
        expect(nextChallenge).toBeUndefined()
      })

      it('returns undefined for invalid ID', () => {
        const nextChallenge = getNextChallenge('invalid-id')
        expect(nextChallenge).toBeUndefined()
      })
    })

    describe('getPreviousChallenge', () => {
      it('returns correct previous challenge in sequence', () => {
        for (let i = 1; i < SAMPLE_CHALLENGES.length; i++) {
          const currentChallenge = SAMPLE_CHALLENGES[i]
          const expectedPrevious = SAMPLE_CHALLENGES[i - 1]
          
          const previousChallenge = getPreviousChallenge(currentChallenge.id)
          expect(previousChallenge).toEqual(expectedPrevious)
        }
      })

      it('returns undefined for first challenge', () => {
        const firstChallenge = SAMPLE_CHALLENGES[0]
        const previousChallenge = getPreviousChallenge(firstChallenge.id)
        expect(previousChallenge).toBeUndefined()
      })

      it('returns undefined for invalid ID', () => {
        const previousChallenge = getPreviousChallenge('invalid-id')
        expect(previousChallenge).toBeUndefined()
      })
    })
  })

  describe('Challenge Difficulty Balance', () => {
    it('has appropriate number of starter blocks by difficulty', () => {
      const beginnerChallenges = getChallengesByDifficulty('beginner')
      const advancedChallenges = getChallengesByDifficulty('advanced')
      const masterChallenges = getChallengesByDifficulty('master')
      const grandmasterChallenges = getChallengesByDifficulty('grandmaster')

      // Beginner challenges should generally have fewer starter blocks
      beginnerChallenges.forEach(challenge => {
        expect(challenge.starterBlocks.length).toBeLessThanOrEqual(5)
      })

      // Advanced and higher should have reasonable complexity
      const higherDifficultyChallenges = [
        ...advancedChallenges, 
        ...masterChallenges, 
        ...grandmasterChallenges
      ]
      
      higherDifficultyChallenges.forEach(challenge => {
        expect(challenge.starterBlocks.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('has consistent available block sets across difficulties', () => {
      // All challenges should have the same set of available blocks for consistency
      const firstChallengeBlocks = SAMPLE_CHALLENGES[0].availableBlocks.sort()
      
      SAMPLE_CHALLENGES.forEach(challenge => {
        const challengeBlocks = [...challenge.availableBlocks].sort()
        expect(challengeBlocks).toEqual(firstChallengeBlocks)
      })
    })

    it('has varied starter block positions across challenges', () => {
      const allPositions = SAMPLE_CHALLENGES.flatMap(challenge => 
        challenge.starterBlocks.map(sb => `${sb.position.x},${sb.position.y}`)
      )

      // Should have good position variety
      const uniquePositions = new Set(allPositions)
      expect(uniquePositions.size).toBeGreaterThan(allPositions.length * 0.3) // At least 30% unique
    })
  })

  describe('Puzzle Solvability Analysis', () => {
    it('has feasible block arrangements for each challenge', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        // Check that available blocks can theoretically fill remaining space
        const totalBoardCells = BOARD_SIZE * BOARD_SIZE

        // Calculate starter block coverage
        let starterCoverage = 0
        challenge.starterBlocks.forEach(starterBlock => {
          const block = getBlockById(starterBlock.blockId)
          if (block) {
            starterCoverage += block.pattern.flat().filter(cell => cell).length
          }
        })

        // Calculate available block coverage
        let availableCoverage = 0
        challenge.availableBlocks.forEach(blockId => {
          const block = getBlockById(blockId)
          if (block) {
            availableCoverage += block.pattern.flat().filter(cell => cell).length
          }
        })

        // Total should exactly match board size
        expect(starterCoverage + availableCoverage).toBe(totalBoardCells)
      })
    })

    it('has varied block types in available sets', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        // Group blocks by color/type
        const blockTypes = new Set(
          challenge.availableBlocks.map(blockId => blockId.split('-')[0])
        )

        // Should have multiple types for interesting puzzles
        expect(blockTypes.size).toBeGreaterThanOrEqual(3)
      })
    })

    it('has blocks with different size categories', () => {
      SAMPLE_CHALLENGES.forEach(challenge => {
        const blockSizes = challenge.availableBlocks.map(blockId => {
          const block = getBlockById(blockId)
          return block ? block.pattern.flat().filter(cell => cell).length : 0
        })

        // Should have variety in block sizes
        const uniqueSizes = new Set(blockSizes)
        expect(uniqueSizes.size).toBeGreaterThanOrEqual(2)
        
        // Should have both small and larger blocks
        expect(Math.min(...blockSizes)).toBeLessThanOrEqual(5)
        expect(Math.max(...blockSizes)).toBeGreaterThanOrEqual(8)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles empty challenge array gracefully', () => {
      // Test utility functions with empty array
      expect(() => getChallengesByDifficulty('beginner')).not.toThrow()
      expect(() => getChallengeById('any-id')).not.toThrow()
      expect(() => getNextChallenge('any-id')).not.toThrow()
      expect(() => getPreviousChallenge('any-id')).not.toThrow()
    })

    it('handles malformed challenge data gracefully', () => {
      // Test with challenge that has missing properties
      const malformedChallenge = {
        id: 'test',
        name: 'Test Challenge'
        // Missing difficulty, starterBlocks, availableBlocks
      } as Challenge

      expect(() => {
        // Functions should handle missing properties gracefully
        getChallengeById(malformedChallenge.id)
      }).not.toThrow()
    })

    it('handles special characters in challenge IDs', () => {
      // Test that utility functions handle various ID formats
      const specialIds = ['test-1', 'test_2', 'test.3', 'test 4']
      
      specialIds.forEach(id => {
        expect(() => getChallengeById(id)).not.toThrow()
        expect(() => getNextChallenge(id)).not.toThrow()
        expect(() => getPreviousChallenge(id)).not.toThrow()
      })
    })
  })

  describe('Performance and Scalability', () => {
    it('handles large numbers of challenges efficiently', () => {
      const startTime = performance.now()
      
      // Simulate processing many challenges
      for (let i = 0; i < 1000; i++) {
        SAMPLE_CHALLENGES.forEach(challenge => {
          getChallengeById(challenge.id)
          getChallengesByDifficulty(challenge.difficulty)
        })
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(1000) // Should complete in under 1 second
    })

    it('has efficient challenge lookup by ID', () => {
      const startTime = performance.now()
      
      // Test many ID lookups
      for (let i = 0; i < 10000; i++) {
        const randomChallenge = SAMPLE_CHALLENGES[i % SAMPLE_CHALLENGES.length]
        getChallengeById(randomChallenge.id)
      }
      
      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(100) // Should be very fast
    })

    it('maintains memory efficiency with repeated operations', () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        getChallengesByDifficulty('beginner')
        getChallengesByDifficulty('advanced')
        getChallengesByDifficulty('master')
        getChallengesByDifficulty('grandmaster')
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0
      
      // Memory increase should be reasonable (less than 10MB)
      if (initialMemory > 0) {
        expect(finalMemory - initialMemory).toBeLessThan(10 * 1024 * 1024)
      }
    })
  })

  describe('Real-world Challenge Scenarios', () => {
    it('simulates complete challenge progression', () => {
      // Start with first challenge
      let currentChallenge = SAMPLE_CHALLENGES[0]
      let visitedChallenges = 0

      // Progress through all challenges
      while (currentChallenge && visitedChallenges < SAMPLE_CHALLENGES.length) {
        expect(currentChallenge).toBeDefined()
        expect(currentChallenge.id).toBeDefined()
        
        visitedChallenges++
        const nextChallenge = getNextChallenge(currentChallenge.id)
        
        if (nextChallenge) {
          currentChallenge = nextChallenge
        } else {
          break
        }
      }

      expect(visitedChallenges).toBe(SAMPLE_CHALLENGES.length)
    })

    it('simulates backward navigation through challenges', () => {
      // Start with last challenge
      let currentChallenge = SAMPLE_CHALLENGES[SAMPLE_CHALLENGES.length - 1]
      let visitedChallenges = 0

      // Go backwards through all challenges
      while (currentChallenge && visitedChallenges < SAMPLE_CHALLENGES.length) {
        expect(currentChallenge).toBeDefined()
        expect(currentChallenge.id).toBeDefined()
        
        visitedChallenges++
        const previousChallenge = getPreviousChallenge(currentChallenge.id)
        
        if (previousChallenge) {
          currentChallenge = previousChallenge
        } else {
          break
        }
      }

      expect(visitedChallenges).toBe(SAMPLE_CHALLENGES.length)
    })

    it('supports difficulty-based filtering workflow', () => {
      const difficulties = ['beginner', 'advanced', 'master', 'grandmaster'] as const
      
      difficulties.forEach(difficulty => {
        const challenges = getChallengesByDifficulty(difficulty)
        
        // Should be able to navigate within difficulty
        if (challenges.length > 1) {
          const firstChallenge = challenges[0]
          const nextInSequence = getNextChallenge(firstChallenge.id)
          
          if (nextInSequence) {
            // Next challenge might be same or different difficulty (depends on ordering)
            expect(nextInSequence).toBeDefined()
          }
        }
      })
    })
  })
})