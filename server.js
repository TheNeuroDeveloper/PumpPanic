const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Use environment variables with fallbacks
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/burl-game';

// Define High Score Schema
const highScoreSchema = new mongoose.Schema({
    score: Number,
    date: { type: Date, default: Date.now }
});

const HighScore = mongoose.model('HighScore', highScoreSchema);

// MongoDB connection options
const mongooseOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    family: 4 // Use IPv4, skip trying IPv6
};

// Connect to MongoDB with retry logic
async function connectDB() {
    try {
        console.log('Attempting to connect to MongoDB...');
        await mongoose.connect(MONGODB_URI, mongooseOptions);
        console.log('Successfully connected to MongoDB');
        
        // Test the connection
        await HighScore.findOne();
        console.log('Database connection test successful');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        // Retry connection after 5 seconds
        console.log('Retrying connection in 5 seconds...');
        setTimeout(connectDB, 5000);
    }
}

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected. Attempting to reconnect...');
    connectDB();
});

// Initial connection
connectDB();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Endpoints
app.post('/api/highscores', async (req, res) => {
    try {
        const { score } = req.body;
        if (!score || typeof score !== 'number') {
            return res.status(400).json({ success: false, error: 'Invalid score' });
        }
        
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            console.log('Database not connected, attempting to reconnect...');
            await connectDB();
        }
        
        const highScore = new HighScore({ score });
        await highScore.save();
        console.log('Saved high score:', score);
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving high score:', error);
        res.status(500).json({ success: false, error: 'Failed to save high score' });
    }
});

app.get('/api/highscores', async (req, res) => {
    try {
        // Check if database is connected
        if (mongoose.connection.readyState !== 1) {
            console.log('Database not connected, attempting to reconnect...');
            await connectDB();
        }
        
        const highScores = await HighScore.find()
            .sort({ score: -1 })
            .limit(10);
        console.log('Fetched high scores:', highScores);
        res.json(highScores);
    } catch (error) {
        console.error('Error fetching high scores:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch high scores' });
    }
});

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 