import { Challenge } from '../types/game';
import { SOLVER_CHALLENGES, getSolverStats, isSolverChallenge, getChallengeDetails } from './blackPositions';

// 完全使用基于 black_positions.json 数据生成的挑战
export const SAMPLE_CHALLENGES: Challenge[] = SOLVER_CHALLENGES;

// 导出求解器相关功能
export { getSolverStats, isSolverChallenge, getChallengeDetails };

// Get challenges by difficulty
export const getChallengesByDifficulty = (difficulty: Challenge['difficulty']): Challenge[] => {
  return SAMPLE_CHALLENGES.filter(challenge => challenge.difficulty === difficulty);
};

// Get challenge by ID
export const getChallengeById = (id: string): Challenge | undefined => {
  return SAMPLE_CHALLENGES.find(challenge => challenge.id === id);
};

// Get next challenge in the same difficulty
export const getNextChallenge = (currentId: string): Challenge | undefined => {
  const currentIndex = SAMPLE_CHALLENGES.findIndex(c => c.id === currentId);
  if (currentIndex === -1 || currentIndex === SAMPLE_CHALLENGES.length - 1) {
    return undefined;
  }
  return SAMPLE_CHALLENGES[currentIndex + 1];
};

// Get previous challenge in the same difficulty
export const getPreviousChallenge = (currentId: string): Challenge | undefined => {
  const currentIndex = SAMPLE_CHALLENGES.findIndex(c => c.id === currentId);
  if (currentIndex <= 0) {
    return undefined;
  }
  return SAMPLE_CHALLENGES[currentIndex - 1];
};