const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 🔗 DATABASE CONNECTION
const MONGO_URI = "mongodb+srv://nika_final:win2026win@cluster0.lqh75wa.mongodb.net/worldcup?retryWrites=true&w=majority&appName=Cluster0"; 
const SHEET_ID = "1rVe2OxD7wX6UR2h8xp1AmBEQ6Lx1J6S2J1qOizZK96s";
const USERS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
const GAMES_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Games`;

mongoose.connect(MONGO_URI).then(() => console.log("✅ DB CONNECTED"));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String },
    totalScore: { type: Number, default: 0 },
    predictions: [{ dayId: String, answers: Object, timestamp: { type: Date, default: Date.now } }]
});
const User = mongoose.model('User', userSchema);

// --- HELPER: GET COMMON DATA ---
async function getCommonData(u) {
    const gRes = await axios.get(GAMES_URL);
    const rows = gRes.data.split('\n').slice(1);
    const allDays = {};
    rows.forEach(r => {
        const c = r.split(',').map(v => v.replace(/"/g, '').trim());
        if(c[0]) allDays[c[0]] = { title: c[1], date: c[2], matches: c[3]?.split('|') || [], results: c[4]?.split('|') || null, pointsPerGame: parseInt(c[6]) || 1 };
    });
    const allUsers = await User.find().sort({ totalScore: -1 });
    const rank = allUsers.findIndex(curr => curr.username === u.username) + 1;
    return { userScore: u.totalScore, userRank: rank, userPredictions: u.predictions, allDays };
}

// --- SIGN UP ---
app.post('/api/signup', async (req, res) => {
    try {
        const { user, password } = req.body;
        const uName = user.toLowerCase().trim();
        const existing = await User.findOne({ username: uName });
        if (existing) return res.json({ success: false, message: "Account already exists. Please Login!" });

        const sheetRes = await axios.get(USERS_URL);
        const allowed = sheetRes.data.split('\n').map(r => r.split(',')[0].replace(/"/g, '').trim().toLowerCase());
        if (!allowed.includes(uName)) return res.json({ success: false, message: "Username not found in Rolletto database!" });

        const newUser = new User({ username: uName, password });
        await newUser.save();
        const data = await getCommonData(newUser);
        res.json({ success: true, ...data });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- LOGIN ---
app.post('/api/login', async (req, res) => {
    try {
        const { user, password } = req.body;
        const uName = user.toLowerCase().trim();
        const u = await User.findOne({ username: uName });
        if (!u) return res.json({ success: false, message: "Account not found. Please Sign Up first!" });
        if (u.password !== password) return res.json({ success: false, message: "Incorrect password!" });

        const data = await getCommonData(u);
        res.json({ success: true, ...data });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- SAVE PREDICTION ---
app.post('/api/save-prediction', async (req, res) => {
    const { username, dayId, answers } = req.body;
    const u = await User.findOne({ username: username.toLowerCase().trim() });
    if(u && !u.predictions.find(p => p.dayId === dayId)) {
        u.predictions.push({ dayId, answers });
        await u.save();
        res.json({ success: true });
    } else res.json({ success: false });
});

// --- LEADERBOARD ---
app.get('/api/leaderboard', async (req, res) => {
    const top = await User.find().sort({ totalScore: -1, "predictions.timestamp": 1 }).limit(10);
    res.json({ topData: top.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) });
});

app.listen(process.env.PORT || 10000);
