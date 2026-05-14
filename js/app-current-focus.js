// js/app-current-focus.js
// Current Focus: selection logic and rendering.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   buildTodayFlow, buildHabitChains        — js/app-today-flow-data.js
//   habitIsDoneToday, habitDisplayName       — js/app.js
//   renderNodeProgress                       — js/app.js
//   D, _profileSteps, _profileIdx, _wElapsed — js/app.js
//   selectedFocusMinutes, selectedFocusProfile, fmt, escapeHtml — js/app.js
//   Action handlers in inline onclick strings (togH, toast, toggleTodayTask,
//   updateTodayEntryPlacement, startTodayFocusBlock, toggleFocusBlock,
//   navigateToTab, showAddTodayTask, showAddFocusBlock, stopUiEvent)
//   — all remain in js/app.js and are available at call time.
// flowTheme and activeStepTitle are also used by renderHabitChain in js/app.js;
//   they are globally accessible here because this file loads before app.js.
// Load order: app-today-flow-data.js → app-today-flow-render.js → app-current-focus.js → app.js

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
// flowTheme is also used by renderNodeProgress and renderHabitChain in app.js.
function flowTheme(chain,index=0){
  const title=String(chain?.title||'').toLowerCase();
  if(title.includes('morning')) return {key:'morning',icon:'🌄',accent:'#22a66a'};
  if(title.includes('midday')) return {key:'midday',icon:'☀️',accent:'#f59f00'};
  if(title.includes('evening')||title.includes('reset')) return {key:'evening',icon:'🌙',accent:'#6d5dfc'};
  if(title.includes('today')) return {key:'today',icon:'✓',accent:'#0e8bba'};
  const fallback=[{key:'custom-blue',icon:'◆',accent:'#0e8bba'},{key:'custom-green',icon:'◇',accent:'#22a66a'},{key:'custom-purple',icon:'✦',accent:'#6d5dfc'}];
  return fallback[index%fallback.length];
}
// activeStepTitle is also used by renderCurrentStepSubCard in app.js.
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
