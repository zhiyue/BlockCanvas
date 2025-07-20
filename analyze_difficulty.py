#!/usr/bin/env python3
"""
黑色方块布局难度分析工具
分析现有的 black_positions.json 文件，生成详细的难度评分报告
"""

import json
import argparse
import sys
from typing import Dict, List
from collections import defaultdict

def calculate_difficulty_score(black_pieces_info: Dict) -> Dict:
    """计算黑色方块布局的难度评分"""
    if not black_pieces_info:
        return {"total_score": 0, "difficulty": "beginner", "factors": {}}
    
    # 获取所有黑色方块占用的格子
    all_cells = []
    for piece_info in black_pieces_info.values():
        all_cells.extend(piece_info['cells'])
    
    if not all_cells:
        return {"total_score": 0, "difficulty": "beginner", "factors": {}}
    
    # 1. 分散程度评分
    min_x = min(cell['col'] for cell in all_cells)
    max_x = max(cell['col'] for cell in all_cells)
    min_y = min(cell['row'] for cell in all_cells)
    max_y = max(cell['row'] for cell in all_cells)
    
    spread_x = max_x - min_x
    spread_y = max_y - min_y
    total_spread = spread_x + spread_y
    spread_score = min(total_spread * 10, 100)
    
    # 2. 碎片化程度评分
    cell_set = set((cell['row'], cell['col']) for cell in all_cells)
    visited = set()
    regions = 0
    
    def dfs(row, col):
        if (row, col) in visited or (row, col) not in cell_set:
            return
        visited.add((row, col))
        for dr, dc in [(0,1), (0,-1), (1,0), (-1,0)]:
            dfs(row + dr, col + dc)
    
    for cell in all_cells:
        if (cell['row'], cell['col']) not in visited:
            regions += 1
            dfs(cell['row'], cell['col'])
    
    fragmentation_score = (regions - 1) * 30
    
    # 3. 边缘接近度评分
    edge_distance = 0
    for cell in all_cells:
        dist_to_edge = min(cell['row'], cell['col'], 7 - cell['row'], 7 - cell['col'])
        edge_distance += dist_to_edge
    
    avg_edge_distance = edge_distance / len(all_cells)
    edge_proximity_score = max(0, (3 - avg_edge_distance) * 20)
    
    # 4. 连通性评分
    adjacent_pairs = 0
    cell_map = {(cell['row'], cell['col']): True for cell in all_cells}
    
    for cell in all_cells:
        for dr, dc in [(0,1), (0,-1), (1,0), (-1,0)]:
            neighbor = (cell['row'] + dr, cell['col'] + dc)
            if neighbor in cell_map:
                adjacent_pairs += 1
    
    connectivity_ratio = adjacent_pairs / (len(all_cells) * 2) if all_cells else 0
    connectivity_score = (1 - connectivity_ratio) * 40
    
    # 5. 对称性评分
    symmetry_score = 0
    
    # 检查水平对称
    horizontal_symmetric = True
    for cell in all_cells:
        mirror_col = 7 - cell['col']
        if (cell['row'], mirror_col) not in cell_map:
            horizontal_symmetric = False
            break
    
    # 检查垂直对称
    vertical_symmetric = True
    for cell in all_cells:
        mirror_row = 7 - cell['row']
        if (mirror_row, cell['col']) not in cell_map:
            vertical_symmetric = False
            break
    
    if horizontal_symmetric or vertical_symmetric:
        symmetry_score = -20
    
    # 6. 角落占用评分
    corners = [(0,0), (0,7), (7,0), (7,7)]
    corner_occupied = sum(1 for corner in corners if corner in cell_map)
    corner_occupation_score = corner_occupied * 15
    
    # 计算总分
    total_score = max(0, 
        spread_score + 
        fragmentation_score + 
        edge_proximity_score + 
        connectivity_score + 
        symmetry_score + 
        corner_occupation_score
    )
    
    # 确定难度等级
    if total_score < 50:
        difficulty = "beginner"
    elif total_score < 100:
        difficulty = "advanced"
    elif total_score < 150:
        difficulty = "master"
    else:
        difficulty = "grandmaster"
    
    return {
        "total_score": round(total_score, 2),
        "difficulty": difficulty,
        "factors": {
            "spread": {"score": round(spread_score, 2), "value": total_spread, "description": f"分散程度: {total_spread}格距离"},
            "fragmentation": {"score": round(fragmentation_score, 2), "value": regions, "description": f"碎片化: {regions}个独立区域"},
            "edge_proximity": {"score": round(edge_proximity_score, 2), "value": round(avg_edge_distance, 2), "description": f"边缘接近: 平均距离{avg_edge_distance:.1f}格"},
            "connectivity": {"score": round(connectivity_score, 2), "value": round(connectivity_ratio, 2), "description": f"连通性: {connectivity_ratio*100:.1f}%相邻率"},
            "symmetry": {"score": round(symmetry_score, 2), "value": 1 if (horizontal_symmetric or vertical_symmetric) else 0, "description": f"对称性: {'对称' if (horizontal_symmetric or vertical_symmetric) else '非对称'}"},
            "corner_occupation": {"score": round(corner_occupation_score, 2), "value": corner_occupied, "description": f"角落占用: {corner_occupied}个角落"}
        }
    }

def analyze_black_positions_file(filename: str) -> None:
    """分析黑色方块位置文件"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"错误：找不到文件 {filename}")
        return
    except json.JSONDecodeError:
        print(f"错误：{filename} 不是有效的JSON文件")
        return
    
    combinations = data.get('black_piece_combinations', [])
    if not combinations:
        print("错误：文件中没有找到黑色方块组合数据")
        return
    
    print(f"分析 {len(combinations)} 个黑色方块布局组合...")
    print("=" * 80)
    
    # 统计信息
    difficulty_counts = defaultdict(int)
    all_scores = []
    
    for i, combination in enumerate(combinations):
        black_pieces = combination.get('black_pieces', {})
        score_data = calculate_difficulty_score(black_pieces)
        all_scores.append(score_data['total_score'])
        difficulty_counts[score_data['difficulty']] += 1
        
        print(f"\n组合 #{combination.get('combination_id', i+1)}")
        print(f"难度评分: {score_data['total_score']} ({score_data['difficulty']})")
        
        # 显示各因子得分
        for factor_name, factor_data in score_data['factors'].items():
            print(f"  {factor_data['description']}: {factor_data['score']}分")
    
    # 总体统计
    print("\n" + "=" * 80)
    print("总体统计:")
    print(f"总组合数: {len(combinations)}")
    print(f"平均分数: {sum(all_scores) / len(all_scores):.2f}")
    print(f"最高分数: {max(all_scores):.2f}")
    print(f"最低分数: {min(all_scores):.2f}")
    
    print("\n难度分布:")
    difficulty_names = {
        "beginner": "入门",
        "advanced": "进阶", 
        "master": "大师",
        "grandmaster": "宗师"
    }
    
    for difficulty, count in difficulty_counts.items():
        percentage = count / len(combinations) * 100
        print(f"  {difficulty_names[difficulty]}: {count} ({percentage:.1f}%)")

def main():
    parser = argparse.ArgumentParser(description='分析黑色方块布局难度')
    parser.add_argument('filename', nargs='?', default='black_positions.json', 
                       help='黑色方块位置JSON文件路径 (默认: black_positions.json)')
    parser.add_argument('--output', '-o', help='输出分析结果到文件')
    
    args = parser.parse_args()
    
    if args.output:
        # 重定向输出到文件
        original_stdout = sys.stdout
        try:
            with open(args.output, 'w', encoding='utf-8') as f:
                sys.stdout = f
                analyze_black_positions_file(args.filename)
        finally:
            sys.stdout = original_stdout
        print(f"分析结果已保存到 {args.output}")
    else:
        analyze_black_positions_file(args.filename)

if __name__ == "__main__":
    main()
