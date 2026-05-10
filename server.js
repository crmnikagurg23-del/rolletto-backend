const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// შეცვალე შენი მონაცემებით
const MONGO_URI = "შენი_მონგოს_ლინკი";
const GAMES_SHEET_URL = "შენი_ექსელის_CSV_ლინკი";

mongoose.connect(MONGO_URI);

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true },
    password: { type: String },
    predictions: [{ dayId: String, answers: Object }],
    totalScore: { type: Number, default: 0 }
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
                    title: cols[1], 
                    date: cols[2],
                    matches: cols[3] ? cols[3].split('|') : [],
                    results: cols[4] ? cols[4].split('|') : null,
                    sport: cols[5] || "Football", // სვეტი F
                    pointsPerGame: parseInt(cols[6]) || 1 // სვეტი G
                };
            }
        });
        return settings;
    } catch (e) { return {}; }
}

app.post('/api/check-user', async (req, res) => {
    const { user, password } = req.body;
    try {
        let u = await User.findOne({ username: user.toLowerCase() });
        if (!u) {
            u = new User({ username: user.toLowerCase(), password: password });
            await u.save();
        } else if (u.password !== password) {
            return res.json({ success: false, message: "Incorrect password!" });
        }

        const allDays = await getDynamicSettings();
        const users = await User.find().sort({ totalScore: -1 });
        const rank = users.findIndex(curr => curr.username === u.username) + 1;

        res.json({
            success: true,
            userScore: u.totalScore,
            userRank: rank,
            userPredictions: u.predictions,
            allDays: allDays
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/save-prediction', async (req, res) => {
    const { username, dayId, answers } = req.body;
    try {
        const u = await User.findOne({ username: username.toLowerCase() });
        const settings = await getDynamicSettings();
        const now = new Date().toLocaleDateString('en-CA');

        if (settings[dayId].date < now) return res.json({ success: false, message: "Day expired!" });
        
        const existing = u.predictions.find(p => p.dayId === dayId);
        if (existing) return res.json({ success: false, message: "Already submitted!" });

        u.predictions.push({ dayId, answers });
        await u.save();
        res.json({ success: true });
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
                    const weight = dayData.pointsPerGame; // იყენებს ექსელის ქულას
                    dayData.results.forEach((real, idx) => {
                        if (real && pred.answers[idx] === real) total += weight;
                    });
                }
            });
            user.totalScore = total;
            await user.save();
        }
        res.json({ success: true, message: "Scores updated!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/leaderboard', async (req, res) => {
    const users = await User.find().sort({ totalScore: -1 }).limit(10);
    res.json({ topData: users.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) });
});

app.listen(process.env.PORT || 3000);
