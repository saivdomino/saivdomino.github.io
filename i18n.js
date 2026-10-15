const D = {
  ar: { email:'البريد الإلكتروني', pass:'كلمة السر', uname:'اسم اللاعب', login:'دخول', signup:'تسجيل', logout:'خروج',
    checkMail:'تحقق من بريدك لتأكيد الحساب', vsBot:'ضد البوت', create:'إنشاء غرفة', join:'دخول غرفة', code:'كود الغرفة',
    lb:'المتصدرون', back:'رجوع', wins:'فوز', losses:'خسارة', score:'نقاط', mode:'النمط', level:'المستوى',
    easy:'سهل', medium:'متوسط', hard:'صعب', target:'السكور', start:'ابدأ', team1:'المجموعة 1', team2:'المجموعة 2',
    players:'اللاعبون', yourTurn:'دورك!', wait:'دور', draw:'اسحب', youWin:'ربحتي الجولة', youLose:'خسرتي الجولة',
    tie:'تعادل', needTeams:'لازم عدد متساوي في المجموعتين (1v1 أو 2v2)', leave:'تخرج من اللعبة؟',
    matchWin:'🏆 ربحتي البارتية!', matchLose:'خسرتي البارتية', history:'آخر ماتشاتي', rank:'الترتيب', rate:'نسبة الفوز' },
  en: { email:'Email', pass:'Password', uname:'Player name', login:'Log in', signup:'Sign up', logout:'Log out',
    checkMail:'Check your email to confirm your account', vsBot:'Play vs bot', create:'Create room', join:'Join room', code:'Room code',
    lb:'Leaderboard', back:'Back', wins:'Wins', losses:'Losses', score:'Score', mode:'Mode', level:'Level',
    easy:'Easy', medium:'Medium', hard:'Hard', target:'Target', start:'Start', team1:'Group 1', team2:'Group 2',
    players:'Players', yourTurn:'Your turn!', wait:'Turn:', draw:'Draw', youWin:'You won the round', youLose:'You lost the round',
    tie:'Tie', needTeams:'Both groups need the same number of players (1v1 or 2v2)', leave:'Leave the game?',
    matchWin:'🏆 You won the match!', matchLose:'You lost the match', history:'My recent matches', rank:'Rank', rate:'Win rate' },
  fr: { email:'E-mail', pass:'Mot de passe', uname:'Nom du joueur', login:'Connexion', signup:'Inscription', logout:'Déconnexion',
    checkMail:'Vérifiez votre e-mail pour confirmer le compte', vsBot:'Jouer contre le bot', create:'Créer une salle', join:'Rejoindre', code:'Code de la salle',
    lb:'Classement', back:'Retour', wins:'Victoires', losses:'Défaites', score:'Points', mode:'Mode', level:'Niveau',
    easy:'Facile', medium:'Moyen', hard:'Difficile', target:'Score cible', start:'Démarrer', team1:'Groupe 1', team2:'Groupe 2',
    players:'Joueurs', yourTurn:'À vous !', wait:'Tour :', draw:'Piocher', youWin:'Manche gagnée', youLose:'Manche perdue',
    tie:'Égalité', needTeams:'Les deux groupes doivent avoir le même nombre de joueurs (1v1 ou 2v2)', leave:'Quitter la partie ?',
    matchWin:'🏆 Partie gagnée !', matchLose:'Partie perdue', history:'Mes derniers matchs', rank:'Rang', rate:'Taux de victoire' }
};
let L = localStorage.getItem('lang') || 'ar';
export const lang = () => L;
export const t = k => (D[L] && D[L][k]) || k;
export function setLang(l) {
  L = l; localStorage.setItem('lang', l);
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(e => e.textContent = t(e.dataset.i18n));
  document.querySelectorAll('[data-ph]').forEach(e => e.placeholder = t(e.dataset.ph));
}
