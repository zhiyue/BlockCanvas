# 🧩 Mondrian Blocks

A colorful logic puzzle game inspired by the abstract art of Piet Mondrian. Challenge your spatial reasoning and problem-solving skills by fitting uniquely shaped blocks into an 8×8 grid.

![Mondrian Blocks Game](https://via.placeholder.com/800x400/667eea/ffffff?text=Mondrian+Blocks+Game)

## 🎮 Game Features

- **11 Unique Blocks**: Diverse geometric shapes totaling 64 areas, with distinct colors inspired by Mondrian's palette
- **Multiple Difficulty Levels**: From Beginner to Grandmaster
- **6 Sample Challenges**: Hand-crafted puzzles to test your skills
- **Interactive Gameplay**: Click-to-select and place blocks with rotation support
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Real-time Feedback**: Instant collision detection and win condition checking
- **Persistent Progress**: Your game state is automatically saved

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
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

4. Open your browser and visit `http://localhost:3000`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## 🎯 How to Play

1. **Select a Block**: Click on any colored block from the inventory
2. **Rotate (Optional)**: Use the "Rotate (90°)" button to change orientation
3. **Place the Block**: Click on the grid where you want to place it
4. **Complete the Puzzle**: Fill the entire 8×8 grid without overlapping

### Game Controls

- **Click Block**: Select/deselect a block
- **Rotate Button**: Rotate the selected block 90° clockwise
- **Click Grid**: Place the selected block
- **Reset**: Restart the current puzzle
- **Previous/Next**: Navigate between challenges
- **How to Play**: View detailed instructions

## 🏗️ Technical Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Canvas Rendering**: React Konva
- **State Management**: Zustand
- **Styling**: CSS3 with CSS Grid and Flexbox
- **Interaction**: Click-based interface optimized for touch and mouse

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── GameBoard.tsx   # 8x8 grid canvas component
│   ├── BlockInventory.tsx # Block selection interface
│   ├── DraggableBlock.tsx # Individual block component
│   └── GameInstructions.tsx # Help modal
├── data/               # Game data
│   ├── blocks.ts       # Block shapes and colors
│   └── challenges.ts   # Puzzle definitions
├── store/              # State management
│   └── gameStore.ts    # Zustand store
├── types/              # TypeScript definitions
│   └── game.ts         # Game interfaces
└── utils/              # Utility functions
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

- **🟢 Beginner**: Simple layouts with obvious placements
- **🟡 Advanced**: More complex patterns requiring strategy
- **🔴 Master**: Challenging puzzles for experienced players
- **🟣 Grandmaster**: Expert-level brain teasers

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
```

## 🎨 Color Palette

Inspired by Piet Mondrian's distinctive style:
- **Primary**: Red (#dc2626), Blue (#2563eb), Yellow (#facc15)
- **Secondary**: Orange, Green, Purple, Pink, Teal, Indigo
- **Neutral**: White (#f8fafc), Black (#1f2937)

## 📱 Mobile Support

The game is fully responsive and supports:
- Touch interactions for mobile devices
- Optimized layout for different screen sizes
- Gesture-friendly button sizing
- Smooth canvas rendering on all devices

## 🎯 Future Enhancements

- [ ] Sound effects and background music
- [ ] Particle effects for celebrations
- [ ] PWA support for offline play
- [ ] Level editor for custom puzzles
- [ ] Multiplayer race mode
- [ ] Achievement system
- [ ] Hint system for stuck players

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Inspired by the original Mondrian Blocks puzzle game
- Color palette based on Piet Mondrian's artistic style
- Built with modern web technologies for optimal performance

---

Enjoy playing Mondrian Blocks! 🧩✨