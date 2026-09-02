const PREVIEW_DATA_KEY = 'red-ant-site-data-preview-v1';

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function loadSiteData() {
  const published = window.RED_ANT_SITE_DATA || { music: [], chapters: [], translations: { en: {}, fr: {} } };
  try {
    const preview = localStorage.getItem(PREVIEW_DATA_KEY);
    if (preview) return JSON.parse(preview);
  } catch (error) {
    console.warn('Could not load editor preview data.', error);
  }
  return cloneData(published);
}

const siteData = loadSiteData();
let music = Array.isArray(siteData.music) ? siteData.music : [];
let chapters = Array.isArray(siteData.chapters) ? siteData.chapters : [];

const timeline = document.querySelector('#timeline');
const template = document.querySelector('#entryTemplate');
const searchInput = document.querySelector('#searchInput');
const filterGroup = document.querySelector('#filterGroup');
const emptyState = document.querySelector('#emptyState');
const decadeNav = document.querySelector('#decadeNav');
const storyModeButton = document.querySelector('#storyMode');
const cinemaStart = document.querySelector('#cinemaStart');
const trackCount = document.querySelector('#trackCount');
const memoryCount = document.querySelector('#memoryCount');
const chapterGrid = document.querySelector('#chapterGrid');

const storyStage = document.querySelector('#storyStage');
const storyClose = document.querySelector('#storyClose');
const storyPrev = document.querySelector('#storyPrev');
const storyNext = document.querySelector('#storyNext');
const storyAuto = document.querySelector('#storyAuto');
const storyCounter = document.querySelector('#storyCounter');
const storyProgress = document.querySelector('#storyProgress');
const storyMedia = document.querySelector('#storyMedia');
const storyArt = document.querySelector('#storyArt');
const storyEmbed = document.querySelector('#storyEmbed');
const storyYear = document.querySelector('#storyYear');
const storyFormat = document.querySelector('#storyFormat');
const storyChapter = document.querySelector('#storyChapter');
const storyArtist = document.querySelector('#storyArtist');
const storyTitle = document.querySelector('#storyTitle');
const storyMeta = document.querySelector('#storyMeta');
const storySourceNote = document.querySelector('#storySourceNote');
const storyMemory = document.querySelector('#storyMemory');
const storyMemoryText = document.querySelector('#storyMemoryText');
const storyMemoryPlace = document.querySelector('#storyMemoryPlace');
const storyWatch = document.querySelector('#storyWatch');
const storyDiscogs = document.querySelector('#storyDiscogs');
const languageSwitch = document.querySelector('.language-switch');
const languageButtons = [...document.querySelectorAll('[data-lang]')];
const storyMemoryLabel = document.querySelector('#storyMemoryLabel');

const translations = siteData.translations || { en: {}, fr: {} };

const LANGUAGE_KEY = 'red-ant-music-story-language-v1';
let activeFilter = 'ALL';
let visibleMusic = [...music];
let storyIndex = 0;
let autoTimer = null;
let currentLanguage = localStorage.getItem(LANGUAGE_KEY) === 'fr' ? 'fr' : 'en';

const HISTORY_APP_KEY = 'red-ant-music-story';
let historyReady = false;
let restoringHistory = false;

function t(key) {
  return translations[currentLanguage]?.[key] ?? translations.en[key] ?? key;
}

function chapterTitle(chapter) {
  return currentLanguage === 'fr' ? (chapter.titleFr || chapter.title) : chapter.title;
}

function chapterDescription(chapter) {
  return currentLanguage === 'fr' ? (chapter.descriptionFr || chapter.description) : chapter.description;
}

function itemNote(item) {
  if (currentLanguage === 'fr' && item.noteFr) return item.noteFr;
  return item.note || '';
}

function mediaLabel(type) {
  if (type === 'DISC') return currentLanguage === 'fr' ? 'VINYLE / DISQUE' : 'VINYL / DISC';
  return type;
}

function applyLanguage() {
  document.documentElement.lang = currentLanguage;
  document.title = currentLanguage === 'fr' ? 'Music Story by Red Ant — Autobiographie audiovisuelle' : 'Music Story by Red Ant — Audiovisual Autobiography';
  const metaDescription = document.querySelector('meta[name="description"]');
  if (metaDescription) metaDescription.content = currentLanguage === 'fr'
    ? 'Music Story by Red Ant — une autobiographie audiovisuelle personnelle racontée à travers disques, CD, vidéos et souvenirs.'
    : 'Music Story by Red Ant — a personal audiovisual autobiography told through records, CDs, videos and memories.';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (translations[currentLanguage]?.[key]) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    if (translations[currentLanguage]?.[key]) el.innerHTML = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (translations[currentLanguage]?.[key]) el.placeholder = t(key);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.dataset.i18nAria;
    if (translations[currentLanguage]?.[key]) el.setAttribute('aria-label', t(key));
  });
  languageButtons.forEach(button => {
    const active = button.dataset.lang === currentLanguage;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  try { localStorage.setItem(LANGUAGE_KEY, currentLanguage); } catch (_) {}
  renderChapters();
  updateCounts();
  render();
  if (!storyStage.hidden) updateStory();
}

function setLanguage(lang) {
  if (!translations[lang] || lang === currentLanguage) return;
  currentLanguage = lang;
  stopAuto();
  applyLanguage();
}

function numericYear(item) {
  const match = String(item.year).match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function itemKey(item) {
  return [item.year, item.artist, item.title].join('||');
}

function getChapter(item) {
  const year = numericYear(item);
  let winner = null;
  let winnerStart = -Infinity;
  let winnerIndex = -1;

  chapters.forEach((chapter, index) => {
    const start = Number(chapter.startYear ?? -Infinity);
    const end = Number(chapter.endYear ?? Infinity);
    if (year < start || year > end) return;

    // Chapters may intentionally overlap while the editor is being reorganized.
    // Prefer the chapter that starts latest; if starts are identical, prefer the
    // chapter appearing later in the editor. This lets a newly added chapter
    // take ownership without forcing the previous chapter's end year to change.
    if (start > winnerStart || (start === winnerStart && index > winnerIndex)) {
      winner = chapter;
      winnerStart = start;
      winnerIndex = index;
    }
  });

  return winner || chapters[0] || { id: 'archive', number: '00', era: '', title: 'Archive', titleFr: 'Archive', description: '', descriptionFr: '' };
}

function getMemory(item) {
  return item.memory || null;
}

function memoryTextForLanguage(memory) {
  if (!memory) return '';
  if (currentLanguage === 'fr') return memory.textFr || memory.text || '';
  return memory.text || memory.textFr || '';
}

function hasMemory(item) {
  const memory = getMemory(item);
  return !!(memory && Object.values(memory).some(value => String(value || '').trim()));
}

function updateCounts() {
  trackCount.textContent = `${music.length} ${currentLanguage === 'fr' ? 'moments' : 'moments'}`;
  const count = music.filter(hasMemory).length;
  if (currentLanguage === 'fr') memoryCount.textContent = `${count} ${count === 1 ? 'souvenir personnel' : 'souvenirs personnels'}`;
  else memoryCount.textContent = `${count} personal ${count === 1 ? 'memory' : 'memories'}`;
}

function searchUrl(item) {
  const q = encodeURIComponent(`${item.artist} ${item.title}`);
  return `https://www.youtube.com/results?search_query=${q}`;
}

function discogsUrl(item) {
  const q = encodeURIComponent(`${item.artist} ${item.title}`);
  return `https://www.discogs.com/search/?q=${q}&type=all`;
}

function youtubeVideoId(url) {
  if (!url) return null;
  const patterns = [
    /youtu\.be\/([\w-]{6,})/i,
    /youtube\.com\/watch\?.*v=([\w-]{6,})/i,
    /youtube\.com\/embed\/([\w-]{6,})/i,
    /youtube\.com\/shorts\/([\w-]{6,})/i
  ];
  for (const pattern of patterns) {
    const match = String(url).match(pattern);
    if (match) return match[1];
  }
  return null;
}

function youtubeEmbedUrl(url) {
  const videoId = youtubeVideoId(url);
  if (!videoId) return null;

  const params = new URLSearchParams({ rel: '0', playsinline: '1' });
  if (location.protocol === 'http:' || location.protocol === 'https:') {
    params.set('origin', location.origin);
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function isDirectLocalFile() {
  return location.protocol === 'file:';
}

function renderLocalVideoNotice(videoUrl) {
  const notice = document.createElement('div');
  notice.className = 'local-video-notice';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'local-video-notice__eyebrow';
  eyebrow.textContent = currentLanguage === 'fr' ? 'APERÇU LOCAL' : 'LOCAL PREVIEW';

  const title = document.createElement('strong');
  title.textContent = currentLanguage === 'fr'
    ? 'La vidéo YouTube nécessite un serveur local'
    : 'YouTube video needs a local server';

  const copy = document.createElement('p');
  copy.textContent = currentLanguage === 'fr'
    ? 'Cette page est ouverte directement depuis votre disque (file://). Lancez START-LOCAL-SERVER.bat puis ouvrez http://localhost:8000 pour éviter l’erreur YouTube 153.'
    : 'This page is opened directly from your disk (file://). Run START-LOCAL-SERVER.bat, then use http://localhost:8000 to avoid YouTube Error 153.';

  const link = document.createElement('a');
  link.href = videoUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  link.textContent = currentLanguage === 'fr' ? 'OUVRIR SUR YOUTUBE ↗' : 'OPEN ON YOUTUBE ↗';

  notice.append(eyebrow, title, copy, link);
  return notice;
}

function chapterSubtitle(decade) {
  const first = music.find(item => item.decade === decade);
  return first ? chapterTitle(getChapter(first)) : '';
}

function makeDecadeHeading(decade) {
  const heading = document.createElement('div');
  heading.className = 'decade-heading';
  heading.id = `decade-${decade}`;
  heading.dataset.decade = decade;

  const label = document.createElement('div');
  label.className = 'decade-heading__label';
  label.textContent = decade;

  const subtitle = document.createElement('p');
  subtitle.className = 'decade-heading__subtitle';
  subtitle.textContent = chapterSubtitle(decade);

  heading.append(label, subtitle);
  return heading;
}

function findChapterTarget(chapter) {
  const start = Number(chapter.startYear ?? -Infinity);
  const end = Number(chapter.endYear ?? Infinity);
  const ordered = music
    .map((item, index) => ({ item, index, year: numericYear(item) }))
    .filter(row => row.year > 0)
    .sort((a, b) => a.year - b.year || a.index - b.index);

  // First preference: the first actual track inside the chapter's configured range.
  return ordered.find(row => row.year >= start && row.year <= end)?.item
    // If the range currently has no tracks, go to the first track after its start.
    || ordered.find(row => row.year >= start)?.item
    // For a future chapter beyond the current archive, land on the latest track.
    || ordered.at(-1)?.item
    || null;
}

function performChapterJump(chapter, behavior = 'smooth') {
  const targetItem = findChapterTarget(chapter);
  if (!targetItem) return;

  // Chapter navigation should always work even if search/media filters are active.
  const targetKey = itemKey(targetItem);
  const findRenderedTarget = () => [...document.querySelectorAll('.entry')]
    .find(entry => entry.dataset.key === targetKey);

  let entry = findRenderedTarget();
  if (!entry) {
    searchInput.value = '';
    activeFilter = 'ALL';
    syncFilterButtons();
    render();
    entry = findRenderedTarget();
  }

  entry?.scrollIntoView({ behavior, block: 'center' });
}

function jumpToChapter(chapter) {
  if (historyReady && !restoringHistory) {
    rememberCurrentPageState();
    pushPageState({
      targetType: 'chapter',
      targetValue: chapter.id,
      search: searchInput.value,
      filter: activeFilter
    }, `#chapter-${encodeURIComponent(chapter.id)}`);
  }
  performChapterJump(chapter, 'smooth');
  refreshCurrentPageState();
}

function renderChapters() {
  chapterGrid.innerHTML = '';
  chapters.forEach(chapter => {
    const button = document.createElement('button');
    button.className = 'chapter-card';
    button.type = 'button';
    button.dataset.chapter = chapter.id;

    const number = document.createElement('span');
    number.className = 'chapter-card__num';
    number.textContent = `${currentLanguage === 'fr' ? 'CHAPITRE' : 'CHAPTER'} ${chapter.number}`;

    const era = document.createElement('span');
    era.className = 'chapter-card__era';
    era.textContent = chapter.era;

    const title = document.createElement('h3');
    title.textContent = chapterTitle(chapter);

    const description = document.createElement('p');
    description.textContent = chapterDescription(chapter);

    button.append(number, era, title, description);
    button.addEventListener('click', () => jumpToChapter(chapter));
    chapterGrid.appendChild(button);
  });
}

function renderDecadeNav() {
  decadeNav.innerHTML = '';
  [...new Set(music.map(item => item.decade))].forEach(decade => {
    const button = document.createElement('button');
    button.className = 'decade-link';
    button.type = 'button';
    button.textContent = decade;
    button.addEventListener('click', () => navigateToDecade(decade));
    decadeNav.appendChild(button);
  });
}

function memoryPreview(memory) {
  if (!memory) return '';
  const text = memoryTextForLanguage(memory) || memory.place || memory.period || '';
  if (!text) return currentLanguage === 'fr' ? 'Un souvenir média personnel est attaché à ce moment.' : 'A personal media memory is attached to this moment.';
  return text.length > 165 ? `${text.slice(0, 162)}…` : text;
}

function render() {
  const term = searchInput.value.trim().toLowerCase();
  visibleMusic = music.filter(item => {
    const memory = getMemory(item);
    const memoryHaystack = memory ? Object.values(memory).join(' ') : '';
    const haystack = [item.year, item.decade, item.artist, item.title, item.type, item.meta, item.note, item.noteFr, memoryHaystack]
      .filter(Boolean).join(' ').toLowerCase();
    const matchesSearch = !term || haystack.includes(term);
    const matchesFilter = activeFilter === 'ALL' || item.type === activeFilter || (activeFilter === 'MEMORY' && hasMemory(item));
    return matchesSearch && matchesFilter;
  });

  timeline.innerHTML = '';
  let currentDecade = null;

  visibleMusic.forEach((item, index) => {
    if (item.decade !== currentDecade) {
      currentDecade = item.decade;
      timeline.appendChild(makeDecadeHeading(currentDecade));
    }

    const fragment = template.content.cloneNode(true);
    const entry = fragment.querySelector('.entry');
    const open = fragment.querySelector('.entry__open');
    const memory = getMemory(item);
    const chapter = getChapter(item);

    entry.dataset.type = item.type;
    entry.dataset.decade = item.decade;
    entry.dataset.chapter = chapter.id;
    entry.dataset.key = itemKey(item);
    entry.classList.toggle('has-memory', hasMemory(item));
    entry.style.animationDelay = `${Math.min(index * 14, 280)}ms`;

    fragment.querySelector('.entry__year').textContent = item.year;

    const visual = fragment.querySelector('.entry__visual');
    const visualImage = fragment.querySelector('.entry__visual-image');
    const imageUrl = item.image || memory?.image || '';
    if (imageUrl) {
      visual.classList.add('has-image');
      visualImage.hidden = false;
      visualImage.src = imageUrl;
      visualImage.addEventListener('error', () => {
        visualImage.hidden = true;
        visual.classList.remove('has-image');
      }, { once: true });
    }

    fragment.querySelector('.entry__visual-year').textContent = item.year;
    fragment.querySelector('.entry__visual-type').textContent = chapter.number;
    fragment.querySelector('.entry__type').textContent = mediaLabel(item.type);
    fragment.querySelector('.entry__index').textContent = String(index + 1).padStart(2, '0');
    fragment.querySelector('.entry__artist').textContent = item.artist;
    fragment.querySelector('.entry__title').textContent = item.title;
    fragment.querySelector('.entry__meta').textContent = item.meta || '';
    fragment.querySelector('.entry__note').textContent = itemNote(item);

    fragment.querySelector('[data-entry-memory-label]').textContent = currentLanguage === 'fr' ? 'MON SOUVENIR' : 'MY MEMORY';
    fragment.querySelector('.entry__cta').textContent = currentLanguage === 'fr' ? 'OUVRIR CE MOMENT →' : 'OPEN THIS MOMENT →';

    const preview = fragment.querySelector('.entry__memory-preview');
    if (hasMemory(item)) {
      preview.hidden = false;
      preview.querySelector('p').textContent = memoryPreview(memory);
    }

    open.addEventListener('click', () => openStory(item));
    timeline.appendChild(fragment);
  });

  emptyState.hidden = visibleMusic.length > 0;
  observeDecades();
}

let observedHeadings = [];
const decadeObserver = new IntersectionObserver(entries => {
  const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!visible) return;
  const decade = visible.target.dataset.decade;
  [...decadeNav.children].forEach(button => button.classList.toggle('is-active', button.textContent === decade));
}, { rootMargin: '-18% 0px -68% 0px', threshold: [0, .25, .5, 1] });

function observeDecades() {
  observedHeadings.forEach(el => decadeObserver.unobserve(el));
  observedHeadings = [...document.querySelectorAll('.decade-heading')];
  observedHeadings.forEach(el => decadeObserver.observe(el));
}

function syncFilterButtons() {
  filterGroup.querySelectorAll('.filter').forEach(button => {
    button.classList.toggle('is-active', button.dataset.filter === activeFilter);
  });
}

function makePageState(extra = {}) {
  return {
    app: HISTORY_APP_KEY,
    view: 'page',
    scrollY: Math.round(window.scrollY),
    search: searchInput.value,
    filter: activeFilter,
    ...extra
  };
}

function rememberCurrentPageState() {
  if (!historyReady || restoringHistory) return;
  const state = history.state;
  if (state?.app !== HISTORY_APP_KEY || state.view !== 'page') return;
  history.replaceState({
    ...state,
    scrollY: Math.round(window.scrollY),
    search: searchInput.value,
    filter: activeFilter,
    exactScroll: true
  }, '', location.href);
}

function refreshCurrentPageState() {
  if (!historyReady || restoringHistory) return;
  const state = history.state;
  if (state?.app !== HISTORY_APP_KEY || state.view !== 'page') return;
  history.replaceState({
    ...state,
    scrollY: Math.round(window.scrollY),
    search: searchInput.value,
    filter: activeFilter
  }, '', location.href);
}

function pushPageState(extra, urlHash) {
  history.pushState(makePageState(extra), '', urlHash);
}

function storyUrl(item) {
  const globalIndex = music.findIndex(candidate => itemKey(candidate) === itemKey(item));
  return `#story-${Math.max(0, globalIndex) + 1}`;
}

function writeStoryHistory(item, action = 'push', forcedDepth = null) {
  if (!item) return;
  const current = history.state;
  const currentDepth = current?.app === HISTORY_APP_KEY && current.view === 'story'
    ? Number(current.storyDepth || 0)
    : 0;
  const depth = forcedDepth ?? (action === 'push' ? currentDepth + 1 : currentDepth);
  const state = {
    app: HISTORY_APP_KEY,
    view: 'story',
    trackKey: itemKey(item),
    search: searchInput.value,
    filter: activeFilter,
    storyDepth: depth
  };
  if (action === 'replace') history.replaceState(state, '', storyUrl(item));
  else history.pushState(state, '', storyUrl(item));
}

function performDecadeJump(decade, behavior = 'smooth') {
  const target = document.querySelector(`#decade-${CSS.escape(decade)}`);
  target?.scrollIntoView({ behavior, block: 'start' });
}

function navigateToDecade(decade) {
  if (historyReady && !restoringHistory) {
    rememberCurrentPageState();
    pushPageState({ targetType: 'decade', targetValue: decade }, `#decade-${encodeURIComponent(decade)}`);
  }
  performDecadeJump(decade, 'smooth');
  refreshCurrentPageState();
}

function performElementJump(id, behavior = 'smooth') {
  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

function navigateToElement(id) {
  if (historyReady && !restoringHistory) {
    rememberCurrentPageState();
    pushPageState({ targetType: 'element', targetValue: id }, `#${encodeURIComponent(id)}`);
  }
  performElementJump(id, 'smooth');
  refreshCurrentPageState();
}

function applySearchFilterState(state) {
  searchInput.value = state?.search || '';
  activeFilter = state?.filter || 'ALL';
  syncFilterButtons();
  render();
}

function restorePageState(state) {
  hideStory();
  applySearchFilterState(state);

  requestAnimationFrame(() => {
    if (state.exactScroll) {
      window.scrollTo({ top: Number(state.scrollY || 0), behavior: 'auto' });
    } else if (state.targetType === 'chapter') {
      const chapter = chapters.find(candidate => candidate.id === state.targetValue);
      if (chapter) performChapterJump(chapter, 'auto');
      else window.scrollTo({ top: Number(state.scrollY || 0), behavior: 'auto' });
    } else if (state.targetType === 'decade') {
      performDecadeJump(state.targetValue, 'auto');
    } else if (state.targetType === 'element') {
      performElementJump(state.targetValue, 'auto');
    } else {
      window.scrollTo({ top: Number(state.scrollY || 0), behavior: 'auto' });
    }
    restoringHistory = false;
  });
}

function restoreStoryState(state) {
  applySearchFilterState(state);
  const item = visibleMusic.find(candidate => itemKey(candidate) === state.trackKey)
    || music.find(candidate => itemKey(candidate) === state.trackKey);

  if (!item) {
    restoringHistory = false;
    restorePageState(makePageState({ scrollY: window.scrollY }));
    return;
  }

  openStory(item, { historyAction: 'none', storyDepth: state.storyDepth });
  restoringHistory = false;
}

function restoreHistoryState(state) {
  if (!state || state.app !== HISTORY_APP_KEY) return;
  restoringHistory = true;
  stopAuto();
  if (state.view === 'story') restoreStoryState(state);
  else restorePageState(state);
}

function initialStateFromLocation() {
  const base = makePageState({ scrollY: window.scrollY });
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  const storyMatch = hash.match(/^story-(\d+)$/);
  if (storyMatch) {
    const item = music[Number(storyMatch[1]) - 1];
    if (item) {
      return {
        app: HISTORY_APP_KEY,
        view: 'story',
        trackKey: itemKey(item),
        search: searchInput.value,
        filter: activeFilter,
        storyDepth: 0
      };
    }
  }
  if (hash === 'chapters' || hash === 'top') return { ...base, targetType: 'element', targetValue: hash };
  if (hash.startsWith('chapter-')) return { ...base, targetType: 'chapter', targetValue: hash.slice(8) };
  if (hash.startsWith('decade-')) return { ...base, targetType: 'decade', targetValue: hash.slice(7) };
  return base;
}

function setupBrowserHistory() {
  if (!window.history?.pushState) return;
  history.scrollRestoration = 'manual';
  history.replaceState(initialStateFromLocation(), '', location.href);
  historyReady = true;
  window.addEventListener('popstate', event => restoreHistoryState(event.state));

  document.querySelectorAll('a[href="#chapters"], a[href="#top"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      navigateToElement(link.getAttribute('href').slice(1));
    });
  });

  if (history.state?.view === 'story') {
    restoringHistory = true;
    restoreStoryState(history.state);
  }
}

function syncBodyLock() {
  const locked = !storyStage.hidden;
  document.body.classList.toggle('is-locked', locked);
}

function openStory(item, { historyAction = 'push', storyDepth = null } = {}) {
  const index = visibleMusic.findIndex(candidate => itemKey(candidate) === itemKey(item));
  storyIndex = index >= 0 ? index : 0;
  storyStage.hidden = false;
  storyStage.setAttribute('aria-hidden', 'false');
  storyModeButton.classList.add('is-active');
  syncBodyLock();
  updateStory();

  if (historyReady && !restoringHistory && historyAction !== 'none') {
    if (historyAction === 'push' && history.state?.view !== 'story') rememberCurrentPageState();
    writeStoryHistory(visibleMusic[storyIndex], historyAction, storyDepth);
  }
}

function hideStory() {
  stopAuto();
  storyStage.hidden = true;
  storyStage.setAttribute('aria-hidden', 'true');
  storyEmbed.innerHTML = '';
  storyModeButton.classList.remove('is-active');
  syncBodyLock();
}

function closeStory({ fromHistory = false } = {}) {
  if (!fromHistory && historyReady && history.state?.app === HISTORY_APP_KEY && history.state?.view === 'story') {
    const depth = Number(history.state.storyDepth || 0);
    if (depth > 0) {
      stopAuto();
      history.go(-depth);
      return;
    }
  }

  hideStory();
  if (!fromHistory && historyReady && !restoringHistory) {
    const item = visibleMusic[storyIndex];
    const state = makePageState({ scrollY: window.scrollY });
    history.replaceState(state, '', item ? `#track-${music.findIndex(candidate => itemKey(candidate) === itemKey(item)) + 1}` : '#timeline');
  }
}

function updateStory() {
  if (!visibleMusic.length) return;
  if (storyIndex < 0) storyIndex = visibleMusic.length - 1;
  if (storyIndex >= visibleMusic.length) storyIndex = 0;

  const item = visibleMusic[storyIndex];
  const chapter = getChapter(item);
  const memory = getMemory(item);
  const embedUrl = youtubeEmbedUrl(memory?.video);

  storyYear.textContent = item.year;
  storyFormat.textContent = mediaLabel(item.type);
  storyChapter.textContent = `${currentLanguage === 'fr' ? 'CHAPITRE' : 'CHAPTER'} ${chapter.number} / ${chapterTitle(chapter).toUpperCase()} / ${chapter.era}`;
  storyArtist.textContent = item.artist;
  storyTitle.textContent = item.title;
  storyMeta.textContent = item.meta || `${item.year} / ${item.type}`;
  storySourceNote.textContent = itemNote(item);
  storyCounter.textContent = `${String(storyIndex + 1).padStart(2, '0')} / ${String(visibleMusic.length).padStart(2, '0')}`;
  storyProgress.style.width = `${((storyIndex + 1) / visibleMusic.length) * 100}%`;
  storyArt.dataset.type = item.type;

  delete storyArt.dataset.image;
  storyArt.style.backgroundImage = '';
  if (memory?.image) {
    storyArt.dataset.image = 'true';
    storyArt.style.backgroundImage = `url("${String(memory.image).replace(/"/g, '%22')}")`;
  }

  storyEmbed.innerHTML = '';
  if (embedUrl && isDirectLocalFile()) {
    storyEmbed.appendChild(renderLocalVideoNotice(memory.video));
    storyEmbed.hidden = false;
    storyArt.hidden = false;
  } else if (embedUrl) {
    const iframe = document.createElement('iframe');
    iframe.src = embedUrl;
    iframe.title = `${item.artist} — ${item.title}`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    storyEmbed.appendChild(iframe);
    storyEmbed.hidden = false;
    storyArt.hidden = true;
  } else {
    storyEmbed.hidden = true;
    storyArt.hidden = false;
  }

  if (hasMemory(item)) {
    storyMemory.hidden = false;
    storyMemoryText.textContent = memoryTextForLanguage(memory) || (currentLanguage === 'fr' ? 'Un souvenir média personnel est attaché à ce morceau.' : 'A personal media memory is attached to this track.');
    const details = [memory.place, memory.period].filter(Boolean).join(' · ');
    storyMemoryPlace.textContent = details;
  } else {
    storyMemory.hidden = true;
    storyMemoryText.textContent = '';
    storyMemoryPlace.textContent = '';
  }

  storyWatch.href = memory?.video || searchUrl(item);
  storyWatch.textContent = memory?.video
    ? (currentLanguage === 'fr' ? 'OUVRIR LA VIDÉO ↗' : 'OPEN VIDEO ↗')
    : (item.type === 'VIDEO'
      ? (currentLanguage === 'fr' ? 'CHERCHER LA VIDÉO ↗' : 'FIND VIDEO ↗')
      : (currentLanguage === 'fr' ? 'ÉCOUTER ↗' : 'LISTEN ↗'));
  storyMemoryLabel.textContent = currentLanguage === 'fr' ? 'MON SOUVENIR' : 'MY MEMORY';
  storyPrev.textContent = currentLanguage === 'fr' ? '← PRÉC.' : '← PREV';
  storyNext.textContent = currentLanguage === 'fr' ? 'SUIV. →' : 'NEXT →';
  storyDiscogs.href = discogsUrl(item);
}

function nextStory({ historyAction = 'push' } = {}) {
  storyIndex += 1;
  updateStory();
  if (historyReady && !restoringHistory && historyAction !== 'none') {
    writeStoryHistory(visibleMusic[storyIndex], historyAction);
  }
}

function prevStory({ historyAction = 'push' } = {}) {
  storyIndex -= 1;
  updateStory();
  if (historyReady && !restoringHistory && historyAction !== 'none') {
    writeStoryHistory(visibleMusic[storyIndex], historyAction);
  }
}

function startAuto() {
  if (autoTimer || !visibleMusic.length) return;
  storyAuto.classList.add('is-active');
  storyAuto.textContent = '■ AUTO';
  autoTimer = setInterval(() => nextStory({ historyAction: 'replace' }), 6500);
}

function stopAuto() {
  if (autoTimer) clearInterval(autoTimer);
  autoTimer = null;
  storyAuto.classList.remove('is-active');
  storyAuto.textContent = '▶ AUTO';
}

function toggleAuto() {
  if (autoTimer) stopAuto();
  else startAuto();
}

searchInput.addEventListener('input', () => {
  stopAuto();
  render();
  refreshCurrentPageState();
});

filterGroup.addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (!button) return;
  activeFilter = button.dataset.filter;
  syncFilterButtons();
  stopAuto();
  render();
  refreshCurrentPageState();
});

storyModeButton.addEventListener('click', () => {
  if (!storyStage.hidden) closeStory();
  else if (visibleMusic.length) openStory(visibleMusic[0]);
});
cinemaStart.addEventListener('click', () => {
  if (visibleMusic.length) {
    openStory(visibleMusic[0]);
    startAuto();
  }
});
storyClose.addEventListener('click', closeStory);
storyPrev.addEventListener('click', prevStory);
storyNext.addEventListener('click', nextStory);
storyAuto.addEventListener('click', toggleAuto);
languageSwitch?.addEventListener('click', event => {
  const button = event.target.closest('[data-lang]');
  if (button) setLanguage(button.dataset.lang);
});

document.addEventListener('keydown', event => {
  if (storyStage.hidden) return;
  if (event.key === 'Escape') closeStory();
  if (event.key === 'ArrowRight') nextStory();
  if (event.key === 'ArrowLeft') prevStory();
  if (event.key === ' ') {
    event.preventDefault();
    toggleAuto();
  }
});

renderDecadeNav();
applyLanguage();
setupBrowserHistory();
