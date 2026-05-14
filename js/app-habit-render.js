// js/app-habit-render.js
// Habit Flow / habit card rendering helpers.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   D, streak, freqLabel, habitDisplayName, compactHabitSubline, escapeHtml,
//   stopUiEvent, habitIsDoneToday, buildHabitGroupsAll,
//   todayDesignMode, editingFlowId, todayFlowReorderMode  — js/app.js
//   togH, uncompleteHabitInFlow, moveHabit, moveHabitOutOfChain,
//   moveHabitToGroup, toggleStack, showEditHabit, showAddHabit, deleteHabit,
//   startHabitPointer, startHabitDrag, endHabitDrag, allowHabitDrop,
//   dropHabitOnGroup, startTodayFlowDrag, endTodayFlowDrag,
//   moveTodayFlowItem, toast                              — js/app.js
//   flowTheme, activeStepTitle, getCurrentFocus          — js/app-current-focus.js
// Load order: app-today-flow-data.js → app-today-flow-render.js → app-current-focus.js → app-today-actions.js → app-habit-render.js → app.js

// ==================================================
// Habit Detail / Chain Move Helpers
// ==================================================
function renderChainMoveOptions(currentGroupId){
  return buildHabitGroupsAll().map(g=>`<option value="${g.id}" ${g.id===currentGroupId?'selected':''}>${escapeHtml(g.title)}</option>`).join('');
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

// ==================================================
// Node Progress / Drop Zone
// ==================================================
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
function renderHabitDropZone(groupId,position){
  return`<div class="habit-drop-zone" data-group-id="${groupId}" data-position="${position}" ondragover="enterHabitDrop(event)" ondragenter="enterHabitDrop(event)" ondragleave="leaveHabitDrop(event)" ondrop="dropHabitOnGroup(event,'${groupId}',${position})"></div>`;
}

// ==================================================
// Habit Flow Card Sub-renders
// Called by renderHabitChain.
// ==================================================
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

// ==================================================
// Habit Row / Habit Chain
// renderHabitChain() is the Today Flow entry renderer for habit-flow cards.
// Called by renderTodayFlowItem() in js/app-today-flow-render.js when entry.kind === 'habit-flow'.
// Also called directly by renHabits() in js/app.js.
// ==================================================
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
