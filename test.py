#!/usr/bin/env python3
"""
Mondrian Blocks Puzzle Generator using DLX (Dancing Links Algorithm X)

Generates 8x8 Mondrian Blocks puzzles with unique solutions.
Uses optimized DLX implementation with multiprocessing support.

Requirements: Python 3.8+
"""

import random
import time
import logging
import secrets
from typing import List, Tuple, Set, Optional, FrozenSet, Dict
from collections import defaultdict
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class DLXNode:
    """Dancing Links 节点（使用 slots 优化内存）"""
    __slots__ = ('left', 'right', 'up', 'down', 'column', 'row_id')

    def __init__(self, column=None, row_id=-1):
        self.left = self.right = self.up = self.down = self
        self.column = column
        self.row_id = row_id


class DLXHeader(DLXNode):
    """Dancing Links 列头节点"""
    __slots__ = ('size', 'name')

    def __init__(self, name=""):
        super().__init__()
        self.size = 0
        self.name = name


class DLX:
    """优化的 Dancing Links Algorithm X 实现"""
    
    def __init__(self, matrix: List[List[int]], num_cols: int):
        self.header = DLXHeader(name="header")
        self.columns: List[DLXHeader] = []
        self.solution: List[int] = []
        self.solutions_count: int = 0
        self.max_solutions: int = 2
        self.search_nodes: int = 0  # 搜索节点计数（用于难度评估）
        
        # 创建列头
        for i in range(num_cols):
            col = DLXHeader(name=f"col{i}")
            self.columns.append(col)
            col.left = self.header.left
            col.right = self.header
            self.header.left.right = col
            self.header.left = col
        
        # 构建矩阵（行已在get_placements中排序）
        for row_idx, row in enumerate(matrix):
            sorted_row = row  # 行已排序，无需重复排序
            prev = None
            first = None
            
            for col_idx in sorted_row:
                col = self.columns[col_idx]
                node = DLXNode(column=col, row_id=row_idx)
                
                # 垂直链接
                node.down = col
                node.up = col.up
                col.up.down = node
                col.up = node
                col.size += 1
                
                # 水平链接
                if prev:
                    node.left = prev
                    node.right = first
                    prev.right = node
                    first.left = node
                else:
                    first = node
                    node.left = node.right = node
                prev = node
    
    def cover(self, col: DLXHeader) -> None:
        """覆盖列及相关行"""
        col.right.left = col.left
        col.left.right = col.right
        
        i = col.down
        while i != col:
            j = i.right
            while j != i:
                j.down.up = j.up
                j.up.down = j.down
                j.column.size -= 1
                j = j.right
            i = i.down
    
    def uncover(self, col: DLXHeader) -> None:
        """恢复列及相关行"""
        i = col.up
        while i != col:
            j = i.left
            while j != i:
                j.column.size += 1
                j.down.up = j.up.down = j
                j = j.left
            i = i.up
        col.right.left = col.left.right = col
    
    def search(self) -> None:
        """递归搜索解"""
        self.search_nodes += 1

        # 检查超时
        if hasattr(self, 'timeout_seconds') and time.time() - self.start_time > self.timeout_seconds:
            return

        if self.solutions_count >= self.max_solutions:
            return
        
        if self.header.right == self.header:
            # 找到一个解
            self.solutions_count += 1
            return
        
        # 选择包含最少1的列（启发式）
        col = None
        s = float('inf')
        j = self.header.right
        while j != self.header:
            if j.size < s:
                col = j
                s = j.size
            j = j.right
        
        # 如果有列没有任何1，无解
        if s == 0:
            return
        
        # 覆盖列
        self.cover(col)
        
        # 尝试每一行
        r = col.down
        while r != col:
            self.solution.append(r.row_id)
            
            # 覆盖行中的其他列
            j = r.right
            while j != r:
                self.cover(j.column)
                j = j.right
            
            # 递归搜索
            self.search()
            
            # 回溯
            self.solution.pop()
            j = r.left
            while j != r:
                self.uncover(j.column)
                j = j.left
            
            r = r.down
        
        self.uncover(col)
    
    def count_solutions(self, limit: int = 2, timeout_seconds: float = 5.0) -> int:
        """计数解的数量（带超时机制）"""
        self.max_solutions = limit
        self.solutions_count = 0
        self.search_nodes = 0
        self.start_time = time.time()
        self.timeout_seconds = timeout_seconds
        self.search()
        return self.solutions_count


def _generate_single_worker(seed: Optional[int] = None) -> Optional[Tuple[Set[Tuple[int, int]], int, Dict[str, int]]]:
    """单次生成尝试（用于多进程的模块级函数）"""
    generator = MondrianDLXGenerator()
    return generator._generate_single_internal(seed)


class MondrianDLXGenerator:
    """Mondrian Blocks 谜题生成器"""
    
    def __init__(self):
        self.board_size: int = 8
        
        # 定义7块彩色积木的形状（相对坐标）- 总面积50格，留8格空余
        self.pieces: Dict[str, List[Tuple[int, int]]] = {
            "R_3x4": [(i, j) for i in range(3) for j in range(4)],  # 12格
            "B_3x3": [(i, j) for i in range(3) for j in range(3)],  # 9格
            "W_1x5": [(0, i) for i in range(5)],                    # 5格
            "W_1x4": [(0, i) for i in range(4)],                    # 4格
            "Y_2x5": [(i, j) for i in range(2) for j in range(5)],  # 10格
            "Y_2x4": [(i, j) for i in range(2) for j in range(4)],  # 8格
            "G_1x2": [(0, i) for i in range(2)],                    # 2格
        }
        # 总计: 12+9+5+4+10+8+2 = 50格，8x8-6黑块=58格，留8格空余
        
        # 黑色积木（预计算所有可能的方向）
        self.black_pieces: List[List[Tuple[int, int]]] = [
            [(0, 0), (0, 1), (0, 2)],  # 1x3 竖放
            [(0, 0), (1, 0), (2, 0)],  # 1x3 横放
            [(0, 0), (0, 1)],          # 1x2 竖放
            [(0, 0), (1, 0)],          # 1x2 横放
            [(0, 0)]                   # 1x1
        ]
        
        # 预计算所有积木的所有方向
        self.orientations: Dict[str, List[List[Tuple[int, int]]]] = {}
        for name, cells in self.pieces.items():
            self.orientations[name] = self._get_unique_orientations(cells)
        
        # 统计信息
        self.stats: Dict[str, int] = defaultdict(int)
    
    def _get_unique_orientations(self, cells: List[Tuple[int, int]]) -> List[List[Tuple[int, int]]]:
        """获取一个积木的所有唯一方向（旋转和翻转）"""
        orientations = set()

        # 4种旋转 × 2种翻转
        for flip in [False, True]:
            base = [(-x, y) for x, y in cells] if flip else cells

            for rot in range(4):
                # 每次从base开始旋转，避免累积错误
                current = [(x, y) for x, y in base]  # 复制base
                for _ in range(rot):
                    current = [(y, -x) for x, y in current]

                # 归一化
                normalized = self._normalize_cells(current)
                orientations.add(tuple(normalized))

        return [list(o) for o in orientations]
    
    def _normalize_cells(self, cells: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
        """将积木移动到左上角"""
        if not cells:
            return cells
        min_x = min(x for x, y in cells)
        min_y = min(y for x, y in cells)
        return sorted([(x - min_x, y - min_y) for x, y in cells])
    
    def _cell_to_bit(self, x: int, y: int) -> int:
        """将坐标转换为位掩码"""
        return 1 << (y * self.board_size + x)
    
    def _cells_to_bitmask(self, cells: List[Tuple[int, int]]) -> int:
        """将格子列表转换为位掩码"""
        mask = 0
        for x, y in cells:
            mask |= self._cell_to_bit(x, y)
        return mask
    
    def get_placements(self, black_mask: int) -> List[List[int]]:
        """获取所有可能的积木放置方式（使用位掩码加速）"""
        rows = []
        piece_col_offset = 64
        piece_names = list(self.pieces.keys())

        for piece_idx, piece_name in enumerate(piece_names):
            piece_col = piece_col_offset + piece_idx
            
            for orientation in self.orientations[piece_name]:
                # 计算边界
                max_x = max(x for x, y in orientation)
                max_y = max(y for x, y in orientation)
                
                # 尝试所有可能的位置
                for dx in range(self.board_size - max_x):
                    for dy in range(self.board_size - max_y):
                        # 使用位掩码快速检测冲突
                        piece_mask = 0
                        conflict = False
                        
                        for x, y in orientation:
                            bit = self._cell_to_bit(x + dx, y + dy)
                            if bit & black_mask:
                                conflict = True
                                break
                            piece_mask |= bit
                        
                        if conflict:
                            continue
                        
                        # 构建DLX矩阵的一行
                        row = []
                        for x, y in orientation:
                            cell_idx = (y + dy) * self.board_size + (x + dx)
                            row.append(cell_idx)
                        row.append(piece_col)
                        row.sort()  # 排序以提升DLX性能
                        rows.append(row)
        
        return rows
    
    def smart_black_layout(self) -> Optional[Set[Tuple[int, int]]]:
        """智能生成黑色积木布局（改进版）"""
        # 使用更均匀的采样策略
        all_positions = [(x, y) for x in range(self.board_size) for y in range(self.board_size)]
        
        max_attempts = 100
        for _ in range(max_attempts):
            cells = set()
            
            # 随机打乱位置
            random.shuffle(all_positions)
            
            # 依次尝试放置黑色积木
            black_configs = [
                ([(0, 0), (0, 1), (0, 2)], [(0, 0), (1, 0), (2, 0)]),  # 1x3
                ([(0, 0), (0, 1)], [(0, 0), (1, 0)]),                   # 1x2
                ([(0, 0)],)                                              # 1x1
            ]
            
            success = True
            for configs in black_configs:
                placed = False
                
                # 随机选择一个方向
                config = random.choice(configs)
                normalized = self._normalize_cells(config)
                max_x = max(x for x, y in normalized)
                max_y = max(y for x, y in normalized)
                
                # 尝试在可用位置放置
                for base_x, base_y in all_positions:
                    if base_x + max_x >= self.board_size or base_y + max_y >= self.board_size:
                        continue
                    
                    piece_cells = {(base_x + x, base_y + y) for x, y in normalized}
                    if not cells & piece_cells:
                        cells |= piece_cells
                        placed = True
                        break
                
                if not placed:
                    success = False
                    break
            
            if success and len(cells) == 6:
                return cells
        
        return None
    
    def is_connected(self, black_cells: Set[Tuple[int, int]]) -> bool:
        """使用BFS检查剩余空白区域是否连通"""
        # 找到第一个空白格子
        start = None
        for pos in ((x, y) for x in range(self.board_size) for y in range(self.board_size)):
            if pos not in black_cells:
                start = pos
                break
        
        if not start:
            return True
        
        # BFS
        visited = {start}
        queue = [start]
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
        
        while queue:
            x, y = queue.pop(0)
            for dx, dy in directions:
                nx, ny = x + dx, y + dy
                if (0 <= nx < self.board_size and 
                    0 <= ny < self.board_size and
                    (nx, ny) not in black_cells and 
                    (nx, ny) not in visited):
                    visited.add((nx, ny))
                    queue.append((nx, ny))
        
        # 检查是否访问了所有空白格子
        total_empty = self.board_size * self.board_size - len(black_cells)
        return len(visited) == total_empty
    
    def _generate_single_internal(self, seed: Optional[int] = None) -> Optional[Tuple[Set[Tuple[int, int]], int, Dict[str, int]]]:
        """单次生成尝试（用于多进程）"""
        if seed is not None:
            random.seed(seed)
        
        local_stats = defaultdict(int)
        max_attempts = 5000
        
        for attempt in range(max_attempts):
            # 每100次尝试显示进度
            if attempt % 100 == 0 and attempt > 0:
                print(f"  Attempt {attempt}: {dict(local_stats)}")

            # 生成黑块布局
            black_cells = self.smart_black_layout()
            if not black_cells:
                local_stats['layout_failed'] += 1
                continue

            # 快速检查
            if not self.is_connected(black_cells):
                local_stats['disconnected'] += 1
                continue

            # 转换为位掩码
            black_mask = self._cells_to_bitmask(list(black_cells))

            # 构建DLX矩阵
            rows = self.get_placements(black_mask)
            if not rows:
                local_stats['no_placements'] += 1
                continue

            # DLX求解（带超时）
            try:
                dlx = DLX(rows, 72)
                num_solutions = dlx.count_solutions(limit=2, timeout_seconds=2.0)  # 2秒超时
                
                if num_solutions == 0:
                    local_stats['no_solution'] += 1
                elif num_solutions == 1:
                    local_stats['unique_solution'] += 1
                    local_stats['search_nodes'] = dlx.search_nodes
                    return black_cells, attempt + 1, dict(local_stats)
                else:
                    local_stats['multiple_solutions'] += 1
                    
            except Exception as e:
                local_stats['dlx_error'] += 1
                logger.error(f"DLX error: {e}", exc_info=True)
        
        return None
    
    def generate_puzzle(self, max_workers: Optional[int] = None, timeout: float = 60.0) -> Optional[Tuple[Set[Tuple[int, int]], int]]:
        """并行生成谜题"""
        if max_workers is None:
            max_workers = min(multiprocessing.cpu_count(), 8)
        
        logger.info(f"Starting parallel generation with {max_workers} workers")
        start_time = time.time()
        
        with ProcessPoolExecutor(max_workers=max_workers) as executor:
            # 提交多个任务
            futures = []
            for i in range(max_workers * 10):  # 每个worker提交10个任务
                seed = secrets.randbits(64)  # 更安全的随机种子生成
                future = executor.submit(_generate_single_worker, seed)
                futures.append(future)
            
            # 等待第一个成功的结果
            for future in as_completed(futures, timeout=timeout):
                try:
                    result = future.result()
                    if result:
                        black_cells, attempts, stats = result
                        elapsed = time.time() - start_time
                        
                        # 取消其他任务并关闭执行器
                        executor.shutdown(cancel_futures=True, wait=False)
                        
                        logger.info(f"Success after {attempts} attempts in {elapsed:.2f}s")
                        logger.info(f"Stats: {stats}")
                        
                        # 计算难度等级
                        difficulty = self._calculate_difficulty(stats.get('search_nodes', 0))
                        logger.info(f"Difficulty: {difficulty}")
                        
                        return black_cells, attempts
                        
                except Exception as e:
                    logger.error(f"Worker error: {e}")
        
        logger.warning("Failed to generate puzzle within timeout")
        return None
    
    def _calculate_difficulty(self, search_nodes: int) -> str:
        """根据搜索节点数评估难度"""
        if search_nodes < 100:
            return "Easy"
        elif search_nodes < 1000:
            return "Medium"
        elif search_nodes < 10000:
            return "Hard"
        else:
            return "Expert"
    
    def print_board(self, black_cells: Set[Tuple[int, int]]) -> None:
        """打印棋盘"""
        print("\n  ", end="")
        for col in range(self.board_size):
            print(f"{col} ", end="")
        print()
        
        for row in range(self.board_size):
            print(f"{row} ", end="")
            for col in range(self.board_size):
                if (col, row) in black_cells:
                    print("■ ", end="")
                else:
                    print("· ", end="")
            print()
    
    def to_dict(self, black_cells: Set[Tuple[int, int]]) -> Dict:
        """转换为字典格式（便于序列化）"""
        return {
            "board_size": self.board_size,
            "black_cells": sorted(list(black_cells)),
            "timestamp": time.time()
        }


def test_basic_functionality():
    """基本功能测试"""
    print("=== Testing Basic Functionality ===")

    # 测试DLX数据结构创建
    print("1. Testing DLX data structures...")
    try:
        header = DLXHeader(name="test")
        node = DLXNode(column=header, row_id=0)
        print("   ✓ DLX structures created successfully")
    except Exception as e:
        print(f"   ✗ DLX structure creation failed: {e}")
        return False

    # 测试生成器创建
    print("2. Testing generator creation...")
    try:
        generator = MondrianDLXGenerator()
        print("   ✓ Generator created successfully")
    except Exception as e:
        print(f"   ✗ Generator creation failed: {e}")
        return False

    # 测试DLX矩阵构建
    print("3. Testing DLX matrix construction...")
    try:
        # 创建一个简单的黑块布局进行测试
        black_cells = {(0, 0), (0, 1), (1, 0)}
        black_mask = generator._cells_to_bitmask(list(black_cells))
        rows = generator.get_placements(black_mask)

        print(f"   ✓ Generated {len(rows)} placement rows")

        # 检查列索引范围
        max_col = max(max(row) for row in rows) if rows else 0
        print(f"   ✓ Maximum column index: {max_col} (expected < 72)")

        if max_col >= 72:
            print(f"   ✗ Column index {max_col} exceeds expected range!")
            return False

        # 尝试创建DLX
        dlx = DLX(rows, 72)
        print("   ✓ DLX matrix created successfully")

    except Exception as e:
        print(f"   ✗ DLX matrix construction failed: {e}")
        return False

    print("✓ All basic tests passed!")
    return True


def test_quick_generation():
    """快速生成测试"""
    print("=== Quick Generation Test ===")
    generator = MondrianDLXGenerator()

    print("Trying to generate a puzzle (max 10 attempts)...")
    for i in range(10):
        print(f"Attempt {i+1}...")
        result = generator._generate_single_internal(seed=12345 + i)
        if result:
            black_cells, attempts, stats = result
            print(f"✓ SUCCESS! Generated puzzle in {attempts} attempts")
            print(f"✓ Black cells: {sorted(black_cells)}")
            print(f"✓ Stats: {dict(stats)}")

            # 验证解
            black_mask = generator._cells_to_bitmask(list(black_cells))
            rows = generator.get_placements(black_mask)
            dlx = DLX(rows, 72)
            num_solutions = dlx.count_solutions(limit=3, timeout_seconds=5.0)
            print(f"✓ Verified: {num_solutions} solution(s)")

            return True
        else:
            print(f"  - No solution found")

    print("✗ No puzzle generated in 10 attempts")
    return False


def main():
    """主函数"""
    # 先运行基本测试
    if not test_basic_functionality():
        print("\n✗ Basic tests failed, exiting")
        return

    print("\n" + "="*60)

    # 快速生成测试
    if test_quick_generation():
        print("\n" + "="*60)
        print("Quick test successful! Now trying full generation...")
    else:
        print("\n" + "="*60)
        print("Quick test failed, but trying full generation anyway...")

    generator = MondrianDLXGenerator()

    print("=== Mondrian Blocks Puzzle Generator (Optimized DLX) ===")
    print(f"Using {multiprocessing.cpu_count()} CPU cores")

    result = generator.generate_puzzle(max_workers=2, timeout=60.0)  # 增加超时时间

    if result:
        black_cells, attempts = result
        print(f"\n✓ Generated unique solution puzzle!")
        print(f"Attempts: {attempts}")

        print("\nBlack pieces:")
        for i, cell in enumerate(sorted(black_cells)):
            print(f"  {cell}")

        print("\nBoard layout:")
        generator.print_board(black_cells)

        # 验证
        print("\nVerifying...")
        black_mask = generator._cells_to_bitmask(list(black_cells))
        rows = generator.get_placements(black_mask)
        dlx = DLX(rows, 72)
        num = dlx.count_solutions(limit=10, timeout_seconds=10.0)
        print(f"Solutions found: {num}")

        # 导出
        puzzle_data = generator.to_dict(black_cells)
        print(f"\nPuzzle data: {puzzle_data}")

    else:
        print("\n✗ Failed to generate puzzle within timeout")


if __name__ == "__main__":
    main()