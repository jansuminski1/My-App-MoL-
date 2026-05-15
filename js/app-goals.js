// js/app-goals.js
// Goals rendering, creation, completion, deletion, carry-over, and weekly stats.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   D, dateStamp, dkey, escapeHtml, sv, toast, showXpFloat — js/app.js
//   ensureGoalsStructure                                    — js/app-persistence.js
//   maybeAwardGoalXp, removeXpEventByRewardKey, goalRewardKey — js/app-xp.js
// Load order: app-persistence.js → ... → app-xp.js → app-today-actions.js
//             → app-habit-render.js → app-habit-actions.js → app-goals.js → app.js

// ==================================================
// Week / Month Key Helpers
// ==================================================
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

// ==================================================
// Goal Data Helpers
// ==================================================
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

// ==================================================
// Carry-Over Logic
// ==================================================
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

// ==================================================
// Goal Rendering
// ==================================================
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

// ==================================================
// Goal Actions
// ==================================================
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

// ==================================================
// Weekly Stats (Goals tab — reads sessions + habits)
// ==================================================
function renStats(){
  const wa=Date.now()-7*864e5,ss=D.sessions.filter(s=>s.ts>wa);
  const bt={};ss.forEach(s=>bt[s.tag]=(bt[s.tag]||0)+(s.hours||1));
  const ts=Object.entries(bt).map(([k,v])=>`${k}: ${v}h`).join(' · ')||'None';
  const hs=D.habits.map(h=>{let d=0;for(let i=0;i<7;i++){const dt=new Date(Date.now()-i*864e5);if(h.log[dkey(dt)])d++;}return`<div>${h.id2.replace(/^I am (someone who )?/i,'')}: <strong style="color:var(--acc)">${d}/7</strong></div>`;}).join('');
  document.getElementById('wstats').innerHTML=`<div>Deep Work: <strong style="color:var(--acc)">${ss.length} sessions · ${ss.reduce((a,s)=>a+(s.hours||1),0)}h</strong></div><div>By subject: ${ts}</div><hr style="border:none;border-top:1px solid var(--bdr);margin:7px 0"><div>Habit completion (7 days):</div>${hs}`;
}
