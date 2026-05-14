// Masters of Life app script
// Extracted from index.html in Phase 3D; keep as a classic script for inline onclick globals.

// PWA Manifest
const manifestData = {
  name: "Masters of Life",
  short_name: "MoL",
  start_url: "./",
  display: "standalone",
  background_color: "#092036",
  theme_color: "#092036",
  icons: [{
    src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='18' fill='%23092036'/><text x='50' y='62' text-anchor='middle' font-family='serif' font-size='42' font-weight='700' fill='%2314CEFF'>ML</text></svg>",
    sizes: "any", type: "image/svg+xml"
  }]
};
const blob = new Blob([JSON.stringify(manifestData)], {type:'application/json'});
const manifestURL = URL.createObjectURL(blob);
document.addEventListener('DOMContentLoaded', () => {
  const link = document.createElement('link');
  link.rel = 'manifest'; link.href = manifestURL;
  document.head.appendChild(link);
});

// Firebase Config & Init
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAF8C4yKsjfq2FYRCDcjqxCckPldW_wcj4",
  authDomain: "scholarly-engine.firebaseapp.com",
  projectId: "scholarly-engine",
  storageBucket: "scholarly-engine.firebasestorage.app",
  messagingSenderId: "83098653152",
  appId: "1:83098653152:web:a8a2ef40c22bf7fbd29b85"
};

// ── Firebase init ──
let db = null, auth = null, currentUser = null, unsubscribeSync = null;
let firebaseReady = false;

try {
  firebase.initializeApp(FIREBASE_CONFIG);
  db = firebase.firestore();
  auth = firebase.auth();
  // Enable offline persistence
  // Persistence disabled — it was caching stale data and blocking real-time sync
  // db.enablePersistence({synchronizeTabs:true}).catch(()=>{});
  firebaseReady = true;
} catch(e) {
  console.warn('Firebase not configured or failed to init:', e.message);
}

// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
const MEAL_LABELS = ['Breakfast','Morning Snack','Lunch','Afternoon Snack','Dinner'];
const APP_SCHEMA_VERSION = 1;
const FINANCE_CATEGORIES = ['Groceries','Recurring Bills','Rent','Transport','Health','Learning','Entertainment','Other'];
const LIFE_STAT_LABELS = ['Intelligence','Health','Strength','Wealth','Connection','Purpose'];
const META_STAT_LABELS = ['Consistency','Resolve'];
const CHARACTER_STAT_KEYS = ['intelligence','health','strength','wealth','connection','purpose','consistency','resolve'];
const MAIN_STAT_KEYS = ['intelligence','health','strength','wealth','connection','purpose'];
const XP_CURVE_CONFIG = { xpBase: 25, xpExponent: 1.35, maxLevel: 250, maxRanks: 50, rankSize: 5 };
// TODO: Future Sleep module - sleep duration, quality, recovery, and energy patterns.
// TODO: Future Avoidance Quests module - hard/avoided tasks that award Resolve safely.
const STAT_DESCRIPTIONS = {
  intelligence:'Study, reading, thinking, research, writing, and focused learning.',
  health:'Meals, cardio, recovery, weight awareness, and general bodily care.',
  strength:'Resistance training, physical power, and progressive overload.',
  wealth:'Budgeting, saving, finance reviews, and resource stewardship.',
  connection:'Friendship, family, gratitude, repair, and meaningful social effort.',
  purpose:'Goals, planning, reflection, values, and long-term direction.',
  consistency:'Showing up repeatedly, returning, and protecting planned action.',
  resolve:'Doing what is difficult, avoided, or uncomfortable but necessary.'
};
const STAT_UI = {
  intelligence:{label:'Intelligence',icon:'🧠',color:'#0e8bba'},
  health:{label:'Health',icon:'💚',color:'#1aaa00'},
  strength:{label:'Strength',icon:'🏋️',color:'#f5a000'},
  wealth:{label:'Finances',icon:'💰',color:'#d69a00'},
  connection:{label:'Connection',icon:'🤝',color:'#8b5cf6'},
  purpose:{label:'Goals',icon:'🎯',color:'#f21b1b'},
  consistency:{label:'Consistency',icon:'🔁',color:'#14ceff'},
  resolve:{label:'Resolve',icon:'🛡️',color:'#092036'}
};

function createId(prefix='id'){
  const safePrefix=String(prefix||'id').replace(/[^a-z0-9_-]/gi,'_').toLowerCase();
  if(window.crypto?.randomUUID) return `${safePrefix}_${window.crypto.randomUUID()}`;
  return `${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
}

const RANKS = [
  {range:'1-5',minLevel:1,maxLevel:5,title:'Awakening',description:'You have noticed that life can be shaped instead of merely endured. This is the first spark of intentional change.'},
  {range:'6-10',minLevel:6,maxLevel:10,title:'First Steps',description:'You are beginning to act, even if the steps are small. The important thing is that movement has started.'},
  {range:'11-15',minLevel:11,maxLevel:15,title:'The First Spark',description:'The first fragments of structure are appearing in your days. You are discovering that repeated action can create stability.'},
  {range:'16-20',minLevel:16,maxLevel:20,title:'Habit Apprentice',description:'You are learning how habits are built: imperfectly, through trial, failure, and return. Consistency is still fragile, but real.'},
  {range:'21-25',minLevel:21,maxLevel:25,title:'Momentum Seeker',description:'You are searching for rhythm. Motivation comes and goes, but you are beginning to understand the value of continuing anyway.'},
  {range:'26-30',minLevel:26,maxLevel:30,title:'Discipline Builder',description:'You are learning to do what matters even when it is uncomfortable. Discipline is becoming a skill, not a fantasy.'},
  {range:'31-35',minLevel:31,maxLevel:35,title:'Attention Keeper',description:'Your attention is becoming more deliberate. You are starting to choose what deserves your energy and what does not.'},
  {range:'36-40',minLevel:36,maxLevel:40,title:'Consistency Crafter',description:'You are shaping your progress through repeated action. Your identity begins to shift from "trying" to "showing up."'},
  {range:'41-45',minLevel:41,maxLevel:45,title:'Order Restorer',description:'You are bringing order back into neglected parts of life. Chaos still appears, but it no longer has complete authority.'},
  {range:'46-50',minLevel:46,maxLevel:50,title:'Path Planner',description:'You are learning to prepare before acting. Plans are becoming tools that protect you from confusion and wasted effort.'},
  {range:'51-55',minLevel:51,maxLevel:55,title:'Task Shaper',description:'You are getting better at turning big problems into clear actions. Progress becomes easier when the next step is visible.'},
  {range:'56-60',minLevel:56,maxLevel:60,title:'Clarity Seeker',description:'You are exploring what truly matters. Instead of chasing every demand, you begin to search for meaningful direction.'},
  {range:'61-65',minLevel:61,maxLevel:65,title:'Routine Keeper',description:'You can now maintain basic structures more reliably. Your routines are no longer experiments; they are becoming anchors.'},
  {range:'66-70',minLevel:66,maxLevel:70,title:'Energy Steward',description:'You are learning that growth depends on energy, not just willpower. Sleep, rest, food, movement, and pacing start to matter more.'},
  {range:'71-75',minLevel:71,maxLevel:75,title:'Progress Guardian',description:'You are protecting your gains from relapse and distraction. Your main task is no longer only starting, but preserving momentum.'},
  {range:'76-80',minLevel:76,maxLevel:80,title:'System Builder',description:'You understand that good systems beat random effort. You begin shaping your environment so better choices become easier.'},
  {range:'81-85',minLevel:81,maxLevel:85,title:'Life Architect',description:'You are no longer only managing tasks; you are designing a way of living. Goals, routines, values, and identity begin to align.'},
  {range:'86-90',minLevel:86,maxLevel:90,title:'Priority Keeper',description:'You are learning to decide what comes first. Your strength is not doing everything, but directing your effort wisely.'},
  {range:'91-95',minLevel:91,maxLevel:95,title:'Focus Guardian',description:'You defend your attention more seriously. Distractions still appear, but you are becoming harder to pull away from your path.'},
  {range:'96-100',minLevel:96,maxLevel:100,title:'Momentum Master',description:'You can generate progress even after setbacks. You know how to restart, rebuild, and keep moving through resistance.'},
  {range:'101-105',minLevel:101,maxLevel:105,title:'Discipline Bearer',description:'You now act before emotion fully catches up. Action becomes your way of creating motivation, not waiting for it.'},
  {range:'106-110',minLevel:106,maxLevel:110,title:'Standard Keeper',description:'You have become a committed defender of your own growth. You protect your routines, boundaries, and future self.'},
  {range:'111-115',minLevel:111,maxLevel:115,title:'Balance Weaver',description:'You are learning to connect pressure with sustainability. Growth, rest, relationships, health, and purpose begin to support each other.'},
  {range:'116-120',minLevel:116,maxLevel:120,title:'Wise Mover',description:'You combine action with judgment. You know when to push, when to pause, and where your effort has the highest return.'},
  {range:'121-125',minLevel:121,maxLevel:125,title:'Depth Seeker',description:'You can enter more serious states of concentration and presence. Your best work comes from protecting depth, silence, and focused time.'},
  {range:'126-130',minLevel:126,maxLevel:130,title:'Goalforged',description:'Your goals are no longer vague wishes; they have shaped your habits and character. You are being forged by what you pursue.'},
  {range:'131-135',minLevel:131,maxLevel:135,title:'Direction Keeper',description:'You guard your direction against confusion, impulse, and outside noise. You return faster to what matters.'},
  {range:'136-140',minLevel:136,maxLevel:140,title:'Rhythm Adept',description:'Your systems are becoming smoother and more skillful. You operate with rhythm, precision, and growing confidence across multiple domains.'},
  {range:'141-145',minLevel:141,maxLevel:145,title:'Resilience Bearer',description:'You can withstand disruption without losing yourself. Stress, mistakes, and bad weeks become obstacles, not endings.'},
  {range:'146-150',minLevel:146,maxLevel:150,title:'System Master',description:'You have developed a refined structure for life. Your habits, planning, review, and environment begin to work together as one system.'},
  {range:'151-155',minLevel:151,maxLevel:155,title:'Order Holder',description:'You possess real authority over your daily structure. Life is not perfectly controlled, but you are no longer ruled by disorder.'},
  {range:'156-160',minLevel:156,maxLevel:160,title:'Mindful Builder',description:'You act with both awareness and intention. You are not only doing more; you are becoming more conscious of why and how you act.'},
  {range:'161-165',minLevel:161,maxLevel:165,title:'Purpose Pathfinder',description:'You are connecting effort to meaning. Your actions increasingly serve a larger direction rather than only short-term achievement.'},
  {range:'166-170',minLevel:166,maxLevel:170,title:'Discipline Rooted',description:'Discipline has become a stable force in your life. You no longer need constant inspiration to uphold your standards.'},
  {range:'171-175',minLevel:171,maxLevel:175,title:'Flow Walker',description:'You are learning to work with rhythm instead of brute force. When conditions are right, effort becomes smoother and more natural.'},
  {range:'176-180',minLevel:176,maxLevel:180,title:'Lifecraft Paragon',description:'You are crafting your life as a whole, not optimizing isolated habits. Work, health, relationships, resources, and purpose become one design.'},
  {range:'181-185',minLevel:181,maxLevel:185,title:'Alignment Master',description:'Your choices increasingly match your values. There is less friction between what you say matters and how you actually live.'},
  {range:'186-190',minLevel:186,maxLevel:190,title:'Self-Sovereign',description:'You act from inner authority rather than impulse, pressure, or chaos. Your standards feel self-owned and deeply integrated.'},
  {range:'191-195',minLevel:191,maxLevel:195,title:'Pattern Knower',description:'You understand your own patterns with unusual clarity. You can anticipate what helps you thrive and what leads you off course.'},
  {range:'196-200',minLevel:196,maxLevel:200,title:'Excellence Architect',description:'You are building excellence deliberately. Your systems are not only functional, but refined toward mastery.'},
  {range:'201-205',minLevel:201,maxLevel:205,title:'Limit Breaker',description:'You are entering the legendary zone of long-term growth. Limits still exist, but you meet them with creativity, patience, and courage.'},
  {range:'206-210',minLevel:206,maxLevel:210,title:'Life Strategist',description:'You can think across years, domains, and consequences. Your life is guided more by intention than reaction.'},
  {range:'211-215',minLevel:211,maxLevel:215,title:'Vision Executor',description:'You turn high-level vision into action. You are not lost in planning; you execute with power and direction.'},
  {range:'216-220',minLevel:216,maxLevel:220,title:'Diamond Will',description:'Your will has been strengthened through pressure. You have become more durable, clear, and difficult to derail.'},
  {range:'221-225',minLevel:221,maxLevel:225,title:'Harmony Keeper',description:'Your systems reach a rare level of harmony. Life feels less like constant repair and more like orchestration.'},
  {range:'226-230',minLevel:226,maxLevel:230,title:'Mythic Architect',description:'You are designing life at an almost legendary level. Your routines and values express a coherent personal philosophy.'},
  {range:'231-235',minLevel:231,maxLevel:235,title:'Renewal Master',description:'You have learned the art of return. Even after fatigue, failure, or disruption, you know how to restore movement.'},
  {range:'236-240',minLevel:236,maxLevel:240,title:'Balance Master',description:'You understand that mastery requires integration. Ambition, recovery, relationships, meaning, health, and resources are held in balance.'},
  {range:'241-245',minLevel:241,maxLevel:245,title:'Integrated Self',description:'You are no longer merely improving habits; you are embodying a higher form of self-direction. Your life reflects chosen principles.'},
  {range:'246-249',minLevel:246,maxLevel:249,title:'Life Ascendant',description:'You stand at the edge of complete integration. Discipline, clarity, energy, purpose, connection, and balance have become deeply unified.'},
  {range:'250',minLevel:250,maxLevel:250,title:'Master of Life',description:'The final pinnacle. You have transformed productivity into life mastery: not endless busyness, but integrated command of attention, energy, purpose, relationships, health, resources, and meaning.'}
];

function defaultCharacter(){
  const cfg=XP_CURVE_CONFIG;
  return {
    name:'Your Character',
    title:'Awakening',
    totalXp:0,
    xp:0,
    level:1,
    maxLevel:cfg.maxLevel,
    rank:1,
    maxRank:cfg.maxRanks,
    maxRanks:cfg.maxRanks,
    rankName:'Awakening',
    stats:{intelligence:0,health:0,strength:0,wealth:0,connection:0,purpose:0,consistency:0,resolve:0},
    meta:{consistency:0,resolve:0},
    xpEvents:[],
    rewarded:{},
    badges:[]
  };
}

const D = {
  schemaVersion:APP_SCHEMA_VERSION,
  character:defaultCharacter(),
  tags:['Psychoanalysis','Philosophy','Paper Writing'],
  tagColors:{},
  atag:'Psychoanalysis',
  tmr:null, remain:3600, phase:'idle', paused:false,
  h20:'', recallTxt:'',
  sessions:[], habits:[
    {id:'h1',name:'Gym session',id2:'I am a consistent trainee',sk:'After I close my laptop, I will put on my gym shoes',tm:'Drive to the gym and stay for 5 minutes',added:Date.now()-8*864e5,log:{}},
    {id:'h2',name:'Nourishing meal',id2:'I am someone who nourishes my body',sk:'After I finish a writing block, I will consume a 500-calorie meal',tm:'Prepare one protein-rich food item',added:Date.now()-3*864e5,log:{}},
    {id:'h3',name:'Open the app',id2:'I am a person who protects focused growth',sk:"After I wake up, I will open Masters of Life first",tm:"Open app and write one sentence about today's goal",added:Date.now(),log:{}},
  ],
  ahi:0, reflections:[],
  utTmr:null, utSecs:600,
  anMonth:new Date().getMonth(), anYear:new Date().getFullYear(), anYearView:new Date().getFullYear(),
  selFocus:3, meals:{}, mealDate:new Date(),
  profiles:[], activeProfile:null, profileStep:0,
  goals:{ dailyByDate:{}, weekly:[], monthly:[] },
  todayTasks:[],
  focusBlocks:[],
  todayFlowOrder:{},
  alarmOn: true,
  mealLockedTimes: [null, null, null, null, null],
  body: { weightLog: [], cardioLog: [] },
  finance: { income: [], expenses: [], recurring: [], categories: FINANCE_CATEGORIES },
};

function ensureCharacter(){
  const base=defaultCharacter();
  const cfg=XP_CURVE_CONFIG;
  D.schemaVersion=D.schemaVersion||APP_SCHEMA_VERSION;
  D.character={...base,...(D.character||{})};
  D.character.stats={...base.stats,...(D.character.stats||{}),...(D.character.meta||{})};
  D.character.meta={consistency:D.character.stats.consistency||0,resolve:D.character.stats.resolve||0};
  D.character.totalXp=Number(D.character.totalXp ?? D.character.xp ?? 0)||0;
  D.character.xp=D.character.totalXp;
  D.character.maxLevel=cfg.maxLevel;
  D.character.maxRank=cfg.maxRanks;
  D.character.maxRanks=cfg.maxRanks;
  if(!Array.isArray(D.character.xpEvents)) D.character.xpEvents=[];
  if(!D.character.rewarded||typeof D.character.rewarded!=='object'||Array.isArray(D.character.rewarded)) D.character.rewarded={};
  if(!Array.isArray(D.character.badges)) D.character.badges=[];
  CHARACTER_STAT_KEYS.forEach(k=>{D.character.stats[k]=Number(D.character.stats[k])||0;});
  recalculateCharacterFromEvents();
}

function ensureHabitData(){
  if(!Array.isArray(D.habits)) D.habits=[];
  D.habits.forEach((h,i)=>{
    if(!h.log||typeof h.log!=='object'||Array.isArray(h.log)) h.log={};
    if(!h.added) h.added=Date.now();
    if(typeof h.startTime!=='string') h.startTime='';
  });
  if(D.habits.length) D.habits[D.habits.length-1].stackedToNext=false;
}

function ensureFinance(){
  const base={income:[],expenses:[],recurring:[],categories:FINANCE_CATEGORIES};
  D.finance={...base,...(D.finance||{})};
  if(!Array.isArray(D.finance.income)) D.finance.income=[];
  if(!Array.isArray(D.finance.expenses)) D.finance.expenses=[];
  if(!Array.isArray(D.finance.recurring)) D.finance.recurring=[];
  if(!Array.isArray(D.finance.categories)) D.finance.categories=[];
  D.finance.expenses.forEach(e=>{
    if(!e.tag) e.tag=e.category||'Other';
    if(!e.category) e.category=e.tag;
    if(!e.name&&e.notes) e.name=e.notes;
  });
  const usedTags=D.finance.expenses.map(e=>e.tag||e.category).filter(Boolean);
  D.finance.categories=[...new Set([...FINANCE_CATEGORIES,...D.finance.categories,...usedTags])];
}

function ensureTodayFlow(){
  const today=dateStamp();
  if(!D.todayFlowOrder||typeof D.todayFlowOrder!=='object'||Array.isArray(D.todayFlowOrder)) D.todayFlowOrder={};
  const cutoff=new Date();cutoff.setDate(cutoff.getDate()-7);const cutoffStr=dateStamp(cutoff.getTime());
  Object.keys(D.todayFlowOrder).forEach(k=>{if(k<cutoffStr)delete D.todayFlowOrder[k];});
  if(!Array.isArray(D.todayTasks)) D.todayTasks=[];
  if(!Array.isArray(D.focusBlocks)) D.focusBlocks=[];
  if(!D.todayFlowOrder||typeof D.todayFlowOrder!=='object'||Array.isArray(D.todayFlowOrder)) D.todayFlowOrder={};
  D.todayTasks.forEach((t,i)=>{
    if(!t.id) t.id=`task_${t.createdAt||Date.now()}_${i}`;
    if(!t.date) t.date=t.createdAt?dateStamp(t.createdAt):today;
    if(typeof t.title!=='string') t.title='';
    if(typeof t.notes!=='string') t.notes='';
    t.completed=!!t.completed;
    if(!t.placementType) t.placementType='later';
    if(t.placementId===undefined) t.placementId='';
    t.order=Number.isFinite(Number(t.order))?Number(t.order):i;
    if(!t.createdAt) t.createdAt=Date.now();
  });
  D.focusBlocks.forEach((b,i)=>{
    if(!b.id) b.id=`focus_${b.createdAt||Date.now()}_${i}`;
    if(!b.date) b.date=b.createdAt?dateStamp(b.createdAt):today;
    if(typeof b.title!=='string') b.title='Deep Work';
    if(typeof b.type!=='string') b.type='Deep Work';
    if(typeof b.notes!=='string') b.notes='';
    b.duration=Math.max(5,Math.min(240,parseInt(b.duration)||selectedFocusMinutes?.()||60));
    b.completed=!!b.completed;
    if(!b.placementType) b.placementType='later';
    if(b.placementId===undefined) b.placementId='';
    b.order=Number.isFinite(Number(b.order))?Number(b.order):i;
    if(!b.createdAt) b.createdAt=Date.now();
  });
}

function migrateData(raw){
  const data=(raw&&typeof raw==='object'&&!Array.isArray(raw))?{...raw}:{};
  data.schemaVersion=Number(data.schemaVersion)||APP_SCHEMA_VERSION;
  if(!data.todayFlowOrder||typeof data.todayFlowOrder!=='object'||Array.isArray(data.todayFlowOrder)) data.todayFlowOrder={};

  // Future migrations should be additive and guarded by schemaVersion checks.
  // Example:
  // if(data.schemaVersion < 2) { ...non-destructive normalization... }

  return data;
}

function applyCoreData(data){
  data=migrateData(data);
  D.schemaVersion = data.schemaVersion || D.schemaVersion || APP_SCHEMA_VERSION;
  D.character   = data.character   || D.character;
  D.tags        = data.tags        || D.tags;
  D.tagColors   = data.tagColors   || D.tagColors;
  D.sessions    = data.sessions    || [];
  D.habits      = data.habits      || D.habits;
  D.reflections = data.reflections || [];
  D.meals       = data.meals       || {};
  D.profiles    = data.profiles    || [];
  D.goals       = data.goals       || {weekly:[],monthly:[]};
  D.todayTasks  = data.todayTasks  || [];
  D.focusBlocks = data.focusBlocks || [];
  D.todayFlowOrder = data.todayFlowOrder || {};
  D.mealLockedTimes = data.mealLockedTimes || [null,null,null,null,null];
  D.body        = data.body        || {weightLog:[],cardioLog:[]};
  D.finance     = data.finance     || D.finance;
  ensureHabitData();
  ensureFinance();
  ensureTodayFlow();
  ensureCharacter();
}

function coreSaveData(){
  ensureHabitData();
  ensureFinance();
  ensureTodayFlow();
  ensureCharacter();
  return {
    schemaVersion:D.schemaVersion,
    character:D.character,
    tags:D.tags,
    tagColors:D.tagColors,
    sessions:D.sessions,
    habits:D.habits,
    reflections:D.reflections,
    meals:D.meals,
    profiles:D.profiles,
    goals:D.goals,
    todayTasks:D.todayTasks,
    focusBlocks:D.focusBlocks,
    todayFlowOrder:D.todayFlowOrder,
    mealLockedTimes:D.mealLockedTimes,
    body:D.body,
    finance:D.finance
  };
}

// ══════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════
let authMode = 'signin'; // 'signin' | 'register'

function toggleAuthMode() {
  authMode = authMode === 'signin' ? 'register' : 'signin';
  document.getElementById('auth-main-btn').textContent = authMode === 'signin' ? 'Sign In' : 'Create Account';
  document.getElementById('auth-toggle-txt').innerHTML = authMode === 'signin'
    ? 'No account? <a onclick="toggleAuthMode()">Create one</a>'
    : 'Have an account? <a onclick="toggleAuthMode()">Sign in</a>';
  document.getElementById('auth-err').textContent = '';
}

function authAction() {
  const email = document.getElementById('auth-email').value.trim();
  const pw = document.getElementById('auth-pw').value;
  const errEl = document.getElementById('auth-err');
  errEl.textContent = '';
  if (!email || !pw) { errEl.textContent = 'Please enter email and password.'; return; }
  const btn = document.getElementById('auth-main-btn');
  btn.disabled = true; btn.textContent = '...';

  if (!firebaseReady) { errEl.textContent = 'Firebase not configured. Use offline mode.'; btn.disabled=false;btn.textContent=authMode==='signin'?'Sign In':'Create Account';return; }

  const promise = authMode === 'signin'
    ? auth.signInWithEmailAndPassword(email, pw)
    : auth.createUserWithEmailAndPassword(email, pw);

  promise.catch(e => {
    errEl.textContent = e.message.replace('Firebase: ','').replace(/\s*\(.*\)/,'');
    btn.disabled = false;
    btn.textContent = authMode === 'signin' ? 'Sign In' : 'Create Account';
  });
}

function authSkip() {
  // Offline / local-only mode
  document.getElementById('auth-overlay').classList.add('hid');
  document.getElementById('app').classList.remove('hid');
  setSyncStatus('offline', 'Offline mode — data saved locally');
  document.getElementById('user-email-lbl').textContent = 'Offline';
  const settingsUser=document.getElementById('settings-user-email');
  if(settingsUser) settingsUser.textContent='Offline';
  document.querySelector('.signout-btn').textContent = 'Exit';
  document.querySelector('.signout-btn').onclick = () => location.reload();
  ldLocal(); initApp();
}

function doSignOut() {
  if (unsubscribeSync) unsubscribeSync();
  if (auth) auth.signOut();
  location.reload();
}

// Auth state listener
if (firebaseReady) {
  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      document.getElementById('auth-overlay').classList.add('hid');
      document.getElementById('app').classList.remove('hid');
      document.getElementById('user-email-lbl').textContent = user.email;
      const settingsUser=document.getElementById('settings-user-email');
      if(settingsUser) settingsUser.textContent=user.email;
      setSyncStatus('pending', 'Loading your data...');
      startFirestoreSync(user.uid);
    }
  });
}

// ══════════════════════════════════════════
// SYNC STATUS
// ══════════════════════════════════════════
function setSyncStatus(state, msg) {
  const dot = document.getElementById('sync-dot');
  const txt = document.getElementById('sync-txt');
  dot.className = 'sync-dot ' + state;
  txt.textContent = msg;
  const settingsSync=document.getElementById('settings-sync-state');
  if(settingsSync) settingsSync.textContent=msg;
}

// ══════════════════════════════════════════
// FIRESTORE SYNC
// ══════════════════════════════════════════
function startFirestoreSync(uid) {
  const docRef = db.collection('users').doc(uid);

  // Real-time listener — fires on ANY device change
  unsubscribeSync = docRef.onSnapshot({ includeMetadataChanges: true }, doc => {
    // Skip if data is coming from local cache — only process confirmed server data
    if (doc.metadata.fromCache) return;
    snapshotCount++;
    lastSnapshotTime = new Date().toLocaleTimeString();
    if (doc.exists) {
      const data = migrateData(doc.data());
      applyCoreData(data);
      ldLocal(); // merge with localStorage for any unsaved offline changes
      refreshCurrentTab();
      setSyncStatus('ok', 'Synced');
    } else {
      // First time — no cloud data yet, use defaults/localStorage
      ldLocal();
      setSyncStatus('ok', 'Ready');
    }
    initApp();
  }, err => {
    console.warn('Firestore error:', err);
    setSyncStatus('err', 'Sync error — using local data');
    ldLocal(); initApp();
  });
}

async function sv() {
  // Always save locally first (instant, works offline)
  const payload=coreSaveData();
  localStorage.setItem('sce3', JSON.stringify(payload));

  // Then push to Firestore if online + authenticated
  if (db && currentUser) {
    setSyncStatus('pending', 'Saving...');
    try {
      await db.collection('users').doc(currentUser.uid).set({
        ...payload,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      setSyncStatus('ok', 'Synced');
    } catch(e) {
      setSyncStatus('err', 'Saved locally, sync failed');
    }
  }
}

function ldLocal() {
  const r = localStorage.getItem('sce3') || localStorage.getItem('sce2');
  if (r) {
    try {
      const p = JSON.parse(r);
      // Only use local data for fields that Firestore didn't provide
      if (!currentUser) {
        applyCoreData(migrateData(p));
      }
    } catch(e){}
  }
}

let appInited = false;
function initApp() {
  if (appInited) { refreshCurrentTab(); return; }
  appInited = true;
  ensureHabitData();
  ensureFinance();
  ensureTodayFlow();
  ensureCharacter();
  setupMobileMenuDismiss();
  initSlogFilter();
  renTags(); renSCnt(); renSlog(); renProfilesMini();
  // Set today's date on body inputs
  const today = new Date().toISOString().split('T')[0];
  const wd = document.getElementById('wlog-date');
  const cd = document.getElementById('cardio-date');
  const fid = document.getElementById('fin-income-date');
  const fed = document.getElementById('fin-expense-date');
  if(wd) wd.value = today;
  if(cd) cd.value = today;
  if(fid) fid.value = today;
  if(fed) fed.value = today;
  // Init cardio difficulty to 3
  selCardioDiff(3);
  refreshCurrentTab();
}

const TAB_GROUPS={
  today:['habits'],
  mind:['work'],
  health:['health-overview','meals','body'],
  purpose:['reflect'],
  character:['character'],
  analytics:['analytics'],
  settings:['settings'],
  strength:['strength'],
  wealth:['wealth'],
  connection:['connection'],
  habits:['habits'],
  work:['work'],
  meals:['meals'],
  body:['body'],
  reflect:['reflect']
};
function resolveTabIds(id){return TAB_GROUPS[id]||[id];}
function refreshTab(id){
  const ids=resolveTabIds(id);
  if(ids.includes('character')) renCharacter();
  if(ids.includes('habits')) { renHabits(); renCal(); }
  if(ids.includes('meals')) { renMeals(); renMealsCal(); }
  if(ids.includes('analytics')) renAnalytics();
  if(ids.includes('reflect')) { renGoals(); renStats(); }
  if(ids.includes('work')) { renTags(); renSCnt(); renSlog(); renProfilesMini(); }
  if(ids.includes('body')) renBody();
  if(ids.includes('wealth')) renWealth();
  if(ids.includes('settings')) renSettings();
}
function refreshCurrentTab() {
  const activeNav=document.querySelector('nav button.on');
  if(activeNav?.dataset.tab){refreshTab(activeNav.dataset.tab);return;}
  const on = document.querySelector('.tab.on');
  if (!on) return;
  refreshTab(on.id.replace('tab-',''));
}

function requestAppRender(reason='current'){
  if(reason==='today'||reason==='habits'){
    renHabits();
    renCal();
    return;
  }
  if(reason==='character'){
    renCharacter();
    return;
  }
  refreshCurrentTab();
}
function saveAndRender(reason='current'){
  sv();
  requestAppRender(reason);
}
// ══════════════════════════════════════════
// TABS
// ══════════════════════════════════════════
function showTab(id, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('nav button').forEach(b => b.classList.remove('on'));
  resolveTabIds(id).forEach(tabId=>document.getElementById('tab-'+tabId)?.classList.add('on'));
  (btn||document.querySelector(`nav button[data-tab="${id}"]`))?.classList.add('on');
  document.getElementById('main-nav')?.classList.remove('open');
  refreshTab(id);
}
function navigateToTab(id){
  showTab(id,document.querySelector(`nav button[data-tab="${id}"]`));
}
function toggleMobileMenu(){
  document.getElementById('main-nav')?.classList.toggle('open');
}
let mobileMenuDismissBound=false;
function setupMobileMenuDismiss(){
  if(mobileMenuDismissBound) return;
  mobileMenuDismissBound=true;
  document.addEventListener('click',e=>{
    const nav=document.getElementById('main-nav');
    if(!nav?.classList.contains('open')) return;
    if(nav.contains(e.target)||e.target.closest('.mobile-menu-btn')) return;
    nav.classList.remove('open');
  });
}
function updateMobileHeader(){
  ensureCharacter();
  const progress=getLevelProgress(D.character.totalXp);
  const el=document.getElementById('mobile-level-pill');
  if(el) el.textContent=`LVL ${progress.level}`;
}
function renSettings(){
  const user=document.getElementById('settings-user-email');
  const sync=document.getElementById('settings-sync-state');
  const firebase=document.getElementById('settings-firebase-state');
  const storage=document.getElementById('settings-storage-state');
  if(user) user.textContent=currentUser?.email||document.getElementById('user-email-lbl')?.textContent||'Offline';
  if(sync) sync.textContent=document.getElementById('sync-txt')?.textContent||'Offline';
  if(firebase) firebase.textContent=firebaseReady?'Ready':'Offline only';
  if(storage) storage.textContent=localStorage.getItem('sce3')?'Saved locally':'No local cache yet';
}

// ══════════════════════════════════════════
// CHARACTER FOUNDATION
// ══════════════════════════════════════════
function statKey(label){return label.toLowerCase();}
// ══════════════════════════════════════════
// TAG COLORS & DROPDOWN
// ══════════════════════════════════════════
// Phase 2 XP and progression helpers override the small Phase 1 character renderer above.
function escapeHtml(str){
  return String(str??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function stopUiEvent(event){
  event?.preventDefault?.();
  event?.stopPropagation?.();
}
function capStat(k){return STAT_UI[k]?.label||k.charAt(0).toUpperCase()+k.slice(1);}
function dateStamp(ts=Date.now()){
  const d=new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function rewardDateKey(ts=Date.now()){return dkey(new Date(ts));}
function getCharacter(){ensureCharacter();return D.character;}
function saveCharacterIfNeeded(){ensureCharacter();sv();renderCharacter();}

function xpRequiredForLevel(level){
  const cfg=XP_CURVE_CONFIG;
  const lvl=Math.max(1,Math.min(cfg.maxLevel-1,Math.floor(level)||1));
  return Math.round(cfg.xpBase*Math.pow(lvl,cfg.xpExponent));
}
function totalXpRequiredForLevel(level){
  const lvl=Math.max(1,Math.min(XP_CURVE_CONFIG.maxLevel,Math.floor(level)||1));
  let total=0;
  for(let l=1;l<lvl;l++) total+=xpRequiredForLevel(l);
  return total;
}
function calculateLevel(totalXp){
  const cfg=XP_CURVE_CONFIG;
  const xp=Math.max(0,Number(totalXp)||0);
  let level=1,needed=0;
  while(level<cfg.maxLevel){
    const next=xpRequiredForLevel(level);
    if(xp<needed+next) break;
    needed+=next;level++;
  }
  return level;
}
function calculateRank(level){
  const cfg=XP_CURVE_CONFIG;
  const lvl=Math.max(1,Math.min(cfg.maxLevel,Math.floor(level)||1));
  if(lvl>=cfg.maxLevel) return cfg.maxRanks;
  return Math.max(1,Math.min(cfg.maxRanks,Math.ceil(lvl/cfg.rankSize)));
}
function getRankInfo(level){
  const lvl=Math.max(1,Math.min(XP_CURVE_CONFIG.maxLevel,Math.floor(level)||1));
  const info=RANKS.find(r=>lvl>=r.minLevel&&lvl<=r.maxLevel)||RANKS[0];
  return {...info,rankNumber:calculateRank(lvl)};
}
function getLevelProgress(totalXp){
  const cfg=XP_CURVE_CONFIG;
  const xp=Math.max(0,Number(totalXp)||0);
  const level=calculateLevel(xp);
  const rank=calculateRank(level);
  if(level>=cfg.maxLevel) return{level,rank,currentLevelXp:0,xpForNextLevel:0,progressPercent:100,xpIntoCurrentLevel:0,xpRemaining:0};
  const currentLevelXp=totalXpRequiredForLevel(level);
  const xpForNextLevel=xpRequiredForLevel(level);
  const xpIntoCurrentLevel=Math.max(0,xp-currentLevelXp);
  const xpRemaining=Math.max(0,xpForNextLevel-xpIntoCurrentLevel);
  const progressPercent=Math.max(0,Math.min(100,Math.round((xpIntoCurrentLevel/xpForNextLevel)*100)));
  return{level,rank,currentLevelXp,xpForNextLevel,progressPercent,xpIntoCurrentLevel,xpRemaining};
}

function qualityFromFocus(focus){
  const f=Number(focus)||3;
  if(f<=2) return 'low';
  if(f===3) return 'normal';
  if(f===4) return 'good';
  return 'excellent';
}
function qualityModifier(q){return({low:.75,normal:1,good:1.15,excellent:1.3})[q]||1;}
function difficultyModifier(difficulty){return({easy:1,normal:1,some:1.1,'some resistance':1.1,hard:1.25,'hard to start':1.25,veryHard:1.4,'very hard':1.4,heroic:1.6})[difficulty]||1;}
function customTaskXp(size){return({tiny:5,small:15,medium:35,large:75,epic:150})[size]||15;}
function existingCategoryMinutes(date,category){
  const events=D.character?.xpEvents||[];
  return events.filter(e=>e.date===date&&e.category===category).reduce((a,e)=>a+(Number(e.durationMinutes)||0),0);
}
function applyDiminishingReturns(minutes,{date=dateStamp(),category='general'}={}){
  let remaining=Math.max(0,Number(minutes)||0);
  let used=existingCategoryMinutes(date,category);
  let effective=0;
  const bands=[{limit:180,mult:1},{limit:360,mult:.8},{limit:540,mult:.6},{limit:Infinity,mult:.3}];
  for(const band of bands){
    if(!remaining) break;
    const room=Math.max(0,band.limit-used);
    const take=Math.min(remaining,room);
    effective+=take*band.mult;
    remaining-=take;
    used+=take;
  }
  return effective;
}
function calculateTimedXp(minutes,rate,quality='normal',difficulty='easy',opts={}){
  const effective=applyDiminishingReturns(minutes,opts);
  return Math.max(0,Math.round(effective*rate*qualityModifier(quality)*difficultyModifier(difficulty)));
}
function calculateFixedXp(amount,difficulty='easy'){return Math.max(0,Math.round((Number(amount)||0)*difficultyModifier(difficulty)));}

function hasRewardBeenGranted(key){ensureCharacter();return !!D.character.rewarded[key];}
function markRewardGranted(key){ensureCharacter();D.character.rewarded[key]=true;}
function clearRewardGranted(key){ensureCharacter();delete D.character.rewarded[key];}
function makeXpEvent({type,sourceSection,label,linkedEntityId,rewardKey,generalXp=0,statXp={},primaryStat='',secondaryStat='',durationMinutes=0,quality='normal',difficulty='easy',notes='',timestamp=Date.now(),category='general'}){
  const cleanStats={};
  CHARACTER_STAT_KEYS.forEach(k=>{if(statXp[k]) cleanStats[k]=Math.round(statXp[k]);});
  return{
    id:'xp_'+timestamp+'_'+Math.random().toString(36).slice(2,8),
    date:dateStamp(timestamp),timestamp,type,sourceSection,
    label:String(label||type||'Action'),
    linkedEntityId:linkedEntityId||rewardKey||'',
    rewardKey:rewardKey||'',
    generalXp:Math.max(0,Math.round(generalXp)||0),
    statXp:cleanStats,
    primaryStat,secondaryStat,
    durationMinutes:Math.round(Number(durationMinutes)||0),
    quality,difficulty,category,
    notes:String(notes||'')
  };
}
function addXpEvent(event,{showToast=false}={}){
  ensureCharacter();
  if(!event||!event.rewardKey||hasRewardBeenGranted(event.rewardKey)) return 0;
  D.character.xpEvents.push(event);
  markRewardGranted(event.rewardKey);
  recalculateCharacterFromEvents();
  if(showToast&&event.generalXp) toast(`+${event.generalXp} XP`);
  if(document.getElementById('tab-character')?.classList.contains('on')) renderCharacter();
  return event.generalXp;
}
function removeXpEventByRewardKey(rewardKey,{save=true}={}){
  if(!rewardKey) return 0;
  ensureCharacter();
  const before=D.character.xpEvents.length;
  D.character.xpEvents=D.character.xpEvents.filter(e=>e.rewardKey!==rewardKey&&e.linkedEntityId!==rewardKey);
  clearRewardGranted(rewardKey);
  const removed=before-D.character.xpEvents.length;
  if(!removed) return 0;
  recalculateCharacterFromEvents();
  if(document.getElementById('tab-character')?.classList.contains('on')) renderCharacter();
  if(save) sv();
  return removed;
}
function removeXpEventsByRewardPrefix(prefix,{save=true}={}){
  if(!prefix) return 0;
  ensureCharacter();
  const removedKeys=new Set();
  const before=D.character.xpEvents.length;
  D.character.xpEvents=D.character.xpEvents.filter(e=>{
    const match=String(e.rewardKey||'').startsWith(prefix);
    if(match) removedKeys.add(e.rewardKey);
    return !match;
  });
  removedKeys.forEach(k=>clearRewardGranted(k));
  const removed=before-D.character.xpEvents.length;
  if(!removed) return 0;
  recalculateCharacterFromEvents();
  if(document.getElementById('tab-character')?.classList.contains('on')) renderCharacter();
  if(save) sv();
  return removed;
}
function calculateStatsFromEvents(events){
  const stats={};CHARACTER_STAT_KEYS.forEach(k=>stats[k]=0);
  (events||[]).forEach(e=>{Object.entries(e.statXp||{}).forEach(([k,v])=>{if(k in stats) stats[k]+=Number(v)||0;});});
  return stats;
}
function recalculateCharacterFromEvents(){
  const c=D.character;if(!c)return;
  const events=Array.isArray(c.xpEvents)?c.xpEvents:[];
  if(events.length){
    c.totalXp=events.reduce((a,e)=>a+(Number(e.generalXp)||0),0);
    c.stats=calculateStatsFromEvents(events);
  } else {
    c.totalXp=0;
    c.stats={...defaultCharacter().stats};
  }
  c.xp=c.totalXp;
  CHARACTER_STAT_KEYS.forEach(k=>{c.stats[k]=Number(c.stats[k])||0;});
  c.meta={consistency:c.stats.consistency||0,resolve:c.stats.resolve||0};
  const progress=getLevelProgress(c.totalXp);
  const rankInfo=getRankInfo(progress.level);
  c.level=progress.level;c.rank=rankInfo.rankNumber;c.rankName=rankInfo.title;c.title=rankInfo.title;
  c.maxLevel=XP_CURVE_CONFIG.maxLevel;c.maxRank=XP_CURVE_CONFIG.maxRanks;c.maxRanks=XP_CURVE_CONFIG.maxRanks;
}

function getTopStats(stats,keys=MAIN_STAT_KEYS){
  return keys.map(k=>({key:k,value:Number(stats[k])||0})).sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key));
}
function getStrongestWeakestStats(stats){
  const all=CHARACTER_STAT_KEYS.map(k=>({key:k,value:Number(stats[k])||0}));
  return{strongest:[...all].sort((a,b)=>b.value-a.value)[0]||{key:'intelligence',value:0},weakest:[...all].sort((a,b)=>a.value-b.value)[0]||{key:'intelligence',value:0}};
}
function generateRole(stats){
  const main=MAIN_STAT_KEYS.map(k=>Number(stats[k])||0);
  const highest=Math.max(...main),lowest=Math.min(...main);
  if(highest>0&&lowest>0&&(highest-lowest)<=highest*.2) return 'Renaissance Soul';
  const top=getTopStats(stats).slice(0,2);
  if(!top.length||top[0].value<=0) return 'Developing Master';
  if(top[0].key==='intelligence'&&top[0].value>=40&&(Number(stats.health)||0)<=top[0].value*.25) return 'Overloaded Scholar';
  if(top[0].key==='strength'&&top[0].value>=40&&(Number(stats.purpose)||0)<=top[0].value*.25) return 'Unanchored Warrior';
  if(top[0].key==='wealth'&&top[0].value>=40&&(Number(stats.connection)||0)<=top[0].value*.25) return 'Isolated Achiever';
  if(top[0].key==='purpose'&&top[0].value>=40&&(Number(stats.wealth)||0)<=top[0].value*.25) return 'Dreamer Without Ground';
  const pair=[top[0].key,top[1]?.key||''].sort().join('+');
  return({
    'intelligence+purpose':'Philosopher','intelligence+wealth':'Strategist','intelligence+strength':'Warrior-Scholar',
    'health+intelligence':'Optimized Scholar','connection+intelligence':'Mentor','health+strength':'Athlete',
    'purpose+strength':'Ascetic Warrior','strength+wealth':'Ambitious Builder','connection+strength':'Protector',
    'purpose+wealth':'Steward','connection+wealth':'Networker','connection+purpose':'Guide',
    'connection+health':'Harmonizer','health+purpose':'Grounded Seeker'
  })[pair]||'Developing Master';
}
function generateSuggestion(stats){
  const weakest=getStrongestWeakestStats(stats).weakest.key;
  return({
    intelligence:'Intelligence is your least trained area. Do one focused 25-minute learning session.',
    health:'Health is your least trained area. Log a meal, take a 20-minute walk, or do one small recovery action.',
    strength:'Strength is your least trained area. Complete one short resistance workout.',
    wealth:'Wealth is your least trained area. A 10-minute expense or budget review would bring balance.',
    connection:'Connection is your least trained area. Send one genuine message to someone you care about.',
    purpose:'Purpose is your least trained area. Write one sentence about what matters this week.',
    consistency:'Consistency is your least trained area. Complete one tiny habit today.',
    resolve:'Resolve is your least trained area. Do one thing you have been avoiding.'
  })[weakest]||'Complete one meaningful action to keep building your character.';
}

function renStatGrid(id,labels,values){
  const el=document.getElementById(id);if(!el)return;
  const keys=labels.map(statKey);
  const max=Math.max(1,...keys.map(k=>Number(values[k])||0));
  el.innerHTML=labels.map(label=>{
    const key=statKey(label);
    const val=Math.max(0,Math.round(Number(values[key])||0));
    const pct=val?Math.max(4,Math.round(val/max*100)):0;
    const ui=STAT_UI[key]||{label,icon:'✦',color:'#0e8bba'};
    return`<div class="stat-row" style="--stat-color:${ui.color}">
      <div class="stat-icon">${ui.icon}</div>
      <div class="stat-body">
        <div class="stat-top"><span>${ui.label}</span><span class="stat-val">${val}</span></div>
        <div class="stat-bar"><div class="stat-fill" style="width:${pct}%"></div></div>
        <div class="stat-desc">${STAT_DESCRIPTIONS[key]||''}</div>
      </div>
    </div>`;
  }).join('');
}
function renderRecentXp(events){
  const el=document.getElementById('xp-event-list');if(!el)return;
  const recent=[...(events||[])].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).slice(0,10);
  if(!recent.length){el.innerHTML='<p style="font-size:.8rem;color:var(--mut)">No XP events yet. Complete a study session, habit, meal, goal, cardio log, or weight log to begin.</p>';return;}
  el.innerHTML=recent.map(e=>{
    const gains=Object.entries(e.statXp||{}).map(([k,v])=>`${capStat(k)} +${Math.round(v)}`).join(' - ');
    return`<div class="xp-event">
      <div class="xp-event-top"><span class="xp-event-title">${escapeHtml(e.label)}</span><span class="xp-event-xp">+${Math.round(e.generalXp||0)} XP</span></div>
      <div class="xp-event-meta">${escapeHtml(e.date||dateStamp(e.timestamp))} - ${escapeHtml(e.type||'action')}</div>
      <div class="xp-stat-gains">${escapeHtml(gains)}</div>
    </div>`;
  }).join('');
}
function renderCharacter(){
  ensureCharacter();
  const c=D.character;
  const progress=getLevelProgress(c.totalXp);
  const rankInfo=getRankInfo(progress.level);
  const role=generateRole(c.stats);
  const sw=getStrongestWeakestStats(c.stats);
  const totalMain=MAIN_STAT_KEYS.reduce((a,k)=>a+(Number(c.stats[k])||0),0);
  document.getElementById('char-title-line').textContent=`${role} - ${rankInfo.title}`;
  document.getElementById('char-level-pill').textContent=`Level ${progress.level} / ${XP_CURVE_CONFIG.maxLevel}`;
  document.getElementById('char-rank-pill').textContent=`Rank ${rankInfo.rankNumber} / ${XP_CURVE_CONFIG.maxRanks} - ${rankInfo.title}`;
  document.getElementById('char-total-xp-pill').textContent=`${Math.round(c.totalXp)} XP`;
  document.getElementById('char-rank-desc').textContent=rankInfo.description;
  document.getElementById('char-rank-badge').textContent=progress.level>=250?'ML':`R${rankInfo.rankNumber}`;
  document.getElementById('char-xp-fill').style.width=`${progress.progressPercent}%`;
  document.getElementById('char-xp-progress-label').textContent=progress.level>=250?'Max Level':`${progress.xpIntoCurrentLevel} / ${progress.xpForNextLevel} XP`;
  document.getElementById('char-xp-remaining').textContent=progress.level>=250?'Master of Life achieved':`${progress.xpRemaining} XP to next level`;
  document.getElementById('char-role').textContent=role;
  document.getElementById('char-balance').textContent=totalMain?'Training in progress':'Just beginning';
  document.getElementById('char-strongest').textContent=sw.strongest.value?`${capStat(sw.strongest.key)} leads with ${sw.strongest.value} stat XP. ${capStat(sw.weakest.key)} is ready for attention.`:'Your first stat will appear after your next rewarded action.';
  document.getElementById('char-suggestion').textContent=generateSuggestion(c.stats);
  const actions=document.getElementById('char-actions');
  if(actions) actions.style.display=(c.xpEvents.length<5)?'flex':'none';
  renStatGrid('life-stat-grid',LIFE_STAT_LABELS,c.stats);
  renStatGrid('meta-stat-grid',META_STAT_LABELS,c.stats);
  renderRecentXp(c.xpEvents);
}
function renCharacter(){renderCharacter();}

function showXpFloat(targetEl,amount){
  if(!targetEl||!amount) return;
  const rect=targetEl.getBoundingClientRect?.();
  if(!rect) return;
  const el=document.createElement('div');
  el.className='xp-float';
  el.textContent=`+${Math.round(amount)} XP`;
  el.style.left=(rect.left+rect.width/2)+'px';
  el.style.top=(rect.top+Math.min(rect.height*.35,18))+'px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),950);
}
function stableTextKey(str){
  return String(str||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'item';
}
function habitRewardKey(h,dateKey){return `habit:${h?.id||stableTextKey(h?.id2||h?.name)}:${dateKey}`;}
function mealRewardKey(idx,dateKey){return `meal:${dateKey}:${idx}`;}
function goalRewardKey(type,goal){
  if(type==='daily') return `goal:daily:${goal?.date||dateStamp()}:${goal?.id||goal?.added||stableTextKey(goal?.text)}`;
  return `goal:${type}:${goal?.id||goal?.added||stableTextKey(goal?.text)}`;
}
function weightRewardKey(entryOrDate){const date=typeof entryOrDate==='string'?entryOrDate:entryOrDate?.date;return date?`weight:${date}`:'';}
function cardioRewardKey(entry){return entry?`cardio:${entry.ts||`${entry.date}:${Number(entry.duration)||0}`}`:'';}
function habitRewardPrefix(h){return `habit:${h?.id||stableTextKey(h?.id2||h?.name)}:`;}
function timestampFromLooseDateKey(key){
  const p=String(key||'').split('-').map(Number);
  if(p.length===3&&p.every(n=>Number.isFinite(n))) return new Date(p[0],p[1],p[2],12).getTime();
  return Date.now();
}
function timestampFromIsoDate(date){
  const ts=Date.parse(String(date||'')+'T12:00:00');
  return Number.isFinite(ts)?ts:Date.now();
}
function normalizeDifficulty(value){
  const n=Number(value);
  if(n>=6) return 'veryHard';
  if(n>=5) return 'hard';
  if(n>=4) return 'some';
  return 'easy';
}
function studyRewardKey(s){
  return `study_session:${s.id||[s.ts||'',stableTextKey(s.tag),stableTextKey(s.h20)].join(':')}`;
}
function guessHabitPrimaryStat(h){
  const text=`${h?.name||''} ${h?.id2||''} ${h?.sk||''} ${h?.tm||''}`.toLowerCase();
  if(/gym|lift|strength|calisthenic|push|pull|squat|deadlift|bench|muscle/.test(text)) return 'strength';
  if(/meal|food|sleep|walk|cardio|run|weight|health|body|water|recovery|stretch/.test(text)) return 'health';
  if(/study|read|write|learn|course|research|paper|language|lecture|note/.test(text)) return 'intelligence';
  if(/money|finance|budget|expense|saving|income|debt|invest/.test(text)) return 'wealth';
  if(/friend|family|partner|message|call|social|gratitude|help|conversation/.test(text)) return 'connection';
  if(/goal|purpose|plan|reflect|value|meaning|vision|pray|meditat/.test(text)) return 'purpose';
  return 'consistency';
}
function maybeAwardStudyXp(session,{showToast=false}={}){
  if(!session) return false;
  const ts=Number(session.ts)||Date.now();
  const minutes=Math.max(1,Math.round((Number(session.hours)||1)*60));
  const quality=qualityFromFocus(session.focus);
  const generalXp=calculateTimedXp(minutes,1.5,quality,'easy',{date:dateStamp(ts),category:'study'});
  const hasReflection=String(session.recall||'').trim().length>=20;
  const statXp=hasReflection
    ? {intelligence:Math.round(generalXp*.72),consistency:Math.round(generalXp*.18),purpose:Math.round(generalXp*.10)}
    : {intelligence:Math.round(generalXp*.8),consistency:Math.round(generalXp*.2)};
  return addXpEvent(makeXpEvent({
    type:'study_session',sourceSection:'getSmarter',label:session.h20||session.tag||'Study session',
    linkedEntityId:session.id||String(session.ts||''),rewardKey:studyRewardKey(session),
    generalXp,statXp,primaryStat:'intelligence',secondaryStat:hasReflection?'purpose':'consistency',
    durationMinutes:minutes,quality,difficulty:'easy',timestamp:ts,category:'study'
  }),{showToast});
}
function maybeAwardHabitXp(h,dateKey,{showToast=false}={}){
  if(!h||!dateKey) return false;
  const primary=guessHabitPrimaryStat(h);
  const statXp=primary==='consistency'?{consistency:10}:{[primary]:2,consistency:8};
  return addXpEvent(makeXpEvent({
    type:'habit_completion',sourceSection:'habits',label:h.name||h.id2||'Habit completed',
    linkedEntityId:h.id||stableTextKey(h.id2||h.name),rewardKey:habitRewardKey(h,dateKey),
    generalXp:10,statXp,primaryStat:primary,secondaryStat:'consistency',
    timestamp:timestampFromLooseDateKey(dateKey),quality:'normal',difficulty:'easy'
  }),{showToast});
}
function maybeAwardMealXp(idx,dateKey,{showToast=false}={}){
  const slots=D.meals?.[dateKey]||[];
  const label=slots[idx]?.label||MEAL_LABELS[idx]||`Meal ${idx+1}`;
  return addXpEvent(makeXpEvent({
    type:'meal_completed',sourceSection:'meals',label:`${label} completed`,
    linkedEntityId:`${dateKey}:${idx}`,rewardKey:mealRewardKey(idx,dateKey),
    generalXp:8,statXp:{health:6,consistency:2},primaryStat:'health',secondaryStat:'consistency',
    timestamp:timestampFromLooseDateKey(dateKey),quality:'normal',difficulty:'easy'
  }),{showToast});
}
function maybeAwardCardioXp(entry,{showToast=false}={}){
  if(!entry) return false;
  const ts=entry.ts||timestampFromIsoDate(entry.date);
  const minutes=Number(entry.duration)||0;
  const difficulty=normalizeDifficulty(entry.difficulty);
  const generalXp=minutes>0?calculateTimedXp(minutes,1.3,'normal',difficulty,{date:dateStamp(ts),category:'cardio'}):25;
  return addXpEvent(makeXpEvent({
    type:'cardio_logged',sourceSection:'body',label:`Cardio ${minutes||''} min`.trim(),
    linkedEntityId:String(entry.ts||`${entry.date}:${minutes}`),rewardKey:cardioRewardKey(entry),
    generalXp,statXp:{health:Math.round(generalXp*.8),consistency:Math.round(generalXp*.2)},
    primaryStat:'health',secondaryStat:'consistency',durationMinutes:minutes||null,
    timestamp:ts,quality:'normal',difficulty,category:'cardio'
  }),{showToast});
}
function maybeAwardWeightXp(entry,{showToast=false}={}){
  if(!entry?.date) return false;
  return addXpEvent(makeXpEvent({
    type:'weight_logged',sourceSection:'body',label:'Weight logged',
    linkedEntityId:entry.date,rewardKey:weightRewardKey(entry),
    generalXp:5,statXp:{health:3,consistency:2},primaryStat:'health',secondaryStat:'consistency',
    timestamp:timestampFromIsoDate(entry.date),quality:'normal',difficulty:'easy'
  }),{showToast});
}
function maybeAwardGoalXp(type,goal,{showToast=false}={}){
  if(!goal) return false;
  if(type==='daily') return addXpEvent(makeXpEvent({
    type:'daily_goal_completed',sourceSection:'goals',label:goal.text||'Daily goal completed',
    linkedEntityId:goal.id||String(goal.added||stableTextKey(goal.text)),rewardKey:goalRewardKey(type,goal),
    generalXp:20,statXp:{purpose:14,consistency:6},
    primaryStat:'purpose',secondaryStat:'consistency',timestamp:goal.doneAt||Date.now(),quality:'normal',difficulty:'easy'
  }),{showToast});
  const monthly=type==='monthly';
  return addXpEvent(makeXpEvent({
    type:`${type}_goal_completed`,sourceSection:'goals',label:goal.text||`${monthly?'Monthly':'Weekly'} goal completed`,
    linkedEntityId:goal.id||String(goal.added||stableTextKey(goal.text)),rewardKey:goalRewardKey(type,goal),
    generalXp:monthly?100:40,statXp:monthly?{purpose:80,consistency:20}:{purpose:30,consistency:10},
    primaryStat:'purpose',secondaryStat:'consistency',timestamp:goal.doneAt||Date.now(),quality:'normal',difficulty:'easy'
  }),{showToast});
}
function maybeAwardReflectionXp(reflection,index,{showToast=false}={}){
  if(!reflection) return false;
  const text=typeof reflection==='string'?reflection:(reflection.text||reflection.note||reflection.recall||'Reflection');
  const ts=reflection.ts||reflection.added||Date.now();
  return addXpEvent(makeXpEvent({
    type:'reflection_added',sourceSection:'goals',label:text||'Reflection added',
    linkedEntityId:reflection.id||String(index||ts),rewardKey:`reflection:${reflection.id||ts||index}`,
    generalXp:25,statXp:{purpose:15,intelligence:7,consistency:3},
    primaryStat:'purpose',secondaryStat:'intelligence',timestamp:ts,quality:'normal',difficulty:'easy'
  }),{showToast});
}
function financeIncomeRewardKey(item){return item?.id?`finance_income:${item.id}`:'';}
function financeExpenseRewardKey(item){return item?.id?`finance_expense:${item.id}`:'';}
function maybeAwardFinanceXp(kind,item,{showToast=false}={}){
  if(!item) return false;
  const income=kind==='income';
  return addXpEvent(makeXpEvent({
    type:income?'finance_income_logged':'finance_expense_logged',
    sourceSection:'wealth',
    label:income?`Income: ${item.source||'Income'}`:`Expense: ${item.name||item.tag||item.category||'Expense'}`,
    linkedEntityId:item.id,
    rewardKey:income?financeIncomeRewardKey(item):financeExpenseRewardKey(item),
    generalXp:8,
    statXp:{wealth:6,consistency:2},
    primaryStat:'wealth',
    secondaryStat:'consistency',
    timestamp:item.createdAt||Date.now(),
    quality:'normal',
    difficulty:'easy',
    category:'finance'
  }),{showToast});
}
function todayTaskRewardKey(task,dateKey=task?.date||todayDateKey()){return task?.id?`today_task:${dateKey}:${task.id}`:'';}
function getTodayTaskXp(task){return task?.title?5:0;}
function maybeAwardTodayTaskXp(task,{showToast=false}={}){
  if(!task) return 0;
  const xp=getTodayTaskXp(task);
  if(!xp) return 0;
  const timestamp=task.completedAt||Date.now();
  return addXpEvent(makeXpEvent({
    type:'today_task_completed',
    sourceSection:'today',
    label:`Completed task: ${task.title||'Quick task'}`,
    linkedEntityId:task.id,
    rewardKey:todayTaskRewardKey(task),
    generalXp:xp,
    statXp:{consistency:xp},
    primaryStat:'consistency',
    secondaryStat:'',
    timestamp,
    quality:'normal',
    difficulty:'easy',
    category:'today_task'
  }),{showToast});
}
function focusBlockRewardKey(block,dateKey=block?.date||todayDateKey()){return block?.id?`focus_block:${dateKey}:${block.id}`:'';}
function getFocusBlockXp(block){
  const minutes=Number(block?.duration)||0;
  if(minutes>=60) return 25;
  if(minutes>=30) return 15;
  return 10;
}
function maybeAwardFocusBlockXp(block,{showToast=false}={}){
  if(!block) return 0;
  const xp=getFocusBlockXp(block);
  const timestamp=block.completedAt||Date.now();
  return addXpEvent(makeXpEvent({
    type:'focus_block_completed',
    sourceSection:'today',
    label:`Completed focus block: ${block.title||'Focus block'}`,
    linkedEntityId:block.id,
    rewardKey:focusBlockRewardKey(block),
    generalXp:xp,
    statXp:{intelligence:Math.round(xp*.7),consistency:Math.max(1,Math.round(xp*.3))},
    primaryStat:'intelligence',
    secondaryStat:'consistency',
    durationMinutes:Number(block.duration)||0,
    timestamp,
    quality:'normal',
    difficulty:'easy',
    category:'focus_block'
  }),{showToast});
}
function importXpFromHistory(){
  ensureCharacter();
  let count=0;
  (D.sessions||[]).forEach(s=>{if(maybeAwardStudyXp(s)) count++;});
  (D.habits||[]).forEach(h=>Object.entries(h.log||{}).forEach(([k,v])=>{if(v&&maybeAwardHabitXp(h,k)) count++;}));
  Object.entries(D.meals||{}).forEach(([k,slots])=>(slots||[]).forEach((slot,i)=>{if(slot?.eaten&&maybeAwardMealXp(i,k)) count++;}));
  ensureBody();
  (D.body.weightLog||[]).forEach(e=>{if(maybeAwardWeightXp(e)) count++;});
  (D.body.cardioLog||[]).forEach(e=>{if(maybeAwardCardioXp(e)) count++;});
  ensureGoalsStructure();
  Object.values(D.goals.dailyByDate||{}).flat().forEach(g=>{if(g.done&&maybeAwardGoalXp('daily',g)) count++;});
  (D.goals.weekly||[]).forEach(g=>{if(g.done&&maybeAwardGoalXp('weekly',g)) count++;});
  (D.goals.monthly||[]).forEach(g=>{if(g.done&&maybeAwardGoalXp('monthly',g)) count++;});
  (D.reflections||[]).forEach((r,i)=>{if(maybeAwardReflectionXp(r,i)) count++;});
  sv();renderCharacter();
  toast(count?`Imported ${count} XP event${count!==1?'s':''}.`:'No new history XP to import.');
}

const TAG_PALETTE=['#14CEFF','#2EED00','#F21B1B','#f5a000','#a855f7','#06b6d4','#f59e0b','#10b981','#e11d48',
  '#3b82f6','#ec4899','#84cc16','#14b8a6','#fb923c','#8b5cf6','#22d3ee','#facc15','#4ade80','#f87171','#c084fc',
  '#60a5fa','#34d399','#fb7185','#a3e635','#38bdf8','#e879f9','#fbbf24','#6ee7b7','#93c5fd','#fca5a5'];

function getTagColor(t){return D.tagColors[t]||TAG_PALETTE[D.tags.indexOf(t)%TAG_PALETTE.length]||'#14CEFF';}

let tagDropdownOpen=false;
function toggleTagDropdown(){
  tagDropdownOpen=!tagDropdownOpen;
  const list=document.getElementById('tag-dropdown-list');
  list.classList.toggle('hid',!tagDropdownOpen);
  if(tagDropdownOpen) renderTagDropdownList();
}
function closeTagDropdown(){tagDropdownOpen=false;document.getElementById('tag-dropdown-list')?.classList.add('hid');}

function renTags(){
  // Update the selected button
  const dot=document.getElementById('tag-sel-dot');
  const lbl=document.getElementById('tag-sel-label');
  if(dot&&lbl){
    const c=D.atag?getTagColor(D.atag):'var(--bdr)';
    dot.style.background=c;
    lbl.textContent=D.atag||'Select tag';
  }
  if(tagDropdownOpen) renderTagDropdownList();
}

function renderTagDropdownList(){
  const list=document.getElementById('tag-dropdown-list');
  if(!list) return;
  list.innerHTML=D.tags.map(t=>`
    <div class="tag-dropdown-item ${D.atag===t?'active':''}" onclick="selTag('${t.replace(/'/g,"\\'")}')">
      <span class="tag-dot" style="background:${getTagColor(t)}"></span>
      <span style="flex:1">${t}</span>
      <button class="tag-edit-color" onclick="event.stopPropagation();showColorPicker('${t.replace(/'/g,"\\'")}')">🎨</button>
    </div>`).join('');
}

function selTag(t){D.atag=t;closeTagDropdown();renTags();}

// Close dropdown when clicking outside
document.addEventListener('click',e=>{
  const wrap=document.getElementById('tag-dropdown-wrap');
  if(wrap&&!wrap.contains(e.target)) closeTagDropdown();
});

function showTagAddModal(){
  document.getElementById('mod').innerHTML=`
    <h2>New Tag</h2>
    <label>Tag name</label><input type="text" id="new-tag-name" placeholder="Tag name" maxlength="30" class="mb10">
    <label>Color</label>
    <div class="color-swatches" id="new-tag-swatches" style="margin-bottom:14px">
      ${TAG_PALETTE.map((c,i)=>`<div class="cswatch ${i===0?'picked':''}" style="background:${c}" onclick="pickNewTagColor(this,'${c}')"></div>`).join('')}
    </div>
    <div class="brow"><button class="btn bp" onclick="confirmNewTag()">Add Tag</button><button class="btn bs" onclick="closeMod()">Cancel</button></div>`;
  document.getElementById('mov').classList.remove('hid');
  setTimeout(()=>document.getElementById('new-tag-name').focus(),50);
}
let _pendingTagColor=TAG_PALETTE[0];
function pickNewTagColor(el,color){
  document.querySelectorAll('#new-tag-swatches .cswatch').forEach(e=>e.classList.remove('picked'));
  el.classList.add('picked');_pendingTagColor=color;
}
function confirmNewTag(){
  const n=document.getElementById('new-tag-name').value.trim();
  if(!n){toast('Enter a tag name.');return;}
  if(D.tags.includes(n)){toast('Tag already exists.');return;}
  D.tags.push(n);D.tagColors[n]=_pendingTagColor;D.atag=n;sv();closeMod();renTags();
}

function showColorPicker(t){
  const cur=getTagColor(t);
  document.getElementById('mod').innerHTML=`
    <h2>Color for "${t}"</h2>
    <div class="color-swatches" id="cpick-swatches" style="margin-bottom:10px">
      ${TAG_PALETTE.map(c=>`<div class="cswatch ${c===cur?'picked':''}" style="background:${c}" onclick="pickTagColor(this,'${c}')"></div>`).join('')}
    </div>
    <div class="brow"><button class="btn bp" onclick="saveTagColor('${t.replace(/'/g,"\\'")}')">Save</button><button class="btn bs" onclick="closeMod()">Cancel</button></div>`;
  document.getElementById('mov').classList.remove('hid');
}
let _pendingColor=null;
function pickTagColor(el,color){
  document.querySelectorAll('#cpick-swatches .cswatch').forEach(e=>e.classList.remove('picked'));
  el.classList.add('picked');_pendingColor=color;
}
function saveTagColor(t){
  if(_pendingColor){D.tagColors[t]=_pendingColor;sv();}
  closeMod();renTags();
}
function showTagInput(){showTagAddModal();}
function confirmTag(){confirmNewTag();}

// ══════════════════════════════════════════
// ALARM SOUND
// ══════════════════════════════════════════
function playAlarm(type='work'){
  if(!D.alarmOn) return;
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const notes=type==='work'?[523,659,784,1047]:[392,523,659,523];
    notes.forEach((freq,i)=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      osc.frequency.value=freq;osc.type='sine';
      gain.gain.setValueAtTime(0,ctx.currentTime+i*.25);
      gain.gain.linearRampToValueAtTime(.35,ctx.currentTime+i*.25+.05);
      gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.25+.35);
      osc.start(ctx.currentTime+i*.25);osc.stop(ctx.currentTime+i*.25+.4);
    });
    setTimeout(()=>ctx.close(),2000);
  }catch(e){}
}
function toggleAlarm(){
  D.alarmOn=!D.alarmOn;
  const btn=document.getElementById('alarm-btn');
  if(btn){btn.textContent=(D.alarmOn?'🔔':'🔕')+' Alarm';btn.style.color=D.alarmOn?'var(--acc)':'var(--mut)';}
  toast(D.alarmOn?'Alarm on':'Alarm off');
}
// Second tag dropdown (in-session)
let tagDropdownOpen2=false;
function toggleTagDropdown2(){
  tagDropdownOpen2=!tagDropdownOpen2;
  const list=document.getElementById('tag-dropdown-list2');
  if(list) list.classList.toggle('hid',!tagDropdownOpen2);
  if(tagDropdownOpen2) renderTagDropdownList2();
}
function renderTagDropdownList2(){
  const list=document.getElementById('tag-dropdown-list2');if(!list)return;
  list.innerHTML=D.tags.map(t=>`
    <div class="tag-dropdown-item ${D.atag===t?'active':''}" onclick="selTag2('${t.replace(/'/g,"\\'")}')" >
      <span class="tag-dot" style="background:${getTagColor(t)}"></span>
      <span style="flex:1">${t}</span>
    </div>`).join('');
}
function selTag2(t){D.atag=t;tagDropdownOpen2=false;document.getElementById('tag-dropdown-list2')?.classList.add('hid');syncTagBtn2();}
function syncTagBtn2(){
  const dot=document.getElementById('tag-sel-dot2'),lbl=document.getElementById('tag-sel-label2');
  if(dot) dot.style.background=D.atag?getTagColor(D.atag):'var(--bdr)';
  if(lbl) lbl.textContent=D.atag||'—';
}
document.addEventListener('click',e=>{
  const w2=document.getElementById('tag-dropdown-wrap2');
  if(w2&&!w2.contains(e.target)){tagDropdownOpen2=false;document.getElementById('tag-dropdown-list2')?.classList.add('hid');}
});

// ══════════════════════════════════════════
// SESSION PROFILES
// ══════════════════════════════════════════
function renProfilesMini(){
  const el=document.getElementById('profile-list-mini');if(!el)return;
  if(!D.profiles.length){el.innerHTML=`<p style="font-size:.76rem;color:var(--mut);font-style:italic">No profiles yet. Create one below.</p>`;updateStartBtn();return;}
  el.innerHTML=D.profiles.map((p,i)=>`
    <div class="profile-card ${D.activeProfile===i?'sel':''}" style="${D.activeProfile===i?'border-color:var(--acc);background:rgba(14,139,186,.06)':''}" onclick="selectProfile(${i})">
      <h4>${p.name}</h4>
      <div class="profile-meta">${p.focusSessions.length} focus · ${p.restSessions.length} rest — ${p.focusSessions.reduce((a,b)=>a+b,0)+p.restSessions.reduce((a,b)=>a+b,0)} min total</div>
    </div>`).join('');
  updateStartBtn();
}
function selectProfile(i){
  D.activeProfile= D.activeProfile===i?null:i;
  renProfilesMini();
}
function updateStartBtn(){
  const btn=document.getElementById('start-work-btn');
  if(D.activeProfile!==null&&D.profiles[D.activeProfile]){
    const p=D.profiles[D.activeProfile];
    if(btn) btn.textContent=`▶ Begin "${p.name}"`;
  } else {
    if(btn) btn.textContent='▶ Begin 60-min Timer';
  }
  updateFocusTimerPanel();
}
function selectedFocusProfile(){
  return D.activeProfile!==null&&D.profiles[D.activeProfile]?D.profiles[D.activeProfile]:null;
}
function selectedFocusMinutes(){
  const p=selectedFocusProfile();
  return Number(p?.focusSessions?.[0])||60;
}
function updateFocusTimerPanel(remSec=null,totalSec=null){
  const p=selectedFocusProfile();
  const label=document.getElementById('mind-focus-label');
  const profile=document.getElementById('mind-focus-profile');
  const time=document.getElementById('mind-focus-time');
  const hint=document.getElementById('mind-focus-hint');
  const primary=document.getElementById('mind-focus-primary');
  const ring=document.querySelector('.mind-focus-ring');
  const phase=D.phase||'idle';
  const running=phase==='work';
  const seconds=remSec!==null?remSec:selectedFocusMinutes()*60;
  if(label) label.textContent=running?'Deep Work':'Pomodoro Focus';
  if(profile) profile.textContent=p?.name||'Default session';
  if(time) time.textContent=fmt(seconds);
  if(hint) hint.textContent=running?(D.paused?'Paused':'Tap to pause'):'Tap to start';
  if(primary) primary.textContent=running?(D.paused?'Resume':'Pause'):'Start';
  if(ring){
    ring.classList.toggle('running',running);
    ring.style.setProperty('--timer-progress',totalSec?`${Math.max(0,Math.min(100,(seconds/totalSec)*100))}%`:'100%');
  }
}
function handleFocusRingTap(){
  if(D.phase==='work'){pauseResume();return;}
  if(D.phase==='idle') startWork();
}
function handleFocusPrimary(){
  if(D.phase==='work'){pauseResume();return;}
  if(D.phase==='idle') startWork();
}

function showProfileManager(){
  const modal=document.getElementById('mod');
  modal.innerHTML=`
    <h2>Session Profiles</h2>
    <div id="pm-list" style="margin-bottom:14px">${D.profiles.length?D.profiles.map((p,i)=>`
      <div class="profile-card">
        <div style="display:flex;align-items:center;gap:8px">
          <h4 style="flex:1;margin:0">${p.name}</h4>
          <button class="btn bs" style="font-size:.68rem;padding:2px 8px" onclick="editProfile(${i})">Edit</button>
          <button class="btn bd" style="font-size:.68rem;padding:2px 8px" onclick="deleteProfile(${i})">Del</button>
        </div>
        <div class="profile-meta" style="margin-top:4px">Focus: ${p.focusSessions.join(', ')} min</div>
        <div class="profile-meta">Rest: ${p.restSessions.join(', ')} min</div>
      </div>`).join(''):'<p style="font-size:.78rem;color:var(--mut)">No profiles yet.</p>'}</div>
    <button class="btn bp" style="width:100%;margin-bottom:8px" onclick="createNewProfile()">+ Create New Profile</button>
    <button class="btn bs" style="width:100%" onclick="closeMod()">Close</button>`;
  document.getElementById('mov').classList.remove('hid');
}

function createNewProfile(){buildProfileEditor(-1);}
function editProfile(i){buildProfileEditor(i);}

function buildProfileEditor(idx){
  const isNew=idx===-1;
  const p=isNew?{name:'',focusSessions:[60],restSessions:[10]}:JSON.parse(JSON.stringify(D.profiles[idx]));
  function rows(arr,type){
    return arr.map((v,i)=>`
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:.76rem;color:var(--mut);min-width:60px">${type==='focus'?'Focus':'Rest'} ${i+1}</span>
        <input type="number" id="pe-${type}-${i}" value="${v}" min="1" max="90" style="width:70px;padding:5px 8px;border:1.5px solid var(--bdr);border-radius:6px;font-size:.82rem;background:var(--bg)"> min
        <button onclick="removePeSlot('${type}',${i})" style="width:22px;height:22px;border:none;background:none;cursor:pointer;color:var(--red);font-size:1rem;padding:0">−</button>
      </div>`).join('');
  }
  document.getElementById('mod').innerHTML=`
    <h2>${isNew?'New Profile':'Edit Profile'}</h2>
    <label>Profile name</label><input type="text" id="pe-name" value="${p.name}" placeholder="e.g. Pomodoro 4×25" class="mb10">
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:140px">
        <div style="font-size:.76rem;font-weight:700;color:var(--navy);margin-bottom:6px">Focus Sessions (max 8, 1–90 min)</div>
        <div id="pe-focus-rows">${rows(p.focusSessions,'focus')}</div>
        <button class="btn bs" style="font-size:.72rem;padding:3px 10px;margin-top:4px" onclick="addPeSlot('focus')">+ Add Focus</button>
      </div>
      <div style="flex:1;min-width:140px">
        <div style="font-size:.76rem;font-weight:700;color:var(--navy);margin-bottom:6px">Rest Sessions (max 8, 1–90 min)</div>
        <div id="pe-rest-rows">${rows(p.restSessions,'rest')}</div>
        <button class="btn bs" style="font-size:.72rem;padding:3px 10px;margin-top:4px" onclick="addPeSlot('rest')">+ Add Rest</button>
      </div>
    </div>
    <div class="brow" style="margin-top:14px">
      <button class="btn bp" onclick="saveProfileEditor(${idx})">Save Profile</button>
      <button class="btn bs" onclick="showProfileManager()">Back</button>
    </div>`;
  document.getElementById('mov').classList.remove('hid');
  // store temp state for dynamic add/remove
  window._peState={focus:[...p.focusSessions],rest:[...p.restSessions]};
}

function addPeSlot(type){
  const arr=window._peState[type];
  if(arr.length>=8){toast('Maximum 8 sessions per type.');return;}
  arr.push(type==='focus'?25:10);
  rebuildPeRows(type);
}
function removePeSlot(type,i){
  const arr=window._peState[type];
  if(arr.length<=1){toast('Need at least 1 session.');return;}
  arr.splice(i,1);rebuildPeRows(type);
}
function rebuildPeRows(type){
  const arr=window._peState[type];
  const el=document.getElementById(`pe-${type}-rows`);if(!el)return;
  el.innerHTML=arr.map((v,i)=>`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="font-size:.76rem;color:var(--mut);min-width:60px">${type==='focus'?'Focus':'Rest'} ${i+1}</span>
      <input type="number" id="pe-${type}-${i}" value="${v}" min="1" max="90" style="width:70px;padding:5px 8px;border:1.5px solid var(--bdr);border-radius:6px;font-size:.82rem;background:var(--bg)"> min
      <button onclick="removePeSlot('${type}',${i})" style="width:22px;height:22px;border:none;background:none;cursor:pointer;color:var(--red);font-size:1rem;padding:0">−</button>
    </div>`).join('');
}
function saveProfileEditor(idx){
  const name=document.getElementById('pe-name').value.trim();
  if(!name){toast('Profile needs a name.');return;}
  const focus=window._peState.focus.map((_,i)=>Math.min(90,Math.max(1,parseInt(document.getElementById(`pe-focus-${i}`).value)||25)));
  const rest=window._peState.rest.map((_,i)=>Math.min(90,Math.max(1,parseInt(document.getElementById(`pe-rest-${i}`).value)||10)));
  const prof={name,focusSessions:focus,restSessions:rest};
  if(idx===-1) D.profiles.push(prof); else D.profiles[idx]=prof;
  sv();closeMod();renProfilesMini();toast(idx===-1?'Profile created ✓':'Profile updated ✓');
}
function deleteProfile(i){
  if(!confirm('Delete this profile?'))return;
  D.profiles.splice(i,1);if(D.activeProfile>=D.profiles.length)D.activeProfile=null;
  sv();showProfileManager();renProfilesMini();
}
function fmt(s){s=Math.max(0,Math.round(s));return`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function setRing(id,total,rem){const el=document.getElementById(id);if(el)el.style.strokeDashoffset=421*(1-Math.max(0,rem)/total);}
function showPh(p){['idle','work','recall','rest'].forEach(x=>document.getElementById('ph-'+x).classList.toggle('hid',x!==p));}

// ══════════════════════════════════════════
// DEEP WORK — TIMER (wall-clock anchored for background support)
// ══════════════════════════════════════════
let _profileSteps=[], _profileIdx=0;
// Wall-clock anchoring: store start time and total duration
let _wStart=0, _wTotal=0, _wPauseAccum=0, _wPauseAt=0;
let _rStart=0, _rTotal=0;

function getWorkRemain(){
  if(D.paused) return _wTotal - _wPauseAccum - (_wPauseAt - _wStart);
  return _wTotal - _wPauseAccum - (Date.now() - _wStart - _wPauseAccum ? (Date.now()-_wStart-_wPauseAccum) : 0);
}
// Simpler: track elapsed separately
let _wElapsed=0, _wLastTick=0; // ms elapsed in focus
let _rElapsed=0, _rLastTick=0;

function startWork(){
  D.h20=document.getElementById('h20').value.trim();
  if(!D.h20){toast('Write the hardest 20% before starting.');return;}
  if(D.activeProfile!==null&&D.profiles[D.activeProfile]){
    const p=D.profiles[D.activeProfile];
    _profileSteps=[];
    const maxLen=Math.max(p.focusSessions.length,p.restSessions.length);
    for(let i=0;i<maxLen;i++){
      if(i<p.focusSessions.length) _profileSteps.push({type:'focus',mins:p.focusSessions[i]});
      if(i<p.restSessions.length)  _profileSteps.push({type:'rest',mins:p.restSessions[i]});
    }
  } else { _profileSteps=[{type:'focus',mins:60}]; }
  _profileIdx=0;
  startFocusPhase(_profileSteps[0].mins);
}

function startFocusPhase(mins){
  const totalSec=mins*60;
  D.phase='work'; D.paused=false;
  _wElapsed=0; _wLastTick=Date.now();
  showPh('work');
  document.getElementById('h20r').textContent=D.h20;
  document.getElementById('a12').classList.remove('hid');
  document.getElementById('ahalf').classList.add('hid');
  document.getElementById('wt').textContent=fmt(totalSec);
  setRing('wr',totalSec,totalSec);
  updateFocusTimerPanel(totalSec,totalSec);
  document.getElementById('pbtn').textContent='Pause';
  syncTagBtn2();
  clearInterval(D.tmr);
  D.tmr=setInterval(()=>tickW(totalSec),500);
}

function tickW(totalSec){
  if(D.paused) return;
  const now=Date.now();
  _wElapsed+=(now-_wLastTick)/1000;
  _wLastTick=now;
  const rem=Math.max(0,totalSec-_wElapsed);
  document.getElementById('wt').textContent=fmt(rem);
  setRing('wr',totalSec,rem);
  updateFocusTimerPanel(rem,totalSec);
  if(_wElapsed>720) document.getElementById('a12').classList.add('hid');
  if(_wElapsed>=totalSec/2 && _wElapsed<totalSec/2+1) document.getElementById('ahalf').classList.remove('hid');
  if(rem<=0){ clearInterval(D.tmr); playAlarm('work'); enterRecall(); }
}

function pauseResume(){
  D.paused=!D.paused;
  if(!D.paused) _wLastTick=Date.now(); // reset tick anchor on resume
  document.getElementById('pbtn').textContent=D.paused?'Resume':'Pause';
  updateFocusTimerPanel(Math.max(0,(_profileSteps[_profileIdx]?.mins||60)*60-_wElapsed),(_profileSteps[_profileIdx]?.mins||60)*60);
}

function finishEarly(){
  if(!confirm('Finish this focus session now and log the time spent?')) return;
  clearInterval(D.tmr);
  // Update elapsed one final time
  if(!D.paused){const now=Date.now();_wElapsed+=(now-_wLastTick)/1000;}
  playAlarm('work');
  enterRecall();
}

function abandon(){
  if(!confirm('Abandon this session without logging?')) return;
  clearInterval(D.tmr);
  resetIdle();
}

function enterRecall(){
  D.phase='recall'; D.remain=120;
  updateFocusTimerPanel(120,120);
  _rElapsed=0; _rLastTick=Date.now();
  showPh('recall');
  document.getElementById('rt').textContent='2:00';
  clearInterval(D.tmr);
  D.tmr=setInterval(tickR,500);
}
function tickR(){
  const now=Date.now();
  _rElapsed+=(now-_rLastTick)/1000; _rLastTick=now;
  const rem=Math.max(0,120-_rElapsed);
  document.getElementById('rt').textContent=fmt(rem);
  if(rem<=0) clearInterval(D.tmr);
}

function startRest(targetEl=null){
  D.recallTxt=document.getElementById('rct').value.trim();
  if(!D.recallTxt){toast('Write your free recall summary first.');return;}
  // log elapsed focus time in hours
  const focusMins=(_profileSteps[_profileIdx]?.mins)||60;
  const actualHours=Math.max(0.1, _wElapsed/3600);
  logSess(D.atag,D.h20,D.recallTxt,Math.round(actualHours*10)/10,D.selFocus,Date.now(),false,targetEl);
  clearInterval(D.tmr); _profileIdx++;
  const nextStep=_profileSteps[_profileIdx];
  const restMins=nextStep&&nextStep.type==='rest'?nextStep.mins:10;
  startRestPhase(restMins);
}

function startRestPhase(mins){
  const totalSec=mins*60;
  D.phase='rest';
  updateFocusTimerPanel(totalSec,totalSec);
  _rElapsed=0; _rLastTick=Date.now();
  showPh('rest');
  document.getElementById('rst').textContent=fmt(totalSec);
  setRing('rr',totalSec,totalSec);
  clearInterval(D.tmr);
  D.tmr=setInterval(()=>{
    const now=Date.now();
    _rElapsed+=(now-_rLastTick)/1000; _rLastTick=now;
    const rem=Math.max(0,totalSec-_rElapsed);
    updateFocusTimerPanel(rem,totalSec);
    document.getElementById('rst').textContent=fmt(rem);
    setRing('rr',totalSec,rem);
    if(rem<=0){
      clearInterval(D.tmr); playAlarm('rest'); _profileIdx++;
      const nxt=_profileSteps[_profileIdx];
      if(nxt&&nxt.type==='focus'){toast('Rest done! Next focus session starting…');setTimeout(()=>startFocusPhase(nxt.mins),1500);}
      else toast('All sessions complete! 🎉');
    }
  },500);
}

function skipRest(){
  clearInterval(D.tmr); _profileIdx++;
  const nxt=_profileSteps[_profileIdx];
  if(nxt&&nxt.type==='focus') startFocusPhase(nxt.mins);
  else resetIdle();
}

// Sync timer when page becomes visible again (background support)
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden && D.phase==='work' && !D.paused) _wLastTick=Date.now();
  if(!document.hidden && D.phase==='rest') _rLastTick=Date.now();
});

function selFocus(v){
  D.selFocus=v;
  document.querySelectorAll('#focus-sel .fstar').forEach(b=>b.classList.toggle('on',parseInt(b.dataset.val)===v));
}
function logSess(tag,h20,recall,hours,focus,ts,manual=false,floatTarget=null){
  const sessionTs=ts||Date.now();
  const session={id:`s${sessionTs}_${D.sessions.length}`,tag,h20,recall,hours:hours||1,focus:focus||3,ts:sessionTs,manual};
  D.sessions.push(session);
  const xp=maybeAwardStudyXp(session,{showToast:true});
  showXpFloat(floatTarget||document.getElementById('slog'),xp);
  sv();renSCnt();renSlog();
}
function renSCnt(){
  const td=new Date().toDateString();
  const n=D.sessions.filter(s=>new Date(s.ts).toDateString()===td).length;
  document.getElementById('sc').textContent=`Today: ${n} session${n!==1?'s':''}`;
}

// Init session log year filter
function initSlogFilter(){
  const ysel=document.getElementById('slog-year');
  const msel=document.getElementById('slog-month');
  if(!ysel||!msel) return;
  const now=new Date();
  const years=new Set(D.sessions.map(s=>new Date(s.ts).getFullYear()));
  years.add(now.getFullYear());
  const sorted=[...years].sort((a,b)=>b-a);
  ysel.innerHTML=sorted.map(y=>`<option value="${y}" ${y===now.getFullYear()?'selected':''}>${y}</option>`).join('');
  msel.value=String(now.getMonth());
}

function renSlog(){
  const el=document.getElementById('slog');
  const msel=document.getElementById('slog-month');
  const ysel=document.getElementById('slog-year');
  if(!el) return;
  // Refresh year options in case new years appeared
  if(ysel){
    const curY=parseInt(ysel.value)||new Date().getFullYear();
    const years=new Set(D.sessions.map(s=>new Date(s.ts).getFullYear()));
    years.add(new Date().getFullYear());
    const sorted=[...years].sort((a,b)=>b-a);
    ysel.innerHTML=sorted.map(y=>`<option value="${y}" ${y===curY?'selected':''}>${y}</option>`).join('');
  }
  if(!D.sessions.length){el.innerHTML='<p style="font-size:.8rem;color:var(--mut)">No sessions recorded yet.</p>';return;}
  const filterM=msel?parseInt(msel.value):new Date().getMonth();
  const filterY=ysel?parseInt(ysel.value):new Date().getFullYear();
  const filtered=D.sessions.filter(s=>{const d=new Date(s.ts);return d.getFullYear()===filterY&&d.getMonth()===filterM;});
  const countEl=document.getElementById('slog-count');
  if(countEl) countEl.textContent=`${filtered.length} session${filtered.length!==1?'s':''}`;
  if(!filtered.length){el.innerHTML='<p style="font-size:.8rem;color:var(--mut)">No sessions this month.</p>';return;}
  el.innerHTML=[...filtered].reverse().map(s=>`
    <div class="li">
      <span style="background:${getTagColor(s.tag)}22;border-radius:4px;padding:2px 6px;font-size:.7rem;font-weight:600;color:${getTagColor(s.tag)};border:1px solid ${getTagColor(s.tag)}44;margin-right:5px">${s.tag}</span>
      <strong style="font-size:.78rem">${new Date(s.ts).toLocaleDateString([],{month:'short',day:'numeric'})}</strong>
      <span style="font-size:.72rem;color:var(--mut)"> · ${s.hours}h</span>
      ${s.focus?`<span style="font-size:.7rem;color:var(--cyn);margin-left:4px;font-weight:600">focus ${s.focus}/5</span>`:''}
      ${s.manual?'<span style="font-size:.68rem;color:var(--mut);margin-left:4px">[manual]</span>':''}
      <div style="margin-top:3px;font-size:.78rem;color:var(--mut)">${s.h20}</div>
    </div>`).join('');
}
function resetIdle(){
  clearInterval(D.tmr);D.phase='idle';D.paused=false;
  _wElapsed=0;_rElapsed=0;_profileSteps=[];_profileIdx=0;
  document.getElementById('h20').value='';document.getElementById('rct').value='';
  document.getElementById('ahalf').classList.add('hid');showPh('idle');D.selFocus=3;selFocus(3);
  renProfilesMini();
  updateFocusTimerPanel();
}

// ══════════════════════════════════════════
// MANUAL LOG
// ══════════════════════════════════════════
let manFocus=3;
function showManualLog(){
  const today=new Date().toISOString().split('T')[0];
  const tagOpts=D.tags.map(t=>`<option value="${t}"${t===D.atag?' selected':''}>${t}</option>`).join('');
  document.getElementById('mod').innerHTML=`
    <h2>Log Session Manually</h2>
    <div class="mlog-grid">
      <div><label>Date</label><input type="date" id="ml-date" value="${today}" class="mb10"></div>
      <div><label>Hours studied</label><input type="number" id="ml-hours" value="1" min="0.5" max="12" step="0.5" class="mb10"></div>
    </div>
    <label>Subject tag</label><select id="ml-tag" class="mb10">${tagOpts}</select>
    <label>Task description</label><input type="text" id="ml-task" placeholder="What did you study?" class="mb10">
    <label>Focus level</label>
    <div class="focus-row" id="ml-focus-sel" style="margin-bottom:14px">
      ${[1,2,3,4,5].map(v=>`<button class="fstar${v===3?' on':''}" data-v="${v}" onclick="selManFocus(${v})" type="button">${v}</button>`).join('')}
    </div>
    <div class="brow">
      <button class="btn bp" onclick="saveManualLog(event.currentTarget)">Save Session</button>
      <button class="btn bs" onclick="closeMod()">Cancel</button>
    </div>`;
  document.getElementById('mov').classList.remove('hid');
}
function selManFocus(v){manFocus=v;document.querySelectorAll('#ml-focus-sel .fstar').forEach(b=>b.classList.toggle('on',parseInt(b.dataset.v)===v));}
function saveManualLog(targetEl=null){
  const dateVal=document.getElementById('ml-date').value;
  const hours=parseFloat(document.getElementById('ml-hours').value)||1;
  const tag=document.getElementById('ml-tag').value;
  const task=document.getElementById('ml-task').value.trim();
  if(!task){toast('Please describe what you studied.');return;}
  const ts=new Date(dateVal+'T12:00:00').getTime();
  logSess(tag,task,'Manual entry',hours,manFocus,ts,true,targetEl);
  closeMod();toast('Session logged ✓');
}

// ══════════════════════════════════════════
// HABITS
// ══════════════════════════════════════════
// HABITS
// ══════════════════════════════════════════
function dkey(d){return`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function tdk(){return dkey(new Date())}
function twoMinActive(h){return(Date.now()-h.added)<7*864e5;}

// Returns true if date d is a planned day for habit h
function isPlannedDay(h,d){
  const freq=h.freq||{type:'daily'};
  const dow=d.getDay(); // 0=Sun..6=Sat
  if(freq.type==='daily') return true;
  if(freq.type==='weekdays') return dow>=1&&dow<=5;
  if(freq.type==='custom') return (freq.days||[]).includes(dow);
  if(freq.type==='weekly'||freq.type==='biweekly'||freq.type==='monthly') return false; // calendar-level, not daily
  return true;
}

function streak(h){
  const freq=h.freq||{type:'daily'};
  // For non-daily frequencies, count consecutive planned-day completions going back
  let s=0;
  const today=new Date(); today.setHours(0,0,0,0);
  const d=new Date(today);
  // Go back up to 365 days
  for(let i=0;i<365;i++){
    if(isPlannedDay(h,d)){
      const isToday=d.toDateString()===today.toDateString();
      if(h.log[dkey(d)]) s++;
      else if(!isToday) break; // missed a planned day (not today — today may not be done yet)
    }
    d.setDate(d.getDate()-1);
    if(d<new Date(h.added-864e5)) break;
  }
  return s;
}

const FREQ_DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function freqLabel(h){
  const freq=h.freq||{type:'daily'};
  if(freq.type==='daily') return 'Every day';
  if(freq.type==='weekdays') return 'Weekdays';
  if(freq.type==='weekly') return 'Once a week';
  if(freq.type==='biweekly') return 'Every 2 weeks';
  if(freq.type==='monthly') return 'Once a month';
  if(freq.type==='custom'&&freq.days?.length) return freq.days.map(d=>FREQ_DAY_NAMES[d]).join(', ');
  return 'Every day';
}

function renderFreqPicker(h,prefix){
  const freq=h?.freq||{type:'daily'};
  const days=freq.days||[];
  const isCustom=freq.type==='custom';
  return`
  <div style="margin-bottom:10px">
    <label>Frequency</label>
    <div class="freq-grid" style="margin-bottom:6px">
      ${['daily','weekdays'].map(t=>`<button class="freq-opt ${freq.type===t?'on':''}" onclick="setFreqType('${prefix}','${t}')">${t==='daily'?'Every day':'Weekdays'}</button>`).join('')}
      ${['weekly','biweekly','monthly'].map(t=>`<button class="freq-opt ${freq.type===t?'on':''}" onclick="setFreqType('${prefix}','${t}')">${t==='weekly'?'Weekly':t==='biweekly'?'Bi-weekly':'Monthly'}</button>`).join('')}
      <button class="freq-opt ${isCustom?'on':''}" onclick="setFreqType('${prefix}','custom')">Custom</button>
    </div>
    <div id="${prefix}-dayrow" class="freq-grid" style="${isCustom?'':'display:none'}">
      ${[0,1,2,3,4,5,6].map(d=>`<button class="fday ${days.includes(d)?'on':''}" onclick="toggleFreqDay('${prefix}',${d})">${FREQ_DAY_NAMES[d]}</button>`).join('')}
    </div>
  </div>`;
}
// Temp freq state for editor
window._editFreq={};
function setFreqType(prefix,type){
  if(!window._editFreq[prefix]) window._editFreq[prefix]={type:'daily',days:[]};
  window._editFreq[prefix].type=type;
  // Re-render freq section
  const wrap=document.getElementById(`${prefix}-freq-wrap`);
  if(wrap) wrap.innerHTML=renderFreqPicker({freq:window._editFreq[prefix]},prefix);
}
function toggleFreqDay(prefix,d){
  if(!window._editFreq[prefix]) window._editFreq[prefix]={type:'custom',days:[]};
  const arr=window._editFreq[prefix].days||[];
  const idx=arr.indexOf(d);
  if(idx>=0) arr.splice(idx,1); else arr.push(d);
  arr.sort();
  window._editFreq[prefix].days=arr;
  const wrap=document.getElementById(`${prefix}-freq-wrap`);
  if(wrap) wrap.innerHTML=renderFreqPicker({freq:window._editFreq[prefix]},prefix);
}

let todayDesignMode=false;
let editingFlowId=null;

function habitDisplayName(h){
  return h?.name||String(h?.id2||'Habit').replace(/^I am (someone who )?/i,'');
}
function compactCue(h){
  const cue=String(h?.sk||'').replace(/^after i\s*/i,'After I ').trim();
  return cue.length>48?cue.slice(0,45).trim()+'...':cue;
}
function compactHabitSubline(h){
  const tiny=String(h?.tm||'').trim();
  if(tiny) return tiny.length>52?tiny.slice(0,49).trim()+'...':tiny;
  return compactCue(h);
}
function habitIsDoneToday(h){return !!h?.log?.[tdk()];}
function getTodayXpEvents(){
  ensureCharacter();
  const todayIso=dateStamp();
  return (D.character.xpEvents||[]).filter(e=>{
    if(e.date===todayIso) return true;
    return e.timestamp&&dateStamp(e.timestamp)===todayIso;
  }).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
}
function todayXpGained(){
  return getTodayXpEvents().reduce((sum,e)=>sum+(Number(e.generalXp)||0),0);
}
function habitIsDueToday(h){
  return isPlannedDay(h,new Date())||habitIsDoneToday(h);
}
function buildHabitGroups({onlyToday=false}={}){
  const labels=['Morning Flow','Midday Flow','Evening Flow','Habit Flow'];
  const chains=[];
  const loose=[];
  let i=0;
  while(i<D.habits.length){
    const start=i;
    const items=[{habit:D.habits[i],index:i}];
    while(i<D.habits.length-1&&D.habits[i].stackedToNext){
      i++;
      items.push({habit:D.habits[i],index:i});
    }
    const visibleItems=onlyToday?items.filter(item=>habitIsDueToday(item.habit)):items;
    if(!visibleItems.length){i++;continue;}
    if(items.length>1){
      const label=labels[Math.min(chains.length,labels.length-1)];
      chains.push({id:`chain:${items[0].habit.id||start}`,title:label,items:visibleItems});
    } else {
      loose.push(visibleItems[0]);
    }
    i++;
  }
  if(loose.length) chains.push({id:'loose',title:'Today',items:loose});
  return chains;
}
function buildHabitChains(){return buildHabitGroups({onlyToday:true});}
function buildHabitGroupsAll(){return buildHabitGroups({onlyToday:false});}
function rebuildHabitsFromGroups(groups){
  const next=[];
  groups.filter(g=>g.items.length).forEach(g=>{
    g.items.forEach((item,pos)=>{
      item.habit.stackedToNext=g.id!=='loose'&&pos<g.items.length-1;
      next.push(item.habit);
    });
  });
  D.habits=next;
  if(D.ahi>=D.habits.length) D.ahi=Math.max(0,D.habits.length-1);
  ensureHabitData();
}
function moveHabitToGroup(fromIndex,targetGroupId,insertAt=null){
  const groups=buildHabitGroupsAll();
  let moving=null,source=null,sourcePos=-1;
  groups.forEach(g=>{
    const pos=g.items.findIndex(item=>item.index===fromIndex);
    if(pos>-1){source=g;sourcePos=pos;moving=g.items.splice(pos,1)[0];}
  });
  if(!moving) return;
  let target=groups.find(g=>g.id===targetGroupId);
  if(!target){
    target={id:'loose',title:'Today',items:[]};
    groups.push(target);
  }
  let pos=insertAt===null||insertAt===undefined?target.items.length:Number(insertAt);
  if(source&&source.id===target.id&&sourcePos<pos) pos--;
  pos=Math.max(0,Math.min(target.items.length,pos));
  target.items.splice(pos,0,moving);
  rebuildHabitsFromGroups(groups);
  sv();renHabits();renCal();
}
function moveHabitOutOfChain(index){moveHabitToGroup(index,'loose');}
function moveHabitWithinGroup(index,dir){
  const groups=buildHabitGroupsAll();
  const group=groups.find(g=>g.items.some(item=>item.index===index));
  if(!group) return;
  const pos=group.items.findIndex(item=>item.index===index);
  const next=pos+dir;
  if(next<0||next>=group.items.length) return;
  [group.items[pos],group.items[next]]=[group.items[next],group.items[pos]];
  rebuildHabitsFromGroups(groups);
  sv();renHabits();renCal();
}
function firstActiveHabit(chains=buildHabitChains()){
  for(const chain of chains){
    const item=chain.items.find(x=>!habitIsDoneToday(x.habit));
    if(item) return {chain,item};
  }
  return null;
}
function getTodayHabitProgress(){
  const habits=(Array.isArray(D.habits)?D.habits:[]).filter(habitIsDueToday);
  const total=habits.length;
  const done=habits.filter(habitIsDoneToday).length;
  return {done,total,percent:total?Math.round((done/total)*100):0};
}
function todayDateKey(){return dateStamp();}
// ==================================================
// Today Flow: Data Helpers
// todayTasks / todayFocusBlocks filter and sort today's items by order then createdAt.
// todayEntries() merges both into a unified sorted list used by buildTodayFlow().
// ==================================================
function todayTasks(){
  ensureTodayFlow();
  const today=todayDateKey();
  return D.todayTasks.filter(t=>t.date===today).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||(a.createdAt||0)-(b.createdAt||0));
}
function todayFocusBlocks(){
  ensureTodayFlow();
  const today=todayDateKey();
  return D.focusBlocks.filter(b=>b.date===today).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||(a.createdAt||0)-(b.createdAt||0));
}
function todayEntries(){
  return [
    ...todayTasks().map(item=>({kind:'task',item})),
    ...todayFocusBlocks().map(item=>({kind:'focus',item}))
  ].sort((a,b)=>(Number(a.item.order)||0)-(Number(b.item.order)||0)||(a.item.createdAt||0)-(b.item.createdAt||0));
}
function getTodayOverallProgress(){
  const hp=getTodayHabitProgress();
  const tasks=todayTasks();
  const blocks=todayFocusBlocks();
  const total=hp.total+tasks.length+blocks.length;
  const done=hp.done+tasks.filter(t=>t.completed).length+blocks.filter(b=>b.completed).length;
  return {done,total,percent:total?Math.round((done/total)*100):0,habitDone:hp.done,habitTotal:hp.total};
}
function maxTodayStreak(){
  const due=(Array.isArray(D.habits)?D.habits:[]).filter(habitIsDueToday);
  return due.length?Math.max(...due.map(h=>streak(h)||0)):0;
}
function renderTodayProgress(){
  const progress=getTodayOverallProgress();
  const count=document.getElementById('today-progress-count');
  const fill=document.getElementById('today-progress-fill');
  const dateLabel=document.getElementById('today-date-label');
  const xpStatus=document.getElementById('today-xp-status');
  const levelStatus=document.getElementById('today-level-status');
  const streakStatus=document.getElementById('today-streak-status');
  if(count) count.textContent=`${progress.done} / ${progress.total} done`;
  if(fill) fill.style.width=`${progress.percent}%`;
  if(dateLabel) dateLabel.textContent=new Date().toLocaleDateString([],{weekday:'long',month:'short',day:'numeric'});
  if(xpStatus) xpStatus.textContent=`${todayXpGained()} XP today`;
  if(levelStatus){
    const lp=getLevelProgress(D.character?.totalXp||0);
    levelStatus.textContent=`Level ${lp.level} · ${lp.progressPercent}%`;
  }
  if(streakStatus){
    const s=maxTodayStreak();
    streakStatus.textContent=s?`${s} day streak`:'Ready to start';
  }
  updateMobileHeader();
}
function renderTodayXpFeed(){
  const el=document.getElementById('today-xp-feed');
  if(!el) return;
  const events=getTodayXpEvents().slice(0,5);
  if(!events.length){el.innerHTML='<p class="char-note">No XP earned yet today.</p>';return;}
  el.innerHTML=events.map(e=>{
    const time=e.timestamp?new Date(e.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Today';
    return`<div class="today-xp-item"><span>${escapeHtml(e.label||'XP gained')}</span><strong>+${Math.round(Number(e.generalXp)||0)} XP</strong><small>${time}</small></div>`;
  }).join('');
}
// ==================================================
// Current Focus
// getCurrentFocus() walks the visible Today Flow order (buildTodayFlow) and returns
// the first incomplete actionable item. A running timer session overrides this.
// renderCurrentFocus() reads getCurrentFocus() and writes to #today-current-focus.
// ==================================================
function runningFocusSnapshot(){
  if(D.phase!=='work') return null;
  const total=(_profileSteps[_profileIdx]?.mins||selectedFocusMinutes())*60;
  const remaining=Math.max(0,total-(Number(_wElapsed)||0));
  return {
    type:'running-focus',
    label:'Deep Work Block',
    title:D.h20||selectedFocusProfile()?.name||'Focus session',
    subtitle:D.paused?'Paused focus session':'Active focus session',
    time:fmt(remaining)
  };
}
function getCurrentFocus(chains=buildHabitChains()){
  const running=runningFocusSnapshot();
  if(running) return running;
  const ordered=buildTodayFlow(chains);
  for(const entry of ordered){
    if(entry.kind==='habit-flow'){
      const item=entry.chain.items.find(x=>!habitIsDoneToday(x.habit));
      if(item) return {type:'habit',chain:entry.chain,item};
    }else if(entry.kind==='task'&&!entry.item.completed){
      return {type:'task',item:entry.item};
    }else if(entry.kind==='focus'&&!entry.item.completed){
      return {type:'focus-block',item:entry.item};
    }
  }
  return {type:'empty'};
}
function flowTheme(chain,index=0){
  const title=String(chain?.title||'').toLowerCase();
  if(title.includes('morning')) return {key:'morning',icon:'🌄',accent:'#22a66a'};
  if(title.includes('midday')) return {key:'midday',icon:'☀️',accent:'#f59f00'};
  if(title.includes('evening')||title.includes('reset')) return {key:'evening',icon:'🌙',accent:'#6d5dfc'};
  if(title.includes('today')) return {key:'today',icon:'✓',accent:'#0e8bba'};
  const fallback=[{key:'custom-blue',icon:'◆',accent:'#0e8bba'},{key:'custom-green',icon:'◇',accent:'#22a66a'},{key:'custom-purple',icon:'✦',accent:'#6d5dfc'}];
  return fallback[index%fallback.length];
}
function activeStepTitle(h){return habitDisplayName(h)||h?.name||'Next step';}
function renderFocusBadge(){return '<div class="current-focus-badge"><span>◎</span>Current Focus</div>';}
function renderFocusMenu(){return `<button type="button" class="current-focus-menu" onclick="stopUiEvent(event);toast('More focus options can live here soon.')" aria-label="More options">⋯</button>`;}
function renderFocusRing(seconds,totalSeconds=seconds){
  const safeTotal=Math.max(1,Number(totalSeconds)||Number(seconds)||1);
  const safeSeconds=Math.max(0,Number(seconds)||0);
  const percent=Math.max(0,Math.min(100,(safeSeconds/safeTotal)*100));
  return`<div class="focus-visual-ring" style="--focus-ring:${percent}%">
    <strong>${escapeHtml(fmt(safeSeconds))}</strong>
    <span>Time remaining</span>
  </div>`;
}
function renderCurrentFlowVisual(chain,item){
  const idx=chain.items.findIndex(x=>x.index===item.index);
  return`<div class="current-flow-visual">
    ${renderNodeProgress(chain,idx,{compact:false})}
    <div class="current-flow-step">${idx+1}<span>/ ${chain.items.length}</span></div>
  </div>`;
}
function focusInfoStrip(items){
  return`<div class="current-info-strip">${items.map(x=>`<span>${escapeHtml(x)}</span>`).join('')}</div>`;
}
function renderCurrentFocus(chains=buildHabitChains()){
  const el=document.getElementById('today-current-focus');
  if(!el) return;
  const focus=getCurrentFocus(chains);
  if(focus.type==='running-focus'){
    const total=(_profileSteps[_profileIdx]?.mins||selectedFocusMinutes())*60;
    const remaining=Math.max(0,total-(Number(_wElapsed)||0));
    el.innerHTML=`<div class="current-focus-card focus premium-focus simple-focus">
      ${renderFocusMenu()}
      <div class="current-focus-copy">
        ${renderFocusBadge()}
        <div class="current-focus-type">Deep Work</div>
        <h2>${escapeHtml(focus.title)}</h2>
        <p class="current-identity">${escapeHtml(focus.subtitle)} &middot; ${escapeHtml(fmt(remaining))} remaining</p>
        <div class="current-focus-actions">
          <button type="button" class="btn bp current-focus-btn focus-primary" onclick="navigateToTab('mind')">&#9654; Open Timer</button>
          <button type="button" class="btn bs current-focus-pomodoro" onclick="navigateToTab('mind')"><span>🍅</span>Pomodoro</button>
        </div>
      </div>
    </div>`;
    return;
  }
  if(focus.type==='habit'){
    const h=focus.item.habit;
    const theme=flowTheme(focus.chain,chains.findIndex(c=>c.id===focus.chain.id));
    const activeIndex=focus.chain.items.findIndex(x=>x.index===focus.item.index);
    el.innerHTML=`<div class="current-focus-card habit premium-focus simple-focus" style="--flow-accent:${theme.accent}">
      ${renderFocusMenu()}
      <div class="current-focus-copy">
        ${renderFocusBadge()}
        <div class="current-focus-type">${escapeHtml(focus.chain.title)}</div>
        <h2>${escapeHtml(activeStepTitle(h))}</h2>
        <p class="current-identity">${escapeHtml(h.id2||'I am a person who shows up for the life I am building.')}</p>
        ${renderNodeProgress(focus.chain,activeIndex,{compact:false})}
        <div class="current-focus-actions">
          <button type="button" class="btn bp current-focus-btn habit-primary" onclick="stopUiEvent(event);togH(${focus.item.index},event.currentTarget)">&#10003; Complete Step</button>
          <button type="button" class="btn bs current-focus-ghost" onclick="stopUiEvent(event);toast('Skip keeps this step open for later.')">Skip</button>
        </div>
      </div>
    </div>`;
    return;
  }
  if(focus.type==='task'){
    const t=focus.item;
    el.innerHTML=`<div class="current-focus-card task premium-focus simple-focus">
      ${renderFocusMenu()}
      <div class="current-focus-copy">
        ${renderFocusBadge()}
        <div class="current-focus-type">Quick Task</div>
        <h2>${escapeHtml(t.title)}</h2>
        <p class="current-identity">${escapeHtml(t.notes||'A small practical action that clears today’s path.')}</p>
        <div class="current-focus-actions">
          <button type="button" class="btn bp current-focus-btn task-primary" onclick="stopUiEvent(event);toggleTodayTask('${t.id}',event.currentTarget)">&#10003; Complete Task</button>
          <button type="button" class="btn bs current-focus-ghost" onclick="stopUiEvent(event);updateTodayEntryPlacement('task','${t.id}','later')">Move Later</button>
        </div>
      </div>
    </div>`;
    return;
  }
  if(focus.type==='focus-block'){
    const b=focus.item;
    const mins=Number(b.duration)||60;
    el.innerHTML=`<div class="current-focus-card focus premium-focus simple-focus">
      ${renderFocusMenu()}
      <div class="current-focus-copy">
        ${renderFocusBadge()}
        <div class="current-focus-type">Deep Work</div>
        <h2>${escapeHtml(b.title||'Deep Work Block')}</h2>
        <p class="current-identity">${escapeHtml(b.notes||`${mins} min focus session`)}</p>
        <div class="current-focus-actions">
          <button type="button" class="btn bp current-focus-btn focus-primary" onclick="startTodayFocusBlock('${b.id}')">&#9654; Start Focus</button>
          <button type="button" class="btn bs current-focus-ghost" onclick="stopUiEvent(event);toggleFocusBlock('${b.id}',event.currentTarget)">Mark Done</button>
          <button type="button" class="btn bs current-focus-pomodoro" onclick="navigateToTab('mind')"><span>🍅</span>Pomodoro</button>
        </div>
      </div>
    </div>`;
    return;
  }
  el.innerHTML=`<div class="current-focus-card empty premium-focus simple-focus">
    ${renderFocusMenu()}
    <div class="current-focus-copy">
      ${renderFocusBadge()}
      <div class="current-focus-type">Choose your next action</div>
      <h2>Nothing is waiting right now.</h2>
      <p class="current-identity">Add one small action or start a focus block when you are ready.</p>
      <div class="current-focus-actions">
        <button type="button" class="btn bp current-focus-btn task-primary" onclick="showAddTodayTask()">+ Add Task</button>
        <button type="button" class="btn bs current-focus-ghost" onclick="showAddFocusBlock()">+ Focus</button>
      </div>
    </div>
  </div>`;
}
// ==================================================
// Today Flow: Data / Ordering Helpers
// Today Flow combines habit-flow cards, quick tasks, and focus blocks.
// buildTodayFlow() is the authoritative source of visible order.
// D.todayFlowOrder[dateKey] stores the user's custom arrangement as an ordered key list.
// Stale keys (deleted items) are silently skipped during sort.
// applyTodayFlowCustomOrder() re-sorts the base list by the saved key order.
// ==================================================
function todayPlacementLabel(entry){
  if(entry.placementType==='start') return 'Start of day';
  if(entry.placementType==='midday') return 'Midday';
  if(entry.placementType==='evening') return 'Evening';
  if(entry.placementType==='afterFlow') return 'After routine';
  return 'Flexible / Later';
}
function entriesForPlacement(entries,type,id=''){
  return entries.filter(e=>e.item.placementType===type&&(id===''||e.item.placementId===id));
}
function buildTodayFlow(chains=buildHabitChains()){
  const entries=todayEntries();
  const used=new Set();
  const addEntries=(items,out)=>{
    items.forEach(e=>{used.add(`${e.kind}:${e.item.id}`);out.push(e);});
  };
  const out=[];
  addEntries(entriesForPlacement(entries,'start'),out);
  chains.forEach((chain,idx)=>{
    out.push({kind:'habit-flow',chain,item:{id:chain.id}});
    addEntries(entriesForPlacement(entries,'afterFlow',chain.id),out);
    if(idx===0) addEntries(entriesForPlacement(entries,'midday'),out);
  });
  if(!chains.length) addEntries(entriesForPlacement(entries,'midday'),out);
  addEntries(entriesForPlacement(entries,'evening'),out);
  addEntries(entries.filter(e=>!used.has(`${e.kind}:${e.item.id}`)),out);
  const today=todayDateKey();
  const customOrder=(D.todayFlowOrder||{})[today];
  if(customOrder&&customOrder.length) return applyTodayFlowCustomOrder(out,customOrder);
  return out;
}
function applyTodayFlowCustomOrder(items,customOrder){
  const lookup=new Map(customOrder.map((e,i)=>[`${e.kind}:${e.id}`,i]));
  const getKey=e=>e.kind==='habit-flow'?`habit-flow:${e.chain?.id||e.item?.id}`:`${e.kind}:${e.item?.id}`;
  return [...items].sort((a,b)=>{
    const ai=lookup.has(getKey(a))?lookup.get(getKey(a)):9999;
    const bi=lookup.has(getKey(b))?lookup.get(getKey(b)):9999;
    return ai-bi;
  });
}
function saveTodayFlowOrder(orderedItems){
  if(!D.todayFlowOrder||typeof D.todayFlowOrder!=='object') D.todayFlowOrder={};
  const today=todayDateKey();
  D.todayFlowOrder[today]=orderedItems.map(e=>({
    kind:e.kind,
    id:e.kind==='habit-flow'?(e.chain?.id):e.item?.id
  }));
  sv();
}
// ==================================================
// Today Flow: Rendering
// renderTodayFlow() builds the list; renderTodayFlowItem() renders one entry.
// habit-flow entries are handled by renderHabitChain(), defined below with habit rendering.
// ==================================================
function renderTodayFlowDropZone(pos){
  return`<div class="today-flow-drop-zone" data-pos="${pos}" ondragover="event.preventDefault();this.classList.add('on')" ondragleave="this.classList.remove('on')" ondrop="dropTodayFlowItem(event,${pos})"></div>`;
}
function renderTodayFlow(chains=buildHabitChains()){
  const el=document.getElementById('today-flow-list');
  if(!el) return;
  const items=buildTodayFlow(chains);
  if(!items.length){
    el.innerHTML='<div class="today-flow-empty">No actions planned yet. Add one quick task or begin with your first habit flow.</div>';
    return;
  }
  const hint=todayFlowReorderMode?'<div class="today-flow-reorder-hint">Tap ↑ ↓ to reorder</div>':'';
  let html=hint+'<div class="today-flow-sequence">';
  items.forEach((entry,i)=>{
    html+=(todayFlowReorderMode?'':renderTodayFlowDropZone(i))+renderTodayFlowItem(entry,i);
  });
  html+=(todayFlowReorderMode?'':renderTodayFlowDropZone(items.length))+'</div>';
  el.innerHTML=html;
}
function renderTodayFlowItem(entry,flowIndex=0){
  if(entry.kind==='habit-flow'){
    return renderHabitChain(entry.chain,flowIndex);
  }
  if(entry.kind==='task'){
    const t=entry.item;
    const moveCtrl=todayFlowReorderMode
      ?`<div class="tf-move-btns"><button class="tf-move-btn" onclick="moveTodayFlowItem('task','${t.id}',-1)" title="Move up">↑</button><button class="tf-move-btn" onclick="moveTodayFlowItem('task','${t.id}',1)" title="Move down">↓</button></div>`
      :`<span class="tf-drag-handle" title="Drag to reorder (desktop)">&#8801;</span>`;
    const taskDelete=todayFlowReorderMode?'':`<button type="button" class="tf-delete-btn" onclick="stopUiEvent(event);deleteTodayTask('${t.id}')" title="Remove task">&#215;</button>`;
    return`<div class="today-flow-item task quick-task-row ${t.completed?'done':''} ${todayFlowReorderMode?'reorder-active':''}" data-flow-kind="task" data-flow-id="${t.id}" draggable="true" ondragstart="startTodayFlowDrag(event,'task','${t.id}')" ondragend="endTodayFlowDrag(event)">
      <button type="button" class="mini-check ${t.completed?'on':''}" onclick="stopUiEvent(event);toggleTodayTask('${t.id}',event.currentTarget)">${t.completed?'&#10003;':''}</button>
      <div class="quick-task-text"><strong>${escapeHtml(t.title)}</strong><small>Quick task</small></div>
      ${taskDelete}
      ${moveCtrl}
    </div>`;
  }
  const b=entry.item;
  const moveCtrl=todayFlowReorderMode
    ?`<div class="tf-move-btns"><button class="tf-move-btn" onclick="moveTodayFlowItem('focus','${b.id}',-1)" title="Move up">↑</button><button class="tf-move-btn" onclick="moveTodayFlowItem('focus','${b.id}',1)" title="Move down">↓</button></div>`
    :`<span class="tf-drag-handle" title="Drag to reorder (desktop)">&#8801;</span>`;
  const focusActions=todayFlowReorderMode?'':`<div class="tf-focus-actions"><button type="button" class="btn bs" onclick="stopUiEvent(event);startTodayFocusBlock('${b.id}')">Start Focus</button><button type="button" class="tf-delete-btn" onclick="stopUiEvent(event);deleteFocusBlock('${b.id}')" title="Remove focus block">&#215;</button></div>`;
  return`<div class="today-flow-item focus compact-focus-row ${b.completed?'done':''} ${todayFlowReorderMode?'reorder-active':''}" data-flow-kind="focus" data-flow-id="${b.id}" draggable="true" ondragstart="startTodayFlowDrag(event,'focus','${b.id}')" ondragend="endTodayFlowDrag(event)">
    <button type="button" class="mini-check ${b.completed?'on':''}" onclick="stopUiEvent(event);toggleFocusBlock('${b.id}',event.currentTarget)">${b.completed?'&#10003;':''}</button>
    <div class="quick-task-text"><strong>${escapeHtml(b.title)}</strong><small>${escapeHtml(b.type)} &middot; ${Number(b.duration)||60} min</small></div>
    ${focusActions}
    ${moveCtrl}
  </div>`;
}
function toggleTodayDesignMode(){
  todayDesignMode=!todayDesignMode;
  renHabits();
}
function habitDetailBlock(h,i,chain,position){
  const str=streak(h);
  const stacked=i<D.habits.length-1;
  return`<div class="habit-detail-block">
    <div><strong>Identity</strong><span>${escapeHtml(h.id2||'No identity statement yet.')}</span></div>
    <div><strong>Cue</strong><span>${escapeHtml(h.sk||'No cue yet.')}</span></div>
    <div><strong>Tiny minimum</strong><span>${escapeHtml(h.tm||'No tiny minimum yet.')}</span></div>
    <div><strong>Frequency</strong><span>${escapeHtml(freqLabel(h))}</span></div>
    <div><strong>Rhythm</strong><span>${str>0?`${str} day streak`:'Ready to start today'}</span></div>
    <div><strong>Stack</strong><span>${chain.items.length>1?`Step ${position+1} of ${chain.items.length}`:'Standalone habit'}</span></div>
    <div><strong>Start time</strong><span>${escapeHtml(h.startTime||'No start time')}</span></div>
    <div><strong>Move to</strong><span><select class="habit-chain-select" onclick="event.stopPropagation()" onchange="moveHabitToGroup(${i},this.value)">${renderChainMoveOptions(chain.id)}</select></span></div>
    <div class="habit-design-actions">
      <button type="button" class="btn bs" onclick="stopUiEvent(event);showEditHabit(${i})">Edit</button>
      <button type="button" class="habit-move-btn" onclick="stopUiEvent(event);moveHabit(${i},-1)" ${position===0?'disabled':''} title="Move up">▲</button>
      <button type="button" class="habit-move-btn" onclick="stopUiEvent(event);moveHabit(${i},1)" ${position===chain.items.length-1?'disabled':''} title="Move down">▼</button>
      <button type="button" class="btn bs" onclick="stopUiEvent(event);moveHabitOutOfChain(${i})">Move to Today</button>
      ${stacked?`<button type="button" class="btn bs" onclick="stopUiEvent(event);toggleStack(${i})">${h.stackedToNext?'Unstack':'Stack next'}</button>`:''}
    </div>
  </div>`;
}
function renderNodeProgress(chain,activeIndex,{compact=true}={}){
  const theme=flowTheme(chain);
  const cid=chain.id||'';
  return`<div class="flow-node-track ${compact?'compact':'large'}" style="--flow-accent:${theme.accent}">
    ${chain.items.map((item,pos)=>{
      const done=habitIsDoneToday(item.habit);
      const state=done?'done':pos===activeIndex?'current':'upcoming';
      const lineState=done?'done':'open';
      const nodeEl=done
        ?`<button class="flow-node done clickable" type="button" title="Tap to undo step" onclick="uncompleteHabitInFlow(${item.index},'${cid}',this)">✓</button>`
        :`<span class="flow-node ${state}"></span>`;
      return`<span class="flow-node-wrap">
        ${nodeEl}
        ${pos<chain.items.length-1?`<span class="flow-node-line ${lineState}"></span>`:''}
      </span>`;
    }).join('')}
  </div>`;
}
function renderFlowSegments(chain,activeIndex){return renderNodeProgress(chain,activeIndex);}
let habitDragIndex=null;
function startHabitDrag(e,index){
  habitDragIndex=index;
  e.dataTransfer?.setData('text/plain',String(index));
  e.dataTransfer?.setDragImage?.(e.currentTarget,20,20);
  e.currentTarget.classList.add('habit-dragging');
}
function endHabitDrag(e){
  habitDragIndex=null;
  e.currentTarget?.classList.remove('habit-dragging');
  document.querySelectorAll('.habit-drop-zone.on').forEach(el=>el.classList.remove('on'));
}
function allowHabitDrop(e){e.preventDefault();}
function enterHabitDrop(e){e.preventDefault();e.currentTarget?.classList.add('on');}
function leaveHabitDrop(e){e.currentTarget?.classList.remove('on');}
function dropHabitOnGroup(e,groupId,position=null){
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget?.classList.remove('on');
  const idx=habitDragIndex??Number(e.dataTransfer?.getData('text/plain'));
  if(!Number.isFinite(idx)) return;
  moveHabitToGroup(idx,groupId,position);
  habitDragIndex=null;
}
function renderHabitDropZone(groupId,position){
  return`<div class="habit-drop-zone" data-group-id="${groupId}" data-position="${position}" ondragover="enterHabitDrop(event)" ondragenter="enterHabitDrop(event)" ondragleave="leaveHabitDrop(event)" ondrop="dropHabitOnGroup(event,'${groupId}',${position})"></div>`;
}
let habitPointerState=null;
function isHabitPointerIgnored(target){
  return !!target.closest('button,input,select,textarea,a,.habit-more summary,.habit-detail-block');
}
function startHabitPointer(e,index){
  if(e.pointerType==='mouse'||isHabitPointerIgnored(e.target)) return;
  const target=e.currentTarget;
  habitPointerState={index,target,active:false,zone:null,timer:null};
  habitPointerState.timer=setTimeout(()=>{
    habitPointerState.active=true;
    habitDragIndex=index;
    target.classList.add('habit-touch-dragging');
    try{target.setPointerCapture?.(e.pointerId);}catch(_){}
  },280);
  window.addEventListener('pointermove',moveHabitPointer,{passive:false});
  window.addEventListener('pointerup',endHabitPointer,{once:true});
  window.addEventListener('pointercancel',cancelHabitPointer,{once:true});
}
function moveHabitPointer(e){
  if(!habitPointerState) return;
  if(!habitPointerState.active) return;
  e.preventDefault();
  const zone=document.elementFromPoint(e.clientX,e.clientY)?.closest?.('.habit-drop-zone');
  if(zone!==habitPointerState.zone){
    habitPointerState.zone?.classList.remove('on');
    habitPointerState.zone=zone;
    zone?.classList.add('on');
  }
}
function endHabitPointer(e){
  if(!habitPointerState) return;
  clearTimeout(habitPointerState.timer);
  window.removeEventListener('pointermove',moveHabitPointer);
  const state=habitPointerState;
  habitPointerState=null;
  state.target?.classList.remove('habit-touch-dragging');
  if(state.active&&state.zone){
    e.preventDefault();
    const groupId=state.zone.dataset.groupId||'loose';
    const position=Number(state.zone.dataset.position);
    state.zone.classList.remove('on');
    moveHabitToGroup(state.index,groupId,Number.isFinite(position)?position:null);
  }
  habitDragIndex=null;
}
function cancelHabitPointer(){
  if(!habitPointerState) return;
  clearTimeout(habitPointerState.timer);
  window.removeEventListener('pointermove',moveHabitPointer);
  habitPointerState.target?.classList.remove('habit-touch-dragging');
  habitPointerState.zone?.classList.remove('on');
  habitPointerState=null;
  habitDragIndex=null;
}

// ── TODAY FLOW DRAG & DROP ──────────────────────────────
let todayFlowDragKind=null,todayFlowDragId=null;
let todayFlowReorderMode=false;
function startTodayFlowDrag(e,kind,id){
  if(e.target.closest('.habit-draggable,.habit-drag-handle')) return;
  if(e.target.closest('button,input,select,textarea')) return;
  todayFlowDragKind=kind;
  todayFlowDragId=id;
  e.dataTransfer?.setData('text/plain',`${kind}:${id}`);
  e.currentTarget.classList.add('today-flow-dragging');
}
function endTodayFlowDrag(e){
  todayFlowDragKind=null;
  todayFlowDragId=null;
  e.currentTarget?.classList.remove('today-flow-dragging');
  document.querySelectorAll('.today-flow-drop-zone.on').forEach(el=>el.classList.remove('on'));
}
function dropTodayFlowItem(e,dropPos){
  e.preventDefault();
  e.stopPropagation();
  document.querySelectorAll('.today-flow-drop-zone.on').forEach(el=>el.classList.remove('on'));
  const raw=e.dataTransfer?.getData('text/plain')||'';
  const colonIdx=raw.indexOf(':');
  const kind=todayFlowDragKind||(colonIdx>0?raw.slice(0,colonIdx):'');
  const id=todayFlowDragId||(colonIdx>0?raw.slice(colonIdx+1):'');
  todayFlowDragKind=null;
  todayFlowDragId=null;
  if(!kind||!id) return;
  const chains=buildHabitChains();
  const allItems=buildTodayFlow(chains);
  const getKey=e2=>e2.kind==='habit-flow'?`habit-flow:${e2.chain?.id||e2.item?.id}`:`${e2.kind}:${e2.item?.id}`;
  const dragKey=`${kind}:${id}`;
  const fromIdx=allItems.findIndex(e2=>getKey(e2)===dragKey);
  if(fromIdx<0) return;
  const newItems=[...allItems];
  const [removed]=newItems.splice(fromIdx,1);
  const insertAt=fromIdx<dropPos?dropPos-1:dropPos;
  newItems.splice(Math.max(0,Math.min(insertAt,newItems.length)),0,removed);
  saveTodayFlowOrder(newItems);
  renHabits();
}
function toggleTodayFlowReorderMode(){
  todayFlowReorderMode=!todayFlowReorderMode;
  renHabits();
}
function moveTodayFlowItem(kind,id,dir){
  const chains=buildHabitChains();
  const allItems=buildTodayFlow(chains);
  const getKey=e=>e.kind==='habit-flow'?`habit-flow:${e.chain?.id||e.item?.id}`:`${e.kind}:${e.item?.id}`;
  const key=`${kind}:${id}`;
  const idx=allItems.findIndex(e=>getKey(e)===key);
  if(idx<0) return;
  const newIdx=idx+dir;
  if(newIdx<0||newIdx>=allItems.length) return;
  const newItems=[...allItems];
  const [removed]=newItems.splice(idx,1);
  newItems.splice(newIdx,0,removed);
  saveTodayFlowOrder(newItems);
  renHabits();
}
function uncompleteHabitInFlow(habitIndex,chainId,targetEl=null){
  const k=tdk();
  const h=D.habits[habitIndex];
  if(!h||!h.log[k]) return;
  const chains=buildHabitChains();
  const chain=chains.find(c=>c.id===chainId);
  if(chain){
    const pos=chain.items.findIndex(x=>x.index===habitIndex);
    if(pos>=0){
      chain.items.slice(pos).forEach(ci=>{
        if(habitIsDoneToday(ci.habit)){
          D.habits[ci.index].log[k]=false;
          removeXpEventByRewardKey(habitRewardKey(D.habits[ci.index],k),{save:false});
        }
      });
      saveAndRender('today');
      return;
    }
  }
  togH(habitIndex,targetEl);
}
function renderChainMoveOptions(currentGroupId){
  return buildHabitGroupsAll().map(g=>`<option value="${g.id}" ${g.id===currentGroupId?'selected':''}>${escapeHtml(g.title)}</option>`).join('');
}
function renderAddHabitChainOptions(){
  const groups=buildHabitGroupsAll();
  const options=[`<option value="loose">Today / Other Habits</option>`];
  groups.filter(g=>g.id!=='loose').forEach(g=>{
    options.push(`<option value="${g.id}">Add to ${escapeHtml(g.title)}</option>`);
  });
  return options.join('');
}
function addHabitToSelectedFlow(habit,chainId='loose'){
  const groups=buildHabitGroupsAll();
  let target=groups.find(g=>g.id===chainId);
  if(!target){
    target={id:'loose',title:'Today',items:[]};
    groups.push(target);
  }
  target.items.push({habit,index:D.habits.length});
  rebuildHabitsFromGroups(groups);
}
function habitActionIdentity(action){
  const clean=String(action||'').trim();
  if(!clean) return 'I am someone who keeps promises to myself.';
  return `I am someone who follows through on ${clean.toLowerCase()}.`;
}
function cleanHabitConfirmationPhrase(text,type){
  let clean=String(text||'').trim();
  if(type==='trigger') clean=clean.replace(/^after\s+i\s+/i,'');
  if(type==='action') clean=clean.replace(/^i\s+will\s+/i,'');
  return clean||text||'this cue';
}
function showHabitCreatedConfirmation(trigger,action){
  const existing=document.querySelector('.habit-created-pop');
  if(existing) existing.remove();
  const triggerText=cleanHabitConfirmationPhrase(trigger,'trigger');
  const actionText=cleanHabitConfirmationPhrase(action,'action');
  const pop=document.createElement('div');
  pop.className='habit-created-pop';
  pop.innerHTML=`
    <div class="habit-created-link">
      <div class="habit-created-node"><strong>Trigger</strong>${escapeHtml(triggerText)}</div>
      <div class="habit-created-line"></div>
      <div class="habit-created-node"><strong>New habit</strong>${escapeHtml(actionText)}</div>
    </div>
    <h3>New habit started!</h3>
    <p>Every time you "${escapeHtml(triggerText)}", do "${escapeHtml(actionText)}" afterwards.</p>`;
  document.body.appendChild(pop);
  setTimeout(()=>pop.remove(),2100);
}
function renderCurrentStepSubCard(chain,activeIndex,theme){
  if(activeIndex<0) return '<div class="flow-current-step complete">Routine complete for today.</div>';
  const item=chain.items[activeIndex];
  const h=item.habit;
  return`<div class="flow-current-step" style="--flow-accent:${theme.accent}">
    <div class="flow-step-label">Current Step</div>
    <div class="flow-step-main">
      <span class="flow-step-check"></span>
      <strong>${escapeHtml(activeStepTitle(h))}</strong>
    </div>
    <p>${escapeHtml(h.sk||'Follow this cue and do the next tiny action.')}</p>
    <div class="flow-step-actions">
      <button type="button" class="btn bs" onclick="stopUiEvent(event);toast('Skip keeps this step open for later.')">Skip</button>
      <button type="button" class="btn bp" onclick="stopUiEvent(event);togH(${item.index},event.currentTarget)">✓ Complete</button>
    </div>
    <span class="flow-step-pill">🔗 ${escapeHtml(compactHabitSubline(h)||'Current link')}</span>
  </div>`;
}
function renderFlowNodeRow(chain,activeIndex){
  return `<div class="flow-card-node-row">${renderNodeProgress(chain,activeIndex,{compact:false})}</div>`;
}
function renderFlowEditPanel(chain){
  return`<div class="flow-edit-panel">
    <div class="flow-edit-head">
      <strong>Edit Flow Steps</strong>
      <button type="button" class="flow-edit-add" onclick="stopUiEvent(event);showAddHabit('${chain.id}')">+ Add habit</button>
    </div>
    ${chain.items.map((item,pos)=>{
      const h=item.habit,i=item.index;
      const name=escapeHtml(habitDisplayName(h)||h.name||'Step');
      return`<div class="flow-edit-step">
        <div class="flow-edit-step-info">
          <span class="flow-edit-step-num">${pos+1}</span>
          <span class="flow-edit-step-name">${name}</span>
        </div>
        <div class="flow-edit-step-actions">
          <button class="flow-edit-move-btn" onclick="moveHabit(${i},-1)" ${pos===0?'disabled':''} title="Move up">▲</button>
          <button class="flow-edit-move-btn" onclick="moveHabit(${i},1)" ${pos===chain.items.length-1?'disabled':''} title="Move down">▼</button>
          <button class="flow-edit-move-btn del" onclick="deleteHabit(${i})" title="Remove step">✕</button>
        </div>
      </div>`;
    }).join('')}
    <p class="flow-edit-note">Changes save immediately. To reorder cards, use the Edit order button above Today Flow.</p>
  </div>`;
}
function editHabitFlow(chainId){
  editingFlowId=editingFlowId===chainId?null:chainId;
  todayDesignMode=!!editingFlowId;
  renHabits();
}
function renderHabitRow(item,chain,position,active=false,primary=false){
  const h=item.habit,i=item.index,done=habitIsDoneToday(h);
  const name=escapeHtml(habitDisplayName(h));
  const subline=escapeHtml(compactHabitSubline(h));
  if(active){
    return`<div class="active-habit-card habit-draggable ${primary?'primary-focus':''}" id="hi-${i}" draggable="true" onpointerdown="startHabitPointer(event,${i})" ondragstart="startHabitDrag(event,${i})" ondragend="endHabitDrag(event)" ondragover="allowHabitDrop(event)" ondrop="dropHabitOnGroup(event,'${chain.id}',${position})">
      <div class="active-kicker">${primary?'Do this now':'Current step'}</div>
      <h3>${name}</h3>
      <div class="tiny-action">${escapeHtml(h.tm||'Do the smallest honest version now.')}</div>
      <button type="button" class="complete-action-btn" onclick="stopUiEvent(event);togH(${i},event.currentTarget)">Complete</button>
      <details class="habit-more">
        <summary>Details</summary>
        ${habitDetailBlock(h,i,chain,position)}
      </details>
      ${todayDesignMode?habitDetailBlock(h,i,chain,position):''}
    </div>`;
  }
  return`<details class="habit-row-wrap habit-draggable ${done?'done':'upcoming'}" id="hi-${i}" draggable="true" onpointerdown="startHabitPointer(event,${i})" ondragstart="startHabitDrag(event,${i})" ondragend="endHabitDrag(event)" ondragover="allowHabitDrop(event)" ondrop="dropHabitOnGroup(event,'${chain.id}',${position})">
    <summary class="compact-habit-row">
      <button type="button" class="mini-check ${done?'on':''}" onclick="stopUiEvent(event);togH(${i},event.currentTarget)">${done?'✓':''}</button>
      <span>${name}</span>
      ${subline?`<small>${subline}</small>`:''}
    </summary>
    ${habitDetailBlock(h,i,chain,position)}
    ${todayDesignMode?`<div class="habit-design-note">Design mode is on for this routine.</div>`:''}
  </details>`;
}
// renderHabitChain() is the Today Flow entry renderer for habit-flow cards.
// It lives here with its direct dependencies (renderHabitRow, renderCurrentStepSubCard, etc.).
// Called by renderTodayFlowItem() when entry.kind === 'habit-flow'.
function renderHabitChain(chain,flowIndex=0){
  const doneCount=chain.items.filter(x=>habitIsDoneToday(x.habit)).length;
  const activeIndex=chain.items.findIndex(x=>!habitIsDoneToday(x.habit));
  const identity=chain.items[activeIndex>=0?activeIndex:0]?.habit?.id2||'Every action is a vote for the person you wish to become.';
  const currentFocus=getCurrentFocus();
  const primary=currentFocus.type==='habit'&&currentFocus.chain?.id===chain.id;
  const fullChain=buildHabitGroupsAll().find(g=>g.id===chain.id);
  const startTime=fullChain?.items?.[0]?.habit?.startTime||chain.items[0]?.habit?.startTime||'';
  const theme=flowTheme(chain);
  const isEditing=editingFlowId===chain.id;
  const editButton=`<button type="button" class="flow-edit-btn ${isEditing?'on':''}" onclick="stopUiEvent(event);editHabitFlow('${chain.id}')">Edit</button>`;
  const flowDragAttrs=`data-flow-kind="habit-flow" data-flow-id="${chain.id}" draggable="true" ondragstart="startTodayFlowDrag(event,'habit-flow','${chain.id}')" ondragend="endTodayFlowDrag(event)"`;
  const flowMoveCtrl=todayFlowReorderMode
    ?`<div class="tf-move-btns" onclick="event.stopPropagation()"><button class="tf-move-btn" onclick="moveTodayFlowItem('habit-flow','${chain.id}',-1)" title="Move up">↑</button><button class="tf-move-btn" onclick="moveTodayFlowItem('habit-flow','${chain.id}',1)" title="Move down">↓</button></div>`
    :`<span class="tf-drag-handle" onclick="event.stopPropagation()" title="Drag to reorder (desktop)">&#8801;</span>`;
  if(doneCount===chain.items.length){
    return`<details class="habit-flow-card completed-routine ${todayFlowReorderMode?'reorder-active':''}" style="--flow-accent:${theme.accent}" ${isEditing?'open':''} ${flowDragAttrs} ondragover="allowHabitDrop(event)" ondrop="dropHabitOnGroup(event,'${chain.id}')">
      <summary class="habit-flow-summary">
        <span class="habit-flow-icon">${theme.icon}</span>
        <span class="habit-flow-title"><strong>${escapeHtml(chain.title)}</strong><small>${doneCount} / ${chain.items.length} completed</small></span>
        ${editButton}
        ${flowMoveCtrl}
        <span class="habit-flow-chevron">&rsaquo;</span>
      </summary>
      ${startTime?`<div class="chain-time-badge">Starts ${escapeHtml(startTime)}</div>`:''}
      <p class="habit-flow-identity">${escapeHtml(identity)}</p>
      ${renderCurrentStepSubCard(chain,activeIndex,theme)}
      ${renderFlowNodeRow(chain,-1)}
      ${isEditing?renderFlowEditPanel(chain):''}
    </details>`;
  }
  return`<details class="habit-flow-card routine-detail ${todayFlowReorderMode?'reorder-active':''}" style="--flow-accent:${theme.accent}" ${primary||isEditing?'open':''} ${flowDragAttrs} ondragover="allowHabitDrop(event)" ondrop="dropHabitOnGroup(event,'${chain.id}')">
    <summary class="habit-flow-summary">
      <span class="habit-flow-icon">${theme.icon}</span>
      <span class="habit-flow-title"><strong>${escapeHtml(chain.title)}</strong><small>${doneCount} / ${chain.items.length} completed</small></span>
      ${editButton}
      ${flowMoveCtrl}
      <span class="habit-flow-chevron">&rsaquo;</span>
    </summary>
    ${startTime?`<div class="chain-time-badge">Starts ${escapeHtml(startTime)}</div>`:''}
    <p class="habit-flow-identity">${escapeHtml(identity)}</p>
    ${renderCurrentStepSubCard(chain,activeIndex,theme)}
    ${renderFlowNodeRow(chain,activeIndex)}
    ${isEditing?renderFlowEditPanel(chain):''}
  </details>`;
}
// ==================================================
// Actions: Habits
// UI button → action fn → state + XP → saveAndRender.
// Future React/Capacitor migration: call these domain actions or equivalent reducers.
// ==================================================
function renHabits(){
  ensureHabitData();
  ensureTodayFlow();
  renderTodayProgress();
  const toggle=document.getElementById('today-design-toggle');
  if(toggle){toggle.textContent=todayDesignMode?'Done Designing':'Design Mode';toggle.classList.toggle('on',todayDesignMode);}
  const reorderBtn=document.getElementById('today-flow-reorder-btn');
  if(reorderBtn){reorderBtn.textContent=todayFlowReorderMode?'Done':'Edit order';reorderBtn.classList.toggle('active',todayFlowReorderMode);}
  const chains=buildHabitChains();
  renderCurrentFocus(chains);
  renderTodayFlow(chains);
  const hlist=document.getElementById('hlist');
  if(!hlist){
    renderTodayXpFeed();
    renHCsel();
    return;
  }
  if(!D.habits.length){
    hlist.innerHTML='<div class="card"><p class="char-note">No habits yet. Add one tiny action to begin today.</p></div>';
    renderTodayXpFeed();
    renHCsel();
    return;
  }
  if(!chains.length){
    hlist.innerHTML='<div class="card"><p class="char-note">No habits are scheduled for today.</p></div>';
    renderTodayXpFeed();
    renHCsel();
    return;
  }
  hlist.innerHTML=chains.map(renderHabitChain).join('');
  renderTodayXpFeed();
  renHCsel();
}
function toggleStack(i){D.habits[i].stackedToNext=!D.habits[i].stackedToNext;sv();renHabits();}
function moveHabit(i,dir){moveHabitWithinGroup(i,dir);}
function togH(i,targetEl=null){
  const k=tdk(),h=D.habits[i],was=!!h.log[k];
  h.log[k]=!was;
  if(!was){
    const xp=maybeAwardHabitXp(h,k,{showToast:true});
    showXpFloat(targetEl,xp);
  } else {
    removeXpEventByRewardKey(habitRewardKey(h,k),{save:false});
  }
  sv();renHabits();renCal();
}

function showEditHabit(i){
  const h=D.habits[i];
  window._editFreq['edit']={...(h.freq||{type:'daily',days:[]}),days:[...((h.freq||{}).days||[])]};
  document.getElementById('mod').innerHTML=`
    <h2 class="habit-builder-title">Edit Habit Link</h2>
    <p class="habit-form-intro">Keep the trigger and action connected so the habit remains easy to execute.</p>
    <div class="habit-builder-grid">
      <div class="habit-link-box trigger">
        <div class="habit-link-label">Trigger</div>
        <p class="habit-link-help">What existing action starts this habit?</p>
        <input type="text" id="edit-hsk" value="${escapeHtml(h.sk||'')}" placeholder="After I..." class="mb10">
      </div>
      <div class="habit-node-connector"><div class="habit-conn-line"></div><span class="habit-conn-pill">then</span><div class="habit-conn-line"></div></div>
      <div class="habit-link-box action">
        <div class="habit-link-label">New habit</div>
        <p class="habit-link-help">What happens immediately afterward?</p>
        <input type="text" id="edit-hname-label" value="${escapeHtml(h.name||'')}" placeholder="I will..." class="mb10">
      </div>
    </div>
    <div class="habit-form-section primary">
      <div class="habit-form-label">Tiny version</div>
      <p class="habit-form-hint">Make it so small you can do it on a bad day.</p>
      <input type="text" id="edit-htm" value="${escapeHtml(h.tm||'')}" class="mb10">
      <label>Start time <em>(optional)</em></label><input type="time" id="edit-hstart" value="${escapeHtml(h.startTime||'')}" class="mb10">
    </div>
    <details class="habit-form-section secondary" open>
      <summary>Secondary</summary>
      <label>Identity statement <em>(I am...)</em></label><input type="text" id="edit-hname" value="${escapeHtml(h.id2||'')}" class="mb10">
      <div id="edit-freq-wrap">${renderFreqPicker(h,'edit')}</div>
    </details>
    <div class="brow">
      <button type="button" class="btn bp" onclick="saveEditHabit(${i})">Save</button>
      <button type="button" class="btn bd" onclick="deleteHabit(${i})">Delete</button>
      <button type="button" class="btn bs" onclick="closeMod()">Cancel</button>
    </div>`;
  document.getElementById('mov').classList.remove('hid');
  setTimeout(()=>document.getElementById('edit-hname-label').focus(),50);
}
function saveEditHabit(i){
  const nameLabel=document.getElementById('edit-hname-label').value.trim();
  const name=document.getElementById('edit-hname').value.trim()||habitActionIdentity(nameLabel);
  const sk=document.getElementById('edit-hsk').value.trim();
  const tm=document.getElementById('edit-htm').value.trim();
  const startTime=document.getElementById('edit-hstart').value||'';
  if(!nameLabel||!sk||!tm){toast('Please fill trigger, habit, and tiny version.');return;}
  D.habits[i].name=nameLabel;D.habits[i].id2=name;D.habits[i].sk=sk;D.habits[i].tm=tm;
  D.habits[i].startTime=startTime;
  D.habits[i].freq=window._editFreq['edit']||{type:'daily',days:[]};
  closeMod();saveAndRender('today');
}
function deleteHabit(i){
  if(!confirm('Delete this habit and all its data?'))return;
  const deleted=D.habits[i];
  if(deleted?.id) removeFromTodayFlowOrder('flow',deleted.id);
  removeXpEventsByRewardPrefix(habitRewardPrefix(D.habits[i]),{save:false});
  D.habits.splice(i,1);if(D.ahi>=D.habits.length)D.ahi=Math.max(0,D.habits.length-1);
  closeMod();saveAndRender('today');
}
function showAddHabit(chainId=''){
  window._editFreq['add']={type:'daily',days:[]};
  document.getElementById('mod').innerHTML=`
    <h2 class="habit-builder-title">New Habit</h2>
    <p class="habit-form-intro">Attach a new action to something that already happens.</p>
    <div class="habit-ii-preview">After I <strong id="habit-ii-trig">&hellip;</strong>, I will <strong id="habit-ii-act">&hellip;</strong>.</div>
    <div class="habit-nodes-wrap">
      <div class="habit-node-card preceding">
        <div class="habit-node-top">
          <span class="habit-bullseye"></span>
          <div>
            <div class="habit-node-label">Preceding Event</div>
            <p class="habit-node-hint">What already happens right before?</p>
          </div>
        </div>
        <input type="text" id="ms" placeholder="After I finish breakfast&hellip;" oninput="var el=document.getElementById('habit-ii-trig');if(el)el.textContent=this.value||'…'">
      </div>
      <div class="habit-node-connector">
        <div class="habit-conn-line"></div>
        <span class="habit-conn-pill">then</span>
        <div class="habit-conn-line"></div>
      </div>
      <div class="habit-node-card new-habit">
        <div class="habit-node-top">
          <span class="habit-bullseye active"></span>
          <div>
            <div class="habit-node-label action">New Habit</div>
            <p class="habit-node-hint">The action you want to build.</p>
          </div>
        </div>
        <input type="text" id="mn" placeholder="I will do 5 push-ups&hellip;" oninput="var el=document.getElementById('habit-ii-act');if(el)el.textContent=this.value||'…'">
      </div>
    </div>
    <div class="habit-placement-row">
      <div>
        <label>Start time <em>(optional)</em></label>
        <input type="time" id="mst">
      </div>
      <div>
        <label>Show in</label>
        <select id="mchain">${renderAddHabitChainOptions()}</select>
      </div>
    </div>
    <details class="habit-form-section secondary">
      <summary>More options</summary>
      <label>Tiny version <em>(optional)</em></label><input type="text" id="mt" placeholder="Smallest possible version&hellip;" class="mb10">
      <label>Identity statement <em>(optional)</em></label><input type="text" id="mi" placeholder="I am someone who&hellip;" class="mb10">
      <div id="add-freq-wrap">${renderFreqPicker(null,'add')}</div>
    </details>
    <div class="brow"><button type="button" class="btn bp" onclick="saveHabit()">Add Habit</button><button type="button" class="btn bs" onclick="closeMod()">Cancel</button></div>`;
  document.getElementById('mov').classList.remove('hid');
  if(chainId&&document.getElementById('mchain')) document.getElementById('mchain').value=chainId;
  setTimeout(()=>document.getElementById('ms').focus(),50);
}
function saveHabit(){
  const n=document.getElementById('mn').value.trim();
  const s=document.getElementById('ms').value.trim();
  if(!n||!s){toast('Please fill in the Preceding Event and New Habit fields.');return;}
  const i=document.getElementById('mi')?.value.trim()||habitActionIdentity(n);
  const t=document.getElementById('mt')?.value.trim()||'';
  const startTime=document.getElementById('mst')?.value||'';
  const chainId=document.getElementById('mchain')?.value||'loose';
  if(!n||!s||!t){toast('Please fill trigger, habit, and tiny version.');return;}
  const habit={id:createId('h'),name:n,id2:i,sk:s,tm:t,startTime,added:Date.now(),log:{},freq:window._editFreq['add']||{type:'daily',days:[]}};
  addHabitToSelectedFlow(habit,chainId);
  closeMod();saveAndRender('today');
  showHabitCreatedConfirmation(s,n);
}
function renderTodayPlacementOptions(selected='later'){
  const options=[
    ['start','Start of Today'],
    ['midday','Midday'],
    ['evening','Evening'],
    ['later','Flexible / Later']
  ];
  const chainOptions=buildHabitChains().map(c=>[`afterFlow:${c.id}`,`After ${c.title}`]);
  return [...options.slice(0,1),...chainOptions,...options.slice(1)].map(([value,label])=>`<option value="${escapeHtml(value)}" ${value===selected?'selected':''}>${escapeHtml(label)}</option>`).join('');
}
function todayPlacementValue(item){
  if(item.placementType==='afterFlow') return `afterFlow:${item.placementId||''}`;
  return item.placementType||'later';
}
function parseTodayPlacement(value){
  const raw=String(value||'later');
  if(raw.startsWith('afterFlow:')) return {placementType:'afterFlow',placementId:raw.slice(10)};
  if(['start','midday','evening','later'].includes(raw)) return {placementType:raw,placementId:''};
  return {placementType:'later',placementId:''};
}
// Today Flow ordering helpers — complement the Data / Ordering Helpers section above.
// makeTodayFlowOrderKey / removeFromTodayFlowOrder are used by delete actions below.
function makeTodayFlowOrderKey(entry){
  if(!entry) return '';
  if(entry.kind&&entry.item?.id) return `${entry.kind}:${entry.item.id}`;
  if(entry.kind==='habit-flow'&&entry.chain?.id) return `flow:${entry.chain.id}`;
  const kind=entry.kind||entry.type||'item';
  const id=entry.id||entry.placementId||entry.chain?.id||'';
  return id?`${kind}:${id}`:'';
}
function removeFromTodayFlowOrder(kind,id,dateKey=todayDateKey()){
  if(!D.todayFlowOrder||typeof D.todayFlowOrder!=='object') return;
  const order=D.todayFlowOrder[dateKey];
  if(!Array.isArray(order)) return;
  const aliases=new Set([`${kind}:${id}`]);
  if(kind==='task') aliases.add(`today-task:${id}`);
  if(kind==='focus') aliases.add(`focus-block:${id}`);
  if(kind==='flow'||kind==='habit-flow'){
    aliases.add(`flow:${id}`);
    aliases.add(`habit-flow:${id}`);
    aliases.add(`chain:${id}`);
  }
  D.todayFlowOrder[dateKey]=order.filter(item=>{
    if(typeof item==='string') return !aliases.has(item);
    const key=makeTodayFlowOrderKey(item);
    return !aliases.has(key)&&item?.id!==id;
  });
}
function updateTodayEntryPlacement(kind,id,value){
  const arr=kind==='task'?D.todayTasks:D.focusBlocks;
  const item=arr.find(x=>x.id===id);
  if(!item) return;
  const placement=parseTodayPlacement(value);
  item.placementType=placement.placementType;
  item.placementId=placement.placementId;
  item.order=nextTodayOrder();
  saveAndRender('today');
}
function nextTodayOrder(){
  const entries=todayEntries();
  return entries.length?Math.max(...entries.map(e=>Number(e.item.order)||0))+1:0;
}
// ==================================================
// Actions: Today Tasks / Focus Blocks
// UI button → action fn → state + XP → saveAndRender.
// Current Focus re-derives from Today Flow order on every render — no separate state to sync.
// Future React/Capacitor migration: call these domain actions or equivalent reducers.
// ==================================================
function showAddTodayTask(){
  document.getElementById('mod').innerHTML=`
    <h2>New Quick Task</h2>
    <p class="habit-form-intro">Add one temporary action for today. This is not a habit.</p>
    <label>Task name</label><input type="text" id="today-task-title" placeholder="Go to groceries" class="mb10">
    <label>Where should it fit today?</label><select id="today-task-placement" class="mb10">${renderTodayPlacementOptions()}</select>
    <label>Notes <em>(optional)</em></label><textarea id="today-task-notes" rows="3" placeholder="Anything useful to remember"></textarea>
    <div class="brow"><button type="button" class="btn bp" onclick="saveTodayTask()">Add Task</button><button type="button" class="btn bs" onclick="closeMod()">Cancel</button></div>`;
  document.getElementById('mov').classList.remove('hid');
  setTimeout(()=>document.getElementById('today-task-title')?.focus(),50);
}
function saveTodayTask(){
  ensureTodayFlow();
  const title=document.getElementById('today-task-title').value.trim();
  if(!title){toast('Task needs a name.');return;}
  const notes=document.getElementById('today-task-notes').value.trim();
  const placement=parseTodayPlacement(document.getElementById('today-task-placement').value);
  D.todayTasks.push({id:createId('task'),title,notes,date:todayDateKey(),completed:false,...placement,order:nextTodayOrder(),createdAt:Date.now(),completedAt:null});
  closeMod();saveAndRender('today');
}
function completeTodayTask(taskId,targetEl=null){
  ensureTodayFlow();
  const t=D.todayTasks.find(x=>x.id===taskId);
  if(!t||t.completed) return 0;
  t.completed=true;
  t.completedAt=Date.now();
  const xp=maybeAwardTodayTaskXp(t,{showToast:true});
  if(xp) showXpFloat(targetEl,xp);
  saveAndRender('today');
  return xp;
}
function toggleTodayTask(id,targetEl=null){
  ensureTodayFlow();
  const t=D.todayTasks.find(x=>x.id===id);
  if(!t) return;
  if(t.completed){
    removeXpEventByRewardKey(todayTaskRewardKey(t),{save:false});
    t.completed=false;
    t.completedAt=null;
    saveAndRender('today');
    return;
  }
  completeTodayTask(id,targetEl);
}
function deleteTodayTask(id){
  if(!confirm('Delete this task?')) return;
  const task=D.todayTasks.find(t=>t.id===id);
  if(task) removeXpEventByRewardKey(todayTaskRewardKey(task),{save:false});
  removeFromTodayFlowOrder('task',id);
  D.todayTasks=D.todayTasks.filter(t=>t.id!==id);
  saveAndRender('today');
}
function showAddFocusBlock(){
  document.getElementById('mod').innerHTML=`
    <h2>New Focus Block</h2>
    <p class="habit-form-intro">Plan one intentional work session without building a full calendar.</p>
    <label>Title</label><input type="text" id="focus-block-title" placeholder="Study: Philosophy" class="mb10">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><label>Type</label><select id="focus-block-type" class="mb10"><option>Deep Work</option><option>Study</option><option>Admin</option><option>Health</option><option>Recovery</option><option>Other</option></select></div>
      <div><label>Duration</label><input type="number" id="focus-block-duration" value="${selectedFocusMinutes()}" min="5" max="240" class="mb10"></div>
    </div>
    <label>Where should it fit today?</label><select id="focus-block-placement" class="mb10">${renderTodayPlacementOptions('midday')}</select>
    <label>Notes <em>(optional)</em></label><textarea id="focus-block-notes" rows="3" placeholder="Goal, project, or setup notes"></textarea>
    <div class="brow"><button type="button" class="btn bp" onclick="saveFocusBlock()">Add Focus Block</button><button type="button" class="btn bs" onclick="closeMod()">Cancel</button></div>`;
  document.getElementById('mov').classList.remove('hid');
  setTimeout(()=>document.getElementById('focus-block-title')?.focus(),50);
}
function saveFocusBlock(){
  ensureTodayFlow();
  const title=document.getElementById('focus-block-title').value.trim();
  if(!title){toast('Focus block needs a title.');return;}
  const type=document.getElementById('focus-block-type').value;
  const duration=Math.max(5,Math.min(240,parseInt(document.getElementById('focus-block-duration').value)||selectedFocusMinutes()));
  const notes=document.getElementById('focus-block-notes').value.trim();
  const placement=parseTodayPlacement(document.getElementById('focus-block-placement').value);
  D.focusBlocks.push({id:createId('focus'),title,type,duration,notes,date:todayDateKey(),completed:false,...placement,order:nextTodayOrder(),createdAt:Date.now(),completedAt:null});
  closeMod();saveAndRender('today');
}
function completeFocusBlock(blockId,targetEl=null){
  ensureTodayFlow();
  const b=D.focusBlocks.find(x=>x.id===blockId);
  if(!b||b.completed) return 0;
  b.completed=true;
  b.completedAt=Date.now();
  const xp=maybeAwardFocusBlockXp(b,{showToast:true});
  if(xp) showXpFloat(targetEl,xp);
  saveAndRender('today');
  return xp;
}
function toggleFocusBlock(id,targetEl=null){
  ensureTodayFlow();
  const b=D.focusBlocks.find(x=>x.id===id);
  if(!b) return;
  if(b.completed){
    removeXpEventByRewardKey(focusBlockRewardKey(b),{save:false});
    b.completed=false;
    b.completedAt=null;
    saveAndRender('today');
    return;
  }
  completeFocusBlock(id,targetEl);
}
function deleteFocusBlock(id){
  if(!confirm('Delete this focus block?')) return;
  const block=D.focusBlocks.find(b=>b.id===id);
  if(block) removeXpEventByRewardKey(focusBlockRewardKey(block),{save:false});
  removeFromTodayFlowOrder('focus',id);
  D.focusBlocks=D.focusBlocks.filter(b=>b.id!==id);
  saveAndRender('today');
}
function moveTodayEntry(kind,id,dir){
  const arr=kind==='task'?D.todayTasks:D.focusBlocks;
  const today=arr.filter(x=>x.date===todayDateKey()).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||(a.createdAt||0)-(b.createdAt||0));
  const pos=today.findIndex(x=>x.id===id);
  const next=pos+dir;
  if(pos<0||next<0||next>=today.length) return;
  [today[pos].order,today[next].order]=[today[next].order,today[pos].order];
  saveAndRender('today');
}
function startTodayFocusBlock(id){
  const b=D.focusBlocks.find(x=>x.id===id);
  if(!b) return;
  const plan=b.notes||b.title;
  const mins=Math.max(5,Math.min(240,parseInt(b.duration)||selectedFocusMinutes()));
  const h20=document.getElementById('h20');
  if(h20) h20.value=plan;
  navigateToTab('mind');
  if(D.phase==='idle'){
    setTimeout(()=>{
      const input=document.getElementById('h20');
      if(input) input.value=plan;
      D.h20=plan;
      _profileSteps=[{type:'focus',mins}];
      _profileIdx=0;
      startFocusPhase(mins);
    },80);
  }
}
function closeMod(){document.getElementById('mov').classList.add('hid');}

function todayInputDate(){return new Date().toISOString().split('T')[0];}
function financeMonthKey(dateStr){
  const d=dateStr?new Date(dateStr+'T12:00:00'):new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function money(n){
  const val=Number(n)||0;
  const sign=val>0?'+':val<0?'-':'';
  return `${sign}${Math.abs(val).toLocaleString('pl-PL',{maximumFractionDigits:2})} zł`;
}
let selectedFinanceExpenseTag='Other';
function renWealth(){
  ensureFinance();
  const today=todayInputDate();
  const incDate=document.getElementById('fin-income-date');
  const expDate=document.getElementById('fin-expense-date');
  if(incDate&&!incDate.value) incDate.value=today;
  if(expDate&&!expDate.value) expDate.value=today;
  if(!D.finance.categories.includes(selectedFinanceExpenseTag)) selectedFinanceExpenseTag=D.finance.categories[0]||'Other';
  renderFinanceTagPicker();
  renderFinanceBreakdown();
  renderFinanceLists();
  renderFinanceNet();
}
function financeItemTag(item){
  return item?.tag||item?.category||'Other';
}
function renderFinanceTagPicker(){
  const el=document.getElementById('fin-expense-tags');
  if(!el) return;
  el.innerHTML=D.finance.categories.map(tag=>{
    const encoded=encodeURIComponent(tag);
    const isDefault=FINANCE_CATEGORIES.includes(tag);
    const isUsed=D.finance.expenses.some(e=>financeItemTag(e)===tag);
    const canDelete=!isDefault&&!isUsed;
    return`<button class="finance-tag ${selectedFinanceExpenseTag===tag?'on':''}" onclick="selectFinanceExpenseTag(decodeURIComponent('${encoded}'))">
      <span>${escapeHtml(tag)}</span>
      ${canDelete?`<span class="finance-tag-delete" onclick="event.stopPropagation();deleteFinanceTag(decodeURIComponent('${encoded}'))">×</span>`:''}
    </button>`;
  }).join('');
}
function selectFinanceExpenseTag(tag){
  ensureFinance();
  if(D.finance.categories.includes(tag)) selectedFinanceExpenseTag=tag;
  renderFinanceTagPicker();
}
function addFinanceTag(){
  ensureFinance();
  const input=document.getElementById('fin-new-expense-tag');
  const tag=(input?.value||'').trim();
  if(!tag){toast('Name the expense tag.');return;}
  if(D.finance.categories.some(t=>t.toLowerCase()===tag.toLowerCase())){toast('That tag already exists.');return;}
  D.finance.categories.push(tag);
  selectedFinanceExpenseTag=tag;
  if(input) input.value='';
  sv();renWealth();
}
function deleteFinanceTag(tag){
  ensureFinance();
  if(FINANCE_CATEGORIES.includes(tag)){toast('Default tags stay available.');return;}
  if(D.finance.expenses.some(e=>financeItemTag(e)===tag)){toast('This tag is used by expenses.');return;}
  D.finance.categories=D.finance.categories.filter(t=>t!==tag);
  if(selectedFinanceExpenseTag===tag) selectedFinanceExpenseTag='Other';
  sv();renWealth();
}
function renderFinanceBreakdown(){
  const el=document.getElementById('finance-expense-breakdown');
  if(!el) return;
  const month=financeMonthKey(todayInputDate());
  const grouped={};
  D.finance.expenses.filter(e=>financeMonthKey(e.date)===month).forEach(e=>{
    const tag=financeItemTag(e);
    grouped[tag]=(grouped[tag]||0)+(Number(e.amount)||0);
  });
  const rows=Object.entries(grouped).sort((a,b)=>b[1]-a[1]);
  el.innerHTML=rows.length?rows.map(([tag,total])=>`
    <div class="finance-breakdown-row">
      <strong>${escapeHtml(tag)}</strong>
      <span>-${money(total).replace(/^[+-]/,'')}</span>
    </div>`).join(''):'<p class="finance-empty">No expenses this month yet.</p>';
}
function renderFinanceLists(){
  const incomeEl=document.getElementById('finance-income-list');
  const expenseEl=document.getElementById('finance-expense-list');
  if(incomeEl){
    const rows=[...D.finance.income].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
    incomeEl.innerHTML=rows.length?rows.map(item=>`
      <div class="finance-row">
        <div><strong>${escapeHtml(item.source||'Income')}</strong><small>${escapeHtml(item.date||'')}</small></div>
        <span>${money(item.amount)}</span>
        <button onclick="deleteFinanceIncome('${item.id}')">Delete</button>
      </div>`).join(''):'<p class="char-note">No income logged yet.</p>';
  }
  if(expenseEl){
    const rows=[...D.finance.expenses].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,8);
    expenseEl.innerHTML=rows.length?rows.map(item=>`
      <div class="finance-row expense">
        <div><strong>${escapeHtml(item.name||financeItemTag(item)||'Expense')}</strong><small>${escapeHtml(financeItemTag(item))} · ${escapeHtml(item.date||'')}${item.notes?` - ${escapeHtml(item.notes)}`:''}</small></div>
        <span>-${money(item.amount).replace(/^[+-]/,'')}</span>
        <button onclick="deleteFinanceExpense('${item.id}')">Delete</button>
      </div>`).join(''):'<p class="char-note">No expenses logged yet.</p>';
  }
}
function renderFinanceNet(){
  const month=financeMonthKey(todayInputDate());
  const income=D.finance.income.filter(i=>financeMonthKey(i.date)===month).reduce((s,i)=>s+(Number(i.amount)||0),0);
  const expenses=D.finance.expenses.filter(e=>financeMonthKey(e.date)===month).reduce((s,e)=>s+(Number(e.amount)||0),0);
  const net=income-expenses;
  const card=document.getElementById('finance-net-card');
  const result=document.getElementById('finance-net-result');
  const detail=document.getElementById('finance-net-detail');
  if(card){card.classList.toggle('positive',net>=0);card.classList.toggle('negative',net<0);}
  if(result) result.textContent=net>=0?`Savings this month: ${money(net)}`:`Deficit this month: ${money(net)}`;
  if(detail) detail.textContent=`Income ${money(income).replace(/^\+/,'')} - Expenses ${money(expenses).replace(/^\+/,'')}`;
}
function addFinanceIncome(targetEl=null){
  ensureFinance();
  const amount=Number(document.getElementById('fin-income-amount')?.value)||0;
  const date=document.getElementById('fin-income-date')?.value||todayInputDate();
  const source=document.getElementById('fin-income-source')?.value.trim()||'Income';
  const notes=document.getElementById('fin-income-notes')?.value.trim()||'';
  if(amount<=0){toast('Enter an income amount.');return;}
  const item={id:'fin_i_'+Date.now(),amount,date,source,notes,createdAt:Date.now()};
  D.finance.income.push(item);
  const xp=maybeAwardFinanceXp('income',item,{showToast:true});
  showXpFloat(targetEl,xp);
  ['fin-income-amount','fin-income-source','fin-income-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  sv();renWealth();
}
function addFinanceExpense(targetEl=null){
  ensureFinance();
  const amount=Number(document.getElementById('fin-expense-amount')?.value)||0;
  const date=document.getElementById('fin-expense-date')?.value||todayInputDate();
  const name=document.getElementById('fin-expense-name')?.value.trim()||'Expense';
  const tag=selectedFinanceExpenseTag||'Other';
  const notes=document.getElementById('fin-expense-notes')?.value.trim()||'';
  if(amount<=0){toast('Enter an expense amount.');return;}
  const item={id:'fin_e_'+Date.now(),amount,date,name,tag,category:tag,notes,createdAt:Date.now()};
  D.finance.expenses.push(item);
  const xp=maybeAwardFinanceXp('expense',item,{showToast:true});
  showXpFloat(targetEl,xp);
  ['fin-expense-name','fin-expense-amount','fin-expense-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  sv();renWealth();
}
function deleteFinanceIncome(id){
  const item=D.finance.income.find(i=>i.id===id);
  removeXpEventByRewardKey(financeIncomeRewardKey(item),{save:false});
  D.finance.income=D.finance.income.filter(i=>i.id!==id);
  sv();renWealth();
}
function deleteFinanceExpense(id){
  const item=D.finance.expenses.find(e=>e.id===id);
  removeXpEventByRewardKey(financeExpenseRewardKey(item),{save:false});
  D.finance.expenses=D.finance.expenses.filter(e=>e.id!==id);
  sv();renWealth();
}

// ══════════════════════════════════════════
// HABIT CALENDAR
// ══════════════════════════════════════════
function renHCsel(){
  const el=document.getElementById('hcsel');
  if(!el) return;
  el.innerHTML=D.habits.map((h,i)=>`
    <button class="tag ${D.ahi===i?'sel':''}" onclick="selAhi(${i})">${h.name||h.id2.replace(/^I am (someone who )?/i,'')}</button>`).join('');
}
function selAhi(i){D.ahi=i;renHCsel();renCal();}
function renCal(){
  const calMonth=document.getElementById('calml');
  const calGrid=document.getElementById('cgrid');
  if(!calMonth||!calGrid) return;
  const n=new Date(),y=n.getFullYear(),m=n.getMonth(),today=n.getDate();
  calMonth.textContent=n.toLocaleDateString([],{month:'long',year:'numeric'});
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  const h=D.habits[D.ahi];
  let html='';
  for(let i=0;i<first;i++) html+=`<div class="cd emp"></div>`;
  for(let d=1;d<=days;d++){
    const k=`${y}-${m}-${d}`,isDone=h&&h.log[k];
    const dt=new Date(y,m,d);
    const planned=h?isPlannedDay(h,dt):true;
    let cls;
    if(d>today) cls='fut';
    else if(isDone) cls='done';
    else if(d<today&&planned) cls='miss';
    else cls=d===today?'tod':'';
    html+=`<div class="cd ${cls}" onclick="calClk(${d},event.currentTarget)">${d}</div>`;
  }
  calGrid.innerHTML=html;
}
function calClk(d,targetEl=null){
  const n=new Date();if(d>n.getDate())return;
  const k=`${n.getFullYear()}-${n.getMonth()}-${d}`;
  const h=D.habits[D.ahi];if(!h)return;
  const was=!!h.log[k];
  h.log[k]=!was;
  if(!was){
    const xp=maybeAwardHabitXp(h,k,{showToast:true});
    showXpFloat(targetEl,xp);
  } else {
    removeXpEventByRewardKey(habitRewardKey(h,k),{save:false});
  }
  sv();renCal();renHabits();
}

// ══════════════════════════════════════════
// MEALS
// ══════════════════════════════════════════
function mealKey(d){return`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`}
function getMealDay(d){
  const k=mealKey(d);
  if(!D.meals[k]) D.meals[k]=MEAL_LABELS.map(label=>({eaten:false,time:'',label}));
  return D.meals[k];
}
function navMealDay(dir){D.mealDate=new Date(D.mealDate.getTime()+dir*864e5);renMeals();renMealsCal();}
function renMeals(){
  const d=D.mealDate,today=new Date();
  const isToday=mealKey(d)===mealKey(today),isYest=mealKey(new Date(today.getTime()-864e5))===mealKey(d);
  document.getElementById('meal-date-lbl').textContent=d.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'});
  document.getElementById('meal-date-sub').textContent=isToday?'Today':isYest?'Yesterday':'';
  document.getElementById('meal-today-badge').textContent=isToday?'Today':d.toLocaleDateString([],{month:'short',day:'numeric'});
  // Apply locked times if the day's slot has no time yet
  const slots=getMealDay(d);
  if(!D.mealLockedTimes) D.mealLockedTimes=[null,null,null,null,null];
  slots.forEach((slot,i)=>{if(!slot.time && D.mealLockedTimes[i]) slot.time=D.mealLockedTimes[i];});
  const eaten=slots.filter(s=>s.eaten).length;
  document.getElementById('meal-progress-row').innerHTML=
    slots.map(s=>`<span class="meal-progress-pip" style="background:${s.eaten?'var(--grn)':'var(--bdr)'}"></span>`).join('')+
    ` <span>${eaten} of 5 meals eaten</span>`;
  document.getElementById('meal-slots').innerHTML=slots.map((slot,idx)=>{
    const locked=D.mealLockedTimes[idx]!==null&&D.mealLockedTimes[idx]!==undefined;
    return`<div class="meal-slot ${slot.eaten?'ate':''}" id="ms-${idx}">
      <button class="meal-check ${slot.eaten?'on':''}" onclick="togMeal(${idx},event.currentTarget)">✓</button>
      <div class="meal-info"><div class="meal-name">${slot.label}</div></div>
      <input type="time" class="meal-time-inp" value="${slot.time}" onchange="setMealTime(${idx},this.value)" title="Set time">
      <button class="meal-lock-btn ${locked?'locked':''}" onclick="toggleMealLock(${idx})" title="${locked?'Unlock time (applying to all future days)':'Lock time for all future days'}">🔒</button>
    </div>`;
  }).join('');
}
function togMeal(idx,targetEl=null){
  const k=mealKey(D.mealDate);getMealDay(D.mealDate);
  const was=!!D.meals[k][idx].eaten;
  D.meals[k][idx].eaten=!was;
  if(!was){
    const xp=maybeAwardMealXp(idx,k,{showToast:true});
    showXpFloat(targetEl,xp);
  } else {
    removeXpEventByRewardKey(mealRewardKey(idx,k),{save:false});
  }
  sv();renMeals();renMealsCal();
}
function setMealTime(idx,val){
  const k=mealKey(D.mealDate);getMealDay(D.mealDate);
  D.meals[k][idx].time=val;
  // If this slot is locked, update the locked time too
  if(!D.mealLockedTimes) D.mealLockedTimes=[null,null,null,null,null];
  if(D.mealLockedTimes[idx]!==null && D.mealLockedTimes[idx]!==undefined) {
    D.mealLockedTimes[idx]=val;
  }
  sv();
}
function toggleMealLock(idx){
  if(!D.mealLockedTimes) D.mealLockedTimes=[null,null,null,null,null];
  const k=mealKey(D.mealDate);
  const slots=getMealDay(D.mealDate);
  const currentTime=slots[idx]?.time||'';
  if(D.mealLockedTimes[idx]!==null && D.mealLockedTimes[idx]!==undefined){
    D.mealLockedTimes[idx]=null;
    toast(`🔓 ${MEAL_LABELS[idx]} time unlocked`);
  } else {
    D.mealLockedTimes[idx]=currentTime||null;
    if(currentTime) toast(`🔒 ${MEAL_LABELS[idx]} locked at ${currentTime} for all future days`);
    else toast(`Set a time first, then lock it`);
  }
  sv();renMeals();
}
function renMealsCal(){
  const n=D.mealDate,today=new Date();
  const y=n.getFullYear(),m=n.getMonth();
  document.getElementById('meals-cal-lbl').textContent=n.toLocaleDateString([],{month:'long',year:'numeric'});
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  const curY=today.getFullYear(),curM=today.getMonth(),curD=today.getDate();
  let html='';
  for(let i=0;i<first;i++) html+=`<div class="mcd mcd-emp"></div>`;
  for(let d=1;d<=days;d++){
    const k=`${y}-${m}-${d}`;
    const isTod=d===curD&&m===curM&&y===curY;
    const isFut=new Date(y,m,d)>today;
    const slots=D.meals[k]||null;
    let pips='';
    if(slots) pips=`<div class="mcd-pips">${slots.map(s=>`<div class="mpip" style="background:${s.eaten?'var(--grn)':'rgba(0,0,0,.1)'}"></div>`).join('')}</div>`;
    else if(!isFut) pips=`<div class="mcd-pips">${[0,1,2,3,4].map(()=>`<div class="mpip" style="background:rgba(0,0,0,.08)"></div>`).join('')}</div>`;
    html+=`<div class="mcd ${isTod?'mcd-tod':''} ${isFut?'mcd-fut':''}"><span class="mcd-num" style="color:${isTod?'var(--acc)':'var(--mut)'}">${d}</span>${pips}</div>`;
  }
  document.getElementById('meals-cal-grid').innerHTML=html;
}

// ══════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════
const TAG_COLORS=['#14CEFF','#2EED00','#F21B1B','#f5a000','#a855f7','#06b6d4','#f59e0b','#10b981','#e11d48'];
let chartCombo=null,chartDonut=null,chartYearly=null;
function navMonth(d){D.anMonth+=d;if(D.anMonth<0){D.anMonth=11;D.anYear--;}if(D.anMonth>11){D.anMonth=0;D.anYear++;}renAnalytics();}
function navYear(d){D.anYearView+=d;renAnalytics();}
function getMonthSessions(y,m){return D.sessions.filter(s=>{const dt=new Date(s.ts);return dt.getFullYear()===y&&dt.getMonth()===m;});}
function renAnalytics(){
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('an-month-lbl').textContent=months[D.anMonth]+' '+D.anYear;
  document.getElementById('an-year-lbl').textContent=D.anYearView;
  renComboChart();renDonutChart();renYearlyChart();
}
function chartDefaults(){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},animation:{duration:350}};}
function chartScaleMax(values,min=1){
  const max=Math.max(0,...values.map(v=>Number(v)||0));
  if(max<=0) return min;
  if(max<=2) return Math.ceil(max+.75);
  return Math.ceil(max*1.25);
}
function renComboChart(){
  const dim=new Date(D.anYear,D.anMonth+1,0).getDate();
  const now=new Date();
  const isCurrentMonth=D.anYear===now.getFullYear()&&D.anMonth===now.getMonth();
  const visibleDays=isCurrentMonth?now.getDate():dim;
  const sessions=getMonthSessions(D.anYear,D.anMonth);
  const hoursD=[],focusD=[],labels=[];
  for(let d=1;d<=visibleDays;d++){
    labels.push(d);
    const ds=sessions.filter(s=>new Date(s.ts).getDate()===d);
    hoursD.push(ds.reduce((a,s)=>a+(s.hours||1),0));
    const wf=ds.filter(s=>s.focus);
    focusD.push(wf.length?+(wf.reduce((a,s)=>a+s.focus,0)/wf.length).toFixed(1):null);
  }
  const nonNullFocus=focusD.filter(v=>v!==null).length;
  const shouldConnect=nonNullFocus>=2;
  const ctx=document.getElementById('chart-combo').getContext('2d');
  // Gradient fill for focus line
  const grad=ctx.createLinearGradient(0,0,0,200);
  grad.addColorStop(0,'rgba(242,27,27,.22)');
  grad.addColorStop(1,'rgba(242,27,27,.0)');
  if(chartCombo)chartCombo.destroy();
  const yMax=chartScaleMax(hoursD,1);
  chartCombo=new Chart(ctx,{type:'bar',data:{labels,datasets:[
    {type:'bar',label:'Hours',data:hoursD,backgroundColor:'rgba(20,206,255,0.62)',hoverBackgroundColor:'rgba(20,206,255,.82)',borderRadius:7,barPercentage:.72,categoryPercentage:.72,yAxisID:'y',borderSkipped:false},
    {type:'line',label:'Focus',data:focusD,borderColor:'#F21B1B',backgroundColor:grad,tension:.34,yAxisID:'y1',
     pointRadius:focusD.map(v=>v!==null?3.5:0),pointHoverRadius:6,
     pointBackgroundColor:'#F21B1B',pointBorderColor:'#fff',pointBorderWidth:2,
     borderWidth:2.5,spanGaps:shouldConnect,fill:true}
  ]},options:{...chartDefaults(),scales:{
    x:{grid:{display:false},ticks:{font:{size:9,weight:'600'},color:'#5a7080',maxTicksLimit:visibleDays>16?12:visibleDays}},
    y:{beginAtZero:true,max:yMax,grid:{color:'rgba(9,32,54,.055)'},ticks:{font:{size:9},color:'#14CEFF',precision:0},title:{display:true,text:'hrs',font:{size:9},color:'#14CEFF'}},
    y1:{min:0,max:6,position:'right',grid:{drawOnChartArea:false},ticks:{font:{size:9},color:'#F21B1B',stepSize:1,callback:v=>v>0&&v<=5?v:''},title:{display:true,text:'focus',font:{size:9},color:'#F21B1B'}}
  },plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'rgba(9,32,54,.92)',borderColor:'var(--cyn)',borderWidth:1,titleColor:'#e0f2fb',bodyColor:'#b0cfe0',padding:10,callbacks:{title:i=>`Day ${i[0].label}`,label:c=>c.datasetIndex===0?`Hours: ${c.raw}h`:`Focus: ${c.raw}/5`}}}}});
}
function renDonutChart(){
  const sessions=getMonthSessions(D.anYear,D.anMonth);
  const tagH={};sessions.forEach(s=>{tagH[s.tag]=(tagH[s.tag]||0)+(s.hours||1);});
  const tags=Object.keys(tagH),hours=Object.values(tagH),colors=tags.map((_,i)=>TAG_COLORS[i%TAG_COLORS.length]);
  const ctx=document.getElementById('chart-donut').getContext('2d');
  if(chartDonut)chartDonut.destroy();
  if(!tags.length){
    chartDonut=new Chart(ctx,{type:'doughnut',data:{labels:['No data'],datasets:[{data:[1],backgroundColor:['#e0e8f0'],borderWidth:0}]},options:{...chartDefaults(),cutout:'65%',plugins:{legend:{display:false},tooltip:{enabled:false}}}});
    document.getElementById('donut-legend').innerHTML=`<span style="font-size:.76rem;color:var(--mut);font-style:italic">No sessions this month</span>`;
    return;
  }
  chartDonut=new Chart(ctx,{type:'doughnut',data:{labels:tags,datasets:[{data:hours,backgroundColor:colors,borderWidth:2,borderColor:'#fff',hoverOffset:6}]},
    options:{...chartDefaults(),cutout:'62%',plugins:{legend:{display:false},tooltip:{backgroundColor:'#fff',borderColor:'#c5d5e5',borderWidth:1,titleColor:'#0c1a28',bodyColor:'#5a7080',callbacks:{label:c=>`${c.label}: ${c.raw}h`}}}}});
  const total=hours.reduce((a,b)=>a+b,0);
  document.getElementById('donut-legend').innerHTML=tags.map((t,i)=>`
    <div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div><span>${t}</span>
    <span style="color:var(--txt);font-weight:600;margin-left:4px">${hours[i]}h</span>
    <span style="color:var(--mut);margin-left:2px">(${Math.round(hours[i]/total*100)}%)</span></div>`).join('');
}
function renYearlyChart(){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data=months.map((_,m)=>getMonthSessions(D.anYearView,m).reduce((a,s)=>a+(s.hours||1),0));
  const curM=new Date().getMonth(),maxH=chartScaleMax(data,2);
  const ctx=document.getElementById('chart-yearly').getContext('2d');
  if(chartYearly)chartYearly.destroy();
  chartYearly=new Chart(ctx,{type:'bar',data:{labels:months,datasets:[{label:'Hours',data,
    backgroundColor:data.map((_,i)=>i===curM&&D.anYearView===new Date().getFullYear()?'rgba(20,206,255,.9)':'rgba(20,206,255,.38)'),borderRadius:5,borderSkipped:false}]},
    options:{...chartDefaults(),scales:{
      x:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{size:9},color:'#5a7080'}},
      y:{beginAtZero:true,max:maxH,grid:{color:'rgba(9,32,54,.055)'},ticks:{font:{size:9},color:'#5a7080',precision:0},title:{display:true,text:'hours',font:{size:9},color:'#5a7080'}}
    },plugins:{legend:{display:false},tooltip:{backgroundColor:'#fff',borderColor:'#c5d5e5',borderWidth:1,titleColor:'#0c1a28',bodyColor:'#5a7080',callbacks:{label:c=>`${c.raw}h studied`}}}}});
}
function loadDemo(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),tags=D.tags.length?D.tags:['Psychoanalysis','Philosophy','Paper Writing'],demo=[];
  for(let d=1;d<=now.getDate();d++){const n=Math.random()<.25?0:Math.floor(Math.random()*3)+1;for(let s=0;s<n;s++)demo.push({tag:tags[Math.floor(Math.random()*tags.length)],h20:'Demo',recall:'Demo',ts:new Date(y,m,d,8+s*2,0).getTime(),focus:Math.floor(Math.random()*3)+3,hours:1});}
  for(let pm=1;pm<=5;pm++){const pm2=(m-pm+12)%12,py2=m-pm<0?y-1:y,dim=new Date(py2,pm2+1,0).getDate();for(let d=1;d<=dim;d++){if(Math.random()<.35)continue;const n=Math.floor(Math.random()*3)+1;for(let s=0;s<n;s++)demo.push({tag:tags[Math.floor(Math.random()*tags.length)],h20:'Demo',recall:'Demo',ts:new Date(py2,pm2,d,8+s*2,0).getTime(),focus:Math.floor(Math.random()*3)+3,hours:1});}}
  D.sessions=[...demo,...D.sessions];sv();renAnalytics();toast('Demo data loaded ✓');
}
function clearDemo(){if(!confirm('Clear all sessions?'))return;D.sessions=[];sv();renAnalytics();toast('Cleared.');}

// ══════════════════════════════════════════
// GOALS
// ══════════════════════════════════════════
function getWeekBounds(){
  const now=new Date();
  const day=now.getDay();
  const mon=new Date(now);mon.setDate(now.getDate()-((day+6)%7));mon.setHours(0,0,0,0);
  const sun=new Date(mon);sun.setDate(mon.getDate()+6);sun.setHours(23,59,59,999);
  return{mon,sun};
}
function weekKey(){
  const {mon}=getWeekBounds();
  return`${mon.getFullYear()}-W${String(Math.ceil((mon.getDate())/7)).padStart(2,'0')}-${mon.getMonth()}`;
}
function monthKey(){const n=new Date();return`${n.getFullYear()}-${n.getMonth()}`;}

function ensureGoalsStructure(){
  if(!D.goals) D.goals={dailyByDate:{},weekly:[],monthly:[],totalDone:0};
  if(!D.goals.dailyByDate||typeof D.goals.dailyByDate!=='object'||Array.isArray(D.goals.dailyByDate)) D.goals.dailyByDate={};
  if(!D.goals.weekly) D.goals.weekly=[];
  if(!D.goals.monthly) D.goals.monthly=[];
  if(!D.goals.totalDone) D.goals.totalDone=0;
}

function todayGoalKey(){return dateStamp();}
function getGoalsForType(type){
  ensureGoalsStructure();
  if(type==='daily'){
    const key=todayGoalKey();
    if(!Array.isArray(D.goals.dailyByDate[key])) D.goals.dailyByDate[key]=[];
    D.goals.dailyByDate[key].forEach(g=>{if(!g.date) g.date=key;});
    return D.goals.dailyByDate[key];
  }
  return type==='weekly'?D.goals.weekly:D.goals.monthly;
}
function goalPrefix(type){return type==='daily'?'d':type==='weekly'?'w':'m';}

function carryOverGoals(){
  ensureGoalsStructure();
  const wk=weekKey(), mk=monthKey();
  let changed=false;
  // Weekly carryover
  if(D.goals.weeklyKey && D.goals.weeklyKey!==wk){
    const unfinished=D.goals.weekly.filter(g=>!g.done);
    if(unfinished.length){
      const fromLabel=D.goals.weeklyLabel||D.goals.weeklyKey;
      D.goals.weekly=D.goals.weekly.filter(g=>g.done); // keep done ones for history? No — clear done, carry undone
      D.goals.weekly=[...unfinished.map(g=>({...g,done:false,carriedFrom:fromLabel,added:Date.now()}))];
      changed=true;
    } else {
      D.goals.weekly=[];
    }
    D.goals.weeklyKey=wk;
    changed=true;
  }
  if(!D.goals.weeklyKey) D.goals.weeklyKey=wk;
  // Monthly carryover
  if(D.goals.monthlyKey && D.goals.monthlyKey!==mk){
    const unfinished=D.goals.monthly.filter(g=>!g.done);
    if(unfinished.length){
      const fromLabel=D.goals.monthlyLabel||D.goals.monthlyKey;
      D.goals.monthly=[...unfinished.map(g=>({...g,done:false,carriedFrom:fromLabel,added:Date.now()}))];
      changed=true;
    } else {
      D.goals.monthly=[];
    }
    D.goals.monthlyKey=mk;
    changed=true;
  }
  if(!D.goals.monthlyKey) D.goals.monthlyKey=mk;
  if(changed) sv();
}

function renGoals(){
  ensureGoalsStructure();
  carryOverGoals();
  const now=new Date();
  const {mon,sun}=getWeekBounds();
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const weekStr=`Week of ${mon.toLocaleDateString([],{month:'short',day:'numeric'})} – ${sun.toLocaleDateString([],{month:'short',day:'numeric',year:'numeric'})}`;
  const monthStr=`${months[now.getMonth()]} ${now.getFullYear()}`;
  const dayStr=now.toLocaleDateString([],{weekday:'long',month:'short',day:'numeric',year:'numeric'});
  // Save labels for carryover reference
  D.goals.weeklyLabel=weekStr; D.goals.monthlyLabel=monthStr;
  document.getElementById('day-label').textContent=dayStr;
  document.getElementById('week-label').textContent=weekStr;
  document.getElementById('month-label').textContent=monthStr;
  renGoalList('daily');
  renGoalList('weekly');
  renGoalList('monthly');
  // Total all-time done
  const tot=D.goals.totalDone||0;
  const el=document.getElementById('goals-total-badge');
  if(el) el.textContent=`${tot} goal${tot!==1?'s':''} completed`;
  renStats();
}

function renGoalList(type){
  const goals=getGoalsForType(type);
  const prefix=goalPrefix(type);
  const listEl=document.getElementById(`${prefix}goals-list`);
  if(!listEl) return;
  const done=goals.filter(g=>g.done).length;
  const total=goals.length;
  const pct=total?Math.round(done/total*100):0;
  document.getElementById(`${prefix}goal-pct`).textContent=`${pct}%`;
  document.getElementById(`${prefix}goal-fill`).style.width=`${pct}%`;
  document.getElementById(`${prefix}goal-done-lbl`).textContent=`${done} done`;
  document.getElementById(`${prefix}goal-total-lbl`).textContent=`${total} total`;
  if(!goals.length){listEl.innerHTML=`<p style="font-size:.8rem;color:var(--mut);padding:8px 0">No goals yet. Add one below.</p>`;return;}
  listEl.innerHTML=goals.map((g,i)=>`
    <div class="goal-item ${g.carriedFrom?'carried-item':''}">
      <button class="goal-checkbox ${g.done?'done':''}" onclick="togGoal('${type}',${i},event.currentTarget)">${g.done?'✓':''}</button>
      <span class="goal-text ${g.done?'done':''}">${g.text}${g.carriedFrom?`<span class="goal-carried">↩ from ${g.carriedFrom}</span>`:''}</span>
      <button class="goal-del" onclick="delGoal('${type}',${i})">×</button>
    </div>`).join('');
}

function addGoal(type){
  const inp=document.getElementById(`${goalPrefix(type)}goal-inp`);
  const text=inp.value.trim();
  if(!text){inp.focus();return;}
  ensureGoalsStructure();
  const goals=getGoalsForType(type);
  const added=Date.now();
  goals.push({id:`g${added}_${goals.length}`,text,done:false,added,date:type==='daily'?todayGoalKey():undefined});
  inp.value='';sv();renGoalList(type);
  const tot=document.getElementById('goals-total-badge');
  if(tot) tot.textContent=`${D.goals.totalDone||0} goal${(D.goals.totalDone||0)!==1?'s':''} completed`;
}

function togGoal(type,i,targetEl=null){
  ensureGoalsStructure();
  const goals=getGoalsForType(type);
  const wasDone=goals[i].done;
  goals[i].done=!goals[i].done;
  if(!wasDone){
    goals[i].doneAt=Date.now();
    D.goals.totalDone=(D.goals.totalDone||0)+1;
    const xp=maybeAwardGoalXp(type,goals[i],{showToast:true});
    showXpFloat(targetEl,xp);
  } else {
    removeXpEventByRewardKey(goalRewardKey(type,goals[i]),{save:false});
    delete goals[i].doneAt;
    D.goals.totalDone=Math.max(0,(D.goals.totalDone||1)-1);
  }
  sv();renGoalList(type);
  const tot=document.getElementById('goals-total-badge');
  if(tot) tot.textContent=`${D.goals.totalDone} goal${D.goals.totalDone!==1?'s':''} completed`;
}

function delGoal(type,i){
  ensureGoalsStructure();
  const goals=getGoalsForType(type);
  if(goals[i].done){
    D.goals.totalDone=Math.max(0,(D.goals.totalDone||1)-1);
    removeXpEventByRewardKey(goalRewardKey(type,goals[i]),{save:false});
  }
  goals.splice(i,1);sv();renGoalList(type);
}
function renStats(){
  const wa=Date.now()-7*864e5,ss=D.sessions.filter(s=>s.ts>wa);
  const bt={};ss.forEach(s=>bt[s.tag]=(bt[s.tag]||0)+(s.hours||1));
  const ts=Object.entries(bt).map(([k,v])=>`${k}: ${v}h`).join(' · ')||'None';
  const hs=D.habits.map(h=>{let d=0;for(let i=0;i<7;i++){const dt=new Date(Date.now()-i*864e5);if(h.log[dkey(dt)])d++;}return`<div>${h.id2.replace(/^I am (someone who )?/i,'')}: <strong style="color:var(--acc)">${d}/7</strong></div>`;}).join('');
  document.getElementById('wstats').innerHTML=`<div>Deep Work: <strong style="color:var(--acc)">${ss.length} sessions · ${ss.reduce((a,s)=>a+(s.hours||1),0)}h</strong></div><div>By subject: ${ts}</div><hr style="border:none;border-top:1px solid var(--bdr);margin:7px 0"><div>Habit completion (7 days):</div>${hs}`;
}

// ══════════════════════════════════════════
// BODY — WEIGHT & CARDIO
// ══════════════════════════════════════════
let chartWeight = null;
let _cardioDiff = 3;

function ensureBody(){
  if(!D.body) D.body={weightLog:[],cardioLog:[]};
  if(!D.body.weightLog) D.body.weightLog=[];
  if(!D.body.cardioLog) D.body.cardioLog=[];
  D.body.cardioLog.forEach(e=>{if(e.distance===undefined||e.distance===null||Number.isNaN(Number(e.distance))) e.distance=null;});
}

function renBody(){
  ensureBody();
  // Set default date inputs to today
  const today=new Date().toISOString().split('T')[0];
  const wdate=document.getElementById('wlog-date');
  const cdate=document.getElementById('cardio-date');
  if(wdate&&!wdate.value) wdate.value=today;
  if(cdate&&!cdate.value) cdate.value=today;
  renWeightLog();
  renWeightChart();
  renCardioTable();
}

function addWeightLog(){
  ensureBody();
  const dateVal=document.getElementById('wlog-date').value;
  const wVal=parseFloat(document.getElementById('wlog-val').value);
  if(!dateVal||isNaN(wVal)||wVal<=0){toast('Enter a valid date and weight.');return;}
  // Remove existing entry for same date
  D.body.weightLog=D.body.weightLog.filter(e=>e.date!==dateVal);
  const entry={date:dateVal,weight:wVal};
  D.body.weightLog.push(entry);
  D.body.weightLog.sort((a,b)=>a.date.localeCompare(b.date));
  document.getElementById('wlog-val').value='';
  const xp=maybeAwardWeightXp(entry,{showToast:true});
  showXpFloat(document.getElementById('wlog-val')||document.getElementById('wlog-date'),xp);
  sv();renWeightLog();renWeightChart();toast('Weight logged ✓');
}

function renWeightLog(){
  ensureBody();
  const el=document.getElementById('wlog-list');if(!el)return;
  const sorted=[...D.body.weightLog].reverse().slice(0,14);
  if(!sorted.length){el.innerHTML='<p style="font-size:.78rem;color:var(--mut);font-style:italic">No weight entries yet.</p>';return;}
  el.innerHTML=sorted.map((e,i)=>`
    <div class="body-wlog-row">
      <span style="color:var(--mut)">${new Date(e.date+'T12:00:00').toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})}</span>
      <span style="font-weight:700;color:var(--navy);font-size:.9rem">${e.weight} kg</span>
      <button onclick="delWeightEntry('${e.date}')" style="background:none;border:none;cursor:pointer;color:var(--mut);font-size:.8rem;padding:0 4px" title="Delete">×</button>
    </div>`).join('');
}

function delWeightEntry(date){
  ensureBody();
  removeXpEventByRewardKey(weightRewardKey(date),{save:false});
  D.body.weightLog=D.body.weightLog.filter(e=>e.date!==date);
  sv();renWeightLog();renWeightChart();
}

function renWeightChart(){
  ensureBody();
  const ctx=document.getElementById('chart-weight');if(!ctx)return;
  const logs=D.body.weightLog;
  if(!logs.length){
    if(chartWeight){chartWeight.destroy();chartWeight=null;}
    ctx.getContext('2d').clearRect(0,0,ctx.width,ctx.height);return;
  }
  // Build weekly averages
  const weekMap={};
  logs.forEach(e=>{
    const d=new Date(e.date+'T12:00:00');
    const day=d.getDay();
    const mon=new Date(d);mon.setDate(d.getDate()-((day+6)%7));
    const wk=mon.toISOString().split('T')[0];
    if(!weekMap[wk]) weekMap[wk]=[];
    weekMap[wk].push(e.weight);
  });
  const weeks=Object.keys(weekMap).sort();
  const labels=weeks.map(w=>{const d=new Date(w+'T12:00:00');return d.toLocaleDateString([],{month:'short',day:'numeric'});});
  const data=weeks.map(w=>{const arr=weekMap[w];return+(arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1);});
  const minW=Math.min(...data)-2,maxW=Math.max(...data)+2;
  if(chartWeight) chartWeight.destroy();
  const cctx=ctx.getContext('2d');
  const grad=cctx.createLinearGradient(0,0,0,190);
  grad.addColorStop(0,'rgba(14,139,186,.25)');
  grad.addColorStop(1,'rgba(14,139,186,0)');
  chartWeight=new Chart(cctx,{type:'line',data:{labels,datasets:[{
    label:'Avg kg',data,borderColor:'var(--acc)',backgroundColor:grad,
    tension:.4,pointRadius:5,pointHoverRadius:7,fill:true,
    pointBackgroundColor:'var(--acc)',pointBorderColor:'#fff',pointBorderWidth:2,borderWidth:2.5
  }]},options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(9,32,54,.92)',borderColor:'var(--cyn)',borderWidth:1,
      titleColor:'#e0f2fb',bodyColor:'#b0cfe0',padding:10,
      callbacks:{label:c=>`${c.raw} kg (weekly avg)`}}},
    scales:{
      x:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{size:9},color:'#5a7080'}},
      y:{min:minW,max:maxW,grid:{color:'rgba(0,0,0,.05)'},ticks:{font:{size:9},color:'var(--acc)'},
        title:{display:true,text:'kg',font:{size:9},color:'var(--acc)'}}
    }
  }});
}

function selCardioDiff(v){
  _cardioDiff=v;
  document.querySelectorAll('#cardio-diff-row button').forEach(b=>{
    const dv=parseInt(b.dataset.dv);
    b.classList.toggle('on',dv===v);
    b.style.background=dv===v?diffColor(v):'';
    b.style.color=dv===v?'#fff':'';
    b.style.borderColor=dv===v?diffColor(v):'';
  });
}
function diffColor(v){
  if(v<=2) return '#2EED00';
  if(v<=4) return '#f5a000';
  return '#F21B1B';
}
function diffLabel(v){return['','Easy','Light','Moderate','Hard','Very Hard','Intense','Max'][v]||v;}
function cardioAvgSpeed(entry){
  const distance=Number(entry?.distance)||0;
  const duration=Number(entry?.duration)||0;
  if(distance<=0||duration<=0) return null;
  return distance/(duration/60);
}

function addCardioLog(){
  ensureBody();
  const date=document.getElementById('cardio-date').value;
  const dur=parseInt(document.getElementById('cardio-dur').value);
  const distance=parseFloat(document.getElementById('cardio-distance')?.value);
  const avghr=parseInt(document.getElementById('cardio-avghr').value);
  const resthr=parseInt(document.getElementById('cardio-resthr').value);
  const diff=_cardioDiff;
  if(!date||isNaN(dur)||dur<=0){toast('Enter at least date and duration.');return;}
  const entry={date,duration:dur,distance:(!isNaN(distance)&&distance>0)?distance:null,avgHR:avghr||null,restingHR:resthr||null,difficulty:diff,ts:Date.now()};
  D.body.cardioLog.push(entry);
  D.body.cardioLog.sort((a,b)=>b.date.localeCompare(a.date));
  // Clear inputs
  document.getElementById('cardio-dur').value='';
  const distEl=document.getElementById('cardio-distance');if(distEl) distEl.value='';
  document.getElementById('cardio-avghr').value='';
  document.getElementById('cardio-resthr').value='';
  const xp=maybeAwardCardioXp(entry,{showToast:true});
  showXpFloat(document.getElementById('cardio-dur')||document.getElementById('cardio-date'),xp);
  sv();renCardioTable();toast('Cardio session logged ✓');
}

function delCardioEntry(ts){
  ensureBody();
  const entry=D.body.cardioLog.find(e=>e.ts===ts);
  removeXpEventByRewardKey(cardioRewardKey(entry),{save:false});
  D.body.cardioLog=D.body.cardioLog.filter(e=>e.ts!==ts);
  sv();renCardioTable();
}

function renCardioTable(){
  ensureBody();
  const tbody=document.getElementById('cardio-tbody');if(!tbody)return;
  if(!D.body.cardioLog.length){
    tbody.innerHTML=`<tr><td colspan="8" style="padding:14px 8px;color:var(--mut);font-style:italic;font-size:.8rem">No cardio sessions logged yet.</td></tr>`;
    return;
  }
  tbody.innerHTML=D.body.cardioLog.slice(0,30).map(e=>{
    const dColor=diffColor(e.difficulty);
    const speed=cardioAvgSpeed(e);
    const dist=e.distance?Number(e.distance).toFixed(2).replace(/\.00$/,'')+' km':'—';
    const speedText=speed?speed.toFixed(1)+' km/h':'—';
    return`<tr style="border-bottom:1px solid var(--bdr)">
      <td style="padding:8px 8px;color:var(--txt);white-space:nowrap">${new Date(e.date+'T12:00:00').toLocaleDateString([],{month:'short',day:'numeric',year:'2-digit'})}</td>
      <td style="padding:8px 8px;font-weight:600;color:var(--acc)">${e.duration} min</td>
      <td style="padding:8px 8px;color:var(--txt)">${dist}</td>
      <td style="padding:8px 8px;color:var(--acc)">${speedText}</td>
      <td style="padding:8px 8px;color:var(--red)">${e.avgHR?e.avgHR+' bpm':'—'}</td>
      <td style="padding:8px 8px;color:var(--mut)">${e.restingHR?e.restingHR+' bpm':'—'}</td>
      <td style="padding:8px 8px"><span style="display:inline-block;padding:2px 8px;border-radius:20px;background:${dColor}22;color:${dColor};border:1px solid ${dColor}55;font-size:.7rem;font-weight:700">${e.difficulty} – ${diffLabel(e.difficulty)}</span></td>
      <td style="padding:8px 4px;text-align:right"><button onclick="delCardioEntry(${e.ts})" style="background:none;border:none;cursor:pointer;color:var(--mut);font-size:.82rem;padding:2px 5px;border-radius:4px" title="Delete">×</button></td>
    </tr>`;
  }).join('');
}

// ══════════════════════════════════════════
// TOAST
// ══════════════════════════════════════════
let tTO;
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.remove('hid');clearTimeout(tTO);tTO=setTimeout(()=>el.classList.add('hid'),3200);}

// ══════════════════════════════════════════
// DIAGNOSTICS
// ══════════════════════════════════════════
let lastSnapshotTime = null;
let snapshotCount = 0;

// Patch onSnapshot to track when it fires
const _origStartSync = startFirestoreSync;

function showDiagnostics() {
  const panel = document.getElementById('diag-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  if (panel.style.display === 'block') runDiagnostics();
}

async function runDiagnostics() {
  const el = document.getElementById('diag-content');
  const rows = [];

  const ok  = s => `<span style="color:#2EED00">✓ ${s}</span>`;
  const err = s => `<span style="color:#F21B1B">✗ ${s}</span>`;
  const warn= s => `<span style="color:#f5a000">⚠ ${s}</span>`;
  const inf = s => `<span style="color:#14CEFF">${s}</span>`;

  // 1. Firebase SDK loaded?
  rows.push('── Firebase SDK ──');
  try {
    rows.push(typeof firebase !== 'undefined' ? ok('Firebase SDK loaded') : err('Firebase SDK NOT loaded — check internet connection'));
  } catch(e) { rows.push(err('Firebase SDK check failed: ' + e.message)); }

  // 2. Firebase initialized?
  rows.push(firebaseReady ? ok('Firebase app initialized') : err('Firebase NOT initialized — check your FIREBASE_CONFIG values in the HTML'));

  // 3. Auth state
  rows.push('── Authentication ──');
  if (!auth) {
    rows.push(err('Firebase Auth not available'));
  } else if (currentUser) {
    rows.push(ok('Logged in as: ' + currentUser.email));
    rows.push(inf('User ID: ' + currentUser.uid));
    rows.push(inf('(Both devices must use the same account to sync)'));
  } else {
    rows.push(err('Not logged in — sync is impossible. Sign out and sign back in.'));
  }

  // 4. Firestore listener
  rows.push('── Firestore Listener ──');
  rows.push(unsubscribeSync ? ok('Listener is active') : err('Listener is NOT running — try signing out and back in'));
  rows.push(lastSnapshotTime
    ? ok('Last snapshot received: ' + lastSnapshotTime)
    : warn('No snapshot received yet since page load'));
  rows.push(inf('Total snapshots received this session: ' + snapshotCount));

  // 5. Try a live Firestore read
  rows.push('── Live Firestore Read Test ──');
  if (db && currentUser) {
    try {
      const doc = await db.collection('users').doc(currentUser.uid).get({ source: 'server' });
      if (doc.exists) {
        const data = doc.data();
        rows.push(ok('Firestore read successful'));
        rows.push(inf('Sessions in cloud: ' + (data.sessions ? data.sessions.length : 0)));
        rows.push(inf('Sessions in memory: ' + D.sessions.length));
        rows.push(inf('Last updated: ' + (data.updatedAt ? data.updatedAt.toDate().toLocaleString() : 'never')));
        if (data.sessions && data.sessions.length !== D.sessions.length) {
          rows.push(warn('⚠ Cloud and local session counts differ — press "Force read" below'));
        }
      } else {
        rows.push(warn('No data in Firestore yet for this account'));
      }
    } catch(e) {
      rows.push(err('Firestore read FAILED: ' + e.message));
      if (e.message.includes('permission')) {
        rows.push(err('→ SECURITY RULES are blocking reads. Go to Firebase Console → Firestore → Rules and set:'));
        rows.push(inf('&nbsp;&nbsp;allow read, write: if request.auth != null;'));
      }
    }
  } else {
    rows.push(warn('Cannot test — not logged in or Firestore unavailable'));
  }

  // 6. Local storage
  rows.push('── Local Storage ──');
  const local = localStorage.getItem('sce3');
  if (local) {
    try {
      const p = JSON.parse(local);
      rows.push(ok('Local data found — ' + (p.sessions||[]).length + ' sessions cached offline'));
    } catch(e) { rows.push(err('Local data is corrupted')); }
  } else {
    rows.push(warn('No local data cached'));
  }

  el.innerHTML = rows.join('<br>');
}

async function diagForceRead() {
  if (!db || !currentUser) { toast('Not logged in.'); return; }
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get({ source: 'server' });
    if (doc.exists) {
      const data = doc.data();
      applyCoreData(data);
      renSCnt(); renSlog(); refreshCurrentTab();
      toast('Force read done — ' + D.sessions.length + ' sessions loaded');
      runDiagnostics();
    } else {
      toast('No data found in Firestore for this account.');
    }
  } catch(e) {
    toast('Read failed: ' + e.message);
  }
}

async function diagTestWrite() {
  if (!db || !currentUser) { toast('Not logged in.'); return; }
  try {
    await db.collection('users').doc(currentUser.uid).update({
      diagTest: new Date().toISOString()
    });
    toast('✓ Test write succeeded — Firestore is writable');
    runDiagnostics();
  } catch(e) {
    toast('Write failed: ' + e.message);
  }
}
