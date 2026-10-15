export const translations = {
  ar: {
    title: "سايف دومينو",
    tagline: "لعبة الدومينو الجزائرية الأصيلة أونلاين",
    login: "تسجيل الدخول",
    register: "حساب جديد",
    logout: "خروج",
    playVsAI: "اللعب ضد البوت (منفرد)",
    playOnline: "غرفة أونلاين خاصة",
    leaderboard: "لوحة المتصدرين",
    profile: "الملف الشخصي",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    startMatch: "بدء البارتية",
    roomCode: "كود الغرفة",
    joinRoom: "انضمام للغرفة",
    createRoom: "إنشاء غرفة جديدة",
    copyCode: "نسخ الكود",
    waitingHost: "في انتظار المضيف لترتيب المجموعات...",
    group1: "المجموعة 1 (أنت وزمليك)",
    group2: "المجموعة 2 (الخصوم)",
    easy: "سهل",
    medium: "متوسط",
    hard: "صعب (ذكي)",
    boneyard: "المخزن (البونيا)",
    yourTurn: "دورك الآن في اللعب!",
    opponentTurn: "دور الخصم...",
    blockedGame: "مبلعة! (لا توجد حركات متاحة)",
    taunts: {
      mlih: "مليح",
      ketel: "كتل",
      bala: "بلع",
      nzidek: "نزيدك خطرة",
      laebak: "لعبك",
      rassi: "راسي"
    },
    stats: {
      wins: "انتصارات",
      losses: "هزائم",
      totalScore: "النقاط الكلية",
      winRate: "نسبة الفوز"
    }
  },
  fr: {
    title: "SaivDOMINO",
    tagline: "Le jeu de دومينو algérien authentique en ligne",
    login: "Connexion",
    register: "Inscription",
    logout: "Déconnexion",
    playVsAI: "Jouer vs IA",
    playOnline: "Salon Privé En Ligne",
    leaderboard: "Classement",
    profile: "Profil",
    username: "Nom d'utilisateur",
    password: "Mot de passe",
    startMatch: "Commencer le match",
    roomCode: "Code du salon",
    joinRoom: "Rejoindre",
    createRoom: "Créer un salon",
    copyCode: "Copier le code",
    waitingHost: "En attente du Hôte pour placer les groupes...",
    group1: "Groupe 1 (Vous & Allié)",
    group2: "Groupe 2 (Adversaires)",
    easy: "Facile",
    medium: "Moyen",
    hard: "Difficile",
    boneyard: "Pioche",
    yourTurn: "C'est votre tour !",
    opponentTurn: "Tour de l'adversaire...",
    blockedGame: "Bloqué ! (Match bloqué)",
    taunts: {
      mlih: "Mlih",
      ketel: "Ketel",
      bala: "Bala",
      nzidek: "Nzidek",
      laebak: "Laebak",
      rassi: "Rassi"
    },
    stats: {
      wins: "Victoires",
      losses: "Défaites",
      totalScore: "Score Total",
      winRate: "% Victoire"
    }
  },
  en: {
    title: "SaivDOMINO",
    tagline: "Authentic Algerian Dominoes Game Online",
    login: "Login",
    register: "Register",
    logout: "Logout",
    playVsAI: "Play vs AI (Offline)",
    playOnline: "Online Private Rooms",
    leaderboard: "Leaderboard",
    profile: "Profile",
    username: "Username",
    password: "Password",
    startMatch: "Start Match",
    roomCode: "Room Code",
    joinRoom: "Join Room",
    createRoom: "Create Room",
    copyCode: "Copy Code",
    waitingHost: "Waiting for Host to set up groups...",
    group1: "Group 1 (You & Partner)",
    group2: "Group 2 (Opponents)",
    easy: "Easy",
    medium: "Medium",
    hard: "Hard (Smart)",
    boneyard: "Boneyard",
    yourTurn: "Your Turn!",
    opponentTurn: "Opponent's turn...",
    blockedGame: "Blocked Game!",
    taunts: {
      mlih: "Mlih",
      ketel: "Ketel",
      bala: "Bala",
      nzidek: "Nzidek",
      laebak: "Laebak",
      rassi: "Rassi"
    },
    stats: {
      wins: "Wins",
      losses: "Losses",
      totalScore: "Total Score",
      winRate: "Win Rate"
    }
  }
};

export function setLanguage(lang) {
  localStorage.setItem('saiv_lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', lang);
  updateUIStrings(lang);
}

export function t(key) {
  const lang = localStorage.getItem('saiv_lang') || 'ar';
  const keys = key.split('.');
  let val = translations[lang];
  for (const k of keys) {
    val = val ? val[k] : null;
  }
  return val || key;
}

function updateUIStrings(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
}
