// js/app-today-actions.js
// Today task / focus block / Today Flow reorder actions.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   D, ensureTodayFlow, todayDateKey, createId, toast, closeMod,
//   saveAndRender, escapeHtml, selectedFocusMinutes, navigateToTab,
//   startFocusPhase, renHabits,
//   maybeAwardTodayTaskXp, maybeAwardFocusBlockXp,
//   showXpFloat, removeXpEventByRewardKey,
//   todayTaskRewardKey, focusBlockRewardKey,
//   _profileSteps, _profileIdx, todayFlowReorderMode — js/app.js
//   todayEntries, buildHabitChains, buildTodayFlow,
//   saveTodayFlowOrder, removeFromTodayFlowOrder   — js/app-today-flow-data.js
// Load order: app-today-flow-data.js → app-today-flow-render.js → app-current-focus.js → app-today-actions.js → app.js

// ==================================================
// Today Placement Helpers
// ==================================================
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
function nextTodayOrder(){
  const entries=todayEntries();
  return entries.length?Math.max(...entries.map(e=>Number(e.item.order)||0))+1:0;
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

// ==================================================
// Actions: Today Tasks
// UI button → action fn → state + XP → saveAndRender.
// Current Focus re-derives from Today Flow order on every render — no separate state to sync.
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

// ==================================================
// Actions: Focus Blocks
// ==================================================
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

// ==================================================
// Actions: Today Flow Reorder
// ==================================================
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
function moveTodayEntry(kind,id,dir){
  const arr=kind==='task'?D.todayTasks:D.focusBlocks;
  const today=arr.filter(x=>x.date===todayDateKey()).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||(a.createdAt||0)-(b.createdAt||0));
  const pos=today.findIndex(x=>x.id===id);
  const next=pos+dir;
  if(pos<0||next<0||next>=today.length) return;
  [today[pos].order,today[next].order]=[today[next].order,today[pos].order];
  saveAndRender('today');
}
