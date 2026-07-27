const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// 🐉 보스 데이터 정의 (4종)
const BOSS_TYPES = [
    { name: '🐷 꿀신', maxHp: 12000, spawnChance: 0.40 },
    { name: '🗿 골리앗', maxHp: 17000, spawnChance: 0.30 },
    { name: '🦖 이라소', maxHp: 50000, spawnChance: 0.20 },
    { name: '🐉 드래곤', maxHp: 100000, spawnChance: 0.10 }
];

// ⚔️ 무기 데이터베이스 (신규 20종 + 히든 1종)
const WEAPON_DB = {
    // 🔪 칼
    knife_common: { name: '녹슨 도살도', type: 'knife', rarity: 'Common', atk: 15, sellPrice: 50, icon: '🔪' },
    knife_rare: { name: '혈각의 서사도', type: 'knife', rarity: 'Rare', atk: 45, sellPrice: 250, icon: '🗡️' },
    knife_epic: { name: '흑염의 사도검', type: 'knife', rarity: 'Epic', atk: 120, sellPrice: 2500, icon: '🗡️🔥' },
    knife_legendary: { name: '피빛의 소울리퍼', type: 'knife', rarity: 'Legendary', atk: 380, sellPrice: 10000, icon: '⚔️🩸' },
    knife_mythic: { name: '심연의 핏빛 멸살검', type: 'knife', rarity: 'Mythic', atk: 1500, sellPrice: 100000, icon: '🗡️💀' },

    // 🏹 활
    bow_common: { name: '사냥꾼의 목궁', type: 'bow', rarity: 'Common', atk: 12, sellPrice: 50, icon: '🏹' },
    bow_rare: { name: '바람의 강철궁', type: 'bow', rarity: 'Rare', atk: 35, sellPrice: 250, icon: '🏹✨' },
    bow_epic: { name: '천둥의 질풍궁', type: 'bow', rarity: 'Epic', atk: 95, sellPrice: 2500, icon: '🏹⚡' },
    bow_legendary: { name: '태양의 용익궁', type: 'bow', rarity: 'Legendary', atk: 320, sellPrice: 10000, icon: '🏹☀️' },
    bow_mythic: { name: '은하의 별빛 멸망궁', type: 'bow', rarity: 'Mythic', atk: 1250, sellPrice: 100000, icon: '🏹🌌' },

    // 🛡️ 방패
    shield_common: { name: '나무 냄비뚜껑', type: 'shield', rarity: 'Common', atk: 8, sellPrice: 50, icon: '🛡️' },
    shield_rare: { name: '수호자의 가디언 실드', type: 'shield', rarity: 'Rare', atk: 25, sellPrice: 250, icon: '🛡️✨' },
    shield_epic: { name: '불멸의 가고일 방패', type: 'shield', rarity: 'Epic', atk: 70, sellPrice: 2500, icon: '🛡️🗿' },
    shield_legendary: { name: '성기사의 천상 실드', type: 'shield', rarity: 'Legendary', atk: 220, sellPrice: 10000, icon: '🛡️👑' },
    shield_mythic: { name: '신성한 절대자의 결계', type: 'shield', rarity: 'Mythic', atk: 900, sellPrice: 100000, icon: '🛡️❇️' },

    // ❇️ 힐
    heal_common: { name: '약초꾼의 지팡이', type: 'heal', rarity: 'Common', atk: 5, sellPrice: 50, icon: '❇️' },
    heal_rare: { name: '은빛 구원자의 지팡이', type: 'heal', rarity: 'Rare', atk: 20, sellPrice: 250, icon: '❇️✨' },
    heal_epic: { name: '생명의 요정 스태프', type: 'heal', rarity: 'Epic', atk: 50, sellPrice: 2500, icon: '❇️🌿' },
    heal_legendary: { name: '대사제의 대천사 스태프', type: 'heal', rarity: 'Legendary', atk: 160, sellPrice: 10000, icon: '❇️👼' },
    heal_mythic: { name: '세계수의 영원한 생명가지', type: 'heal', rarity: 'Mythic', atk: 700, sellPrice: 100000, icon: '❇️🌳' },

    // 🎟️ 히든 쿠폰 방패
    hidden_hong: { name: '홍인준의 뱃살 방패', type: 'shield_special', rarity: 'Mythic', atk: 1600, sellPrice: 100000, icon: '🐷🛡️' }
};

// 🎟️ 리딤 쿠폰
const COUPONS = {
    'WCDI26070123': { type: 'gold', reward: 1000 },
    'HGDAI4860146': { type: 'gold', reward: 1300 },
    'Fiwndq9': { type: 'weapon', reward: 'hidden_hong' }
};

// 무작위 보스 선택
function getRandomBoss() {
    const rand = Math.random();
    let cumulative = 0;
    for (const boss of BOSS_TYPES) {
        cumulative += boss.spawnChance;
        if (rand <= cumulative) {
            return { ...boss, currentHp: boss.maxHp };
        }
    }
    return { ...BOSS_TYPES[0], currentHp: BOSS_TYPES[0].maxHp };
}

// 무작위 무기 선택
function getRandomWeaponKey() {
    const rand = Math.random();
    let rarity = 'Common';
    if (rand < 0.001) rarity = 'Mythic';           // 0.1%
    else if (rand < 0.020) rarity = 'Legendary';   // 1.9%
    else if (rand < 0.100) rarity = 'Epic';        // 8%
    else if (rand < 0.300) rarity = 'Rare';        // 20%
    else rarity = 'Common';                        // 70%

    const types = ['knife', 'bow', 'shield', 'heal'];
    const selectedType = types[Math.floor(Math.random() * types.length)];
    return `${selectedType}_${rarity.toLowerCase()}`;
}

let gameState = {
    boss: getRandomBoss(),
    players: {}
};

io.on('connection', (socket) => {
    console.log(`플레이어 접속: ${socket.id}`);

    gameState.players[socket.id] = {
        id: socket.id,
        name: `유저_${socket.id.substring(0, 4)}`,
        hp: 100,
        maxHp: 100,
        gold: 0,
        inventory: [], // 36칸 제한
        equippedIndex: null,
        usedCoupons: []
    };

    io.emit('updateState', gameState);

    // ⚔️ 공격 이벤트
    socket.on('attack', () => {
        const player = gameState.players[socket.id];
        if (!player || player.hp <= 0) return;

        let equippedWeapon = player.equippedIndex !== null ? player.inventory[player.equippedIndex] : null;
        let baseAtk = equippedWeapon ? (equippedWeapon.atk * (1 + (equippedWeapon.enhance || 0) * 0.5)) : 10;
        let finalDamage = baseAtk;

        // 패시브 발동
        if (equippedWeapon) {
            switch (equippedWeapon.type) {
                case 'knife':
                    if (Math.random() < 0.5) player.hp = Math.max(1, player.hp - 3);
                    break;
                case 'bow':
                    if (Math.random() < 0.3) finalDamage *= 2; // 30% 확률 치명타
                    break;
                case 'shield':
                    if (Math.random() < 0.25) player.hp = Math.min(player.maxHp, player.hp + 5);
                    break;
                case 'shield_special':
                    if (Math.random() < 0.01) {
                        const dmg = Math.ceil(player.hp * 0.03);
                        player.hp = Math.max(1, player.hp - dmg);
                    }
                    break;
                case 'heal':
                    const playerKeys = Object.keys(gameState.players);
                    const targetId = playerKeys[Math.floor(Math.random() * playerKeys.length)];
                    if (gameState.players[targetId]) {
                        gameState.players[targetId].hp = Math.min(gameState.players[targetId].maxHp, gameState.players[targetId].hp + 50);
                    }
                    break;
            }
        }

        gameState.boss.currentHp -= Math.round(finalDamage);
        player.gold += 10;

        // 보스 처치 로직
        if (gameState.boss.currentHp <= 0) {
            const rewardWeaponKey = getRandomWeaponKey();
            const rewardWeapon = { ...WEAPON_DB[rewardWeaponKey], id: Date.now(), enhance: 0 };

            if (player.inventory.length < 36) {
                player.inventory.push(rewardWeapon);
                socket.emit('itemObtained', { weapon: rewardWeapon, full: false });
            } else {
                socket.emit('itemObtained', { weapon: rewardWeapon, full: true });
            }

            gameState.boss = getRandomBoss();
            io.emit('bossDefeated', { killer: player.name });
        }

        io.emit('updateState', gameState);
    });

    // 🎟️ 쿠폰 입력
    socket.on('useCoupon', (code) => {
        const player = gameState.players[socket.id];
        if (!player) return;

        if (player.usedCoupons.includes(code)) {
            return socket.emit('couponResult', { success: false, message: '이미 사용한 쿠폰입니다.' });
        }

        const coupon = COUPONS[code];
        if (!coupon) {
            return socket.emit('couponResult', { success: false, message: '유효하지 않은 쿠폰 코드입니다.' });
        }

        player.usedCoupons.push(code);

        if (coupon.type === 'gold') {
            player.gold += coupon.reward;
            socket.emit('couponResult', { success: true, message: `${coupon.reward} Gold를 획득했습니다!` });
        } else if (coupon.type === 'weapon') {
            const rewardWeapon = { ...WEAPON_DB[coupon.reward], id: Date.now(), enhance: 0 };
            if (player.inventory.length < 36) {
                player.inventory.push(rewardWeapon);
                socket.emit('couponResult', { success: true, message: `특별 무기 [${rewardWeapon.name}]를 획득했습니다!` });
            } else {
                socket.emit('itemObtained', { weapon: rewardWeapon, full: true });
            }
        }
        io.emit('updateState', gameState);
    });

    // 장착 / 판매 / 강화
    socket.on('equipItem', (index) => {
        const player = gameState.players[socket.id];
        if (player && player.inventory[index]) {
            player.equippedIndex = player.equippedIndex === index ? null : index;
            io.emit('updateState', gameState);
        }
    });

    socket.on('sellItem', (index) => {
        const player = gameState.players[socket.id];
        if (player && player.inventory[index]) {
            const soldItem = player.inventory.splice(index, 1)[0];
            player.gold += soldItem.sellPrice;
            if (player.equippedIndex === index) player.equippedIndex = null;
            else if (player.equippedIndex > index) player.equippedIndex--;
            io.emit('updateState', gameState);
        }
    });

    socket.on('enhanceItem', (index) => {
        const player = gameState.players[socket.id];
        if (player && player.inventory[index]) {
            const item = player.inventory[index];
            const cost = (item.enhance + 1) * 500;
            if (player.gold >= cost) {
                player.gold -= cost;
                item.enhance = (item.enhance || 0) + 1;
                io.emit('updateState', gameState);
            }
        }
    });

    // 👑 GM 조작 기능
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

        if (action === 'giveGold') {
            const target = gameState.players[payload.targetId];
            if (target) target.gold += payload.amount;
        }

        if (action === 'giveMythic') {
            const target = gameState.players[payload.targetId];
            if (target && target.inventory.length < 36) {
                target.inventory.push({ ...WEAPON_DB.knife_mythic, id: Date.now(), enhance: 0 });
            }
        }

        if (action === 'punish') {
            const target = gameState.players[payload.targetId];
            if (target) target.hp = 1;
        }

        io.emit('updateState', gameState);
    });

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        io.emit('updateState', gameState);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`));
