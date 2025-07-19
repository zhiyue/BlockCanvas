import { describe, it, expect } from 'vitest'
import { CoordinateSystem, BOARD_SIZE, CELL_SIZE, BOARD_CONFIG } from '../game'

describe('CoordinateSystem', () => {
  describe('gridToCanvas', () => {
    it('should convert grid coordinates to canvas coordinates', () => {
      const result = CoordinateSystem.gridToCanvas(0, 0)
      expect(result).toEqual({
        x: BOARD_CONFIG.BORDER_WIDTH,
        y: BOARD_CONFIG.BORDER_WIDTH
      })
    })

    it('should handle non-zero grid coordinates', () => {
      const result = CoordinateSystem.gridToCanvas(2, 3)
      expect(result).toEqual({
        x: 2 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH,
        y: 3 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH
      })
    })

    it('should handle maximum grid coordinates', () => {
      const result = CoordinateSystem.gridToCanvas(BOARD_SIZE - 1, BOARD_SIZE - 1)
      expect(result).toEqual({
        x: (BOARD_SIZE - 1) * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH,
        y: (BOARD_SIZE - 1) * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH
      })
    })
  })

  describe('canvasToGrid', () => {
    it('should convert canvas coordinates to grid coordinates', () => {
      const canvasX = BOARD_CONFIG.BORDER_WIDTH
      const canvasY = BOARD_CONFIG.BORDER_WIDTH
      const result = CoordinateSystem.canvasToGrid(canvasX, canvasY)
      expect(result).toEqual({ x: 0, y: 0 })
    })

    it('should handle coordinates in the middle of a cell', () => {
      const canvasX = CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH + 10
      const canvasY = CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH + 20
      const result = CoordinateSystem.canvasToGrid(canvasX, canvasY)
      expect(result).toEqual({ x: 1, y: 1 })
    })

    it('should handle coordinates at cell boundaries', () => {
      const canvasX = 2 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH
      const canvasY = 3 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH
      const result = CoordinateSystem.canvasToGrid(canvasX, canvasY)
      expect(result).toEqual({ x: 2, y: 3 })
    })

    it('should round down fractional coordinates', () => {
      const canvasX = 2.9 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH
      const canvasY = 3.7 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH
      const result = CoordinateSystem.canvasToGrid(canvasX, canvasY)
      expect(result).toEqual({ x: 2, y: 3 })
    })
  })

  describe('getCellBounds', () => {
    it('should return correct bounds for top-left cell', () => {
      const result = CoordinateSystem.getCellBounds(0, 0)
      expect(result).toEqual({
        x: BOARD_CONFIG.BORDER_WIDTH + BOARD_CONFIG.CELL_PADDING,
        y: BOARD_CONFIG.BORDER_WIDTH + BOARD_CONFIG.CELL_PADDING,
        width: CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING,
        height: CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING
      })
    })

    it('should return correct bounds for arbitrary cell', () => {
      const gridX = 3
      const gridY = 4
      const result = CoordinateSystem.getCellBounds(gridX, gridY)
      expect(result).toEqual({
        x: gridX * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH + BOARD_CONFIG.CELL_PADDING,
        y: gridY * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH + BOARD_CONFIG.CELL_PADDING,
        width: CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING,
        height: CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING
      })
    })

    it('should account for padding in all cells', () => {
      const result = CoordinateSystem.getCellBounds(0, 0)
      expect(result.width).toBe(CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING)
      expect(result.height).toBe(CELL_SIZE - 2 * BOARD_CONFIG.CELL_PADDING)
    })
  })

  describe('getBoardDimensions', () => {
    it('should return correct board dimensions', () => {
      const result = CoordinateSystem.getBoardDimensions()
      expect(result).toEqual({
        width: BOARD_SIZE * CELL_SIZE,
        height: BOARD_SIZE * CELL_SIZE,
        totalWidth: BOARD_SIZE * CELL_SIZE + 2 * BOARD_CONFIG.BORDER_WIDTH,
        totalHeight: BOARD_SIZE * CELL_SIZE + 2 * BOARD_CONFIG.BORDER_WIDTH
      })
    })

    it('should have consistent dimensions', () => {
      const result = CoordinateSystem.getBoardDimensions()
      expect(result.width).toBe(result.height)
      expect(result.totalWidth).toBe(result.totalHeight)
    })

    it('should account for borders correctly', () => {
      const result = CoordinateSystem.getBoardDimensions()
      expect(result.totalWidth - result.width).toBe(2 * BOARD_CONFIG.BORDER_WIDTH)
      expect(result.totalHeight - result.height).toBe(2 * BOARD_CONFIG.BORDER_WIDTH)
    })
  })

  describe('coordinate system consistency', () => {
    it('should be reversible: gridToCanvas -> canvasToGrid', () => {
      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          const canvas = CoordinateSystem.gridToCanvas(x, y)
          const grid = CoordinateSystem.canvasToGrid(canvas.x, canvas.y)
          expect(grid).toEqual({ x, y })
        }
      }
    })

    it('should handle edge cases at board boundaries', () => {
      // Test conversion at the edge of the board
      const lastCell = CoordinateSystem.gridToCanvas(BOARD_SIZE - 1, BOARD_SIZE - 1)
      const backToGrid = CoordinateSystem.canvasToGrid(lastCell.x, lastCell.y)
      expect(backToGrid).toEqual({ x: BOARD_SIZE - 1, y: BOARD_SIZE - 1 })
    })
  })
})