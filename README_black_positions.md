# 黑色积木位置JSON输出功能

## 功能概述

`tiling_solver.py` 现在支持将黑色积木的位置信息输出为JSON格式，方便前端应用读取和显示。

## 新增功能

### 1. JSON格式输出
- 自动生成 `black_positions.json` 文件
- 包含所有唯一的黑色积木位置组合
- 提供详细的位置信息和元数据

### 2. 数据结构

JSON文件包含以下主要部分：

#### 元数据 (metadata)
```json
{
  "metadata": {
    "total_solutions": 5,
    "unique_black_combinations": 5,
    "start_time": "2025-07-20 20:06:42",
    "end_time": "2025-07-20 20:06:42",
    "elapsed_time_seconds": 0.0065,
    "board_size": 8
  }
}
```

#### 积木定义 (piece_definitions)
```json
{
  "piece_definitions": {
    "K": {"name": "黑色1×3", "size": {"width": 1, "height": 3}},
    "k": {"name": "黑色1×2", "size": {"width": 1, "height": 2}},
    "x": {"name": "黑色1×1", "size": {"width": 1, "height": 1}}
  }
}
```

#### 黑色积木组合 (black_piece_combinations)
每个组合包含：
- `combination_id`: 组合编号
- `solution_id`: 对应的解编号
- `black_pieces`: 黑色积木详细信息
- `timestamp`: 时间戳

每个黑色积木包含：
- `name`: 积木名称
- `color`: 积木颜色代码
- `position`: 位置信息（左上角和右下角坐标）
- `size`: 尺寸信息
- `cells`: 占用的所有格子坐标

## 使用方法

### 1. 运行求解器
```bash
# 基本用法（默认生成JSON）
python tiling_solver.py

# 限制解的数量
python tiling_solver.py --max-solutions 10

# 自定义JSON文件名
python tiling_solver.py --json-filename my_black_positions.json

# 禁用JSON输出
python tiling_solver.py --no-json
```

### 2. 命令行参数

新增的JSON相关参数：
- `--no-json`: 禁用JSON格式输出
- `--json-filename`: 指定JSON文件名（默认：black_positions.json）

### 3. 输出文件

程序会生成以下文件：
- `solution.txt`: 所有解的文本格式（原有功能）
- `black.txt`: 黑色积木位置的文本格式（原有功能）
- `black_positions.json`: 黑色积木位置的JSON格式（新增功能）

## 前端集成示例

### 1. 使用提供的HTML查看器
打开 `black_pieces_viewer.html` 文件，选择生成的JSON文件即可查看可视化结果。

### 2. JavaScript读取示例
```javascript
// 读取JSON文件
fetch('black_positions.json')
  .then(response => response.json())
  .then(data => {
    console.log('总解数:', data.metadata.total_solutions);
    console.log('唯一组合数:', data.metadata.unique_black_combinations);
    
    // 遍历所有黑色积木组合
    data.black_piece_combinations.forEach(combination => {
      console.log(`组合 ${combination.combination_id}:`);
      
      Object.entries(combination.black_pieces).forEach(([color, piece]) => {
        console.log(`  ${piece.name}: 位置(${piece.position.top_left.row}, ${piece.position.top_left.col})`);
      });
    });
  });
```

### 3. React组件示例
```jsx
import React, { useState, useEffect } from 'react';

function BlackPiecesViewer({ jsonFile }) {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetch(jsonFile)
      .then(response => response.json())
      .then(setData);
  }, [jsonFile]);
  
  if (!data) return <div>加载中...</div>;
  
  return (
    <div>
      <h2>黑色积木位置</h2>
      <p>总解数: {data.metadata.total_solutions}</p>
      <p>唯一组合: {data.metadata.unique_black_combinations}</p>
      
      {data.black_piece_combinations.map(combination => (
        <div key={combination.combination_id}>
          <h3>组合 #{combination.combination_id}</h3>
          {Object.entries(combination.black_pieces).map(([color, piece]) => (
            <div key={color}>
              <strong>{piece.name}</strong>: 
              ({piece.position.top_left.row}, {piece.position.top_left.col})
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

## 数据格式说明

### 坐标系统
- 行（row）：0-7，从上到下
- 列（col）：0-7，从左到右
- 左上角：(0, 0)
- 右下角：(7, 7)

### 积木颜色代码
- `K`: 黑色1×3
- `k`: 黑色1×2  
- `x`: 黑色1×1

### 位置信息
每个积木提供：
- `top_left`: 积木的左上角坐标
- `bottom_right`: 积木的右下角坐标
- `cells`: 积木占用的所有格子坐标列表

## 注意事项

1. JSON文件只包含去重后的唯一黑色积木位置组合
2. 坐标从0开始计数
3. 文件采用UTF-8编码，支持中文
4. JSON格式便于各种编程语言和前端框架解析
5. 可以通过 `--no-json` 参数禁用JSON输出以节省磁盘空间

## 示例输出

运行 `python tiling_solver.py --max-solutions 5` 会生成包含5个解的JSON文件，其中包含所有唯一的黑色积木位置组合。
