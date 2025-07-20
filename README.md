# 🧩 Mondrian Blocks

A colorful logic puzzle game inspired by the abstract art of Piet Mondrian. Challenge your spatial reasoning and problem-solving skills by fitting uniquely shaped blocks into an 8×8 grid.

![Mondrian Blocks Game](https://via.placeholder.com/800x400/667eea/ffffff?text=Mondrian+Blocks+Game)

## 🎮 Game Features

- **11 Unique Blocks**: Diverse geometric shapes totaling 64 areas, with distinct colors inspired by Mondrian's palette
- **AI-Generated Challenges**: Hundreds of puzzles generated using advanced solving algorithms
- **Intelligent Difficulty System**: Multi-factor scoring system for precise difficulty classification
- **Multiple Difficulty Levels**: From Beginner to Grandmaster with scientific difficulty assessment
- **Interactive Gameplay**: Click-to-select and place blocks with rotation support
- **Mobile-Optimized**: Touch gestures, swipe controls, and responsive design for all devices
- **Real-time Feedback**: Instant collision detection and win condition checking
- **Persistent Progress**: Your game state is automatically saved
- **Performance Optimized**: Smooth 60fps gameplay with efficient rendering
- **Accessibility Features**: Screen reader support and keyboard navigation

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd BlockCanvas
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

Live demo: [https://blockcanvas.deploy.cv](https://blockcanvas.deploy.cv)

## 🎯 How to Play

1. **Select a Block**: Click on any colored block from the inventory
2. **Rotate (Optional)**: Use the "Rotate (90°)" button to change orientation
3. **Place the Block**: Click on the grid where you want to place it
4. **Complete the Puzzle**: Fill the entire 8×8 grid without overlapping

### Game Controls

#### Desktop
- **Click Block**: Select/deselect a block
- **Rotate Button**: Rotate the selected block 90° clockwise
- **Click Grid**: Place the selected block
- **Reset**: Restart the current puzzle
- **Previous/Next**: Navigate between challenges
- **How to Play**: View detailed instructions

#### Mobile
- **Tap Block**: Select/deselect a block
- **Swipe Left/Right**: Navigate between challenges
- **Double Tap**: Rotate selected block
- **Touch Feedback**: Visual feedback for all interactions
- **Gesture Controls**: Optimized for touch devices

## 🏗️ Technical Stack

- **Frontend**: React 19 + TypeScript 5.8
- **Build Tool**: Vite 7
- **Canvas Rendering**: React Konva 19
- **State Management**: Zustand 5
- **Deployment**: Cloudflare Workers
- **Testing**: Vitest + Testing Library
- **Styling**: CSS3 with CSS Grid and Flexbox
- **Mobile Support**: Touch gestures, swipe controls, responsive design
- **Performance**: Web Workers, optimized rendering, 60fps gameplay

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── GameBoard.tsx   # 8x8 grid canvas component
│   ├── BlockInventory.tsx # Block selection interface
│   ├── DraggableBlock.tsx # Individual block component
│   ├── GameInstructions.tsx # Help modal
│   ├── MobileGameControls.tsx # Mobile-specific controls
│   ├── TouchFeedback.tsx # Touch interaction feedback
│   ├── SwipeIndicator.tsx # Swipe gesture indicators
│   ├── DifficultyAnalysis.tsx # Difficulty analysis tools
│   └── SolverChallengeInfo.tsx # Challenge metadata display
├── data/               # Game data
│   ├── blocks.ts       # Block shapes and colors
│   ├── challenges.ts   # Puzzle definitions
│   ├── blackPositions.ts # AI-generated challenge data
│   └── black_positions.json # Solver-generated puzzles
├── hooks/              # Custom React hooks
│   ├── useDeviceCapabilities.ts # Device detection
│   ├── useSwipeGestures.ts # Swipe gesture handling
│   ├── useTouchFeedback.ts # Touch feedback
│   └── usePerformanceOptimization.ts # Performance hooks
├── pages/              # Page components
│   └── DifficultyAnalysisPage.tsx # Analysis dashboard
├── store/              # State management
│   └── gameStore.ts    # Zustand store
├── types/              # TypeScript definitions
│   └── game.ts         # Game interfaces
├── utils/              # Utility functions
├── __tests__/          # Test suites
└── worker.ts           # Cloudflare Worker entry point
```

## 🎨 Block Shapes

The game includes 11 unique blocks with areas totaling exactly 64 squares:

| 颜色 | 形状尺寸 | 面积 | 备注 |
|------|----------|------|------|
| **红色** | 3×4长方形 | 12格 | 最大积木 |
| **蓝色** | 3×3正方形 | 9格 | |
| **蓝色** | 2×2正方形 | 4格 | |
| **白色** | 1×5长条 | 5格 | |
| **白色** | 1×4长条 | 4格 | |
| **黄色** | 2×5长条 | 10格 | |
| **黄色** | 2×4长条 | 8格 | |
| **黄色** | 2×3长条 | 6格 | |
| **黑色** | 1×3长条 | 3格 | ★起始块 |
| **黑色** | 1×2长条 | 2格 | ★起始块 |
| **黑色** | 1×1单方块 | 1格 | ★起始块 |

**游戏规则：** 3块黑色起始块按挑战卡预先放置在棋盘上，玩家需要将其余8块彩色积木全部填入8×8棋盘且不得重叠，直至无空格。每张挑战卡仅有唯一解。

## 🏆 Difficulty Levels

Our AI-powered difficulty system uses a multi-factor scoring algorithm to classify puzzles:

- **🟢 Beginner (0-50 points)**: Simple layouts with obvious placements
- **🟡 Advanced (51-100 points)**: More complex patterns requiring strategy
- **🔴 Master (101-150 points)**: Challenging puzzles for experienced players
- **🟣 Grandmaster (151+ points)**: Expert-level brain teasers

### Difficulty Factors
- **Spread**: How dispersed the black pieces are across the board
- **Fragmentation**: Number of separate black piece regions
- **Edge Proximity**: How close black pieces are to board edges
- **Corner Occupation**: Whether corners are blocked by black pieces
- **Symmetry Breaking**: How much the layout breaks symmetrical patterns
- **Constraint Density**: Local density of placement constraints

See [DIFFICULTY_SCORING_SYSTEM.md](./DIFFICULTY_SCORING_SYSTEM.md) for detailed scoring methodology.

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Type checking
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview

# Deploy to Cloudflare Workers
npm run deploy

# Deploy with info
npm run deploy:info

# Show deployment URLs
npm run domain:show

# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## 🎨 Color Palette

Inspired by Piet Mondrian's distinctive style:
- **Primary**: Red (#dc2626), Blue (#2563eb), Yellow (#facc15)
- **Secondary**: Orange, Green, Purple, Pink, Teal, Indigo
- **Neutral**: White (#f8fafc), Black (#1f2937)

## 📱 Mobile Support

The game is fully optimized for mobile devices with:
- **Touch Interactions**: Native touch support for all game elements
- **Swipe Gestures**: Navigate between challenges with left/right swipes
- **Double Tap**: Rotate blocks with double tap gesture
- **Visual Feedback**: Haptic-style visual feedback for touch interactions
- **Responsive Layout**: Adaptive UI for different screen sizes
- **Performance Optimized**: Smooth 60fps gameplay on mobile devices
- **Gesture Indicators**: Visual cues for available swipe actions
- **Touch-Friendly Controls**: Large, accessible touch targets

## 🧠 AI Challenge Generation

This project features an advanced AI system for generating puzzles:

- **Python Solver**: Constraint satisfaction solver that generates valid puzzle layouts
- **Difficulty Analysis**: Multi-factor scoring system for automatic difficulty classification
- **Quality Assurance**: All generated puzzles are verified to have unique solutions
- **Scalable Generation**: Can generate thousands of puzzles across all difficulty levels
- **Data-Driven**: Uses statistical analysis to ensure balanced difficulty distribution

## 🎯 Future Enhancements

- [ ] Sound effects and background music
- [ ] Particle effects for celebrations
- [ ] PWA support for offline play
- [ ] Level editor for custom puzzles
- [ ] Multiplayer race mode
- [ ] Achievement system
- [ ] Hint system for stuck players
- [ ] AI-powered hint generation
- [ ] Advanced analytics and player insights

## 📄 License

MIT License - see LICENSE file for details.

## � Additional Documentation

- [Difficulty Scoring System](./DIFFICULTY_SCORING_SYSTEM.md) - Detailed explanation of the AI difficulty assessment
- [Integration Summary](./INTEGRATION_SUMMARY.md) - Technical integration details
- [Coordinate System](./docs/coordinate-system.md) - Game coordinate system documentation

## �🙏 Acknowledgments

- Inspired by the original Mondrian Blocks puzzle game
- Color palette based on Piet Mondrian's artistic style
- Built with modern web technologies for optimal performance
- AI challenge generation powered by constraint satisfaction algorithms

---

🎮 **Live Demo**: [https://blockcanvas.deploy.cv](https://blockcanvas.deploy.cv)

Enjoy playing Mondrian Blocks! 🧩✨