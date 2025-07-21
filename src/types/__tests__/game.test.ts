import { describe, it, expect } from 'vitest'
import { CoordinateSystem, EnhancedCoordinateSystem, DEFAULT_COORDINATE_CONFIG, BOARD_SIZE, CELL_SIZE, BOARD_CONFIG } from '../game'

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

describe('EnhancedCoordinateSystem', () => {
  let coordinateSystem: EnhancedCoordinateSystem

  beforeEach(() => {
    coordinateSystem = new EnhancedCoordinateSystem()
  })

  describe('constructor and configuration', () => {
    it('should use default configuration when no config provided', () => {
      const config = coordinateSystem.getConfig()
      expect(config).toEqual(DEFAULT_COORDINATE_CONFIG)
    })

    it('should accept custom configuration', () => {
      const customConfig = {
        ...DEFAULT_COORDINATE_CONFIG,
        cellSize: 60,
        borderWidth: 4
      }
      const customSystem = new EnhancedCoordinateSystem(customConfig)
      expect(customSystem.getConfig()).toEqual(customConfig)
    })

    it('should update configuration', () => {
      coordinateSystem.updateConfig({ cellSize: 60 })
      expect(coordinateSystem.getConfig().cellSize).toBe(60)
      expect(coordinateSystem.getConfig().borderWidth).toBe(BOARD_CONFIG.BORDER_WIDTH)
    })
  })

  describe('coordinate conversion', () => {
    it('should convert grid to canvas coordinates', () => {
      const result = coordinateSystem.gridToCanvas(2, 3)
      expect(result).toEqual({
        x: 2 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH,
        y: 3 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH
      })
    })

    it('should convert canvas to grid coordinates', () => {
      const canvasX = 2 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH
      const canvasY = 3 * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH
      const result = coordinateSystem.canvasToGrid(canvasX, canvasY)
      expect(result).toEqual({ x: 2, y: 3 })
    })

    it('should be reversible', () => {
      for (let x = 0; x < BOARD_SIZE; x++) {
        for (let y = 0; y < BOARD_SIZE; y++) {
          const canvas = coordinateSystem.gridToCanvas(x, y)
          const grid = coordinateSystem.canvasToGrid(canvas.x, canvas.y)
          expect(grid).toEqual({ x, y })
        }
      }
    })
  })

  describe('validation methods', () => {
    it('should validate grid positions', () => {
      expect(coordinateSystem.isValidGridPosition(0, 0)).toBe(true)
      expect(coordinateSystem.isValidGridPosition(7, 7)).toBe(true)
      expect(coordinateSystem.isValidGridPosition(-1, 0)).toBe(false)
      expect(coordinateSystem.isValidGridPosition(0, -1)).toBe(false)
      expect(coordinateSystem.isValidGridPosition(8, 0)).toBe(false)
      expect(coordinateSystem.isValidGridPosition(0, 8)).toBe(false)
    })

    it('should validate board bounds', () => {
      const dimensions = coordinateSystem.getBoardDimensions()
      expect(coordinateSystem.isWithinBoardBounds(BOARD_CONFIG.BORDER_WIDTH, BOARD_CONFIG.BORDER_WIDTH)).toBe(true)
      expect(coordinateSystem.isWithinBoardBounds(dimensions.width + BOARD_CONFIG.BORDER_WIDTH, dimensions.height + BOARD_CONFIG.BORDER_WIDTH)).toBe(true)
      expect(coordinateSystem.isWithinBoardBounds(dimensions.width + BOARD_CONFIG.BORDER_WIDTH + 1, dimensions.height + BOARD_CONFIG.BORDER_WIDTH + 1)).toBe(false)
      expect(coordinateSystem.isWithinBoardBounds(-1, 0)).toBe(false)
    })
  })

  describe('responsive functionality', () => {
    it('should calculate responsive cell size for mobile', () => {
      const mobileSize = coordinateSystem.getResponsiveCellSize(480)
      expect(mobileSize).toBeLessThan(CELL_SIZE)
      expect(mobileSize).toBeGreaterThan(0)
    })

    it('should calculate responsive cell size for desktop', () => {
      const desktopSize = coordinateSystem.getResponsiveCellSize(1024)
      expect(desktopSize).toBe(CELL_SIZE)
    })

    it('should create responsive coordinate system', () => {
      const responsiveSystem = coordinateSystem.createResponsiveSystem(480)
      expect(responsiveSystem.getConfig().cellSize).toBeLessThan(CELL_SIZE)
    })
  })

  describe('DOM coordinate conversion', () => {
    it('should convert DOM coordinates to grid coordinates', () => {
      const mockRect: DOMRect = {
        left: 10,
        top: 20,
        width: 400,
        height: 400,
        right: 410,
        bottom: 420,
        x: 10,
        y: 20,
        toJSON: () => ({})
      }

      const domX = 10 + BOARD_CONFIG.BORDER_WIDTH + CELL_SIZE
      const domY = 20 + BOARD_CONFIG.BORDER_WIDTH + CELL_SIZE

      const result = coordinateSystem.domToGrid(domX, domY, mockRect)
      expect(result).toEqual({ x: 1, y: 1 })
    })
  })
})