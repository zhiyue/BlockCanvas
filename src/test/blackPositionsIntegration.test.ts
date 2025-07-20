import { describe, it, expect } from 'vitest';
import { SAMPLE_CHALLENGES } from '../data/challenges';
import { BLACK_POSITIONS_DATA, SOLVER_CHALLENGES } from '../data/blackPositions';

describe('Black Positions Integration', () => {
  it('should have challenges generated from black positions data', () => {
    expect(SAMPLE_CHALLENGES.length).toBeGreaterThan(0);
    expect(SAMPLE_CHALLENGES).toEqual(SOLVER_CHALLENGES);
  });

  it('should have the same number of challenges as black piece combinations', () => {
    expect(SAMPLE_CHALLENGES.length).toBe(BLACK_POSITIONS_DATA.black_piece_combinations.length);
  });

  it('should have valid challenge structure', () => {
    SAMPLE_CHALLENGES.forEach(challenge => {
      expect(challenge).toHaveProperty('id');
      expect(challenge).toHaveProperty('name');
      expect(challenge).toHaveProperty('difficulty');
      expect(challenge).toHaveProperty('starterBlocks');
      expect(challenge).toHaveProperty('availableBlocks');
      
      expect(challenge.id).toMatch(/^solver-\d+$/);
      expect(['beginner', 'advanced', 'master', 'grandmaster']).toContain(challenge.difficulty);
      expect(challenge.starterBlocks).toHaveLength(3); // 应该有3个黑色积木
      expect(challenge.availableBlocks).toHaveLength(8); // 应该有8个彩色积木
    });
  });

  it('should have correct black piece mappings', () => {
    SAMPLE_CHALLENGES.forEach(challenge => {
      const starterBlocks = challenge.starterBlocks;
      
      // 检查是否包含所有三种黑色积木
      const blockIds = starterBlocks.map(block => block.blockId);
      expect(blockIds).toContain('black-1x1');
      expect(blockIds).toContain('black-1x2');
      expect(blockIds).toContain('black-1x3');
      
      // 检查位置是否在有效范围内
      starterBlocks.forEach(block => {
        expect(block.position.x).toBeGreaterThanOrEqual(0);
        expect(block.position.x).toBeLessThan(8);
        expect(block.position.y).toBeGreaterThanOrEqual(0);
        expect(block.position.y).toBeLessThan(8);
        expect(block.rotation).toBeGreaterThanOrEqual(0);
        expect(block.rotation).toBeLessThan(4);
      });
    });
  });

  it('should have meaningful challenge names', () => {
    SAMPLE_CHALLENGES.forEach(challenge => {
      expect(challenge.name).toMatch(/^(入门|进阶|大师|宗师)挑战：.+布局 \d+$/);
    });
  });

  it('should have different difficulty levels', () => {
    const difficulties = new Set(SAMPLE_CHALLENGES.map(c => c.difficulty));
    expect(difficulties.size).toBeGreaterThan(1); // 应该有多种难度
  });

  it('should maintain original black positions data integrity', () => {
    expect(BLACK_POSITIONS_DATA).toHaveProperty('metadata');
    expect(BLACK_POSITIONS_DATA).toHaveProperty('piece_definitions');
    expect(BLACK_POSITIONS_DATA).toHaveProperty('black_piece_combinations');
    
    expect(BLACK_POSITIONS_DATA.metadata.total_solutions).toBeGreaterThan(0);
    expect(BLACK_POSITIONS_DATA.metadata.unique_black_combinations).toBeGreaterThan(0);
    expect(BLACK_POSITIONS_DATA.metadata.board_size).toBe(8);
    
    expect(BLACK_POSITIONS_DATA.piece_definitions).toHaveProperty('K');
    expect(BLACK_POSITIONS_DATA.piece_definitions).toHaveProperty('k');
    expect(BLACK_POSITIONS_DATA.piece_definitions).toHaveProperty('x');
  });

  it('should have unique challenge IDs', () => {
    const ids = SAMPLE_CHALLENGES.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should have consistent available blocks across all challenges', () => {
    const expectedBlocks = [
      'red-3x4', 'blue-3x3', 'blue-2x2', 
      'white-1x5', 'white-1x4', 
      'yellow-2x5', 'yellow-2x4', 'yellow-2x3'
    ];
    
    SAMPLE_CHALLENGES.forEach(challenge => {
      expect(challenge.availableBlocks).toEqual(expectedBlocks);
    });
  });
});

describe('Challenge Difficulty Distribution', () => {
  it('should have a reasonable distribution of difficulties', () => {
    const difficultyCount = SAMPLE_CHALLENGES.reduce((acc, challenge) => {
      acc[challenge.difficulty] = (acc[challenge.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('Difficulty distribution:', difficultyCount);
    
    // 至少应该有一些不同的难度级别
    expect(Object.keys(difficultyCount).length).toBeGreaterThanOrEqual(1);
  });
});
