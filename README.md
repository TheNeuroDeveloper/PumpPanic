# BURL Game 🎮

A retro-style mining game where you play as a miner trying to keep your mine shaft from flooding. Test your reflexes and timing as you battle against rising water levels and unexpected rain events!

## Features 🌟

- Retro pixel art graphics
- Dynamic water physics
- Random rain events that increase difficulty
- Progressive difficulty scaling
- High score system
- Responsive controls
- Visual effects (rain, clouds, water animations)

## How to Play 🕹️

1. Use the **SPACE** bar to pump water out of the mine shaft
2. Watch out for rain events that increase water rise speed
3. Try to survive as long as possible
4. Beat your high score!

## Setup Instructions 🛠️

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (v6.0)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/BURL-Game.git
cd BURL-Game
```

2. Install dependencies:
```bash
npm install
```

3. Make sure MongoDB is running:
```bash
brew services start mongodb-community@6.0
```

4. Start the game server:
```bash
npm start
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

### MongoDB Setup

The game requires MongoDB v6.0 for the high score system. To install MongoDB:

```bash
# For macOS (using Homebrew)
brew tap mongodb/brew
brew install mongodb-community@6.0
```

To start/stop MongoDB:
```bash
# Start MongoDB
brew services start mongodb-community@6.0

# Stop MongoDB
brew services stop mongodb-community@6.0
```

## Game Controls 🎮

- **SPACE**: Activate the pump to remove water
- The pump has a brief cooldown between uses
- Hold space to see the pump animation

## Technical Details 🔧

- Built with vanilla JavaScript
- Uses HTML5 Canvas for rendering
- MongoDB for high score storage
- Pixel-perfect collision detection
- Dynamic difficulty scaling

## Contributing 🤝

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 📝

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 