/* Aprender Jōyō Kanji — quiz de múltipla escolha
   - Card do kanji + 4 opções parecidas, embaralhadas a cada exibição
   - Alterna entre perguntar significado e leitura
   - Repetição espaçada simples via localStorage */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = {
    quiz: $('quiz'),
    prompt: $('prompt'),
    kanji: $('kanji'),
    cardMeta: $('card-meta'),
    options: $('options'),
    feedback: $('feedback'),
    next: $('btn-next'),
    score: $('stat-score'),
    streak: $('stat-streak'),
    acc: $('stat-acc'),
    grade: $('sel-grade'),
    mode: $('sel-mode'),
    reset: $('btn-reset'),
    dataCount: $('data-count'),
  };

  const STORE_KEY = 'joyo-kanji-progress-v1';

  // -------- estado de sessão --------
  let session = { score: 0, attempts: 0, streak: 0 };
  let progress = loadProgress(); // { "漢": {seen, correct} }
  let pool = [];                 // kanji filtrados pelo nível atual
  let current = null;            // questão atual
  let answered = false;
  let lastMode = 'reading';      // p/ alternar no modo "both"

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }
  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (e) {}
  }

  // -------- helpers de dados --------
  function meaningsOf(entry) {
    return entry.pt.length ? entry.pt : entry.en;
  }
  // string de significado p/ a opção (até 3 sentidos)
  function meaningText(entry) {
    return meaningsOf(entry).slice(0, 3).join(', ');
  }
  // leituras de um tipo, limpas para exibição
  function readingsOf(entry, type) {
    const arr = type === 'on' ? entry.on : entry.kun;
    return arr
      .map((r) => r.replace(/-/g, '').trim())
      .filter((r) => r.length > 0);
  }

  // similaridade entre duas strings de leitura (kana)
  function similarity(a, b) {
    if (a === b) return -999; // nunca igual ao correto
    const sa = new Set(a.split(''));
    let shared = 0;
    for (const ch of b) if (sa.has(ch)) shared++;
    return shared * 2 - Math.abs(a.length - b.length);
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // -------- montar pool por nível --------
  function rebuildPool() {
    const g = el.grade.value;
    pool = g === 'all' ? KANJI_DATA.slice() : KANJI_DATA.filter((k) => String(k.g) === g);
  }

  // escolha ponderada: prioriza kanji menos vistos / com mais erros
  function chooseKanji() {
    let totalW = 0;
    const weights = pool.map((k) => {
      const p = progress[k.k] || { seen: 0, correct: 0 };
      const errors = p.seen - p.correct;
      // novidade alta para não vistos; reforço para os errados
      const w = (p.seen === 0 ? 6 : 1) + errors * 2 + 1 / (p.seen + 1);
      totalW += w;
      return w;
    });
    let r = Math.random() * totalW;
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  // -------- gerar questão --------
  function decideMode() {
    const m = el.mode.value;
    if (m === 'meaning') return 'meaning';
    if (m === 'reading') return 'reading';
    // both: alterna
    lastMode = lastMode === 'meaning' ? 'reading' : 'meaning';
    return lastMode;
  }

  function buildMeaningQuestion(entry) {
    const correct = meaningText(entry);
    // distratores: outros kanji, preferindo o mesmo nível
    const sameGrade = pool.filter((k) => k.k !== entry.k && k.g === entry.g);
    const others = (sameGrade.length >= 12 ? sameGrade : KANJI_DATA).filter(
      (k) => k.k !== entry.k
    );
    const seen = new Set([correct.toLowerCase()]);
    const distractors = [];
    let guard = 0;
    while (distractors.length < 3 && guard++ < 500) {
      const t = meaningText(pick(others));
      const key = t.toLowerCase();
      if (t && !seen.has(key)) {
        seen.add(key);
        distractors.push(t);
      }
    }
    return {
      type: 'meaning',
      prompt: 'Qual o significado deste kanji?',
      kanji: entry.k,
      correct,
      options: shuffle([correct, ...distractors]),
      jpFont: false,
    };
  }

  function buildReadingQuestion(entry) {
    // escolhe um tipo de leitura disponível (prioriza on'yomi)
    const hasOn = entry.on.length > 0;
    const hasKun = entry.kun.length > 0;
    if (!hasOn && !hasKun) return buildMeaningQuestion(entry); // fallback raro
    const type = hasOn && (!hasKun || Math.random() < 0.6) ? 'on' : 'kun';
    const correctList = readingsOf(entry, type);
    if (correctList.length === 0) return buildMeaningQuestion(entry);
    const correct = pick(correctList);

    // candidatos: leituras do mesmo tipo de outros kanji
    const candidates = [];
    const seen = new Set([correct]);
    for (const k of KANJI_DATA) {
      if (k.k === entry.k) continue;
      for (const r of readingsOf(k, type)) {
        if (!seen.has(r)) {
          seen.add(r);
          candidates.push(r);
        }
      }
    }
    // ordena por similaridade ao correto e pega um leque entre os mais parecidos
    candidates.sort((a, b) => similarity(correct, b) - similarity(correct, a));
    const window = candidates.slice(0, Math.min(40, candidates.length));
    shuffle(window);
    const distractors = window.slice(0, 3);

    const label = type === 'on' ? "on'yomi" : "kun'yomi";
    return {
      type: 'reading',
      prompt: `Qual a leitura (${label}) deste kanji?`,
      kanji: entry.k,
      correct,
      options: shuffle([correct, ...distractors]),
      jpFont: true,
      entry,
    };
  }

  function nextQuestion() {
    answered = false;
    el.feedback.textContent = '';
    el.feedback.className = 'feedback';
    el.cardMeta.textContent = '';
    el.next.classList.add('hidden');

    const entry = chooseKanji();
    const mode = decideMode();
    current =
      mode === 'meaning' ? buildMeaningQuestion(entry) : buildReadingQuestion(entry);
    current.entryRef = entry;

    render();
  }

  function render() {
    el.prompt.textContent = current.prompt;
    el.kanji.textContent = current.kanji;
    el.options.innerHTML = '';
    current.options.forEach((opt) => {
      const b = document.createElement('button');
      b.className = 'option' + (current.jpFont ? ' reading-jp' : '');
      b.textContent = opt;
      b.addEventListener('click', () => onAnswer(opt, b));
      el.options.appendChild(b);
    });
  }

  function onAnswer(opt, btn) {
    if (answered) return;
    answered = true;
    const correct = opt === current.correct;
    const entry = current.entryRef;

    // atualiza progresso do kanji
    const p = progress[entry.k] || { seen: 0, correct: 0 };
    p.seen++;
    if (correct) p.correct++;
    progress[entry.k] = p;
    saveProgress();

    // atualiza sessão
    session.attempts++;
    if (correct) {
      session.score++;
      session.streak++;
    } else {
      session.streak = 0;
    }
    updateStats();

    // marca os botões
    [...el.options.children].forEach((b) => {
      b.disabled = true;
      if (b.textContent === current.correct) b.classList.add('correct');
    });
    if (!correct) btn.classList.add('wrong');

    // feedback + ficha completa do kanji (aprendizado)
    el.feedback.textContent = correct ? '✓ Correto!' : '✗ Resposta certa em verde';
    el.feedback.className = 'feedback ' + (correct ? 'ok' : 'no');
    el.cardMeta.innerHTML = fichaHTML(entry);
    el.next.classList.remove('hidden');
    el.next.focus();
  }

  function fichaHTML(entry) {
    const on = entry.on.length ? entry.on.join('、') : '—';
    const kun = entry.kun.length ? entry.kun.join('、') : '—';
    const mean = meaningsOf(entry).join(', ');
    return (
      `<b>${mean}</b><br>on: ${on} &nbsp;|&nbsp; kun: ${kun}` +
      ` &nbsp;|&nbsp; nível ${entry.g} · ${entry.s ?? '?'} traços`
    );
  }

  function updateStats() {
    el.score.textContent = session.score;
    el.streak.textContent = session.streak;
    el.acc.textContent = session.attempts
      ? Math.round((session.score / session.attempts) * 100) + '%'
      : '—';
  }

  // -------- eventos --------
  el.next.addEventListener('click', nextQuestion);
  el.grade.addEventListener('change', () => {
    rebuildPool();
    nextQuestion();
  });
  el.mode.addEventListener('change', nextQuestion);
  el.reset.addEventListener('click', () => {
    if (confirm('Zerar todo o progresso salvo e a sessão atual?')) {
      progress = {};
      saveProgress();
      session = { score: 0, attempts: 0, streak: 0 };
      updateStats();
      nextQuestion();
    }
  });
  // teclado: 1-4 escolhe opção, Enter/Espaço avança
  document.addEventListener('keydown', (e) => {
    if (!answered && /^[1-4]$/.test(e.key)) {
      const b = el.options.children[+e.key - 1];
      if (b) b.click();
    } else if (answered && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      nextQuestion();
    }
  });

  // -------- init --------
  el.dataCount.textContent = `${KANJI_DATA.length} kanji carregados.`;
  rebuildPool();
  updateStats();
  nextQuestion();
})();
