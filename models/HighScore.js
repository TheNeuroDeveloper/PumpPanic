const mongoose = require('mongoose');

const highScoreSchema = new mongoose.Schema({
    wallet: {
        type: String,
        required: true,
        index: true
    },
    score: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('HighScore', highScoreSchema); 