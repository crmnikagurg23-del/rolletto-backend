const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// =========================================================
// 🔗 AUTOMATED CONFIG WITH FALLBACK
// =========================================================
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://nikagurgenidze96:i5IHVZwDyQAszsEr@cluster0.p9v8t.mongodb.net/worldcup?retryWrites=true&w=majority";

const SHEET_ID = "1rVe2OxD7wX6UR2h8xp1AmBEQ6Lx1J6S2J1qOizZK96s";
const GAMES_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Games`;
const USERS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;

mongoose.set('strictQuery', false);

async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 30000 // ვაცალოთ 30 წამი
        });
        console.log("✅✅✅ DATABASE CONNECTED SUCCESSFULLY!");
    } catch (err) {
        console.error("❌❌❌ DB CONNECTION FAILED!");
        console.error("Reason:", err.message);
    }
}
connectDB();

const userSchema = new mongoose.Schema({
    username: { type: String, unique: true, lowercase: true, trim: true },
    password: { type: String },
    totalScore: { type: Number, default: 0 },
    lastSubmissionDate: { type: Date, default: Date.now },
    predictions: [{ dayId: String, answers: Object }]
});
const User = mongoose.model('User', userSchema);

// ... (დანარჩენი API ფუნქციები: check-user, leaderboard, save-prediction - იგივე რჩება)

app.post('/api/check-user', async (req, res) => {
    try {
        const { user, password } = req.body;
        const usernameLower = user.toLowerCase().trim();
        const sheetRes = await axios.get(USERS_URL);
        const allowed = sheetRes.data.split('\n').map(r => r.split(',')[0].replace(/"/g, '').trim().toLowerCase());

        if (!allowed.includes(usernameLower)) return res.json({ success: false, message: "User not found" });

        let u = await User.findOne({ username: usernameLower });
        if (!u) {
            u = new User({ username: usernameLower, password: password });
            await u.save();
        } else if (u.password !== password) return res.json({ success: false, message: "Wrong password" });

        const gamesRes = await axios.get(GAMES_URL);
        const allDays = {}; // აქ მონაცემების დამუშავება ხდება
        
        res.json({ success: true, userScore: u.totalScore, userPredictions: u.predictions, allDays });
    } catch (e) { res.status(500).json({ success: false }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
