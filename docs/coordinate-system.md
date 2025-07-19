# 坐标系统设计文档

## 概述

本文档描述了 BlockCanvas 游戏中统一的坐标系统设计，解决了之前 Canvas 和 HTML 元素坐标不一致的问题。

## 设计原则

1. **单一数据源**：所有坐标相关的常量都定义在 `types/game.ts` 中
2. **统一接口**：通过 `CoordinateSystem` 工具类处理所有坐标转换
3. **可维护性**：修改尺寸只需要更改配置常量
4. **类型安全**：使用 TypeScript 确保坐标计算的正确性

## 坐标系统结构

### 配置常量

```typescript
export const BOARD_CONFIG = {
  BORDER_WIDTH: 2,        // Stage 边框宽度
  GRID_LINE_WIDTH: 1,     // 网格线宽度
  CELL_PADDING: 1,        // 格子内边距
} as const;
```

### 坐标转换工具

```typescript
export const CoordinateSystem = {
  // 网格坐标 → Canvas 坐标
  gridToCanvas: (gridX: number, gridY: number) => ({
    x: gridX * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH,
    y: gridY * CELL_SIZE + BOARD_CONFIG.BORDER_WIDTH,
  }),
  
  // Canvas 坐标 → 网格坐标
  canvasToGrid: (canvasX: number, canvasY: number) => ({
    x: Math.floor((canvasX - BOARD_CONFIG.BORDER_WIDTH) / CELL_SIZE),
    y: Math.floor((canvasY - BOARD_CONFIG.BORDER_WIDTH) / CELL_SIZE),
  }),
  
  // 获取格子边界
  getCellBounds: (gridX: number, gridY: number) => { ... },
  
  // 获取棋盘尺寸
  getBoardDimensions: () => { ... },
};
```

## 使用示例

### 渲染格子

```typescript
const cellBounds = CoordinateSystem.getCellBounds(col, row);
<Rect
  x={cellBounds.x}
  y={cellBounds.y}
  width={cellBounds.width}
  height={cellBounds.height}
  // ...
/>
```

### 处理鼠标事件

```typescript
const { x: gridX, y: gridY } = CoordinateSystem.canvasToGrid(canvasX, canvasY);
```

### 定位 HTML 元素

```typescript
const blockPosition = CoordinateSystem.gridToCanvas(position.x, position.y);
<DraggableBlock x={blockPosition.x} y={blockPosition.y} />
```

## 优势

1. **一致性**：Canvas 和 HTML 元素使用相同的坐标系统
2. **可维护性**：修改边框或尺寸只需要更改配置常量
3. **可读性**：代码意图清晰，没有魔法数字
4. **可测试性**：坐标转换逻辑可以独立测试
5. **扩展性**：容易添加新的坐标转换功能

## 迁移指南

如果需要修改棋盘尺寸或边框：

1. 修改 `BOARD_CONFIG` 中的常量
2. 所有使用 `CoordinateSystem` 的代码会自动适应
3. CSS 变量会自动更新（如果使用了 CSS 变量）

这种设计确保了代码的长期可维护性和扩展性。
