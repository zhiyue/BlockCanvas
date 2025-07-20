import { useCallback, useRef, useMemo, useState, useEffect } from 'react'

// Throttle function for touch events
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCall = useRef<number>(0)
  const lastCallTimer = useRef<NodeJS.Timeout>()

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCall.current >= delay) {
      lastCall.current = now
      return callback(...args)
    } else {
      // Clear existing timer
      if (lastCallTimer.current) {
        clearTimeout(lastCallTimer.current)
      }
      
      // Set new timer
      lastCallTimer.current = setTimeout(() => {
        lastCall.current = Date.now()
        callback(...args)
      }, delay - (now - lastCall.current))
    }
  }, [callback, delay]) as T
}

// Debounce function for heavy operations
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>()

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T
}

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderCount = useRef(0)
  const renderTimes = useRef<number[]>([])
  const startTime = useRef<number>(performance.now())

  useEffect(() => {
    renderCount.current += 1
    const endTime = performance.now()
    const renderTime = endTime - startTime.current
    
    renderTimes.current.push(renderTime)
    
    // Keep only last 10 render times
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift()
    }
    
    startTime.current = performance.now()
    
    // Log performance warnings in development
    if (process.env.NODE_ENV === 'development') {
      const avgRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
      
      if (avgRenderTime > 16) { // 16ms = 60fps threshold
        console.warn(`[Performance] ${componentName} slow render: ${avgRenderTime.toFixed(2)}ms avg (${renderCount.current} renders)`)
      }
    }
  })

  return {
    renderCount: renderCount.current,
    averageRenderTime: renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length || 0
  }
}

// Optimized touch event handler
export const useOptimizedTouchHandler = () => {
  const touchCache = useRef<Map<number, Touch>>(new Map())
  const gestureState = useRef({
    isActive: false,
    startTime: 0,
    lastProcessed: 0
  })

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const now = performance.now()
    gestureState.current = {
      isActive: true,
      startTime: now,
      lastProcessed: now
    }

    // Cache touch points
    Array.from(event.touches).forEach(touch => {
      touchCache.current.set(touch.identifier, touch)
    })
  }, [])

  const handleTouchMove = useThrottledCallback((event: TouchEvent) => {
    if (!gestureState.current.isActive) return

    const now = performance.now()
    
    // Skip if processing too frequently (limit to 60fps)
    if (now - gestureState.current.lastProcessed < 16) {
      return
    }
    
    gestureState.current.lastProcessed = now
    
    // Update cache with current touches
    Array.from(event.touches).forEach(touch => {
      touchCache.current.set(touch.identifier, touch)
    })
  }, 16)

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    // Clean up cache for ended touches
    Array.from(event.changedTouches).forEach(touch => {
      touchCache.current.delete(touch.identifier)
    })

    if (touchCache.current.size === 0) {
      gestureState.current.isActive = false
    }
  }, [])

  const cleanup = useCallback(() => {
    touchCache.current.clear()
    gestureState.current.isActive = false
  }, [])

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    cleanup,
    isActive: gestureState.current.isActive,
    activeTouches: touchCache.current.size
  }
}

// Passive event listener optimization
export const usePassiveEventListener = (
  eventName: string,
  handler: EventListener,
  element: EventTarget | null = null,
  options: AddEventListenerOptions = { passive: true }
) => {
  useEffect(() => {
    const target = element || window
    if (!target) return

    const optimizedHandler = (event: Event) => {
      // Use requestAnimationFrame for non-critical updates
      if (options.passive) {
        requestAnimationFrame(() => handler(event))
      } else {
        handler(event)
      }
    }

    target.addEventListener(eventName, optimizedHandler, options)
    
    return () => {
      target.removeEventListener(eventName, optimizedHandler, options)
    }
  }, [eventName, handler, element, options])
}

// Optimized state updates for animations
export const useAnimationState = <T>(initialValue: T, updateDelay = 16) => {
  const [state, setState] = useState<T>(initialValue)
  const pendingUpdate = useRef<T | null>(null)
  const updateTimer = useRef<number>()

  const setStateOptimized = useCallback((newValue: T | ((prev: T) => T)) => {
    const resolvedValue = typeof newValue === 'function' 
      ? (newValue as (prev: T) => T)(pendingUpdate.current || state)
      : newValue

    pendingUpdate.current = resolvedValue

    if (updateTimer.current) {
      cancelAnimationFrame(updateTimer.current)
    }

    updateTimer.current = requestAnimationFrame(() => {
      if (pendingUpdate.current !== null) {
        setState(pendingUpdate.current)
        pendingUpdate.current = null
      }
    })
  }, [state])

  useEffect(() => {
    return () => {
      if (updateTimer.current) {
        cancelAnimationFrame(updateTimer.current)
      }
    }
  }, [])

  return [state, setStateOptimized] as const
}

// Memory optimization for large component trees
export const useMemoizedChildren = <T extends Record<string, any>>(
  children: React.ReactNode,
  dependencies: T
) => {
  return useMemo(() => children, Object.values(dependencies))
}

// Touch interaction optimization
export const useTouchOptimization = () => {
  const [touchSupport] = useState(() => {
    return {
      hasTouch: 'ontouchstart' in window,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      supportsPassive: (() => {
        let supportsPassive = false
        try {
          const opts = Object.defineProperty({}, 'passive', {
            get() {
              supportsPassive = true
              return false
            }
          })
          window.addEventListener('testPassive', () => {}, opts)
          window.removeEventListener('testPassive', () => {}, opts)
        } catch (e) {}
        return supportsPassive
      })()
    }
  })

  const getOptimalEventOptions = useCallback((eventType: string) => {
    const isPassiveEvent = ['touchstart', 'touchmove', 'wheel', 'scroll'].includes(eventType)
    
    return {
      passive: isPassiveEvent && touchSupport.supportsPassive,
      capture: false
    }
  }, [touchSupport.supportsPassive])

  return {
    touchSupport,
    getOptimalEventOptions
  }
}

export default {
  useThrottledCallback,
  useDebouncedCallback,
  usePerformanceMonitor,
  useOptimizedTouchHandler,
  usePassiveEventListener,
  useAnimationState,
  useMemoizedChildren,
  useTouchOptimization
}