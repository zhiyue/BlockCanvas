import { Challenge } from '../types/game';

export const SAMPLE_CHALLENGES: Challenge[] = [
  {
    id: 'beginner-1',
    name: '入门挑战 1',
    difficulty: 'beginner',
    starterBlocks: [
      {
        blockId: 'black-1x1',
        position: { x: 0, y: 0 },
        rotation: 0
      },
      {
        blockId: 'black-1x2',
        position: { x: 6, y: 7 },
        rotation: 0
      },
      {
        blockId: 'black-1x3',
        position: { x: 2, y: 5 },
        rotation: 0
      }
    ],
    availableBlocks: [
      'red-3x4', 'blue-3x3', 'blue-2x2', 'white-1x5', 'white-1x4', 'yellow-2x5', 'yellow-2x4', 'yellow-2x3'
    ]
  },
  
  {
    id: 'beginner-2',
    name: '入门挑战 2',
    difficulty: 'beginner',
    starterBlocks: [
      {
        blockId: 'black-1x3',
        position: { x: 0, y: 0 },
        rotation: 0
      },
      {
        blockId: 'black-1x1',
        position: { x: 7, y: 7 },
        rotation: 0
      },
      {
        blockId: 'black-1x2',
        position: { x: 3, y: 4 },
        rotation: 1
      }
    ],
    availableBlocks: [
      'red-3x4', 'blue-3x3', 'blue-2x2', 'white-1x5', 'white-1x4', 'yellow-2x5', 'yellow-2x4', 'yellow-2x3'
    ]
  },

  {
    id: 'advanced-1',
    name: '进阶挑战 1',
    difficulty: 'advanced',
    starterBlocks: [
      {
        blockId: 'black-1x2',
        position: { x: 3, y: 3 },
        rotation: 0
      },
      {
        blockId: 'black-1x1',
        position: { x: 1, y: 1 },
        rotation: 0
      },
      {
        blockId: 'black-1x3',
        position: { x: 5, y: 6 },
        rotation: 1
      }
    ],
    availableBlocks: [
      'red-3x4', 'blue-3x3', 'blue-2x2', 'white-1x5', 'white-1x4', 'yellow-2x5', 'yellow-2x4', 'yellow-2x3'
    ]
  },

  {
    id: 'advanced-2',
    name: '进阶挑战 2',
    difficulty: 'advanced',
    starterBlocks: [
      {
        blockId: 'black-1x3',
        position: { x: 2, y: 2 },
        rotation: 0
      },
      {
        blockId: 'black-1x2',
        position: { x: 6, y: 1 },
        rotation: 1
      },
      {
        blockId: 'black-1x1',
        position: { x: 0, y: 6 },
        rotation: 0
      }
    ],
    availableBlocks: [
      'red-3x4', 'blue-3x3', 'blue-2x2', 'white-1x5', 'white-1x4', 'yellow-2x5', 'yellow-2x4', 'yellow-2x3'
    ]
  },

  {
    id: 'master-1',
    name: '大师挑战 1',
    difficulty: 'master',
    starterBlocks: [
      {
        blockId: 'black-1x1',
        position: { x: 4, y: 4 },
        rotation: 0
      },
      {
        blockId: 'black-1x2',
        position: { x: 1, y: 7 },
        rotation: 0
      },
      {
        blockId: 'black-1x3',
        position: { x: 6, y: 2 },
        rotation: 1
      }
    ],
    availableBlocks: [
      'red-3x4', 'blue-3x3', 'blue-2x2', 'white-1x5', 'white-1x4', 'yellow-2x5', 'yellow-2x4', 'yellow-2x3'
    ]
  },

  {
    id: 'grandmaster-1',
    name: '宗师挑战',
    difficulty: 'grandmaster',
    starterBlocks: [
      {
        blockId: 'black-1x1',
        position: { x: 3, y: 3 },
        rotation: 0
      },
      {
        blockId: 'black-1x2',
        position: { x: 0, y: 0 },
        rotation: 0
      },
      {
        blockId: 'black-1x3',
        position: { x: 5, y: 5 },
        rotation: 1
      }
    ],
    availableBlocks: [
      'red-3x4', 'blue-3x3', 'blue-2x2', 'white-1x5', 'white-1x4', 'yellow-2x5', 'yellow-2x4', 'yellow-2x3'
    ]
  }
];

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