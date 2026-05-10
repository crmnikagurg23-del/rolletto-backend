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

const USERS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
const GAMES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Games`;

mongoose.connect(MONGO_URI).then(() => console.log("✅ Database Ready - Tie-break logic active"));

const userSchema = new mongoose.Schema({
    username: { type: String, lowercase: true, trim: true },
    password: String,
    totalScore: { type: Number, default: 0 },
    lastSubmissionDate: { type: Date, default: Date.now }, // ⏱️ დროს ვინახავთ აქ
    predictions: [{ dayId: String, answers: Object, points: Number, createdAt: { type: Date, default: Date.now } }]
});
const User = mongoose.model('User', userSchema);

async function getDynamicSettings() {
    try {
        const res = await axios.get(GAMES_SHEET_URL);
        const rows = res.data.split('\n').slice(1);
        const settings = {};
        rows.forEach(row => {
            const cols = row.split(',').map(c => c.replace(/"/g, '').trim());
            if (cols[0]) {
                settings[cols[0]] = {
                    title: cols[1], date: cols[2],
                    matches: cols[3] ? cols[3].split('|') : [],
                    results: cols[4] ? cols[4].split('|') : null
                };
            }
        });
        return settings;
    } catch (e) { return {}; }
}

// =========================================================
// 🔐 AUTH (FAST MODE)
// =========================================================
app.post('/api/check-user', async (req, res) => {
    try {
        const { user, password } = req.body;
        const usernameLower = user.toLowerCase().trim();

        const sheetRes = await axios.get(USERS_SHEET_URL);
        const allowedUsers = sheetRes.data.split('\n').map(r => r.split(',')[0].replace(/"/g, '').trim().toLowerCase());

        if (!allowedUsers.includes(usernameLower)) {
            return res.json({ success: false, message: "User not found. Use Rolletto username!" });
        }

        const currentSettings = await getDynamicSettings();
        let existingUser = await User.findOne({ username: usernameLower });
        
        if (!existingUser) {
            existingUser = new User({ username: usernameLower, password: password });
            await existingUser.save();
        } else if (existingUser.password !== password) {
            return res.json({ success: false, message: "Incorrect password!" });
        }

        // რანგის დათვლა: ჯერ ქულა (კლებადობით), მერე დრო (ზრდადობით)
        const rank = await User.countDocuments({ 
            $or: [
                { totalScore: { $gt: existingUser.totalScore } },
                { totalScore: existingUser.totalScore, lastSubmissionDate: { $lt: existingUser.lastSubmissionDate } }
            ]
        }) + 1;

        res.json({ 
            success: true, allDays: currentSettings, 
            userPredictions: existingUser.predictions, 
            userScore: existingUser.totalScore, userRank: rank 
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

// =========================================================
// 💾 SAVE PREDICTIONS (Time recorded)
// =========================================================
app.post('/api/save-prediction', async (req, res) => {
    try {
        const { username, dayId, answers } = req.body;
        const user = await User.findOne({ username: username.toLowerCase().trim() });
        if (user) {
            if (!user.predictions.find(p => p.dayId === dayId)) {
                const now = new Date();
                user.predictions.push({ dayId, answers, points: 0, createdAt: now });
                user.lastSubmissionDate = now; // ⏱️ ბოლო აქტივობის დრო
                await user.save();
                return res.json({ success: true });
            }
            res.json({ success: false, message: "Already submitted!" });
        }
    } catch (e) { res.status(500).json({ success: false }); }
});

// =========================================================
// 🏆 LEADERBOARD (Tie-break by Time)
// =========================================================
app.get('/api/leaderboard', async (req, res) => {
    try {
        // სორტირება: totalScore DESC (-1), lastSubmissionDate ASC (1)
        const users = await User.find().sort({ totalScore: -1, lastSubmissionDate: 1 }).limit(10);
        res.json({ topData: users.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) });
    } catch (e) { res.status(500).json({ success: false }); }
});

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
                        if (real && pred.answers[idx] === real) total += 1;
                    });
                }
            });
            user.totalScore = total;
            await user.save();
        }
        res.json({ success: true, message: "Scores updated!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on ${PORT}`));
