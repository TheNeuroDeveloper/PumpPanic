const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// Use environment variables with fallbacks
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/burl-game';

const HighScore = require('./models/HighScore');

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for all routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Get high scores
app.get('/api/highscores', async (req, res) => {
    try {
        const highScores = await HighScore.find()
            .sort({ score: -1 })
            .limit(100)
            .select('wallet score timestamp');
        res.json(highScores);
    } catch (error) {
        console.error('Error fetching high scores:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update high scores
app.post('/api/highscores', async (req, res) => {
    try {
        const { wallet, score } = req.body;
        
        if (!wallet || typeof score !== 'number') {
            return res.status(400).json({ error: 'Invalid input' });
        }
        
        // Find existing score for this wallet
        const existingScore = await HighScore.findOne({ 
            wallet: wallet.toLowerCase() 
        });
        
        if (existingScore) {
            // Update if new score is higher
            if (score > existingScore.score) {
                existingScore.score = score;
                existingScore.timestamp = new Date();
                await existingScore.save();
            }
        } else {
            // Add new score
            await HighScore.create({
                wallet: wallet.toLowerCase(),
                score
            });
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating high score:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 