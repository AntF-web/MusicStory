const DRAFT_KEY = 'red-ant-site-data-preview-v1';
const PIN_KEY = 'red-ant-editor-pin-sha256-v1';
const SESSION_KEY = 'red-ant-editor-unlocked-v1';

const publishedData = clone(window.RED_ANT_SITE_DATA || { music: [], chapters: [], translations: { en: {}, fr: {} } });
let draft = loadDraft();
let selectedTrack = -1;
let saveTimer = null;

const gate = document.querySelector('#gate');
const editor = document.querySelector('#editor');
const pinSetup = document.querySelector('#pinSetup');
const pinUnlock = document.querySelector('#pinUnlock');
const setupForm = document.querySelector('#setupForm');
const unlockForm = document.querySelector('#unlockForm');
const setupPin = document.querySelector('#setupPin');
const setupPinConfirm = document.querySelector('#setupPinConfirm');
const unlockPin = document.querySelector('#unlockPin');
const pinError = document.querySelector('#pinError');
const resetPin = document.querySelector('#resetPin');
const logoutButton = document.querySelector('#logoutButton');
const saveStatus = document.querySelector('#saveStatus');

const trackList = document.querySelector('#trackList');
const trackSearch = document.querySelector('#trackSearch');
const trackForm = document.querySelector('#trackForm');
const trackEmpty = document.querySelector('#trackEmpty');
const trackHeading = document.querySelector('#trackHeading');
const trackPosition = document.querySelector('#trackPosition');
const mediaPreview = document.querySelector('#mediaPreview');
const chapterEditor = document.querySelector('#chapterEditor');
const translationEditor = document.querySelector('#translationEditor');

function clone(value) { return JSON.parse(JSON.stringify(value)); }

function loadDraft() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    return normalizeData(saved ? JSON.parse(saved) : publishedData);
  } catch (error) {
    console.warn(error);
    return normalizeData(publishedData);
  }
}

function normalizeData(data) {
  const clean = clone(data || {});
  clean.version = Number(clean.version || 1);
  clean.music = Array.isArray(clean.music) ? clean.music : [];
  clean.chapters = Array.isArray(clean.chapters) ? clean.chapters : [];
  clean.translations = clean.translations || { en: {}, fr: {} };
  clean.translations.en = clean.translations.en || {};
  clean.translations.fr = clean.translations.fr || {};
  clean.music.forEach((item, index) => {
    item.year = String(item.year ?? '');
    item.decade = String(item.decade ?? inferDecade(item.year));
    item.artist = String(item.artist ?? '');
    item.title = String(item.title ?? '');
    item.type = ['VIDEO','DISC','CD'].includes(item.type) ? item.type : 'DISC';
    if (item.memory && typeof item.memory !== 'object') delete item.memory;
    item.__editorId = item.__editorId || `track-${Date.now()}-${index}-${Math.random().toString(36).slice(2,7)}`;
  });
  clean.chapters.forEach((chapter, index) => {
    chapter.id = chapter.id || `chapter-${index + 1}`;
    chapter.number = String(chapter.number || index + 1).padStart(2,'0');
    chapter.startYear = Number(chapter.startYear ?? 1900);
    chapter.endYear = Number(chapter.endYear ?? 2100);
  });
  return clean;
}

function publicData() {
  const output = clone(draft);
  output.music.forEach(item => delete item.__editorId);
  return output;
}

function inferDecade(year) {
  const match = String(year || '').match(/(\d{4})/);
  if (!match) return '';
  return `${Math.floor(Number(match[1]) / 10) * 10}s`;
}

function numericYear(item) {
  const match = String(item.year || '').match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

async function hashPin(value) {
  const text = new TextEncoder().encode(`red-ant-editor::${value}`);
  if (crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', text);
    return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  let hash = 2166136261;
  for (const byte of text) { hash ^= byte; hash = Math.imul(hash, 16777619); }
  return `fallback-${hash >>> 0}`;
}

function showGate() {
  editor.hidden = true;
  gate.hidden = false;
  const hasPin = !!localStorage.getItem(PIN_KEY);
  pinSetup.hidden = hasPin;
  pinUnlock.hidden = !hasPin;
  if (hasPin) setTimeout(() => unlockPin.focus(), 30);
}

function showEditor() {
  sessionStorage.setItem(SESSION_KEY, '1');
  gate.hidden = true;
  editor.hidden = false;
  renderAll();
}

setupForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (setupPin.value !== setupPinConfirm.value) {
    setupPinConfirm.setCustomValidity('PINs do not match.');
    setupPinConfirm.reportValidity();
    setupPinConfirm.setCustomValidity('');
    return;
  }
  localStorage.setItem(PIN_KEY, await hashPin(setupPin.value));
  setupForm.reset();
  showEditor();
});

unlockForm.addEventListener('submit', async event => {
  event.preventDefault();
  const hash = await hashPin(unlockPin.value);
  if (hash !== localStorage.getItem(PIN_KEY)) {
    pinError.hidden = false;
    unlockPin.select();
    return;
  }
  pinError.hidden = true;
  unlockForm.reset();
  showEditor();
});

resetPin.addEventListener('click', () => {
  if (!confirm('Reset the editor PIN saved in this browser? Your content draft will NOT be deleted.')) return;
  localStorage.removeItem(PIN_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  showGate();
});

logoutButton.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  showGate();
});

function scheduleSave() {
  clearTimeout(saveTimer);
  saveStatus.textContent = 'SAVING DRAFT…';
  saveStatus.classList.add('is-saving');
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(publicData()));
      saveStatus.textContent = 'DRAFT SAVED LOCALLY';
      saveStatus.classList.remove('is-saving');
    } catch (error) {
      saveStatus.textContent = 'SAVE FAILED';
      console.error(error);
    }
  }, 180);
}

function renderAll() {
  renderTrackList();
  renderTrackForm();
  renderChapters();
  renderTranslations();
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(tab => tab.classList.toggle('is-active', tab.dataset.tab === name));
  document.querySelectorAll('.panel').forEach(panel => panel.classList.toggle('is-active', panel.dataset.panel === name));
}

document.querySelector('.tabs').addEventListener('click', event => {
  const button = event.target.closest('[data-tab]');
  if (button) switchTab(button.dataset.tab);
});

function filteredTrackIndices() {
  const term = trackSearch.value.trim().toLowerCase();
  return draft.music.map((item,index) => ({item,index})).filter(({item}) => {
    if (!term) return true;
    return [item.year,item.artist,item.title,item.type,item.meta,item.note,item.noteFr,item.memory?.text,item.memory?.textFr,item.memory?.place,item.memory?.period]
      .filter(Boolean).join(' ').toLowerCase().includes(term);
  });
}

function revealTrackEditorOnSmallScreen() {
  if (!window.matchMedia('(max-width: 900px)').matches) return;
  setTimeout(() => document.querySelector('.form-pane')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
}

function renderTrackList() {
  trackList.innerHTML = '';
  filteredTrackIndices().forEach(({item,index}) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `track-item${index === selectedTrack ? ' is-active' : ''}`;
    button.innerHTML = `<span class="track-item__year"></span><span class="track-item__name"><strong></strong><span></span></span><span class="track-item__format"></span>`;
    button.querySelector('.track-item__year').textContent = item.year || '—';
    button.querySelector('strong').textContent = item.artist || 'Untitled artist';
    button.querySelector('.track-item__name span').textContent = item.title || 'Untitled moment';
    button.querySelector('.track-item__format').textContent = item.type || 'DISC';
    button.addEventListener('click', () => { selectedTrack = index; renderTrackList(); renderTrackForm(); revealTrackEditorOnSmallScreen(); });
    trackList.appendChild(button);
  });
}

function renderTrackForm() {
  const item = draft.music[selectedTrack];
  trackEmpty.hidden = !!item;
  trackForm.hidden = !item;
  if (!item) return;
  trackPosition.textContent = `MOMENT ${String(selectedTrack + 1).padStart(2,'0')} / ${String(draft.music.length).padStart(2,'0')}`;
  trackHeading.textContent = item.artist || 'EDIT MOMENT';
  const values = {
    year:item.year, decade:item.decade, type:item.type, meta:item.meta || '', artist:item.artist, title:item.title,
    note:item.note || '', noteFr:item.noteFr || '', memoryText:item.memory?.text || '', memoryTextFr:item.memory?.textFr || '', memoryPlace:item.memory?.place || '',
    memoryPeriod:item.memory?.period || '', memoryVideo:item.memory?.video || '', memoryImage:item.memory?.image || ''
  };
  Object.entries(values).forEach(([name,value]) => {
    const field = trackForm.elements.namedItem(name);
    if (field) field.value = value;
  });
  renderMediaPreview(item);
}

function renderMediaPreview(item) {
  mediaPreview.innerHTML = '';
  const memory = item.memory || {};
  if (memory.image) {
    const img = document.createElement('img'); img.src = memory.image; img.alt = 'Image preview';
    img.addEventListener('error', () => img.remove()); mediaPreview.appendChild(img);
  }
  if (memory.video) {
    const a = document.createElement('a'); a.href = memory.video; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'OPEN VIDEO ↗'; mediaPreview.appendChild(a);
  }
}

trackForm.addEventListener('input', event => {
  const item = draft.music[selectedTrack];
  if (!item || !event.target.name) return;
  const name = event.target.name;
  const value = event.target.value;
  if (['memoryText','memoryTextFr','memoryPlace','memoryPeriod','memoryVideo','memoryImage'].includes(name)) {
    item.memory ||= {};
    const keyMap = { memoryText:'text', memoryTextFr:'textFr', memoryPlace:'place', memoryPeriod:'period', memoryVideo:'video', memoryImage:'image' };
    item.memory[keyMap[name]] = value;
    if (!Object.values(item.memory).some(Boolean)) delete item.memory;
    renderMediaPreview(item);
  } else {
    item[name] = value;
    if (name === 'year' && !item.decade) item.decade = inferDecade(value);
  }
  trackHeading.textContent = item.artist || 'EDIT MOMENT';
  scheduleSave();
  renderTrackList();
});

trackSearch.addEventListener('input', renderTrackList);

document.querySelector('#addTrack').addEventListener('click', () => {
  const year = new Date().getFullYear();
  const item = { year:String(year), decade:inferDecade(year), artist:'New artist', title:'New moment', type:'DISC', __editorId:`track-${Date.now()}` };
  draft.music.push(item);
  selectedTrack = draft.music.length - 1;
  trackSearch.value = '';
  scheduleSave();
  renderTrackList(); renderTrackForm(); revealTrackEditorOnSmallScreen();
  trackForm.elements.artist.focus(); trackForm.elements.artist.select();
});

document.querySelector('#deleteTrack').addEventListener('click', () => {
  const item = draft.music[selectedTrack];
  if (!item || !confirm(`Delete “${item.artist} — ${item.title}”?`)) return;
  draft.music.splice(selectedTrack,1);
  selectedTrack = Math.min(selectedTrack, draft.music.length - 1);
  scheduleSave(); renderTrackList(); renderTrackForm();
});

function moveTrack(delta) {
  const target = selectedTrack + delta;
  if (selectedTrack < 0 || target < 0 || target >= draft.music.length) return;
  [draft.music[selectedTrack], draft.music[target]] = [draft.music[target], draft.music[selectedTrack]];
  selectedTrack = target; scheduleSave(); renderTrackList(); renderTrackForm();
}
document.querySelector('#moveTrackUp').addEventListener('click', () => moveTrack(-1));
document.querySelector('#moveTrackDown').addEventListener('click', () => moveTrack(1));

document.querySelector('#sortTracks').addEventListener('click', () => {
  if (!confirm('Sort all moments chronologically by year?')) return;
  const selectedId = draft.music[selectedTrack]?.__editorId;
  draft.music.sort((a,b) => numericYear(a) - numericYear(b));
  selectedTrack = draft.music.findIndex(item => item.__editorId === selectedId);
  scheduleSave(); renderTrackList(); renderTrackForm();
});

function renderChapters() {
  chapterEditor.innerHTML = '';
  draft.chapters.forEach((chapter,index) => {
    const row = document.createElement('article'); row.className = 'chapter-row'; row.dataset.index = index;
    row.innerHTML = `
      <div class="chapter-row__head"><strong></strong><div class="chapter-row__actions"><button class="mini" data-chapter-up type="button">↑</button><button class="mini" data-chapter-down type="button">↓</button><button class="mini mini--danger" data-chapter-delete type="button">DELETE</button></div></div>
      <div class="chapter-row__body">
        <div class="field-grid field-grid--4">
          <label>NUMBER <input data-field="number" /></label><label>ID <input data-field="id" /></label><label>START YEAR <input data-field="startYear" type="number" /></label><label>END YEAR <input data-field="endYear" type="number" /></label>
        </div>
        <label>ERA LABEL <input data-field="era" /></label>
        <div class="field-grid field-grid--2"><label>TITLE — EN <input data-field="title" /></label><label>TITLE — FR <input data-field="titleFr" /></label></div>
        <div class="field-grid field-grid--2"><label>DESCRIPTION — EN <textarea rows="4" data-field="description"></textarea></label><label>DESCRIPTION — FR <textarea rows="4" data-field="descriptionFr"></textarea></label></div>
      </div>`;
    row.querySelector('strong').textContent = `CHAPTER ${chapter.number} / ${chapter.era}`;
    row.querySelectorAll('[data-field]').forEach(field => field.value = chapter[field.dataset.field] ?? '');
    chapterEditor.appendChild(row);
  });
}

chapterEditor.addEventListener('input', event => {
  const row = event.target.closest('.chapter-row'); const field = event.target.dataset.field; if (!row || !field) return;
  const chapter = draft.chapters[Number(row.dataset.index)];
  chapter[field] = ['startYear','endYear'].includes(field) ? Number(event.target.value) : event.target.value;
  row.querySelector('strong').textContent = `CHAPTER ${chapter.number} / ${chapter.era}`;
  scheduleSave();
});

chapterEditor.addEventListener('click', event => {
  const row = event.target.closest('.chapter-row'); if (!row) return;
  const index = Number(row.dataset.index);
  if (event.target.closest('[data-chapter-delete]')) {
    if (confirm(`Delete chapter ${draft.chapters[index].number}?`)) { draft.chapters.splice(index,1); scheduleSave(); renderChapters(); }
  } else if (event.target.closest('[data-chapter-up]') && index > 0) {
    [draft.chapters[index-1],draft.chapters[index]]=[draft.chapters[index],draft.chapters[index-1]]; scheduleSave(); renderChapters();
  } else if (event.target.closest('[data-chapter-down]') && index < draft.chapters.length-1) {
    [draft.chapters[index+1],draft.chapters[index]]=[draft.chapters[index],draft.chapters[index+1]]; scheduleSave(); renderChapters();
  }
});

document.querySelector('#addChapter').addEventListener('click', () => {
  const n = draft.chapters.length + 1;
  draft.chapters.push({ id:`chapter-${n}`, number:String(n).padStart(2,'0'), era:'2005—', title:'New Chapter', titleFr:'Nouveau Chapitre', description:'', descriptionFr:'', startYear:2005, endYear:2100 });
  scheduleSave(); renderChapters();
  setTimeout(() => chapterEditor.lastElementChild?.scrollIntoView({behavior:'smooth',block:'center'}),20);
});

function renderTranslations() {
  translationEditor.innerHTML = '';
  const keys = [...new Set([...Object.keys(draft.translations.en),...Object.keys(draft.translations.fr)])].sort();
  keys.forEach(key => {
    const row = document.createElement('div'); row.className = 'translation-row'; row.dataset.key = key;
    row.innerHTML = `<div class="translation-row__key"></div><label>EN<textarea data-lang="en"></textarea></label><label>FR<textarea data-lang="fr"></textarea></label>`;
    row.querySelector('.translation-row__key').textContent = key;
    row.querySelector('[data-lang="en"]').value = draft.translations.en[key] || '';
    row.querySelector('[data-lang="fr"]').value = draft.translations.fr[key] || '';
    translationEditor.appendChild(row);
  });
}

translationEditor.addEventListener('input', event => {
  const row = event.target.closest('.translation-row'); const lang = event.target.dataset.lang; if (!row || !lang) return;
  draft.translations[lang][row.dataset.key] = event.target.value;
  scheduleSave();
});

function download(filename, content, type='text/plain') {
  const blob = new Blob([content], {type});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

function exportJs() {
  const data = publicData();
  download('site-data.js', `window.RED_ANT_SITE_DATA = ${JSON.stringify(data,null,2)};\n`, 'text/javascript');
}

document.querySelector('#exportJs').addEventListener('click', exportJs);
document.querySelector('#exportJsTop').addEventListener('click', exportJs);
document.querySelector('#exportJson').addEventListener('click', () => download('red-ant-music-story-backup.json', JSON.stringify(publicData(),null,2), 'application/json'));

document.querySelector('#previewButton').addEventListener('click', () => {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(publicData()));
  if (location.protocol === 'file:') {
    alert('For YouTube video previews, run START-LOCAL-SERVER.bat and use http://localhost:8000/editor.html. Direct file:// previews cannot provide the HTTP Referer YouTube requires.');
  }
  window.open('index.html', '_blank', 'noopener');
});

document.querySelector('#importFile').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    let text = await file.text();
    if (file.name.endsWith('.js') || text.trim().startsWith('window.RED_ANT_SITE_DATA')) {
      const first = text.indexOf('{'); const last = text.lastIndexOf('}');
      if (first < 0 || last < first) throw new Error('No data object found');
      text = text.slice(first,last+1);
    }
    const imported = normalizeData(JSON.parse(text));
    if (!Array.isArray(imported.music) || !Array.isArray(imported.chapters)) throw new Error('Invalid site data');
    draft = imported; selectedTrack = -1; trackSearch.value = ''; scheduleSave(); renderAll();
    alert('Import complete. The imported data is now your local draft.');
  } catch (error) {
    alert(`Could not import this file: ${error.message}`);
  }
  event.target.value = '';
});

document.querySelector('#resetDraft').addEventListener('click', () => {
  if (!confirm('Discard ALL local editor changes and return to the published site-data.js?')) return;
  localStorage.removeItem(DRAFT_KEY);
  draft = normalizeData(publishedData); selectedTrack = -1; trackSearch.value = ''; renderAll();
  saveStatus.textContent = 'RESET TO PUBLISHED DATA';
});

if (sessionStorage.getItem(SESSION_KEY) === '1' && localStorage.getItem(PIN_KEY)) showEditor();
else showGate();
