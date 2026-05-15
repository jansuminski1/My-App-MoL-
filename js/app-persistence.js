// js/app-persistence.js
// Schema versioning, default shapes, ensure-helpers, migration, save/apply, and local load.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   D                                      — js/app.js
//   XP_CURVE_CONFIG                        — js/app-xp.js
//   CHARACTER_STAT_KEYS, FINANCE_CATEGORIES — js/app.js
//   dateStamp, selectedFocusMinutes         — js/app.js
//   recalculateCharacterFromEvents          — js/app-xp.js
//   currentUser                             — js/app.js
// Load order: app-persistence.js → app-today-flow-data.js → app-today-flow-render.js
//             → app-current-focus.js → app-xp.js → app-today-actions.js
//             → app-habit-render.js → app-habit-actions.js → app.js

// ==================================================
// Schema Version
// ==================================================
const APP_SCHEMA_VERSION = 1;

// ==================================================
// Default Shapes
// ==================================================
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

// ==================================================
// Ensure Helpers — normalize D fields after load
// ==================================================
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

function ensureGoalsStructure(){
  if(!D.goals) D.goals={dailyByDate:{},weekly:[],monthly:[],totalDone:0};
  if(!D.goals.dailyByDate||typeof D.goals.dailyByDate!=='object'||Array.isArray(D.goals.dailyByDate)) D.goals.dailyByDate={};
  if(!D.goals.weekly) D.goals.weekly=[];
  if(!D.goals.monthly) D.goals.monthly=[];
  if(!D.goals.totalDone) D.goals.totalDone=0;
}

function ensureBody(){
  if(!D.body) D.body={weightLog:[],cardioLog:[]};
  if(!D.body.weightLog) D.body.weightLog=[];
  if(!D.body.cardioLog) D.body.cardioLog=[];
  D.body.cardioLog.forEach(e=>{if(e.distance===undefined||e.distance===null||Number.isNaN(Number(e.distance))) e.distance=null;});
}

// ==================================================
// Migration
// ==================================================
function migrateData(raw){
  const data=(raw&&typeof raw==='object'&&!Array.isArray(raw))?{...raw}:{};
  data.schemaVersion=Number(data.schemaVersion)||APP_SCHEMA_VERSION;
  if(!data.todayFlowOrder||typeof data.todayFlowOrder!=='object'||Array.isArray(data.todayFlowOrder)) data.todayFlowOrder={};

  // Future migrations should be additive and guarded by schemaVersion checks.
  // Example:
  // if(data.schemaVersion < 2) { ...non-destructive normalization... }

  return data;
}

// ==================================================
// Core Save / Apply
// ==================================================
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

// ==================================================
// Local Persistence
// ==================================================
function ldLocal(){
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
