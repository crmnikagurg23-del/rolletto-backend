<script>
        const BASE_URL = 'https://rolletto-backend-1.onrender.com/api';
        let GLOBAL_DATA = {}; let SELECTED_DAY = ""; let TEMP_ANSWERS = {};

        function showToast(m, isErr = true) { 
            const t = document.getElementById('toast'); t.innerText = m; 
            t.style.background = isErr ? '#ff4d4d' : '#00ffcc'; t.style.color = isErr ? '#fff' : '#061218'; 
            t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 4000); 
        }

        function toggleAuth(view) {
            document.getElementById('login-section').classList.toggle('hidden', view !== 'login');
            document.getElementById('signup-section').classList.toggle('hidden', view !== 'signup');
        }

        // ენთერზე დაჭერის ლოგიკა
        document.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                const isLoginVisible = !document.getElementById('login-section').classList.contains('hidden');
                const isSignupVisible = !document.getElementById('signup-section').classList.contains('hidden');
                
                if (isLoginVisible) startGame(false, 'login');
                else if (isSignupVisible) startGame(false, 'signup');
            }
        });

        async function startGame(isAuto = false, type = 'login') {
            const u = isAuto ? localStorage.getItem('wc_user') : (type === 'login' ? document.getElementById('username').value.trim() : document.getElementById('reg-username').value.trim());
            const p = isAuto ? localStorage.getItem('wc_pass') : (type === 'login' ? document.getElementById('password').value.trim() : document.getElementById('reg-password').value.trim());
            
            if(!u || !p) return;

            const endpoint = isAuto ? 'login' : type;
            
            // ვიზუალური ეფექტების ჩართვა
            const btnId = type === 'login' ? 'login-btn' : 'reg-btn';
            const textId = type === 'login' ? 'btn-text' : 'reg-btn-text';
            const loaderId = type === 'login' ? 'btn-loader' : 'reg-btn-loader';

            if(!isAuto) {
                document.getElementById(btnId).disabled = true;
                document.getElementById(textId).classList.add('hidden');
                document.getElementById(loaderId).style.display = "block";
            }

            try {
                const res = await fetch(`${BASE_URL}/${endpoint}`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({user: u, password: p}) 
                }).then(r => r.json());

                if(res.success) {
                    localStorage.setItem('wc_user', u); localStorage.setItem('wc_pass', p);
                    GLOBAL_DATA = res;
                    document.getElementById('my-rank').innerText = `#${res.userRank}`;
                    document.getElementById('my-score').innerText = res.userScore;
                    document.getElementById('login-section').classList.add('hidden');
                    document.getElementById('signup-section').classList.add('hidden');
                    document.getElementById('game-section').classList.remove('hidden');
                    document.getElementById('my-status').style.display = 'block';
                    renderTabs(); loadLB();
                } else {
                    showToast(res.message);
                    if(isAuto) logout();
                }
            } catch(e) { 
                if(!isAuto) showToast("Connection Error"); 
            } finally {
                // ვიზუალური ეფექტების გამორთვა
                if(!isAuto) {
                    document.getElementById(btnId).disabled = false;
                    document.getElementById(textId).classList.remove('hidden');
                    document.getElementById(loaderId).style.display = "none";
                }
            }
        }

        // --- დანარჩენი ფუნქციები (renderTabs, selectDay, saveCurrentDay, loadLB, logout) უცვლელია ---

        function renderTabs() {
            const container = document.getElementById('day-tabs'); container.innerHTML = "";
            const now = new Date().toISOString().split('T')[0];
            const days = Object.keys(GLOBAL_DATA.allDays).sort((a,b) => a-b);
            const visibleDays = days.filter(id => GLOBAL_DATA.allDays[id].date <= now);
            visibleDays.forEach(dayId => {
                const btn = document.createElement('div');
                btn.className = 'day-tab' + (SELECTED_DAY === dayId ? ' active' : '');
                btn.innerText = (GLOBAL_DATA.allDays[dayId].date === now) ? "TODAY" : GLOBAL_DATA.allDays[dayId].title;
                btn.onclick = () => selectDay(dayId);
                container.appendChild(btn);
            });
            if(!SELECTED_DAY && visibleDays.length > 0) selectDay(visibleDays[visibleDays.length-1]);
        }

        function selectDay(dayId) {
            SELECTED_DAY = dayId; renderTabs();
            const container = document.getElementById('games-container'); container.innerHTML = "";
            const dInfo = GLOBAL_DATA.allDays[dayId];
            const now = new Date().toISOString().split('T')[0];
            const userPred = GLOBAL_DATA.userPredictions.find(p => p.dayId === dayId);
            const isPast = dInfo.date < now;
            const realResults = dInfo.results || [];
            TEMP_ANSWERS = {};

            container.innerHTML = `<div style="text-align:center; margin-bottom:10px;"><span style="font-size:10px; color:var(--primary);">${dInfo.date} • ${dInfo.pointsPerGame} PTS</span></div>`;
            dInfo.matches.forEach((game, i) => {
                const teams = game.split(' vs '); let opts = "";
                const realRes = (realResults[i] && realResults[i].trim() !== "") ? realResults[i].trim() : null;
                ['1', 'X', '2'].forEach(opt => {
                    let cls = "opt-btn";
                    const myPick = userPred ? userPred.answers[i] : null;
                    if (realRes) {
                        if (opt === realRes) { cls += " res-actual"; if (myPick === realRes) cls += " res-correct"; }
                        else if (opt === myPick) cls += " res-wrong";
                    } else if (myPick === opt || TEMP_ANSWERS[i] === opt) cls += " selected";
                    opts += `<button class="${cls}" ${(userPred || isPast) ? 'disabled' : `onclick="pick(this, ${i}, '${opt}')"`}>${opt}</button>`;
                });
                container.innerHTML += `<div class="game-card"><div class="match-display"><div class="team-name">${teams[0]}</div><div class="vs-divider">VS</div><div class="team-name">${teams[1]}</div></div><div class="options-grid">${opts}</div></div>`;
            });
            document.getElementById('save-btn').classList.toggle('hidden', userPred || isPast);
        }

        function pick(btn, idx, val) { 
            btn.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected'); TEMP_ANSWERS[idx] = val; 
        }

        async function saveCurrentDay() {
            if(Object.keys(TEMP_ANSWERS).length < GLOBAL_DATA.allDays[SELECTED_DAY].matches.length) return showToast("Pick all 10 matches!");
            const saveLdr = document.getElementById('save-loader');
            const saveTxt = document.getElementById('save-text');
            saveLdr.style.display = "block";
            saveTxt.classList.add('hidden');
            
            try {
                const res = await fetch(`${BASE_URL}/save-prediction`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({username: localStorage.getItem('wc_user'), dayId: SELECTED_DAY, answers: TEMP_ANSWERS}) 
                }).then(r => r.json());
                
                if(res.success) { 
                    showToast("Saved!", false); 
                    GLOBAL_DATA.userPredictions.push({dayId: SELECTED_DAY, answers: {...TEMP_ANSWERS}}); 
                    selectDay(SELECTED_DAY); 
                }
            } catch(e) { showToast("Error"); }
            saveLdr.style.display = "none";
            saveTxt.classList.remove('hidden');
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
