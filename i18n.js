const D = {
  ar: { email:'البريد الإلكتروني', pass:'كلمة المرور', uname:'اسم اللاعب', login:'تسجيل الدخول', signup:'إنشاء حساب', logout:'تسجيل الخروج',
    checkMail:'تحقّق من بريدك الإلكتروني لتأكيد الحساب', vsBot:'اللعب ضد الحاسوب', create:'إنشاء غرفة', join:'الانضمام إلى غرفة', code:'رمز الغرفة',
    lb:'إحصائياتي', back:'رجوع', wins:'الانتصارات', losses:'الهزائم', score:'النقاط', mode:'النمط', level:'المستوى',
    easy:'سهل', medium:'متوسط', hard:'صعب', target:'النتيجة المستهدفة', start:'ابدأ', team1:'المجموعة 1', team2:'المجموعة 2',
    players:'اللاعبون', yourTurn:'حان دورك!', wait:'الدور على', draw:'اسحب', youWin:'فزتَ بالجولة', youLose:'خسرتَ الجولة',
    tie:'تعادل', needTeams:'يجب أن يتساوى عدد اللاعبين في المجموعتين (1 ضد 1 أو 2 ضد 2)', leave:'هل تريد مغادرة اللعبة؟',
    matchWin:'🏆 فزتَ بالمباراة!', matchLose:'خسرتَ المباراة', history:'آخر مبارياتي', rank:'الترتيب', rate:'نسبة الفوز',
    again:'لعبة جديدة', capotW:'كابو! لم يسجّل الخصم أي نقطة', capotL:'كابو… لم تسجّل أي نقطة', d66:'دومينو بالدبل 6!', tilesLeft:'القطع المتبقية', teamNames:'أسماء المجموعات',
    look:'المظهر', night:'🌙 ليلي', day:'☀️ نهاري', tableStyle:'الطاولة', tileStyle:'القطع', profile:'الملف الشخصي', save:'حفظ', newPass:'كلمة المرور الجديدة', newPass2:'تأكيد كلمة المرور',
    nameShort:'الاسم قصير جدًا', nameTaken:'هذا الاسم مستخدم', passShort:'كلمة المرور 6 أحرف على الأقل', passMismatch:'كلمتا المرور غير متطابقتين',
    played:'المباريات', points:'مجموع النقاط', avg:'متوسط النقاط', streak:'سلسلة الفوز الحالية', bestStreak:'أطول سلسلة فوز', capots:'كابو لصالحك', capotsAg:'كابو ضدك', margin:'أكبر فارق فوز',
    online:'أونلاين', vsBotS:'ضد الحاسوب', noData:'لا توجد مباريات بعد', rdSix:'إعادة التوزيع: 6 قطع بنفس الرقم', rdDbl:'إعادة التوزيع: 5 قطع مزدوجة' },
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
Object.assign(D.en, { again:'Play another game', capotW:'Capot! They scored nothing', capotL:'Capot… you scored nothing', d66:'Domino with the double six!', tilesLeft:'Tiles left', teamNames:'Group names' });
Object.assign(D.fr, { again:'Nouvelle partie', capotW:'Capot ! Ils n’ont rien marqué', capotL:'Capot… vous n’avez rien marqué', d66:'Domino avec le double six !', tilesLeft:'Dominos restants', teamNames:'Noms des groupes' });
Object.assign(D.en, { lb:'My stats', history:'My recent matches', look:'Appearance', night:'🌙 Night', day:'☀️ Day', tableStyle:'Table', tileStyle:'Tiles', profile:'Profile', save:'Save', newPass:'New password', newPass2:'Confirm password',
  nameShort:'Name too short', nameTaken:'That name is taken', passShort:'Password needs 6+ characters', passMismatch:'Passwords do not match',
  played:'Matches', points:'Total points', avg:'Avg points', streak:'Win streak', bestStreak:'Best streak', capots:'Capots for you', capotsAg:'Capots against', margin:'Biggest win margin', online:'Online', vsBotS:'Vs bot', noData:'No matches yet',
  rdSix:'Redeal: 6 tiles with the same number', rdDbl:'Redeal: 5 doubles' });
Object.assign(D.fr, { lb:'Mes statistiques', history:'Mes derniers matchs', look:'Apparence', night:'🌙 Nuit', day:'☀️ Jour', tableStyle:'Table', tileStyle:'Dominos', profile:'Profil', save:'Enregistrer', newPass:'Nouveau mot de passe', newPass2:'Confirmer le mot de passe',
  nameShort:'Nom trop court', nameTaken:'Ce nom est déjà pris', passShort:'6 caractères minimum', passMismatch:'Les mots de passe ne correspondent pas',
  played:'Matchs', points:'Points totaux', avg:'Moyenne de points', streak:'Série de victoires', bestStreak:'Meilleure série', capots:'Capots pour vous', capotsAg:'Capots contre vous', margin:'Plus grand écart', online:'En ligne', vsBotS:'Contre le bot', noData:'Aucun match',
  rdSix:'Nouvelle donne : 6 dominos du même chiffre', rdDbl:'Nouvelle donne : 5 doubles' });
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
