const STORAGE_KEY = 'minha-semana-blocks-v1';
const NOTES_KEY = 'minha-semana-notes-v1';

const CATALOG = {
  manha:    { label: 'Manhã',    icon: '🌅', color: 'oklch(0.91 0.03 230)', muted: true },
  trabalho: { label: 'Trabalho', icon: '💼', color: 'oklch(0.68 0.15 250)', muted: false },
  almoco:   { label: 'Almoço',   icon: '🍽️', color: 'oklch(0.91 0.04 90)',  muted: true },
  treino:   { label: 'Treino',   icon: '🏋️', color: 'oklch(0.68 0.15 150)', muted: false },
  estudo:   { label: 'Estudo',   icon: '📚', color: 'oklch(0.68 0.15 300)', muted: false },
  leitura:  { label: 'Leitura',  icon: '📖', color: 'oklch(0.75 0.15 70)',  muted: false },
  jantar:   { label: 'Jantar',   icon: '🍲', color: 'oklch(0.91 0.04 25)',  muted: true },
  lazer:    { label: 'Lazer',    icon: '🎉', color: 'oklch(0.68 0.19 25)',  muted: false },
  noite:    { label: 'Noite',    icon: '🌙', color: 'oklch(0.89 0.035 280)', muted: true },
};

const DEFAULT_BLOCKS = [
  { cat: 'manha',    time: '07:00–07:30', label: 'Rotina da manhã' },
  { cat: 'trabalho', time: '07:30–12:00', label: 'Trabalho' },
  { cat: 'almoco',   time: '12:00–13:00', label: 'Almoço e descanso' },
  { cat: 'treino',   time: '13:00–14:00', label: 'Treino' },
  { cat: 'estudo',   time: '14:00–18:00', label: 'Estudo' },
  { cat: 'leitura',  time: '18:00–18:30', label: 'Leitura' },
  { cat: 'jantar',   time: '18:30–19:00', label: 'Jantar' },
  { cat: 'lazer',    time: '19:00–22:00', label: 'Lazer' },
  { cat: 'noite',    time: '22:00–23:00', label: 'Rotina da noite' },
];

const DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
const DARK_TEXT = 'oklch(0.99 0.005 260)';
const LIGHT_TEXT = 'oklch(0.4 0.02 260)';
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)[–-]([01]?\d|2[0-3]):([0-5]\d)$/;

function loadBlocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BLOCKS.map((b) => ({ ...b }));
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length !== DEFAULT_BLOCKS.length) {
      return DEFAULT_BLOCKS.map((b) => ({ ...b }));
    }
    return DEFAULT_BLOCKS.map((block, i) => ({
      ...block,
      label: typeof saved[i]?.label === 'string' && saved[i].label.trim() ? saved[i].label : block.label,
      time: typeof saved[i]?.time === 'string' && TIME_RE.test(saved[i].time) ? saved[i].time : block.time,
      icon: typeof saved[i]?.icon === 'string' && saved[i].icon.trim() ? saved[i].icon.trim() : undefined,
    }));
  } catch (err) {
    return DEFAULT_BLOCKS.map((b) => ({ ...b }));
  }
}

function durationMinutes(time) {
  const m = TIME_RE.exec(time);
  if (!m) return 0;
  const start = Number(m[1]) * 60 + Number(m[2]);
  const end = Number(m[3]) * 60 + Number(m[4]);
  return Math.max(0, end - start);
}

function formatHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}min`;
  if (!m) return `${h}h`;
  return `${h}h${m}`;
}

function loadNotes() {
  const empty = () => DEFAULT_BLOCKS.map(() => DAYS.map(() => ''));
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    if (!raw) return empty();
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.length !== DEFAULT_BLOCKS.length) return empty();
    return DEFAULT_BLOCKS.map((_, i) =>
      DAYS.map((_, d) => (Array.isArray(saved[i]) && typeof saved[i][d] === 'string' ? saved[i][d] : ''))
    );
  } catch (err) {
    return empty();
  }
}

let blocks = loadBlocks();
let notes = loadNotes();

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(blocks.map((b) => ({ label: b.label, time: b.time, icon: b.icon })))
    );
  } catch (err) {}
}

function persistNotes() {
  try {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  } catch (err) {}
}

function makeEditable(el, onCommit, opts = {}) {
  el.contentEditable = 'true';
  el.spellcheck = false;
  el.addEventListener('blur', () => onCommit(el));
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !(opts.multiline && e.shiftKey)) {
      e.preventDefault();
      el.blur();
    }
  });
  el.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });
  if (opts.placeholder) {
    el.dataset.placeholder = opts.placeholder;
    const syncEmpty = () => el.classList.toggle('is-empty', !el.textContent.trim());
    el.addEventListener('input', syncEmpty);
    syncEmpty();
  }
}

function commitLabel(i, el) {
  const text = el.textContent.trim();
  const prev = blocks[i].label;
  if (!text || text === prev) { el.textContent = prev; return; }
  blocks[i] = { ...blocks[i], label: text };
  persist();
  renderLegend();
}

function commitIcon(i, el) {
  const text = el.textContent.trim();
  const prev = blocks[i].icon || CATALOG[blocks[i].cat].icon;
  if (!text || text === prev) { el.textContent = prev; return; }
  blocks[i] = { ...blocks[i], icon: text };
  persist();
  renderLegend();
  renderGrid();
}

function commitTime(i, el) {
  const raw = el.textContent.trim().replace(/\s*-\s*/, '–');
  const prev = blocks[i].time;
  const m = TIME_RE.exec(raw);
  if (!m || Number(m[3]) * 60 + Number(m[4]) <= Number(m[1]) * 60 + Number(m[2])) {
    el.textContent = prev;
    return;
  }
  const normalized = `${m[1].padStart(2, '0')}:${m[2]}–${m[3].padStart(2, '0')}:${m[4]}`;
  el.textContent = normalized;
  if (normalized === prev) return;
  blocks[i] = { ...blocks[i], time: normalized };
  persist();
  renderLegend();
}

function commitNote(i, d, el) {
  const text = el.textContent.trim();
  if (text === notes[i][d]) { el.textContent = text; return; }
  notes[i][d] = text;
  persistNotes();
}

function renderLegend() {
  const el = document.getElementById('legend');
  el.innerHTML = '';
  blocks.forEach((block, i) => {
    const meta = CATALOG[block.cat];
    const chip = document.createElement('div');
    chip.className = 'legend-item';

    const icon = document.createElement('div');
    icon.className = 'legend-icon';
    icon.style.background = meta.color;
    icon.textContent = block.icon || meta.icon;
    makeEditable(icon, (el) => commitIcon(i, el));

    const name = document.createElement('div');
    name.className = 'legend-name';
    name.textContent = block.label;
    makeEditable(name, (el) => commitLabel(i, el));

    chip.append(icon, name);
    el.appendChild(chip);
  });
}

function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';

  grid.appendChild(document.createElement('div'));
  for (const day of DAYS) {
    const el = document.createElement('div');
    el.className = 'day-header';
    el.textContent = day;
    grid.appendChild(el);
  }

  blocks.forEach((block, i) => {
    const meta = CATALOG[block.cat];
    const textColor = meta.muted ? LIGHT_TEXT : DARK_TEXT;

    const labelCell = document.createElement('div');
    labelCell.className = 'row-label';
    labelCell.style.background = meta.color;
    labelCell.style.color = textColor;

    const timeEl = document.createElement('div');
    timeEl.className = 'row-time';
    timeEl.textContent = block.time;
    makeEditable(timeEl, (el) => commitTime(i, el));

    const titleWrap = document.createElement('div');
    titleWrap.className = 'row-title-wrap';

    const iconEl = document.createElement('span');
    iconEl.className = 'row-icon';
    iconEl.textContent = block.icon || meta.icon;
    makeEditable(iconEl, (el) => commitIcon(i, el));

    const titleEl = document.createElement('span');
    titleEl.className = 'row-title';
    titleEl.textContent = block.label;
    makeEditable(titleEl, (el) => commitLabel(i, el));

    titleWrap.append(iconEl, titleEl);
    labelCell.append(timeEl, titleWrap);
    grid.appendChild(labelCell);

    for (let d = 0; d < DAYS.length; d++) {
      const cell = document.createElement('div');
      cell.className = 'row-cell';
      cell.style.background = meta.color;
      cell.style.color = textColor;

      const noteEl = document.createElement('div');
      noteEl.className = 'row-note';
      noteEl.textContent = notes[i][d];
      makeEditable(noteEl, (el) => commitNote(i, d, el), {
        multiline: true,
        placeholder: 'Observação…',
      });

      cell.appendChild(noteEl);
      grid.appendChild(cell);
    }
  });
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function exportToExcel() {
  const header = ['Horário', 'Atividade', ...DAYS];
  const rows = blocks.map((block, i) => [block.time, block.label, ...DAYS.map((_, d) => notes[i][d])]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\r\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'minha-semana.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('downloadBtn')?.addEventListener('click', exportToExcel);

renderLegend();
renderGrid();
