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
        title: "დღევანდელი (8 მაისი)",
        matches: ["ბრაზილია vs ხორვატია", "საფრანგეთი vs პოლონეთი"],
        results: ["1", "2"]
    },
    "day2": {
        title: "ხვალ (9 მაისი)",
        matches: ["არგენტინა vs მექსიკა", "ესპანეთი vs გერმანია"],
        results: ["", ""] 
    }
};

mongoose.connect(process.env.MONGO_URI).then(() => console.log('✅ DB Connected'));

// მონაცემთა მოდელი პაროლით
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }, // ახალი ველი
    totalScore: { type: Number, default: 0 },
    predictions: [{ dayId: String, answers: Object }]
}));

app.post('/api/check-user', async (req, res) => {
    try {
        const { user, password } = req.body;
        let existingUser = await User.findOne({ username: user });

        if (!existingUser) {
            // თუ იუზერი არ არსებობს, ვქმნით ახალს მოწოდებული პაროლით
            existingUser = new User({ username: user, password: password });
            await existingUser.save();
            return res.json({ success: true, allDays: SETTINGS, userPredictions: [], isNew: true });
        }

        // თუ არსებობს, ვამოწმებთ პაროლს
        if (existingUser.password !== password) {
            return res.json({ success: false, message: "არასწორი პაროლი!" });
        }

        res.json({ success: true, allDays: SETTINGS, userPredictions: existingUser.predictions });
    } catch (e) { res.status(500).json({ success: false }); }
});

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

app.get('/api/calculate-scores', async (req, res) => {
    try {
        const users = await User.find();
        for (let user of users) {
            let score = 0;
            user.predictions.forEach(p => {
                const dayData = SETTINGS[p.dayId];
                if (dayData) {
                    dayData.results.forEach((res, i) => {
                        if (res && p.answers[i] === res) score++;
                    });
                }
            });
            user.totalScore = score;
            await user.save();
        }
        res.json({ success: true, message: "ქულები გადათვლილია!" });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.get('/api/leaderboard', async (req, res) => {
    const top = await User.find().sort({ totalScore: -1 }).limit(10).lean();
    res.json({ topData: top.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
