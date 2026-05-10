const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// 🔗 ლინკი პირდაპირ კოდში (ყველაზე საიმედო ვარიანტი)
const MONGO_URI = "mongodb://nikagurgenidze96:i5IHVZwDyQAszsEr@ac-p2pvdqf-shard-00-00.p9v8t.mongodb.net:27017,ac-p2pvdqf-shard-00-01.p9v8t.mongodb.net:27017,ac-p2pvdqf-shard-00-02.p9v8t.mongodb.net:27017/worldcup?ssl=true&replicaSet=atlas-13pivk-shard-0&authSource=admin&retryWrites=true&w=majority";

const SHEET_ID = "1rVe2OxD7wX6UR2h8xp1AmBEQ6Lx1J6S2J1qOizZK96s";
const USERS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;

// ბაზასთან კავშირის მცდელობა
mongoose.connect(MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000 
})
.then(() => console.log("✅ DB CONNECTED"))
.catch(err => console.error("❌ DB ERROR:", err.message));

// მარტივი ენდპოინტი შესამოწმებლად
app.get('/api/status', (req, res) => {
    res.json({ 
        status: "Online", 
        database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected" 
    });
});

app.get('/api/leaderboard', async (req, res) => {
    try {
        // თუ ბაზა არაა ჩართული, ცარიელი სია დააბრუნოს (რომ 502 არ ამოაგდოს)
        if (mongoose.connection.readyState !== 1) return res.json({ topData: [], info: "DB offline" });
        const User = mongoose.model('User', new mongoose.Schema({ username: String, totalScore: Number }));
        const top = await User.find().sort({ totalScore: -1 }).limit(10);
        res.json({ topData: top.map((u, i) => ({ rank: i + 1, u: u.username, p: u.totalScore })) });
    } catch (e) { res.json({ topData: [] }); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
