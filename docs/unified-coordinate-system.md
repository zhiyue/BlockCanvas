# 统一坐标系管理系统实现

## 概述

本文档描述了 BlockCanvas 游戏中统一坐标系管理系统的实现，解决了 Canvas 和 HTML DOM 元素之间坐标转换不一致的问题。

## 问题背景

在原始实现中存在以下问题：

1. **重复的坐标系统定义**：在多个组件中有重复的响应式坐标系统实现
2. **缺乏统一的配置管理**：响应式尺寸计算分散在各个组件中
3. **坐标转换不一致**：不同组件使用不同的坐标转换逻辑
4. **维护困难**：修改坐标相关配置需要在多个文件中进行更改

## 解决方案

### 1. 增强的坐标系统类 (EnhancedCoordinateSystem)

创建了一个功能完整的坐标系统类，提供以下功能：

```typescript
export class EnhancedCoordinateSystem {
  // 基础坐标转换
  gridToCanvas(gridX: number, gridY: number): Position
  canvasToGrid(canvasX: number, canvasY: number): Position
  
  // 边界和验证
  isValidGridPosition(gridX: number, gridY: number): boolean
  isWithinBoardBounds(canvasX: number, canvasY: number): boolean
  
  // 响应式支持
  getResponsiveCellSize(viewportWidth: number): number
  createResponsiveSystem(viewportWidth: number): EnhancedCoordinateSystem
  
  // DOM 集成
  domToGrid(domX: number, domY: number, containerRect: DOMRect): Position
}
```

### 2. React Context 管理

创建了 `CoordinateSystemProvider` 来管理全局坐标系统配置：

```typescript
interface CoordinateSystemContextType {
  coordinateSystem: EnhancedCoordinateSystem;
  responsiveCoordinateSystem: EnhancedCoordinateSystem;
  config: CoordinateSystemConfig;
  updateConfig: (newConfig: Partial<CoordinateSystemConfig>) => void;
  viewportWidth: number;
  isMobile: boolean;
  isSmallMobile: boolean;
}
```

### 3. 优化的 Hook 系统

提供了多个专用 Hook 来简化坐标系统的使用：

- `useCoordinateSystem()`: 获取完整的坐标系统上下文
- `useResponsiveCoordinateSystem()`: 仅获取响应式坐标系统
- `useCoordinateSystemDeviceCapabilities()`: 设备能力检测
- `useOptimizedCoordinateConverter()`: 性能优化的坐标转换函数
- `useDOMToGridConverter()`: DOM 到网格坐标转换

## 实现细节

### 配置管理

```typescript
export interface CoordinateSystemConfig {
  cellSize: number;
  borderWidth: number;
  gridLineWidth: number;
  cellPadding: number;
  boardSize: number;
}
```

### 响应式支持

系统自动根据视口宽度计算合适的单元格大小：

```typescript
getResponsiveCellSize(viewportWidth: number): number {
  const isMobile = viewportWidth <= 768;
  const isSmallMobile = viewportWidth <= 480;
  
  if (isSmallMobile) {
    return Math.max(35, Math.floor((viewportWidth - 40) / (this.config.boardSize + 2)));
  } else if (isMobile) {
    return Math.max(40, Math.floor((viewportWidth - 60) / (this.config.boardSize + 1)));
  }
  return this.config.cellSize;
}
```

### 性能优化

- **记忆化计算**：使用 `useMemo` 缓存坐标转换函数
- **节流处理**：对频繁的坐标计算进行节流
- **上下文优化**：避免不必要的重新渲染

## 组件集成

### App.tsx

```typescript
function App() {
  return (
    <CoordinateSystemProvider>
      <GameApp />
    </CoordinateSystemProvider>
  );
}
```

### GameBoard.tsx

```typescript
const GameBoard: React.FC<GameBoardProps> = ({ ... }) => {
  const { responsiveCellSize, coordinateSystem } = useCoordinateSystemDeviceCapabilities();
  const { gridToCanvas, canvasToGrid, getCellBounds } = useOptimizedCoordinateConverter();
  
  // 使用统一的坐标转换
  const blockPosition = gridToCanvas(position.x, position.y);
  const { x: gridX, y: gridY } = canvasToGrid(canvasX, canvasY);
};
```

### BlockInventory.tsx

```typescript
const BlockInventory: React.FC<BlockInventoryProps> = ({ ... }) => {
  const { responsiveCellSize } = useCoordinateSystemDeviceCapabilities();
  const cellSize = responsiveCellSize || contextCellSize;
  
  // 使用统一的单元格大小
};
```

## 测试覆盖

实现了全面的测试套件，包括：

- 基础坐标转换测试
- 边界验证测试
- 响应式功能测试
- DOM 坐标转换测试
- 配置管理测试

测试通过率：100% (27/27 测试通过)

## 优势

1. **一致性**：Canvas 和 HTML 元素使用相同的坐标系统
2. **可维护性**：修改坐标配置只需要更改一个地方
3. **性能优化**：避免重复计算，使用记忆化和节流
4. **类型安全**：完整的 TypeScript 类型支持
5. **可扩展性**：容易添加新的坐标转换功能
6. **测试覆盖**：完整的测试套件确保可靠性

## 向后兼容性

保留了原始的 `CoordinateSystem` 对象以确保向后兼容性，同时推荐使用新的增强系统。

## 使用建议

1. **新组件**：使用 `useCoordinateSystemDeviceCapabilities()` 和 `useOptimizedCoordinateConverter()`
2. **性能敏感场景**：使用记忆化的坐标转换函数
3. **配置修改**：通过 Context 的 `updateConfig` 方法统一修改
4. **测试**：为坐标相关功能编写单元测试

这个统一坐标系管理系统为 BlockCanvas 游戏提供了稳定、高效、易维护的坐标处理基础设施。
