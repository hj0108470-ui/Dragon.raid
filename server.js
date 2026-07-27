const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// CORS 및 Socket.IO 설정
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 🐉 보스 데이터 (4종)
const BOSS_TYPES = [
    { name: '🐷 꿀신', maxHp: 12000, spawnChance: 0.40 },
    { name: '🗿 골리앗', maxHp: 17000, spawnChance: 0.30 },
    { name: '🦖 이라소', maxHp: 50000, spawnChance: 0.20 },
    { name: '🐉 드래곤', maxHp: 100000, spawnChance: 0.10 }
];

// ⚔️ 무기 데이터 (20종 + 히든 1종)
const WEAPON_DB = {
    knife_common: { name: '녹슨 도살도', type: 'knife', rarity: 'Common', atk: 15, sellPrice: 50, icon: '🔪' },
    knife_rare: { name: '혈각의 서사도', type: 'knife', rarity: 'Rare', atk: 45, sellPrice: 250, icon: '🗡️' },
    knife_epic: { name: '흑염의 사도검', type: 'knife', rarity: 'Epic', atk: 120, sellPrice: 2500, icon: '🗡️🔥' },
    knife_legendary: { name: '피빛의 소울리퍼', type: 'knife', rarity: 'Legendary', atk: 380, sellPrice: 10000, icon: '⚔️🩸' },
    knife_mythic: { name: '심연의 핏빛 멸살검', type: 'knife', rarity: 'Mythic', atk: 1500, sellPrice: 100000, icon: '🗡️💀' },

    bow_common: { name: '사냥꾼의 목궁', type: 'bow', rarity: 'Common', atk: 12, sellPrice: 50, icon: '🏹' },
    bow_rare: { name: '바람의 강철궁', type: 'bow', rarity: 'Rare', atk: 35, sellPrice: 250, icon: '🏹✨' },
    bow_epic: { name: '천둥의 질풍궁', type: 'bow', rarity: 'Epic', atk: 95, sellPrice: 2500, icon: '🏹⚡' },
    bow_legendary: { name: '태양의 용익궁', type: 'bow', rarity: 'Legendary', atk: 320, sellPrice: 10000, icon: '🏹☀️' },
    bow_mythic: { name: '은하의 별빛 멸망궁', type: 'bow', rarity: 'Mythic', atk: 1250, sellPrice: 100000, icon: '🏹🌌' },

    shield_common: { name: '나무 냄비뚜껑', type: 'shield', rarity: 'Common', atk: 8, sellPrice: 50, icon: '🛡️' },
    shield_rare: { name: '수호자의 가디언 실드', type: 'shield', rarity: 'Rare', atk: 25, sellPrice: 250, icon: '🛡️✨' },
    shield_epic: { name: '불멸의 가고일 방패', type: 'shield', rarity: 'Epic', atk: 70, sellPrice: 2500, icon: '🛡️🗿' },
    shield_legendary: { name: '성기사의 천상 실드', type: 'shield', rarity: 'Legendary', atk: 220, sellPrice: 10000, icon: '🛡️👑' },
    shield_mythic: { name: '신성한 절대자의 결계', type: 'shield', rarity: 'Mythic', atk: 900, sellPrice: 100000, icon: '🛡️❇️' },

    heal_common: { name: '약초꾼의 지팡이', type: 'heal', rarity: 'Common', atk: 5, sellPrice: 50, icon: '❇️' },
    heal_rare: { name: '은빛 구원자의 지팡이', type: 'heal', rarity: 'Rare', atk: 20, sellPrice: 250, icon: '❇️✨' },
    heal_epic: { name: '생명의 요정 스태프', type: 'heal', rarity: 'Epic', atk: 50, sellPrice: 2500, icon: '❇️🌿' },
    heal_legendary: { name: '대사제의 대천사 스태프', type: 'heal', rarity: 'Legendary', atk: 160, sellPrice: 10000, icon: '❇️👼' },
    heal_mythic: { name: '세계수의 영원한 생명가지', type: 'heal', rarity: 'Mythic', atk: 700, sellPrice: 100000, icon: '❇️🌳' },

    hidden_hong: { name: '홍인준의 뱃살 방패', type: 'shield_special', rarity: 'Mythic', atk: 1600, sellPrice: 100000, icon: '🐷🛡️' }
};

const COUPONS = {
    'WCDI26070123': { type: 'gold', reward: 1000 },
    'HGDAI4860146': { type: 'gold', reward: 1300 },
    'Fiwndq9': { type: 'weapon', reward: 'hidden_hong' }
};

function getRandomBoss() {
    const rand = Math.random();
    let cumulative = 0;
    for (const boss of BOSS_TYPES) {
        cumulative += boss.spawnChance;
        if (rand <= cumulative) return { ...boss, currentHp: boss.maxHp };
    }
    return { ...BOSS_TYPES[0], currentHp: BOSS_TYPES[0].maxHp };
}

function getRandomWeaponKey() {
    const rand = Math.random();
    let rarity = 'Common';
    if (rand < 0.001) rarity = 'Mythic';
    else if (rand < 0.020) rarity = 'Legendary';
    else if (rand < 0.100) rarity = 'Epic';
    else if (rand < 0.300) rarity = 'Rare';
    else rarity = 'Common';

    const types = ['knife', 'bow', 'shield', 'heal'];
    return `${types[Math.floor(Math.random() * types.length)]}_${rarity.toLowerCase()}`;
}

let gameState = { boss: getRandomBoss(), players: {} };

// 🎮 1. 메인 플레이 화면
app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>보스 레이드 RPG</title>
        <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
        <style>
            body { font-family: sans-serif; background: #111; color: #fff; text-align: center; margin: 0; padding: 15px; }
            .container { max-width: 600px; margin: 0 auto; }
            .boss-card, .player-card, .gacha-card { background: #222; border-radius: 12px; padding: 15px; margin-bottom: 15px; border: 1px solid #444; }
            .hp-bar-bg { background: #444; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0; }
            .hp-bar-fill { background: #e74c3c; height: 100%; width: 100%; transition: width 0.2s; }
            .btn { background: #e67e22; border: none; padding: 12px 20px; color: #fff; font-size: 16px; border-radius: 8px; cursor: pointer; font-weight: bold; width: 100%; }
            .btn-gacha { background: linear-gradient(135deg, #8e44ad, #2980b9); margin-top: 5px; }
            .inventory-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; margin-top: 10px; }
            .slot { background: #333; border: 1px solid #555; height: 50px; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 10px; cursor: pointer; }
            .slot.equipped { border-color: #f1c40f; background: #443c11; }
            .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); justify-content: center; align-items: center; }
            .modal-content { background: #222; padding: 20px; border-radius: 12px; width: 280px; border: 1px solid #777; }
            input { padding: 8px; border-radius: 4px; border: 1px solid #555; background: #333; color: #fff; width: 60%; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="boss-card">
                <h2 id="bossName">서버 연결 중...</h2>
                <div class="hp-bar-bg"><div id="bossHpFill" class="hp-bar-fill"></div></div>
                <p id="bossHpText">0 / 0</p>
                <button class="btn" onclick="attack()">⚔️ 공격하기</button>
            </div>
            
            <div class="gacha-card">
                <h3>🎰 무기 상점 (뽑기)</h3>
                <p>💰 1,000 G 로 무기를 소환합니다!</p>
                <button class="btn btn-gacha" onclick="gacha()">🎲 무기 뽑기 (1,000G)</button>
            </div>

            <div class="player-card">
                <h3>내 정보</h3>
                <p>HP: ❤️<span id="myHp">100</span>/100 | 골드: 💰<span id="myGold">0</span> G</p>
                <div>
                    <input type="text" id="couponInput" placeholder="쿠폰 입력">
                    <button style="padding:8px;" onclick="useCoupon()">사용</button>
                </div>
            </div>

            <div class="player-card">
                <h3>📦 무기고 (36칸)</h3>
                <div class="inventory-grid" id="inventoryGrid"></div>
            </div>
        </div>

        <div id="fullModal" class="modal">
            <div class="modal-content">
                <h3 style="color:#e74c3c;">⚠️ 무기고 가득 참!</h3>
                <p id="dropItemText"></p>
                <button class="btn" onclick="closeModal()">확인</button>
            </div>
        </div>

        <script>
            const socket = io();
            let myId = null;

            socket.on('connect', () => { myId = socket.id; });

            socket.on('updateState', (state) => {
                if (!state || !state.boss) return;
                
                document.getElementById('bossName').innerText = state.boss.name;
                const bossHpPct = (state.boss.currentHp / state.boss.maxHp) * 100;
                document.getElementById('bossHpFill').style.width = Math.max(0, bossHpPct) + '%';
                document.getElementById('bossHpText').innerText = Math.max(0, state.boss.currentHp) + ' / ' + state.boss.maxHp;
                
                const me = state.players[myId];
                if (me) {
                    document.getElementById('myHp').innerText = me.hp;
                    document.getElementById('myGold').innerText = me.gold;
                    const grid = document.getElementById('inventoryGrid');
                    grid.innerHTML = '';
                    for (let i = 0; i < 36; i++) {
                        const slot = document.createElement('div');
                        slot.className = 'slot';
                        const item = me.inventory[i];
                        if (item) {
                            if (me.equippedIndex === i) slot.classList.add('equipped');
                            slot.innerHTML = '<div>' + item.icon + ' +' + (item.enhance||0) + '</div>';
                            slot.onclick = () => showItemMenu(i, item);
                        } else { slot.innerText = '빈'; }
                        grid.appendChild(slot);
                    }
                }
            });

            function attack() { socket.emit('attack'); }
            function gacha() { socket.emit('drawGacha'); }
            function useCoupon() {
                const code = document.getElementById('couponInput').value.trim();
                if (code) socket.emit('useCoupon', code);
            }
            
            socket.on('couponResult', (res) => alert(res.message));
            socket.on('gachaResult', (res) => {
                if (!res.success) alert(res.message);
                else alert('🎉 [뽑기 성공!] ' + res.weapon.icon + ' [' + res.weapon.rarity + '] ' + res.weapon.name + ' 획득!');
            });
            socket.on('itemObtained', (data) => {
                if (data.full) {
                    document.getElementById('dropItemText').innerText = '획득: ' + data.weapon.icon + ' ' + data.weapon.name;
                    document.getElementById('fullModal').style.display = 'flex';
                } else { alert('🎉 [' + data.weapon.rarity + '] ' + data.weapon.name + ' 획득!'); }
            });
            
            function closeModal() { document.getElementById('fullModal').style.display = 'none'; }
            function showItemMenu(index, item) {
                const act = prompt('[' + item.name + ' +' + (item.enhance||0) + ']\n1: 장착/해제 | 2: 강화 (' + ((item.enhance+1)*500) + 'G) | 3: 판매 (' + item.sellPrice + 'G)');
                if (act === '1') socket.emit('equipItem', index);
                if (act === '2') socket.emit('enhanceItem', index);
                if (act === '3') socket.emit('sellItem', index);
            }
        </script>
    </body>
    </html>
    `);
});

// 👑 2. GM 관리자 페이지
app.get('/admin', (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
    <!DOCTYPE html>
    <html lang="ko">
    <head>
        <meta charset="UTF-8">
        <title>👑 GM 대시보드</title>
        <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
        <style>
            body { font-family: sans-serif; background: #0b0c10; color: #66fcf1; padding: 15px; }
            .btn-gm { background: #45a29e; border: none; color: #fff; padding: 8px 12px; margin: 3px; border-radius: 5px; cursor: pointer; }
            .btn-danger { background: #c0392b; }
            .btn-gold { background: #f39c12; color: #000; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; color: #fff; }
            th, td { border: 1px solid #45a29e; padding: 8px; text-align: center; font-size: 12px; }
        </style>
    </head>
    <body>
        <h2>👑 GM 관제 센터</h2>
        <div style="background:#1f2833; padding:15px; border-radius:8px; margin-bottom:15px;">
            <h3>보스 직접 조작</h3>
            <p>현재: <strong id="bossStatus">-</strong></p>
            <button class="btn-gm" onclick="spawnBoss('pig')">🐷 꿀신</button>
            <button class="btn-gm" onclick="spawnBoss('goliath')">🗿 골리앗</button>
            <button class="btn-gm" onclick="spawnBoss('iraso')">🦖 이라소</button>
            <button class="btn-gm" onclick="spawnBoss('dragon')">🐉 드래곤</button>
            <button class="btn-gm btn-danger" onclick="killBoss()">💥 보스 즉사</button>
        </div>
        <div style="background:#1f2833; padding:15px; border-radius:8px;">
            <h3>접속 유저 관리</h3>
            <table>
                <thead><tr><th>ID</th><th>HP</th><th>골드</th><th>인벤</th><th>개입</th></tr></thead>
                <tbody id="playerTable"></tbody>
            </table>
        </div>
        <script>
            const socket = io();
            socket.on('updateState', (state) => {
                if(!state || !state.boss) return;
                document.getElementById('bossStatus').innerText = state.boss.name + ' [' + state.boss.currentHp + '/' + state.boss.maxHp + ']';
                const tbody = document.getElementById('playerTable');
                tbody.innerHTML = '';
                Object.values(state.players).forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = '<td>' + p.id.substring(0, 5) + '</td>' +
                        '<td>' + p.hp + '</td>' +
                        '<td>' + p.gold + 'G</td>' +
                        '<td>' + p.inventory.length + '/36</td>' +
                        '<td>' +
                            '<button class="btn-gm btn-gold" onclick="giveGold(\'' + p.id + '\')">+10kG</button>' +
                            '<button class="btn-gm" onclick="giveMythic(\'' + p.id + '\')">신화무기</button>' +
                            '<button class="btn-gm btn-danger" onclick="punish(\'' + p.id + '\')">HP 1</button>' +
                        '</td>';
                    tbody.appendChild(tr);
                });
            });
            function spawnBoss(type) { socket.emit('adminAction', { action: 'spawnBoss', payload: type }); }
            function killBoss() { socket.emit('adminAction', { action: 'killBoss' }); }
            function giveGold(id) { socket.emit('adminAction', { action: 'giveGold', payload: { targetId: id, amount: 10000 } }); }
            function giveMythic(id) { socket.emit('adminAction', { action: 'giveMythic', payload: { targetId: id } }); }
            function punish(id) { socket.emit('adminAction', { action: 'punish', payload: { targetId: id } }); }
        </script>
    </body>
    </html>
    `);
});

// 소켓 서버 통신 로직
io.on('connection', (socket) => {
    gameState.players[socket.id] = {
        id: socket.id,
        name: `유저_${socket.id.substring(0, 4)}`,
        hp: 100,
        maxHp: 100,
        gold: 0,
        inventory: [],
        equippedIndex: null,
        usedCoupons: []
    };

    io.emit('updateState', gameState);

    socket.on('drawGacha', () => {
        const player = gameState.players[socket.id];
        if (!player) return;

        const GACHA_COST = 1000;
        if (player.gold < GACHA_COST) {
            return socket.emit('gachaResult', { success: false, message: '💰 골드가 부족합니다! (필요: 1,000 G)' });
        }
        if (player.inventory.length >= 36) {
            return socket.emit('gachaResult', { success: false, message: '📦 무기고가 가득 찼습니다! (최대 36칸)' });
        }

        player.gold -= GACHA_COST;
        const rewardKey = getRandomWeaponKey();
        const rewardWeapon = { ...WEAPON_DB[rewardKey], id: Date.now(), enhance: 0 };
        
        player.inventory.push(rewardWeapon);
        socket.emit('gachaResult', { success: true, weapon: rewardWeapon });
        io.emit('updateState', gameState);
    });

    socket.on('attack', () => {
        const player = gameState.players[socket.id];
        if (!player || player.hp <= 0) return;

        let equippedWeapon = player.equippedIndex !== null ? player.inventory[player.equippedIndex] : null;
        let baseAtk = equippedWeapon ? (equippedWeapon.atk * (1 + (equippedWeapon.enhance || 0) * 0.5)) : 10;
        let finalDamage = baseAtk;

        if (equippedWeapon) {
            switch (equippedWeapon.type) {
                case 'knife': if (Math.random() < 0.5) player.hp = Math.max(1, player.hp - 3); break;
                case 'bow': if (Math.random() < 0.3) finalDamage *= 2; break;
                case 'shield': if (Math.random() < 0.25) player.hp = Math.min(player.maxHp, player.hp + 5); break;
                case 'shield_special': if (Math.random() < 0.01) player.hp = Math.max(1, player.hp - Math.ceil(player.hp * 0.03)); break;
                case 'heal':
                    const keys = Object.keys(gameState.players);
                    const target = keys[Math.floor(Math.random() * keys.length)];
                    if (gameState.players[target]) gameState.players[target].hp = Math.min(gameState.players[target].maxHp, gameState.players[target].hp + 50);
                    break;
            }
        }

        gameState.boss.currentHp -= Math.round(finalDamage);
        player.gold += 10;

        if (gameState.boss.currentHp <= 0) {
            const rewardKey = getRandomWeaponKey();
            const rewardWeapon = { ...WEAPON_DB[rewardKey], id: Date.now(), enhance: 0 };

            if (player.inventory.length < 36) {
                player.inventory.push(rewardWeapon);
                socket.emit('itemObtained', { weapon: rewardWeapon, full: false });
            } else {
                socket.emit('itemObtained', { weapon: rewardWeapon, full: true });
            }
            gameState.boss = getRandomBoss();
        }
        io.emit('updateState', gameState);
    });

    socket.on('useCoupon', (code) => {
        const player = gameState.players[socket.id];
        if (!player || player.usedCoupons.includes(code)) {
            return socket.emit('couponResult', { success: false, message: '유효하지 않거나 이미 사용한 쿠폰입니다.' });
        }

        const coupon = COUPONS[code];
        if (!coupon) return socket.emit('couponResult', { success: false, message: '잘못된 쿠폰 코드입니다.' });

        player.usedCoupons.push(code);
        if (coupon.type === 'gold') {
            player.gold += coupon.reward;
            socket.emit('couponResult', { success: true, message: `${coupon.reward} Gold 획득!` });
        } else if (coupon.type === 'weapon') {
            const rewardWeapon = { ...WEAPON_DB[coupon.reward], id: Date.now(), enhance: 0 };
            if (player.inventory.length < 36) {
                player.inventory.push(rewardWeapon);
                socket.emit('couponResult', { success: true, message: `특별 무기 [${rewardWeapon.name}] 획득!` });
            }
        }
        io.emit('updateState', gameState);
    });

    socket.on('equipItem', (idx) => {
        const p = gameState.players[socket.id];
        if (p && p.inventory[idx]) { p.equippedIndex = p.equippedIndex === idx ? null : idx; io.emit('updateState', gameState); }
    });

    socket.on('sellItem', (idx) => {
        const p = gameState.players[socket.id];
        if (p && p.inventory[idx]) {
            const sold = p.inventory.splice(idx, 1)[0];
            p.gold += sold.sellPrice;
            if (p.equippedIndex === idx) p.equippedIndex = null;
            else if (p.equippedIndex > idx) p.equippedIndex--;
            io.emit('updateState', gameState);
        }
    });

    socket.on('enhanceItem', (idx) => {
        const p = gameState.players[socket.id];
        if (p && p.inventory[idx]) {
            const item = p.inventory[idx];
            const cost = (item.enhance + 1) * 500;
            if (p.gold >= cost) {
                p.gold -= cost;
                item.enhance = (item.enhance || 0) + 1;
                io.emit('updateState', gameState);
            }
        }
    });

    socket.on('adminAction', (data) => {
        const { action, payload } = data;
        if (action === 'spawnBoss') {
            const bossMap = {
                'pig': { name: '🐷 꿀신', maxHp: 12000, currentHp: 12000 },
                'goliath': { name: '🗿 골리앗', maxHp: 17000, currentHp: 17000 },
                'iraso': { name: '🦖 이라소', maxHp: 50000, currentHp: 50000 },
                'dragon': { name: '🐉 드래곤', maxHp: 100000, currentHp: 100000 }
            };
            if (bossMap[payload]) gameState.boss = bossMap[payload];
        }
        if (action === 'killBoss') gameState.boss.currentHp = 0;
        if (action === 'giveGold') { const t = gameState.players[payload.targetId]; if (t) t.gold += payload.amount; }
        if (action === 'giveMythic') {
            const t = gameState.players[payload.targetId];
            if (t && t.inventory.length < 36) t.inventory.push({ ...WEAPON_DB.knife_mythic, id: Date.now(), enhance: 0 });
        }
        if (action === 'punish') { const t = gameState.players[payload.targetId]; if (t) t.hp = 1; }
        io.emit('updateState', gameState);
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 서버 정상 가동 중 (포트: ${PORT})`));
