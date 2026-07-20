const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = "mongodb+srv://nika_final:win2026win@cluster0.lqh75wa.mongodb.net/worldcup?retryWrites=true&w=majority&appName=Cluster0"; 
const SHEET_ID = "1rVe2OxD7wX6UR2h8xp1AmBEQ6Lx1J6S2J1qOizZK96s";
const USERS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
const GAMES_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Games`;

mongoose.connect(MONGO_URI).then(() => console.log("✅ DB Connected"));

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String },
    totalScore: { type: Number, default: 0 },
    predictions: [{ dayId: String, answers: Object, timestamp: { type: Date, default: Date.now } }]
});
const User = mongoose.model('User', userSchema);

app.get('/api/ping', (req, res) => {
    res.send("⚡ Pong! Server is awake.");
});

app.get('/api/public-days', async (req, res) => {
    try {
        const gRes = await axios.get(GAMES_URL);
        const rows = gRes.data.split('\n').slice(1);
        const allDays = {};
        rows.forEach(r => {
            const c = r.split(',').map(v => v.replace(/"/g, '').trim());
            if(c[0]) allDays[c[0]] = { title: c[1], date: c[2], matches: c[3]?.split('|') || [], results: c[4] || null, pointsPerGame: parseInt(c[6]) || 1 };
        });
        res.json({ success: true, allDays });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/signup', async (req, res) => {
    try {
        const { user, password } = req.body;
        const uName = user.toLowerCase().trim();
        const existing = await User.findOne({ username: uName });
        if (existing) return res.json({ success: false, message: "Account already exists!" });
        const sheetRes = await axios.get(USERS_URL);
        const allowed = sheetRes.data.split('\n').map(r => r.split(',')[0].replace(/"/g, '').trim().toLowerCase());
        if (!allowed.includes(uName)) return res.json({ success: false, message: "User not found in whitelist!" });
        const newUser = new User({ username: uName, password });
        await newUser.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { user, password } = req.body;
        const uName = user.toLowerCase().trim();
        const u = await User.findOne({ username: uName });
        if (!u || u.password !== password) return res.json({ success: false, message: "Invalid credentials!" });
        const gRes = await axios.get(GAMES_URL);
        const rows = gRes.data.split('\n').slice(1);
        const allDays = {};
        rows.forEach(r => {
            const c = r.split(',').map(v => v.replace(/"/g, '').trim());
            if(c[0]) allDays[c[0]] = { title: c[1], date: c[2], matches: c[3]?.split('|') || [], results: c[4] || null, pointsPerGame: parseInt(c[6]) || 1 };
        });
        const allUsers = await User.find().sort({ totalScore: -1, "predictions.timestamp": 1 });
        const rankIndex = allUsers.findIndex(curr => curr.username === uName);
        res.json({ 
            success: true, 
            userScore: u.totalScore || 0, 
            userRank: rankIndex === -1 ? "-" : rankIndex + 1, 
            userPredictions: u.predictions || [], 
            allDays 
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post('/api/save-prediction', async (req, res) => {
    try {
        const { username, dayId, answers } = req.body;
        
        const gRes = await axios.get(GAMES_URL);
        const rows = gRes.data.split('\n').slice(1);
        let isDayLocked = false;
        
        rows.forEach(r => {
            const c = r.split(',').map(v => v.replace(/"/g, '').trim());
            if(c[0] === dayId) {
                if(r.toUpperCase().includes("LOCKED")) {
                    isDayLocked = true;
                }
            }
        });

        if (isDayLocked) {
            return res.json({ success: false, message: "This matchday is locked! Predictions are closed." });
        }

        const u = await User.findOne({ username: username.toLowerCase().trim() });
        if(u && !u.predictions.find(p => p.dayId === dayId)) {
            u.predictions.push({ dayId, answers, timestamp: new Date() });
            await u.save();
            return res.json({ success: true });
        } else {
            return res.json({ success: false, message: "Prediction already exists or user not found." });
        }
    } catch (e) {
        return res.status(500).json({ success: false, message: "Server error." });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    const top = await User.find().sort({ totalScore: -1, "predictions.timestamp": 1 }).limit(20);
    const prizes = {
        1: "1500 $", 2: "1000 $", 3: "800 $",
        4: "500 freebet", 5: "400 freebet", 6: "300 freebet",
        7: "250 freebet", 8: "200 freebet", 9: "150 freebet", 10: "100 freebet",
        11: "50 freebet", 12: "50 freebet", 13: "50 freebet",
        14: "30 freebet", 15: "30 freebet", 16: "25 freebet",
        17: "25 freebet", 18: "20 freebet", 19: "20 freebet", 20: "20 freebet"
    };
    res.json({ topData: top.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore || 0, prize: prizes[i + 1] || "-" })) });
});

// 🛠️ ᲒᲐᲜᲐᲮᲚᲔᲑᲣᲚᲘ: ᲥᲣᲚᲔᲑᲘᲡ ᲒᲐᲓᲐᲗᲕᲚᲐ VOID ᲛᲮᲐᲠᲓᲐᲭᲔᲠᲘᲗ
app.get('/api/admin/calculate-scores', async (req, res) => {
    try {
        const gRes = await axios.get(GAMES_URL);
        const rows = gRes.data.split('\n').slice(1);
        const resultsMap = {};
        
        rows.forEach(r => {
            const c = r.split(',').map(v => v.replace(/"/g, '').trim());
            if(c[0] && c[4] && c[4].trim() !== "" && !c[4].toUpperCase().includes("LOCKED")) {
                resultsMap[c[0]] = { 
                    results: c[4].split('|').map(res => res.trim().toLowerCase()), 
                    points: parseInt(c[6]) || 1 
                };
            }
        });
        
        const users = await User.find();
        for (let user of users) {
            let score = 0;
            user.predictions.forEach(pred => {
                const dayRes = resultsMap[pred.dayId];
                if (dayRes) {
                    dayRes.results.forEach((res, i) => {
                        if (res && pred.answers[i]) {
                            const userAns = pred.answers[i].toString().toLowerCase().trim();
                            const targetRes = res.toLowerCase().trim();
                            
                            // 🎯 თუ ცხრილში წერია void, ყველას ავტომატურად ემატება მიმდინარე დღის კუთვნილი ქულა
                            if (targetRes === "void") {
                                score += dayRes.points;
                            } 
                            // წინააღმდეგ შემთხვევაში ჩვეულებრივად მოწმდება 1, X, 2
                            else if (["1", "x", "2"].includes(targetRes) && userAns === targetRes) {
                                score += dayRes.points;
                            }
                        }
                    });
                }
            });
            user.totalScore = score;
            await user.save();
        }
        res.send("✅ Scores updated successfully (with VOID support)!");
    } catch (e) { res.status(500).send("❌ Calculation error"); }
});

app.get('/api/admin/reset-all', async (req, res) => {
    try {
        await User.deleteMany({});
        res.send("🔥 SUCCESS: All users and leaderboard data have been completely deleted!");
    } catch (e) { res.status(500).send("❌ Reset error"); }
});

setInterval(() => {
    axios.get('https://rolletto-backend-1.onrender.com/api/ping')
        .then(() => console.log("🎯 Auto-Ping: Server kept awake successfully!"))
        .catch((e) => console.log("Auto-Ping failed."));
}, 600000);

app.listen(process.env.PORT || 10000);
