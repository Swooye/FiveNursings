const mongoose = require('mongoose');

const scoreHistorySchema = new mongoose.Schema({
    userId: { type: String, required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    coreRecoveryIndex: { type: Number, required: true },
    scores: {
        diet: Number,
        exercise: Number,
        sleep: Number,
        mental: Number,
        function: Number,
        environment: Number
    },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true, collection: 'score_history' });

// Ensure one record per user per day
scoreHistorySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ScoreHistory', scoreHistorySchema);
