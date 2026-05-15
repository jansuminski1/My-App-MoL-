// js/app-analytics.js
// Analytics rendering, Chart.js chart creation, and session data aggregation.
// Plain script — no modules, no import/export. All functions are globally accessible.
// Depends on globals available at call time:
//   D, sv, toast        — js/app.js
//   Chart               — Chart.js CDN (loaded in index.html)
// Load order: app-persistence.js → ... → app-goals.js → app-analytics.js → app.js

// ==================================================
// Tag Colours & Chart Instances
// ==================================================
const TAG_COLORS=['#14CEFF','#2EED00','#F21B1B','#f5a000','#a855f7','#06b6d4','#f59e0b','#10b981','#e11d48'];
let chartCombo=null,chartDonut=null,chartYearly=null;

// ==================================================
// Navigation Helpers
// ==================================================
function navMonth(d){D.anMonth+=d;if(D.anMonth<0){D.anMonth=11;D.anYear--;}if(D.anMonth>11){D.anMonth=0;D.anYear++;}renAnalytics();}
function navYear(d){D.anYearView+=d;renAnalytics();}

// ==================================================
// Data Helpers
// ==================================================
function getMonthSessions(y,m){return D.sessions.filter(s=>{const dt=new Date(s.ts);return dt.getFullYear()===y&&dt.getMonth()===m;});}

// ==================================================
// Chart Utilities
// ==================================================
function chartDefaults(){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},animation:{duration:350}};}
function chartScaleMax(values,min=1){
  const max=Math.max(0,...values.map(v=>Number(v)||0));
  if(max<=0) return min;
  if(max<=2) return Math.ceil(max+.75);
  return Math.ceil(max*1.25);
}

// ==================================================
// Analytics Rendering
// ==================================================
function renAnalytics(){
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('an-month-lbl').textContent=months[D.anMonth]+' '+D.anYear;
  document.getElementById('an-year-lbl').textContent=D.anYearView;
  renComboChart();renDonutChart();renYearlyChart();
}

function renComboChart(){
  const dim=new Date(D.anYear,D.anMonth+1,0).getDate();
  const now=new Date();
  const isCurrentMonth=D.anYear===now.getFullYear()&&D.anMonth===now.getMonth();
  const visibleDays=isCurrentMonth?now.getDate():dim;
  const sessions=getMonthSessions(D.anYear,D.anMonth);
  const hoursD=[],focusD=[],labels=[];
  for(let d=1;d<=visibleDays;d++){
    labels.push(d);
    const ds=sessions.filter(s=>new Date(s.ts).getDate()===d);
    hoursD.push(ds.reduce((a,s)=>a+(s.hours||1),0));
    const wf=ds.filter(s=>s.focus);
    focusD.push(wf.length?+(wf.reduce((a,s)=>a+s.focus,0)/wf.length).toFixed(1):null);
  }
  const nonNullFocus=focusD.filter(v=>v!==null).length;
  const shouldConnect=nonNullFocus>=2;
  const ctx=document.getElementById('chart-combo').getContext('2d');
  // Gradient fill for focus line
  const grad=ctx.createLinearGradient(0,0,0,200);
  grad.addColorStop(0,'rgba(242,27,27,.22)');
  grad.addColorStop(1,'rgba(242,27,27,.0)');
  if(chartCombo)chartCombo.destroy();
  const yMax=chartScaleMax(hoursD,1);
  chartCombo=new Chart(ctx,{type:'bar',data:{labels,datasets:[
    {type:'bar',label:'Hours',data:hoursD,backgroundColor:'rgba(20,206,255,0.62)',hoverBackgroundColor:'rgba(20,206,255,.82)',borderRadius:7,barPercentage:.72,categoryPercentage:.72,yAxisID:'y',borderSkipped:false},
    {type:'line',label:'Focus',data:focusD,borderColor:'#F21B1B',backgroundColor:grad,tension:.34,yAxisID:'y1',
     pointRadius:focusD.map(v=>v!==null?3.5:0),pointHoverRadius:6,
     pointBackgroundColor:'#F21B1B',pointBorderColor:'#fff',pointBorderWidth:2,
     borderWidth:2.5,spanGaps:shouldConnect,fill:true}
  ]},options:{...chartDefaults(),scales:{
    x:{grid:{display:false},ticks:{font:{size:9,weight:'600'},color:'#5a7080',maxTicksLimit:visibleDays>16?12:visibleDays}},
    y:{beginAtZero:true,max:yMax,grid:{color:'rgba(9,32,54,.055)'},ticks:{font:{size:9},color:'#14CEFF',precision:0},title:{display:true,text:'hrs',font:{size:9},color:'#14CEFF'}},
    y1:{min:0,max:6,position:'right',grid:{drawOnChartArea:false},ticks:{font:{size:9},color:'#F21B1B',stepSize:1,callback:v=>v>0&&v<=5?v:''},title:{display:true,text:'focus',font:{size:9},color:'#F21B1B'}}
  },plugins:{legend:{display:false},tooltip:{mode:'index',intersect:false,backgroundColor:'rgba(9,32,54,.92)',borderColor:'var(--cyn)',borderWidth:1,titleColor:'#e0f2fb',bodyColor:'#b0cfe0',padding:10,callbacks:{title:i=>`Day ${i[0].label}`,label:c=>c.datasetIndex===0?`Hours: ${c.raw}h`:`Focus: ${c.raw}/5`}}}}});
}

function renDonutChart(){
  const sessions=getMonthSessions(D.anYear,D.anMonth);
  const tagH={};sessions.forEach(s=>{tagH[s.tag]=(tagH[s.tag]||0)+(s.hours||1);});
  const tags=Object.keys(tagH),hours=Object.values(tagH),colors=tags.map((_,i)=>TAG_COLORS[i%TAG_COLORS.length]);
  const ctx=document.getElementById('chart-donut').getContext('2d');
  if(chartDonut)chartDonut.destroy();
  if(!tags.length){
    chartDonut=new Chart(ctx,{type:'doughnut',data:{labels:['No data'],datasets:[{data:[1],backgroundColor:['#e0e8f0'],borderWidth:0}]},options:{...chartDefaults(),cutout:'65%',plugins:{legend:{display:false},tooltip:{enabled:false}}}});
    document.getElementById('donut-legend').innerHTML=`<span style="font-size:.76rem;color:var(--mut);font-style:italic">No sessions this month</span>`;
    return;
  }
  chartDonut=new Chart(ctx,{type:'doughnut',data:{labels:tags,datasets:[{data:hours,backgroundColor:colors,borderWidth:2,borderColor:'#fff',hoverOffset:6}]},
    options:{...chartDefaults(),cutout:'62%',plugins:{legend:{display:false},tooltip:{backgroundColor:'#fff',borderColor:'#c5d5e5',borderWidth:1,titleColor:'#0c1a28',bodyColor:'#5a7080',callbacks:{label:c=>`${c.label}: ${c.raw}h`}}}}});
  const total=hours.reduce((a,b)=>a+b,0);
  document.getElementById('donut-legend').innerHTML=tags.map((t,i)=>`
    <div class="legend-item"><div class="legend-dot" style="background:${colors[i]}"></div><span>${t}</span>
    <span style="color:var(--txt);font-weight:600;margin-left:4px">${hours[i]}h</span>
    <span style="color:var(--mut);margin-left:2px">(${Math.round(hours[i]/total*100)}%)</span></div>`).join('');
}

function renYearlyChart(){
  const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const data=months.map((_,m)=>getMonthSessions(D.anYearView,m).reduce((a,s)=>a+(s.hours||1),0));
  const curM=new Date().getMonth(),maxH=chartScaleMax(data,2);
  const ctx=document.getElementById('chart-yearly').getContext('2d');
  if(chartYearly)chartYearly.destroy();
  chartYearly=new Chart(ctx,{type:'bar',data:{labels:months,datasets:[{label:'Hours',data,
    backgroundColor:data.map((_,i)=>i===curM&&D.anYearView===new Date().getFullYear()?'rgba(20,206,255,.9)':'rgba(20,206,255,.38)'),borderRadius:5,borderSkipped:false}]},
    options:{...chartDefaults(),scales:{
      x:{grid:{color:'rgba(0,0,0,.04)'},ticks:{font:{size:9},color:'#5a7080'}},
      y:{beginAtZero:true,max:maxH,grid:{color:'rgba(9,32,54,.055)'},ticks:{font:{size:9},color:'#5a7080',precision:0},title:{display:true,text:'hours',font:{size:9},color:'#5a7080'}}
    },plugins:{legend:{display:false},tooltip:{backgroundColor:'#fff',borderColor:'#c5d5e5',borderWidth:1,titleColor:'#0c1a28',bodyColor:'#5a7080',callbacks:{label:c=>`${c.raw}h studied`}}}}});
}

// ==================================================
// Demo Data
// ==================================================
function loadDemo(){
  const now=new Date(),y=now.getFullYear(),m=now.getMonth(),tags=D.tags.length?D.tags:['Psychoanalysis','Philosophy','Paper Writing'],demo=[];
  for(let d=1;d<=now.getDate();d++){const n=Math.random()<.25?0:Math.floor(Math.random()*3)+1;for(let s=0;s<n;s++)demo.push({tag:tags[Math.floor(Math.random()*tags.length)],h20:'Demo',recall:'Demo',ts:new Date(y,m,d,8+s*2,0).getTime(),focus:Math.floor(Math.random()*3)+3,hours:1});}
  for(let pm=1;pm<=5;pm++){const pm2=(m-pm+12)%12,py2=m-pm<0?y-1:y,dim=new Date(py2,pm2+1,0).getDate();for(let d=1;d<=dim;d++){if(Math.random()<.35)continue;const n=Math.floor(Math.random()*3)+1;for(let s=0;s<n;s++)demo.push({tag:tags[Math.floor(Math.random()*tags.length)],h20:'Demo',recall:'Demo',ts:new Date(py2,pm2,d,8+s*2,0).getTime(),focus:Math.floor(Math.random()*3)+3,hours:1});}}
  D.sessions=[...demo,...D.sessions];sv();renAnalytics();toast('Demo data loaded ✓');
}
function clearDemo(){if(!confirm('Clear all sessions?'))return;D.sessions=[];sv();renAnalytics();toast('Cleared.');}
