const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// 📢 ADMIN PANEL - Edit games and results here
// =========================================================
const SETTINGS = {
    "day1": {
        title: "Matches of May 8",
        matches: ["Brazil vs Croatia", "France vs Poland"],
        results: ["1", "2"] // Options: "1", "X", "2"
    },
    "day2": {
        title: "Matches of May 9",
        matches: ["Argentina vs Mexico", "Spain vs Germany"],
        results: ["", ""] // Leave empty until match ends
    }
};

// =========================================================
// ⛔ DO NOT EDIT BELOW THIS LINE
// =========================================================

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected'));

const User = mongoose.model('User', new mongoose.Schema({
    username: { 
        type: String, 
        unique: true, 
        required: true, 
        maxlength: 35 
    },
    password: { type: String, required: true },
    totalScore: { type: Number, default: 0 },
    predictions: [{ dayId: String, answers: Object }]
}));

// Login & Register
app.post('/api/check-user', async (req, res) => {
    try {
        const { user, password } = req.body;
        if (user.length > 35) return res.json({ success: false, message: "Username too long!" });

        let existingUser = await User.findOne({ username: user });

        if (!existingUser) {
            existingUser = new User({ username: user, password: password });
            await existingUser.save();
            return res.json({ success: true, allDays: SETTINGS, userPredictions: [], userScore: 0 });
        }

        if (existingUser.password !== password) {
            return res.json({ success: false, message: "Incorrect password!" });
        }

        res.json({ 
            success: true, 
            allDays: SETTINGS, 
            userPredictions: existingUser.predictions,
            userScore: existingUser.totalScore
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Save Prediction
app.post('/api/save-prediction', async (req, res) => {
    try {
        const { username, dayId, answers } = req.body;
        const user = await User.findOne({ username });
        if (user.predictions.some(p => p.dayId === dayId)) {
            return res.json({ success: false, message: "Already submitted for this day!" });
        }
        user.predictions.push({ dayId, answers });
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Calculate Scores
app.get('/api/calculate-scores', async (req, res) => {
    try {
        const users = await User.find();
        for (let user of users) {
            let score = 0;
            user.predictions.forEach(p => {
                const dayData = SETTINGS[p.dayId];
                if (dayData) {
                    dayData.results.forEach((r, i) => {
                        if (r && p.answers[i] === r) score++;
                    });
                }
            });
            user.totalScore = score;
            await user.save();
        }
        res.json({ success: true, message: "Scores recalculated!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// RESET ALL USERS AND LEADERBOARD
app.get('/api/reset-leaderboard', async (req, res) => {
    try {
        await User.deleteMany({}); 
        res.json({ success: true, message: "All users and scores have been cleared!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// Get Leaderboard
app.get('/api/leaderboard', async (req, res) => {
    const top = await User.find().sort({ totalScore: -1 }).limit(10).lean();
    res.json({ topData: top.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
