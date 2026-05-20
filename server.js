<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Rolletto Predictor | World Cup 2026</title>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@600;700&family=Open+Sans:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root { --primary: #00ffcc; --bg-dark: #061218; --glass: rgba(15, 33, 42, 0.9); --accent-gold: #ffcc00; }
        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Open Sans', sans-serif; -webkit-tap-highlight-color: transparent; }
        
        body { 
            background-color: var(--bg-dark); 
            color: #fff; 
            background-image: radial-gradient(circle at 50% 0%, rgba(0, 255, 204, 0.15) 0%, transparent 50%), 
                              linear-gradient(rgba(6,18,24,0.4), rgba(6,18,24,0.6)), 
                              url('https://theminaretonline.org/wp-content/uploads/2021/11/world-cup.jpeg'); 
            background-size: cover; 
            background-attachment: fixed; 
            background-position: center; 
        }

        header { padding: 10px; border-bottom: 1px solid var(--primary); background: var(--glass); position: sticky; top: 0; z-index: 1000; display: flex; justify-content: center; }
        .logo { height: 28px; cursor: pointer; }
        .main-content { padding: 15px; max-width: 600px; margin: 0 auto; min-height: 100vh; }
        .card-auth, .game-card, .leaderboard-container, .rules-container { background: var(--glass); padding: 25px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 15px; }
        
        input { padding: 15px; border-radius: 10px; width: 100%; margin-bottom: 10px; background: rgba(0,0,0,0.4); border: 1px solid #333; color: #fff; outline: none; }
        .btn-green { background: var(--primary); color: var(--bg-dark); border: none; padding: 15px; border-radius: 12px; font-weight: 800; width: 100%; cursor: pointer; text-transform: uppercase; display: flex; justify-content: center; align-items: center; gap: 10px; min-height: 50px; }
        .btn-outline { background: transparent; color: var(--primary); border: 1px solid var(--primary); padding: 13px; border-radius: 12px; width: 100%; cursor: pointer; margin-top: 10px; }
        
        .opt-btn { padding: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #fff; border-radius: 10px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
        .selected { background: rgba(0, 255, 204, 0.2) !important; border: 1px solid var(--primary) !important; }
        
        .res-correct { 
            background: #00ffcc !important; 
            color: #061218 !important; 
            font-weight: 800 !important; 
            border: none !important; 
        }
        .res-wrong { 
            background: #ff4d4d !important; 
            color: #ffffff !important; 
            font-weight: 800 !important;
            border: none !important; 
        }
        .res-actual { 
            border: 2px solid #00ffcc !important; 
            background: transparent !important; 
            color: #00ffcc !important; 
            font-weight: 700 !important;
        }

        .lb-table { width: 100%; border-collapse: separate; border-spacing: 0 6px; }
        .lb-row td { padding: 12px 8px; background: rgba(255,255,255,0.03); border-radius: 10px; font-size: 13px; text-align: center; }
        .my-row-highlight td { background: rgba(0, 255, 204, 0.15) !important; border: 1px solid var(--primary); }

        .tabs-wrapper { 
            display: flex; 
            gap: 10px; 
            padding: 10px 5px; 
            overflow-x: auto !important; 
            white-space: nowrap; 
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
        }
        
        .tabs-wrapper::-webkit-scrollbar { display: none; }

        .day-tab { padding: 10px 20px; background: rgba(255,255,255,0.05); border-radius: 10px; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; display: inline-block; }
        .day-tab.active { background: var(--primary); color: var(--bg-dark); }
        
        .match-display { 
            display: flex;
            justify-content: space-between; 
            align-items: center;
            margin-bottom: 22px;
            width: 100%;
            padding: 0 10px; 
        }
        
        .team-home { 
            display: flex; 
            align-items: center; 
            gap: 10px; 
            flex: 1;
            justify-content: flex-start; 
        }
        
        .team-away { 
            display: flex; 
            align-items: center; 
            gap: 10px; 
            flex: 1;
            justify-content: flex-end; 
        }
        
        .flag-img { 
            width: 28px; 
            height: 19px; 
            object-fit: cover; 
            border-radius: 4px; 
            border: 1px solid rgba(255, 255, 255, 0.15);
            flex-shrink: 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }

        .team-name { 
            font-weight: 700; 
            font-size: 14px; 
            font-family: 'Rajdhani'; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 150px;
        }
        
        .vs-container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 0 15px; 
            flex-shrink: 0;
        }

        .vs-divider { 
            font-size: 11px; 
            color: var(--primary); 
            padding: 4px 10px; 
            background: rgba(0,255,204,0.1); 
            border: 1px solid rgba(0,255,204,0.2);
            border-radius: 6px; 
            font-weight: 700;
            font-family: 'Rajdhani';
        }
        
        .options-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        
        .toast { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); padding: 15px 25px; border-radius: 10px; z-index: 2000; display: none; text-align:center; min-width: 280px; font-weight: 600; }
        .hidden { display: none !important; }
        
        /* 🛠️ CSS ფიქსი ტექსტის ფერებზე ყველა ეკრანისთვის (Rank, Score, Exit) */
        
        /* Rank/Score/Exit სათაურები - მკაფიო ნაცრისფერი */
        .status-title {
            font-size: 11px !important;
            color: #a0aec0 !important; /* მკაფიო, იდეალურად წასაკითხი ნაცრისფერი */
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            display: inline-block;
        }
        
        /* რანკი და ქულა - დიდი და გამწვანებული */
        .status-value {
            color: #00ffcc !important; /* Rolletto-ს მწვანე */
            font-family: 'Rajdhani', sans-serif !important;
            font-size: 24px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
        }
        
        /* გამოსვლის სათაური - წითელი */
        .exit-title {
            color: #e53e3e !important; /* Rolletto-ს წითელი */
            font-size: 11px !important;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
            display: inline-block;
        }
        
        /* გამოსვლის ტექსტი - წითელი */
        .exit-value {
            color: #ff4d4d !important; /*Rolletto-ს წითელი */
            font-size: 16px !important;
            font-family: 'Rajdhani', sans-serif !important;
            font-weight: 700 !important;
            letter-spacing: 0.5px;
        }

        /* 🛠️ Media Query ფიქსი მობილურებისთვის/პლანშეტებისთვის */
        @media (max-width: 768px) {
            /* იუზერის პანელი მობილურზე */
            #my-status .card-auth {
                padding: 15px !important;
                margin-bottom: 15px !important;
                background: rgba(6, 18, 24, 0.9) !important;
                border: 1px solid #00ffcc !important;
            }
            
            /* Rank/Score სათაურები მობილურზე - იძულებითი ნაცრისფერი */
            .status-title {
                font-size: 10px !important;
                color: #a0aec0 !important; /* მკაცრად ნაცრისფერი, რომ გამოჩნდეს მუქ ფონზე */
                display: block !important;
                text-align: center;
                opacity: 1 !important;
            }
            
            /* რანკი/ქულა მობილურზე - ცოტა პატარა */
            .status-value {
                font-size: 22px !important;
                text-align: center;
                display: block !important;
            }
            
            /* Exit სათაური მობილურზე - იძულებითი წითელი */
            .exit-title {
                font-size: 10px !important;
                color: #e53e3e !important;
                display: block !important;
                text-align: center;
                opacity: 1 !important;
            }
            
            /* Exit ტექსტი მობილურზე - იძულებითი წითელი */
            .exit-value {
                font-size: 14px !important;
                text-align: center;
                display: block !important;
            }
            
            /* შუა გამყოფი ხაზები მობილურზე */
            .status-separator {
                border-left: 1px solid rgba(255,255,255,0.1) !important;
                border-right: 1px solid rgba(255,255,255,0.1) !important;
            }
        }
    </style>
</head>
<body>
    <div id="toast" class="toast"></div>
    <header><img src="https://rolletto1.cc/content/125,24fb1440f33968.webp" alt="Rolletto" class="logo"></header>
    <div class="main-content">
        
        <div id="my-status" class="hidden">
            <div class="card-auth" style="padding: 20px; margin-bottom: 20px; background: rgba(6, 18, 24, 0.85); border: 1px solid var(--primary); box-shadow: 0 4px 15px rgba(0, 255, 204, 0.1);">
                <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; text-align:center; align-items:center;">
                    <div>
                        <span class="status-title">Rank</span><br>
                        <b id="my-rank" class="status-value">-</b>
                    </div>
                    <div class="status-separator">
                        <span class="status-title">Score</span><br>
                        <b id="my-score" class="status-value">0</b>
                    </div>
                    <div onclick="logout()" style="cursor:pointer;">
                        <span class="exit-title">Exit</span><br>
                        <b class="exit-value">OUT</b>
                    </div>
                </div>
            </div>
        </div>

        <div id="login-section">
            <h2 style="margin: 20px 0; color: var(--primary); font-size: 26px; text-align:center; font-family:'Rajdhani';">WORLD CUP 2026</h2>
            <div class="card-auth">
                <input type="text" id="username" placeholder="USERNAME" autocomplete="off">
                <input type="password" id="password" placeholder="PASSWORD">
                <button id="login-btn" class="btn-green" onclick="startGame(false, 'login')">LOGIN</button>
                <button class="btn-outline" onclick="toggleAuth('signup')">CREATE ACCOUNT</button>
            </div>
        </div>

        <div id="signup-section" class="hidden">
            <h2 style="margin: 20px 0; color: var(--primary); font-size: 26px; text-align:center; font-family:'Rajdhani';">JOIN PREDICTOR</h2>
            <div class="card-auth">
                <input type="text" id="reg-username" placeholder="ROLLETTO USERNAME" autocomplete="off">
                <input type="password" id="reg-password" placeholder="CREATE PASSWORD">
                <button id="reg-btn" class="btn-green" onclick="startGame(false, 'signup')">SIGN UP / JOIN</button>
                <button class="btn-outline" onclick="toggleAuth('login')">BACK TO LOGIN</button>
            </div>
        </div>

        <div id="game-section" class="hidden">
            <div class="tabs-wrapper" id="day-tabs"></div>
            <div id="games-container"></div>
            <button id="save-btn" class="btn-green hidden" onclick="saveCurrentDay()">SUBMIT PREDICTIONS</button>
        </div>

        <div class="leaderboard-container">
            <h3 style="color: var(--primary); margin-bottom: 15px; font-size: 16px; font-family:'Rajdhani'; text-transform: uppercase;">LEADERBOARD</h3>
            <table class="lb-table"><tbody id="lb-data"></tbody></table>
        </div>
    </div>

    <script>
        const BASE_URL = 'https://rolletto-backend-1.onrender.com/api';
        let GLOBAL_DATA = {}; let SELECTED_DAY = ""; let TEMP_ANSWERS = {};

        function getFlagHtml(teamName, imgId) {
            let name = teamName.trim().toLowerCase();
            if (name === "england" || name === "scotland" || name === "wales") name = "united kingdom";
            if (name === "usa") name = "united states";

            fetch(`https://restcountries.com/v3.1/name/${name}?fullText=false`)
                .then(r => r.json())
                .then(data => {
                    if (data && data[0] && data[0].flags && data[0].flags.png) {
                        const imgEl = document.getElementById(imgId);
                        if (imgEl) imgEl.src = data[0].flags.png;
                    }
                })
                .catch(e => console.log("Flag error for:", teamName));

            return `<img id="${imgId}" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=" class="flag-img" style="background:rgba(255,255,255,0.05);" alt="${teamName}">`;
        }

        function getLocalDateString() {
            const d = new Date();
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        function showToast(m, isErr = true) { 
            const t = document.getElementById('toast'); t.innerText = m; 
            t.style.background = isErr ? '#ff4d4d' : '#00ffcc'; t.style.color = isErr ? '#fff' : '#061218'; 
            t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 4000); 
        }

        function toggleAuth(v) { document.getElementById('login-section').classList.toggle('hidden', v!=='login'); document.getElementById('signup-section').classList.toggle('hidden', v!=='signup'); }

        async function startGame(isAuto, type) {
            const u = isAuto ? localStorage.getItem('wc_user') : (type === 'login' ? document.getElementById('username').value.trim() : document.getElementById('reg-username').value.trim());
            const p = isAuto ? localStorage.getItem('wc_pass') : (type === 'login' ? document.getElementById('password').value.trim() : document.getElementById('reg-password').value.trim());
            if(!u || !p) return;
            try {
                const res = await fetch(`${BASE_URL}/${isAuto ? 'login' : type}`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({user: u, password: p}) }).then(r => r.json());
                if(res.success) {
                    localStorage.setItem('wc_user', u); localStorage.setItem('wc_pass', p);
                    GLOBAL_DATA = res;
                    document.getElementById('my-rank').innerText = res.userRank ? `#${res.userRank}` : "-";
                    document.getElementById('my-score').innerText = res.userScore !== undefined ? res.userScore : "0";
                    document.getElementById('login-section').classList.add('hidden');
                    document.getElementById('signup-section').classList.add('hidden');
                    document.getElementById('game-section').classList.remove('hidden');
                    document.getElementById('my-status').classList.remove('hidden');
                    renderTabs(); loadLB();
                } else if(!isAuto) showToast(res.message);
            } catch(e) { if(!isAuto) showToast("Server error"); }
        }

        function renderTabs() {
            const container = document.getElementById('day-tabs'); container.innerHTML = "";
            const now = getLocalDateString();
            const days = Object.keys(GLOBAL_DATA.allDays).sort((a,b) => a-b);
            const visibleDays = days.filter(id => GLOBAL_DATA.allDays[id].date <= now);
            
            let todayDayId = visibleDays.find(id => GLOBAL_DATA.allDays[id].date === now);
            if (!SELECTED_DAY) SELECTED_DAY = todayDayId || visibleDays[visibleDays.length - 1];

            visibleDays.forEach(dayId => {
                const btn = document.createElement('div');
                btn.className = 'day-tab' + (SELECTED_DAY === dayId ? ' active' : '');
                btn.innerText = (GLOBAL_DATA.allDays[dayId].date === now) ? "TODAY" : GLOBAL_DATA.allDays[dayId].title;
                btn.onclick = () => selectDay(dayId);
                container.appendChild(btn);

                if (SELECTED_DAY === dayId) {
                    setTimeout(() => { btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }, 100);
                }
            });
            if(visibleDays.length > 0) selectDay(SELECTED_DAY);
        }

        function selectDay(dayId) {
            if(SELECTED_DAY !== dayId) {
                SELECTED_DAY = dayId;
                document.querySelectorAll('.day-tab').forEach((tab, index) => {
                    const days = Object.keys(GLOBAL_DATA.allDays).sort((a,b) => a-b);
                    const now = getLocalDateString();
                    const visibleDays = days.filter(id => GLOBAL_DATA.allDays[id].date <= now);
                    if(visibleDays[index] === dayId) tab.classList.add('active');
                    else tab.classList.remove('active');
                });
            }
            
            const container = document.getElementById('games-container'); container.innerHTML = "";
            const dInfo = GLOBAL_DATA.allDays[dayId];
            const now = getLocalDateString();
            const userPred = GLOBAL_DATA.userPredictions.find(p => p.dayId === dayId);
            const isPast = dInfo.date < now;
            
            let realResultsArray = [];
            if (dInfo.results) {
                let cleanStr = dInfo.results.toString().replace(/["'\s]/g, ''); 
                if (cleanStr.includes('|')) realResultsArray = cleanStr.split('|');
                else if (cleanStr.includes(',')) realResultsArray = cleanStr.split(',');
                else realResultsArray = [cleanStr];
                realResultsArray = realResultsArray.map(res => res.trim().toLowerCase());
            }
            
            container.innerHTML = `<div style="text-align:center; margin-bottom:10px;"><span style="font-size:10px; color:var(--primary);">${dInfo.date} • ${dInfo.pointsPerGame} PTS</span></div>`;
            dInfo.matches.forEach((game, i) => {
                const teams = game.split(' vs '); let opts = "";
                let targetRes = realResultsArray[i] || null;
                const realResRaw = (targetRes && ["1", "x", "2"].includes(targetRes)) ? targetRes : null;

                ['1', 'X', '2'].forEach(opt => {
                    let cls = "opt-btn";
                    const myPick = userPred ? userPred.answers[i] : null;
                    let myPickLower = myPick ? myPick.toString().toLowerCase().trim() : null;
                    let optLower = opt.toString().toLowerCase().trim();

                    if (realResRaw) {
                        if (optLower === realResRaw) { 
                            if (myPickLower === realResRaw) cls += " res-correct"; 
                            else cls += " res-actual"; 
                        }
                        else if (optLower === myPickLower) cls += " res-wrong"; 
                    } else if (myPickLower === optLower || TEMP_ANSWERS[i] === opt) cls += " selected";
                    
                    opts += `<button class="${cls}" ${(userPred || isPast) ? 'disabled' : `onclick="pick(this, ${i}, '${opt}')"`}>${opt}</button>`;
                });

                let leftImgId = `flag-L-${dayId}-${i}`;
                let rightImgId = `flag-R-${dayId}-${i}`;

                let leftFlag = getFlagHtml(teams[0], leftImgId);
                let rightFlag = getFlagHtml(teams[1], rightImgId);

                container.innerHTML += `
                    <div class="game-card">
                        <div class="match-display">
                            <div class="team-home">
                                ${leftFlag}
                                <div class="team-name">${teams[0]}</div>
                            </div>
                            <div class="vs-container">
                                <div class="vs-divider">VS</div>
                            </div>
                            <div class="team-away">
                                <div class="team-name">${teams[1]}</div>
                                ${rightFlag}
                            </div>
                        </div>
                        <div class="options-grid">${opts}</div>
                    </div>`;
            });
            document.getElementById('save-btn').classList.toggle('hidden', userPred || isPast);
        }

        function pick(btn, idx, val) { btn.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected')); btn.classList.add('selected'); TEMP_ANSWERS[idx] = val; }

        async function saveCurrentDay() {
            if(Object.keys(TEMP_ANSWERS).length < GLOBAL_DATA.allDays[SELECTED_DAY].matches.length) return showToast("Pick all matches!");
            try {
                const res = await fetch(`${BASE_URL}/save-prediction`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: localStorage.getItem('wc_user'), dayId: SELECTED_DAY, answers: TEMP_ANSWERS}) }).then(r => r.json());
                if(res.success) { showToast("Saved!", false); GLOBAL_DATA.userPredictions.push({dayId: SELECTED_DAY, answers: {...TEMP_ANSWERS}}); selectDay(SELECTED_DAY); }
            } catch(e) { showToast("Error"); }
        }

        async function loadLB() {
            try {
                const res = await fetch(`${BASE_URL}/leaderboard`).then(r => r.json());
                const container = document.getElementById('lb-data');
                const cUser = (localStorage.getItem('wc_user') || "").toLowerCase().trim();
                container.innerHTML = res.topData.map(u => {
                    const isMe = u.u.toLowerCase().trim() === cUser;
                    let disp = isMe ? u.u : (u.u.length > 2 ? u.u[0] + "***" + u.u[u.u.length - 1] : u.u[0] + "*");
                    return `<tr class="lb-row ${isMe ? 'my-row-highlight' : ''}"><td>${u.rank}</td><td style="text-align:left; padding-left:15px;">${disp}</td><td style="color:var(--accent-gold); font-weight:700;">${u.p}</td><td>${{1:"1000€",2:"500€",3:"200€"}[u.rank] || "-"}</td></tr>`;
                }).join('');
            } catch(e) {}
        }

        function logout() { localStorage.clear(); location.reload(); }
        window.onload = () => { if(localStorage.getItem('wc_user')) startGame(true); else loadLB(); };
    </script>
</body>
</html>
