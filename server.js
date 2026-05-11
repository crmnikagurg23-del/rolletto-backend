const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 🔗 MONGODB CONNECTION
const MONGO_URI = "mongodb+srv://nika_final:win2026win@cluster0.lqh75wa.mongodb.net/worldcup?retryWrites=true&w=majority&appName=Cluster0"; 
mongoose.connect(MONGO_URI).then(() => console.log("✅ DATABASE CONNECTED (NO GOOGLE SHEETS)"));

// --- MODELS ---
const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String },
    isAdmin: { type: Boolean, default: false },
    totalScore: { type: Number, default: 0 },
    predictions: [{ dayId: String, answers: Object, timestamp: { type: Date, default: Date.now } }]
});

const gameSchema = new mongoose.Schema({
    dayId: { type: String, unique: true },
    title: String,
    date: String,
    sport: { type: String, default: "Football" },
    matches: [String],
    results: { type: [String], default: [] },
    pointsPerGame: { type: Number, default: 1 }
});

const User = mongoose.model('User', userSchema);
const Game = mongoose.model('Game', gameSchema);

// --- AUTH LOGIC ---
app.post('/api/signup', async (req, res) => {
    try {
        const { user, password } = req.body;
        const uName = user.toLowerCase().trim();
        const existing = await User.findOne({ username: uName });
        if (existing) return res.json({ success: false, message: "Account already exists!" });

        const newUser = new User({ username: uName, password });
        if (uName === "admin_nika") newUser.isAdmin = true; // სპეციალური ადმინ იუზერი

        await newUser.save();
        res.json({ success: true, message: "Registered successfully!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { user, password } = req.body;
        const u = await User.findOne({ username: user.toLowerCase().trim() });
        if (!u || u.password !== password) return res.json({ success: false, message: "Invalid credentials" });
        
        const games = await Game.find().sort({ dayId: 1 });
        const allUsers = await User.find({ isAdmin: false }).sort({ totalScore: -1 });
        const rank = allUsers.findIndex(curr => curr.username === u.username) + 1;

        res.json({ 
            success: true, 
            isAdmin: u.isAdmin, 
            userScore: u.totalScore, 
            userRank: rank || 0,
            userPredictions: u.predictions, 
            allDays: games 
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

// --- ADMIN API ---
app.post('/api/admin/add-game', async (req, res) => {
    try {
        const { adminUser, gameData } = req.body;
        const admin = await User.findOne({ username: adminUser.toLowerCase(), isAdmin: true });
        if (!admin) return res.status(403).json({ message: "Unauthorized" });

        await Game.findOneAndUpdate({ dayId: gameData.dayId }, gameData, { upsert: true });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

app.post('/api/admin/set-results', async (req, res) => {
    try {
        const { adminUser, dayId, results } = req.body;
        const admin = await User.findOne({ username: adminUser.toLowerCase(), isAdmin: true });
        if (!admin) return res.status(403).json({ message: "Unauthorized" });

        await Game.findOneAndUpdate({ dayId }, { results });
        res.json({ success: true });
    } catch (e) { res.json({ success: false }); }
});

// --- USER API ---
app.post('/api/save-prediction', async (req, res) => {
    const { username, dayId, answers } = req.body;
    const u = await User.findOne({ username: username.toLowerCase().trim() });
    if(u && !u.predictions.find(p => p.dayId === dayId)) {
        u.predictions.push({ dayId, answers, timestamp: new Date() });
        await u.save();
        res.json({ success: true });
    } else res.json({ success: false });
});

app.get('/api/leaderboard', async (req, res) => {
    const top = await User.find({ isAdmin: false }).sort({ totalScore: -1, "predictions.timestamp": 1 }).limit(10);
    res.json({ topData: top.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) });
});

app.listen(process.env.PORT || 10000, () => console.log("🚀 Server running..."));
