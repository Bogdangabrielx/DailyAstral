const signs = [
  { symbol: '𓃵', ro: 'Berbec', en: 'Aries' },
  { symbol: '𓄀', ro: 'Taur', en: 'Taurus' },
  { symbol: '𓀤𓀥', ro: 'Gemeni', en: 'Gemini' },
  { symbol: '୨୧', ro: 'Rac', en: 'Cancer' },
  { symbol: '𓄂', ro: 'Leu', en: 'Leo' },
  { symbol: 'ఌ︎', ro: 'Fecioară', en: 'Virgo' },
  { symbol: 'Ω', ro: 'Balanță', en: ' Libra' },
  { symbol: '𓇙', ro: 'Scorpion', en: ' Scorpio' },
  { symbol: '➽', ro: 'Săgetător', en: 'Sagittarius' },
  { symbol: '𓄋', ro: 'Capricorn', en: 'Capricorn' },
  { symbol: 'ᨒ', ro: 'Vărsător', en: 'Aquarius' },
  { symbol: '𓆜', ro: 'Pești', en: 'Pisces' },
];

const wheel = document.getElementById('wheel');
const spinButton = document.getElementById('spinButton');
const resultEl = document.getElementById('result');
const langToggle = document.getElementById('langToggle');
const langIcon = document.getElementById('langIcon');
const appTitleEl = document.getElementById('appTitle');
const appSubtitleEl = document.getElementById('appSubtitle');
const headerTags = document.querySelectorAll('.app-header .tag-row .tag');
const zodiacOverlay = document.getElementById('zodiacOverlay');
const zodiacSelect = document.getElementById('zodiacSelect');
const zodiacConfirm = document.getElementById('zodiacConfirm');
const zodiacClose = document.getElementById('zodiacClose');
const zodiacPillRow = document.querySelector('.zodiac-pill-row');
const zodiacPills = document.querySelectorAll('.zodiac-pill');
const zodiacTitleEl = document.querySelector('#zodiacOverlay .zodiac-title');
const zodiacLabelEl = document.querySelector('#zodiacOverlay .zodiac-label');
const scrollOverlay = document.getElementById('scrollOverlay');
const scrollElement = document.querySelector('#scrollOverlay .scroll');
const scrollMessage = document.getElementById('scrollMessage');
const scrollTitle = document.getElementById('scrollTitle');
const scrollClose = document.getElementById('scrollClose');
const scrollFireworks = document.getElementById('scrollFireworks');
const zodiacErrorOverlay = document.getElementById('zodiacErrorOverlay');
const zodiacErrorMessage = document.getElementById('zodiacErrorMessage');
const zodiacErrorClose = document.getElementById('zodiacErrorClose');

const runtimeConfig = window.__APP_CONFIG__ || window.__SUPABASE__ || {};
const SUPABASE_MAX_IDX = Number.isFinite(Number(runtimeConfig.maxIdx)) ? Number(runtimeConfig.maxIdx) : 10000;
const DAILY_STEP = Number.isFinite(Number(runtimeConfig.dailyStep)) ? Number(runtimeConfig.dailyStep) : 36;

const I18N = {
  ro: {
    appTitle: 'Horoscop',
    appSubtitle:
      'Lasă stelele să aleagă pentru tine. Apasă pe buton și vezi ce mesaj are astăzi Universul pentru tine.',
    spinWheel: 'Învârte roata',
    chooseSignTitle: 'Alege-ți zodia',
    yourSignLabel: 'Zodia ta',
    selectSignPlaceholder: '– selectează zodia –',
    spin: 'Învârte',
    errPickCategory: 'Te rog selectează o categorie (Bani / Dragoste / Vibrație zilnică).',
    errPickSign: 'Te rog selectează mai întâi o zodie.',
    errTopicUsed: 'Ai folosit deja această categorie azi. Alege alta.',
    errAllUsed: 'Ai folosit deja toate cele 3 categorii azi. Revino mâine.',
    errMessageUnavailable: 'Mesaj indisponibil momentan.',
    scrollTitle: (topicLabel, signName) =>
      signName
        ? `${signName}  - ${topicLabel} ` 
        : 'Mesajul tău de astăzi',
    langAria: 'Schimbă limba',
  },
  en: {
    appTitle: 'Horoscope',
    appSubtitle: 'Let the stars choose for you. Tap the button and see what message the Universe has for you today.',
    spinWheel: 'Spin the wheel',
    chooseSignTitle: 'Choose your zodiac sign',
    yourSignLabel: 'Your zodiac sign',
    selectSignPlaceholder: '– select a sign –',
    spin: 'Spin',
    errPickCategory: 'Please select a category (Money / Love / Daily vibration).',
    errPickSign: 'Please select a zodiac sign first.',
    errTopicUsed: 'You already used this category today. Please choose another one.',
    errAllUsed: 'You already used all 3 categories today. Come back tomorrow.',
    errMessageUnavailable: 'Message temporarily unavailable.',
    scrollTitle: (topicLabel, signName) =>
      signName ? ` ${signName}  - ${topicLabel}` : 'Your message for today',
    langAria: 'Change language',
  },
};

const TOPIC_LABELS = {
  ro: {
    bani: '$ Bani',
    dragoste: '♡ Dragoste',
    ghidare: '☀︎ Vibrație zilnică',
  },
  en: {
    bani: '$ Money',
    dragoste: '♡ Love',
    ghidare: '☀︎ Daily vibration',
  },
};

const TOPICS = new Set(['bani', 'dragoste', 'ghidare']);

function getTopicLabel(topic, lang) {
  const labels = TOPIC_LABELS[lang] || TOPIC_LABELS.ro;
  return labels[topic] || '';
}

function getSignName(index, lang) {
  const entry = signs[index];
  if (!entry) {
    return '';
  }
  return lang === 'en' ? entry.en : entry.ro;
}

function getSignSymbol(index) {
  const entry = signs[index];
  return entry ? entry.symbol : '';
}

let currentLang = 'ro';

function t(key) {
  const table = I18N[currentLang] || I18N.ro;
  return table[key];
}

const segmentCount = signs.length;
const segmentAngle = 360 / segmentCount;
let spinTurns = 0;
let isSpinning = false;
let selectedTopic = null;
let currentTopicLabel = '';
let currentSignIndex = null;

const STORAGE_KEYS = {
  seedIdx: 'horoscop.seedIdx',
  seedDate: 'horoscop.seedDate',
  usedDate: 'horoscop.usedDate',
  usedTopics: 'horoscop.usedTopics',
  lang: 'horoscop.lang',
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map((x) => parseInt(x, 10));
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return { year, month, day };
}

function daysBetween(fromDateKey, toDateKey) {
  const from = parseDateKey(fromDateKey);
  const to = parseDateKey(toDateKey);
  if (!from || !to) {
    return 0;
  }
  const fromUtc = Date.UTC(from.year, from.month - 1, from.day);
  const toUtc = Date.UTC(to.year, to.month - 1, to.day);
  return Math.max(0, Math.floor((toUtc - fromUtc) / 86400000));
}

function wrapIdx(idx, maxIdx) {
  if (!Number.isFinite(idx) || !Number.isFinite(maxIdx) || maxIdx <= 0) {
    return 1;
  }
  return ((idx - 1) % maxIdx) + 1;
}

function getOrInitSeed() {
  const today = getLocalDateKey();
  const existingIdx = parseInt(localStorage.getItem(STORAGE_KEYS.seedIdx) || '', 10);
  const existingDate = localStorage.getItem(STORAGE_KEYS.seedDate);

  if (Number.isFinite(existingIdx) && existingIdx > 0 && typeof existingDate === 'string' && existingDate) {
    return { seedIdx: existingIdx, seedDate: existingDate };
  }

  const seedIdx = Math.floor(Math.random() * SUPABASE_MAX_IDX) + 1;
  localStorage.setItem(STORAGE_KEYS.seedIdx, String(seedIdx));
  localStorage.setItem(STORAGE_KEYS.seedDate, today);
  return { seedIdx, seedDate: today };
}

function getTodayIdx() {
  const today = getLocalDateKey();
  const { seedIdx, seedDate } = getOrInitSeed();
  const dayOffset = daysBetween(seedDate, today);
  return wrapIdx(seedIdx + dayOffset * DAILY_STEP, SUPABASE_MAX_IDX);
}

function getUsedTopics() {
  const today = getLocalDateKey();
  const usedDate = localStorage.getItem(STORAGE_KEYS.usedDate);
  if (usedDate !== today) {
    localStorage.setItem(STORAGE_KEYS.usedDate, today);
    localStorage.setItem(STORAGE_KEYS.usedTopics, JSON.stringify([]));
    return new Set();
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.usedTopics);
    const arr = JSON.parse(raw || '[]');
    if (Array.isArray(arr)) {
      return new Set(arr);
    }
  } catch {
    // ignore
  }
  return new Set();
}

function setUsedTopics(topicsSet) {
  const today = getLocalDateKey();
  localStorage.setItem(STORAGE_KEYS.usedDate, today);
  localStorage.setItem(STORAGE_KEYS.usedTopics, JSON.stringify(Array.from(topicsSet)));
}

function populateZodiacSelect() {
  if (!zodiacSelect) {
    return;
  }

  const previousValue = zodiacSelect.value;
  zodiacSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.textContent = t('selectSignPlaceholder');
  zodiacSelect.appendChild(placeholder);

  signs.forEach((_, index) => {
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = `${getSignName(index, currentLang)} ${getSignSymbol(index)}`.trim();
    zodiacSelect.appendChild(option);
  });

  if (previousValue) {
    zodiacSelect.value = previousValue;
  } else {
    zodiacSelect.value = '';
    placeholder.selected = true;
  }
}

function applyLanguage() {
  if (appTitleEl) {
    appTitleEl.textContent = t('appTitle');
  }
  if (appSubtitleEl) {
    appSubtitleEl.textContent = t('appSubtitle');
  }
  if (spinButton) {
    spinButton.textContent = t('spinWheel');
  }

  if (langToggle) {
    langToggle.setAttribute('aria-label', t('langAria'));
  }
  if (langIcon) {
    langIcon.src = currentLang === 'en' ? '/eng.png' : '/ro.png';
    langIcon.alt = currentLang.toUpperCase();
  }

  headerTags.forEach((tag) => {
    const topic = tag.getAttribute('data-topic');
    if (topic) {
      tag.textContent = getTopicLabel(topic, currentLang);
    }
  });

  syncCategoryButtons();

  if (zodiacTitleEl) {
    zodiacTitleEl.textContent = t('chooseSignTitle');
  }
  if (zodiacLabelEl) {
    zodiacLabelEl.textContent = t('yourSignLabel');
  }
  if (zodiacConfirm) {
    zodiacConfirm.textContent = t('spin');
  }

  populateZodiacSelect();

  if (selectedTopic) {
    currentTopicLabel = getTopicLabel(selectedTopic, currentLang);
  }

  if (scrollOverlay && scrollOverlay.classList.contains('scroll-overlay--open') && scrollTitle) {
    const topicLabel = currentTopicLabel || getTopicLabel(selectedTopic || '', currentLang);
    const signName = typeof currentSignIndex === 'number' ? getSignName(currentSignIndex, currentLang) : '';
    const table = I18N[currentLang] || I18N.ro;
    scrollTitle.textContent = table.scrollTitle(topicLabel, signName);
  }

  if (scrollOverlay && scrollOverlay.classList.contains('scroll-overlay--open') && scrollMessage && selectedTopic) {
    const todayIdx = getTodayIdx();
    fetchAnswerByIdxAndTopic(todayIdx, selectedTopic, currentLang)
      .then((message) => {
        scrollMessage.textContent = message || t('errMessageUnavailable');
      })
      .catch(() => {
        scrollMessage.textContent = t('errMessageUnavailable');
      });
  }
}

function setLangCookie(lang) {
  const maxAgeSeconds = 60 * 60 * 24 * 365;
  document.cookie = `horoscop.lang=${encodeURIComponent(lang)}; Max-Age=${maxAgeSeconds}; Path=/; SameSite=Lax`;
}

function persistLanguage(lang) {
  currentLang = lang === 'en' ? 'en' : 'ro';
  try {
    localStorage.setItem(STORAGE_KEYS.lang, currentLang);
  } catch {
    // ignore
  }
  try {
    setLangCookie(currentLang);
  } catch {
    // ignore
  }
}

function setLanguage(lang) {
  persistLanguage(lang);
  applyLanguage();
}

function normalizeTopic(topic) {
  return TOPICS.has(topic) ? topic : null;
}

function setSelectedTopic(nextTopic) {
  selectedTopic = normalizeTopic(nextTopic);
  currentTopicLabel = selectedTopic ? getTopicLabel(selectedTopic, currentLang) : '';
  syncCategoryButtons();
}

function syncCategoryButtons() {
  const used = getUsedTopics();
  headerTags.forEach((tag) => {
    const topic = normalizeTopic(tag.getAttribute('data-topic'));
    const isUsed = topic ? used.has(topic) : false;
    const isSelected = topic && topic === selectedTopic;

    if (tag instanceof HTMLButtonElement) {
      tag.disabled = Boolean(isUsed);
      tag.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    } else {
      tag.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    }

    tag.classList.toggle('tag--selected', Boolean(isSelected));
  });
}

function showZodiacError(message) {
  if (!zodiacErrorOverlay || !zodiacErrorMessage) {
    return;
  }
  zodiacErrorMessage.textContent = message;
  zodiacErrorOverlay.classList.add('scroll-overlay--open');
  const errorScroll = zodiacErrorOverlay.querySelector('.scroll');
  if (errorScroll) {
    errorScroll.classList.remove('scroll--visible');
    void errorScroll.offsetWidth;
    errorScroll.classList.add('scroll--visible');
  }
}

function updatePillAvailability() {
  const used = getUsedTopics();
  zodiacPills.forEach((pill) => {
    const topic = pill.getAttribute('data-topic');
    pill.classList.remove('zodiac-pill--disabled');
    if (topic && used.has(topic)) {
      pill.classList.add('zodiac-pill--disabled');
    }
  });
}

async function fetchAnswerByIdxAndTopic(idx, topic, lang = currentLang) {
  const apiUrl = `/api/answer?idx=${encodeURIComponent(String(idx))}&topic=${encodeURIComponent(
    String(topic),
  )}&lang=${encodeURIComponent(lang === 'en' ? 'en' : 'ro')}`;

  try {
    const res = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      const message = data && typeof data.message === 'string' ? data.message : '';
      return message;
    }
    // If we can't reach the API (ex: on a purely static host), fall back below.
    if (res.status !== 404) {
      throw new Error(`API error ${res.status}`);
    }
  } catch {
    // fall back below
  }

  const supabaseConfig = window.__SUPABASE__ || {};
  const SUPABASE_URL = supabaseConfig.url || '';
  const SUPABASE_ANON_KEY = supabaseConfig.anonKey || '';
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Answer API unavailable and Supabase config missing');
  }

  const suffix = lang === 'en' ? '_en' : '_ro';
  let column = '';
  if (topic === 'dragoste') {
    column = `love${suffix}`;
  } else if (topic === 'bani') {
    column = `money${suffix}`;
  } else if (topic === 'ghidare') {
    column = `daily_vibration${suffix}`;
  } else {
    throw new Error('Unknown topic');
  }

  const url = `${SUPABASE_URL}/rest/v1/answers?idx=eq.${encodeURIComponent(
    String(idx),
  )}&select=${encodeURIComponent(column)}`;

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Supabase error ${res.status}`);
  }
  const rows = await res.json();
  const first = Array.isArray(rows) ? rows[0] : null;
  const value = first ? first[column] : null;
  return typeof value === 'string' ? value : '';
}

function spinForIndex(targetIndex) {
  if (isSpinning) {
    return;
  }
  isSpinning = true;
  spinButton.disabled = true;
  if (resultEl) {
    resultEl.textContent = '';
  }
  if (scrollOverlay && scrollElement) {
    scrollOverlay.classList.remove('scroll-overlay--open');
    scrollElement.classList.remove('scroll--visible');
  }

  const index =
    typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex < segmentCount
      ? targetIndex
      : Math.floor(Math.random() * segmentCount);
  const fullSpins = 9 + Math.floor(Math.random() * 3); // 4-6 ture complete
  spinTurns += fullSpins;

  const centerAngle = (index + 0.5) * segmentAngle;
  const targetRotation = -(spinTurns * 360 + centerAngle);

  wheel.style.transform = `rotate(${targetRotation}deg)`;

  const todayIdx = getTodayIdx();
  const topic = selectedTopic || '';
  const messagePromise = fetchAnswerByIdxAndTopic(todayIdx, topic, currentLang);

  setTimeout(async () => {
    if (scrollOverlay && scrollElement && scrollMessage) {
      const topicLabel = currentTopicLabel || getTopicLabel(selectedTopic || '', currentLang);
      const signName = typeof currentSignIndex === 'number' ? getSignName(currentSignIndex, currentLang) : '';
      if (scrollTitle) {
        const table = I18N[currentLang] || I18N.ro;
        scrollTitle.textContent = table.scrollTitle(topicLabel, signName);
      }

      try {
        const message = await messagePromise;
        scrollMessage.textContent = message || t('errMessageUnavailable');
      } catch {
        scrollMessage.textContent = t('errMessageUnavailable');
      }

      if (scrollFireworks) {
        scrollFireworks.classList.remove('scroll-fireworks--active');
        // force reflow to restart animation
        void scrollFireworks.offsetWidth;
        scrollFireworks.classList.add('scroll-fireworks--active');
      }

      // restart animation
      scrollOverlay.classList.add('scroll-overlay--open');
      scrollElement.classList.remove('scroll--visible');
      // force reflow
      void scrollElement.offsetWidth;
      scrollElement.classList.add('scroll--visible');
    }
    spinButton.disabled = false;
    isSpinning = false;
  }, 7000);
}

headerTags.forEach((tag) => {
  tag.addEventListener('click', () => {
    const topic = normalizeTopic(tag.getAttribute('data-topic'));
    if (!topic) {
      return;
    }
    const used = getUsedTopics();
    if (used.has(topic)) {
      showZodiacError(t('errTopicUsed'));
      return;
    }
    setSelectedTopic(topic);
  });
});

spinButton.addEventListener('click', () => {
  if (!zodiacOverlay || !zodiacSelect) {
    spinForIndex();
    return;
  }
  if (isSpinning) {
    return;
  }

  const used = getUsedTopics();
  if (used.has('bani') && used.has('dragoste') && used.has('ghidare')) {
    showZodiacError(t('errAllUsed'));
    return;
  }

  if (!selectedTopic) {
    showZodiacError(t('errPickCategory'));
    return;
  }

  if (used.has(selectedTopic)) {
    showZodiacError(t('errTopicUsed'));
    return;
  }

  currentSignIndex = null;
  zodiacSelect.value = '';
  populateZodiacSelect();
  zodiacOverlay.classList.add('zodiac-overlay--open');
  const zodiacScroll = zodiacOverlay.querySelector('.scroll');
  if (zodiacScroll) {
    zodiacScroll.classList.remove('scroll--visible');
    // force reflow
    void zodiacScroll.offsetWidth;
    zodiacScroll.classList.add('scroll--visible');
  }
});

if (zodiacConfirm && zodiacOverlay && zodiacSelect) {
  zodiacConfirm.addEventListener('click', () => {
    if (!selectedTopic) {
      showZodiacError(t('errPickCategory'));
      return;
    }
    const used = getUsedTopics();
    if (used.has(selectedTopic)) {
      showZodiacError(t('errTopicUsed'));
      return;
    }
    const value = parseInt(zodiacSelect.value, 10);
    if (Number.isNaN(value)) {
      showZodiacError(t('errPickSign'));
      return;
    }
    currentSignIndex = value >= 0 && value < segmentCount ? value : null;

    used.add(selectedTopic);
    setUsedTopics(used);
    syncCategoryButtons();

    zodiacOverlay.classList.remove('zodiac-overlay--open');
    spinForIndex(value);
  });
}

if (zodiacClose && zodiacOverlay) {
  zodiacClose.addEventListener('click', () => {
    const zodiacScroll = zodiacOverlay.querySelector('.scroll');
    if (zodiacScroll) {
      zodiacScroll.classList.remove('scroll--visible');
    }
    zodiacOverlay.classList.remove('zodiac-overlay--open');
  });
}

if (scrollClose && scrollOverlay && scrollElement) {
  scrollClose.addEventListener('click', () => {
    scrollElement.classList.remove('scroll--visible');
    scrollOverlay.classList.remove('scroll-overlay--open');
  });
}

if (zodiacErrorClose && zodiacErrorOverlay) {
  zodiacErrorClose.addEventListener('click', () => {
    const errorScroll = zodiacErrorOverlay.querySelector('.scroll');
    if (errorScroll) {
      errorScroll.classList.remove('scroll--visible');
    }
    zodiacErrorOverlay.classList.remove('scroll-overlay--open');
  });
}

// init language
function getLangFromPathname(pathname) {
  const lower = String(pathname || '').toLowerCase();
  if (lower === '/en' || lower.startsWith('/en/')) {
    return 'en';
  }
  if (lower === '/ro' || lower.startsWith('/ro/')) {
    return 'ro';
  }
  return null;
}

const routeLang = getLangFromPathname(window.location.pathname);
let storedLang = null;
try {
  storedLang = localStorage.getItem(STORAGE_KEYS.lang);
} catch {
  storedLang = null;
}
setLanguage(routeLang || storedLang || 'ro');

if (langToggle) {
  langToggle.addEventListener('click', () => {
    const nextLang = currentLang === 'ro' ? 'en' : 'ro';
    const targetPath = nextLang === 'en' ? '/en/' : '/ro/';
    persistLanguage(nextLang);
    window.location.assign(targetPath);
  });
}
