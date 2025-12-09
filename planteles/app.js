/* ============================================
   Persistencia y datos iniciales
============================================ */
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
  const raw = localStorage.getItem(STORAGE_KEY);
  if(raw) return JSON.parse(raw);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return JSON.parse(JSON.stringify(seed));
}

// Guardar
function saveData(data){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/* ============================================
   Estado en memoria
============================================ */
let data = loadData();
let currentOpen = null;
let currentView = 'visual';

/* Para mantener últimas selecciones al repoblar */
let lastSelectedHito = '';
let lastSelectedSub = '';
let lastSelectedDoc = '';

/* UID simple */
function uid(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2,9); }

/* ============================================
   Cambio de pestañas Visualización / Config
============================================ */
function switchView(v){
  currentView = v;

  document.getElementById('visualView').style.display =
    v === 'visual' ? 'block' : 'none';

  document.getElementById('configView').style.display =
    v === 'config' ? 'block' : 'none';

  // tabs visuales
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => {
    if(t.dataset.view === v) t.classList.add('active');
  });

  if(v === 'config') populateConfigSelects();
  if(v === 'visual') createConnectors();
}

/* ============================================
   Render de hitos (Visualización)
============================================ */
const wrap = document.getElementById('hitosWrap');
const connectorLine = document.getElementById('connectorLine');
const detalleArea = document.getElementById('detalleArea');
const detalleInner = document.getElementById('detalleInner');
const detalleTitulo = document.getElementById('detalleTitulo');

function renderHitos(){
  wrap.querySelectorAll('.hito-card').forEach(n=>n.remove());

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

    wrap.appendChild(card);
  });

  createConnectors();
}

/* Abrir hito en Visualización */
function openHito(id, el){
  document.querySelectorAll('.hito-card').forEach(c=>c.classList.remove('active'));

  if(currentOpen === id){
    detalleArea.style.display='none';
    currentOpen=null;
    return;
  }

  el.classList.add('active');
  currentOpen = id;
  const h = data.find(x=>x.id===id);

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
  el.scrollIntoView({behavior:'smooth',inline:'center'});
}

/* ============================================
   Conectores entre hitos
============================================ */
function createConnectors(){
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

  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const centerX = (rect.left + rect.right)/2 - wrapRect.left + wrap.scrollLeft;

    const dot = document.createElement('div');
    dot.className = 'connector-dot';
    dot.style.left = `${centerX}px`;
    dot.style.top = `${lineTop}px`;
    wrap.appendChild(dot);
  });
}

/* ============================================
   CONFIGURACIÓN — Selects (cascada)
============================================ */
function populateConfigSelects(){
  const selectH = document.getElementById('selectHitoEdit');
  const selectSub = document.getElementById('selectSubEdit');
  const selectDoc = document.getElementById('selectDocEdit');

  // Guardar selección previa
  const prevH = lastSelectedHito || selectH.value || '';
  const prevS = lastSelectedSub || selectSub.value || '';
  const prevD = lastSelectedDoc || selectDoc.value || '';

  selectH.innerHTML = '<option value="">-- seleccionar --</option>';
  data.forEach(h=>{
    const o=document.createElement('option');
    o.value=h.id; o.textContent=h.title;
    selectH.appendChild(o);
  });

  // Restablecer selects hijos
  selectSub.innerHTML = '<option value="">-- seleccionar sub-hito --</option>';
  selectDoc.innerHTML = '<option value="">-- seleccionar documento --</option>';

  // Intentar restaurar selección de hito si existe
  if(prevH && data.find(x=>x.id===prevH)){
    selectH.value = prevH;
    // trigger change para poblar sub-hitos
    selectH.dispatchEvent(new Event('change'));
    // Después de poblar, intentar restaurar sub y doc
    setTimeout(()=>{
      if(prevS){
        const subOpt = Array.from(selectSub.options).find(o=>o.value===prevS);
        if(subOpt) selectSub.value = prevS;
        selectSub.dispatchEvent(new Event('change'));
        setTimeout(()=>{
          if(prevD){
            const docOpt = Array.from(selectDoc.options).find(o=>o.value===prevD);
            if(docOpt) selectDoc.value = prevD;
            selectDoc.dispatchEvent(new Event('change'));
          }
        }, 0);
      }
    },0);
  } else {
    updateControlsState();
  }
}

/* ============================================
   Helpers: recalcular avance del hito (promedio simple)
============================================ */
function recalcHitoAvance(h){
  if(!h || !h.subhitos || h.subhitos.length===0) return;
  const sum = h.subhitos.reduce((acc,s)=> acc + (parseInt(s.avance||0,10)||0), 0);
  const avg = Math.round(sum / h.subhitos.length);
  h.avance = avg;
}

/* Habilitar/Deshabilitar botones según selección */
function updateControlsState(){
  const hid = document.getElementById('selectHitoEdit').value;
  const sid = document.getElementById('selectSubEdit').value;
  const did = document.getElementById('selectDocEdit').value;

  // Hito buttons
  document.getElementById('btnSaveHito').disabled = !hid;
  document.getElementById('btnDeleteHito').disabled = !hid;

  // Sub buttons
  document.getElementById('btnSaveSub').disabled = !(hid && sid);
  document.getElementById('btnDeleteSub').disabled = !(hid && sid);
  document.getElementById('btnAddSubConfirm').disabled = !hid;

  // Doc buttons
  document.getElementById('btnSaveDoc').disabled = !(hid && sid && did!=='');
  document.getElementById('btnDeleteDoc').disabled = !(hid && sid && did!=='');
  const btnAddDoc = document.getElementById('btnAddDocConfirm');
  if(btnAddDoc) btnAddDoc.disabled = !(hid && sid);
}

/* ============================================
   CONFIG — Editar Hitos
============================================ */
document.getElementById('selectHitoEdit').addEventListener('change',(e)=>{
  const hid=e.target.value;
  lastSelectedHito = hid;
  lastSelectedSub = '';
  lastSelectedDoc = '';

  const h = data.find(x=>x.id===hid);

  document.getElementById('editHitoDesc').value = h? (h.desc||'') : '';
  document.getElementById('editHitoAvance').value = h? (h.avance||0) : '';
  if(h) document.getElementById('editHitoPriority').value = h.priority || 'Media';

  const selectSub = document.getElementById('selectSubEdit');
  selectSub.innerHTML='<option value="">-- seleccionar sub-hito --</option>';

  if(h && h.subhitos && h.subhitos.length){
    h.subhitos.forEach(s=>{
      const opt=document.createElement('option');
      opt.value=s.id;
      opt.textContent=s.title;
      selectSub.appendChild(opt);
    });
    // Auto-seleccionar el primer sub-hito y disparar su change para llenar los campos
    selectSub.value = h.subhitos[0].id;
    lastSelectedSub = selectSub.value;
    selectSub.dispatchEvent(new Event('change'));
  } else {
    // No hay sub-hitos: limpiar campos relacionados
    document.getElementById('editSubTitle').value = '';
    document.getElementById('editSubAvance').value = '';
    document.getElementById('selectDocEdit').innerHTML = '<option value="">-- seleccionar documento --</option>';
    document.getElementById('editDocName').value = '';
    document.getElementById('editDocStatus').value = 'pending';
  }

  updateControlsState();
});

/* Guardar Hito */
document.getElementById('btnSaveHito').addEventListener('click',()=>{
  const hid=document.getElementById('selectHitoEdit').value;
  if(!hid) return alert('Selecciona un hito antes de guardar');

  const h = data.find(x=>x.id===hid);
  h.desc = document.getElementById('editHitoDesc').value.trim();

  const av = parseInt(document.getElementById('editHitoAvance').value||'0',10);
  h.avance = isNaN(av)?0:av;

  h.priority = document.getElementById('editHitoPriority').value || h.priority;

  saveData(data);
  renderHitos();
  populateConfigSelects();
  showNotice('Hito guardado');
});

/* Eliminar Hito */
document.getElementById('btnDeleteHito').addEventListener('click',()=>{
  const hid=document.getElementById('selectHitoEdit').value;
  if(!hid) return alert('Selecciona hito');
  if(!confirm('¿Eliminar hito?')) return;

  data = data.filter(h=>h.id!==hid);
  saveData(data);

  lastSelectedHito = '';
  lastSelectedSub = '';
  lastSelectedDoc = '';

  populateConfigSelects();
  renderHitos();
});

/* Agregar Hito (desde formulario inline) */
document.getElementById('btnAddHito').addEventListener('click',()=>{
  const title=document.getElementById('newHitoTitle').value.trim();
  const priority=document.getElementById('newHitoPriority').value;

  if(!title) return alert('Ingresa título');

  const newH={
    id:uid('h'),
    title,
    desc:'',
    priority,
    avance:0,
    subhitos:[]
  };

  data.push(newH);
  saveData(data);

  document.getElementById('newHitoTitle').value='';
  lastSelectedHito = newH.id;
  populateConfigSelects();
  renderHitos();
});

/* ============================================
   CONFIG — Editar Sub-Hitos
============================================ */
document.getElementById('selectSubEdit').addEventListener('change',(e)=>{
  const sid=e.target.value;
  lastSelectedSub = sid;
  lastSelectedDoc = '';

  const hid=document.getElementById('selectHitoEdit').value;
  const h = data.find(x=>x.id===hid);
  const s = h? h.subhitos.find(x=>x.id===sid) : null;

  document.getElementById('editSubTitle').value = s? s.title : '';
  document.getElementById('editSubAvance').value = s? (s.avance||0) : '';

  // llenar docs
  const selectDoc=document.getElementById('selectDocEdit');
  selectDoc.innerHTML='<option value="">-- seleccionar documento --</option>';

  if(s && s.docs){
    s.docs.forEach((docText,idx)=>{
      const opt=document.createElement('option');
      opt.value=idx;
      opt.textContent=docText;
      selectDoc.appendChild(opt);
    });
    // Auto-seleccionar el primero
    if(s.docs.length) {
      selectDoc.value = 0;
      lastSelectedDoc = '0';
      selectDoc.dispatchEvent(new Event('change'));
    }
  } else {
    // limpiar campos de documento
    document.getElementById('editDocName').value = '';
    document.getElementById('editDocStatus').value = 'pending';
    selectDoc.innerHTML = '<option value="">-- seleccionar documento --</option>';
  }

  updateControlsState();
});

/* Guardar Sub-Hito */
document.getElementById('btnSaveSub').addEventListener('click',()=>{
  const hid=document.getElementById('selectHitoEdit').value;
  const sid=document.getElementById('selectSubEdit').value;

  if(!hid) return alert('Selecciona un hito antes de guardar el sub-hito');
  if(!sid) return alert('Selecciona un sub-hito o crea uno nuevo usando el formulario "Nuevo sub-hito"');

  const h=data.find(x=>x.id===hid);
  const s=h.subhitos.find(x=>x.id===sid);

  s.title=document.getElementById('editSubTitle').value.trim();
  const av=parseInt(document.getElementById('editSubAvance').value||'0',10);
  s.avance=isNaN(av)?0:av;

  // recalcular avance del hito padre
  recalcHitoAvance(h);

  saveData(data);
  lastSelectedHito = hid;
  lastSelectedSub = sid;
  populateConfigSelects();
  renderHitos();

  showNotice('Sub-hito guardado');
});

/* Confirmación creación de nuevo sub-hito (formulario inline) */
document.getElementById('btnAddSubConfirm')?.addEventListener('click',()=>{
  const hid=document.getElementById('selectHitoEdit').value;
  if(!hid) return alert('Selecciona un hito antes de agregar sub-hito');

  const title = document.getElementById('newSubTitle').value.trim();
  const avance = parseInt(document.getElementById('newSubAvance').value||'0',10);

  if(!title) return alert('Ingresa título para el sub-hito');

  const h = data.find(x=>x.id===hid);
  if(!h.subhitos) h.subhitos = [];

  const newSub = {
    id: uid('s'),
    title,
    avance: isNaN(avance)?0:avance,
    docs: []
  };

  h.subhitos.push(newSub);
  // recalcular hito
  recalcHitoAvance(h);

  saveData(data);

  // limpiar campos nuevo sub
  document.getElementById('newSubTitle').value = '';
  document.getElementById('newSubAvance').value = '0';

  // Repoblar selects y dejar seleccionado el nuevo sub-hito
  lastSelectedHito = hid;
  lastSelectedSub = newSub.id;
  populateConfigSelects();
  renderHitos();

  showNotice('Sub-hito creado');
});

/* Eliminar Sub-Hito */
document.getElementById('btnDeleteSub').addEventListener('click',()=>{
  const hid=document.getElementById('selectHitoEdit').value;
  const sid=document.getElementById('selectSubEdit').value;

  if(!hid || !sid) return alert('Selecciona sub-hito');
  if(!confirm('¿Eliminar sub-hito?')) return;

  const h=data.find(x=>x.id===hid);
  h.subhitos = h.subhitos.filter(s=>s.id!==sid);

  // recalcular hito
  recalcHitoAvance(h);

  saveData(data);
  lastSelectedSub = '';
  lastSelectedDoc = '';
  lastSelectedHito = hid;
  populateConfigSelects();
  renderHitos();

  showNotice('Sub-hito eliminado');
});

/* ============================================
   CONFIG — Documentos
============================================ */
document.getElementById('selectDocEdit').addEventListener('change',(e)=>{
  const docIndex=e.target.value;
  lastSelectedDoc = docIndex;

  const hid=document.getElementById('selectHitoEdit').value;
  const sid=document.getElementById('selectSubEdit').value;

  if(!hid || !sid || docIndex===''){
    document.getElementById('editDocName').value='';
    updateControlsState();
    return;
  }

  const h=data.find(x=>x.id===hid);
  const s=h.subhitos.find(x=>x.id===sid);
  const docText=s.docs[docIndex];

  const match = docText.match(/^(.*)\s\[(.*)\]$/);

  if(match){
    document.getElementById('editDocName').value = match[1];
    document.getElementById('editDocStatus').value = match[2];
  } else {
    document.getElementById('editDocName').value = docText;
    document.getElementById('editDocStatus').value = 'pending';
  }

  updateControlsState();
});

/* Guardar Documento */
document.getElementById('btnSaveDoc').addEventListener('click',()=>{
  const hid=document.getElementById('selectHitoEdit').value;
  const sid=document.getElementById('selectSubEdit').value;
  const docIndex=document.getElementById('selectDocEdit').value;

  if(!hid || !sid || docIndex==='') return alert('Selecciona documento');

  const h=data.find(x=>x.id===hid);
  const s=h.subhitos.find(x=>x.id===sid);

  const newName=document.getElementById('editDocName').value.trim();
  const newStatus=document.getElementById('editDocStatus').value;

  if(!newName) return alert('Ingresa nombre');

  s.docs[docIndex] = `${newName} [${newStatus}]`;

  saveData(data);
  lastSelectedHito = hid;
  lastSelectedSub = sid;
  lastSelectedDoc = docIndex;
  populateConfigSelects();
  renderHitos();

  showNotice('Documento guardado');
});

/* Agregar Documento (formulario inline) */
document.getElementById('btnAddDocConfirm')?.addEventListener('click',()=>{
  const hid=document.getElementById('selectHitoEdit').value;
  const sid=document.getElementById('selectSubEdit').value;

  if(!hid || !sid) return alert('Selecciona hito y sub-hito antes de agregar documento');

  const name = document.getElementById('newDocName').value.trim();
  const status = document.getElementById('newDocStatus').value;

  if(!name) return alert('Ingresa nombre para el documento');

  const h = data.find(x=>x.id===hid);
  const s = h.subhitos.find(x=>x.id===sid);
  if(!s.docs) s.docs = [];

  s.docs.push(`${name} [${status}]`);

  saveData(data);

  // limpiar campos nuevo documento
  document.getElementById('newDocName').value = '';
  document.getElementById('newDocStatus').value = 'pending';

  // Repoblar selects y seleccionar el nuevo doc (último)
  lastSelectedHito = hid;
  lastSelectedSub = sid;
  lastSelectedDoc = String(s.docs.length - 1);
  populateConfigSelects();
  renderHitos();

  showNotice('Documento agregado');
});

/* Eliminar Documento */
document.getElementById('btnDeleteDoc').addEventListener('click',()=>{
  const hid=document.getElementById('selectHitoEdit').value;
  const sid=document.getElementById('selectSubEdit').value;
  const docIndex=document.getElementById('selectDocEdit').value;

  if(!hid || !sid || docIndex==='') return alert('Selecciona documento');
  if(!confirm('¿Eliminar documento?')) return;

  const h=data.find(x=>x.id===hid);
  const s=h.subhitos.find(x=>x.id===sid);

  s.docs.splice(docIndex,1);

  saveData(data);
  lastSelectedHito = hid;
  lastSelectedSub = sid;
  lastSelectedDoc = '';
  populateConfigSelects();
  renderHitos();

  showNotice('Documento eliminado');
});

/* ============================================
   Exportar JSON
============================================ */
document.getElementById('btnExport')?.addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);

  const a=document.createElement('a');
  a.href=url;
  a.download='planteles_export.json';
  a.click();

  URL.revokeObjectURL(url);
});

/* Reset a seed */
document.getElementById('btnResetSeed')?.addEventListener('click',()=>{
  if(!confirm('¿Restaurar datos iniciales?')) return;

  data = JSON.parse(JSON.stringify(seed));
  saveData(data);

  lastSelectedHito = '';
  lastSelectedSub = '';
  lastSelectedDoc = '';

  populateConfigSelects();
  renderHitos();

  detalleArea.style.display='none';
});

/* ============================================
   Utilidades UI
============================================ */
function showNotice(msg, timeout=3000){
  const n = document.getElementById('configNotice');
  if(!n) { console.log('NOTICE:', msg); return; }
  n.textContent = msg; n.style.display = 'block';
  setTimeout(()=>{ n.style.display = 'none'; n.textContent = ''; }, timeout);
}

/* ============================================
   Inicialización
============================================ */
window.addEventListener('load',()=>{
  renderHitos();
  createConnectors();
  populateConfigSelects();
  // Asegurarse de que el estado de controles está correcto al inicio
  updateControlsState();
});

window.addEventListener('resize',()=> createConnectors());
wrap.addEventListener('scroll',()=> window.requestAnimationFrame(createConnectors()));
