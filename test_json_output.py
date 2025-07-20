#!/usr/bin/env python3
"""
测试黑色积木位置JSON输出的正确性
"""

import json
import sys

def test_json_structure(filename='black_positions.json'):
    """测试JSON文件的结构和数据完整性"""
    try:
        with open(filename, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"✓ JSON文件 {filename} 加载成功")
        
        # 检查顶级结构
        required_keys = ['metadata', 'piece_definitions', 'black_piece_combinations']
        for key in required_keys:
            if key not in data:
                print(f"✗ 缺少必需的键: {key}")
                return False
            print(f"✓ 找到键: {key}")
        
        # 检查元数据
        metadata = data['metadata']
        metadata_keys = ['total_solutions', 'unique_black_combinations', 'start_time', 'end_time', 'elapsed_time_seconds', 'board_size']
        for key in metadata_keys:
            if key not in metadata:
                print(f"✗ 元数据缺少键: {key}")
                return False
        print(f"✓ 元数据完整，总解数: {metadata['total_solutions']}, 唯一组合: {metadata['unique_black_combinations']}")
        
        # 检查积木定义
        piece_defs = data['piece_definitions']
        expected_pieces = ['K', 'k', 'x']
        for piece in expected_pieces:
            if piece not in piece_defs:
                print(f"✗ 积木定义缺少: {piece}")
                return False
            if 'name' not in piece_defs[piece] or 'size' not in piece_defs[piece]:
                print(f"✗ 积木 {piece} 定义不完整")
                return False
        print(f"✓ 积木定义完整，包含 {len(piece_defs)} 种黑色积木")
        
        # 检查黑色积木组合
        combinations = data['black_piece_combinations']
        print(f"✓ 找到 {len(combinations)} 个黑色积木组合")
        
        for i, combo in enumerate(combinations):
            # 检查组合结构
            combo_keys = ['combination_id', 'solution_id', 'black_pieces', 'timestamp']
            for key in combo_keys:
                if key not in combo:
                    print(f"✗ 组合 {i+1} 缺少键: {key}")
                    return False
            
            # 检查黑色积木
            black_pieces = combo['black_pieces']
            for color, piece in black_pieces.items():
                piece_keys = ['name', 'color', 'position', 'size', 'cells']
                for key in piece_keys:
                    if key not in piece:
                        print(f"✗ 组合 {i+1} 积木 {color} 缺少键: {key}")
                        return False
                
                # 检查位置信息
                pos = piece['position']
                if 'top_left' not in pos or 'bottom_right' not in pos:
                    print(f"✗ 组合 {i+1} 积木 {color} 位置信息不完整")
                    return False
                
                # 检查坐标范围
                tl = pos['top_left']
                br = pos['bottom_right']
                if not (0 <= tl['row'] <= 7 and 0 <= tl['col'] <= 7 and 
                       0 <= br['row'] <= 7 and 0 <= br['col'] <= 7):
                    print(f"✗ 组合 {i+1} 积木 {color} 坐标超出范围")
                    return False
                
                # 检查格子数量
                expected_cells = piece['size']['width'] * piece['size']['height']
                if len(piece['cells']) != expected_cells:
                    print(f"✗ 组合 {i+1} 积木 {color} 格子数量不匹配: 期望 {expected_cells}, 实际 {len(piece['cells'])}")
                    return False
        
        print(f"✓ 所有 {len(combinations)} 个组合的数据结构都正确")
        
        # 验证去重功能
        position_keys = set()
        for combo in combinations:
            key = tuple(sorted(
                (color, info['position']['top_left']['row'], info['position']['top_left']['col'])
                for color, info in combo['black_pieces'].items()
            ))
            if key in position_keys:
                print(f"✗ 发现重复的位置组合")
                return False
            position_keys.add(key)
        
        print(f"✓ 所有组合都是唯一的，去重功能正常")
        
        # 显示统计信息
        print("\n=== 统计信息 ===")
        print(f"总解数: {metadata['total_solutions']}")
        print(f"唯一黑色积木组合: {metadata['unique_black_combinations']}")
        print(f"处理时间: {metadata['elapsed_time_seconds']:.4f} 秒")
        print(f"棋盘大小: {metadata['board_size']}×{metadata['board_size']}")
        
        # 显示每个组合的简要信息
        print("\n=== 组合详情 ===")
        for combo in combinations:
            print(f"组合 #{combo['combination_id']} (来自解 #{combo['solution_id']}):")
            for color, piece in combo['black_pieces'].items():
                pos = piece['position']
                print(f"  {piece['name']} ({color}): ({pos['top_left']['row']},{pos['top_left']['col']}) -> ({pos['bottom_right']['row']},{pos['bottom_right']['col']})")
        
        print(f"\n✓ JSON文件 {filename} 验证通过！")
        return True
        
    except FileNotFoundError:
        print(f"✗ 文件 {filename} 不存在")
        return False
    except json.JSONDecodeError as e:
        print(f"✗ JSON格式错误: {e}")
        return False
    except Exception as e:
        print(f"✗ 验证过程中出错: {e}")
        return False

def main():
    """主函数"""
    filename = sys.argv[1] if len(sys.argv) > 1 else 'black_positions.json'
    
    print("=" * 60)
    print("黑色积木位置JSON文件验证工具")
    print("=" * 60)
    
    success = test_json_structure(filename)
    
    if success:
        print("\n🎉 所有测试通过！JSON文件格式正确，可以安全地用于前端应用。")
        return 0
    else:
        print("\n❌ 测试失败！请检查JSON文件的生成过程。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
