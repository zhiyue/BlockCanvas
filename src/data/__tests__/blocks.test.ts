import { describe, it, expect } from 'vitest'
import { 
  BLOCK_SHAPES, 
  rotateBlockPattern, 
  getBlockById, 
  getTotalBlockArea 
} from '../blocks'
import { BlockShape } from '../../types/game'

describe('Block Shapes Data', () => {
  it('should have at least one block', () => {
    expect(BLOCK_SHAPES.length).toBeGreaterThan(0)
  })

  it('should have unique block IDs', () => {
    const ids = BLOCK_SHAPES.map(block => block.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have consistent width and height with pattern dimensions', () => {
    BLOCK_SHAPES.forEach(block => {
      expect(block.height).toBe(block.pattern.length)
      if (block.pattern.length > 0) {
        expect(block.width).toBe(block.pattern[0].length)
      }
    })
  })

  it('should have valid patterns (rectangular arrays)', () => {
    BLOCK_SHAPES.forEach(block => {
      expect(block.pattern.length).toBeGreaterThan(0)
      const firstRowLength = block.pattern[0].length
      expect(firstRowLength).toBeGreaterThan(0)
      
      block.pattern.forEach(row => {
        expect(row.length).toBe(firstRowLength)
      })
    })
  })

  it('should have at least one true cell in each pattern', () => {
    BLOCK_SHAPES.forEach(block => {
      const hasTrueCell = block.pattern.some(row => 
        row.some(cell => cell === true)
      )
      expect(hasTrueCell).toBe(true)
    })
  })

  it('should have valid color strings', () => {
    BLOCK_SHAPES.forEach(block => {
      expect(typeof block.color).toBe('string')
      expect(block.color.length).toBeGreaterThan(0)
      // Basic hex color format check
      expect(block.color).toMatch(/^#[0-9a-fA-F]{6}$/)
    })
  })
})

describe('rotateBlockPattern', () => {
  it('should rotate a 1x1 pattern correctly', () => {
    const pattern = [[true]]
    const rotated = rotateBlockPattern(pattern)
    expect(rotated).toEqual([[true]])
  })

  it('should rotate a 2x1 horizontal pattern to 1x2 vertical', () => {
    const pattern = [[true, true]]
    const rotated = rotateBlockPattern(pattern)
    expect(rotated).toEqual([[true], [true]])
  })

  it('should rotate a 1x2 vertical pattern to 2x1 horizontal', () => {
    const pattern = [[true], [true]]
    const rotated = rotateBlockPattern(pattern)
    expect(rotated).toEqual([[true, true]])
  })

  it('should rotate a 2x2 square pattern correctly', () => {
    const pattern = [
      [true, false],
      [false, true]
    ]
    const rotated = rotateBlockPattern(pattern)
    expect(rotated).toEqual([
      [false, true],
      [true, false]
    ])
  })

  it('should rotate a complex 3x3 pattern correctly', () => {
    const pattern = [
      [true, false, false],
      [true, true, false],
      [false, false, true]
    ]
    const rotated = rotateBlockPattern(pattern)
    expect(rotated).toEqual([
      [false, true, true],
      [false, true, false],
      [true, false, false]
    ])
  })

  it('should rotate rectangular patterns correctly', () => {
    const pattern = [
      [true, true, true],
      [false, false, false]
    ]
    const rotated = rotateBlockPattern(pattern)
    expect(rotated).toEqual([
      [false, true],
      [false, true],
      [false, true]
    ])
  })

  it('should maintain pattern integrity after 4 rotations', () => {
    const original = [
      [true, false, true],
      [false, true, false],
      [true, true, false]
    ]
    
    let rotated = original
    for (let i = 0; i < 4; i++) {
      rotated = rotateBlockPattern(rotated)
    }
    
    expect(rotated).toEqual(original)
  })
})

describe('getBlockById', () => {
  it('should return block for valid IDs', () => {
    BLOCK_SHAPES.forEach(expectedBlock => {
      const block = getBlockById(expectedBlock.id)
      expect(block).toBeDefined()
      expect(block).toEqual(expectedBlock)
    })
  })

  it('should return undefined for invalid ID', () => {
    const block = getBlockById('non-existent-id')
    expect(block).toBeUndefined()
  })

  it('should return undefined for empty string', () => {
    const block = getBlockById('')
    expect(block).toBeUndefined()
  })

  it('should be case sensitive', () => {
    if (BLOCK_SHAPES.length > 0) {
      const firstBlockId = BLOCK_SHAPES[0].id
      const upperCaseId = firstBlockId.toUpperCase()
      
      if (firstBlockId !== upperCaseId) {
        const block = getBlockById(upperCaseId)
        expect(block).toBeUndefined()
      }
    }
  })
})

describe('getTotalBlockArea', () => {
  it('should return the correct total area', () => {
    const expectedArea = BLOCK_SHAPES.reduce((total, block) => {
      const blockArea = block.pattern.reduce((sum, row) => 
        sum + row.filter(cell => cell).length, 0
      )
      return total + blockArea
    }, 0)
    
    expect(getTotalBlockArea()).toBe(expectedArea)
  })

  it('should equal 64 for 8x8 board completion', () => {
    // This is a business rule - all blocks should fill an 8x8 grid
    expect(getTotalBlockArea()).toBe(64)
  })

  it('should be consistent with individual block areas', () => {
    let manualTotal = 0
    
    BLOCK_SHAPES.forEach(block => {
      const blockArea = block.pattern.reduce((sum, row) => 
        sum + row.filter(cell => cell).length, 0
      )
      manualTotal += blockArea
    })
    
    expect(getTotalBlockArea()).toBe(manualTotal)
  })
})

describe('Block Data Integrity', () => {
  it('should have specific known blocks', () => {
    const expectedBlocks = [
      'red-3x4',
      'blue-3x3',
      'blue-2x2',
      'white-1x5',
      'white-1x4',
      'yellow-2x5',
      'yellow-2x4',
      'yellow-2x3',
      'black-1x3',
      'black-1x2',
      'black-1x1'
    ]
    
    expectedBlocks.forEach(id => {
      const block = getBlockById(id)
      expect(block).toBeDefined()
      expect(block?.id).toBe(id)
    })
  })

  it('should have correct areas for specific blocks', () => {
    const blockAreas = [
      { id: 'red-3x4', area: 12 },
      { id: 'blue-3x3', area: 9 },
      { id: 'blue-2x2', area: 4 },
      { id: 'white-1x5', area: 5 },
      { id: 'white-1x4', area: 4 },
      { id: 'yellow-2x5', area: 10 },
      { id: 'yellow-2x4', area: 8 },
      { id: 'yellow-2x3', area: 6 },
      { id: 'black-1x3', area: 3 },
      { id: 'black-1x2', area: 2 },
      { id: 'black-1x1', area: 1 }
    ]
    
    blockAreas.forEach(({ id, area }) => {
      const block = getBlockById(id)
      expect(block).toBeDefined()
      
      const actualArea = block!.pattern.reduce((sum, row) => 
        sum + row.filter(cell => cell).length, 0
      )
      expect(actualArea).toBe(area)
    })
  })
})