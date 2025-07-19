#!/usr/bin/env python3
"""
8×8棋盘积木铺砌问题求解器
使用DLX（Dancing Links）算法找出所有可能的铺法
"""

import time
from typing import List, Tuple, Set, Dict
from collections import defaultdict

class DLXNode:
    """Dancing Links节点"""
    def __init__(self):
        self.left = self.right = self.up = self.down = self
        self.column = None
        self.row_id = -1

class ColumnNode(DLXNode):
    """列头节点"""
    def __init__(self, name: str):
        super().__init__()
        self.size = 0
        self.name = name

class DancingLinks:
    """Dancing Links算法实现"""
    def __init__(self):
        self.header = ColumnNode("header")
        self.columns = []
        self.rows = []
        self.solution = []
        self.solutions = []
        
    def add_column(self, name: str):
        """添加新列"""
        col = ColumnNode(name)
        col.left = self.header.left
        col.right = self.header
        self.header.left.right = col
        self.header.left = col
        self.columns.append(col)
        return col
    
    def add_row(self, row: List[int]):
        """添加新行"""
        prev = None
        first = None
        row_nodes = []
        
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
    
    def cover(self, col: ColumnNode):
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
    
    def uncover(self, col: ColumnNode):
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
    
    def search(self, k: int = 0):
        """递归搜索所有解"""
        if self.header.right == self.header:
            # 找到一个解
            self.solutions.append(self.solution[:])
            return
        
        # 选择包含最少1的列
        col = None
        s = float('inf')
        j = self.header.right
        while j != self.header:
            if j.size < s:
                col = j
                s = j.size
            j = j.right
        
        # 覆盖选中的列
        self.cover(col)
        
        # 尝试该列中的每一行
        row = col.down
        while row != col:
            self.solution.append(row.row_id)
            
            # 覆盖该行中的其他列
            j = row.right
            while j != row:
                self.cover(j.column)
                j = j.right
            
            # 递归搜索
            self.search(k + 1)
            
            # 回溯
            self.solution.pop()
            j = row.left
            while j != row:
                self.uncover(j.column)
                j = j.left
            
            row = row.down
        
        self.uncover(col)

class TilingSolver:
    """积木铺砌问题求解器"""
    
    def __init__(self):
        # 定义积木（名称，宽，高，颜色代码）
        self.pieces = [
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
        self.board_size = 8
        self.placements = []  # 存储所有可能的放置方案
        
    def get_piece_positions(self, piece_id: int, width: int, height: int):
        """获取一个积木的所有可能放置位置"""
        positions = []
        
        # 尝试两种方向（原始和旋转90度）
        for w, h in [(width, height), (height, width)]:
            if w == h:  # 正方形只需要一种方向
                if (w, h) != (width, height):
                    continue
            
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
    
    def build_dlx_matrix(self):
        """构建DLX矩阵"""
        dlx = DancingLinks()
        
        # 添加列：64个格子 + 11个积木
        for i in range(self.board_size * self.board_size):
            dlx.add_column(f"cell_{i}")
        for i in range(len(self.pieces)):
            dlx.add_column(f"piece_{i}")
        
        # 生成所有可能的放置方案
        self.placements = []
        for piece_id, (name, width, height, color) in enumerate(self.pieces):
            positions = self.get_piece_positions(piece_id, width, height)
            for pid, cells in positions:
                placement = {
                    'piece_id': piece_id,
                    'cells': cells,
                    'color': color
                }
                self.placements.append(placement)
                
                # 构建DLX矩阵的行
                row = cells + [64 + piece_id]
                dlx.add_row(row)
        
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
    
    def print_board(self, board: List[List[str]]):
        """打印棋盘"""
        print("  " + " ".join(str(i) for i in range(self.board_size)))
        for i, row in enumerate(board):
            print(f"{i} " + " ".join(row))
        print()
    
    def print_solution_detailed(self, solution: List[int], index: int):
        """详细打印一个解"""
        print(f"\n=== 解 #{index + 1} ===")
        board = self.solution_to_board(solution)
        self.print_board(board)
        
        # 打印积木使用情况
        print("积木位置：")
        for row_id in solution:
            placement = self.placements[row_id]
            piece = self.pieces[placement['piece_id']]
            cells = placement['cells']
            positions = [(c // 8, c % 8) for c in cells]
            print(f"  {piece[0]} ({piece[3]}): {positions}")
    
    def analyze_solutions(self, solutions: List[List[int]]):
        """分析所有解的统计信息"""
        print(f"\n=== 解的统计分析 ===")
        print(f"总解数：{len(solutions)}")
        
        if len(solutions) == 0:
            return
        
        # 统计红色块（最大块）的位置分布
        red_positions = defaultdict(int)
        for solution in solutions:
            for row_id in solution:
                placement = self.placements[row_id]
                if placement['piece_id'] == 0:  # 红色块
                    min_cell = min(placement['cells'])
                    pos = (min_cell // 8, min_cell % 8)
                    red_positions[pos] += 1
        
        print("\n红色块(3×4)左上角位置分布：")
        for pos, count in sorted(red_positions.items()):
            print(f"  位置{pos}: {count}次 ({count/len(solutions)*100:.1f}%)")
    
    def solve(self):
        """求解问题"""
        print("正在构建DLX矩阵...")
        dlx = self.build_dlx_matrix()
        print(f"矩阵规模：{len(self.placements)}行 × {64 + len(self.pieces)}列")
        
        print("\n正在搜索所有解...")
        start_time = time.time()
        dlx.search()
        end_time = time.time()
        
        print(f"\n搜索完成！")
        print(f"找到 {len(dlx.solutions)} 个解")
        print(f"用时：{end_time - start_time:.2f} 秒")
        
        return dlx.solutions
    
    def save_solutions(self, solutions: List[List[int]], filename: str = "solutions.txt"):
        """保存所有解到文件"""
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(f"8×8棋盘积木铺砌问题 - 共{len(solutions)}个解\n")
            f.write("=" * 50 + "\n\n")
            
            for i, solution in enumerate(solutions):
                f.write(f"解 #{i + 1}\n")
                board = self.solution_to_board(solution)
                for row in board:
                    f.write(" ".join(row) + "\n")
                f.write("\n")
        
        print(f"\n所有解已保存到 {filename}")

def main():
    """主函数"""
    print("8×8棋盘积木铺砌问题求解器")
    print("=" * 40)
    print("\n积木说明：")
    print("R: 红色3×4  B: 蓝色3×3  b: 蓝色2×2")
    print("W: 白色1×5  w: 白色1×4")
    print("Y: 黄色2×5  y: 黄色2×4  h: 黄色2×3")
    print("K: 黑色1×3  k: 黑色1×2  x: 黑色1×1")
    print("=" * 40)
    
    solver = TilingSolver()
    solutions = solver.solve()
    
    if solutions:
        # 分析解
        solver.analyze_solutions(solutions)
        
        # 显示前几个解
        num_to_show = min(5, len(solutions))
        print(f"\n显示前{num_to_show}个解：")
        for i in range(num_to_show):
            solver.print_solution_detailed(solutions[i], i)
        
        if len(solutions) > num_to_show:
            print(f"\n... 还有 {len(solutions) - num_to_show} 个解未显示")
        
        # 询问是否保存所有解
        if len(solutions) <= 10000:
            save = input("\n是否保存所有解到文件？(y/n): ")
            if save.lower() == 'y':
                solver.save_solutions(solutions)
    else:
        print("\n未找到任何解！")

if __name__ == "__main__":
    main()