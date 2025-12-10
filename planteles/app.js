/* ============================================
   Persistencia y datos iniciales
=========================================== */
const STORAGE_KEY = 'planteles_v3';

// Seed inicial (datos por defecto)
const seed = [
  { id:'h1', title:'Hito 1 — Documentación Base', desc:'Actas, diagnósticos y recopilación inicial.', priority:'Alta', avance:42,
    subhitos:[
      { id:'h1s1', title:'Revisión de antecedentes', avance:60, docs:['Acta de comité técnico [approved]','Informe diagnóstico [approved]','Plano actualizado [pending]'] },
      { id:'h1s2', title:'Solicitud de documentos externos', avance:25, docs:['Certificado DOM [pending]','Certificado SAG [approved]'] }
    ]
  },
  { id:'h2', title:'Hito 2 — Permisos Municipales', desc:'Requisitos y presentación al municipio.', priority:'Media', avance:10,
    subhitos:[
      { id:'h2s1', title:'Revisión de normas', avance:10, docs:['Certificación sanitaria [pending]','Plan regulador [pending]'] },
      { id:'h2s2', title:'Presentación preliminar', avance:0, docs:['Carta de inicio [pending]','Presentación técnica [pending]'] }
    ]
  },
  { id:'h3', title:'Hito 3 — Regularización Ambiental', desc:'Estudios, mitigaciones y certificados.', priority:'Baja', avance:0,
    subhitos:[
      { id:'h3s1', title:'Estudios de impacto', avance:0, docs:['Estudio preliminar [pending]'] }
    ]
  }
];

// Cargar
function loadData(){
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return JSON.parse(JSON.stringify(seed));
  } catch (err) {
    console.error('loadData error', err);
    // en caso de JSON inválido, limpiar y devolver seed
    localStorage.removeItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return JSON.parse(JSON.stringify(seed));
  }
}

// Guardar
function saveData(data){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e){
    console.error('saveData error', e);
  }
}

/* ============================================
   Estado en memoria
=========================================== */
let data = loadData();
let currentOpen = null;
let currentView = 'visual';

/* UID simple */
function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

/* ============================================
   Cambio de pestañas Visualización / Config
   (añadí logs y guards para evitar errores silenciosos)
=========================================== */
function switchView(v){
  console.log('switchView called with:', v);
  currentView = v;

  const visualEl = document.getElementById('visualView');
  const configEl = document.getElementById('configView');

  if(!visualEl || !configEl){
    console.error('switchView: elementos visualView/configView NO encontrados', {visualEl, configEl});
    return;
  }

  visualEl.style.display = (v === 'visual') ? 'block' : 'none';
  configEl.style.display = (v === 'config') ? 'block' : 'none';

  // tabs visuales
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => {
    if(t.dataset.view === v) t.classList.add('active');
  });

  try {
    if(v === 'config' && typeof populateConfigSelects === 'function') populateConfigSelects();
  } catch(err) {
    console.error('Error al ejecutar populateConfigSelects():', err);
  }
  try {
    if(v === 'visual' && typeof createConnectors === 'function') createConnectors();
  } catch(err) {
    console.error('Error al ejecutar createConnectors():', err);
  }
}

// Aseguramos que la función sea accesible desde la consola/onclick inline
window.switchView = switchView;

/* ============================================
   Render de hitos (Visualización)
=========================================== */
const wrap = document.getElementById('hitosWrap');
const connectorLine = document.getElementById('connectorLine');
const detalleArea = document.getElementById('detalleArea');
const detalleInner = document.getElementById('detalleInner');
const detalleTitulo = document.getElementById('detalleTitulo');

function renderHitos(){
  if(!wrap) { console.error('renderHitos: wrap no encontrado'); return; }
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

  window.requestAnimationFrame(()=> {
    if(typeof createConnectors === 'function') createConnectors();
  });
}

/* Abrir hito en Visualización */
function openHito(id, el){
  if(!detalleArea){ console.error('openHito: detalleArea no existe'); return; }
  document.querySelectorAll('.hito-card').forEach(c=>c.classList.remove('active'));

  if(currentOpen === id){
    detalleArea.style.display='none';
    currentOpen=null;
    return;
  }

  if(el) el.classList.add('active');
  currentOpen = id;
  const h = data.find(x=>x.id===id);
  if(!h) { console.warn('openHito: hito no encontrado', id); return; }

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
   Conectores entre hitos
=========================================== */
function createConnectors(){
  if(!wrap || !connectorLine) { console.warn('createConnectors: wrap o connectorLine no encontrados'); return; }
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
   CONFIGURACIÓN — Selects
=========================================== */
function populateConfigSelects(){
  try {
    const selectH = document.getElementById('selectHitoEdit');
    const selectSub = document.getElementById('selectSubEdit');
    const selectDoc = document.getElementById('selectDocEdit');
    if(!selectH || !selectSub || !selectDoc) {
      console.warn('populateConfigSelects: alguno de los selects no existe aún');
      return;
    }

    selectH.innerHTML = '<option value="">-- seleccionar --</option>';
    data.forEach(h=>{
      const o=document.createElement('option');
      o.value=h.id; o.textContent=h.title;
      selectH.appendChild(o);
    });

    selectSub.innerHTML = '<option value="">-- seleccionar sub-hito --</option>';
    selectDoc.innerHTML = '<option value="">-- seleccionar documento --</option>';
  } catch(err){
    console.error('populateConfigSelects error:', err);
  }
}

/* ============================================
   Resto de handlers (guardar/editar/elim/ export...) 
   Mantengo el mismo código que ya tienes; si faltara alguno
   lo añadimos después según lo necesites.
=========================================== */

/* Guardar Hito */
document.addEventListener('click', function initOnce(e){
  // Dejar este handler para asegurar que los elementos del DOM estén presentes antes de enlazar eventos que dependen de ellos
  // Sólo se ejecuta una vez, luego se elimina.
  document.removeEventListener('click', initOnce);

  // Enlazar eventos sólo si existen los elementos
  const elSaveH = document.getElementById('btnSaveHito');
  if(elSaveH) elSaveH.addEventListener('click', ()=>{
    const hid = document.getElementById('selectHitoEdit')?.value;
    if(!hid) return alert('Selecciona un hito');
    const h = data.find(x=>x.id===hid);
    if(!h) return;
    h.desc = document.getElementById('editHitoDesc')?.value.trim() || '';
    const av = parseInt(document.getElementById('editHitoAvance')?.value||'0',10);
    h.avance = isNaN(av)?0:av;
    saveData(data);
    renderHitos();
    alert('Hito guardado');
  });

  const elAdd = document.getElementById('btnAddHito');
  if(elAdd) elAdd.addEventListener('click', ()=>{
    const title = document.getElementById('newHitoTitle')?.value.trim();
    const priority = document.getElementById('newHitoPriority')?.value;
    if(!title) return alert('Ingresa título');
    const newH = { id: uid('h'), title, desc:'', priority, avance:0, subhitos:[] };
    data.push(newH);
    saveData(data);
    document.getElementById('newHitoTitle').value = '';
    populateConfigSelects();
    renderHitos();
  });

  // Enlazar otros botones similares solo si existen (btnExport, btnResetSeed, etc.)
  const elExport = document.getElementById('btnExport');
  if(elExport) elExport.addEventListener('click', ()=>{
    try{
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=url;
      a.download='planteles_export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch(err){ console.error('Error export:', err); }
  });

  const elReset = document.getElementById('btnResetSeed');
  if(elReset) elReset.addEventListener('click', ()=>{
    if(!confirm('¿Restaurar datos iniciales?')) return;
    data = JSON.parse(JSON.stringify(seed));
    saveData(data);
    populateConfigSelects();
    renderHitos();
    detalleArea && (detalleArea.style.display='none');
  });

  // Fallback: asegurar que las pestañas funcionen con addEventListener si onclick no funciona
  document.querySelectorAll('.tab').forEach(t => {
    t.removeEventListener('click', t._boundSwitchHandler);
    t._boundSwitchHandler = function(e){
      const view = t.dataset.view;
      try { switchView(view); } catch(err){ console.error('switchView fallback error', err); }
    };
    t.addEventListener('click', t._boundSwitchHandler);
  });

}, { once:true });

/* ============================================
   Inicialización
=========================================== */
window.addEventListener('load',()=>{
  try {
    renderHitos();
    createConnectors();
    populateConfigSelects();
  } catch(err){
    console.error('Error en inicialización:', err);
  }
});

window.addEventListener('resize',()=> createConnectors());
wrap && wrap.addEventListener('scroll',()=> window.requestAnimationFrame(createConnectors));
