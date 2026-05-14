// js/app-habit-actions.js
// Habit action functions: add, edit, delete, complete, reorder, freq picker.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   D, ensureHabitData, buildHabitChains, buildHabitGroupsAll,
//   habitIsDoneToday, habitDisplayName, escapeHtml, toast, closeMod,
//   createId, tdk, sv, saveAndRender, renHabits, renCal,
//   maybeAwardHabitXp, showXpFloat,
//   habitRewardKey, habitRewardPrefix,
//   removeXpEventByRewardKey, removeXpEventsByRewardPrefix,
//   editingFlowId, todayDesignMode               — js/app.js
//   removeFromTodayFlowOrder                     — js/app-today-flow-data.js
// Load order: app-today-flow-data.js → app-today-flow-render.js → app-current-focus.js
//             → app-today-actions.js → app-habit-render.js → app-habit-actions.js → app.js

// ==================================================
// Frequency Picker
// Used by showAddHabit and showEditHabit modals.
// ==================================================
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

// ==================================================
// Habit Group / Chain Management
// ==================================================
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

// ==================================================
// Actions: Habits — Complete / Uncomplete
// ==================================================
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

// ==================================================
// Actions: Habits — Stack / Move
// ==================================================
function toggleStack(i){D.habits[i].stackedToNext=!D.habits[i].stackedToNext;sv();renHabits();}
function moveHabit(i,dir){moveHabitWithinGroup(i,dir);}

// ==================================================
// Actions: Habits — Edit Flow Mode
// ==================================================
function editHabitFlow(chainId){
  editingFlowId=editingFlowId===chainId?null:chainId;
  todayDesignMode=!!editingFlowId;
  renHabits();
}

// ==================================================
// Actions: Habits — Add / Edit / Delete
// ==================================================
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
