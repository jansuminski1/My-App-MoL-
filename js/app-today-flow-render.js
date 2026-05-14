// js/app-today-flow-render.js
// Today Flow: Rendering
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   buildTodayFlow, buildHabitChains  — js/app-today-flow-data.js
//   todayFlowReorderMode              — let variable declared in js/app.js
//   renderHabitChain, escapeHtml      — js/app.js
//   Action handlers referenced in inline onclick strings (moveTodayFlowItem,
//   startTodayFlowDrag, endTodayFlowDrag, stopUiEvent, toggleTodayTask,
//   deleteTodayTask, toggleFocusBlock, deleteFocusBlock, startTodayFocusBlock,
//   dropTodayFlowItem) — all remain in js/app.js and are available at call time.
// Load order: app-today-flow-data.js → app-today-flow-render.js → app.js

// ==================================================
// Today Flow: Rendering
// renderTodayFlow() builds the list; renderTodayFlowItem() renders one entry.
// habit-flow entries are handled by renderHabitChain(), defined in js/app.js.
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
