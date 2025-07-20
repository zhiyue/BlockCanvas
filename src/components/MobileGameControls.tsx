import React from 'react';
import { useGameStore } from '../store/gameStore';
import { useDeviceCapabilities } from '../hooks/useDeviceCapabilities';
import { TouchButton } from './TouchFeedback';
import './MobileGameControls.css';

interface MobileGameControlsProps {
  onRotateBlock?: () => void;
  onSwitchMode?: () => void;
  onClearSelection?: () => void;
}

const MobileGameControls: React.FC<MobileGameControlsProps> = ({
  onRotateBlock,
  onSwitchMode,
  onClearSelection
}) => {
  const { 
    selectedBlock, 
    interactionMode, 
    tapModeState,
    isStarterBlock,
    rotateTapModeBlock 
  } = useGameStore();
  
  const { isMobile, hasTouch } = useDeviceCapabilities();

  // Don't render on desktop
  if (!isMobile && !hasTouch) {
    return null;
  }

  const showRotateButton = () => {
    if (interactionMode === 'tap') {
      return tapModeState.selectedBlockForPlacement && 
             !isStarterBlock(tapModeState.selectedBlockForPlacement);
    } else {
      return selectedBlock && !isStarterBlock(selectedBlock);
    }
  };

  const handleRotate = () => {
    if (interactionMode === 'tap') {
      rotateTapModeBlock();
    } else {
      onRotateBlock?.();
    }
  };

  const getSelectedBlockInfo = () => {
    if (interactionMode === 'tap') {
      return {
        blockId: tapModeState.selectedBlockForPlacement,
        rotation: tapModeState.selectedBlockRotation
      };
    } else {
      return {
        blockId: selectedBlock,
        rotation: 0 // Rotation is handled differently in drag mode
      };
    }
  };

  const selectedInfo = getSelectedBlockInfo();

  return (
    <div className="mobile-game-controls">
      {/* Floating Control Panel */}
      {showRotateButton() && (
        <div className="floating-controls">
          <div className="control-panel">
            <div className="control-info">
              <span className="selected-block-name">
                {selectedInfo.blockId}
              </span>
              {interactionMode === 'tap' && (
                <span className="rotation-indicator">
                  ↻ {selectedInfo.rotation * 90}°
                </span>
              )}
            </div>
            
            <div className="control-buttons">
              <TouchButton 
                className="control-btn rotate-btn"
                onClick={handleRotate}
                aria-label="Rotate block"
                enableHaptic={true}
                enableRipple={true}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z"/>
                </svg>
              </TouchButton>
              
              {interactionMode === 'tap' && (
                <TouchButton 
                  className="control-btn clear-btn"
                  onClick={onClearSelection}
                  aria-label="Clear selection"
                  enableHaptic={true}
                  enableRipple={true}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </TouchButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Interaction Mode Indicator */}
      <div className="mode-indicator">
        <div className={`mode-badge mode-${interactionMode}`}>
          {interactionMode === 'tap' ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9 11H7v3h2v-3zm4 0h-2v3h2v-3zm4 0h-2v3h2v-3zm2-7h-1V2h-2v2H8V2H6v2H5c-1.1 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
              </svg>
              <span>Tap Mode</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13 6v5h1.17L12 13.17 9.83 11H11V6h2m1-2H10V3h4v1zm2.25 6.8L13 7.8V9h-2V7.8L7.75 10.8 6.34 9.4 11 4.75c.55-.55 1.45-.55 2 0l4.66 4.65-1.41 1.4z"/>
              </svg>
              <span>Drag Mode</span>
            </>
          )}
        </div>
        
        {/* Quick Instructions */}
        <div className="quick-instructions">
          {interactionMode === 'tap' ? (
            tapModeState.selectedBlockForPlacement ? (
              <span>Tap board to place block</span>
            ) : (
              <span>Tap block to select</span>
            )
          ) : (
            <span>Drag blocks to move</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileGameControls;