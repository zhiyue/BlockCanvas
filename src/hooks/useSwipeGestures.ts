import { useRef, useCallback, useEffect } from 'react'

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  minDistance?: number
  maxTime?: number
  preventDefaultTouch?: boolean
  enabled?: boolean
}

export interface SwipeState {
  startX: number
  startY: number
  startTime: number
  isSwiping: boolean
  currentX: number
  currentY: number
}

export const useSwipeGestures = ({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  minDistance = 50,
  maxTime = 500,
  preventDefaultTouch = true,
  enabled = true
}: SwipeGestureOptions) => {
  const swipeState = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    isSwiping: false,
    currentX: 0,
    currentY: 0
  })

  const getEventCoordinates = (event: TouchEvent | MouseEvent) => {
    if ('touches' in event && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      }
    } else if ('clientX' in event) {
      return {
        x: event.clientX,
        y: event.clientY
      }
    }
    return { x: 0, y: 0 }
  }

  const handleStart = useCallback((event: TouchEvent | MouseEvent) => {
    if (!enabled) return

    const coords = getEventCoordinates(event)
    swipeState.current = {
      startX: coords.x,
      startY: coords.y,
      startTime: Date.now(),
      isSwiping: true,
      currentX: coords.x,
      currentY: coords.y
    }

    // Remove preventDefault from touch start to avoid passive event listener warning
    // Modern browsers make touch events passive by default for better scrolling performance
  }, [enabled])

  const handleMove = useCallback((event: TouchEvent | MouseEvent) => {
    if (!enabled || !swipeState.current.isSwiping) return

    const coords = getEventCoordinates(event)
    swipeState.current.currentX = coords.x
    swipeState.current.currentY = coords.y

    // Remove preventDefault from touch move to avoid passive event listener warning
  }, [enabled])

  const handleEnd = useCallback((event: TouchEvent | MouseEvent) => {
    if (!enabled || !swipeState.current.isSwiping) return

    const state = swipeState.current
    const endTime = Date.now()
    const duration = endTime - state.startTime

    // Reset swipe state
    swipeState.current.isSwiping = false

    // Check if swipe was too slow
    if (duration > maxTime) return

    const deltaX = state.currentX - state.startX
    const deltaY = state.currentY - state.startY
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Check if swipe distance is sufficient
    const maxDelta = Math.max(absDeltaX, absDeltaY)
    if (maxDelta < minDistance) return

    // Determine swipe direction (prioritize the axis with greater movement)
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight()
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft()
      }
    } else {
      // Vertical swipe
      if (deltaY > 0 && onSwipeDown) {
        onSwipeDown()
      } else if (deltaY < 0 && onSwipeUp) {
        onSwipeUp()
      }
    }
  }, [enabled, maxTime, minDistance, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  const touchHandlers = {
    onTouchStart: handleStart,
    onTouchMove: handleMove,
    onTouchEnd: handleEnd,
    onTouchCancel: () => {
      swipeState.current.isSwiping = false
    }
  }

  const mouseHandlers = {
    onMouseDown: handleStart,
    onMouseMove: handleMove,
    onMouseUp: handleEnd,
    onMouseLeave: () => {
      swipeState.current.isSwiping = false
    }
  }

  // Combined handlers for elements that support both touch and mouse
  const gestureHandlers = {
    ...touchHandlers,
    ...mouseHandlers
  }

  return {
    gestureHandlers,
    touchHandlers,
    mouseHandlers,
    isSwipeActive: swipeState.current.isSwiping
  }
}

// Specialized hook for block rotation gestures
export const useBlockRotationGestures = ({
  onRotateClockwise,
  onRotateCounterClockwise,
  enabled = true
}: {
  onRotateClockwise?: () => void
  onRotateCounterClockwise?: () => void
  enabled?: boolean
}) => {
  return useSwipeGestures({
    onSwipeLeft: onRotateCounterClockwise,
    onSwipeRight: onRotateClockwise,
    minDistance: 40,
    maxTime: 400,
    enabled
  })
}

// Hook for inventory gestures (swipe up to place, down to return)
export const useInventoryGestures = ({
  onSwipeToPlace,
  onSwipeToReturn,
  enabled = true
}: {
  onSwipeToPlace?: () => void
  onSwipeToReturn?: () => void
  enabled?: boolean
}) => {
  return useSwipeGestures({
    onSwipeUp: onSwipeToPlace,
    onSwipeDown: onSwipeToReturn,
    minDistance: 60,
    maxTime: 600,
    enabled
  })
}

export default useSwipeGestures