const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ DB Error:', err));

const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    totalScore: { type: Number, default: 0 },
    predictions: [{ date: String, answers: [String] }]
}));

// --- ადმინ სექცია: აქ შეცვლი ხოლმე თამაშებს და შედეგებს ---
const CURRENT_GAMES = [
    "ბრაზილია vs ხორვატია", "საფრანგეთი vs პოლონეთი", 
    "არგენტინა vs მექსიკა", "ესპანეთი vs გერმანია", 
    "ინგლისი vs აშშ", "პორტუგალია vs განა", 
    "ნიდერლანდები vs სენეგალი", "ბელგია vs კანადა", 
    "ურუგვაი vs სამხ. კორეა", "იაპონია vs კოსტა რიკა"
];

const CORRECT_RESULTS = ["1", "2", "1", "X", "2", "2", "2", "2", "1", "1"]; 
// -------------------------------------------------------

app.get('/api/check-user', async (req, res) => {
    try {
        const { user } = req.query;
        let existingUser = await User.findOne({ username: user });
        if (!existingUser) {
            existingUser = new User({ username: user });
            await existingUser.save();
        }
        res.json({ 
            success: true, 
            games: CURRENT_GAMES, 
            correctAnswers: CORRECT_RESULTS,
            myLastPredictions: existingUser.predictions.length > 0 ? existingUser.predictions[existingUser.predictions.length-1].answers : null 
        });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.post('/api/save-prediction', async (req, res) => {
    try {
        const { username, answers } = req.body;
        const today = new Date().toISOString().split('T')[0];
        const user = await User.findOne({ username });
        if (user.predictions.some(p => p.date === today)) {
            return res.status(400).json({ success: false, message: "დღეს უკვე შეავსეთ!" });
        }
        user.predictions.push({ date: today, answers: answers });
        await user.save();
        res.json({ success: true });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/calculate-scores', async (req, res) => {
    try {
        const users = await User.find();
        for (let user of users) {
            let score = 0;
            user.predictions.forEach(p => {
                p.answers.forEach((ans, i) => {
                    if (ans && CORRECT_RESULTS[i] && ans.toUpperCase() === CORRECT_RESULTS[i].toUpperCase()) score++;
                });
            });
            user.totalScore = score;
            await user.save();
        }
        res.json({ success: true, message: "ქულები განახლდა!" });
    } catch (error) { res.status(500).json({ success: false }); }
});

app.get('/api/leaderboard', async (req, res) => {
    const all = await User.find().sort({ totalScore: -1 }).lean();
    const top10 = all.slice(0, 10).map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore }));
    res.json({ topData: top10 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
