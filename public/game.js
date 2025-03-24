// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PIT_WIDTH = 400;
const PIT_HEIGHT = 400;  // Reduced height to fit underground
const PIT_X = CANVAS_WIDTH - PIT_WIDTH - 50;
const GROUND_LEVEL = 200;  // Where the ground starts
const PIT_Y = GROUND_LEVEL;  // Start pit at ground level
const WATER_RISE_SPEED = 50;
const PUMP_POWER = 80;
const DIFFICULTY_INCREASE_RATE = 0.08;
const PUMP_COOLDOWN = 0.05;
const RAIN_EVENT_CHANCE = 0.002; // 0.2% chance per frame to start rain
const RAIN_DURATION = 2000; // 2 seconds
const RAIN_WATER_MULTIPLIER = 2; // Water rises twice as fast during rain
const MAX_RAINDROPS = 100;

// Colors
const COLORS = {
    sky: '#87CEEB',
    skyDark: '#5499C7',
    skyCloud: '#FFFFFF',
    skyCloudDark: '#E8E8E8',
    ground: '#8B4513',
    groundDark: '#6E3C1E',
    groundLight: '#A0522D',
    dirt: '#654321',
    dirtDark: '#4A3219',
    dirtLight: '#8B6B4F',
    support: '#4a3728',
    supportLight: '#5D483A',
    supportDark: '#3A2A1C',
    water: '#3498db',
    waterLight: '#5DADE2',
    waterDark: '#2874A6',
    waterSparkle: '#FFFFFF',
    character: '#e74c3c',
    pump: '#7f8c8d',
    pumpDark: '#626567',
    pumpLight: '#95A5A6',
    gold: '#FFD700',
    goldDark: '#B8860B',
    goldLight: '#FFF380',
    grass: '#2ecc71',
    grassDark: '#27AE60',
    grassLight: '#82E0AA'
};

// Web3 and game state variables
let userWallet = null;
let isWalletConnected = false;
let globalHighScores = [];

// Game variables
let canvas;
let ctx;
let waterLevel;
let gameTime;
let isGameOver;
let difficultyMultiplier;
let highScore = localStorage.getItem('highScore') || 0;
let lastFrameTime;
let canPump = true;
let pumpCooldownTimer = 0;
let isPumping = false;  // For animation
let spaceWasPressed = false;  // Track if space is being held
let isGameStarted = false;

// Rain state
let isRaining = false;
let rainTimer = 0;
let raindrops = [];
let skyDarkness = 0; // 0 to 1 for rain effect
let clouds = [];

// Character properties
const CHARACTER_WIDTH = 64;  // Even bigger
const CHARACTER_HEIGHT = 96;  // Even bigger
const CHARACTER_X = 150;
const CHARACTER_Y = GROUND_LEVEL - CHARACTER_HEIGHT;  // Removed the -10 offset so he stands on ground

// Colors for character
const MINER_COLORS = {
    skin: '#ffd0a1',
    skinShadow: '#e6b088',
    skinHighlight: '#ffe4c4',
    shirt: '#2980b9',
    shirtShadow: '#1a5276',
    shirtHighlight: '#3498db',
    pants: '#34495e',
    pantsShadow: '#2c3e50',
    pantsHighlight: '#415b76',
    boots: '#4a4a4a',
    bootsShadow: '#353535',
    bootsHighlight: '#5c5c5c',
    helmet: '#f1c40f',
    helmetShadow: '#d4ac0d',
    helmetHighlight: '#f4d03f',
    light: '#ffffff',
    lightGlow: '#fff7b3',
    belt: '#784212',
    beltBuckle: '#b7950b'
};

// Raindrop class
class Raindrop {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * CANVAS_WIDTH;
        this.y = Math.random() * GROUND_LEVEL;
        this.speed = 10 + Math.random() * 10;
        this.length = 10 + Math.random() * 20;
    }
    
    update(deltaTime) {
        this.y += this.speed;
        if (this.y > GROUND_LEVEL) {
            this.reset();
        }
    }
    
    draw(ctx) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(155, 195, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - 1, this.y + this.length);
        ctx.stroke();
    }
}

// Cloud class
class Cloud {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = -100 + Math.random() * CANVAS_WIDTH;
        this.y = Math.random() * (GROUND_LEVEL / 2);
        this.width = 120 + Math.random() * 80;  // Wider clouds
        this.speed = 20 + Math.random() * 15;
        this.darkness = 0;
        
        // Create cloud segments in a more natural pattern
        this.segments = [];
        
        // Center segments (larger)
        const centerY = 0;
        const numCenterSegments = 3;
        for (let i = 0; i < numCenterSegments; i++) {
            this.segments.push({
                xOffset: (this.width / 2) + (i - numCenterSegments/2) * 25,
                yOffset: centerY,
                radius: 35 + Math.random() * 10
            });
        }
        
        // Top segments (medium)
        const numTopSegments = 4;
        for (let i = 0; i < numTopSegments; i++) {
            this.segments.push({
                xOffset: (this.width / 2) + (i - numTopSegments/2) * 20,
                yOffset: centerY - 15,
                radius: 25 + Math.random() * 10
            });
        }
        
        // Bottom segments (smaller)
        const numBottomSegments = 5;
        for (let i = 0; i < numBottomSegments; i++) {
            this.segments.push({
                xOffset: (this.width / 2) + (i - numBottomSegments/2) * 22,
                yOffset: centerY + 10,
                radius: 20 + Math.random() * 10
            });
        }
    }
    
    update(deltaTime) {
        this.x += this.speed * deltaTime;
        if (this.x > CANVAS_WIDTH + this.width) {
            this.x = -this.width;
        }
        if (isRaining) {
            this.darkness = Math.min(this.darkness + deltaTime * 3, 0.8);
        } else {
            this.darkness = Math.max(this.darkness - deltaTime * 3, 0);
        }
    }
    
    draw(ctx) {
        const darknessFactor = 1 - this.darkness;
        const baseColor = `rgba(${255 * darknessFactor}, ${255 * darknessFactor}, ${255 * darknessFactor}, 0.95)`;
        const shadowColor = `rgba(${230 * darknessFactor}, ${230 * darknessFactor}, ${230 * darknessFactor}, 0.8)`;
        
        // Draw each cloud segment with a smoother gradient effect
        this.segments.forEach(segment => {
            // Draw main segment
            ctx.beginPath();
            ctx.fillStyle = baseColor;
            ctx.arc(
                this.x + segment.xOffset,
                this.y + segment.yOffset,
                segment.radius,
                0,
                Math.PI * 2
            );
            ctx.fill();
            
            // Draw shadow/depth
            ctx.beginPath();
            ctx.fillStyle = shadowColor;
            ctx.arc(
                this.x + segment.xOffset,
                this.y + segment.yOffset + 5,
                segment.radius * 0.9,
                0,
                Math.PI * 2
            );
            ctx.fill();
        });
    }
}

// Initialize the game
async function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Setup Web3 event listeners
    document.getElementById('connectWallet').addEventListener('click', connectWallet);
    document.getElementById('disconnectWallet').addEventListener('click', disconnectWallet);
    
    // Check if previously connected
    if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
            await handleWalletConnection(accounts[0]);
        } else {
            updateWalletUI(false);
        }
        
        // Setup wallet change listener
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('disconnect', handleDisconnect);
    } else {
        updateWalletUI(false);
        document.getElementById('walletError').textContent = 'Please install MetaMask to play';
        document.getElementById('walletError').style.display = 'block';
    }
    
    // Initialize rain system
    for (let i = 0; i < MAX_RAINDROPS; i++) {
        raindrops.push(new Raindrop());
    }
    
    // Initialize clouds
    for (let i = 0; i < 5; i++) {
        clouds.push(new Cloud());
    }
}

// Connect wallet
async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            await handleWalletConnection(accounts[0]);
        } catch (error) {
            console.error('User denied account access');
            document.getElementById('walletError').textContent = 'Please connect your wallet to play';
            document.getElementById('walletError').style.display = 'block';
        }
    } else {
        document.getElementById('walletError').textContent = 'Please install MetaMask to play';
        document.getElementById('walletError').style.display = 'block';
    }
}

// Disconnect wallet
async function disconnectWallet() {
    // Clear wallet state
    userWallet = null;
    isWalletConnected = false;
    
    // Update UI
    updateWalletUI(false);
    
    // Reset game state
    if (window.gameLoopId) {
        cancelAnimationFrame(window.gameLoopId);
        window.gameLoopId = null;
    }
    
    // Hide game container
    document.getElementById('gameContainer').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    // Clear high scores display
    document.getElementById('highScoresList').innerHTML = '';
}

// Handle wallet connection
async function handleWalletConnection(account) {
    userWallet = account;
    isWalletConnected = true;
    
    // Update UI
    updateWalletUI(true);
    
    // Initialize game
    resetGame();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Show game container and start screen
    document.getElementById('gameContainer').style.display = 'block';
    document.getElementById('startScreen').style.display = 'block';
    
    // Start background animation
    requestAnimationFrame(drawBackground);
    
    // Fetch high scores
    await fetchHighScores();
}

// Handle wallet account changes
function handleAccountsChanged(accounts) {
    if (accounts.length === 0) {
        // User disconnected wallet
        disconnectWallet();
    } else {
        // User switched accounts
        handleWalletConnection(accounts[0]);
    }
}

// Handle wallet disconnect
function handleDisconnect() {
    disconnectWallet();
}

// Update wallet UI
function updateWalletUI(connected) {
    const statusDot = document.getElementById('statusDot');
    const walletStatus = document.getElementById('walletStatus');
    const connectButton = document.getElementById('connectWallet');
    const disconnectButton = document.getElementById('disconnectWallet');
    const walletAddress = document.getElementById('walletAddress');
    const walletError = document.getElementById('walletError');
    
    if (connected) {
        statusDot.classList.add('connected');
        walletStatus.textContent = 'Connected';
        connectButton.style.display = 'none';
        disconnectButton.style.display = 'block';
        walletAddress.textContent = `${shortenAddress(userWallet)}`;
        walletError.style.display = 'none';
    } else {
        statusDot.classList.remove('connected');
        walletStatus.textContent = 'Not Connected';
        connectButton.style.display = 'block';
        disconnectButton.style.display = 'none';
        walletAddress.textContent = '';
    }
}

// Fetch high scores from the database
async function fetchHighScores() {
    try {
        const response = await fetch('/api/highscores');
        const scores = await response.json();
        globalHighScores = scores;
        updateHighScoresDisplay();
    } catch (error) {
        console.error('Error fetching high scores:', error);
    }
}

// Helper function to shorten wallet address
function shortenAddress(address) {
    if (!address || address === 'Anonymous') {
        return 'Anonymous';
    }
    try {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    } catch (error) {
        console.error('Error shortening address:', error);
        return 'Anonymous';
    }
}

// Update high scores display with retry logic
function updateHighScoresDisplay(retries = 3) {
    const highScoresList = document.getElementById('highScoresList');
    if (!highScoresList) {
        console.error('High scores list element not found');
        return;
    }

    // Use the globalHighScores array that was already fetched
    if (!Array.isArray(globalHighScores)) {
        console.error('Invalid high scores data');
        return;
    }
    
    highScoresList.innerHTML = '';
    
    globalHighScores
        .filter(score => score && typeof score.score === 'number')
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .forEach((score, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${shortenAddress(score.wallet)} - ${Math.floor(score.score)}s`;
            highScoresList.appendChild(li);
        });
}

// Reset game state
function resetGame() {
    isGameStarted = false;
    waterLevel = 0;
    gameTime = 0;
    isGameOver = false;
    difficultyMultiplier = 1;
    lastFrameTime = null;
    canPump = true;
    pumpCooldownTimer = 0;
    isPumping = false;
    spaceWasPressed = false;
    
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    
    // Show start screen
    document.getElementById('startScreen').style.display = 'block';
    
    // Reset animation frame ID
    if (window.gameLoopId) {
        cancelAnimationFrame(window.gameLoopId);
        window.gameLoopId = null;
    }
    
    // Start background animation
    requestAnimationFrame(drawBackground);
}

// Draw animated background while on start screen
function drawBackground(currentTime) {
    if (!isGameStarted) {
        draw();  // Use existing draw function for background
        requestAnimationFrame(drawBackground);
    }
}

// Start the actual game
function startGame() {
    isGameStarted = true;
    isGameOver = false;
    waterLevel = 0;
    gameTime = 0;
    difficultyMultiplier = 1;
    lastFrameTime = performance.now();
    document.getElementById('startScreen').style.display = 'none';
    // Force an initial update to start water rising
    update(0.016); // Simulate one frame at 60fps
    window.gameLoopId = requestAnimationFrame(gameLoop);
}

// Handle keyboard input
function handleKeyDown(event) {
    if (!isGameStarted) return;  // Ignore input if game hasn't started
    
    if (event.code === 'Space') {
        event.preventDefault();
        if (!spaceWasPressed && canPump) {
            isPumping = true;
            waterLevel = Math.max(0, waterLevel - PUMP_POWER);
            canPump = false;
            pumpCooldownTimer = PUMP_COOLDOWN;
            spaceWasPressed = true;
        }
    }
}

function handleKeyUp(event) {
    if (event.code === 'Space') {
        event.preventDefault();
        isPumping = false;
        spaceWasPressed = false;  // Reset space pressed state
    }
}

// Main game loop
function gameLoop(currentTime) {
    // Initialize lastFrameTime on first frame
    if (!lastFrameTime) {
        lastFrameTime = currentTime;
    }

    // Calculate delta time and ensure it's reasonable
    const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.1); // Cap at 100ms
    lastFrameTime = currentTime;

    // Always update and draw if game is started and not over
    if (isGameStarted && !isGameOver) {
        update(deltaTime);
        draw();
        window.gameLoopId = requestAnimationFrame(gameLoop);
    }
}

// Update game state
function update(deltaTime) {
    // Always update water level if game is started and not over
    if (isGameStarted && !isGameOver) {
        // Update game time
        gameTime += deltaTime;
        
        // Update difficulty
        difficultyMultiplier = 1 + Math.pow(gameTime * DIFFICULTY_INCREASE_RATE, 1.2);

        // Always increase water level
        const baseRise = WATER_RISE_SPEED * difficultyMultiplier * deltaTime;
        const rainMultiplier = isRaining ? RAIN_WATER_MULTIPLIER : 1;
        waterLevel += baseRise * rainMultiplier;
        
        // Clamp water level
        waterLevel = Math.min(PIT_HEIGHT, Math.max(0, waterLevel));

        // Check for game over
        if (waterLevel >= PIT_HEIGHT) {
            handleGameOver();
            return;
        }

        // Update score display
        const displayMultiplier = difficultyMultiplier * (isRaining ? RAIN_WATER_MULTIPLIER : 1);
        document.getElementById('score').textContent = `Time: ${Math.floor(gameTime)}s (${displayMultiplier.toFixed(1)}x)`;
        
        // Update rain state
        if (!isRaining && Math.random() < RAIN_EVENT_CHANCE) {
            startRain();
        }
        
        if (isRaining) {
            rainTimer -= deltaTime * 1000;
            if (rainTimer <= 0) {
                stopRain();
            }
            raindrops.forEach(drop => drop.update(deltaTime));
        }
        
        // Update clouds and effects
        clouds.forEach(cloud => cloud.update(deltaTime));
        
        if (isRaining) {
            skyDarkness = Math.min(skyDarkness + deltaTime * 2, 0.5);
        } else {
            skyDarkness = Math.max(skyDarkness - deltaTime * 2, 0);
        }

        // Update pump cooldown
        if (!canPump) {
            pumpCooldownTimer -= deltaTime;
            if (pumpCooldownTimer <= 0) {
                canPump = true;
            }
        }
    }
}

// Draw game state
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw sky with darkness effect
    const skyColor = isRaining ? 
        `rgba(${135 - (skyDarkness * 50)}, ${206 - (skyDarkness * 100)}, ${235 - (skyDarkness * 100)}, 1)` : 
        '#87CEEB';
    ctx.fillStyle = skyColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_LEVEL);
    
    // Draw clouds
    clouds.forEach(cloud => cloud.draw(ctx));
    
    // Draw rain if active
    if (isRaining) {
        raindrops.forEach(drop => drop.draw(ctx));
    }
    
    // Draw underground with texture
    drawDitheredGround();

    // Draw surface grass with detail
    drawDetailedGrass();

    // Draw mine entrance and supports
    drawMineShaft();

    // Draw character
    drawCharacter();

    // Draw pump
    drawPump();

    // Draw water with animation
    drawWater();
    
    // Draw rain warning if just starting
    if (isRaining && rainTimer > RAIN_DURATION - 500) {
        ctx.fillStyle = 'rgba(255, 255, 255, ' + (rainTimer / RAIN_DURATION) + ')';
        ctx.font = '24px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillText('HEAVY RAIN!', CANVAS_WIDTH/2, CANVAS_HEIGHT/3);
    }
}

// Draw dithered sky with clouds
function drawDitheredSky() {
    // Base sky
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_LEVEL);
    
    // Add dithering pattern
    ctx.fillStyle = COLORS.skyDark;
    for (let y = 0; y < GROUND_LEVEL; y += 4) {
        for (let x = 0; x < CANVAS_WIDTH; x += 4) {
            if ((x + y) % 8 === 0) {
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }

    // Add clouds
    const time = Date.now() * 0.001;
    const clouds = [
        { x: (time * 10) % CANVAS_WIDTH, y: 30, size: 40 },
        { x: ((time * 15) + 200) % CANVAS_WIDTH, y: 60, size: 30 },
        { x: ((time * 8) + 400) % CANVAS_WIDTH, y: 40, size: 50 }
    ];

    clouds.forEach(cloud => {
        drawPixelCloud(cloud.x, cloud.y, cloud.size);
    });
}

// Draw a pixel art cloud
function drawPixelCloud(x, y, size) {
    ctx.fillStyle = COLORS.skyCloud;
    ctx.fillRect(x, y, size, size/2);
    ctx.fillRect(x - size/4, y + size/4, size * 1.5, size/2);
    
    // Cloud details
    ctx.fillStyle = COLORS.skyCloudDark;
    ctx.fillRect(x + size/4, y + size/3, size/4, size/4);
    ctx.fillRect(x + size/2, y + size/2, size/4, size/4);
}

// Draw textured ground
function drawDitheredGround() {
    // Main ground
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, GROUND_LEVEL, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_LEVEL);
    
    // Add dirt texture
    ctx.fillStyle = COLORS.groundDark;
    for (let y = GROUND_LEVEL; y < CANVAS_HEIGHT; y += 8) {
        for (let x = 0; x < CANVAS_WIDTH; x += 8) {
            if ((x + y) % 16 === 0) {
                ctx.fillRect(x, y, 4, 4);
            }
        }
    }
}

// Draw detailed grass
function drawDetailedGrass() {
    // Base grass layer
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(0, GROUND_LEVEL - 8, CANVAS_WIDTH, 18);
    
    // Add grass blades
    for (let x = 0; x < CANVAS_WIDTH; x += 4) {
        const height = 4 + Math.sin(x * 0.2) * 2;
        const variation = Math.sin(x * 0.1 + Date.now() * 0.001) * 2;
        
        // Main blade
        ctx.fillStyle = COLORS.grassLight;
        ctx.fillRect(x, GROUND_LEVEL - 8 - height + variation, 2, height);
        
        // Dark detail
        ctx.fillStyle = COLORS.grassDark;
        ctx.fillRect(x + 1, GROUND_LEVEL - 8 - height + variation, 1, height);
    }
}

// Draw water with enhanced effects
function drawWater() {
    const waterY = PIT_Y + PIT_HEIGHT - waterLevel;
    
    // Base water
    ctx.fillStyle = COLORS.water;
    ctx.fillRect(PIT_X, waterY, PIT_WIDTH, waterLevel);
    
    // Add wave pattern
    const time = Date.now() * 0.002;
    ctx.fillStyle = COLORS.waterLight;
    for (let x = PIT_X; x < PIT_X + PIT_WIDTH; x += 8) {
        const waveHeight = Math.sin(x * 0.05 + time) * 2;
        ctx.fillRect(x, waterY + waveHeight, 4, 2);
    }
    
    // Add depth effect
    ctx.fillStyle = COLORS.waterDark;
    for (let y = waterY; y < PIT_Y + PIT_HEIGHT; y += 8) {
        for (let x = PIT_X; x < PIT_X + PIT_WIDTH; x += 8) {
            if ((x + y) % 16 === 0) {
                ctx.fillRect(x, y, 4, 4);
            }
        }
    }
    
    // Add sparkles
    ctx.fillStyle = COLORS.waterSparkle;
    for (let x = PIT_X; x < PIT_X + PIT_WIDTH; x += 16) {
        const sparkleY = waterY + Math.sin(x * 0.1 + time * 2) * 3;
        if (Math.sin(time * 3 + x) > 0.7) {
            ctx.fillRect(x, sparkleY, 2, 2);
        }
    }
}

// Draw the mine shaft and supports with enhanced detail
function drawMineShaft() {
    // Draw entrance frame with wood grain
    drawWoodBeam(PIT_X - 30, GROUND_LEVEL - 20, PIT_WIDTH + 60, 20);
    drawWoodBeam(PIT_X - 30, GROUND_LEVEL - 20, 30, 60);
    drawWoodBeam(PIT_X + PIT_WIDTH, GROUND_LEVEL - 20, 30, 60);

    // Draw main shaft walls with texture
    drawDitheredWall(PIT_X - 20, PIT_Y, 20, PIT_HEIGHT);
    drawDitheredWall(PIT_X + PIT_WIDTH, PIT_Y, 20, PIT_HEIGHT);

    // Draw wooden supports with grain
    for (let x = 0; x < 4; x++) {
        drawWoodBeam(PIT_X + (x * (PIT_WIDTH / 3)), PIT_Y, 20, PIT_HEIGHT);
    }
    for (let y = 0; y < 5; y++) {
        drawWoodBeam(PIT_X - 20, PIT_Y + (y * (PIT_HEIGHT / 4)), PIT_WIDTH + 40, 15);
    }

    // Draw enhanced gold veins
    drawEnhancedGoldVeins();

    // Draw enhanced bottom cracks
    drawEnhancedCracks();
}

// Helper function to draw wood grain
function drawWoodBeam(x, y, width, height) {
    ctx.fillStyle = COLORS.support;
    ctx.fillRect(x, y, width, height);
    
    // Add wood grain
    ctx.fillStyle = COLORS.supportLight;
    for (let i = 0; i < height; i += 4) {
        const grainWidth = width * 0.8;
        ctx.fillRect(x + (width - grainWidth) / 2, y + i, grainWidth, 2);
    }
}

// Helper function to draw textured wall
function drawDitheredWall(x, y, width, height) {
    ctx.fillStyle = COLORS.dirt;
    ctx.fillRect(x, y, width, height);
    
    // Add wall texture
    ctx.fillStyle = COLORS.dirtDark;
    for (let py = y; py < y + height; py += 4) {
        for (let px = x; px < x + width; px += 4) {
            if ((px + py) % 8 === 0) {
                ctx.fillRect(px, py, 2, 2);
            }
        }
    }
}

// Draw enhanced gold veins
function drawEnhancedGoldVeins() {
    const goldSpots = [
        {x: PIT_X + 50, y: PIT_Y + 100, w: 30, h: 20},
        {x: PIT_X + 200, y: PIT_Y + 150, w: 40, h: 25},
        {x: PIT_X + 300, y: PIT_Y + 250, w: 25, h: 35},
        {x: PIT_X + 100, y: PIT_Y + 200, w: 35, h: 30}
    ];

    goldSpots.forEach(spot => {
        // Base gold
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(spot.x, spot.y, spot.w, spot.h);
        
        // Highlights
        ctx.fillStyle = COLORS.goldLight;
        for (let y = spot.y; y < spot.y + spot.h; y += 4) {
            for (let x = spot.x; x < spot.x + spot.w; x += 4) {
                if ((x + y) % 12 === 0) {
                    ctx.fillRect(x, y, 2, 2);
                }
            }
        }
        
        // Shadows
        ctx.fillStyle = COLORS.goldDark;
        for (let y = spot.y + 2; y < spot.y + spot.h; y += 4) {
            for (let x = spot.x + 2; x < spot.x + spot.w; x += 4) {
                if ((x + y) % 8 === 0) {
                    ctx.fillRect(x, y, 2, 2);
                }
            }
        }
        
        // Pixelated edges with more detail
        for (let i = 0; i < 4; i++) {
            const color = i % 2 === 0 ? COLORS.goldLight : COLORS.goldDark;
            ctx.fillStyle = color;
            ctx.fillRect(spot.x - i * 3, spot.y + i * 3, 3, 3);
            ctx.fillRect(spot.x + spot.w + i * 3, spot.y + i * 3, 3, 3);
            ctx.fillRect(spot.x + i * 3, spot.y + spot.h - i * 3, 3, 3);
        }
    });
}

// Draw enhanced cracks
function drawEnhancedCracks() {
    const crackY = PIT_Y + PIT_HEIGHT - 10;
    for (let i = 0; i < 5; i++) {
        const x = PIT_X + (PIT_WIDTH / 6) * i;
        
        // Main crack
        ctx.fillStyle = COLORS.dirtDark;
        ctx.beginPath();
        ctx.moveTo(x, crackY);
        ctx.lineTo(x + 40, crackY + 5);
        ctx.lineTo(x + 80, crackY);
        ctx.fill();
        
        // Crack detail
        ctx.fillStyle = COLORS.dirt;
        for (let j = 0; j < 3; j++) {
            ctx.fillRect(x + j * 20, crackY + Math.sin(j) * 3, 4, 4);
        }
    }
}

// Draw character (8-bit miner)
function drawCharacter() {
    const yOffset = isPumping ? 8 : 0;
    
    // Helper function to draw pixels
    function drawPixel(x, y, width, height, color) {
        ctx.fillStyle = color;
        ctx.fillRect(CHARACTER_X + x, CHARACTER_Y + y + yOffset, width, height);
    }

    // Boots with details
    // Left boot
    drawPixel(8, CHARACTER_HEIGHT - 12, 20, 12, MINER_COLORS.boots);
    drawPixel(8, CHARACTER_HEIGHT - 12, 20, 3, MINER_COLORS.bootsHighlight);
    drawPixel(24, CHARACTER_HEIGHT - 12, 4, 12, MINER_COLORS.bootsShadow);
    // Right boot
    drawPixel(36, CHARACTER_HEIGHT - 12, 20, 12, MINER_COLORS.boots);
    drawPixel(36, CHARACTER_HEIGHT - 12, 20, 3, MINER_COLORS.bootsHighlight);
    drawPixel(52, CHARACTER_HEIGHT - 12, 4, 12, MINER_COLORS.bootsShadow);

    // Pants with shading
    // Left leg
    drawPixel(8, CHARACTER_HEIGHT - 36, 20, 24, MINER_COLORS.pants);
    drawPixel(24, CHARACTER_HEIGHT - 36, 4, 24, MINER_COLORS.pantsShadow);
    drawPixel(8, CHARACTER_HEIGHT - 36, 4, 24, MINER_COLORS.pantsHighlight);
    // Right leg
    drawPixel(36, CHARACTER_HEIGHT - 36, 20, 24, MINER_COLORS.pants);
    drawPixel(52, CHARACTER_HEIGHT - 36, 4, 24, MINER_COLORS.pantsShadow);
    drawPixel(36, CHARACTER_HEIGHT - 36, 4, 24, MINER_COLORS.pantsHighlight);
    // Torso pants
    drawPixel(16, CHARACTER_HEIGHT - 48, 32, 24, MINER_COLORS.pants);
    drawPixel(44, CHARACTER_HEIGHT - 48, 4, 24, MINER_COLORS.pantsShadow);

    // Belt
    drawPixel(16, CHARACTER_HEIGHT - 48, 32, 6, MINER_COLORS.belt);
    drawPixel(28, CHARACTER_HEIGHT - 48, 8, 6, MINER_COLORS.beltBuckle);

    // Shirt with shading
    drawPixel(12, 24, 40, 36, MINER_COLORS.shirt);
    drawPixel(48, 24, 4, 36, MINER_COLORS.shirtShadow);
    drawPixel(12, 24, 4, 36, MINER_COLORS.shirtHighlight);
    
    // Arms with shading
    if (isPumping) {
        // Pumping pose - arms up
        drawPixel(0, 30, 12, 24, MINER_COLORS.shirt);
        drawPixel(8, 30, 4, 24, MINER_COLORS.shirtShadow);
        drawPixel(0, 30, 4, 24, MINER_COLORS.shirtHighlight);
        
        drawPixel(52, 18, 12, 24, MINER_COLORS.shirt);
        drawPixel(60, 18, 4, 24, MINER_COLORS.shirtShadow);
        drawPixel(52, 18, 4, 24, MINER_COLORS.shirtHighlight);
    } else {
        // Idle pose - arms down
        drawPixel(0, 36, 12, 24, MINER_COLORS.shirt);
        drawPixel(8, 36, 4, 24, MINER_COLORS.shirtShadow);
        drawPixel(0, 36, 4, 24, MINER_COLORS.shirtHighlight);
        
        drawPixel(52, 36, 12, 24, MINER_COLORS.shirt);
        drawPixel(60, 36, 4, 24, MINER_COLORS.shirtShadow);
        drawPixel(52, 36, 4, 24, MINER_COLORS.shirtHighlight);
    }

    // Head with shading
    drawPixel(16, 8, 32, 24, MINER_COLORS.skin);
    drawPixel(44, 8, 4, 24, MINER_COLORS.skinShadow);
    drawPixel(16, 8, 4, 24, MINER_COLORS.skinHighlight);
    
    // Helmet with details
    drawPixel(14, 0, 38, 16, MINER_COLORS.helmet);  // Main helmet
    drawPixel(48, 0, 4, 16, MINER_COLORS.helmetShadow);
    drawPixel(14, 0, 4, 16, MINER_COLORS.helmetHighlight);
    drawPixel(12, 12, 44, 8, MINER_COLORS.helmet);  // Helmet brim
    drawPixel(12, 12, 44, 3, MINER_COLORS.helmetHighlight);
    
    // Enhanced helmet light with glow
    drawPixel(48, 8, 10, 10, MINER_COLORS.light);
    drawPixel(46, 6, 14, 2, MINER_COLORS.lightGlow);
    drawPixel(46, 18, 14, 2, MINER_COLORS.lightGlow);
    drawPixel(46, 8, 2, 10, MINER_COLORS.lightGlow);
    drawPixel(58, 8, 2, 10, MINER_COLORS.lightGlow);
    
    // Enhanced face details
    drawPixel(24, 16, 4, 4, '#000000');  // Left eye
    drawPixel(36, 16, 4, 4, '#000000');  // Right eye
    drawPixel(24, 17, 2, 2, '#ffffff');  // Left eye highlight
    drawPixel(36, 17, 2, 2, '#ffffff');  // Right eye highlight
    drawPixel(30, 22, 12, 2, '#000000'); // Mouth
    drawPixel(30, 21, 12, 1, MINER_COLORS.skinShadow); // Upper lip shadow
    drawPixel(28, 14, 2, 6, MINER_COLORS.skinShadow);  // Nose shadow
}

// Draw pump (more industrial looking)
function drawPump() {
    const PUMP_WIDTH = 50;
    const PUMP_HEIGHT = 140;
    const PUMP_X = CHARACTER_X + CHARACTER_WIDTH + 20;
    const PUMP_Y = CHARACTER_Y + 40;

    // Draw pipe with detail
    ctx.fillStyle = COLORS.pump;
    ctx.fillRect(PUMP_X + PUMP_WIDTH/2 - 10, PUMP_Y + PUMP_HEIGHT, 20, GROUND_LEVEL - (PUMP_Y + PUMP_HEIGHT));
    
    // Pipe details
    ctx.fillStyle = COLORS.pumpDark;
    for (let y = PUMP_Y + PUMP_HEIGHT; y < GROUND_LEVEL; y += 10) {
        ctx.fillRect(PUMP_X + PUMP_WIDTH/2 - 10, y, 20, 2);
    }

    // Pump base with highlights
    ctx.fillStyle = COLORS.pump;
    ctx.fillRect(PUMP_X, PUMP_Y, PUMP_WIDTH, PUMP_HEIGHT);
    
    // Pump highlights
    ctx.fillStyle = COLORS.pumpLight;
    ctx.fillRect(PUMP_X + 2, PUMP_Y + 2, 4, PUMP_HEIGHT - 4);
    
    // Pump shadows
    ctx.fillStyle = COLORS.pumpDark;
    ctx.fillRect(PUMP_X + PUMP_WIDTH - 6, PUMP_Y + 4, 4, PUMP_HEIGHT - 8);

    // Enhanced rivets
    ctx.fillStyle = COLORS.pumpLight;
    for (let i = 0; i < 5; i++) {
        // Main rivet
        ctx.fillRect(PUMP_X + 6, PUMP_Y + (i * 30) + 10, 6, 6);
        ctx.fillRect(PUMP_X + 38, PUMP_Y + (i * 30) + 10, 6, 6);
        
        // Rivet highlight
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(PUMP_X + 7, PUMP_Y + (i * 30) + 11, 2, 2);
        ctx.fillRect(PUMP_X + 39, PUMP_Y + (i * 30) + 11, 2, 2);
    }

    // Enhanced pump handle
    const handleWidth = 70;
    const handleHeight = 24;
    const handleY = PUMP_Y + (isPumping ? 50 : 25);
    
    // Handle shadow
    ctx.fillStyle = COLORS.pumpDark;
    ctx.fillRect(PUMP_X - 10, handleY + 2, handleWidth, handleHeight - 2);
    
    // Main handle
    ctx.fillStyle = canPump ? '#c0392b' : COLORS.pump;
    ctx.fillRect(PUMP_X - 10, handleY, handleWidth, handleHeight - 4);
    
    // Handle highlight
    ctx.fillStyle = canPump ? '#e74c3c' : COLORS.pumpLight;
    ctx.fillRect(PUMP_X - 8, handleY + 2, handleWidth - 4, 2);
}

// Handle game over
function handleGameOver() {
    isGameOver = true;
    const finalScore = Math.floor(gameTime);
    
    // Update personal best
    const personalBest = localStorage.getItem('personalBest') || 0;
    if (finalScore > personalBest) {
        localStorage.setItem('personalBest', finalScore);
    }
    
    // Save high score to server with retry logic
    async function saveHighScore(retries = 3) {
        try {
            const response = await fetch('/api/highscores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    score: Math.floor(gameTime),
                    wallet: userWallet || 'Anonymous'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success) {
                console.log('High score saved successfully');
                await fetchHighScores(); // Refresh the leaderboard
            } else {
                throw new Error('Failed to save high score');
            }
        } catch (error) {
            console.error('Error saving high score:', error);
            if (retries > 0) {
                console.log(`Retrying... (${retries} attempts left)`);
                setTimeout(() => saveHighScore(retries - 1), 1000);
            }
        }
    }
    
    // Start saving high score
    saveHighScore();
    
    // Show game over screen
    const gameOverScreen = document.getElementById('gameOver');
    gameOverScreen.style.display = 'block';
    document.getElementById('finalScore').textContent = `Final Score: ${finalScore}s`;
    
    // Add click handler to play again button
    const playAgainButton = document.getElementById('playAgain');
    playAgainButton.onclick = restartGame;
}

// Restart game
function restartGame() {
    // Cancel any existing game loop
    if (window.gameLoopId) {
        cancelAnimationFrame(window.gameLoopId);
        window.gameLoopId = null;
    }
    
    // Reset game state
    waterLevel = 0;
    gameTime = 0;
    difficultyMultiplier = 1;
    lastFrameTime = performance.now();
    canPump = true;
    pumpCooldownTimer = 0;
    isPumping = false;
    spaceWasPressed = false;
    isRaining = false;
    rainTimer = 0;
    skyDarkness = 0;
    
    // Reset visual elements
    raindrops.forEach(drop => drop.reset());
    clouds.forEach(cloud => cloud.reset());
    
    // Hide game over screen
    document.getElementById('gameOver').style.display = 'none';
    
    // Start new game immediately
    isGameStarted = true;
    isGameOver = false;
    
    // Force an initial update to start water rising
    update(0.016); // Simulate one frame at 60fps
    
    // Start the game loop
    window.gameLoopId = requestAnimationFrame(gameLoop);
}

// Start rain event
function startRain() {
    isRaining = true;
    rainTimer = RAIN_DURATION;
    // Play rain sound effect here if you want
}

// Stop rain event
function stopRain() {
    isRaining = false;
    rainTimer = 0;
}

// Start the game
window.onload = init; 