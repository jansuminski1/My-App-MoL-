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
// APP_SCHEMA_VERSION → js/app-persistence.js
const FINANCE_CATEGORIES = ['Groceries','Recurring Bills','Rent','Transport','Health','Learning','Entertainment','Other'];
const LIFE_STAT_LABELS = ['Intelligence','Health','Strength','Wealth','Connection','Purpose'];
const META_STAT_LABELS = ['Consistency','Resolve'];
const CHARACTER_STAT_KEYS = ['intelligence','health','strength','wealth','connection','purpose','consistency','resolve'];
const MAIN_STAT_KEYS = ['intelligence','health','strength','wealth','connection','purpose'];
// XP_CURVE_CONFIG / RANKS → js/app-xp.js
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

// defaultCharacter / ensure* / migrateData / coreSaveData / applyCoreData / ldLocal → js/app-persistence.js

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

// ldLocal → js/app-persistence.js

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
// XP curve / level / reward keys / award helpers / character stat calculation → js/app-xp.js

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
// showXpFloat / stableTextKey / reward keys / award helpers / importXpFromHistory → js/app-xp.js

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

// Focus timer / study session logic → js/app-focus-timer.js

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

// FREQ_DAY_NAMES / freqLabel / renderFreqPicker / setFreqType / toggleFreqDay → js/app-habit-actions.js

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
// getTodayXpEvents / todayXpGained → js/app-xp.js
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
// rebuildHabitsFromGroups / moveHabitToGroup / moveHabitOutOfChain / moveHabitWithinGroup → js/app-habit-actions.js
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
// todayTasks / todayFocusBlocks / todayEntries → js/app-today-flow-data.js
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
// Current Focus logic and rendering → js/app-current-focus.js
// todayPlacementLabel / entriesForPlacement / buildTodayFlow /
// applyTodayFlowCustomOrder / saveTodayFlowOrder → js/app-today-flow-data.js
// renderTodayFlowDropZone / renderTodayFlow / renderTodayFlowItem → js/app-today-flow-render.js
function toggleTodayDesignMode(){
  todayDesignMode=!todayDesignMode;
  renHabits();
}
// habitDetailBlock / renderNodeProgress / renderFlowSegments → js/app-habit-render.js
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
// renderHabitDropZone → js/app-habit-render.js
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
// toggleTodayFlowReorderMode / moveTodayFlowItem → js/app-today-actions.js
// uncompleteHabitInFlow → js/app-habit-actions.js
// renderChainMoveOptions → js/app-habit-render.js
// renderAddHabitChainOptions / addHabitToSelectedFlow / habitActionIdentity
// cleanHabitConfirmationPhrase / showHabitCreatedConfirmation / editHabitFlow → js/app-habit-actions.js
// renderCurrentStepSubCard / renderFlowNodeRow / renderFlowEditPanel → js/app-habit-render.js
// Habit rendering lives in js/app-habit-render.js.
// renderHabitRow / renderHabitChain → js/app-habit-render.js
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
// Habit actions → js/app-habit-actions.js
// Today task / focus block / reorder actions → js/app-today-actions.js
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

// Analytics → js/app-analytics.js

// Goals → js/app-goals.js

// ══════════════════════════════════════════
// BODY — WEIGHT & CARDIO
// ══════════════════════════════════════════
let chartWeight = null;
let _cardioDiff = 3;

// ensureBody → js/app-persistence.js

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
