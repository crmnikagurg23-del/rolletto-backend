const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// 🔗 CONFIGURATION
// =========================================================
const MONGO_URI = process.env.MONGO_URI; 
const SHEET_ID = "1rVe2OxD7wX6UR2h8xp1AmBEQ6Lx1J6S2J1qOizZK96s";

// URLs for different tabs
const USERS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
const GAMES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Games`;

mongoose.connect(MONGO_URI).then(() => console.log("✅ Database Connection Secure"));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, lowercase: true, trim: true },
    password: String,
    totalScore: { type: Number, default: 0 },
    predictions: [{ dayId: String, answers: Object, points: Number }]
}));

// =========================================================
// 🔄 DYNAMIC SETTINGS LOADER (From Google Sheets)
// =========================================================
async function getDynamicSettings() {
    try {
        const res = await axios.get(GAMES_SHEET_URL);
        const rows = res.data.split('\n').slice(1); // Skip header row
        const settings = {};

        rows.forEach(row => {
            const cols = row.split(',').map(c => c.replace(/"/g, '').trim());
            if (cols[0]) { // Check if dayId exists
                settings[cols[0]] = {
                    title: cols[1],
                    date: cols[2],
                    matches: cols[3] ? cols[3].split('|') : [],
                    results: cols[4] ? cols[4].split('|') : null
                };
            }
        });
        return settings;
    } catch (e) { 
        console.error("Error loading games from Sheets:", e);
        return {}; 
    }
}

// =========================================================
// 🔐 AUTH & AUTO-RECALCULATE SCORE
// =========================================================
app.post('/api/check-user', async (req, res) => {
    try {
        const { user, password } = req.body;
        const usernameLower = user.toLowerCase().trim();

        // 1. Fetch allowed users from Sheet1
        const sheetRes = await axios.get(USERS_SHEET_URL);
        const allowedUsers = sheetRes.data.split('\n').map(r => r.split(',')[0].replace(/"/g, '').trim().toLowerCase());

        if (!allowedUsers.includes(usernameLower)) {
            return res.json({ 
                success: false, 
                message: "User not found. Please use your existing Rolletto username!" 
            });
        }

        // 2. Fetch latest game data & results
        const currentSettings = await getDynamicSettings();

        let existingUser = await User.findOne({ username: usernameLower });
        if (!existingUser) {
            // First time login - register the user
            existingUser = new User({ username: usernameLower, password: password });
            await existingUser.save();
        } else if (existingUser.password !== password) {
            // Check password for existing account
            return res.json({ success: false, message: "Incorrect password!" });
        }

        // 🚀 3. AUTOMATIC RECALCULATION
        // Whenever a user logs in, we sync their score with the latest results from Google Sheets
        let totalPoints = 0;
        existingUser.predictions.forEach(pred => {
            const dayData = currentSettings[pred.dayId];
            if (dayData && dayData.results) {
                let dayPoints = 0;
                dayData.results.forEach((realRes, idx) => {
                    // Check if prediction matches the real result
                    if (pred.answers[idx] === realRes && realRes !== "") {
                        dayPoints += 1;
                    }
                });
                pred.points = dayPoints;
                totalPoints += dayPoints;
            }
        });

        existingUser.totalScore = totalPoints;
        await existingUser.save(); // Save updated score to MongoDB

        // 4. Calculate current rank
        const rank = await User.countDocuments({ totalScore: { $gt: existingUser.totalScore } }) + 1;

        res.json({ 
            success: true, 
            allDays: currentSettings, 
            userPredictions: existingUser.predictions, 
            userScore: existingUser.totalScore, 
            userRank: rank 
        });
    } catch (e) { 
        console.error("Auth sync error:", e);
        res.status(500).json({ success: false, message: "Server error during synchronization" }); 
    }
});

// =========================================================
// 💾 SAVE PREDICTIONS
// =========================================================
app.post('/api/save-prediction', async (req, res) => {
    try {
        const { username, dayId, answers } = req.body;
        const user = await User.findOne({ username: username.toLowerCase().trim() });
        if (user) {
            const alreadyPredicted = user.predictions.find(p => p.dayId === dayId);
            if (!alreadyPredicted) {
                user.predictions.push({ dayId, answers, points: 0 });
                await user.save();
                return res.json({ success: true });
            }
            return res.json({ success: false, message: "Prediction already submitted for this day!" });
        }
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// =========================================================
// 🏆 LEADERBOARD
// =========================================================
app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await User.find().sort({ totalScore: -1 }).limit(10);
        res.json({ 
            topData: users.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) 
        });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

// =========================================================
// 🔄 GLOBAL RECALCULATE (Optional Manual Trigger)
// =========================================================
app.get('/api/recalculate-all', async (req, res) => {
    try {
        const currentSettings = await getDynamicSettings();
        const users = await User.find();
        for (let user of users) {
            let total = 0;
            user.predictions.forEach(pred => {
                const dayData = currentSettings[pred.dayId];
                if (dayData && dayData.results) {
                    dayData.results.forEach((real, idx) => {
                        if (pred.answers[idx] === real && real !== "") total += 1;
                    });
                }
            });
            user.totalScore = total;
            await user.save();
        }
        res.json({ success: true, message: "All scores updated from Google Sheets!" });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Rolletto Predictor Engine running on port ${PORT}`));
