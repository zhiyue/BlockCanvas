import { useRef, useCallback } from 'react'

interface UseDoubleClickOptions {
  onSingleClick?: () => void
  onDoubleClick?: () => void
  timeout?: number
}

export const useDoubleClick = ({ 
  onSingleClick, 
  onDoubleClick, 
  timeout = 300 
}: UseDoubleClickOptions) => {
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const clickCountRef = useRef(0)

  const handleClick = useCallback(() => {
    clickCountRef.current += 1

    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current)
    }

    clickTimeoutRef.current = setTimeout(() => {
      if (clickCountRef.current === 1) {
        // Single click
        onSingleClick?.()
      } else if (clickCountRef.current === 2) {
        // Double click
        onDoubleClick?.()
      }
      
      clickCountRef.current = 0
      clickTimeoutRef.current = null
    }, timeout)
  }, [onSingleClick, onDoubleClick, timeout])

  return handleClick
}

// Touch-specific double tap handler
interface UseDoubleTapOptions {
  onSingleTap?: () => void
  onDoubleTap?: () => void
  timeout?: number
  enabled?: boolean
}

export const useDoubleTap = ({ 
  onSingleTap, 
  onDoubleTap, 
  timeout = 300,
  enabled = true
}: UseDoubleTapOptions) => {
  const lastTapRef = useRef<number>(0)
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (!enabled) {
      onSingleTap?.()
      return
    }

    const now = Date.now()
    const timeSinceLastTap = now - lastTapRef.current

    if (timeSinceLastTap < timeout && timeSinceLastTap > 50) {
      // Double tap detected
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
        tapTimeoutRef.current = null
      }
      
      onDoubleTap?.()
      lastTapRef.current = 0 // Reset to prevent triple tap
    } else {
      // Potential first tap
      lastTapRef.current = now
      
      // Clear any existing timeout
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current)
      }
      
      // Set timeout for single tap
      tapTimeoutRef.current = setTimeout(() => {
        onSingleTap?.()
        tapTimeoutRef.current = null
      }, timeout)
    }
  }, [onSingleTap, onDoubleTap, timeout, enabled])

  return { onTouchStart: handleTouchStart }
}

// Combined hook for both mouse and touch
export const useMultiModalDoubleInteraction = ({
  onSingleClick,
  onDoubleClick,
  onSingleTap,
  onDoubleTap,
  timeout = 300,
  touchEnabled = true
}: {
  onSingleClick?: () => void
  onDoubleClick?: () => void
  onSingleTap?: () => void
  onDoubleTap?: () => void
  timeout?: number
  touchEnabled?: boolean
}) => {
  const doubleClick = useDoubleClick({
    onSingleClick,
    onDoubleClick,
    timeout
  })

  const doubleTap = useDoubleTap({
    onSingleTap: onSingleTap || onSingleClick,
    onDoubleTap: onDoubleTap || onDoubleClick,
    timeout,
    enabled: touchEnabled
  })

  return {
    onClick: doubleClick,
    ...doubleTap
  }
}