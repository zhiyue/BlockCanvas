import { useState, useEffect } from 'react'

export interface DeviceCapabilities {
  isMobile: boolean
  hasTouch: boolean
  hasPointer: boolean
  orientation: 'portrait' | 'landscape'
  screenSize: 'small' | 'medium' | 'large'
  devicePixelRatio: number
  viewport: {
    width: number
    height: number
  }
}

export interface InteractionMode {
  primary: 'drag' | 'tap'
  supportsGestures: boolean
  supportsHover: boolean
}

export const useDeviceCapabilities = (): DeviceCapabilities & { interactionMode: InteractionMode } => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>(() => {
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const hasPointer = window.matchMedia('(pointer: fine)').matches
    const isMobile = hasTouch && !hasPointer
    
    return {
      isMobile,
      hasTouch,
      hasPointer,
      orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
      screenSize: getScreenSize(window.innerWidth),
      devicePixelRatio: window.devicePixelRatio || 1,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    }
  })

  const [interactionMode, setInteractionMode] = useState<InteractionMode>(() => {
    const hasTouch = capabilities.hasTouch
    const hasPointer = capabilities.hasPointer
    
    return {
      primary: hasTouch && !hasPointer ? 'tap' : 'drag',
      supportsGestures: hasTouch,
      supportsHover: hasPointer
    }
  })

  useEffect(() => {
    const updateCapabilities = () => {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const hasPointer = window.matchMedia('(pointer: fine)').matches
      const isMobile = hasTouch && !hasPointer
      
      const newCapabilities: DeviceCapabilities = {
        isMobile,
        hasTouch,
        hasPointer,
        orientation: window.innerWidth > window.innerHeight ? 'landscape' : 'portrait',
        screenSize: getScreenSize(window.innerWidth),
        devicePixelRatio: window.devicePixelRatio || 1,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }

      setCapabilities(newCapabilities)
      
      setInteractionMode({
        primary: hasTouch && !hasPointer ? 'tap' : 'drag',
        supportsGestures: hasTouch,
        supportsHover: hasPointer
      })
    }

    const mediaQueryLists = [
      window.matchMedia('(pointer: fine)'),
      window.matchMedia('(pointer: coarse)'),
      window.matchMedia('(orientation: portrait)'),
      window.matchMedia('(orientation: landscape)')
    ]

    // Listen for media query changes
    mediaQueryLists.forEach(mql => {
      mql.addEventListener('change', updateCapabilities)
    })

    // Listen for resize events
    window.addEventListener('resize', updateCapabilities)
    window.addEventListener('orientationchange', updateCapabilities)

    return () => {
      mediaQueryLists.forEach(mql => {
        mql.removeEventListener('change', updateCapabilities)
      })
      window.removeEventListener('resize', updateCapabilities)
      window.removeEventListener('orientationchange', updateCapabilities)
    }
  }, [])

  return {
    ...capabilities,
    interactionMode
  }
}

function getScreenSize(width: number): 'small' | 'medium' | 'large' {
  if (width < 768) return 'small'
  if (width < 1024) return 'medium'
  return 'large'
}

// Additional utility hooks
export const useMobileDetection = () => {
  const { isMobile, hasTouch, interactionMode } = useDeviceCapabilities()
  return {
    isMobile,
    hasTouch,
    prefersTouchInteraction: interactionMode.primary === 'tap'
  }
}

export const useResponsiveBreakpoints = () => {
  const { screenSize, viewport } = useDeviceCapabilities()
  return {
    screenSize,
    isSmall: screenSize === 'small',
    isMedium: screenSize === 'medium',
    isLarge: screenSize === 'large',
    viewport
  }
}

export const useInteractionCapabilities = () => {
  const { interactionMode, hasTouch, hasPointer } = useDeviceCapabilities()
  return {
    ...interactionMode,
    hasTouch,
    hasPointer,
    shouldShowMobileUI: interactionMode.primary === 'tap',
    shouldOptimizeForTouch: hasTouch
  }
}