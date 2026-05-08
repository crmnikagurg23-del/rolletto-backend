const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
app.use(cors());
app.use(express.json());

// =========================================================
// 📢 მართვის პანელი - შეცვალე მხოლოდ ეს ნაწილი!
// =========================================================
const SETTINGS = {
    "day1": {
        title: "8 მაისის მატჩები",
        matches: ["ბრაზილია vs ხორვატია", "საფრანგეთი vs პოლონეთი"],
        results: ["1", "2"] // შედეგები: "1", "X", ან "2"
    },
    "day2": {
        title: "9 მაისის მატჩები",
        matches: ["არგენტინა vs მექსიკა", "ესპანეთი vs გერმანია"],
        results: ["", ""] // სანამ არ დასრულდება, დატოვე ცარიელი
    }
};

// =========================================================
// ⛔ აქედან ქვემოთ კოდს არ შეეხო!
// =========================================================

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected'));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    totalScore: { type: Number, default: 0 },
    predictions: [{ dayId: String, answers: Object }]
}));

// შესვლა და რეგისტრაცია (ახლა აბრუნებს იუზერის ქულასაც)
app.post('/api/check-user', async (req, res) => {
    try {
        const { user, password } = req.body;
        let existingUser = await User.findOne({ username: user });

        if (!existingUser) {
            existingUser = new User({ username: user, password: password });
            await existingUser.save();
            return res.json({ success: true, allDays: SETTINGS, userPredictions: [], userScore: 0 });
        }

        if (existingUser.password !== password) {
            return res.json({ success: false, message: "არასწორი პაროლი!" });
        }

        res.json({ 
            success: true, 
            allDays: SETTINGS, 
            userPredictions: existingUser.predictions,
            userScore: existingUser.totalScore
        });
    } catch (e) { res.status(500).json({ success: false }); }
});

// პროგნოზის შენახვა
app.post('/api/save-prediction', async (req, res) => {
    try {
        const { username, dayId, answers } = req.body;
        const user = await User.findOne({ username });
        if (user.predictions.some(p => p.dayId === dayId)) {
            return res.json({ success: false, message: "უკვე შევსებული გაქვთ!" });
        }
        user.predictions.push({ dayId, answers });
        await user.save();
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ქულების დათვლა
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
        res.json({ success: true, message: "ქულები გადათვლილია!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ბაზის სრული გასუფთავება (ლიდერბორდიდან ხალხის გაქრობა)
app.get('/api/reset-leaderboard', async (req, res) => {
    try {
        await User.deleteMany({}); 
        res.json({ success: true, message: "ლიდერბორდი გასუფთავდა!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

// ლიდერბორდის გამოტანა
app.get('/api/leaderboard', async (req, res) => {
    const top = await User.find().sort({ totalScore: -1 }).limit(10).lean();
    res.json({ topData: top.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
