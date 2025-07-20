import React, { useEffect, useState } from 'react';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import './SwipeIndicator.css';

interface SwipeIndicatorProps {
  show?: boolean;
  direction?: 'horizontal' | 'vertical' | 'both';
  action?: string;
  position?: 'top' | 'bottom' | 'center';
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const SwipeIndicator: React.FC<SwipeIndicatorProps> = ({
  show = true,
  direction = 'horizontal',
  action = 'Swipe to rotate',
  position = 'center',
  autoHide = true,
  autoHideDelay = 3000
}) => {
  const { hasTouch } = useDeviceCapabilities();
  const [isVisible, setIsVisible] = useState(show && hasTouch);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    setIsVisible(show && hasTouch && !hasInteracted);
  }, [show, hasTouch, hasInteracted]);

  useEffect(() => {
    if (autoHide && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, isVisible]);

  useEffect(() => {
    const handleTouch = () => {
      setHasInteracted(true);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('touchstart', handleTouch, { once: true });
      document.addEventListener('keydown', handleKey);
    }

    return () => {
      document.removeEventListener('touchstart', handleTouch);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  const getDirectionClass = () => {
    switch (direction) {
      case 'horizontal':
        return 'swipe-indicator--horizontal';
      case 'vertical':
        return 'swipe-indicator--vertical';
      case 'both':
        return 'swipe-indicator--both';
      default:
        return 'swipe-indicator--horizontal';
    }
  };

  const getPositionClass = () => {
    switch (position) {
      case 'top':
        return 'swipe-indicator--top';
      case 'bottom':
        return 'swipe-indicator--bottom';
      case 'center':
        return 'swipe-indicator--center';
      default:
        return 'swipe-indicator--center';
    }
  };

  return (
    <div className={`swipe-indicator ${getDirectionClass()} ${getPositionClass()}`}>
      <div className="swipe-indicator__content">
        <div className="swipe-indicator__animation">
          {direction === 'horizontal' && (
            <>
              <div className="swipe-arrow swipe-arrow--left">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
                </svg>
              </div>
              <div className="swipe-gesture-line"></div>
              <div className="swipe-arrow swipe-arrow--right">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/>
                </svg>
              </div>
            </>
          )}
          
          {direction === 'vertical' && (
            <>
              <div className="swipe-arrow swipe-arrow--up">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/>
                </svg>
              </div>
              <div className="swipe-gesture-line swipe-gesture-line--vertical"></div>
              <div className="swipe-arrow swipe-arrow--down">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                </svg>
              </div>
            </>
          )}

          {direction === 'both' && (
            <div className="swipe-both-animation">
              <div className="swipe-circle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M9 9l-3-3m6 0l3-3m-3 18l3-3m-6 0l-3-3"/>
                </svg>
              </div>
            </div>
          )}
        </div>
        
        <div className="swipe-indicator__text">
          {action}
        </div>
        
        <button 
          className="swipe-indicator__close"
          onClick={() => setIsVisible(false)}
          aria-label="Close hint"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

// Specialized component for block rotation hints
export const BlockRotationHint: React.FC<{
  visible?: boolean;
  onDismiss?: () => void;
}> = ({ visible = true, onDismiss }) => {
  return (
    <SwipeIndicator
      show={visible}
      direction="horizontal"
      action="Swipe left/right to rotate blocks"
      position="bottom"
      autoHide={true}
      autoHideDelay={4000}
    />
  );
};

export default SwipeIndicator;