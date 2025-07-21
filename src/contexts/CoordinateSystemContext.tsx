import React, { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { EnhancedCoordinateSystem, DEFAULT_COORDINATE_CONFIG, CoordinateSystemConfig } from '../types/game';

interface CoordinateSystemContextType {
  coordinateSystem: EnhancedCoordinateSystem;
  responsiveCoordinateSystem: EnhancedCoordinateSystem;
  config: CoordinateSystemConfig;
  updateConfig: (newConfig: Partial<CoordinateSystemConfig>) => void;
  viewportWidth: number;
  isMobile: boolean;
  isSmallMobile: boolean;
}

const CoordinateSystemContext = createContext<CoordinateSystemContextType | undefined>(undefined);

interface CoordinateSystemProviderProps {
  children: ReactNode;
  initialConfig?: Partial<CoordinateSystemConfig>;
}

export const CoordinateSystemProvider: React.FC<CoordinateSystemProviderProps> = ({
  children,
  initialConfig = {},
}) => {
  const [config, setConfig] = useState<CoordinateSystemConfig>({
    ...DEFAULT_COORDINATE_CONFIG,
    ...initialConfig,
  });

  const [viewportWidth, setViewportWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  // Update viewport width on resize
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create coordinate systems
  const coordinateSystem = useMemo(() => {
    return new EnhancedCoordinateSystem(config);
  }, [config]);

  const responsiveCoordinateSystem = useMemo(() => {
    return coordinateSystem.createResponsiveSystem(viewportWidth);
  }, [coordinateSystem, viewportWidth]);

  // Device detection
  const isMobile = useMemo(() => viewportWidth <= 768, [viewportWidth]);
  const isSmallMobile = useMemo(() => viewportWidth <= 480, [viewportWidth]);

  const updateConfig = (newConfig: Partial<CoordinateSystemConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const contextValue: CoordinateSystemContextType = {
    coordinateSystem,
    responsiveCoordinateSystem,
    config,
    updateConfig,
    viewportWidth,
    isMobile,
    isSmallMobile,
  };

  return (
    <CoordinateSystemContext.Provider value={contextValue}>
      {children}
    </CoordinateSystemContext.Provider>
  );
};

// Custom hook to use coordinate system
export const useCoordinateSystem = (): CoordinateSystemContextType => {
  const context = useContext(CoordinateSystemContext);
  if (context === undefined) {
    throw new Error('useCoordinateSystem must be used within a CoordinateSystemProvider');
  }
  return context;
};

// Hook for responsive coordinate system only
export const useResponsiveCoordinateSystem = (): EnhancedCoordinateSystem => {
  const { responsiveCoordinateSystem } = useCoordinateSystem();
  return responsiveCoordinateSystem;
};

// Hook for device capabilities with coordinate system integration
export const useCoordinateSystemDeviceCapabilities = () => {
  const { isMobile, isSmallMobile, viewportWidth, responsiveCoordinateSystem } = useCoordinateSystem();
  
  return {
    isMobile,
    isSmallMobile,
    viewportWidth,
    responsiveCellSize: responsiveCoordinateSystem.getConfig().cellSize,
    coordinateSystem: responsiveCoordinateSystem,
  };
};

// Utility hook for DOM to grid coordinate conversion
export const useDOMToGridConverter = () => {
  const { responsiveCoordinateSystem } = useCoordinateSystem();
  
  return (domX: number, domY: number, containerElement: HTMLElement | null) => {
    if (!containerElement) {
      console.warn('Container element not found for coordinate conversion');
      return { x: 0, y: 0 };
    }
    
    const rect = containerElement.getBoundingClientRect();
    return responsiveCoordinateSystem.domToGrid(domX, domY, rect);
  };
};

// Performance optimized coordinate conversion hook
export const useOptimizedCoordinateConverter = () => {
  const { responsiveCoordinateSystem } = useCoordinateSystem();
  
  // Memoize frequently used conversion functions
  const gridToCanvas = useMemo(() => {
    return (gridX: number, gridY: number) => responsiveCoordinateSystem.gridToCanvas(gridX, gridY);
  }, [responsiveCoordinateSystem]);
  
  const canvasToGrid = useMemo(() => {
    return (canvasX: number, canvasY: number) => responsiveCoordinateSystem.canvasToGrid(canvasX, canvasY);
  }, [responsiveCoordinateSystem]);
  
  const getCellBounds = useMemo(() => {
    return (gridX: number, gridY: number) => responsiveCoordinateSystem.getCellBounds(gridX, gridY);
  }, [responsiveCoordinateSystem]);
  
  return {
    gridToCanvas,
    canvasToGrid,
    getCellBounds,
    isValidGridPosition: responsiveCoordinateSystem.isValidGridPosition.bind(responsiveCoordinateSystem),
    isWithinBoardBounds: responsiveCoordinateSystem.isWithinBoardBounds.bind(responsiveCoordinateSystem),
  };
};
