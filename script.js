/* ════════════════════════════════════════════════
   NEARFIND PRO — script.js  v4
   Features: Splash · Geolocation · Overpass API
             Busy Status · Compare · Recently Viewed
             Smart Recommendations · Favourites
   ════════════════════════════════════════════════ */
'use strict';

/* ── Category metadata ─────────────────────────── */
const CAT = {
  plumber:     {emoji:'🔧',label:'Plumber',     color:'#3b82f6',icon:'fas fa-wrench'},
  electrician: {emoji:'⚡',label:'Electrician', color:'#facc15',icon:'fas fa-bolt'},
  ac_repair:   {emoji:'❄️',label:'AC Repair',   color:'#06b6d4',icon:'fas fa-snowflake'},
  carpenter:   {emoji:'🪚',label:'Carpenter',   color:'#a16207',icon:'fas fa-hammer'},
  painter:     {emoji:'🎨',label:'Painter',     color:'#ec4899',icon:'fas fa-paint-roller'},
  restaurant:  {emoji:'🍽️',label:'Restaurant', color:'#f97316',icon:'fas fa-utensils'},
  cafe:        {emoji:'☕',label:'Cafe',         color:'#92400e',icon:'fas fa-mug-hot'},
  bakery:      {emoji:'🥐',label:'Bakery',       color:'#d97706',icon:'fas fa-bread-slice'},
  fast_food:   {emoji:'🍔',label:'Fast Food',   color:'#ef4444',icon:'fas fa-burger'},
  hospital:    {emoji:'🏥',label:'Hospital',    color:'#ef4444',icon:'fas fa-hospital'},
  pharmacy:    {emoji:'💊',label:'Pharmacy',    color:'#a855f7',icon:'fas fa-pills'},
  dentist:     {emoji:'🦷',label:'Dentist',     color:'#0ea5e9',icon:'fas fa-tooth'},
  clinic:      {emoji:'🩺',label:'Clinic',      color:'#10b981',icon:'fas fa-stethoscope'},
  mechanic:    {emoji:'🔩',label:'Mechanic',    color:'#6b7280',icon:'fas fa-car'},
  car_wash:    {emoji:'🚿',label:'Car Wash',    color:'#38bdf8',icon:'fas fa-car-burst'},
  petrol_pump: {emoji:'⛽',label:'Petrol Pump', color:'#f59e0b',icon:'fas fa-gas-pump'},
  grocery:     {emoji:'🛒',label:'Grocery',     color:'#22c55e',icon:'fas fa-store'},
  atm:         {emoji:'🏧',label:'ATM',         color:'#10b981',icon:'fas fa-money-bill'},
  bank:        {emoji:'🏦',label:'Bank',        color:'#0ea5e9',icon:'fas fa-landmark'},
  laundry:     {emoji:'🧺',label:'Laundry',     color:'#8b5cf6',icon:'fas fa-shirt'},
  salon:       {emoji:'✂️',label:'Salon',       color:'#ec4899',icon:'fas fa-scissors'},
  police:      {emoji:'👮',label:'Police',      color:'#1d4ed8',icon:'fas fa-shield-halved'},
  fire:        {emoji:'🚒',label:'Fire Station',color:'#dc2626',icon:'fas fa-fire-extinguisher'},
  ambulance:   {emoji:'🚑',label:'Ambulance',   color:'#ef4444',icon:'fas fa-truck-medical'},
};

const AC_LIST = Object.entries(CAT).map(([k,v])=>({cat:k,text:v.label,icon:v.icon}));

/* ── Busy level config ─────────────────────────── */
const BUSY = {
  low:  {label:'Not Busy',    dot:'🟢', cls:'low'},
  med:  {label:'Moderate',    dot:'🟡', cls:'med'},
  high: {label:'Very Busy',   dot:'🔴', cls:'high'},
};

/* deterministic busy level per service id */
function getBusy(id) {
  const h = Math.abs(id.split('').reduce((a,c)=>a*31+c.charCodeAt(0),0));
  const r = h % 10;
  if (r < 4) return BUSY.low;
  if (r < 7) return BUSY.med;
  return BUSY.high;
}

/* pseudo review count */
function getReviews(id) {
  return 20 + (Math.abs(id.split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % 480);
}

/* ── State ─────────────────────────────────────── */
const S = {
  lat:null, lng:null,
  cat:null, osmTag:null,
  all:[], filtered:[],
  favs:    JSON.parse(localStorage.getItem('nf_favs')    || '[]'),
  recent:  JSON.parse(localStorage.getItem('nf_recent')  || '[]'),
  compare: [],
  map:null, markers:[], userMarker:null,
  isDark:true, mapFull:false,
  ctrl:null,
};

/* ── DOM ───────────────────────────────────────── */
const D = id => document.getElementById(id);
const EL = {
  splash:       D('splash'),      splashBar:D('splashBar'),   splashMsg:D('splashMsg'),
  app:          D('app'),
  navbar:       D('navbar'),
  navSearch:    D('navSearchInput'), navClear:D('navClear'),  navAc:D('navAcDrop'),
  favNavBtn:    D('favNavBtn'),    favBadge:D('favBadge'),
  cmpNavBtn:    D('compareNavBtn'),cmpBadge:D('compareBadge'),
  themeBtn:     D('themeBtn'),     themeIco:D('themeIco'),
  heroSearch:   D('heroSearchInput'), heroLoc:D('heroLocBtn'), heroGo:D('heroGoBtn'),
  heroAc:       D('heroAcDrop'),   heroArrow:D('heroArrow'),
  recentSec:    D('recentSec'),    recentGrid:D('recentGrid'), recentClear:D('recentClear'),
  recSec:       D('recommendSec'), recGrid:D('recommendGrid'),
  catGroups:    D('catGroups'),
  resultsSec:   D('resultsSec'),
  fbBack:       D('fbBack'),       fbEmoji:D('fbEmoji'),     fbName:D('fbName'),  fbCount:D('fbCount'),
  fRating:      D('fRating'),      fDist:D('fDist'),         fBusy:D('fBusy'),   fReset:D('fReset'),
  stLoad:       D('stLoad'),       stLoadSub:D('stLoadSub'),
  stEmpty:      D('stEmpty'),      stErr:D('stErr'),         stErrMsg:D('stErrMsg'),
  btnRetry:     D('btnRetry'),     btnErrRetry:D('btnErrRetry'),
  cardsGrid:    D('cardsGrid'),
  mfCenter:     D('mfCenter'),     mfExpand:D('mfExpand'),
  compareBar:   D('compareBar'),   cbLabel:D('cbLabel'),     cbSlots:D('cbSlots'),
  cbGo:         D('cbGo'),         cbClear:D('cbClear'),
  compareOv:    D('compareOv'),    cmpBody:D('cmpBody'),     cmpClose:D('cmpClose'),
  favOv:        D('favOv'),        favBody:D('favBody'),     favClose:D('favClose'),
  toast:        D('toast'),
};

/* ════════════════════════════════════════════════
   SPLASH  (3 seconds)
   ════════════════════════════════════════════════ */
const STEPS = [
  {p:15, m:'Initialising NearFind Pro…'},
  {p:32, m:'Checking location services…'},
  {p:52, m:'Loading map engine…'},
  {p:72, m:'Preparing service data…'},
  {p:90, m:'Almost ready…'},
  {p:100,m:'Welcome! 🎉'},
];

function runSplash() {
  let i = 0;
  const iv = 3000 / STEPS.length;
  function tick() {
    if (i >= STEPS.length) return;
    EL.splashBar.style.width = STEPS[i].p + '%';
    EL.splashMsg.textContent = STEPS[i].m;
    i++;
    if (i < STEPS.length) setTimeout(tick, iv);
    else setTimeout(() => {
      EL.splash.classList.add('out');
      EL.app.classList.add('vis');
      setTimeout(() => EL.splash.style.display = 'none', 750);
    }, 400);
  }
  tick();
}

/* ════════════════════════════════════════════════
   UTILS
   ════════════════════════════════════════════════ */
function haversine(a,b,c,d){
  const R=6371000,p1=a*Math.PI/180,p2=c*Math.PI/180,
        dp=(c-a)*Math.PI/180,dl=(d-b)*Math.PI/180,
        x=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function fmtD(m){ return m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(2)} km`}
function starStr(r){ return '★'.repeat(Math.floor(r))+'☆'.repeat(5-Math.floor(r)) }
function pseudoRating(id){
  const v=Math.abs(id.split('').reduce((a,c)=>a*17+c.charCodeAt(0),7));
  return Math.min(5,Math.max(2.5,parseFloat((3+(v%20)/10).toFixed(1))));
}

let toastT;
function toast(msg,dur=3000){
  clearTimeout(toastT);
  EL.toast.textContent=msg;
  EL.toast.classList.add('show');
  toastT=setTimeout(()=>EL.toast.classList.remove('show'),dur);
}
window.toast = toast;

/* ════════════════════════════════════════════════
   MAP
   ════════════════════════════════════════════════ */
function initMap(lat,lng){
  if(S.map){S.map.setView([lat,lng],15);return}
  S.map=L.map('map',{zoomControl:false,attributionControl:false}).setView([lat,lng],15);
  applyTiles();
  L.control.zoom({position:'bottomright'}).addTo(S.map);
  L.control.attribution({prefix:false}).addAttribution('© <a href="https://openstreetmap.org">OSM</a>').addTo(S.map);
}

function applyTiles(){
  if(!S.map)return;
  S.map.eachLayer(l=>{if(l._url)S.map.removeLayer(l)});
  L.tileLayer(
    S.isDark
      ?'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      :'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {maxZoom:19,subdomains:'abcd'}
  ).addTo(S.map);
}

function setUserPin(lat,lng){
  if(S.userMarker){S.userMarker.setLatLng([lat,lng]);return}
  const ico=L.divIcon({className:'',html:'<div class="user-dot"></div>',iconSize:[16,16],iconAnchor:[8,8]});
  S.userMarker=L.marker([lat,lng],{icon:ico,zIndexOffset:9999}).addTo(S.map)
    .bindPopup('<div class="map-popup"><div class="mp-name">📍 You are here</div></div>');
}

function clearMarkers(){S.markers.forEach(m=>S.map.removeLayer(m));S.markers=[]}

function addMarkers(services){
  clearMarkers();
  services.forEach(svc=>{
    const m=CAT[svc.cat];
    const ico=L.divIcon({
      className:'',
      html:`<div style="background:${m.color};color:#fff;width:38px;height:38px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 4px 14px rgba(0,0,0,.35);border:2.5px solid rgba(255,255,255,.75);font-size:16px"><span style="transform:rotate(45deg)">${m.emoji}</span></div>`,
      iconSize:[38,38],iconAnchor:[19,38],popupAnchor:[0,-40],
    });
    const popup=L.popup({closeButton:true}).setContent(`
      <div class="map-popup">
        <div class="mp-name">${m.emoji} ${svc.name}</div>
        <div class="mp-stars">${starStr(svc.rating)} ${svc.rating.toFixed(1)} (${svc.reviews} reviews)</div>
        <div class="mp-addr"><i class="fas fa-map-marker-alt" style="color:var(--acc);margin-right:4px;font-size:10px"></i>${svc.address}</div>
        <div class="mp-dist"><i class="fas fa-route" style="margin-right:4px"></i>${fmtD(svc.dist)} away</div>
        <div style="margin-bottom:10px"><span class="cmp-busy ${svc.busy.cls}">${svc.busy.dot} ${svc.busy.label}</span></div>
        <a class="mp-btn" href="https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lng}" target="_blank" rel="noopener"><i class="fas fa-diamond-turn-right"></i> Directions</a>
      </div>`);
    const marker=L.marker([svc.lat,svc.lng],{icon:ico}).bindPopup(popup).addTo(S.map);
    marker.on('click',()=>{
      document.querySelectorAll('.svc-card').forEach(c=>c.classList.remove('highlighted'));
      const card=document.getElementById('card-'+svc.id);
      if(card){card.classList.add('highlighted');card.scrollIntoView({behavior:'smooth',block:'nearest'});setTimeout(()=>card.classList.remove('highlighted'),2500)}
    });
    S.markers.push(marker);
  });
}

/* ════════════════════════════════════════════════
   OVERPASS API — LIVE DATA
   ════════════════════════════════════════════════ */
async function fetchOverpass(lat,lng,tag,radius=5000){
  if(S.ctrl)S.ctrl.abort();
  S.ctrl=new AbortController();
  const [k,v]=tag.split('=');
  const q=`[out:json][timeout:25];(node["${k}"="${v}"](around:${radius},${lat},${lng});way["${k}"="${v}"](around:${radius},${lat},${lng}););out center tags 60;`;
  const r=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:q,signal:S.ctrl.signal});
  if(!r.ok)throw new Error(`Overpass error ${r.status}`);
  return (await r.json()).elements||[];
}

function parseEls(els,cat,uLat,uLng){
  return els.map((el,i)=>{
    const lat=el.lat??el.center?.lat, lng=el.lon??el.center?.lon;
    if(!lat||!lng)return null;
    const t=el.tags||{};
    const name=t.name||t['name:en']||`${CAT[cat].label} ${i+1}`;
    const addr=[t['addr:housenumber'],t['addr:street'],t['addr:suburb']||t['addr:city']].filter(Boolean).join(', ')||t['addr:full']||'See on map';
    const id=`${cat}_${el.id}`;
    return {
      id, cat, name, lat, lng,
      dist:     haversine(uLat,uLng,lat,lng),
      address:  addr,
      rating:   pseudoRating(id),
      reviews:  getReviews(id),
      busy:     getBusy(id),
      phone:    t.phone||t['contact:phone']||'',
      hours:    t.opening_hours||'',
    };
  }).filter(Boolean).sort((a,b)=>a.dist-b.dist);
}

/* ════════════════════════════════════════════════
   LOAD SERVICES
   ════════════════════════════════════════════════ */
async function loadServices(cat,osmTag){
  S.cat=cat; S.osmTag=osmTag;
  const m=CAT[cat];
  EL.fbEmoji.textContent=m.emoji; EL.fbName.textContent=m.label; EL.fbCount.textContent='Loading…';
  showState('load'); EL.stLoadSub.textContent=`Querying OpenStreetMap for ${m.label}s…`;
  EL.resultsSec.classList.add('vis');
  document.body.style.overflow='hidden';
  setTimeout(()=>S.map?.invalidateSize(),350);
  try {
    const els=await fetchOverpass(S.lat,S.lng,osmTag,5000);
    S.all=parseEls(els,cat,S.lat,S.lng);
    applyFilters();
    renderRecommendations();
  } catch(e){
    if(e.name==='AbortError')return;
    console.error(e); showState('err'); EL.stErrMsg.textContent=e.message||'Network error.';
  }
}

/* ── Filters ───────────────────────────────────── */
function applyFilters(){
  const minR=parseFloat(EL.fRating.value)||0;
  const maxD=parseFloat(EL.fDist.value)||9999;
  const busyF=EL.fBusy.value;
  const q=(EL.navSearch.value||EL.heroSearch.value).toLowerCase().trim();

  S.filtered=S.all.filter(s=>
    s.rating>=minR &&
    s.dist<=maxD &&
    (busyF==='all'||s.busy.cls===busyF) &&
    (!q||s.name.toLowerCase().includes(q)||s.address.toLowerCase().includes(q))
  );

  EL.fbCount.textContent=`${S.filtered.length} found`;
  if(!S.filtered.length){showState(S.all.length?'empty':'empty');addMarkers([]);return}
  showState('grid');
  renderCards(S.filtered);
  addMarkers(S.filtered);
}

function showState(s){
  EL.stLoad.style.display  = s==='load'  ?'flex':'none';
  EL.stEmpty.style.display = s==='empty' ?'flex':'none';
  EL.stErr.style.display   = s==='err'   ?'flex':'none';
  EL.cardsGrid.style.display= s==='grid'  ?'flex':'none';
  if(s==='grid')EL.cardsGrid.style.flexDirection='column';
}

/* ════════════════════════════════════════════════
   SERVICE CARD
   ════════════════════════════════════════════════ */
function renderCards(services){
  EL.cardsGrid.innerHTML='';
  // Reset scroll to top so first card is always fully visible
  const col = document.getElementById('cardsCol');
  if(col) col.scrollTop = 0;
  const frag=document.createDocumentFragment();
  services.forEach((s,i)=>frag.appendChild(buildCard(s,i)));
  EL.cardsGrid.appendChild(frag);
}

function buildCard(svc,idx){
  const m=CAT[svc.cat];
  const isFav=S.favs.some(f=>f.id===svc.id);
  const inCmp=S.compare.some(c=>c.id===svc.id);

  const div=document.createElement('div');
  div.className='svc-card'+(inCmp?' in-compare':'');
  div.id='card-'+svc.id;
  div.style.animationDelay=Math.min(idx*55,500)+'ms';

  div.innerHTML=`
    <div class="card-bar" style="background:${m.color}"></div>
    <div class="card-img">
      <div class="card-img-bg" style="background:linear-gradient(135deg,${m.color}22 0%,${m.color}08 100%)"></div>
      <div class="card-img-emoji">${m.emoji}</div>
      <div class="card-img-badge">${m.label}</div>
      <div class="card-busy ${svc.busy.cls}">
        <span class="busy-dot"></span>${svc.busy.label}
      </div>
    </div>
    <div class="card-body">
      <div class="card-tag">${m.emoji} ${m.label}</div>
      <div class="card-name" title="${svc.name}">${svc.name}</div>
      <div class="card-row">
        <span class="card-stars">${starStr(svc.rating)}</span>
        <span class="card-rv">${svc.rating.toFixed(1)}</span>
        <span class="card-reviews">(${svc.reviews} reviews)</span>
        <span class="card-dist-val"><i class="fas fa-location-arrow"></i>${fmtD(svc.dist)}</span>
      </div>
      <div class="card-addr-row">
        <i class="fas fa-map-marker-alt"></i>
        <span>${svc.address}</span>
      </div>
      ${svc.hours?`<div class="card-open"><i class="fas fa-clock"></i>${svc.hours}</div>`:''}
    </div>
    <div class="card-actions">
      ${svc.phone
        ?`<a class="ca-btn ca-btn-call" href="tel:${svc.phone}"><i class="fas fa-phone"></i> Call</a>`
        :`<button class="ca-btn ca-btn-call" onclick="toast('📞 Phone not listed on OSM')"><i class="fas fa-phone"></i> Call</button>`
      }
      <a class="ca-btn ca-btn-dir" href="https://www.google.com/maps/dir/?api=1&destination=${svc.lat},${svc.lng}" target="_blank" rel="noopener">
        <i class="fas fa-diamond-turn-right"></i> Directions
      </a>
    </div>
    <div class="card-actions-bottom">
      <button class="ca-btn ca-btn-fav ${isFav?'on':''}" data-id="${svc.id}">
        <i class="fas fa-heart"></i> ${isFav?'Saved':'Favourite'}
      </button>
      <button class="ca-btn ca-btn-cmp ${inCmp?'on':''}" data-id="${svc.id}">
        <i class="fas fa-code-compare"></i> ${inCmp?'Added':'Compare'}
      </button>
    </div>`;

  // Click card → pan map + save recent
  div.addEventListener('click',e=>{
    if(e.target.closest('.ca-btn'))return;
    saveRecent(svc);
    if(S.map){S.map.setView([svc.lat,svc.lng],17,{animate:true});S.markers[S.filtered.indexOf(svc)]?.openPopup()}
  });

  // Favourite
  div.querySelector('.ca-btn-fav').addEventListener('click',e=>{
    e.stopPropagation();
    toggleFav(svc);
    const btn=e.currentTarget;
    const on=S.favs.some(f=>f.id===svc.id);
    btn.classList.toggle('on',on);
    btn.innerHTML=`<i class="fas fa-heart"></i> ${on?'Saved':'Favourite'}`;
  });

  // Compare
  div.querySelector('.ca-btn-cmp').addEventListener('click',e=>{
    e.stopPropagation();
    toggleCompare(svc);
    renderCards(S.filtered);
  });

  return div;
}

/* ════════════════════════════════════════════════
   RECENTLY VIEWED
   ════════════════════════════════════════════════ */
function saveRecent(svc){
  S.recent=S.recent.filter(r=>r.id!==svc.id);
  S.recent.unshift(svc);
  S.recent=S.recent.slice(0,8);
  localStorage.setItem('nf_recent',JSON.stringify(S.recent));
  renderRecent();
}

function renderRecent(){
  if(!S.recent.length){EL.recentSec.style.display='none';return}
  EL.recentSec.style.display='block';
  EL.recentGrid.innerHTML='';
  const frag=document.createDocumentFragment();
  S.recent.forEach((svc,i)=>{
    const m=CAT[svc.cat]||{emoji:'📌',color:'#6b7280'};
    const mc=buildMiniCard(svc,m,i,false);
    frag.appendChild(mc);
  });
  EL.recentGrid.appendChild(frag);
}

/* ════════════════════════════════════════════════
   SMART RECOMMENDATIONS
   ════════════════════════════════════════════════ */
function renderRecommendations(){
  if(!S.all.length){EL.recSec.style.display='none';return}
  // Pick top 6: score = rating*0.6 + (1 - dist/5000)*0.4
  const scored=[...S.all].map(s=>({...s,score:s.rating*0.6+(1-Math.min(s.dist,5000)/5000)*0.4}))
    .sort((a,b)=>b.score-a.score).slice(0,6);
  EL.recSec.style.display='block';
  EL.recGrid.innerHTML='';
  const frag=document.createDocumentFragment();
  scored.forEach((svc,i)=>{
    const m=CAT[svc.cat]||{emoji:'📌',color:'#6b7280'};
    const mc=buildMiniCard(svc,m,i,true);
    frag.appendChild(mc);
  });
  EL.recGrid.appendChild(frag);
}

function buildMiniCard(svc,m,idx,isRec){
  const div=document.createElement('div');
  div.className='mini-card';
  div.style.setProperty('--bar-color',m.color);
  div.style.cssText+=`;animation-delay:${idx*60}ms`;
  div.querySelector?.('::before');  // trigger style
  div.innerHTML=`
    <style>.mini-card:nth-child(${idx+1})::before{background:${m.color}}</style>
    <div class="mc-top">
      <span class="mc-emo">${m.emoji}</span>
      <span class="mc-busy ${svc.busy.cls}">${svc.busy.dot} ${svc.busy.label}</span>
    </div>
    <div class="mc-name" title="${svc.name}">${svc.name}</div>
    <div class="mc-meta">
      <span class="mc-stars">${starStr(svc.rating)}</span>
      <span style="font-size:12px;font-weight:600;color:var(--txt)">${svc.rating.toFixed(1)}</span>
      <span class="mc-dist">${fmtD(svc.dist)}</span>
    </div>
    <div class="mc-addr">${svc.address}</div>
    ${isRec?'<div class="rec-badge">⭐ Top Pick</div>':''}`;

  div.addEventListener('click',()=>{
    saveRecent(svc);
    if(S.map){S.map.setView([svc.lat,svc.lng],17,{animate:true})}
    EL.resultsSec.scrollIntoView({behavior:'smooth'});
  });
  return div;
}

/* ════════════════════════════════════════════════
   COMPARE
   ════════════════════════════════════════════════ */
function toggleCompare(svc){
  const i=S.compare.findIndex(c=>c.id===svc.id);
  if(i!==-1){
    S.compare.splice(i,1);
    toast(`Removed from compare: ${svc.name}`);
  } else {
    if(S.compare.length>=2){toast('⚠️ Max 2 services can be compared at once. Remove one first.');return}
    S.compare.push(svc);
    toast(`➕ Added to compare: ${svc.name}`);
  }
  updateCompareBar();
}

function updateCompareBar(){
  const n=S.compare.length;
  EL.cmpBadge.textContent=n;
  EL.cmpNavBtn.style.display=n>0?'flex':'none';

  if(n===0){
    EL.compareBar.classList.remove('show');
    return;
  }
  EL.compareBar.classList.add('show');
  EL.cbLabel.textContent=n===1?'Select 1 more to compare':'Ready to compare!';
  EL.cbGo.disabled=n<2;

  EL.cbSlots.innerHTML=S.compare.map(svc=>`
    <div class="cb-slot">
      <span class="cb-slot-emo">${CAT[svc.cat].emoji}</span>
      <span class="cb-slot-name">${svc.name}</span>
      <button class="cb-rm" data-id="${svc.id}" title="Remove">✕</button>
    </div>`).join('');

  EL.cbSlots.querySelectorAll('.cb-rm').forEach(btn=>{
    btn.addEventListener('click',e=>{
      e.stopPropagation();
      const svc=S.compare.find(c=>c.id===btn.dataset.id);
      if(svc){toggleCompare(svc);renderCards(S.filtered)}
    });
  });
}

function openCompareModal(){
  if(S.compare.length<2)return;
  const [A,B]=S.compare;
  const mA=CAT[A.cat], mB=CAT[B.cat];

  // Determine winners
  const rWin = A.rating >= B.rating;
  const dWin = A.dist   <= B.dist;
  const rvWin= A.reviews>= B.reviews;

  EL.cmpBody.innerHTML=`
    <div class="cmp-cols">
      <div class="cmp-col">
        <div class="cmp-col-head">
          <div class="cmp-col-emo">${mA.emoji}</div>
          <div class="cmp-col-name">${A.name}</div>
          <span class="cmp-col-cat">${mA.label}</span>
        </div>
        <div class="cmp-rows">
          <div class="cmp-row"><span class="cmp-row-label">Rating</span><span class="cmp-row-val ${rWin?'winner':'loser'}">${starStr(A.rating)} ${A.rating.toFixed(1)}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Distance</span><span class="cmp-row-val ${dWin?'winner':'loser'}">${fmtD(A.dist)}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Reviews</span><span class="cmp-row-val ${rvWin?'winner':'loser'}">${A.reviews}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Busy Status</span><span class="cmp-busy ${A.busy.cls}">${A.busy.dot} ${A.busy.label}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Address</span><span class="cmp-row-val" style="font-size:12px;font-weight:500;white-space:normal">${A.address}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Hours</span><span class="cmp-row-val" style="font-size:12px;font-weight:500">${A.hours||'Not listed'}</span></div>
        </div>
      </div>

      <div class="cmp-vs">VS</div>

      <div class="cmp-col">
        <div class="cmp-col-head">
          <div class="cmp-col-emo">${mB.emoji}</div>
          <div class="cmp-col-name">${B.name}</div>
          <span class="cmp-col-cat">${mB.label}</span>
        </div>
        <div class="cmp-rows">
          <div class="cmp-row"><span class="cmp-row-label">Rating</span><span class="cmp-row-val ${!rWin?'winner':'loser'}">${starStr(B.rating)} ${B.rating.toFixed(1)}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Distance</span><span class="cmp-row-val ${!dWin?'winner':'loser'}">${fmtD(B.dist)}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Reviews</span><span class="cmp-row-val ${!rvWin?'winner':'loser'}">${B.reviews}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Busy Status</span><span class="cmp-busy ${B.busy.cls}">${B.busy.dot} ${B.busy.label}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Address</span><span class="cmp-row-val" style="font-size:12px;font-weight:500;white-space:normal">${B.address}</span></div>
          <div class="cmp-row"><span class="cmp-row-label">Hours</span><span class="cmp-row-val" style="font-size:12px;font-weight:500">${B.hours||'Not listed'}</span></div>
        </div>
      </div>
    </div>

    <div class="cmp-verdict">
      <div class="cmp-verdict-title">🏆 Our Pick</div>
      <div class="cmp-verdict-val">
        ${(()=>{
          let scoreA=0,scoreB=0;
          if(A.rating>B.rating)scoreA++;else scoreB++;
          if(A.dist<B.dist)scoreA++;else scoreB++;
          if(A.reviews>B.reviews)scoreA++;else scoreB++;
          if(A.busy.cls==='low')scoreA++;else if(B.busy.cls==='low')scoreB++;
          return scoreA>scoreB
            ?`${mA.emoji} ${A.name} wins! (Better overall score)`
            :scoreB>scoreA
            ?`${mB.emoji} ${B.name} wins! (Better overall score)`
            :'🤝 It\'s a tie! Both are equally good.';
        })()}
      </div>
    </div>`;

  EL.compareOv.classList.add('open');
}

/* ════════════════════════════════════════════════
   FAVOURITES
   ════════════════════════════════════════════════ */
function toggleFav(svc){
  const i=S.favs.findIndex(f=>f.id===svc.id);
  if(i===-1){S.favs.push(svc);toast(`❤️ Saved: ${svc.name}`)}
  else{S.favs.splice(i,1);toast(`🗑️ Removed: ${svc.name}`)}
  localStorage.setItem('nf_favs',JSON.stringify(S.favs));
  EL.favBadge.textContent=S.favs.length;
}

function renderFavModal(){
  EL.favBadge.textContent=S.favs.length;
  if(!S.favs.length){
    EL.favBody.innerHTML=`<div class="fav-empty"><div class="fav-empty-ico">💝</div><p>No favourites yet!<br/>Tap ❤️ on any card to save it.</p></div>`;
    return;
  }
  EL.favBody.innerHTML=S.favs.map(svc=>`
    <div class="fav-row">
      <div class="fav-emo">${CAT[svc.cat]?.emoji||'📌'}</div>
      <div class="fav-info">
        <div class="fav-name">${svc.name}</div>
        <div class="fav-sub">${CAT[svc.cat]?.label||svc.cat} · ${fmtD(svc.dist)} · <span class="mc-busy ${svc.busy.cls}" style="font-size:11px">${svc.busy.dot} ${svc.busy.label}</span></div>
      </div>
      <button class="fav-del" data-id="${svc.id}" title="Remove"><i class="fas fa-trash-alt"></i></button>
    </div>`).join('');
  EL.favBody.querySelectorAll('.fav-del').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const svc=S.favs.find(f=>f.id===btn.dataset.id);
      if(svc){toggleFav(svc);renderFavModal();renderCards(S.filtered)}
    });
  });
}

/* ════════════════════════════════════════════════
   GEOLOCATION
   ════════════════════════════════════════════════ */
function getLocation(cb){
  if(!navigator.geolocation){toast('⚠️ Geolocation not supported');useFallback(cb);return}
  EL.heroLoc.classList.add('locating');
  EL.heroLoc.innerHTML='<i class="fas fa-spinner fa-spin"></i><span>Locating…</span>';
  navigator.geolocation.getCurrentPosition(
    pos=>{
      S.lat=pos.coords.latitude; S.lng=pos.coords.longitude;
      EL.heroLoc.classList.remove('locating');
      EL.heroLoc.innerHTML='<i class="fas fa-check"></i><span>Located!</span>';
      setTimeout(()=>{EL.heroLoc.innerHTML='<i class="fas fa-crosshairs"></i><span>My Location</span>'},2500);
      toast('📍 Live location detected!');
      initMap(S.lat,S.lng); setUserPin(S.lat,S.lng);
      if(cb)cb();
    },
    err=>{
      console.warn(err); EL.heroLoc.classList.remove('locating');
      EL.heroLoc.innerHTML='<i class="fas fa-crosshairs"></i><span>My Location</span>';
      toast('📍 Using default location (Meerut, UP)');
      useFallback(cb);
    },
    {enableHighAccuracy:true,timeout:10000,maximumAge:0}
  );
}

function useFallback(cb){
  S.lat=28.9845; S.lng=77.7064;
  initMap(S.lat,S.lng); setUserPin(S.lat,S.lng);
  if(cb)cb();
}

/* ════════════════════════════════════════════════
   AUTOCOMPLETE
   ════════════════════════════════════════════════ */
function buildAC(input,drop){
  const q=input.value.toLowerCase().trim();
  if(!q){drop.classList.remove('open');return}
  const hits=AC_LIST.filter(d=>d.text.toLowerCase().includes(q)||d.cat.includes(q)).slice(0,8);
  if(!hits.length){drop.classList.remove('open');return}
  drop.innerHTML=hits.map(h=>`<li class="ac-item" data-cat="${h.cat}"><i class="${h.icon}"></i>${h.text}</li>`).join('');
  drop.querySelectorAll('.ac-item').forEach(item=>{
    item.addEventListener('click',()=>{
      input.value=item.textContent.trim(); drop.classList.remove('open');
      EL.heroSearch.value=EL.navSearch.value=input.value;
      doSearch(item.dataset.cat);
    });
  });
  drop.classList.add('open');
}

/* ════════════════════════════════════════════════
   SEARCH HELPERS
   ════════════════════════════════════════════════ */
function doSearch(cat){
  const btn=document.querySelector(`.cc[data-cat="${cat}"]`);
  const tag=btn?.dataset.osm||fallbackTag(cat);
  document.querySelectorAll('.cc').forEach(c=>c.classList.remove('active'));
  if(btn)btn.classList.add('active');
  if(!S.lat)getLocation(()=>loadServices(cat,tag));
  else loadServices(cat,tag);
}

function handleTextSearch(q){
  if(!q)return;
  const ql=q.toLowerCase();
  const m=AC_LIST.find(d=>d.text.toLowerCase().includes(ql)||d.cat.includes(ql)||ql.includes(d.cat));
  if(m)doSearch(m.cat); else applyFilters();
}

function fallbackTag(cat){
  const mp={hospital:'amenity=hospital',restaurant:'amenity=restaurant',cafe:'amenity=cafe',pharmacy:'amenity=pharmacy',mechanic:'shop=car_repair',grocery:'shop=supermarket',salon:'shop=hairdresser',atm:'amenity=atm',bank:'amenity=bank',dentist:'amenity=dentist',clinic:'amenity=clinic',police:'amenity=police',fire:'amenity=fire_station',bakery:'shop=bakery',fast_food:'amenity=fast_food',petrol_pump:'amenity=fuel',car_wash:'amenity=car_wash',laundry:'shop=laundry',plumber:'craft=plumber',electrician:'craft=electrician',carpenter:'craft=carpenter',painter:'craft=painter',ac_repair:'shop=appliance'};
  return mp[cat]||`amenity=${cat}`;
}

/* ════════════════════════════════════════════════
   THEME
   ════════════════════════════════════════════════ */
function applyTheme(dark){
  S.isDark=dark;
  document.documentElement.dataset.theme=dark?'dark':'light';
  EL.themeIco.className=dark?'fas fa-moon':'fas fa-sun';
  localStorage.setItem('nf_theme',dark?'dark':'light');
  applyTiles();
}

/* ════════════════════════════════════════════════
   MAP FULLSCREEN
   ════════════════════════════════════════════════ */
function toggleMapFull(){
  S.mapFull=!S.mapFull;
  const mc=document.getElementById('mapCol');
  if(S.mapFull){mc.style.cssText='position:fixed;inset:0;z-index:500;height:100vh';EL.mfExpand.innerHTML='<i class="fas fa-compress-alt"></i>';toast('Map fullscreen — press to collapse')}
  else{mc.style.cssText='';EL.mfExpand.innerHTML='<i class="fas fa-expand-alt"></i>'}
  setTimeout(()=>S.map?.invalidateSize(),130);
}

/* ════════════════════════════════════════════════
   EVENT BINDING
   ════════════════════════════════════════════════ */
function bind(){
  /* Hero search */
  EL.heroSearch.addEventListener('input',e=>buildAC(e.target,EL.heroAc));
  EL.heroSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){EL.heroAc.classList.remove('open');handleTextSearch(e.target.value)}if(e.key==='Escape')EL.heroAc.classList.remove('open')});
  EL.heroLoc.addEventListener('click',()=>getLocation(()=>{if(S.cat)loadServices(S.cat,S.osmTag);else toast('📍 Location set! Pick a category below.')}));
  EL.heroGo.addEventListener('click',()=>{const q=EL.heroSearch.value.trim();if(q)handleTextSearch(q);else document.getElementById('catSec').scrollIntoView({behavior:'smooth'})});

  /* Nav search */
  EL.navSearch.addEventListener('input',e=>{EL.navClear.classList.toggle('show',!!e.target.value);buildAC(e.target,EL.navAc);if(e.target.value.length>1)applyFilters()});
  EL.navSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){EL.navAc.classList.remove('open');handleTextSearch(e.target.value)}if(e.key==='Escape')EL.navAc.classList.remove('open')});
  EL.navClear.addEventListener('click',()=>{EL.navSearch.value='';EL.navClear.classList.remove('show');EL.navAc.classList.remove('open');applyFilters()});

  /* Categories */
  EL.catGroups.addEventListener('click',e=>{
    const cc=e.target.closest('.cc');if(!cc)return;
    document.querySelectorAll('.cc').forEach(c=>c.classList.remove('active'));
    cc.classList.add('active');
    const cat=cc.dataset.cat,tag=cc.dataset.osm;
    if(!S.lat)getLocation(()=>loadServices(cat,tag));
    else loadServices(cat,tag);
  });

  /* Filters */
  EL.fRating.addEventListener('change',applyFilters);
  EL.fDist.addEventListener('change',applyFilters);
  EL.fBusy.addEventListener('change',applyFilters);
  EL.fReset.addEventListener('click',()=>{EL.fRating.value='0';EL.fDist.value='9999';EL.fBusy.value='all';EL.navSearch.value='';EL.heroSearch.value='';EL.navClear.classList.remove('show');applyFilters()});

  /* Back */
  EL.fbBack.addEventListener('click',()=>{EL.resultsSec.classList.remove('vis');document.body.style.overflow='';document.querySelectorAll('.cc').forEach(c=>c.classList.remove('active'));window.scrollTo({top:0,behavior:'smooth'})});

  /* Retry */
  EL.btnRetry.addEventListener('click',()=>{if(S.cat)loadServices(S.cat,S.osmTag)});
  EL.btnErrRetry.addEventListener('click',()=>{if(S.cat)loadServices(S.cat,S.osmTag)});

  /* Map */
  EL.mfCenter.addEventListener('click',()=>{if(S.map&&S.lat)S.map.setView([S.lat,S.lng],15,{animate:true})});
  EL.mfExpand.addEventListener('click',toggleMapFull);

  /* Compare bar */
  EL.cbGo.addEventListener('click',openCompareModal);
  EL.cbClear.addEventListener('click',()=>{S.compare=[];updateCompareBar();renderCards(S.filtered)});
  EL.cmpNavBtn.addEventListener('click',()=>{if(S.compare.length===2)openCompareModal();else toast('Select 2 services to compare')});
  EL.cmpClose.addEventListener('click',()=>EL.compareOv.classList.remove('open'));
  EL.compareOv.addEventListener('click',e=>{if(e.target===EL.compareOv)EL.compareOv.classList.remove('open')});

  /* Favourites */
  EL.favNavBtn.addEventListener('click',()=>{renderFavModal();EL.favOv.classList.add('open')});
  EL.favClose.addEventListener('click',()=>EL.favOv.classList.remove('open'));
  EL.favOv.addEventListener('click',e=>{if(e.target===EL.favOv)EL.favOv.classList.remove('open')});

  /* Recent clear */
  EL.recentClear.addEventListener('click',()=>{S.recent=[];localStorage.removeItem('nf_recent');EL.recentSec.style.display='none';toast('🗑️ Recently viewed cleared')});

  /* Theme */
  EL.themeBtn.addEventListener('click',()=>applyTheme(!S.isDark));

  /* Hero arrow */
  EL.heroArrow?.addEventListener('click',()=>document.getElementById('catSec').scrollIntoView({behavior:'smooth'}));

  /* Close dropdowns on outside click */
  document.addEventListener('click',e=>{
    if(!e.target.closest('.hero-search-shell'))EL.heroAc.classList.remove('open');
    if(!e.target.closest('.nav-search-wrap'))EL.navAc.classList.remove('open');
  });

  /* ESC */
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      EL.compareOv.classList.remove('open');
      EL.favOv.classList.remove('open');
      EL.heroAc.classList.remove('open');
      EL.navAc.classList.remove('open');
      if(S.mapFull)toggleMapFull();
    }
  });

  /* Navbar scroll */
  window.addEventListener('scroll',()=>{EL.navbar.style.boxShadow=window.scrollY>40?'0 2px 24px rgba(0,0,0,.35)':'none'},{passive:true});
}

/* ════════════════════════════════════════════════
   INIT
   ════════════════════════════════════════════════ */
function init(){
  const saved=localStorage.getItem('nf_theme');
  applyTheme(saved?saved==='dark':true);
  EL.favBadge.textContent=S.favs.length;
  bind();
  runSplash();
  renderRecent();
  // Silent location pre-warm
  setTimeout(()=>{
    if(!S.lat&&navigator.geolocation){
      navigator.geolocation.getCurrentPosition(
        pos=>{S.lat=pos.coords.latitude;S.lng=pos.coords.longitude;initMap(S.lat,S.lng);setUserPin(S.lat,S.lng)},
        ()=>{ /* silent */ },
        {enableHighAccuracy:false,timeout:8000,maximumAge:30000}
      );
    }
  },1600);
}

document.addEventListener('DOMContentLoaded',init);
