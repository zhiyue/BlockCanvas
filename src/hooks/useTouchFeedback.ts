import { useRef, useCallback } from 'react'

export interface TouchFeedbackOptions {
  enableRipple?: boolean
  enableHaptic?: boolean
  rippleColor?: string
  rippleDuration?: number
}

export const useTouchFeedback = ({
  enableRipple = true,
  enableHaptic = true,
  rippleColor = 'rgba(255, 255, 255, 0.6)',
  rippleDuration = 600
}: TouchFeedbackOptions = {}) => {
  const rippleRef = useRef<HTMLDivElement>(null)

  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptic) return

    // Modern browsers with Vibration API
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      }
      navigator.vibrate(patterns[type])
    }

    // iOS Safari haptic feedback (if available)
    if ('hapticEngine' in window) {
      try {
        // @ts-ignore - iOS specific API
        window.hapticEngine.impactOccurred(type)
      } catch (e) {
        // Silently fail if not available
      }
    }
  }, [enableHaptic])

  const createRipple = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!enableRipple || !rippleRef.current) return

    const element = rippleRef.current
    const rect = element.getBoundingClientRect()
    
    // Get touch/click position
    let clientX: number, clientY: number
    
    if ('touches' in event && event.touches.length > 0) {
      clientX = event.touches[0].clientX
      clientY = event.touches[0].clientY
    } else if ('clientX' in event) {
      clientX = event.clientX
      clientY = event.clientY
    } else {
      // Fallback to center of element
      clientX = rect.left + rect.width / 2
      clientY = rect.top + rect.height / 2
    }

    const x = clientX - rect.left
    const y = clientY - rect.top

    // Calculate ripple size (distance to farthest corner)
    const size = Math.sqrt(
      Math.max(
        Math.pow(x, 2) + Math.pow(y, 2),
        Math.pow(rect.width - x, 2) + Math.pow(y, 2),
        Math.pow(x, 2) + Math.pow(rect.height - y, 2),
        Math.pow(rect.width - x, 2) + Math.pow(rect.height - y, 2)
      )
    ) * 2

    // Create ripple element
    const ripple = document.createElement('div')
    ripple.className = 'touch-ripple'
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background-color: ${rippleColor};
      pointer-events: none;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      transform: scale(0);
      animation: ripple-animation ${rippleDuration}ms ease-out;
      z-index: 1000;
    `

    // Add ripple to element
    element.appendChild(ripple)

    // Remove ripple after animation
    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, rippleDuration)
  }, [enableRipple, rippleColor, rippleDuration])

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    createRipple(event)
    triggerHapticFeedback('light')
  }, [createRipple, triggerHapticFeedback])

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    // Only create ripple for mouse if no touch support
    if (!('ontouchstart' in window)) {
      createRipple(event)
    }
  }, [createRipple])

  return {
    rippleRef,
    handleTouchStart,
    handleMouseDown,
    triggerHapticFeedback,
    createRipple
  }
}

// Utility hook for simple button feedback
export const useButtonFeedback = (options?: TouchFeedbackOptions) => {
  const feedback = useTouchFeedback(options)
  
  return {
    ...feedback,
    buttonProps: {
      ref: feedback.rippleRef,
      onTouchStart: feedback.handleTouchStart,
      onMouseDown: feedback.handleMouseDown,
      style: { position: 'relative' as const, overflow: 'hidden' as const }
    }
  }
}

// CSS injection for ripple animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @keyframes ripple-animation {
      0% {
        transform: scale(0);
        opacity: 1;
      }
      50% {
        transform: scale(0.5);
        opacity: 0.8;
      }
      100% {
        transform: scale(1);
        opacity: 0;
      }
    }

    .touch-ripple {
      will-change: transform, opacity;
    }

    /* Reduce motion for accessibility */
    @media (prefers-reduced-motion: reduce) {
      .touch-ripple {
        animation: none !important;
        opacity: 0 !important;
      }
    }
  `
  document.head.appendChild(style)
}