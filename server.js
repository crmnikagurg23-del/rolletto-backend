<script>
        const BASE_URL = 'https://rolletto-backend-1.onrender.com/api';
        let GLOBAL_DATA = {}; let SELECTED_DAY = ""; let TEMP_ANSWERS = {};

        function showToast(m, isErr = true) { 
            const t = document.getElementById('toast'); 
            t.innerText = m; 
            t.style.background = isErr ? '#ff4d4d' : '#00ffcc'; 
            t.style.color = isErr ? '#fff' : '#061218'; 
            t.style.display = 'block'; 
            setTimeout(() => t.style.display = 'none', 3000); 
        }

        // მთავარი ფუნქცია, რომელიც ამოწმებს იუზერს
        async function startGame(isAuto = false) {
            const userField = document.getElementById('username').value.trim();
            const passField = document.getElementById('password').value.trim();
            
            const user = isAuto ? localStorage.getItem('wc_user') : userField;
            const pass = isAuto ? localStorage.getItem('wc_pass') : passField;

            if(!user || !pass) return;

            if(!isAuto) document.getElementById('btn-loader').style.display = "block";
            
            try {
                const res = await fetch(`${BASE_URL}/check-user`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'}, 
                    body: JSON.stringify({user, password: pass}) 
                }).then(r => r.json());

                if(res.success) {
                    localStorage.setItem('wc_user', user); 
                    localStorage.setItem('wc_pass', pass);
                    GLOBAL_DATA = res;
                    
                    document.getElementById('my-rank').innerText = `#${res.userRank}`;
                    document.getElementById('my-score').innerText = res.userScore;
                    document.getElementById('start-section').style.display = 'none';
                    document.getElementById('game-section').style.display = 'block';
                    document.getElementById('my-status').style.display = 'block';
                    
                    renderTabs(); 
                    loadLB();
                } else { 
                    if(!isAuto) showToast(res.message); 
                    else logout(); // თუ ავტომატური შესვლა ჩავარდა, გაასუფთავოს მონაცემები
                }
            } catch(e) { 
                if(!isAuto) showToast("Server Connection Error"); 
            }
            document.getElementById('btn-loader').style.display = "none";
        }

        function renderTabs() {
            const container = document.getElementById('day-tabs'); 
            container.innerHTML = "";
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
            SELECTED_DAY = dayId; 
            renderTabs();
            const container = document.getElementById('games-container'); 
            container.innerHTML = "";
            const dInfo = GLOBAL_DATA.allDays[dayId];
            const now = new Date().toISOString().split('T')[0];
            const userPred = GLOBAL_DATA.userPredictions.find(p => p.dayId === dayId);
            const isPast = dInfo.date < now;
            TEMP_ANSWERS = {};

            container.innerHTML = `<div style="text-align:center; margin-bottom:10px;"><span style="font-size:10px; color:var(--primary);">${dInfo.date} • ${dInfo.pointsPerGame} PTS</span></div>`;
            dInfo.matches.forEach((game, i) => {
                const teams = game.split(' vs '); 
                let opts = "";
                ['1', 'X', '2'].forEach(opt => {
                    let cls = "opt-btn";
                    if (userPred && userPred.answers[i] === opt) cls += " selected";
                    else if (TEMP_ANSWERS[i] === opt) cls += " selected";
                    opts += `<button class="${cls}" ${(userPred || isPast) ? 'disabled' : `onclick="pick(this, ${i}, '${opt}')"`}>${opt}</button>`;
                });
                container.innerHTML += `<div class="game-card"><div class="match-display"><div class="team-name">${teams[0]}</div><div class="vs-divider">VS</div><div class="team-name">${teams[1]}</div></div><div class="options-grid">${opts}</div></div>`;
            });
            document.getElementById('save-btn').style.display = (!userPred && !isPast) ? 'block' : 'none';
        }

        function pick(btn, idx, val) { 
            btn.parentElement.querySelectorAll('.opt-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected'); 
            TEMP_ANSWERS[idx] = val; 
        }

        async function saveCurrentDay() {
            if(Object.keys(TEMP_ANSWERS).length < GLOBAL_DATA.allDays[SELECTED_DAY].matches.length) return showToast("Pick all matches!");
            document.getElementById('save-loader').style.display = "block";
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
            document.getElementById('save-loader').style.display = "none";
        }

        async function loadLB() {
            try {
                const res = await fetch(`${BASE_URL}/leaderboard`).then(r => r.json());
                const container = document.getElementById('lb-data');
                const cUser = (localStorage.getItem('wc_user') || "").toLowerCase().trim();
                
                container.innerHTML = res.topData.map(u => {
                    const isMe = u.u.toLowerCase().trim() === cUser;
                    let displayUsername = u.u;
                    if (!isMe && u.u.length > 2) {
                        displayUsername = u.u[0] + "***" + u.u[u.u.length - 1];
                    } else if (!isMe) {
                        displayUsername = u.u[0] + "*";
                    }

                    return `<tr class="lb-row ${isMe ? 'my-row-highlight' : ''}">
                        <td>${u.rank}</td>
                        <td style="text-align:left; padding-left:15px;">${displayUsername}</td>
                        <td style="color:var(--accent-gold); font-weight:700;">${u.p}</td>
                        <td>${{1:"1000€",2:"500€",3:"200€"}[u.rank] || "-"}</td>
                    </tr>`;
                }).join('');
            } catch(e) {}
        }

        function logout() { 
            localStorage.clear(); 
            location.reload(); 
        }

        // რეფრეშის დროს ავტომატური შემოწმება
        window.onload = () => { 
            if(localStorage.getItem('wc_user')) {
                startGame(true); // true ნიშნავს ავტომატურ რეჟიმს
            } else {
                loadLB(); 
            }
        };
    </script>
