// js/app-xp.js
// XP curve, reward keys, XP event lifecycle, reward-award helpers, and character stat calculation.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   D, ensureCharacter, defaultCharacter           — js/app.js
//   CHARACTER_STAT_KEYS, MAIN_STAT_KEYS, MEAL_LABELS — js/app.js
//   dateStamp, todayDateKey                         — js/app.js
//   toast, sv, renderCharacter                      — js/app.js
//   ensureBody, ensureGoalsStructure               — js/app.js
// Load order: app-today-flow-data.js → app-today-flow-render.js → app-current-focus.js
//             → app-xp.js → app-today-actions.js → app-habit-render.js → app-habit-actions.js → app.js

// ==================================================
// XP Curve Config & Ranks
// ==================================================
const XP_CURVE_CONFIG = { xpBase: 25, xpExponent: 1.35, maxLevel: 250, maxRanks: 50, rankSize: 5 };
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

// ==================================================
// XP Level Calculation
// ==================================================
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

// ==================================================
// XP Quality / Difficulty / Calculation
// ==================================================
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
function normalizeDifficulty(value){
  const n=Number(value);
  if(n>=6) return 'veryHard';
  if(n>=5) return 'hard';
  if(n>=4) return 'some';
  return 'easy';
}

// ==================================================
// Reward Registry
// ==================================================
function hasRewardBeenGranted(key){ensureCharacter();return !!D.character.rewarded[key];}
function markRewardGranted(key){ensureCharacter();D.character.rewarded[key]=true;}
function clearRewardGranted(key){ensureCharacter();delete D.character.rewarded[key];}

// ==================================================
// Reward Keys
// ==================================================
function stableTextKey(str){
  return String(str||'item').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'item';
}
function habitRewardKey(h,dateKey){return `habit:${h?.id||stableTextKey(h?.id2||h?.name)}:${dateKey}`;}
function habitRewardPrefix(h){return `habit:${h?.id||stableTextKey(h?.id2||h?.name)}:`;}
function mealRewardKey(idx,dateKey){return `meal:${dateKey}:${idx}`;}
function goalRewardKey(type,goal){
  if(type==='daily') return `goal:daily:${goal?.date||dateStamp()}:${goal?.id||goal?.added||stableTextKey(goal?.text)}`;
  return `goal:${type}:${goal?.id||goal?.added||stableTextKey(goal?.text)}`;
}
function weightRewardKey(entryOrDate){const date=typeof entryOrDate==='string'?entryOrDate:entryOrDate?.date;return date?`weight:${date}`:'';}
function cardioRewardKey(entry){return entry?`cardio:${entry.ts||`${entry.date}:${Number(entry.duration)||0}`}`:'';}
function studyRewardKey(s){
  return `study_session:${s.id||[s.ts||'',stableTextKey(s.tag),stableTextKey(s.h20)].join(':')}`;
}
function financeIncomeRewardKey(item){return item?.id?`finance_income:${item.id}`:'';}
function financeExpenseRewardKey(item){return item?.id?`finance_expense:${item.id}`:'';}
function todayTaskRewardKey(task,dateKey=task?.date||todayDateKey()){return task?.id?`today_task:${dateKey}:${task.id}`:'';}
function focusBlockRewardKey(block,dateKey=block?.date||todayDateKey()){return block?.id?`focus_block:${dateKey}:${block.id}`:'';}
function timestampFromLooseDateKey(key){
  const p=String(key||'').split('-').map(Number);
  if(p.length===3&&p.every(n=>Number.isFinite(n))) return new Date(p[0],p[1],p[2],12).getTime();
  return Date.now();
}
function timestampFromIsoDate(date){
  const ts=Date.parse(String(date||'')+'T12:00:00');
  return Number.isFinite(ts)?ts:Date.now();
}

// ==================================================
// XP Event Lifecycle
// ==================================================
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

// ==================================================
// Character Stat Calculation
// ==================================================
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

// ==================================================
// XP Float UI
// ==================================================
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

// ==================================================
// Award Helpers
// ==================================================
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

// ==================================================
// Today XP Queries
// ==================================================
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
