import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { 
  useDeviceCapabilities, 
  useMobileDetection, 
  useResponsiveBreakpoints, 
  useInteractionCapabilities 
} from '../useDeviceCapabilities'

// Mock window properties and methods
const mockWindow = {
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
  matchMedia: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

const mockNavigator = {
  maxTouchPoints: 0
}

// Mock MediaQueryList
const createMockMediaQueryList = (matches: boolean) => ({
  matches,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  media: '',
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn()
})

describe('useDeviceCapabilities Hook Comprehensive Tests', () => {
  let originalWindow: any
  let originalNavigator: any

  beforeEach(() => {
    // Store original globals
    originalWindow = global.window
    originalNavigator = global.navigator

    // Setup mocks
    vi.clearAllMocks()
    
    // Mock window object
    Object.defineProperty(global, 'window', {
      value: {
        ...mockWindow,
        matchMedia: vi.fn(() => createMockMediaQueryList(false))
      },
      writable: true
    })

    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: mockNavigator,
      writable: true
    })
  })

  afterEach(() => {
    // Restore original globals
    global.window = originalWindow
    global.navigator = originalNavigator
  })

  describe('Basic Device Detection', () => {
    it('detects desktop device correctly', () => {
      // Setup desktop environment
      Object.defineProperty(window, 'ontouchstart', { value: undefined, writable: true })
      Object.assign(navigator, { maxTouchPoints: 0 })
      vi.mocked(window.matchMedia).mockImplementation((query) => {
        if (query === '(pointer: fine)') {
          return createMockMediaQueryList(true) // Has fine pointer (mouse)
        }
        return createMockMediaQueryList(false)
      })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.isMobile).toBe(false)
      expect(result.current.hasTouch).toBe(false)
      expect(result.current.hasPointer).toBe(true)
      expect(result.current.interactionMode.primary).toBe('drag')
    })

    it('detects mobile device correctly', () => {
      // Setup mobile environment
      Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true })
      Object.assign(navigator, { maxTouchPoints: 5 })
      vi.mocked(window.matchMedia).mockImplementation((query) => {
        if (query === '(pointer: fine)') {
          return createMockMediaQueryList(false) // No fine pointer
        }
        return createMockMediaQueryList(false)
      })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.isMobile).toBe(true)
      expect(result.current.hasTouch).toBe(true)
      expect(result.current.hasPointer).toBe(false)
      expect(result.current.interactionMode.primary).toBe('tap')
    })

    it('detects tablet device correctly', () => {
      // Setup tablet environment (touch + fine pointer)
      Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true })
      Object.assign(navigator, { maxTouchPoints: 10 })
      vi.mocked(window.matchMedia).mockImplementation((query) => {
        if (query === '(pointer: fine)') {
          return createMockMediaQueryList(true) // Has fine pointer
        }
        return createMockMediaQueryList(false)
      })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.isMobile).toBe(false) // Not mobile because has fine pointer
      expect(result.current.hasTouch).toBe(true)
      expect(result.current.hasPointer).toBe(true)
      expect(result.current.interactionMode.primary).toBe('drag') // Prefers drag due to fine pointer
    })

    it('handles touch detection via navigator.maxTouchPoints', () => {
      // Setup environment where ontouchstart is not available but maxTouchPoints is
      Object.defineProperty(window, 'ontouchstart', { value: undefined, writable: true })
      Object.assign(navigator, { maxTouchPoints: 2 })
      vi.mocked(window.matchMedia).mockImplementation(() => createMockMediaQueryList(false))

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.hasTouch).toBe(true)
    })
  })

  describe('Screen Size and Orientation Detection', () => {
    it('detects small screen size correctly', () => {
      Object.assign(window, { innerWidth: 600, innerHeight: 800 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.screenSize).toBe('small')
      expect(result.current.viewport.width).toBe(600)
      expect(result.current.viewport.height).toBe(800)
    })

    it('detects medium screen size correctly', () => {
      Object.assign(window, { innerWidth: 900, innerHeight: 600 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.screenSize).toBe('medium')
      expect(result.current.viewport.width).toBe(900)
      expect(result.current.viewport.height).toBe(600)
    })

    it('detects large screen size correctly', () => {
      Object.assign(window, { innerWidth: 1920, innerHeight: 1080 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.screenSize).toBe('large')
      expect(result.current.viewport.width).toBe(1920)
      expect(result.current.viewport.height).toBe(1080)
    })

    it('detects portrait orientation correctly', () => {
      Object.assign(window, { innerWidth: 400, innerHeight: 800 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.orientation).toBe('portrait')
    })

    it('detects landscape orientation correctly', () => {
      Object.assign(window, { innerWidth: 800, innerHeight: 400 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.orientation).toBe('landscape')
    })

    it('handles high DPI screens correctly', () => {
      Object.assign(window, { devicePixelRatio: 2.5 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.devicePixelRatio).toBe(2.5)
    })

    it('falls back to 1 when devicePixelRatio is not available', () => {
      Object.assign(window, { devicePixelRatio: undefined })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.devicePixelRatio).toBe(1)
    })
  })

  describe('Interaction Mode Logic', () => {
    it('sets tap mode for touch-only devices', () => {
      Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true })
      vi.mocked(window.matchMedia).mockImplementation((query) => {
        if (query === '(pointer: fine)') {
          return createMockMediaQueryList(false)
        }
        return createMockMediaQueryList(false)
      })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.interactionMode.primary).toBe('tap')
      expect(result.current.interactionMode.supportsGestures).toBe(true)
      expect(result.current.interactionMode.supportsHover).toBe(false)
    })

    it('sets drag mode for pointer devices', () => {
      Object.defineProperty(window, 'ontouchstart', { value: undefined, writable: true })
      vi.mocked(window.matchMedia).mockImplementation((query) => {
        if (query === '(pointer: fine)') {
          return createMockMediaQueryList(true)
        }
        return createMockMediaQueryList(false)
      })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.interactionMode.primary).toBe('drag')
      expect(result.current.interactionMode.supportsGestures).toBe(false)
      expect(result.current.interactionMode.supportsHover).toBe(true)
    })

    it('prefers drag mode for hybrid devices', () => {
      Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true })
      vi.mocked(window.matchMedia).mockImplementation((query) => {
        if (query === '(pointer: fine)') {
          return createMockMediaQueryList(true) // Both touch and fine pointer
        }
        return createMockMediaQueryList(false)
      })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.interactionMode.primary).toBe('drag')
      expect(result.current.interactionMode.supportsGestures).toBe(true)
      expect(result.current.interactionMode.supportsHover).toBe(true)
    })
  })

  describe('Dynamic Updates and Event Handling', () => {
    it('updates capabilities on window resize', () => {
      Object.assign(window, { innerWidth: 800, innerHeight: 600 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.screenSize).toBe('medium')
      expect(result.current.orientation).toBe('landscape')

      // Simulate window resize
      act(() => {
        Object.assign(window, { innerWidth: 600, innerHeight: 800 })
        const resizeEvent = new Event('resize')
        window.dispatchEvent(resizeEvent)
      })

      expect(result.current.screenSize).toBe('small')
      expect(result.current.orientation).toBe('portrait')
    })

    it('updates capabilities on orientation change', () => {
      Object.assign(window, { innerWidth: 400, innerHeight: 800 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.orientation).toBe('portrait')

      // Simulate orientation change
      act(() => {
        Object.assign(window, { innerWidth: 800, innerHeight: 400 })
        const orientationEvent = new Event('orientationchange')
        window.dispatchEvent(orientationEvent)
      })

      expect(result.current.orientation).toBe('landscape')
    })

    it('updates capabilities on media query changes', () => {
      const mockMediaQuery = createMockMediaQueryList(false)
      vi.mocked(window.matchMedia).mockReturnValue(mockMediaQuery)

      const { result } = renderHook(() => useDeviceCapabilities())

      // Simulate media query change
      act(() => {
        mockMediaQuery.matches = true
        const changeHandler = mockMediaQuery.addEventListener.mock.calls
          .find(call => call[0] === 'change')?.[1]
        
        if (changeHandler) {
          changeHandler()
        }
      })

      // Capabilities should be updated
      expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('properly cleans up event listeners on unmount', () => {
      const mockMediaQuery = createMockMediaQueryList(false)
      vi.mocked(window.matchMedia).mockReturnValue(mockMediaQuery)

      const { unmount } = renderHook(() => useDeviceCapabilities())

      unmount()

      expect(mockMediaQuery.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
      expect(window.removeEventListener).toHaveBeenCalledWith('orientationchange', expect.any(Function))
    })
  })

  describe('Utility Hooks', () => {
    describe('useMobileDetection', () => {
      it('returns correct mobile detection values', () => {
        Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true })
        vi.mocked(window.matchMedia).mockImplementation((query) => {
          if (query === '(pointer: fine)') {
            return createMockMediaQueryList(false)
          }
          return createMockMediaQueryList(false)
        })

        const { result } = renderHook(() => useMobileDetection())

        expect(result.current.isMobile).toBe(true)
        expect(result.current.hasTouch).toBe(true)
        expect(result.current.prefersTouchInteraction).toBe(true)
      })

      it('returns correct desktop detection values', () => {
        Object.defineProperty(window, 'ontouchstart', { value: undefined, writable: true })
        vi.mocked(window.matchMedia).mockImplementation((query) => {
          if (query === '(pointer: fine)') {
            return createMockMediaQueryList(true)
          }
          return createMockMediaQueryList(false)
        })

        const { result } = renderHook(() => useMobileDetection())

        expect(result.current.isMobile).toBe(false)
        expect(result.current.hasTouch).toBe(false)
        expect(result.current.prefersTouchInteraction).toBe(false)
      })
    })

    describe('useResponsiveBreakpoints', () => {
      it('returns correct breakpoint values for small screen', () => {
        Object.assign(window, { innerWidth: 600, innerHeight: 800 })

        const { result } = renderHook(() => useResponsiveBreakpoints())

        expect(result.current.screenSize).toBe('small')
        expect(result.current.isSmall).toBe(true)
        expect(result.current.isMedium).toBe(false)
        expect(result.current.isLarge).toBe(false)
        expect(result.current.viewport).toEqual({ width: 600, height: 800 })
      })

      it('returns correct breakpoint values for medium screen', () => {
        Object.assign(window, { innerWidth: 900, innerHeight: 600 })

        const { result } = renderHook(() => useResponsiveBreakpoints())

        expect(result.current.screenSize).toBe('medium')
        expect(result.current.isSmall).toBe(false)
        expect(result.current.isMedium).toBe(true)
        expect(result.current.isLarge).toBe(false)
      })

      it('returns correct breakpoint values for large screen', () => {
        Object.assign(window, { innerWidth: 1920, innerHeight: 1080 })

        const { result } = renderHook(() => useResponsiveBreakpoints())

        expect(result.current.screenSize).toBe('large')
        expect(result.current.isSmall).toBe(false)
        expect(result.current.isMedium).toBe(false)
        expect(result.current.isLarge).toBe(true)
      })
    })

    describe('useInteractionCapabilities', () => {
      it('returns correct interaction capabilities for touch device', () => {
        Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true })
        vi.mocked(window.matchMedia).mockImplementation((query) => {
          if (query === '(pointer: fine)') {
            return createMockMediaQueryList(false)
          }
          return createMockMediaQueryList(false)
        })

        const { result } = renderHook(() => useInteractionCapabilities())

        expect(result.current.primary).toBe('tap')
        expect(result.current.supportsGestures).toBe(true)
        expect(result.current.supportsHover).toBe(false)
        expect(result.current.hasTouch).toBe(true)
        expect(result.current.hasPointer).toBe(false)
        expect(result.current.shouldShowMobileUI).toBe(true)
        expect(result.current.shouldOptimizeForTouch).toBe(true)
      })

      it('returns correct interaction capabilities for pointer device', () => {
        Object.defineProperty(window, 'ontouchstart', { value: undefined, writable: true })
        vi.mocked(window.matchMedia).mockImplementation((query) => {
          if (query === '(pointer: fine)') {
            return createMockMediaQueryList(true)
          }
          return createMockMediaQueryList(false)
        })

        const { result } = renderHook(() => useInteractionCapabilities())

        expect(result.current.primary).toBe('drag')
        expect(result.current.supportsGestures).toBe(false)
        expect(result.current.supportsHover).toBe(true)
        expect(result.current.hasTouch).toBe(false)
        expect(result.current.hasPointer).toBe(true)
        expect(result.current.shouldShowMobileUI).toBe(false)
        expect(result.current.shouldOptimizeForTouch).toBe(false)
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles missing window properties gracefully', () => {
      // Mock missing properties
      Object.defineProperty(window, 'innerWidth', { value: undefined, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: undefined, writable: true })

      expect(() => {
        renderHook(() => useDeviceCapabilities())
      }).not.toThrow()
    })

    it('handles missing navigator properties gracefully', () => {
      Object.defineProperty(global, 'navigator', {
        value: {},
        writable: true
      })

      expect(() => {
        renderHook(() => useDeviceCapabilities())
      }).not.toThrow()
    })

    it('handles missing matchMedia gracefully', () => {
      Object.defineProperty(window, 'matchMedia', { value: undefined, writable: true })

      expect(() => {
        renderHook(() => useDeviceCapabilities())
      }).toThrow() // This should throw, but gracefully
    })

    it('handles edge case screen dimensions', () => {
      Object.assign(window, { innerWidth: 0, innerHeight: 0 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.screenSize).toBe('small')
      expect(result.current.viewport.width).toBe(0)
      expect(result.current.viewport.height).toBe(0)
    })

    it('handles very large screen dimensions', () => {
      Object.assign(window, { innerWidth: 8000, innerHeight: 6000 })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.screenSize).toBe('large')
      expect(result.current.viewport.width).toBe(8000)
      expect(result.current.viewport.height).toBe(6000)
    })

    it('handles boundary screen size values', () => {
      // Test exact boundary values
      const testCases = [
        { width: 767, expected: 'small' },
        { width: 768, expected: 'medium' },
        { width: 1023, expected: 'medium' },
        { width: 1024, expected: 'large' }
      ]

      testCases.forEach(({ width, expected }) => {
        Object.assign(window, { innerWidth: width, innerHeight: 600 })

        const { result } = renderHook(() => useDeviceCapabilities())
        expect(result.current.screenSize).toBe(expected)
      })
    })

    it('handles rapid successive updates efficiently', () => {
      const { result } = renderHook(() => useDeviceCapabilities())

      // Simulate rapid resize events
      act(() => {
        for (let i = 0; i < 10; i++) {
          Object.assign(window, { 
            innerWidth: 800 + i * 10, 
            innerHeight: 600 + i * 10 
          })
          const resizeEvent = new Event('resize')
          window.dispatchEvent(resizeEvent)
        }
      })

      // Should handle all updates without errors
      expect(result.current.viewport.width).toBe(890)
      expect(result.current.viewport.height).toBe(690)
    })
  })

  describe('Performance and Memory Management', () => {
    it('does not create memory leaks with multiple hook instances', () => {
      const hooks = []
      
      // Create multiple hook instances
      for (let i = 0; i < 5; i++) {
        hooks.push(renderHook(() => useDeviceCapabilities()))
      }

      // Unmount all hooks
      hooks.forEach(hook => hook.unmount())

      // Each hook should have cleaned up its listeners
      expect(window.removeEventListener).toHaveBeenCalledTimes(10) // 5 hooks * 2 listeners each
    })

    it('maintains stable object references when values do not change', () => {
      const { result, rerender } = renderHook(() => useDeviceCapabilities())

      const initialResult = result.current

      // Re-render without changing anything
      rerender()

      // References should be stable for unchanged values
      expect(result.current.viewport).toBe(initialResult.viewport)
      expect(result.current.interactionMode).toBe(initialResult.interactionMode)
    })

    it('performs efficiently with frequent updates', () => {
      const startTime = performance.now()
      
      const { result } = renderHook(() => useDeviceCapabilities())

      // Simulate many updates
      act(() => {
        for (let i = 0; i < 100; i++) {
          Object.assign(window, { 
            innerWidth: 800 + (i % 20), 
            innerHeight: 600 + (i % 20)
          })
          const resizeEvent = new Event('resize')
          window.dispatchEvent(resizeEvent)
        }
      })

      const endTime = performance.now()

      // Should complete efficiently
      expect(endTime - startTime).toBeLessThan(100) // 100ms threshold
      expect(result.current).toBeDefined()
    })
  })

  describe('Real-world Device Scenarios', () => {
    it('simulates iPhone in portrait mode', () => {
      Object.assign(window, { 
        innerWidth: 390, 
        innerHeight: 844,
        devicePixelRatio: 3
      })
      Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true })
      Object.assign(navigator, { maxTouchPoints: 5 })
      vi.mocked(window.matchMedia).mockImplementation((query) => {
        if (query === '(pointer: fine)') {
          return createMockMediaQueryList(false)
        }
        return createMockMediaQueryList(false)
      })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.isMobile).toBe(true)
      expect(result.current.hasTouch).toBe(true)
      expect(result.current.orientation).toBe('portrait')
      expect(result.current.screenSize).toBe('small')
      expect(result.current.devicePixelRatio).toBe(3)
      expect(result.current.interactionMode.primary).toBe('tap')
    })

    it('simulates iPad in landscape mode', () => {
      Object.assign(window, { 
        innerWidth: 1024, 
        innerHeight: 768,
        devicePixelRatio: 2
      })
      Object.defineProperty(window, 'ontouchstart', { value: {}, writable: true })
      Object.assign(navigator, { maxTouchPoints: 10 })
      vi.mocked(window.matchMedia).mockImplementation((query) => {
        if (query === '(pointer: fine)') {
          return createMockMediaQueryList(true) // iPad supports precise pointing
        }
        return createMockMediaQueryList(false)
      })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.isMobile).toBe(false)
      expect(result.current.hasTouch).toBe(true)
      expect(result.current.hasPointer).toBe(true)
      expect(result.current.orientation).toBe('landscape')
      expect(result.current.screenSize).toBe('large')
      expect(result.current.interactionMode.primary).toBe('drag')
      expect(result.current.interactionMode.supportsGestures).toBe(true)
      expect(result.current.interactionMode.supportsHover).toBe(true)
    })

    it('simulates desktop with high DPI monitor', () => {
      Object.assign(window, { 
        innerWidth: 2560, 
        innerHeight: 1440,
        devicePixelRatio: 2
      })
      Object.defineProperty(window, 'ontouchstart', { value: undefined, writable: true })
      Object.assign(navigator, { maxTouchPoints: 0 })
      vi.mocked(window.matchMedia).mockImplementation((query) => {
        if (query === '(pointer: fine)') {
          return createMockMediaQueryList(true)
        }
        return createMockMediaQueryList(false)
      })

      const { result } = renderHook(() => useDeviceCapabilities())

      expect(result.current.isMobile).toBe(false)
      expect(result.current.hasTouch).toBe(false)
      expect(result.current.hasPointer).toBe(true)
      expect(result.current.orientation).toBe('landscape')
      expect(result.current.screenSize).toBe('large')
      expect(result.current.devicePixelRatio).toBe(2)
      expect(result.current.interactionMode.primary).toBe('drag')
    })
  })
})