/* APP.JS — versión robusta: asegura switchView definido temprano y tolera errores */

/* Definir una versión segura de switchView inmediatamente para evitar ReferenceError
   si el resto del script falla o tarda en cargar. */
window._currentView = window._currentView || 'visual';
window.switchView = function(v){
  try {
    const visualEl = document.getElementById('visualView');
    const configEl = document.getElementById('configView');
    if(visualEl) visualEl.style.display = (v === 'visual') ? 'block' : 'none';
    if(configEl) configEl.style.display = (v === 'config') ? 'block' : 'none';
    document.querySelectorAll('.tab').forEach(t => {
      t.classList.toggle('active', t.dataset.view === v);
    });
    window._currentView = v;
    // Intentar invocar funciones si ya están definidas
    if(v === 'config' && typeof populateConfigSelects === 'function') {
      try { populateConfigSelects(); } catch(e){ console.error('populateConfigSelects error', e); }
    }
    if(v === 'visual' && typeof createConnectors === 'function') {
      try { createConnectors(); } catch(e){ console.error('createConnectors error', e); }
    }
  } catch (err) {
    console.error('switchView error', err);
  }
};

/* ============================================
   Persistencia y datos iniciales
============================================ */
const STORAGE_KEY = 'planteles_v3';

const seed = [
  {
    id:'h1',
    title:'Hito 1 — Documentación Base',
    desc:'Actas, diagnósticos y recopilación inicial.',
    priority:'Alta',
    avance:42,
    subhitos:[
      { id:'h1s1', title:'Revisión de antecedentes', avance:60, docs:['Acta de comité técnico [approved]','Informe diagnóstico [approved]','Plano actualizado [pending]'] },
      { id:'h1s2', title:'Solicitud de documentos externos', avance:25, docs:['Certificado DOM [pending]','Certificado SAG [approved]'] }
    ]
  },
  {
    id:'h2',
    title:'Hito 2 — Permisos Municipales',
    desc:'Requisitos y presentación al municipio.',
    priority:'Media',
    avance:10,
    subhitos:[
      { id:'h2s1', title:'Revisión de normas', avance:10, docs:['Certificación sanitaria [pending]','Plan regulador [pending]'] },
      { id:'h2s2', title:'Presentación preliminar', avance:0, docs:['Carta de inicio [pending]','Presentación técnica [pending]'] }
    ]
  },
  {
    id:'h3',
    title:'Hito 3 — Regularización Ambiental',
    desc:'Estudios, mitigaciones y certificados.',
    priority:'Baja',
    avance:0,
    subhitos:[
      { id:'h3s1', title:'Estudios de impacto', avance:0, docs:['Estudio preliminar [pending]'] }
    ]
  }
];

function loadData(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  } catch(e){
    console.warn('loadData: localStorage parse failed, will use seed', e);
    localStorage.removeItem(STORAGE_KEY);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return JSON.parse(JSON.stringify(seed));
}

function saveData(data){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e){
    console.error('saveData error', e);
  }
}

/* ============================================
   Estado y utilidades
============================================ */
let data = loadData();
let currentOpen = null;

function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

/* ============================================
   Referencias DOM (se obtienen después del DOMContentLoaded)
============================================ */
let wrap, connectorLine, detalleArea, detalleInner, detalleTitulo, configNotice;

/* ============================================
   Render básico (visual)
============================================ */
function renderHitos(){
  if(!wrap) return console.warn('renderHitos: wrap no inicializado');
  wrap.querySelectorAll('.hito-card').forEach(n=>n.remove());
  const frag = document.createDocumentFragment();
  data.forEach(h => {
    const card = document.createElement('div');
    card.className = 'hito-card';
    card.dataset.id = h.id;
    card.onclick = ()=> openHito(h.id, card);
    card.innerHTML = `
      <div class="hito-title">${h.title}</div>
      <div class="hito-desc">${h.desc || ''}</div>
      <div class="hito-meta">
        <div class="badge">Avance ${h.avance || 0}%</div>
        <div class="muted" style="font-size:12px">${h.priority || ''}</div>
      </div>
    `;
    frag.appendChild(card);
  });
  wrap.appendChild(frag);
  // conectores en next frame
  window.requestAnimationFrame(()=> { if(typeof createConnectors === 'function') createConnectors(); });
}

function openHito(id, el){
  if(!detalleArea) return;
  document.querySelectorAll('.hito-card').forEach(c=>c.classList.remove('active'));
  if(currentOpen === id){
    detalleArea.style.display='none';
    currentOpen=null;
    return;
  }
  if(el) el.classList.add('active');
  currentOpen = id;
  const h = data.find(x=>x.id===id);
  if(!h) return;
  detalleTitulo.textContent = `Detalle — ${h.title}`;
  detalleInner.innerHTML = '';
  if(!h.subhitos || h.subhitos.length === 0){
    detalleInner.innerHTML = '<div class="subhito">Sin sub-hitos</div>';
  } else {
    h.subhitos.forEach(s=>{
      const box = document.createElement('div');
      box.className = 'subhito';
      const docs = (s.docs||[]).map(d=>`<li>${d}</li>`).join('');
      box.innerHTML = `
        <strong>${s.title}</strong>
        <div class="sub-prog">Avance: ${s.avance || 0}%</div>
        <ul class="docs">${docs}</ul>
      `;
      detalleInner.appendChild(box);
    });
  }
  detalleArea.style.display='block';
  if(el && el.scrollIntoView) el.scrollIntoView({behavior:'smooth',inline:'center'});
}

/* ============================================
   Conectores (optimizado)
============================================ */
function createConnectors(){
  if(!wrap || !connectorLine) return;
  document.querySelectorAll('.connector-dot').forEach(d=>d.remove());
  const cards = Array.from(wrap.querySelectorAll('.hito-card'));
  if(cards.length === 0){
    connectorLine.style.display='none';
    return;
  }
  const wrapRect = wrap.getBoundingClientRect();
  const firstRect = cards[0].getBoundingClientRect();
  const lineTop = (firstRect.top + firstRect.height/2) - wrapRect.top + wrap.scrollTop;
  connectorLine.style.top = `${lineTop}px`;
  connectorLine.style.display='block';
  const frag = document.createDocumentFragment();
  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const centerX = (rect.left + rect.right)/2 - wrapRect.left + wrap.scrollLeft;
    const dot = document.createElement('div');
    dot.className = 'connector-dot';
    dot.style.left = `${centerX}px`;
    dot.style.top = `${lineTop}px`;
    frag.appendChild(dot);
  });
  wrap.appendChild(frag);
}

/* ============================================
   CONFIG: populación de selects (si existen)
============================================ */
function populateConfigSelects(){
  try {
    const selectH = document.getElementById('selectHitoEdit');
    const selectSub = document.getElementById('selectSubEdit');
    const selectDoc = document.getElementById('selectDocEdit');
    if(!selectH || !selectSub || !selectDoc) return;
    selectH.innerHTML = '<option value="">-- seleccionar --</option>';
    data.forEach(h=>{
      const o = document.createElement('option');
      o.value = h.id; o.textContent = h.title;
      selectH.appendChild(o);
    });
    selectSub.innerHTML = '<option value="">-- seleccionar sub-hito --</option>';
    selectDoc.innerHTML = '<option value="">-- seleccionar documento --</option>';
  } catch(e){
    console.error('populateConfigSelects error', e);
  }
}

/* ============================================
   Export / Reset handlers (se expondrán en init)
============================================ */
function exportToFile(filename='planteles_export.json'){
  try{
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=filename;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('Exportado: ' + filename);
  } catch(e){ console.error('export error', e); }
}

function resetToSeed(){
  if(!confirm('¿Restaurar datos iniciales?')) return;
  data = JSON.parse(JSON.stringify(seed));
  saveData(data);
  renderHitos();
  populateConfigSelects();
  detalleArea && (detalleArea.style.display='none');
  showNotice('Datos restaurados');
}

/* ============================================
   UI util
============================================ */
function showNotice(msg, timeout=2500){
  if(!configNotice) { console.log('NOTICE:', msg); return; }
  configNotice.textContent = msg;
  configNotice.style.display = 'block';
  setTimeout(()=>{ configNotice.style.display='none'; configNotice.textContent=''; }, timeout);
}

/* ============================================
   Inicialización segura tras DOMContentLoaded
============================================ */
window.addEventListener('DOMContentLoaded', ()=> {
  try {
    // Obtener referencias DOM seguras
    wrap = document.getElementById('hitosWrap');
    connectorLine = document.getElementById('connectorLine');
    detalleArea = document.getElementById('detalleArea');
    detalleInner = document.getElementById('detalleInner');
    detalleTitulo = document.getElementById('detalleTitulo');
    configNotice = document.getElementById('configNotice');

    // Render inicial
    renderHitos();
    createConnectors();
    populateConfigSelects();

    // Enlazar botones si existen
    const btnSaveH = document.getElementById('btnSaveHito');
    if(btnSaveH) btnSaveH.addEventListener('click', ()=>{
      const hid = document.getElementById('selectHitoEdit')?.value;
      if(!hid) return alert('Selecciona un hito');
      const h = data.find(x=>x.id===hid); if(!h) return;
      h.desc = document.getElementById('editHitoDesc')?.value.trim() || '';
      const av = parseInt(document.getElementById('editHitoAvance')?.value||'0',10);
      h.avance = isNaN(av)?0:av;
      saveData(data);
      renderHitos();
      alert('Hito guardado');
    });

    const btnAddH = document.getElementById('btnAddHito');
    if(btnAddH) btnAddH.addEventListener('click', ()=>{
      const title = document.getElementById('newHitoTitle')?.value.trim();
      const priority = document.getElementById('newHitoPriority')?.value || 'Media';
      if(!title) return alert('Ingresa título');
      const newH = { id: uid('h'), title, desc:'', priority, avance:0, subhitos:[] };
      data.push(newH);
      saveData(data);
      document.getElementById('newHitoTitle').value = '';
      populateConfigSelects();
      renderHitos();
    });

    const btnExport = document.getElementById('btnExport');
    if(btnExport) btnExport.addEventListener('click', ()=> exportToFile());

    const btnReset = document.getElementById('btnResetSeed');
    if(btnReset) btnReset.addEventListener('click', ()=> resetToSeed());

    // Fallback: asegurar que tabs sin onclick funcionen
    document.querySelectorAll('.tab').forEach(t => {
      t.addEventListener('click', (e)=>{
        const view = t.dataset.view;
        try { window.switchView(view); } catch(err){ console.error('switchView fallback', err); }
      });
    });

    // Resize/scroll optimizados
    let resizeTimer = null;
    window.addEventListener('resize', ()=>{
      if(resizeTimer) clearTimeout(resizeTimer);
      resizeTimer = setTimeout(()=> { createConnectors(); resizeTimer = null; }, 120);
    });
    if(wrap){
      let ticking = false;
      wrap.addEventListener('scroll', ()=>{
        if(!ticking){
          window.requestAnimationFrame(()=> { createConnectors(); ticking = false; });
          ticking = true;
        }
      });
    }

  } catch(err){
    console.error('Init error', err);
  }
});
/* Exportar funciones útiles al scope global para debugging / consola */
window.planteles_exportToFile = exportToFile;
window.planteles_saveLocal = saveDataLocal;
