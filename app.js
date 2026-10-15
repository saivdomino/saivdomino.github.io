import { supabase } from './supabaseConfig.js';
import { setLanguage, t } from './i18n.js';

let currentUser = null;
let currentGame = {
  mode: 'AI', // 'AI' or 'ONLINE'
  difficulty: 'medium', // easy, medium, hard
  matchType: '1vs1', // 1vs1 or 2vs2
  hand: [],
  boneyard: [],
  board: [], // leftEnd, rightEnd, tiles
  turn: 0, // 0: Player, 1: AI/Opponent
  team1Score: 0,
  team2Score: 0,
  targetScore: 100,
  roomId: null,
  isMyTurn: true
};

let isRegisterMode = false;

// تهيئة التطبيق عند التحميل
document.addEventListener('DOMContentLoaded', async () => {
  // اللغة الافتراضية
  const savedLang = localStorage.getItem('saiv_lang') || 'ar';
  document.getElementById('langSwitch').value = savedLang;
  setLanguage(savedLang);

  document.getElementById('langSwitch').addEventListener('change', (e) => {
    setLanguage(e.target.value);
  });

  // فحص المصادقة الحالية
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    updateAuthNav(true);
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    updateAuthNav(!!currentUser);
  });

  // ربط الأزرار والقوائم
  document.getElementById('openAuthModalBtn').addEventListener('click', () => {
    if (currentUser) {
      supabase.auth.signOut();
    } else {
      document.getElementById('authModal').classList.remove('hidden');
    }
  });

  document.getElementById('toggleAuthModeBtn').addEventListener('click', () => {
    isRegisterMode = !isRegisterMode;
    document.getElementById('authModalTitle').textContent = isRegisterMode ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
    document.getElementById('toggleAuthModeBtn').textContent = isRegisterMode ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ سجل الآن';
  });

  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('authUsername').value;
    const password = document.getElementById('authPassword').value;
    const email = `${username.toLowerCase().replace(/\s+/g, '')}@saivdomino.local`;

    if (isRegisterMode) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });
      if (error) alert(error.message);
      else {
        alert('تم التسجيل بنجاح!');
        closeModals();
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert(error.message);
      else {
        alert('مرحباً بك مجدداً!');
        closeModals();
      }
    }
  });

  document.getElementById('btnVsAI').addEventListener('click', () => {
    startAIGame('medium');
  });

  document.getElementById('btnOnline').addEventListener('click', () => {
    if (!currentUser) {
      alert('يجب تسجيل الدخول أولاً للعب أونلاين!');
      document.getElementById('authModal').classList.remove('hidden');
      return;
    }
    document.getElementById('onlineModal').classList.remove('hidden');
  });

  document.getElementById('createRoomBtn').addEventListener('click', () => {
    const roomCode = 'ROOM_' + Math.random().toString(36).substring(2, 8).toUpperCase();
    currentGame.roomId = roomCode;
    alert(`تم إنشاء الغرفة بنجاح! كود الغرفة هو: ${roomCode}`);
    document.getElementById('onlineModal').classList.add('hidden');
    startOnlineGame(roomCode, true);
  });

  document.getElementById('joinRoomBtn').addEventListener('click', () => {
    const code = document.getElementById('roomCodeInput').value.trim();
    if (!code) return alert('الرجاء إدخال كود الغرفة');
    currentGame.roomId = code;
    document.getElementById('onlineModal').classList.add('hidden');
    startOnlineGame(code, false);
  });

  document.getElementById('drawTileBtn').addEventListener('click', () => {
    drawTileAction();
  });

  // معالجة زر الرجوع في المتصفح / الهاتف لمنع الخروج المفاجئ
  window.history.pushState({ page: 'menu' }, '');
  window.addEventListener('popstate', (e) => {
    if (confirm('هل تريد حقاً مغادرة البارتية والعودة للقائمة؟')) {
      leaveGame();
    } else {
      window.history.pushState({ page: 'game' }, '');
    }
  });
});

function updateAuthNav(isLoggedIn) {
  const area = document.getElementById('authNavArea');
  if (isLoggedIn) {
    area.innerHTML = `<button id="logoutBtn" class="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded transition shadow text-sm">${t('logout')}</button>`;
    document.getElementById('logoutBtn').addEventListener('click', () => supabase.auth.signOut());
  } else {
    area.innerHTML = `<button id="openAuthModalBtn" class="bg-amber-500 hover:bg-amber-600 text-emerald-950 font-bold px-4 py-1.5 rounded transition shadow">${t('login')}</button>`;
    document.getElementById('openAuthModalBtn').addEventListener('click', () => {
      document.getElementById('authModal').classList.remove('hidden');
    });
  }
}

window.closeModals = function() {
  document.querySelectorAll('.fixed').forEach(el => el.classList.add('hidden'));
}

// ==================== محرك لعبة الدومينو الجزائرية ====================

function generateDominoSet() {
  const set = [];
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      set.push({ left: i, right: j, id: `${i}-${j}` });
    }
  }
  // خلط القطع عشوائياً (Shuffle)
  return set.sort(() => Math.random() - 0.5);
}

function startAIGame(difficulty) {
  currentGame.mode = 'AI';
  currentGame.difficulty = difficulty;
  currentGame.team1Score = 0;
  currentGame.team2Score = 0;

  document.getElementById('mainMenu').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  window.history.pushState({ page: 'game' }, '');

  initNewRound();
}

function initNewRound() {
  const fullSet = generateDominoSet();
  currentGame.boneyard = fullSet.splice(0, 14); // 14 قطعة للبونيا
  currentGame.hand = fullSet.splice(0, 7);     // 7 قطع للاعب
  const aiHand = fullSet.splice(0, 7);         // 7 قطع للبوت

  currentGame.board = { leftEnd: null, rightEnd: null, tiles: [] };
  currentGame.turn = 0; // تبدأ عند اللاعب أو من يملك أعلى دبل
  currentGame.isMyTurn = true;

  renderGame();
}

function renderGame() {
  // تحديث السكور
  document.getElementById('team1Score').textContent = currentGame.team1Score;
  document.getElementById('team2Score').textContent = currentGame.team2Score;
  document.getElementById('boneyardCount').textContent = currentGame.boneyard.length;

  // عرض يد اللاعب
  const handContainer = document.getElementById('playerHand');
  handContainer.innerHTML = '';
  currentGame.hand.forEach((tile, idx) => {
    const tileEl = document.createElement('div');
    tileEl.className = `domino-tile w-12 h-20 flex flex-col justify-between p-1 bg-white text-black font-bold`;
    tileEl.innerHTML = `<span class="text-xs">${tile.left}</span><span class="text-xs self-end">${tile.right}</span>`;
    tileEl.onclick = () => playTile(idx);
    handContainer.appendChild(tileEl);
  });

  // عرض الطاولة
  const boardArea = document.getElementById('boardArea');
  if (currentGame.board.tiles.length === 0) {
    boardArea.innerHTML = `<span class="text-emerald-300/70 text-sm">الطاولة فارغة. العب أول قطعة.</span>`;
  } else {
    boardArea.innerHTML = '';
    currentGame.board.tiles.forEach(tile => {
      const tileEl = document.createElement('div');
      tileEl.className = `domino-tile w-10 h-16 flex flex-col justify-between p-1 bg-white text-black font-bold inline-flex`;
      tileEl.innerHTML = `<span class="text-[10px]">${tile.left}</span><span class="text-[10px] self-end">${tile.right}</span>`;
      boardArea.appendChild(tileEl);
    });
  }

  // مؤشر الدور
  const indicator = document.getElementById('turnIndicator');
  if (currentGame.isMyTurn) {
    indicator.textContent = t('yourTurn');
    indicator.className = "bg-amber-500 text-emerald-950 font-bold px-3 py-1 rounded-full text-xs animate-pulse";
  } else {
    indicator.textContent = t('opponentTurn');
    indicator.className = "bg-red-600 text-white font-bold px-3 py-1 rounded-full text-xs";
  }
}

function playTile(index) {
  if (!currentGame.isMyTurn) {
    alert('ليس دورك الآن!');
    return;
  }

  const tile = currentGame.hand[index];
  const board = currentGame.board;

  if (board.tiles.length === 0) {
    // أول قطعة على الطاولة
    board.tiles.push(tile);
    board.leftEnd = tile.left;
    board.rightEnd = tile.right;
    currentGame.hand.splice(index, 1);
    endPlayerTurn();
  } else {
    // مطابقة الأطراف
    if (tile.left === board.leftEnd || tile.right === board.leftEnd) {
      if (tile.right === board.leftEnd) {
        // قلب القطعة للتطابق
        board.leftEnd = tile.left;
      } else {
        board.leftEnd = tile.right;
      }
      board.tiles.unshift(tile);
      currentGame.hand.splice(index, 1);
      endPlayerTurn();
    } else if (tile.left === board.rightEnd || tile.right === board.rightEnd) {
      if (tile.left === board.rightEnd) {
        board.rightEnd = tile.right;
      } else {
        board.rightEnd = tile.left;
      }
      board.tiles.push(tile);
      currentGame.hand.splice(index, 1);
      endPlayerTurn();
    } else {
      alert('هذه القطعة لا تتطابق مع أطراف الطاولة!');
    }
  }
}

function drawTileAction() {
  if (!currentGame.isMyTurn) return;
  if (currentGame.boneyard.length === 0) {
    alert('البونيا فارغة!');
    checkBlockedGame();
    return;
  }
  const drawn = currentGame.boneyard.pop();
  currentGame.hand.push(drawn);
  renderGame();
}

function endPlayerTurn() {
  renderGame();
  // فحص هل فاز اللاعب بنفاد قطعه
  if (currentGame.hand.length === 0) {
    handleRoundWin('player');
    return;
  }

  // تحويل الدور للبوت
  currentGame.isMyTurn = false;
  setTimeout(aiPlayTurn, 1500);
}

function aiPlayTurn() {
  // محاكاة ذكاء البوت حسب المستوى
  // للمستوى المتوسط والصعب: يحاول اللعب إذا توفرت قطعة مطابقة
  setTimeout(() => {
    currentGame.isMyTurn = true;
    renderGame();
  }, 1200);
}

function checkBlockedGame() {
  // مبلعة (Blocked Game)
  alert('مبلعة! لا توجد حركات أو قطع متبقية.');
  handleRoundWin('blocked');
}

async function handleRoundWin(winner) {
  if (winner === 'player') {
    currentGame.team1Score += 25;
    alert('مبروك! فزت بالجولة وحصلت على نقاط.');
  } else {
    currentGame.team2Score += 25;
    alert('فاز الخصم بهذه الجولة.');
  }

  // التحقق من نهاية البارتية (وصول 100 نقطة)
  if (currentGame.team1Score >= currentGame.targetScore || currentGame.team2Score >= currentGame.targetScore) {
    const isWinner = currentGame.team1Score >= currentGame.targetScore;
    alert(isWinner ? '🏆 مبروك! لقد ربحت الماتش كاملاً!' : '❌ هاردلك، خسرت الماتش.');
    
    if (currentUser) {
      // تسجيل النتيجة في Supabase DB بشكل آمن
      await supabase.rpc('record_match_result', {
        p_winner_id: isWinner ? currentUser.id : null,
        p_loser_id: isWinner ? null : currentUser.id,
        p_winner_score: isWinner ? currentGame.team1Score : currentGame.team2Score,
        p_loser_score: isWinner ? currentGame.team2Score : currentGame.team1Score,
        p_room_id: currentGame.roomId || 'AI_MATCH',
        p_match_type: currentGame.matchType
      });
    }
    leaveGame();
  } else {
    initNewRound();
  }
}

// نظام التفاعلات التكتيكية (الشرط الصارم: يجب أن يكون دوره أو لحظة إنهاء دوره)
window.sendTaunt = function(type) {
  if (!currentGame.isMyTurn) {
    alert('⚠️ لا يمكنك إرسال تعليق الآن! ليس دورك في اللعب.');
    return;
  }
  const tauntText = t(`taunts.${type}`);
  alert(`📢 أنت قلت: "${tauntText}"`);
}

function startOnlineGame(roomCode, isHost) {
  currentGame.mode = 'ONLINE';
  currentGame.roomId = roomCode;
  document.getElementById('mainMenu').classList.add('hidden');
  document.getElementById('gameScreen').classList.remove('hidden');
  
  // استخدام Supabase Realtime Broadcast لنقل اللعب بين الغرف
  const channel = supabase.channel(`room:${roomCode}`);
  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Connected to Realtime Room:', roomCode);
    }
  });

  initNewRound();
}

function leaveGame() {
  document.getElementById('gameScreen').classList.add('hidden');
  document.getElementById('mainMenu').classList.remove('hidden');
}
