import React, { forwardRef } from 'react'
import { useTouchFeedback, TouchFeedbackOptions } from '../hooks/useTouchFeedback'
import './TouchFeedback.css'

interface TouchFeedbackProps extends TouchFeedbackOptions {
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
  className?: string
  style?: React.CSSProperties
  onClick?: (event: React.MouseEvent) => void
  onTouchStart?: (event: React.TouchEvent) => void
  onMouseDown?: (event: React.MouseEvent) => void
  disabled?: boolean
  variant?: 'subtle' | 'prominent' | 'button'
  [key: string]: any
}

export const TouchFeedback = forwardRef<HTMLElement, TouchFeedbackProps>(({
  children,
  as: Component = 'div',
  className = '',
  style = {},
  onClick,
  onTouchStart: originalTouchStart,
  onMouseDown: originalMouseDown,
  disabled = false,
  variant = 'subtle',
  enableRipple = true,
  enableHaptic = true,
  rippleColor,
  rippleDuration = 600,
  ...props
}, ref) => {
  const {
    rippleRef,
    handleTouchStart,
    handleMouseDown,
    triggerHapticFeedback
  } = useTouchFeedback({
    enableRipple: enableRipple && !disabled,
    enableHaptic: enableHaptic && !disabled,
    rippleColor: rippleColor || getRippleColor(variant),
    rippleDuration
  })

  const handleClick = (event: React.MouseEvent) => {
    if (!disabled) {
      triggerHapticFeedback('light')
      onClick?.(event)
    }
  }

  const handleTouchStartCombined = (event: React.TouchEvent) => {
    if (!disabled) {
      handleTouchStart(event)
      originalTouchStart?.(event)
    }
  }

  const handleMouseDownCombined = (event: React.MouseEvent) => {
    if (!disabled) {
      handleMouseDown(event)
      originalMouseDown?.(event)
    }
  }

  const combinedClassName = `touch-feedback touch-feedback--${variant} ${className} ${disabled ? 'touch-feedback--disabled' : ''}`.trim()

  const combinedStyle = {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    ...style
  }

  return React.createElement(Component, {
    ...props,
    disabled,
    ref: (el: HTMLElement) => {
      // Handle both callback and object refs
      if (typeof ref === 'function') {
        ref(el)
      } else if (ref) {
        ref.current = el
      }
      
      // Set our internal ref
      if (rippleRef) {
        rippleRef.current = el
      }
    },
    className: combinedClassName,
    style: combinedStyle,
    onClick: handleClick,
    onTouchStart: handleTouchStartCombined,
    onMouseDown: handleMouseDownCombined,
    children
  })
})

TouchFeedback.displayName = 'TouchFeedback'

function getRippleColor(variant: string): string {
  switch (variant) {
    case 'button':
      return 'rgba(255, 255, 255, 0.8)'
    case 'prominent':
      return 'rgba(79, 70, 229, 0.3)'
    case 'subtle':
    default:
      return 'rgba(255, 255, 255, 0.4)'
  }
}

// Specialized button component with enhanced feedback
export const TouchButton = forwardRef<HTMLButtonElement, Omit<TouchFeedbackProps, 'as'>>(
  (props, ref) => (
    <TouchFeedback
      {...props}
      as="button"
      variant="button"
      ref={ref}
    />
  )
)

TouchButton.displayName = 'TouchButton'

export default TouchFeedback