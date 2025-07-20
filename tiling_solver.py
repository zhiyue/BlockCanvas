#!/usr/bin/env python3
"""
改进版8×8棋盘积木铺砌问题求解器
使用DLX（Dancing Links）算法找出所有可能的铺法
包含进度显示、日志记录和性能优化
"""

from __future__ import annotations
import time
import logging
import sys
import json
from typing import List, Tuple, Set, Dict, Optional, Iterator, Callable
from collections import defaultdict
from dataclasses import dataclass
from enum import Enum
import argparse

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)


class OutputFormat(Enum):
    """输出格式枚举"""
    TEXT = "text"
    VISUAL = "visual"
    COMPACT = "compact"


@dataclass
class SolverConfig:
    """求解器配置"""
    board_size: int = 8
    max_solutions: Optional[int] = None
    save_to_file: bool = True
    filename: str = "solution.txt"
    show_progress: bool = True
    progress_interval: int = 100  # 每找到多少个解显示一次进度
    output_format: OutputFormat = OutputFormat.TEXT
    show_first_n: int = 5  # 显示前n个解
    save_black_json: bool = True  # 是否保存黑色积木位置为JSON格式
    black_json_filename: str = "black_positions.json"  # JSON文件名


@dataclass
class SolverStats:
    """求解统计信息"""
    nodes_visited: int = 0
    backtracks: int = 0
    solutions_found: int = 0
    start_time: float = 0
    end_time: float = 0
    matrix_rows: int = 0
    matrix_cols: int = 0
    
    @property
    def elapsed_time(self) -> float:
        if self.end_time > 0:
            return self.end_time - self.start_time
        return time.time() - self.start_time
    
    @property
    def search_rate(self) -> float:
        elapsed = self.elapsed_time
        return self.nodes_visited / elapsed if elapsed > 0 else 0


class DLXNode:
    """Dancing Links节点"""
    __slots__ = ['left', 'right', 'up', 'down', 'column', 'row_id']
    
    def __init__(self) -> None:
        self.left: DLXNode = self
        self.right: DLXNode = self
        self.up: DLXNode = self
        self.down: DLXNode = self
        self.column: Optional[ColumnNode] = None
        self.row_id: int = -1


class ColumnNode(DLXNode):
    """列头节点"""
    __slots__ = ['size', 'name']
    
    def __init__(self, name: str) -> None:
        super().__init__()
        self.size: int = 0
        self.name: str = name


class DancingLinks:
    """Dancing Links算法实现"""
    
    def __init__(self, stats: Optional[SolverStats] = None) -> None:
        self.header: ColumnNode = ColumnNode("header")
        self.columns: List[ColumnNode] = []
        self.rows: List[List[DLXNode]] = []
        self.solution: List[int] = []
        self.stats: SolverStats = stats or SolverStats()
        self._search_stopped: bool = False
        
    def add_column(self, name: str) -> ColumnNode:
        """添加新列"""
        col = ColumnNode(name)
        col.left = self.header.left
        col.right = self.header
        self.header.left.right = col
        self.header.left = col
        self.columns.append(col)
        return col
    
    def add_row(self, row: List[int]) -> None:
        """添加新行（已排序以提高效率）"""
        row = sorted(row)  # 排序可以提高缓存效率
        prev: Optional[DLXNode] = None
        first: Optional[DLXNode] = None
        row_nodes: List[DLXNode] = []
        
        for col_index in row:
            node = DLXNode()
            node.row_id = len(self.rows)
            node.column = self.columns[col_index]
            
            # 垂直链接
            node.down = node.column
            node.up = node.column.up
            node.column.up.down = node
            node.column.up = node
            node.column.size += 1
            
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
            
            row_nodes.append(node)
        
        self.rows.append(row_nodes)
    
    def cover(self, col: ColumnNode) -> None:
        """覆盖列及相关行"""
        col.right.left = col.left
        col.left.right = col.right
        
        row = col.down
        while row != col:
            j = row.right
            while j != row:
                j.down.up = j.up
                j.up.down = j.down
                j.column.size -= 1
                j = j.right
            row = row.down
    
    def uncover(self, col: ColumnNode) -> None:
        """恢复列及相关行"""
        row = col.up
        while row != col:
            j = row.left
            while j != row:
                j.column.size += 1
                j.down.up = j.up.down = j
                j = j.left
            row = row.up
        col.right.left = col.left.right = col
    
    def choose_column(self) -> Optional[ColumnNode]:
        """选择包含最少1的列（改进的启发式）"""
        col: Optional[ColumnNode] = None
        s = float('inf')
        j = self.header.right
        
        while j != self.header:
            if j.size < s:
                col = j
                s = j.size
                if s == 0:  # 早期退出，无解
                    break
            j = j.right
        
        return col
    
    def search(self, callback: Optional[Callable[[List[int]], bool]] = None) -> None:
        """递归搜索所有解"""
        if self._search_stopped:
            return
            
        self.stats.nodes_visited += 1
        
        if self.header.right == self.header:
            # 找到一个解
            self.stats.solutions_found += 1
            if callback:
                if not callback(self.solution[:]):
                    self._search_stopped = True
            return
        
        # 选择包含最少1的列
        col = self.choose_column()
        if not col or col.size == 0:
            self.stats.backtracks += 1
            return
        
        # 覆盖选中的列
        self.cover(col)
        
        # 尝试该列中的每一行
        row = col.down
        while row != col and not self._search_stopped:
            self.solution.append(row.row_id)
            
            # 覆盖该行中的其他列
            j = row.right
            while j != row:
                self.cover(j.column)
                j = j.right
            
            # 递归搜索
            self.search(callback)
            
            # 回溯
            self.solution.pop()
            j = row.left
            while j != row:
                self.uncover(j.column)
                j = j.left
            
            row = row.down
        
        self.uncover(col)
        self.stats.backtracks += 1


class TilingSolver:
    """积木铺砌问题求解器"""
    
    def __init__(self, config: SolverConfig = None) -> None:
        self.config = config or SolverConfig()
        self.stats = SolverStats()
        
        # 定义积木（名称，宽，高，颜色代码）
        self.pieces: List[Tuple[str, int, int, str]] = [
            ("红色3×4", 3, 4, 'R'),
            ("蓝色3×3", 3, 3, 'B'),
            ("蓝色2×2", 2, 2, 'b'),
            ("白色1×5", 1, 5, 'W'),
            ("白色1×4", 1, 4, 'w'),
            ("黄色2×5", 2, 5, 'Y'),
            ("黄色2×4", 2, 4, 'y'),
            ("黄色2×3", 2, 3, 'h'),
            ("黑色1×3", 1, 3, 'K'),
            ("黑色1×2", 1, 2, 'k'),
            ("黑色1×1", 1, 1, 'x')
        ]
        self.board_size = self.config.board_size
        self.placements: List[Dict] = []
        
        # 验证积木总面积
        self._validate_pieces()
        
    def _validate_pieces(self) -> None:
        """验证积木配置的合法性"""
        total_area = sum(w * h for _, w, h, _ in self.pieces)
        board_area = self.board_size ** 2
        if total_area != board_area:
            raise ValueError(
                f"积木总面积({total_area})与棋盘面积({board_area})不匹配"
            )
        logger.info(f"积木配置验证通过：{len(self.pieces)}块积木，总面积{total_area}")
    
    def get_piece_positions(self, piece_id: int, width: int, height: int) -> List[Tuple[int, List[int]]]:
        """获取一个积木的所有可能放置位置（修复正方形重复bug）"""
        positions = []
        
        # 修复：正方形只需要一种方向
        orientations = [(width, height)]
        if width != height:
            orientations.append((height, width))
        
        for w, h in orientations:
            # 枚举所有可能的左上角位置
            for row in range(self.board_size - h + 1):
                for col in range(self.board_size - w + 1):
                    # 记录该积木占用的所有格子
                    cells = []
                    for dr in range(h):
                        for dc in range(w):
                            cells.append(row * self.board_size + col + dr * self.board_size + dc)
                    positions.append((piece_id, cells))
        
        return positions
    
    def build_dlx_matrix(self) -> DancingLinks:
        """构建DLX矩阵"""
        logger.info("开始构建DLX矩阵...")
        dlx = DancingLinks(self.stats)
        
        # 添加列：64个格子 + 11个积木
        for i in range(self.board_size * self.board_size):
            dlx.add_column(f"cell_{i}")
        for i in range(len(self.pieces)):
            dlx.add_column(f"piece_{i}")
        
        # 生成所有可能的放置方案
        self.placements = []
        total_positions = 0
        
        for piece_id, (name, width, height, color) in enumerate(self.pieces):
            positions = self.get_piece_positions(piece_id, width, height)
            total_positions += len(positions)
            logger.debug(f"{name}: {len(positions)}种放置方式")
            
            for pid, cells in positions:
                placement = {
                    'piece_id': piece_id,
                    'cells': cells,
                    'color': color,
                    'name': name
                }
                self.placements.append(placement)
                
                # 构建DLX矩阵的行（已排序）
                row = sorted(cells + [64 + piece_id])
                dlx.add_row(row)
        
        self.stats.matrix_rows = len(self.placements)
        self.stats.matrix_cols = 64 + len(self.pieces)
        
        logger.info(
            f"DLX矩阵构建完成：{self.stats.matrix_rows}行 × {self.stats.matrix_cols}列"
        )
        logger.info(f"总放置方案数：{total_positions}")
        
        return dlx
    
    def solution_to_board(self, solution: List[int]) -> List[List[str]]:
        """将解转换为棋盘表示"""
        board = [['.' for _ in range(self.board_size)] for _ in range(self.board_size)]
        
        for row_id in solution:
            placement = self.placements[row_id]
            color = placement['color']
            for cell in placement['cells']:
                row = cell // self.board_size
                col = cell % self.board_size
                board[row][col] = color
        
        return board
    
    def print_board(self, board: List[List[str]], title: str = "") -> None:
        """打印棋盘"""
        if title:
            print(f"\n{title}")
        
        # 棋盘字符显示
        print("  " + "".join(f" {i}" for i in range(self.board_size)))
        print("  ┌" + "─┬" * (self.board_size - 1) + "─┐")
        
        for i, row in enumerate(board):
            row_str = f"{i} │"
            for j, cell in enumerate(row):
                row_str += f"{cell}│"
            print(row_str)
            
            if i < self.board_size - 1:
                print("  ├" + "─┼" * (self.board_size - 1) + "─┤")
        
        print("  └" + "─┴" * (self.board_size - 1) + "─┘")
        print()
    
    def extract_black_pieces_info(self, solution: List[int]) -> Dict:
        """提取黑色积木的位置信息，返回JSON格式的数据"""
        black_pieces = {}

        for row_id in solution:
            placement = self.placements[row_id]
            piece_id = placement['piece_id']
            color = placement['color']
            name = placement['name']
            cells = placement['cells']

            # 只关注黑色积木 (K, k, x)
            if color in ['K', 'k', 'x']:
                # 计算积木的位置信息
                min_row = min(c // self.board_size for c in cells)
                min_col = min(c % self.board_size for c in cells)
                max_row = max(c // self.board_size for c in cells)
                max_col = max(c % self.board_size for c in cells)
                width = max_col - min_col + 1
                height = max_row - min_row + 1

                black_pieces[color] = {
                    "name": name,
                    "color": color,
                    "position": {
                        "top_left": {"row": min_row, "col": min_col},
                        "bottom_right": {"row": max_row, "col": max_col}
                    },
                    "size": {"width": width, "height": height},
                    "cells": [{"row": c // self.board_size, "col": c % self.board_size} for c in cells]
                }

        return black_pieces

    def print_solution_detailed(self, solution: List[int], index: int) -> None:
        """详细打印一个解"""
        print(f"\n{'='*50}")
        print(f"解 #{index + 1}")
        print(f"{'='*50}")

        board = self.solution_to_board(solution)
        self.print_board(board)

        # 打印积木使用情况
        print("积木位置详情：")
        used_pieces = {}
        for row_id in solution:
            placement = self.placements[row_id]
            piece_id = placement['piece_id']
            name = placement['name']
            color = placement['color']
            cells = placement['cells']

            min_row = min(c // 8 for c in cells)
            min_col = min(c % 8 for c in cells)
            max_row = max(c // 8 for c in cells)
            max_col = max(c % 8 for c in cells)

            used_pieces[piece_id] = (name, color, (min_row, min_col), (max_row, max_col))

        for piece_id in sorted(used_pieces.keys()):
            name, color, (min_r, min_c), (max_r, max_c) = used_pieces[piece_id]
            print(f"  {name} ({color}): 左上角({min_r},{min_c}) 右下角({max_r},{max_c})")
    
    def analyze_solutions(self, solutions: List[List[int]]) -> None:
        """分析所有解的统计信息"""
        logger.info("开始分析解的统计信息...")
        
        print(f"\n{'='*60}")
        print("解的统计分析")
        print(f"{'='*60}")
        print(f"总解数：{len(solutions)}")
        print(f"搜索用时：{self.stats.elapsed_time:.2f} 秒")
        print(f"访问节点数：{self.stats.nodes_visited:,}")
        print(f"回溯次数：{self.stats.backtracks:,}")
        print(f"搜索速度：{self.stats.search_rate:.0f} 节点/秒")
        
        if len(solutions) == 0:
            return
        
        # 统计每个积木的位置分布
        piece_positions = defaultdict(lambda: defaultdict(int))
        
        for solution in solutions:
            for row_id in solution:
                placement = self.placements[row_id]
                piece_id = placement['piece_id']
                min_cell = min(placement['cells'])
                pos = (min_cell // 8, min_cell % 8)
                piece_positions[piece_id][pos] += 1
        
        # 显示关键积木的位置分布
        print(f"\n红色块(3×4)左上角位置分布：")
        red_positions = piece_positions[0]
        total = len(solutions)
        
        # 按频率排序
        sorted_positions = sorted(red_positions.items(), key=lambda x: x[1], reverse=True)
        for pos, count in sorted_positions[:10]:  # 只显示前10个最常见位置
            percentage = count / total * 100
            bar = '█' * int(percentage / 2)
            print(f"  位置{pos}: {count:4d}次 ({percentage:5.1f}%) {bar}")
    
    def solve_iteratively(self) -> Iterator[List[List[str]]]:
        """迭代式求解，支持进度显示"""
        logger.info("开始求解8×8棋盘积木铺砌问题...")
        
        # 构建DLX矩阵
        dlx = self.build_dlx_matrix()
        
        # 记录开始时间
        self.stats.start_time = time.time()
        last_progress_time = time.time()
        last_solution_count = 0
        
        # 存储解（用于后续分析）
        all_solutions = []
        displayed_count = 0
        
        # 创建解文件和黑色积木位置文件
        solution_file = None
        black_file = None
        black_json_data = []  # 存储所有黑色积木位置的JSON数据
        black_positions_set = set()  # 用于去重

        if self.config.save_to_file:
            solution_file = open(self.config.filename, 'w', encoding='utf-8')
            solution_file.write(f"8×8棋盘积木铺砌问题解集\n")
            solution_file.write(f"开始时间：{time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            solution_file.write("=" * 60 + "\n\n")

            solution_file.write("积木说明：\n")
            solution_file.write("R: 红色3×4  B: 蓝色3×3  b: 蓝色2×2\n")
            solution_file.write("W: 白色1×5  w: 白色1×4\n")
            solution_file.write("Y: 黄色2×5  y: 黄色2×4  h: 黄色2×3\n")
            solution_file.write("K: 黑色1×3  k: 黑色1×2  x: 黑色1×1\n")
            solution_file.write("=" * 60 + "\n\n")
            solution_file.flush()

            # 创建黑色积木位置文件（文本格式）
            black_file = open('black.txt', 'w', encoding='utf-8')
            black_file.write(f"黑色积木位置统计（去重）\n")
            black_file.write(f"开始时间：{time.strftime('%Y-%m-%d %H:%M:%S')}\n")
            black_file.write("=" * 50 + "\n\n")
            black_file.write("去重说明：\n")
            black_file.write("所有黑色积木被视为等效，只根据它们占用的格子位置进行去重\n")
            black_file.write("黑色积木说明：\n")
            black_file.write("K: 黑色1×3  k: 黑色1×2  x: 黑色1×1\n")
            black_file.write("=" * 50 + "\n\n")
            black_file.flush()
        
        def process_solution(solution: List[int]) -> bool:
            nonlocal last_progress_time, last_solution_count, displayed_count
            
            all_solutions.append(solution)
            
            # 立即将解写入文件
            if solution_file:
                solution_file.write(f"解 #{self.stats.solutions_found}\n")
                board = self.solution_to_board(solution)
                
                # 棋盘字符显示
                solution_file.write("  " + "".join(f" {j}" for j in range(self.board_size)) + "\n")
                solution_file.write("  ┌" + "─┬" * (self.board_size - 1) + "─┐\n")
                
                for row_idx, row in enumerate(board):
                    row_str = f"{row_idx} │"
                    for cell in row:
                        row_str += f"{cell}│"
                    solution_file.write(row_str + "\n")
                    
                    if row_idx < self.board_size - 1:
                        solution_file.write("  ├" + "─┼" * (self.board_size - 1) + "─┤\n")
                
                solution_file.write("  └" + "─┴" * (self.board_size - 1) + "─┘\n")
                solution_file.write("\n")
                solution_file.flush()  # 立即刷新到磁盘
            
            # 提取黑色积木位置信息
            black_pieces_info = self.extract_black_pieces_info(solution)

            # 创建用于去重的位置组合标识符
            # 由于所有黑色方块都是等效的，只考虑它们占用的所有格子位置
            all_black_cells = set()
            for color, info in black_pieces_info.items():
                for cell in info['cells']:
                    all_black_cells.add((cell['row'], cell['col']))

            # 将所有黑色方块占用的格子位置排序作为去重标识符
            position_key = tuple(sorted(all_black_cells))

            # 检查是否已记录过这种位置组合
            if position_key not in black_positions_set:
                black_positions_set.add(position_key)

                # 添加到JSON数据中
                combination_data = {
                    "combination_id": len(black_positions_set),
                    "solution_id": self.stats.solutions_found,
                    "black_pieces": black_pieces_info,
                    "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
                }
                black_json_data.append(combination_data)

                # 写入文本格式的黑色积木位置组合
                if black_file:
                    black_file.write(f"组合 #{len(black_positions_set)}\n")
                    for piece_color, info in sorted(black_pieces_info.items()):
                        piece_name = info['name']
                        pos = info['position']
                        black_file.write(f"  {piece_name} ({piece_color}): 左上角({pos['top_left']['row']},{pos['top_left']['col']}) 右下角({pos['bottom_right']['row']},{pos['bottom_right']['col']})\n")
                    black_file.write("\n")
                    black_file.flush()
            
            # 显示进度
            if self.config.show_progress:
                current_time = time.time()
                if (self.stats.solutions_found % self.config.progress_interval == 0 or
                    current_time - last_progress_time >= 5.0):  # 每5秒也显示一次
                    
                    elapsed = current_time - self.stats.start_time
                    rate = (self.stats.solutions_found - last_solution_count) / (current_time - last_progress_time)
                    
                    progress_msg = (
                        f"进度：找到 {self.stats.solutions_found} 个解 | "
                        f"用时 {elapsed:.1f}秒 | "
                        f"速度 {rate:.1f}解/秒 | "
                        f"访问 {self.stats.nodes_visited:,} 节点"
                    )
                    
                    # 显示到控制台
                    logger.info(progress_msg)
                    
                    last_progress_time = current_time
                    last_solution_count = self.stats.solutions_found
            
            # 显示前几个解
            if displayed_count < self.config.show_first_n:
                self.print_solution_detailed(solution, displayed_count)
                displayed_count += 1
            
            # 检查是否达到最大解数量
            if self.config.max_solutions and self.stats.solutions_found >= self.config.max_solutions:
                logger.info(f"已达到最大解数量限制 {self.config.max_solutions}")
                return False
            
            return True
        
        try:
            # 开始搜索
            logger.info("开始DLX搜索...")
            dlx.search(process_solution)
            
            # 记录结束时间
            self.stats.end_time = time.time()
            
            # 最终统计
            final_msg = f"搜索完成！共找到 {self.stats.solutions_found} 个解"
            total_time_msg = f"总用时：{self.stats.elapsed_time:.2f} 秒"
            
            logger.info(final_msg)
            logger.info(total_time_msg)
            
            # 写入最终统计到解文件
            if solution_file:
                solution_file.write(f"\n{final_msg}\n")
                solution_file.write(f"{total_time_msg}\n")
                solution_file.write(f"访问节点：{self.stats.nodes_visited:,}\n")
                solution_file.write(f"回溯次数：{self.stats.backtracks:,}\n")
                solution_file.write(f"搜索速度：{self.stats.search_rate:.0f} 节点/秒\n")
                solution_file.write(f"结束时间：{time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                solution_file.flush()
            
            # 写入黑色积木统计到 black.txt
            if black_file:
                black_file.write(f"\n总共找到 {len(black_positions_set)} 种不同的黑色积木位置组合\n")
                black_file.write(f"结束时间：{time.strftime('%Y-%m-%d %H:%M:%S')}\n")
                black_file.flush()

            # 保存黑色积木位置为JSON格式
            if self.config.save_black_json and black_json_data:
                try:
                    json_output = {
                        "metadata": {
                            "total_solutions": self.stats.solutions_found,
                            "unique_black_combinations": len(black_positions_set),
                            "deduplication_method": "所有黑色积木被视为等效，只根据它们占用的格子位置进行去重",
                            "start_time": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(self.stats.start_time)),
                            "end_time": time.strftime('%Y-%m-%d %H:%M:%S'),
                            "elapsed_time_seconds": self.stats.elapsed_time,
                            "board_size": self.board_size
                        },
                        "piece_definitions": {
                            "K": {"name": "黑色1×3", "size": {"width": 1, "height": 3}},
                            "k": {"name": "黑色1×2", "size": {"width": 1, "height": 2}},
                            "x": {"name": "黑色1×1", "size": {"width": 1, "height": 1}}
                        },
                        "black_piece_combinations": black_json_data
                    }

                    with open(self.config.black_json_filename, 'w', encoding='utf-8') as json_file:
                        json.dump(json_output, json_file, ensure_ascii=False, indent=2)

                    logger.info(f"黑色积木位置JSON数据已保存到 {self.config.black_json_filename}")

                except Exception as e:
                    logger.error(f"保存JSON文件失败: {e}")

            # 分析解
            if all_solutions:
                self.analyze_solutions(all_solutions)

            return all_solutions
        
        finally:
            # 确保所有文件正确关闭
            if solution_file:
                try:
                    solution_file.close()
                    logger.info(f"所有解已保存到 {self.config.filename}")
                except Exception as e:
                    logger.error(f"关闭解文件失败: {e}")

            if black_file:
                try:
                    black_file.close()
                    logger.info(f"黑色积木位置文本格式已保存到 black.txt")
                except Exception as e:
                    logger.error(f"关闭黑色积木文件失败: {e}")
    
    def save_solutions(self, solutions: List[List[int]]) -> bool:
        """保存所有解到文件"""
        try:
            with open(self.config.filename, 'w', encoding='utf-8') as f:
                f.write(f"8×8棋盘积木铺砌问题 - 共{len(solutions)}个解\n")
                f.write(f"求解时间：{self.stats.elapsed_time:.2f}秒\n")
                f.write(f"访问节点：{self.stats.nodes_visited:,}\n")
                f.write(f"回溯次数：{self.stats.backtracks:,}\n")
                f.write("=" * 60 + "\n\n")
                
                f.write("积木说明：\n")
                f.write("R: 红色3×4  B: 蓝色3×3  b: 蓝色2×2\n")
                f.write("W: 白色1×5  w: 白色1×4\n")
                f.write("Y: 黄色2×5  y: 黄色2×4  h: 黄色2×3\n")
                f.write("K: 黑色1×3  k: 黑色1×2  x: 黑色1×1\n")
                f.write("=" * 60 + "\n\n")
                
                for i, solution in enumerate(solutions):
                    f.write(f"解 #{i + 1}\n")
                    board = self.solution_to_board(solution)
                    
                    # 棋盘字符显示
                    f.write("  " + "".join(f" {j}" for j in range(self.board_size)) + "\n")
                    f.write("  ┌" + "─┬" * (self.board_size - 1) + "─┐\n")
                    
                    for row_idx, row in enumerate(board):
                        row_str = f"{row_idx} │"
                        for cell in row:
                            row_str += f"{cell}│"
                        f.write(row_str + "\n")
                        
                        if row_idx < self.board_size - 1:
                            f.write("  ├" + "─┼" * (self.board_size - 1) + "─┤\n")
                    
                    f.write("  └" + "─┴" * (self.board_size - 1) + "─┘\n")
                    f.write("\n")
            
            logger.info(f"所有解已保存到 {self.config.filename}")
            return True
            
        except IOError as e:
            logger.error(f"保存文件失败: {e}")
            return False


def main():
    """主函数"""
    parser = argparse.ArgumentParser(description='8×8棋盘积木铺砌问题求解器')
    parser.add_argument('--max-solutions', type=int, help='最大解数量限制')
    parser.add_argument('--no-save', action='store_true', help='不保存解到文件')
    parser.add_argument('--filename', default='solution.txt', help='保存解的文件名')
    parser.add_argument('--show-first', type=int, default=5, help='显示前n个解')
    parser.add_argument('--quiet', action='store_true', help='减少输出信息')
    parser.add_argument('--no-json', action='store_true', help='不保存黑色积木位置为JSON格式')
    parser.add_argument('--json-filename', default='black_positions.json', help='JSON文件名')

    args = parser.parse_args()

    # 配置日志级别
    if args.quiet:
        logger.setLevel(logging.WARNING)

    # 创建配置
    config = SolverConfig(
        max_solutions=args.max_solutions,
        save_to_file=not args.no_save,
        filename=args.filename,
        show_first_n=args.show_first,
        save_black_json=not args.no_json,
        black_json_filename=args.json_filename
    )
    
    print("=" * 60)
    print("8×8棋盘积木铺砌问题求解器 v2.0")
    print("=" * 60)
    print("\n积木配置：")
    print("R: 红色3×4  B: 蓝色3×3  b: 蓝色2×2")
    print("W: 白色1×5  w: 白色1×4")
    print("Y: 黄色2×5  y: 黄色2×4  h: 黄色2×3")
    print("K: 黑色1×3  k: 黑色1×2  x: 黑色1×1")
    print("=" * 60 + "\n")
    
    try:
        solver = TilingSolver(config)
        solutions = list(solver.solve_iteratively())
        
        if not solutions:
            print("\n未找到任何解！")
        elif len(solutions) > config.show_first_n:
            print(f"\n... 还有 {len(solutions) - config.show_first_n} 个解未显示")
            
    except KeyboardInterrupt:
        logger.warning("\n用户中断搜索")
    except Exception as e:
        logger.error(f"程序出错：{e}", exc_info=True)
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())