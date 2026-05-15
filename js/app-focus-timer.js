// js/app-focus-timer.js
// Focus timer, recall/rest phases, focus profiles, study session logging, manual log, and alarm.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   D, sv, toast, closeMod, getTagColor  — js/app.js
//   maybeAwardStudyXp, showXpFloat       — js/app-xp.js
// Load order: app-persistence.js → ... → app-analytics.js → app-focus-timer.js → app.js

// ==================================================
// Alarm Sound
// ==================================================
function playAlarm(type='work'){
  if(!D.alarmOn) return;
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const notes=type==='work'?[523,659,784,1047]:[392,523,659,523];
    notes.forEach((freq,i)=>{
      const osc=ctx.createOscillator(),gain=ctx.createGain();
      osc.connect(gain);gain.connect(ctx.destination);
      osc.frequency.value=freq;osc.type='sine';
      gain.gain.setValueAtTime(0,ctx.currentTime+i*.25);
      gain.gain.linearRampToValueAtTime(.35,ctx.currentTime+i*.25+.05);
      gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.25+.35);
      osc.start(ctx.currentTime+i*.25);osc.stop(ctx.currentTime+i*.25+.4);
    });
    setTimeout(()=>ctx.close(),2000);
  }catch(e){}
}
function toggleAlarm(){
  D.alarmOn=!D.alarmOn;
  const btn=document.getElementById('alarm-btn');
  if(btn){btn.textContent=(D.alarmOn?'🔔':'🔕')+' Alarm';btn.style.color=D.alarmOn?'var(--acc)':'var(--mut)';}
  toast(D.alarmOn?'Alarm on':'Alarm off');
}

// ==================================================
// In-Session Tag Dropdown (second dropdown, shown during work phase)
// ==================================================
let tagDropdownOpen2=false;
function toggleTagDropdown2(){
  tagDropdownOpen2=!tagDropdownOpen2;
  const list=document.getElementById('tag-dropdown-list2');
  if(list) list.classList.toggle('hid',!tagDropdownOpen2);
  if(tagDropdownOpen2) renderTagDropdownList2();
}
function renderTagDropdownList2(){
  const list=document.getElementById('tag-dropdown-list2');if(!list)return;
  list.innerHTML=D.tags.map(t=>`
    <div class="tag-dropdown-item ${D.atag===t?'active':''}" onclick="selTag2('${t.replace(/'/g,"\\'")}')" >
      <span class="tag-dot" style="background:${getTagColor(t)}"></span>
      <span style="flex:1">${t}</span>
    </div>`).join('');
}
function selTag2(t){D.atag=t;tagDropdownOpen2=false;document.getElementById('tag-dropdown-list2')?.classList.add('hid');syncTagBtn2();}
function syncTagBtn2(){
  const dot=document.getElementById('tag-sel-dot2'),lbl=document.getElementById('tag-sel-label2');
  if(dot) dot.style.background=D.atag?getTagColor(D.atag):'var(--bdr)';
  if(lbl) lbl.textContent=D.atag||'—';
}
document.addEventListener('click',e=>{
  const w2=document.getElementById('tag-dropdown-wrap2');
  if(w2&&!w2.contains(e.target)){tagDropdownOpen2=false;document.getElementById('tag-dropdown-list2')?.classList.add('hid');}
});

// ==================================================
// Session Profiles
// ==================================================
function renProfilesMini(){
  const el=document.getElementById('profile-list-mini');if(!el)return;
  if(!D.profiles.length){el.innerHTML=`<p style="font-size:.76rem;color:var(--mut);font-style:italic">No profiles yet. Create one below.</p>`;updateStartBtn();return;}
  el.innerHTML=D.profiles.map((p,i)=>`
    <div class="profile-card ${D.activeProfile===i?'sel':''}" style="${D.activeProfile===i?'border-color:var(--acc);background:rgba(14,139,186,.06)':''}" onclick="selectProfile(${i})">
      <h4>${p.name}</h4>
      <div class="profile-meta">${p.focusSessions.length} focus · ${p.restSessions.length} rest — ${p.focusSessions.reduce((a,b)=>a+b,0)+p.restSessions.reduce((a,b)=>a+b,0)} min total</div>
    </div>`).join('');
  updateStartBtn();
}
function selectProfile(i){
  D.activeProfile= D.activeProfile===i?null:i;
  renProfilesMini();
}
function updateStartBtn(){
  const btn=document.getElementById('start-work-btn');
  if(D.activeProfile!==null&&D.profiles[D.activeProfile]){
    const p=D.profiles[D.activeProfile];
    if(btn) btn.textContent=`▶ Begin "${p.name}"`;
  } else {
    if(btn) btn.textContent='▶ Begin 60-min Timer';
  }
  updateFocusTimerPanel();
}
function selectedFocusProfile(){
  return D.activeProfile!==null&&D.profiles[D.activeProfile]?D.profiles[D.activeProfile]:null;
}
function selectedFocusMinutes(){
  const p=selectedFocusProfile();
  return Number(p?.focusSessions?.[0])||60;
}
function updateFocusTimerPanel(remSec=null,totalSec=null){
  const p=selectedFocusProfile();
  const label=document.getElementById('mind-focus-label');
  const profile=document.getElementById('mind-focus-profile');
  const time=document.getElementById('mind-focus-time');
  const hint=document.getElementById('mind-focus-hint');
  const primary=document.getElementById('mind-focus-primary');
  const ring=document.querySelector('.mind-focus-ring');
  const phase=D.phase||'idle';
  const running=phase==='work';
  const seconds=remSec!==null?remSec:selectedFocusMinutes()*60;
  if(label) label.textContent=running?'Deep Work':'Pomodoro Focus';
  if(profile) profile.textContent=p?.name||'Default session';
  if(time) time.textContent=fmt(seconds);
  if(hint) hint.textContent=running?(D.paused?'Paused':'Tap to pause'):'Tap to start';
  if(primary) primary.textContent=running?(D.paused?'Resume':'Pause'):'Start';
  if(ring){
    ring.classList.toggle('running',running);
    ring.style.setProperty('--timer-progress',totalSec?`${Math.max(0,Math.min(100,(seconds/totalSec)*100))}%`:'100%');
  }
}
function handleFocusRingTap(){
  if(D.phase==='work'){pauseResume();return;}
  if(D.phase==='idle') startWork();
}
function handleFocusPrimary(){
  if(D.phase==='work'){pauseResume();return;}
  if(D.phase==='idle') startWork();
}

function showProfileManager(){
  const modal=document.getElementById('mod');
  modal.innerHTML=`
    <h2>Session Profiles</h2>
    <div id="pm-list" style="margin-bottom:14px">${D.profiles.length?D.profiles.map((p,i)=>`
      <div class="profile-card">
        <div style="display:flex;align-items:center;gap:8px">
          <h4 style="flex:1;margin:0">${p.name}</h4>
          <button class="btn bs" style="font-size:.68rem;padding:2px 8px" onclick="editProfile(${i})">Edit</button>
          <button class="btn bd" style="font-size:.68rem;padding:2px 8px" onclick="deleteProfile(${i})">Del</button>
        </div>
        <div class="profile-meta" style="margin-top:4px">Focus: ${p.focusSessions.join(', ')} min</div>
        <div class="profile-meta">Rest: ${p.restSessions.join(', ')} min</div>
      </div>`).join(''):'<p style="font-size:.78rem;color:var(--mut)">No profiles yet.</p>'}</div>
    <button class="btn bp" style="width:100%;margin-bottom:8px" onclick="createNewProfile()">+ Create New Profile</button>
    <button class="btn bs" style="width:100%" onclick="closeMod()">Close</button>`;
  document.getElementById('mov').classList.remove('hid');
}

function createNewProfile(){buildProfileEditor(-1);}
function editProfile(i){buildProfileEditor(i);}

function buildProfileEditor(idx){
  const isNew=idx===-1;
  const p=isNew?{name:'',focusSessions:[60],restSessions:[10]}:JSON.parse(JSON.stringify(D.profiles[idx]));
  function rows(arr,type){
    return arr.map((v,i)=>`
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="font-size:.76rem;color:var(--mut);min-width:60px">${type==='focus'?'Focus':'Rest'} ${i+1}</span>
        <input type="number" id="pe-${type}-${i}" value="${v}" min="1" max="90" style="width:70px;padding:5px 8px;border:1.5px solid var(--bdr);border-radius:6px;font-size:.82rem;background:var(--bg)"> min
        <button onclick="removePeSlot('${type}',${i})" style="width:22px;height:22px;border:none;background:none;cursor:pointer;color:var(--red);font-size:1rem;padding:0">−</button>
      </div>`).join('');
  }
  document.getElementById('mod').innerHTML=`
    <h2>${isNew?'New Profile':'Edit Profile'}</h2>
    <label>Profile name</label><input type="text" id="pe-name" value="${p.name}" placeholder="e.g. Pomodoro 4×25" class="mb10">
    <div style="display:flex;gap:16px;flex-wrap:wrap">
      <div style="flex:1;min-width:140px">
        <div style="font-size:.76rem;font-weight:700;color:var(--navy);margin-bottom:6px">Focus Sessions (max 8, 1–90 min)</div>
        <div id="pe-focus-rows">${rows(p.focusSessions,'focus')}</div>
        <button class="btn bs" style="font-size:.72rem;padding:3px 10px;margin-top:4px" onclick="addPeSlot('focus')">+ Add Focus</button>
      </div>
      <div style="flex:1;min-width:140px">
        <div style="font-size:.76rem;font-weight:700;color:var(--navy);margin-bottom:6px">Rest Sessions (max 8, 1–90 min)</div>
        <div id="pe-rest-rows">${rows(p.restSessions,'rest')}</div>
        <button class="btn bs" style="font-size:.72rem;padding:3px 10px;margin-top:4px" onclick="addPeSlot('rest')">+ Add Rest</button>
      </div>
    </div>
    <div class="brow" style="margin-top:14px">
      <button class="btn bp" onclick="saveProfileEditor(${idx})">Save Profile</button>
      <button class="btn bs" onclick="showProfileManager()">Back</button>
    </div>`;
  document.getElementById('mov').classList.remove('hid');
  // store temp state for dynamic add/remove
  window._peState={focus:[...p.focusSessions],rest:[...p.restSessions]};
}

function addPeSlot(type){
  const arr=window._peState[type];
  if(arr.length>=8){toast('Maximum 8 sessions per type.');return;}
  arr.push(type==='focus'?25:10);
  rebuildPeRows(type);
}
function removePeSlot(type,i){
  const arr=window._peState[type];
  if(arr.length<=1){toast('Need at least 1 session.');return;}
  arr.splice(i,1);rebuildPeRows(type);
}
function rebuildPeRows(type){
  const arr=window._peState[type];
  const el=document.getElementById(`pe-${type}-rows`);if(!el)return;
  el.innerHTML=arr.map((v,i)=>`
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
      <span style="font-size:.76rem;color:var(--mut);min-width:60px">${type==='focus'?'Focus':'Rest'} ${i+1}</span>
      <input type="number" id="pe-${type}-${i}" value="${v}" min="1" max="90" style="width:70px;padding:5px 8px;border:1.5px solid var(--bdr);border-radius:6px;font-size:.82rem;background:var(--bg)"> min
      <button onclick="removePeSlot('${type}',${i})" style="width:22px;height:22px;border:none;background:none;cursor:pointer;color:var(--red);font-size:1rem;padding:0">−</button>
    </div>`).join('');
}
function saveProfileEditor(idx){
  const name=document.getElementById('pe-name').value.trim();
  if(!name){toast('Profile needs a name.');return;}
  const focus=window._peState.focus.map((_,i)=>Math.min(90,Math.max(1,parseInt(document.getElementById(`pe-focus-${i}`).value)||25)));
  const rest=window._peState.rest.map((_,i)=>Math.min(90,Math.max(1,parseInt(document.getElementById(`pe-rest-${i}`).value)||10)));
  const prof={name,focusSessions:focus,restSessions:rest};
  if(idx===-1) D.profiles.push(prof); else D.profiles[idx]=prof;
  sv();closeMod();renProfilesMini();toast(idx===-1?'Profile created ✓':'Profile updated ✓');
}
function deleteProfile(i){
  if(!confirm('Delete this profile?'))return;
  D.profiles.splice(i,1);if(D.activeProfile>=D.profiles.length)D.activeProfile=null;
  sv();showProfileManager();renProfilesMini();
}

// ==================================================
// Timer Utilities
// ==================================================
function fmt(s){s=Math.max(0,Math.round(s));return`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function setRing(id,total,rem){const el=document.getElementById(id);if(el)el.style.strokeDashoffset=421*(1-Math.max(0,rem)/total);}
function showPh(p){['idle','work','recall','rest'].forEach(x=>document.getElementById('ph-'+x).classList.toggle('hid',x!==p));}

// ==================================================
// Deep Work Timer (wall-clock anchored for background support)
// ==================================================
let _profileSteps=[], _profileIdx=0;
// Wall-clock anchoring: store start time and total duration
let _wStart=0, _wTotal=0, _wPauseAccum=0, _wPauseAt=0;
let _rStart=0, _rTotal=0;

function getWorkRemain(){
  if(D.paused) return _wTotal - _wPauseAccum - (_wPauseAt - _wStart);
  return _wTotal - _wPauseAccum - (Date.now() - _wStart - _wPauseAccum ? (Date.now()-_wStart-_wPauseAccum) : 0);
}
// Simpler: track elapsed separately
let _wElapsed=0, _wLastTick=0; // ms elapsed in focus
let _rElapsed=0, _rLastTick=0;

function startWork(){
  D.h20=document.getElementById('h20').value.trim();
  if(!D.h20){toast('Write the hardest 20% before starting.');return;}
  if(D.activeProfile!==null&&D.profiles[D.activeProfile]){
    const p=D.profiles[D.activeProfile];
    _profileSteps=[];
    const maxLen=Math.max(p.focusSessions.length,p.restSessions.length);
    for(let i=0;i<maxLen;i++){
      if(i<p.focusSessions.length) _profileSteps.push({type:'focus',mins:p.focusSessions[i]});
      if(i<p.restSessions.length)  _profileSteps.push({type:'rest',mins:p.restSessions[i]});
    }
  } else { _profileSteps=[{type:'focus',mins:60}]; }
  _profileIdx=0;
  startFocusPhase(_profileSteps[0].mins);
}

function startFocusPhase(mins){
  const totalSec=mins*60;
  D.phase='work'; D.paused=false;
  _wElapsed=0; _wLastTick=Date.now();
  showPh('work');
  document.getElementById('h20r').textContent=D.h20;
  document.getElementById('a12').classList.remove('hid');
  document.getElementById('ahalf').classList.add('hid');
  document.getElementById('wt').textContent=fmt(totalSec);
  setRing('wr',totalSec,totalSec);
  updateFocusTimerPanel(totalSec,totalSec);
  document.getElementById('pbtn').textContent='Pause';
  syncTagBtn2();
  clearInterval(D.tmr);
  D.tmr=setInterval(()=>tickW(totalSec),500);
}

function tickW(totalSec){
  if(D.paused) return;
  const now=Date.now();
  _wElapsed+=(now-_wLastTick)/1000;
  _wLastTick=now;
  const rem=Math.max(0,totalSec-_wElapsed);
  document.getElementById('wt').textContent=fmt(rem);
  setRing('wr',totalSec,rem);
  updateFocusTimerPanel(rem,totalSec);
  if(_wElapsed>720) document.getElementById('a12').classList.add('hid');
  if(_wElapsed>=totalSec/2 && _wElapsed<totalSec/2+1) document.getElementById('ahalf').classList.remove('hid');
  if(rem<=0){ clearInterval(D.tmr); playAlarm('work'); enterRecall(); }
}

function pauseResume(){
  D.paused=!D.paused;
  if(!D.paused) _wLastTick=Date.now(); // reset tick anchor on resume
  document.getElementById('pbtn').textContent=D.paused?'Resume':'Pause';
  updateFocusTimerPanel(Math.max(0,(_profileSteps[_profileIdx]?.mins||60)*60-_wElapsed),(_profileSteps[_profileIdx]?.mins||60)*60);
}

function finishEarly(){
  if(!confirm('Finish this focus session now and log the time spent?')) return;
  clearInterval(D.tmr);
  // Update elapsed one final time
  if(!D.paused){const now=Date.now();_wElapsed+=(now-_wLastTick)/1000;}
  playAlarm('work');
  enterRecall();
}

function abandon(){
  if(!confirm('Abandon this session without logging?')) return;
  clearInterval(D.tmr);
  resetIdle();
}

function enterRecall(){
  D.phase='recall'; D.remain=120;
  updateFocusTimerPanel(120,120);
  _rElapsed=0; _rLastTick=Date.now();
  showPh('recall');
  document.getElementById('rt').textContent='2:00';
  clearInterval(D.tmr);
  D.tmr=setInterval(tickR,500);
}
function tickR(){
  const now=Date.now();
  _rElapsed+=(now-_rLastTick)/1000; _rLastTick=now;
  const rem=Math.max(0,120-_rElapsed);
  document.getElementById('rt').textContent=fmt(rem);
  if(rem<=0) clearInterval(D.tmr);
}

function startRest(targetEl=null){
  D.recallTxt=document.getElementById('rct').value.trim();
  if(!D.recallTxt){toast('Write your free recall summary first.');return;}
  // log elapsed focus time in hours
  const focusMins=(_profileSteps[_profileIdx]?.mins)||60;
  const actualHours=Math.max(0.1, _wElapsed/3600);
  logSess(D.atag,D.h20,D.recallTxt,Math.round(actualHours*10)/10,D.selFocus,Date.now(),false,targetEl);
  clearInterval(D.tmr); _profileIdx++;
  const nextStep=_profileSteps[_profileIdx];
  const restMins=nextStep&&nextStep.type==='rest'?nextStep.mins:10;
  startRestPhase(restMins);
}

function startRestPhase(mins){
  const totalSec=mins*60;
  D.phase='rest';
  updateFocusTimerPanel(totalSec,totalSec);
  _rElapsed=0; _rLastTick=Date.now();
  showPh('rest');
  document.getElementById('rst').textContent=fmt(totalSec);
  setRing('rr',totalSec,totalSec);
  clearInterval(D.tmr);
  D.tmr=setInterval(()=>{
    const now=Date.now();
    _rElapsed+=(now-_rLastTick)/1000; _rLastTick=now;
    const rem=Math.max(0,totalSec-_rElapsed);
    updateFocusTimerPanel(rem,totalSec);
    document.getElementById('rst').textContent=fmt(rem);
    setRing('rr',totalSec,rem);
    if(rem<=0){
      clearInterval(D.tmr); playAlarm('rest'); _profileIdx++;
      const nxt=_profileSteps[_profileIdx];
      if(nxt&&nxt.type==='focus'){toast('Rest done! Next focus session starting…');setTimeout(()=>startFocusPhase(nxt.mins),1500);}
      else toast('All sessions complete! 🎉');
    }
  },500);
}

function skipRest(){
  clearInterval(D.tmr); _profileIdx++;
  const nxt=_profileSteps[_profileIdx];
  if(nxt&&nxt.type==='focus') startFocusPhase(nxt.mins);
  else resetIdle();
}

// Sync timer when page becomes visible again (background support)
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden && D.phase==='work' && !D.paused) _wLastTick=Date.now();
  if(!document.hidden && D.phase==='rest') _rLastTick=Date.now();
});

// ==================================================
// Focus Star Selector
// ==================================================
function selFocus(v){
  D.selFocus=v;
  document.querySelectorAll('#focus-sel .fstar').forEach(b=>b.classList.toggle('on',parseInt(b.dataset.val)===v));
}

// ==================================================
// Session Logging
// ==================================================
function logSess(tag,h20,recall,hours,focus,ts,manual=false,floatTarget=null){
  const sessionTs=ts||Date.now();
  const session={id:`s${sessionTs}_${D.sessions.length}`,tag,h20,recall,hours:hours||1,focus:focus||3,ts:sessionTs,manual};
  D.sessions.push(session);
  const xp=maybeAwardStudyXp(session,{showToast:true});
  showXpFloat(floatTarget||document.getElementById('slog'),xp);
  sv();renSCnt();renSlog();
}
function renSCnt(){
  const td=new Date().toDateString();
  const n=D.sessions.filter(s=>new Date(s.ts).toDateString()===td).length;
  document.getElementById('sc').textContent=`Today: ${n} session${n!==1?'s':''}`;
}

// Init session log year filter
function initSlogFilter(){
  const ysel=document.getElementById('slog-year');
  const msel=document.getElementById('slog-month');
  if(!ysel||!msel) return;
  const now=new Date();
  const years=new Set(D.sessions.map(s=>new Date(s.ts).getFullYear()));
  years.add(now.getFullYear());
  const sorted=[...years].sort((a,b)=>b-a);
  ysel.innerHTML=sorted.map(y=>`<option value="${y}" ${y===now.getFullYear()?'selected':''}>${y}</option>`).join('');
  msel.value=String(now.getMonth());
}

function renSlog(){
  const el=document.getElementById('slog');
  const msel=document.getElementById('slog-month');
  const ysel=document.getElementById('slog-year');
  if(!el) return;
  // Refresh year options in case new years appeared
  if(ysel){
    const curY=parseInt(ysel.value)||new Date().getFullYear();
    const years=new Set(D.sessions.map(s=>new Date(s.ts).getFullYear()));
    years.add(new Date().getFullYear());
    const sorted=[...years].sort((a,b)=>b-a);
    ysel.innerHTML=sorted.map(y=>`<option value="${y}" ${y===curY?'selected':''}>${y}</option>`).join('');
  }
  if(!D.sessions.length){el.innerHTML='<p style="font-size:.8rem;color:var(--mut)">No sessions recorded yet.</p>';return;}
  const filterM=msel?parseInt(msel.value):new Date().getMonth();
  const filterY=ysel?parseInt(ysel.value):new Date().getFullYear();
  const filtered=D.sessions.filter(s=>{const d=new Date(s.ts);return d.getFullYear()===filterY&&d.getMonth()===filterM;});
  const countEl=document.getElementById('slog-count');
  if(countEl) countEl.textContent=`${filtered.length} session${filtered.length!==1?'s':''}`;
  if(!filtered.length){el.innerHTML='<p style="font-size:.8rem;color:var(--mut)">No sessions this month.</p>';return;}
  el.innerHTML=[...filtered].reverse().map(s=>`
    <div class="li">
      <span style="background:${getTagColor(s.tag)}22;border-radius:4px;padding:2px 6px;font-size:.7rem;font-weight:600;color:${getTagColor(s.tag)};border:1px solid ${getTagColor(s.tag)}44;margin-right:5px">${s.tag}</span>
      <strong style="font-size:.78rem">${new Date(s.ts).toLocaleDateString([],{month:'short',day:'numeric'})}</strong>
      <span style="font-size:.72rem;color:var(--mut)"> · ${s.hours}h</span>
      ${s.focus?`<span style="font-size:.7rem;color:var(--cyn);margin-left:4px;font-weight:600">focus ${s.focus}/5</span>`:''}
      ${s.manual?'<span style="font-size:.68rem;color:var(--mut);margin-left:4px">[manual]</span>':''}
      <div style="margin-top:3px;font-size:.78rem;color:var(--mut)">${s.h20}</div>
    </div>`).join('');
}

function resetIdle(){
  clearInterval(D.tmr);D.phase='idle';D.paused=false;
  _wElapsed=0;_rElapsed=0;_profileSteps=[];_profileIdx=0;
  document.getElementById('h20').value='';document.getElementById('rct').value='';
  document.getElementById('ahalf').classList.add('hid');showPh('idle');D.selFocus=3;selFocus(3);
  renProfilesMini();
  updateFocusTimerPanel();
}

// ==================================================
// Manual Session Log
// ==================================================
let manFocus=3;
function showManualLog(){
  const today=new Date().toISOString().split('T')[0];
  const tagOpts=D.tags.map(t=>`<option value="${t}"${t===D.atag?' selected':''}>${t}</option>`).join('');
  document.getElementById('mod').innerHTML=`
    <h2>Log Session Manually</h2>
    <div class="mlog-grid">
      <div><label>Date</label><input type="date" id="ml-date" value="${today}" class="mb10"></div>
      <div><label>Hours studied</label><input type="number" id="ml-hours" value="1" min="0.5" max="12" step="0.5" class="mb10"></div>
    </div>
    <label>Subject tag</label><select id="ml-tag" class="mb10">${tagOpts}</select>
    <label>Task description</label><input type="text" id="ml-task" placeholder="What did you study?" class="mb10">
    <label>Focus level</label>
    <div class="focus-row" id="ml-focus-sel" style="margin-bottom:14px">
      ${[1,2,3,4,5].map(v=>`<button class="fstar${v===3?' on':''}" data-v="${v}" onclick="selManFocus(${v})" type="button">${v}</button>`).join('')}
    </div>
    <div class="brow">
      <button class="btn bp" onclick="saveManualLog(event.currentTarget)">Save Session</button>
      <button class="btn bs" onclick="closeMod()">Cancel</button>
    </div>`;
  document.getElementById('mov').classList.remove('hid');
}
function selManFocus(v){manFocus=v;document.querySelectorAll('#ml-focus-sel .fstar').forEach(b=>b.classList.toggle('on',parseInt(b.dataset.v)===v));}
function saveManualLog(targetEl=null){
  const dateVal=document.getElementById('ml-date').value;
  const hours=parseFloat(document.getElementById('ml-hours').value)||1;
  const tag=document.getElementById('ml-tag').value;
  const task=document.getElementById('ml-task').value.trim();
  if(!task){toast('Please describe what you studied.');return;}
  const ts=new Date(dateVal+'T12:00:00').getTime();
  logSess(tag,task,'Manual entry',hours,manFocus,ts,true,targetEl);
  closeMod();toast('Session logged ✓');
}
