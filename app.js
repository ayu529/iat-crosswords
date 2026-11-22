/*
 * app.js — crossword layout generator + UI.
 * Data comes only from window.PuzzleAPI (see puzzles.js).
 */
(function () {
  'use strict';

  const WORDS_PER_PUZZLE = 9;   // target number of words in a grid
  const LAYOUT_ATTEMPTS = 40;   // random layouts tried; the best one wins
  const MAX_SIZE = 13;          // max rows/cols of a generated grid

  const key = (r, c) => r + ',' + c;
  const other = (d) => (d === 'across' ? 'down' : 'across');
  const DELTA = { across: [0, 1], down: [1, 0] };

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* =====================================================================
   * Layout generator
   * Places words on an unbounded grid so each new word crosses an existing
   * one, never touches another word side-by-side, and never extends one.
   * ===================================================================== */
  function generateLayout(entries) {
    const clean = entries
      .map((e) => ({ clue: e.clue, answer: String(e.answer).toUpperCase().replace(/[^A-Z]/g, '') }))
      .filter((e) => e.answer.length >= 2);

    let best = null;
    for (let t = 0; t < LAYOUT_ATTEMPTS; t++) {
      const layout = tryLayout(clean);
      if (!best || layout.score > best.score) best = layout;
    }
    return finalize(best);
  }

  function tryLayout(entries) {
    const pool = shuffle(entries.slice()).slice(0, WORDS_PER_PUZZLE + 3);
    pool.sort((a, b) => b.answer.length - a.answer.length);

    const cells = new Map(); // key -> { letter, across: bool, down: bool }
    const placed = [];
    const bounds = { minR: 0, maxR: 0, minC: 0, maxC: 0 };

    function canPlace(word, r, c, dir) {
      const [dr, dc] = DELTA[dir];
      const len = word.length;
      if (cells.has(key(r - dr, c - dc)) || cells.has(key(r + dr * len, c + dc * len))) return -1;

      const endR = r + dr * (len - 1), endC = c + dc * (len - 1);
      if (Math.max(bounds.maxR, endR) - Math.min(bounds.minR, r) + 1 > MAX_SIZE) return -1;
      if (Math.max(bounds.maxC, endC) - Math.min(bounds.minC, c) + 1 > MAX_SIZE) return -1;

      let crossings = 0;
      for (let i = 0; i < len; i++) {
        const rr = r + dr * i, cc = c + dc * i;
        const cell = cells.get(key(rr, cc));
        if (cell) {
          if (cell.letter !== word[i] || cell[dir]) return -1;
          crossings++;
        } else if (cells.has(key(rr + dc, cc + dr)) || cells.has(key(rr - dc, cc - dr))) {
          return -1; // would touch a parallel neighbour
        }
      }
      return crossings === len ? -1 : crossings;
    }

    function place(entry, r, c, dir) {
      const [dr, dc] = DELTA[dir];
      const w = entry.answer;
      for (let i = 0; i < w.length; i++) {
        const rr = r + dr * i, cc = c + dc * i;
        const k = key(rr, cc);
        const cell = cells.get(k) || { letter: w[i], across: false, down: false };
        cell[dir] = true;
        cells.set(k, cell);
        bounds.minR = Math.min(bounds.minR, rr); bounds.maxR = Math.max(bounds.maxR, rr);
        bounds.minC = Math.min(bounds.minC, cc); bounds.maxC = Math.max(bounds.maxC, cc);
      }
      placed.push({ ...entry, r, c, dir });
    }

    function findSpot(entry) {
      const w = entry.answer;
      const options = [];
      for (const [k, cell] of cells) {
        const [r, c] = k.split(',').map(Number);
        for (let i = 0; i < w.length; i++) {
          if (w[i] !== cell.letter) continue;
          for (const dir of ['across', 'down']) {
            if (cell[dir]) continue;
            const [dr, dc] = DELTA[dir];
            const sr = r - dr * i, sc = c - dc * i;
            const x = canPlace(w, sr, sc, dir);
            if (x > 0) options.push({ r: sr, c: sc, dir });
          }
        }
      }
      return options.length ? options[Math.floor(Math.random() * options.length)] : null;
    }

    place(pool[0], 0, 0, Math.random() < 0.5 ? 'across' : 'down');
    let remaining = pool.slice(1);
    let progress = true;
    while (progress && placed.length < WORDS_PER_PUZZLE && remaining.length) {
      progress = false;
      const next = [];
      for (const entry of remaining) {
        if (placed.length >= WORDS_PER_PUZZLE) break;
        const spot = findSpot(entry);
        if (spot) { place(entry, spot.r, spot.c, spot.dir); progress = true; }
        else next.push(entry);
      }
      remaining = next;
    }

    const area = (bounds.maxR - bounds.minR + 1) * (bounds.maxC - bounds.minC + 1);
    const squareness = Math.abs((bounds.maxR - bounds.minR) - (bounds.maxC - bounds.minC));
    return { placed, bounds, score: placed.length * 1000 - area - squareness * 5 };
  }

  /** Normalise to a 0-based grid and assign clue numbers. */
  function finalize({ placed, bounds }) {
    const rows = bounds.maxR - bounds.minR + 1;
    const cols = bounds.maxC - bounds.minC + 1;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(null));

    const words = placed.map((p) => {
      const [dr, dc] = DELTA[p.dir];
      const r0 = p.r - bounds.minR, c0 = p.c - bounds.minC;
      const cells = [];
      for (let i = 0; i < p.answer.length; i++) {
        const r = r0 + dr * i, c = c0 + dc * i;
        grid[r][c] = p.answer[i];
        cells.push([r, c]);
      }
      return { clue: p.clue, answer: p.answer, dir: p.dir, r: r0, c: c0, cells };
    });

    const starts = [...new Set(words.map((w) => key(w.r, w.c)))]
      .map((k) => k.split(',').map(Number))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const numbers = {};
    starts.forEach(([r, c], i) => (numbers[key(r, c)] = i + 1));
    words.forEach((w) => (w.number = numbers[key(w.r, w.c)]));

    const byNum = (a, b) => a.number - b.number;
    return {
      rows, cols, grid, numbers,
      across: words.filter((w) => w.dir === 'across').sort(byNum),
      down: words.filter((w) => w.dir === 'down').sort(byNum),
    };
  }

  /* =====================================================================
   * UI
   * ===================================================================== */
  const $ = (id) => document.getElementById(id);
  const boardWrap = $('boardWrap'), board = $('board');
  const acrossList = $('acrossList'), downList = $('downList');
  const clueBar = $('clueBar'), statusEl = $('status');
  const newBtn = $('newBtn'), checkBtn = $('checkBtn'), themeToggle = $('themeToggle');

  let puzzle = null;
  let bankId = null;
  let cellEls = [];        // [r][c] -> { wrap, input } | null
  let wordAt = {};         // "r,c" -> { across?: word, down?: word }
  let clueEls = new Map(); // word -> <li>
  let current = null;      // { r, c }
  let dir = 'across';
  let pointerOnActive = false;

  function render(p) {
    puzzle = p;
    board.innerHTML = '';
    board.classList.remove('solved');
    boardWrap.style.setProperty('--cols', p.cols);
    boardWrap.style.setProperty('--rows', p.rows);
    setStatus('');

    wordAt = {};
    for (const w of [...p.across, ...p.down]) {
      for (const [r, c] of w.cells) (wordAt[key(r, c)] ||= {})[w.dir] = w;
    }

    cellEls = p.grid.map((row, r) =>
      row.map((letter, c) => {
        const wrap = document.createElement('div');
        wrap.className = 'cell' + (letter ? ' open' : '');
        board.appendChild(wrap);
        if (!letter) return null;

        const num = p.numbers[key(r, c)];
        if (num) {
          const s = document.createElement('span');
          s.className = 'num';
          s.textContent = num;
          wrap.appendChild(s);
        }
        const input = document.createElement('input');
        input.type = 'text';
        input.autocomplete = 'off';
        input.autocapitalize = 'characters';
        input.spellcheck = false;
        input.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}`);
        let wordBeforeClick = null;
        input.addEventListener('pointerdown', () => {
          pointerOnActive = current && current.r === r && current.c === c && document.activeElement === input;
          wordBeforeClick = currentWord();
        });
        input.addEventListener('click', () => {
          if (pointerOnActive) toggleDir();
          // Clicking into a different word on an already-filled square (e.g. a shared
          // first letter) starts you at that word's next blank square instead.
          else if (currentWord() !== wordBeforeClick) snapToBlank();
          pointerOnActive = false;
        });
        input.addEventListener('focus', () => onFocusCell(r, c));
        input.addEventListener('keydown', (e) => onKey(e, r, c));
        input.addEventListener('input', () => onInput(r, c));
        wrap.appendChild(input);
        return { wrap, input };
      })
    );

    clueEls = new Map();
    for (const [list, words] of [[acrossList, p.across], [downList, p.down]]) {
      list.innerHTML = '';
      for (const w of words) {
        const li = document.createElement('li');
        li.innerHTML = `<span class="n">${w.number}</span><span></span>`;
        li.lastChild.textContent = `${w.clue} (${w.answer.length})`;
        li.addEventListener('click', () => goToWord(w));
        list.appendChild(li);
        clueEls.set(w, li);
      }
    }

    current = null;
    const first = p.across[0] || p.down[0];
    dir = first.dir;
    const [r0, c0] = first.cells[0];
    current = { r: r0, c: c0 };
    highlight();
    cellEls[r0][c0].input.focus({ preventScroll: true });
  }

  /* ---------- Selection & navigation ---------- */
  function currentWord() {
    if (!current) return null;
    const w = wordAt[key(current.r, current.c)];
    return w[dir] || w[other(dir)];
  }

  function go(r, c, d) {
    if (d) dir = d;
    const el = cellEls[r]?.[c]?.input;
    if (!el) return;
    if (document.activeElement === el) onFocusCell(r, c);
    else el.focus();
  }

  function onFocusCell(r, c) {
    current = { r, c };
    if (!wordAt[key(r, c)][dir]) dir = other(dir);
    highlight();
  }

  function toggleDir() {
    if (!current) return;
    const w = wordAt[key(current.r, current.c)];
    if (w[other(dir)]) { dir = other(dir); highlight(); snapToBlank(); }
  }

  const isBlank = ([r, c]) => !cellEls[r][c].input.value;
  const indexInWord = (w) => w.cells.findIndex(([r, c]) => r === current.r && c === current.c);

  /** Index of the nearest blank at/after `from` in the word, wrapping to the start; -1 if full. */
  function nextBlank(w, from) {
    for (let i = from; i < w.cells.length; i++) if (isBlank(w.cells[i])) return i;
    for (let i = 0; i < from; i++) if (isBlank(w.cells[i])) return i;
    return -1;
  }

  /** If the selected square is already filled, move to the next blank one in the current word. */
  function snapToBlank() {
    const w = currentWord();
    const i = indexInWord(w);
    if (!isBlank(w.cells[i])) {
      const j = nextBlank(w, i + 1);
      if (j >= 0) go(w.cells[j][0], w.cells[j][1], w.dir);
    }
  }

  /** After typing a letter: go to the next blank square, or one step on if the word is full. */
  function advanceAfterTyping() {
    const w = currentWord();
    const j = nextBlank(w, indexInWord(w) + 1);
    if (j >= 0) go(w.cells[j][0], w.cells[j][1], w.dir);
    else stepInWord(1);
  }

  function goToWord(w) {
    const empty = w.cells.find(([r, c]) => !cellEls[r][c].input.value);
    const [r, c] = empty || w.cells[0];
    go(r, c, w.dir);
  }

  function stepInWord(delta) {
    const w = currentWord();
    const i = w.cells.findIndex(([r, c]) => r === current.r && c === current.c);
    const target = w.cells[i + delta];
    if (target) go(target[0], target[1], w.dir);
    return !!target;
  }

  function moveLine(dr, dc) {
    let r = current.r + dr, c = current.c + dc;
    while (r >= 0 && c >= 0 && r < puzzle.rows && c < puzzle.cols) {
      if (cellEls[r][c]) return go(r, c);
      r += dr; c += dc;
    }
  }

  function cycleWord(delta) {
    const all = [...puzzle.across, ...puzzle.down];
    const i = all.indexOf(currentWord());
    goToWord(all[(i + delta + all.length) % all.length]);
  }

  function highlight() {
    for (const row of cellEls) for (const el of row) el && el.wrap.classList.remove('in-word', 'active');
    for (const li of clueEls.values()) li.classList.remove('active');
    const w = currentWord();
    if (!w) return;
    for (const [r, c] of w.cells) cellEls[r][c].wrap.classList.add('in-word');
    cellEls[current.r][current.c].wrap.classList.add('active');
    clueEls.get(w).classList.add('active');
    clueBar.textContent = `${w.number} ${w.dir === 'across' ? 'Across' : 'Down'}: ${w.clue}`;
  }

  /* ---------- Input ---------- */
  function setLetter(r, c, ch) {
    const el = cellEls[r][c];
    el.input.value = ch;
    el.wrap.classList.remove('wrong');
    board.classList.remove('solved');
  }

  function onKey(e, r, c) {
    const k = e.key;
    if (/^[a-z]$/i.test(k) && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      setLetter(r, c, k.toUpperCase());
      advanceAfterTyping();
      afterEdit();
    } else if (k === 'Backspace') {
      e.preventDefault();
      if (cellEls[r][c].input.value) setLetter(r, c, '');
      else if (stepInWord(-1)) setLetter(current.r, current.c, '');
      afterEdit();
    } else if (k === 'Delete') {
      e.preventDefault();
      setLetter(r, c, '');
      afterEdit();
    } else if (k.startsWith('Arrow')) {
      e.preventDefault();
      const axis = k === 'ArrowLeft' || k === 'ArrowRight' ? 'across' : 'down';
      if (axis !== dir && wordAt[key(r, c)][axis]) { dir = axis; highlight(); return; }
      const [dr, dc] = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[k];
      moveLine(dr, dc);
    } else if (k === 'Tab') {
      e.preventDefault();
      cycleWord(e.shiftKey ? -1 : 1);
    } else if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      toggleDir();
    }
  }

  // Fallback for mobile keyboards that don't report a usable key in keydown.
  function onInput(r, c) {
    const el = cellEls[r][c].input;
    const ch = el.value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    setLetter(r, c, ch);
    if (ch) advanceAfterTyping();
    afterEdit();
  }

  /* ---------- Checking ---------- */
  function eachCell(fn) {
    puzzle.grid.forEach((row, r) => row.forEach((letter, c) => letter && fn(r, c, letter, cellEls[r][c])));
  }

  function updateClueDone() {
    for (const [w, li] of clueEls) {
      li.classList.toggle('done', w.cells.every(([r, c]) => cellEls[r][c].input.value));
    }
  }

  function afterEdit() {
    updateClueDone();
    let full = true, correct = true;
    eachCell((r, c, letter, el) => {
      if (!el.input.value) full = false;
      else if (el.input.value !== letter) correct = false;
    });
    if (full && correct) {
      board.classList.add('solved');
      setStatus('Solved! Nice work.', 'ok');
    } else if (statusEl.classList.contains('ok')) {
      setStatus('');
    }
  }

  function check() {
    let wrong = 0, empty = 0;
    eachCell((r, c, letter, el) => {
      const v = el.input.value;
      if (!v) empty++;
      else if (v !== letter) { wrong++; el.wrap.classList.add('wrong'); }
    });
    if (wrong) setStatus(`${wrong} letter${wrong > 1 ? 's' : ''} wrong.`, 'bad');
    else if (empty) setStatus(`All correct so far — ${empty} to go.`, 'ok');
    else afterEdit();
  }

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  /* ---------- New puzzle ---------- */
  async function newPuzzle() {
    newBtn.disabled = true;
    try {
      const bank = await window.PuzzleAPI.getRandomBank(bankId);
      bankId = bank.id;
      render(generateLayout(bank.entries));
    } catch (err) {
      console.error(err);
      setStatus('Could not load a puzzle. Please try again.', 'bad');
    } finally {
      newBtn.disabled = false;
    }
  }

  /* ---------- Theme ---------- */
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    themeToggle.checked = t === 'dark';
    try { localStorage.setItem('theme', t); } catch (e) {}
  }

  themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked ? 'dark' : 'light'));
  newBtn.addEventListener('click', newPuzzle);
  checkBtn.addEventListener('click', check);

  applyTheme(document.documentElement.dataset.theme || 'dark');
  newPuzzle();

  // Exposed for testing in the console / later unit tests.
  window.Crossword = { generateLayout, get puzzle() { return puzzle; } };
})();
