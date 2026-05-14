// js/app-today-flow-data.js
// Today Flow: Data / Ordering Helpers
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals from app.js (available at call time): D, ensureTodayFlow,
//   todayDateKey, buildHabitChains, sv
// Load order: this file must load BEFORE js/app.js.

// ==================================================
// Today Flow: Data Helpers
// todayTasks / todayFocusBlocks filter and sort today's items by order then createdAt.
// todayEntries() merges both into a unified sorted list used by buildTodayFlow().
// ==================================================
function todayTasks(){
  ensureTodayFlow();
  const today=todayDateKey();
  return D.todayTasks.filter(t=>t.date===today).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||(a.createdAt||0)-(b.createdAt||0));
}
function todayFocusBlocks(){
  ensureTodayFlow();
  const today=todayDateKey();
  return D.focusBlocks.filter(b=>b.date===today).sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||(a.createdAt||0)-(b.createdAt||0));
}
function todayEntries(){
  return [
    ...todayTasks().map(item=>({kind:'task',item})),
    ...todayFocusBlocks().map(item=>({kind:'focus',item}))
  ].sort((a,b)=>(Number(a.item.order)||0)-(Number(b.item.order)||0)||(a.item.createdAt||0)-(b.item.createdAt||0));
}

// ==================================================
// Today Flow: Data / Ordering Helpers
// Today Flow combines habit-flow cards, quick tasks, and focus blocks.
// buildTodayFlow() is the authoritative source of visible order.
// D.todayFlowOrder[dateKey] stores the user's custom arrangement as an ordered key list.
// Stale keys (deleted items) are silently skipped during sort.
// applyTodayFlowCustomOrder() re-sorts the base list by the saved key order.
// ==================================================
function todayPlacementLabel(entry){
  if(entry.placementType==='start') return 'Start of day';
  if(entry.placementType==='midday') return 'Midday';
  if(entry.placementType==='evening') return 'Evening';
  if(entry.placementType==='afterFlow') return 'After routine';
  return 'Flexible / Later';
}
function entriesForPlacement(entries,type,id=''){
  return entries.filter(e=>e.item.placementType===type&&(id===''||e.item.placementId===id));
}
function buildTodayFlow(chains=buildHabitChains()){
  const entries=todayEntries();
  const used=new Set();
  const addEntries=(items,out)=>{
    items.forEach(e=>{used.add(`${e.kind}:${e.item.id}`);out.push(e);});
  };
  const out=[];
  addEntries(entriesForPlacement(entries,'start'),out);
  chains.forEach((chain,idx)=>{
    out.push({kind:'habit-flow',chain,item:{id:chain.id}});
    addEntries(entriesForPlacement(entries,'afterFlow',chain.id),out);
    if(idx===0) addEntries(entriesForPlacement(entries,'midday'),out);
  });
  if(!chains.length) addEntries(entriesForPlacement(entries,'midday'),out);
  addEntries(entriesForPlacement(entries,'evening'),out);
  addEntries(entries.filter(e=>!used.has(`${e.kind}:${e.item.id}`)),out);
  const today=todayDateKey();
  const customOrder=(D.todayFlowOrder||{})[today];
  if(customOrder&&customOrder.length) return applyTodayFlowCustomOrder(out,customOrder);
  return out;
}
function applyTodayFlowCustomOrder(items,customOrder){
  const lookup=new Map(customOrder.map((e,i)=>[`${e.kind}:${e.id}`,i]));
  const getKey=e=>e.kind==='habit-flow'?`habit-flow:${e.chain?.id||e.item?.id}`:`${e.kind}:${e.item?.id}`;
  return [...items].sort((a,b)=>{
    const ai=lookup.has(getKey(a))?lookup.get(getKey(a)):9999;
    const bi=lookup.has(getKey(b))?lookup.get(getKey(b)):9999;
    return ai-bi;
  });
}
function saveTodayFlowOrder(orderedItems){
  if(!D.todayFlowOrder||typeof D.todayFlowOrder!=='object') D.todayFlowOrder={};
  const today=todayDateKey();
  D.todayFlowOrder[today]=orderedItems.map(e=>({
    kind:e.kind,
    id:e.kind==='habit-flow'?(e.chain?.id):e.item?.id
  }));
  sv();
}

// Today Flow order-key helpers — used by delete actions in app.js.
function makeTodayFlowOrderKey(entry){
  if(!entry) return '';
  if(entry.kind&&entry.item?.id) return `${entry.kind}:${entry.item.id}`;
  if(entry.kind==='habit-flow'&&entry.chain?.id) return `flow:${entry.chain.id}`;
  const kind=entry.kind||entry.type||'item';
  const id=entry.id||entry.placementId||entry.chain?.id||'';
  return id?`${kind}:${id}`:'';
}
function removeFromTodayFlowOrder(kind,id,dateKey=todayDateKey()){
  if(!D.todayFlowOrder||typeof D.todayFlowOrder!=='object') return;
  const order=D.todayFlowOrder[dateKey];
  if(!Array.isArray(order)) return;
  const aliases=new Set([`${kind}:${id}`]);
  if(kind==='task') aliases.add(`today-task:${id}`);
  if(kind==='focus') aliases.add(`focus-block:${id}`);
  if(kind==='flow'||kind==='habit-flow'){
    aliases.add(`flow:${id}`);
    aliases.add(`habit-flow:${id}`);
    aliases.add(`chain:${id}`);
  }
  D.todayFlowOrder[dateKey]=order.filter(item=>{
    if(typeof item==='string') return !aliases.has(item);
    const key=makeTodayFlowOrderKey(item);
    return !aliases.has(key)&&item?.id!==id;
  });
}
