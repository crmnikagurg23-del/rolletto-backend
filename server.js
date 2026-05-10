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

mongoose.connect(MONGO_URI).then(() => console.log("✅ Database Ready"));

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
        const rows = res.data.split('\n').slice(1); // Skip header
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
    } catch (e) { return {}; }
}

// =========================================================
// 🔐 AUTH & USERS SYNC
// =========================================================
app.post('/api/check-user', async (req, res) => {
    try {
        const { user, password } = req.body;
        const usernameLower = user.toLowerCase().trim();

        // 1. Check allowed users from Google Sheets
        const sheetRes = await axios.get(USERS_SHEET_URL);
        const allowedUsers = sheetRes.data.split('\n').map(r => r.split(',')[0].replace(/"/g, '').trim().toLowerCase());

        if (!allowedUsers.includes(usernameLower)) {
            return res.json({ 
                success: false, 
                message: "User not found. Please use your existing Rolletto username!" 
            });
        }

        // 2. Fetch game settings from Google Sheets
        const currentSettings = await getDynamicSettings();

        let existingUser = await User.findOne({ username: usernameLower });
        if (!existingUser) {
            // First time login - register
            existingUser = new User({ username: usernameLower, password: password });
            await existingUser.save();
        } else if (existingUser.password !== password) {
            // Check password for existing users
            return res.json({ success: false, message: "Incorrect password!" });
        }

        const rank = await User.countDocuments({ totalScore: { $gt: existingUser.totalScore } }) + 1;
        res.json({ 
            success: true, 
            allDays: currentSettings, 
            userPredictions: existingUser.predictions, 
            userScore: existingUser.totalScore, 
            userRank: rank 
        });
    } catch (e) { 
        res.status(500).json({ success: false, message: "Server sync error" }); 
    }
});

// =========================================================
// 💾 SAVE & LEADERBOARD
// =========================================================
app.post('/api/save-prediction', async (req, res) => {
    try {
        const { username, dayId, answers } = req.body;
        const user = await User.findOne({ username: username.toLowerCase().trim() });
        if (user) {
            if (!user.predictions.find(p => p.dayId === dayId)) {
                user.predictions.push({ dayId, answers, points: 0 });
                await user.save();
                return res.json({ success: true });
            }
            res.json({ success: false, message: "Prediction already submitted for this day!" });
        }
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
