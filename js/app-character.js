// js/app-character.js
// Character tab rendering, role/suggestion generation, stat grid, recent XP display.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   D, ensureCharacter, sv                      — js/app.js
//   CHARACTER_STAT_KEYS, MAIN_STAT_KEYS         — js/app.js
//   escapeHtml, dateStamp                       — js/app.js
//   getLevelProgress, getRankInfo, XP_CURVE_CONFIG — js/app-xp.js
// Load order: app-xp.js → ... → app-focus-timer.js → app-character.js → app.js

// ==================================================
// Character-Only Constants
// ==================================================
const LIFE_STAT_LABELS = ['Intelligence','Health','Strength','Wealth','Connection','Purpose'];
const META_STAT_LABELS = ['Consistency','Resolve'];
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

// ==================================================
// Stat Utilities
// ==================================================
function statKey(label){return label.toLowerCase();}
function capStat(k){return STAT_UI[k]?.label||k.charAt(0).toUpperCase()+k.slice(1);}

// ==================================================
// Character Helpers
// ==================================================
function getCharacter(){ensureCharacter();return D.character;}
function saveCharacterIfNeeded(){ensureCharacter();sv();renderCharacter();}

// ==================================================
// Stat Analysis
// ==================================================
function getTopStats(stats,keys=MAIN_STAT_KEYS){
  return keys.map(k=>({key:k,value:Number(stats[k])||0})).sort((a,b)=>b.value-a.value||a.key.localeCompare(b.key));
}
function getStrongestWeakestStats(stats){
  const all=CHARACTER_STAT_KEYS.map(k=>({key:k,value:Number(stats[k])||0}));
  return{strongest:[...all].sort((a,b)=>b.value-a.value)[0]||{key:'intelligence',value:0},weakest:[...all].sort((a,b)=>a.value-b.value)[0]||{key:'intelligence',value:0}};
}

// ==================================================
// Role & Suggestion Generation
// ==================================================
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

// ==================================================
// Rendering
// ==================================================
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
