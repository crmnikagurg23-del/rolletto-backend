const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// =========================================================
// 🔗 CONFIGURATION (UPDATED WITH NEW PASSWORD)
// =========================================================
const MONGO_URI = "mongodb://nikagurgenidze96:nika19962026@ac-p2pvdqf-shard-00-00.p9v8t.mongodb.net:27017,ac-p2pvdqf-shard-00-01.p9v8t.mongodb.net:27017,ac-p2pvdqf-shard-00-02.p9v8t.mongodb.net:27017/worldcup?ssl=true&replicaSet=atlas-13pivk-shard-0&authSource=admin&retryWrites=true&w=majority"; 

const SHEET_ID = "1rVe2OxD7wX6UR2h8xp1AmBEQ6Lx1J6S2J1qOizZK96s"; 
const GAMES_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Games`;
const USERS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;

mongoose.connect(MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
})
.then(() => console.log("✅ Database Ready! Connection successful."))
.catch(err => console.log("❌ DB Connection Error:", err));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String },
    totalScore: { type: Number, default: 0 },
    lastSubmissionDate: { type: Date, default: Date.now },
    predictions: [{ dayId: String, answers: Object, createdAt: { type: Date, default: Date.now } }]
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
                    results: cols[4] ? cols[4].split('|') : null,
                    sport: cols[5] || "Football",
                    pointsPerGame: parseInt(cols[6]) || 1
                };
            }
        });
        return settings;
    } catch (e) { return {}; }
}

// 🔐 AUTHENTICATION
app.post('/api/check-user', async (req, res) => {
    try {
        const { user, password } = req.body;
        const usernameLower = user.toLowerCase().trim();
        const sheetRes = await axios.get(USERS_SHEET_URL);
        const allowed = sheetRes.data.split('\n').map(r => r.split(',')[0].replace(/"/g, '').trim().toLowerCase());

        if (!allowed.includes(usernameLower)) return res.json({ success: false, message: "User not found!" });

        let u = await User.findOne({ username: usernameLower });
        if (!u) {
            u = new User({ username: usernameLower, password: password });
            await u.save();
        } else if (u.password !== password) return res.json({ success: false, message: "Incorrect password!" });

        const allDays = await getDynamicSettings();
        const users = await User.find().sort({ totalScore: -1, lastSubmissionDate: 1 });
        const rank = users.findIndex(curr => curr.username === u.username) + 1;
        res.json({ success: true, userScore: u.totalScore, userRank: rank, userPredictions: u.predictions, allDays });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 💾 SAVE PREDICTIONS
app.post('/api/save-prediction', async (req, res) => {
    try {
        const { username, dayId, answers } = req.body;
        const u = await User.findOne({ username: username.toLowerCase().trim() });
        if (!u || u.predictions.find(p => p.dayId === dayId)) return res.json({ success: false, message: "Error!" });
        
        const now = new Date();
        u.predictions.push({ dayId, answers, createdAt: now });
        u.lastSubmissionDate = now;
        await u.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 🏆 LEADERBOARD
app.get('/api/leaderboard', async (req, res) => {
    try {
        const users = await User.find().sort({ totalScore: -1, lastSubmissionDate: 1 }).limit(10);
        res.json({ topData: users.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) });
    } catch (e) { res.status(500).json({ success: false }); }
});

// 🔄 RECALCULATE SCORES
app.get('/api/recalculate-all', async (req, res) => {
    try {
        const settings = await getDynamicSettings();
        const users = await User.find();
        for (let user of users) {
            let total = 0;
            user.predictions.forEach(pred => {
                const day = settings[pred.dayId];
                if (day && day.results) {
                    const weight = day.pointsPerGame;
                    day.results.forEach((real, idx) => { if (real && pred.answers[idx] === real) total += weight; });
                }
            });
            user.totalScore = total;
            await user.save();
        }
        res.json({ success: true, message: "Updated!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Live on port ${PORT}`));
