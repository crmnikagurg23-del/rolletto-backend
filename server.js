const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors()); 
app.use(express.json()); 

const MONGO_URI = process.env.MONGO_URI; 

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ DB Error:', err));

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    totalScore: { type: Number, default: 0 },
    predictions: [{
        date: String,
        answers: [String]
    }]
});
const User = mongoose.model('User', UserSchema);

app.get('/api/check-user', async (req, res) => {
    try {
        const { user } = req.query;
        if (!user) return res.status(400).json({ success: false });
        let existingUser = await User.findOne({ username: user });
        if (!existingUser) {
            existingUser = new User({ username: user });
            await existingUser.save();
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/save-prediction', async (req, res) => {
    try {
        const { username, answers } = req.body;
        const today = new Date().toISOString().split('T')[0]; 
        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ success: false });
        const hasPredictedToday = user.predictions.some(p => p.date === today);
        if (hasPredictedToday) return res.status(400).json({ success: false, message: "უკვე შევსებულია!" });
        user.predictions.push({ date: today, answers: answers });
        await user.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        const { currentUser } = req.query;
        const allUsers = await User.find().sort({ totalScore: -1 }).lean();
        const top10 = allUsers.slice(0, 10).map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore }));
        let personalData = null;
        if (currentUser) {
            const userIndex = allUsers.findIndex(u => u.username === currentUser);
            if (userIndex >= 10) personalData = { rank: userIndex + 1, u: allUsers[userIndex].username, p: allUsers[userIndex].totalScore };
        }
        res.json({ topData: top10, personalData: personalData });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
