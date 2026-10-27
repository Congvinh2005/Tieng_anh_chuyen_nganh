/**
 * EIT Cram - English for IT Exam Revision Application
 * Safe, modern Vanilla JS following SecureCoder guidelines.
 */

// Global State
const STATE = {
  currentPart: 'part2', // Default to Part 2 (Fill in the blanks as requested)
  currentMode: 'fill',  // 'fill', 'choice', 'flashcard'
  filter: 'all',        // 'all', 'unattempted', 'wrong', 'bookmarked'
  isShuffled: false,
  currentIndex: 0,
  activeList: [],       // Array of items matching current part & filter
  soundEnabled: true,
  theme: 'dark',
  timerSeconds: 7200,   // 2 hours countdown (2 * 60 * 60 = 7200s)
  timerRunning: true,
  timerInterval: null,
  showingFeedback: false,
  cardFlipped: false
};

// Storage Keys
const STORAGE = {
  THEME: 'eit_theme',
  SOUND: 'eit_sound',
  TIMER: 'eit_timer',
  PROGRESS_PREFIX: 'eit_progress_',
  BOOKMARKS: 'eit_bookmarks'
};

// Web Audio API Synthesizer (No external media files required)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  if (!STATE.soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      // Pleasant bright chord
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.08); // A5
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'wrong') {
      // Gentle low soft buzz
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.linearRampToValueAtTime(164.81, now + 0.15); // E3
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'click') {
      // Subtle click
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (e) {
    // Ignore audio failures safely
  }
}

// Custom Non-blocking Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = document.createElement('span');
  icon.textContent = type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  
  const text = document.createElement('span');
  text.textContent = message;

  toast.appendChild(icon);
  toast.appendChild(text);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
    }, 300);
  }, 2500);
}

// LocalStorage Helpers
function getProgress(partKey) {
  try {
    const raw = localStorage.getItem(STORAGE.PROGRESS_PREFIX + partKey);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveProgress(partKey, progress) {
  try {
    localStorage.setItem(STORAGE.PROGRESS_PREFIX + partKey, JSON.stringify(progress));
  } catch (e) {
    // localStorage quota or disabled safely caught
  }
}

function getBookmarks() {
  try {
    const raw = localStorage.getItem(STORAGE.BOOKMARKS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function toggleBookmark(itemId) {
  const bookmarks = getBookmarks();
  const key = `${STATE.currentPart}_${itemId}`;
  const idx = bookmarks.indexOf(key);
  let isBookmarked = false;
  if (idx >= 0) {
    bookmarks.splice(idx, 1);
    isBookmarked = false;
    showToast('Đã bỏ đánh dấu sao', 'info');
  } else {
    bookmarks.push(key);
    isBookmarked = true;
    showToast('Đã đánh dấu sao câu hỏi ⭐', 'success');
  }
  try {
    localStorage.setItem(STORAGE.BOOKMARKS, JSON.stringify(bookmarks));
  } catch (e) {}

  updateBookmarkUI(isBookmarked);
  renderGridDrawer();
  return isBookmarked;
}

function isItemBookmarked(itemId) {
  const bookmarks = getBookmarks();
  const key = `${STATE.currentPart}_${itemId}`;
  return bookmarks.includes(key);
}

function updateBookmarkUI(isBookmarked) {
  const btn = document.getElementById('bookmarkBtn');
  const icon = document.getElementById('bookmarkIcon');
  if (!btn || !icon) return;

  if (isBookmarked) {
    btn.classList.add('active');
    icon.textContent = '★';
  } else {
    btn.classList.remove('active');
    icon.textContent = '☆';
  }
}

// ==========================================================================
// 2-Hour Study Countdown Timer
// ==========================================================================

function initTimer() {
  const savedTimer = localStorage.getItem(STORAGE.TIMER);
  if (savedTimer !== null) {
    const parsed = parseInt(savedTimer, 10);
    if (!isNaN(parsed) && parsed > 0) {
      STATE.timerSeconds = parsed;
    }
  }

  updateTimerDisplay();
  startTimer();

  const toggleBtn = document.getElementById('timerToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (STATE.timerRunning) {
        pauseTimer();
      } else {
        startTimer();
      }
    });
  }

  const resetBtn = document.getElementById('timerResetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      STATE.timerSeconds = 7200;
      updateTimerDisplay();
      startTimer();
      showToast('Đã đặt lại đồng hồ ôn thi 2 tiếng! ⏱️', 'info');
    });
  }
}

function startTimer() {
  if (STATE.timerInterval) clearInterval(STATE.timerInterval);
  STATE.timerRunning = true;
  const toggleBtn = document.getElementById('timerToggleBtn');
  if (toggleBtn) toggleBtn.textContent = '⏸️';

  STATE.timerInterval = setInterval(() => {
    if (STATE.timerSeconds > 0) {
      STATE.timerSeconds--;
      updateTimerDisplay();
      if (STATE.timerSeconds % 10 === 0) {
        localStorage.setItem(STORAGE.TIMER, STATE.timerSeconds.toString());
      }
      if (STATE.timerSeconds === 1800) { // 30 mins left
        showToast('Còn 30 phút ôn tập! Cố lên bạn ơi!', 'warning');
      } else if (STATE.timerSeconds === 0) {
        pauseTimer();
        showToast('Đã hết 2 tiếng ôn tập! Bạn đã sẵn sàng cho kỳ thi! 🎓', 'success');
      }
    }
  }, 1000);
}

function pauseTimer() {
  STATE.timerRunning = false;
  if (STATE.timerInterval) clearInterval(STATE.timerInterval);
  const toggleBtn = document.getElementById('timerToggleBtn');
  if (toggleBtn) toggleBtn.textContent = '▶️';
  localStorage.setItem(STORAGE.TIMER, STATE.timerSeconds.toString());
}

function updateTimerDisplay() {
  const display = document.getElementById('timerDisplay');
  if (!display) return;

  const h = Math.floor(STATE.timerSeconds / 3600);
  const m = Math.floor((STATE.timerSeconds % 3600) / 60);
  const s = STATE.timerSeconds % 60;

  const pad = (n) => n.toString().padStart(2, '0');
  display.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// ==========================================================================
// Theme & Sound Settings
// ==========================================================================

function initSettings() {
  // Theme
  const savedTheme = localStorage.getItem(STORAGE.THEME) || 'dark';
  setTheme(savedTheme);

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const nextTheme = STATE.theme === 'dark' ? 'light' : 'dark';
      setTheme(nextTheme);
    });
  }

  // Sound
  const savedSound = localStorage.getItem(STORAGE.SOUND);
  STATE.soundEnabled = savedSound !== 'false';
  updateSoundUI();

  const soundBtn = document.getElementById('soundToggleBtn');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      STATE.soundEnabled = !STATE.soundEnabled;
      localStorage.setItem(STORAGE.SOUND, STATE.soundEnabled.toString());
      updateSoundUI();
      if (STATE.soundEnabled) {
        playSound('correct');
        showToast('Đã bật âm thanh hiệu ứng 🔊', 'info');
      } else {
        showToast('Đã tắt âm thanh 🔇', 'info');
      }
    });
  }
}

function setTheme(theme) {
  STATE.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE.THEME, theme);
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.textContent = theme === 'dark' ? '🌙' : '☀️';
  }
}

function updateSoundUI() {
  const icon = document.getElementById('soundIcon');
  if (icon) {
    icon.textContent = STATE.soundEnabled ? '🔊' : '🔇';
  }
}

// ==========================================================================
// Part & Filter Data Management
// ==========================================================================

function getRawPartItems(partKey) {
  if (!window.STUDY_DATA || !window.STUDY_DATA[partKey]) return [];
  return window.STUDY_DATA[partKey].items || [];
}

function rebuildActiveList() {
  const rawItems = getRawPartItems(STATE.currentPart);
  const progress = getProgress(STATE.currentPart);
  const bookmarks = getBookmarks();

  let filtered = rawItems.filter(item => {
    const itemProg = progress[item.id];
    const isBm = bookmarks.includes(`${STATE.currentPart}_${item.id}`);

    if (STATE.filter === 'unattempted') {
      return !itemProg;
    }
    if (STATE.filter === 'wrong') {
      return itemProg && itemProg.status === 'wrong';
    }
    if (STATE.filter === 'bookmarked') {
      return isBm;
    }
    return true; // 'all'
  });

  if (STATE.isShuffled) {
    // Deterministic or pseudo-random shuffle
    filtered = [...filtered].sort(() => Math.random() - 0.5);
  } else {
    // Original syllabus order
    filtered.sort((a, b) => a.id - b.id);
  }

  STATE.activeList = filtered;
  if (STATE.currentIndex >= STATE.activeList.length) {
    STATE.currentIndex = Math.max(0, STATE.activeList.length - 1);
  }
}

// ==========================================================================
// UI Rendering Engine (Safe DOM manipulation strictly adhering to guidelines)
// ==========================================================================

function renderCurrentQuestion() {
  const cardContainer = document.getElementById('cardContainer');
  const promptEl = document.getElementById('questionPrompt');
  const vietnameseBox = document.getElementById('vietnameseBox');
  const vietnameseText = document.getElementById('vietnameseText');
  const partBadge = document.getElementById('partBadge');
  const counterBadge = document.getElementById('cardIndexBadge');
  const progressText = document.getElementById('progressText');
  const progressBarFill = document.getElementById('progressBarFill');
  const statusIndicator = document.getElementById('statusIndicator');
  const hintBox = document.getElementById('hintBox');

  // Reset card state classes
  cardContainer.classList.remove('state-correct', 'state-wrong');
  hintBox.style.display = 'none';
  hintBox.replaceChildren();
  hideFeedbackBanner();

  if (STATE.activeList.length === 0) {
    promptEl.replaceChildren();
    const emptyMsg = document.createElement('div');
    emptyMsg.style.textAlign = 'center';
    emptyMsg.style.padding = '30px 10px';

    const h3 = document.createElement('h3');
    h3.textContent = 'Không có câu hỏi nào theo bộ lọc này!';
    h3.style.marginBottom = '8px';

    const p = document.createElement('p');
    p.textContent = 'Hãy đổi bộ lọc sang "Tất cả câu hỏi" hoặc chọn phần khác để tiếp tục ôn luyện.';
    p.style.color = 'var(--text-secondary)';

    emptyMsg.appendChild(h3);
    emptyMsg.appendChild(p);
    promptEl.appendChild(emptyMsg);

    vietnameseBox.style.display = 'none';
    partBadge.textContent = 'Trống';
    counterBadge.textContent = '0 / 0';
    progressText.textContent = '0 / 0';
    progressBarFill.style.width = '0%';
    statusIndicator.style.display = 'none';
    updateBookmarkUI(false);
    hideAllInteractionAreas();
    updateStatsPills();
    renderGridDrawer();
    return;
  }

  const currentItem = STATE.activeList[STATE.currentIndex];
  const progress = getProgress(STATE.currentPart);
  const itemProg = progress[currentItem.id];

  // Update Part Indicator Badge
  if (STATE.currentPart === 'part1') {
    partBadge.textContent = 'Phần I: Thuật Ngữ';
  } else if (STATE.currentPart === 'part2') {
    partBadge.textContent = 'Phần II: Điền Từ';
  } else if (STATE.currentPart === 'part3') {
    partBadge.textContent = 'Phần III: Đúng / Sai';
  }

  // Update Counters & Progress Bar
  const totalCount = STATE.activeList.length;
  const currentNum = STATE.currentIndex + 1;
  counterBadge.textContent = `Câu ${currentItem.id} (${currentNum} / ${totalCount})`;
  progressText.textContent = `${currentNum} / ${totalCount}`;
  const pct = Math.round((currentNum / totalCount) * 100);
  progressBarFill.style.width = `${pct}%`;

  // Update Bookmark Star
  updateBookmarkUI(isItemBookmarked(currentItem.id));

  // Update Status Indicator (Correct/Wrong/Unattempted)
  if (itemProg) {
    statusIndicator.style.display = 'inline-block';
    if (itemProg.status === 'correct') {
      statusIndicator.textContent = '✓ Đã Làm Đúng';
      statusIndicator.className = 'status-indicator badge-correct';
      cardContainer.classList.add('state-correct');
    } else {
      statusIndicator.textContent = '✗ Làm Sai';
      statusIndicator.className = 'status-indicator badge-wrong';
      cardContainer.classList.add('state-wrong');
    }
  } else {
    statusIndicator.style.display = 'none';
  }

  // Render Prompt Content based on Part
  promptEl.replaceChildren();

  if (STATE.currentPart === 'part1') {
    // Matching Part: Show definition and ask for the Term
    const termLabel = document.createElement('div');
    termLabel.className = 'term-box';
    termLabel.textContent = `Thuật ngữ số ${currentItem.id}`;
    promptEl.appendChild(termLabel);

    const defP = document.createElement('p');
    defP.textContent = currentItem.definition;
    promptEl.appendChild(defP);

    if (currentItem.vietnamese) {
      vietnameseBox.style.display = 'block';
      vietnameseText.textContent = currentItem.vietnamese;
    } else {
      vietnameseBox.style.display = 'none';
    }
  } else if (STATE.currentPart === 'part2') {
    // Fill in the blanks: Render sentence with glowing blank placeholder
    vietnameseBox.style.display = 'none';
    const qText = currentItem.question;

    // Split sentence by dots (at least 3 dots or ellipsis)
    const parts = qText.split(/(?:[.]{3,}|…+)/);
    const container = document.createElement('p');

    if (parts.length >= 2) {
      const partBefore = document.createTextNode(parts[0]);
      container.appendChild(partBefore);

      const blankSpan = document.createElement('span');
      blankSpan.className = 'blank-placeholder';
      if (itemProg && itemProg.status === 'correct') {
        blankSpan.classList.add('filled');
        blankSpan.textContent = currentItem.answer;
      } else {
        blankSpan.textContent = '....................';
      }
      container.appendChild(blankSpan);

      const partAfter = document.createTextNode(parts[1]);
      container.appendChild(partAfter);
    } else {
      container.textContent = qText;
    }
    promptEl.appendChild(container);
  } else if (STATE.currentPart === 'part3') {
    // True / False statement
    vietnameseBox.style.display = 'none';
    const stmtP = document.createElement('p');
    stmtP.textContent = currentItem.statement;
    promptEl.appendChild(stmtP);
  }

  // Render appropriate interactive area based on mode and part
  renderInteractionArea(currentItem);
  updateStatsPills();
  renderGridDrawer();
}

function hideAllInteractionAreas() {
  document.getElementById('fillInteraction').style.display = 'none';
  document.getElementById('choiceInteraction').style.display = 'none';
  document.getElementById('tfInteraction').style.display = 'none';
  document.getElementById('flashcardInteraction').style.display = 'none';
}

function renderInteractionArea(item) {
  hideAllInteractionAreas();

  // Part 3 always defaults to T/F interactive buttons (unless in flashcard mode)
  if (STATE.currentPart === 'part3' && STATE.currentMode !== 'flashcard') {
    const tfArea = document.getElementById('tfInteraction');
    tfArea.style.display = 'block';
    setupTFButtons(item);
    return;
  }

  if (STATE.currentMode === 'flashcard') {
    const flashArea = document.getElementById('flashcardInteraction');
    flashArea.style.display = 'block';
    setupFlashcard(item);
    return;
  }

  if (STATE.currentMode === 'choice') {
    const choiceArea = document.getElementById('choiceInteraction');
    choiceArea.style.display = 'block';
    setupMultipleChoices(item);
    return;
  }

  // Default: Fill mode (Text Input)
  const fillArea = document.getElementById('fillInteraction');
  fillArea.style.display = 'block';
  const input = document.getElementById('answerInput');
  input.value = '';
  
  if (STATE.currentPart === 'part1') {
    input.placeholder = 'Gõ tên thuật ngữ tiếng Anh (ví dụ: A computer, CPU, ROM, DBMS...)...';
  } else {
    input.placeholder = 'Gõ từ / cụm từ cần điền vào đây rồi ấn Enter...';
  }
  
  setTimeout(() => input.focus(), 50);
}

// ==========================================================================
// Mode 1: Fill in the blanks (Type answer)
// ==========================================================================

function checkTypedAnswer() {
  if (STATE.activeList.length === 0) return;
  const currentItem = STATE.activeList[STATE.currentIndex];
  const input = document.getElementById('answerInput');
  const userTyped = input.value.trim();

  if (!userTyped) {
    showToast('Vui lòng gõ câu trả lời vào ô trống!', 'warning');
    input.focus();
    return;
  }

  const correctAnswer = STATE.currentPart === 'part1' ? currentItem.term : currentItem.answer;
  const isCorrect = normalizeString(userTyped) === normalizeString(correctAnswer);

  recordProgress(currentItem.id, isCorrect, userTyped);

  if (isCorrect) {
    playSound('correct');
    showFeedbackBanner(true, userTyped, correctAnswer, currentItem);
  } else {
    playSound('wrong');
    showFeedbackBanner(false, userTyped, correctAnswer, currentItem);
  }
}

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/^a\s+/i, '')       // ignore leading article 'a ' for terms
    .replace(/^an\s+/i, '')      // ignore leading article 'an '
    .replace(/^the\s+/i, '')     // ignore leading article 'the '
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') // ignore punctuations
    .replace(/\s+/g, ' ')        // collapse whitespace
    .trim();
}

function showHint() {
  if (STATE.activeList.length === 0) return;
  const currentItem = STATE.activeList[STATE.currentIndex];
  const correctAnswer = STATE.currentPart === 'part1' ? currentItem.term : currentItem.answer;

  const hintBox = document.getElementById('hintBox');
  hintBox.style.display = 'block';
  hintBox.replaceChildren();

  // Create masked hint: First letter revealed, others masked as underscores
  const words = correctAnswer.split(' ');
  const maskedWords = words.map(word => {
    if (word.length <= 1) return word;
    return word[0] + ' ' + '_ '.repeat(word.length - 1).trim();
  });

  const hintText = document.createElement('span');
  hintText.textContent = `Gợi ý (${correctAnswer.length} ký tự): ${maskedWords.join('   ')}`;
  hintBox.appendChild(hintText);
  playSound('click');
}

function revealAnswer() {
  if (STATE.activeList.length === 0) return;
  const currentItem = STATE.activeList[STATE.currentIndex];
  const correctAnswer = STATE.currentPart === 'part1' ? currentItem.term : currentItem.answer;

  recordProgress(currentItem.id, false, '[Xem đáp án]');
  playSound('click');
  showFeedbackBanner(false, 'Chưa trả lời (Đã bấm xem đáp án)', correctAnswer, currentItem);
}

// ==========================================================================
// Mode 2: Multiple Choice Generator (4 Plausible Choices)
// ==========================================================================

function setupMultipleChoices(currentItem) {
  const container = document.getElementById('choiceOptionsContainer');
  container.replaceChildren();

  const correctAnswer = STATE.currentPart === 'part1' ? currentItem.term : currentItem.answer;
  const allItems = getRawPartItems(STATE.currentPart);

  // Pick 3 random distractors
  const distractors = allItems
    .filter(it => it.id !== currentItem.id)
    .map(it => STATE.currentPart === 'part1' ? it.term : it.answer)
    .filter((ans, idx, arr) => arr.indexOf(ans) === idx && ans !== correctAnswer);

  // Shuffle distractors
  distractors.sort(() => Math.random() - 0.5);
  const choices = [correctAnswer, ...distractors.slice(0, 3)];
  choices.sort(() => Math.random() - 0.5);

  const keyLabels = ['1', '2', '3', '4'];
  choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.setAttribute('data-choice', choice);
    btn.setAttribute('data-index', (idx + 1).toString());

    const keySpan = document.createElement('span');
    keySpan.className = 'choice-key';
    keySpan.textContent = keyLabels[idx];

    const textSpan = document.createElement('span');
    textSpan.className = 'choice-text';
    textSpan.textContent = choice;

    btn.appendChild(keySpan);
    btn.appendChild(textSpan);

    btn.addEventListener('click', () => {
      handleChoiceSelection(choice, correctAnswer, currentItem, btn);
    });

    container.appendChild(btn);
  });
}

function handleChoiceSelection(selectedChoice, correctAnswer, currentItem, clickedBtn) {
  const container = document.getElementById('choiceOptionsContainer');
  const allBtns = container.querySelectorAll('.choice-btn');
  allBtns.forEach(b => b.disabled = true);

  const isCorrect = normalizeString(selectedChoice) === normalizeString(correctAnswer);
  recordProgress(currentItem.id, isCorrect, selectedChoice);

  if (isCorrect) {
    clickedBtn.classList.add('selected-correct');
    playSound('correct');
    showFeedbackBanner(true, selectedChoice, correctAnswer, currentItem);
  } else {
    clickedBtn.classList.add('selected-wrong');
    // highlight the correct one
    allBtns.forEach(b => {
      if (normalizeString(b.getAttribute('data-choice')) === normalizeString(correctAnswer)) {
        b.classList.add('selected-correct');
      }
    });
    playSound('wrong');
    showFeedbackBanner(false, selectedChoice, correctAnswer, currentItem);
  }
}

// ==========================================================================
// Mode 3: True / False Handler (Part 3)
// ==========================================================================

function setupTFButtons(currentItem) {
  const trueBtn = document.getElementById('tfTrueBtn');
  const falseBtn = document.getElementById('tfFalseBtn');

  trueBtn.disabled = false;
  falseBtn.disabled = false;
  trueBtn.classList.remove('selected-correct', 'selected-wrong');
  falseBtn.classList.remove('selected-correct', 'selected-wrong');

  const handleTFClick = (userChoice) => {
    trueBtn.disabled = true;
    falseBtn.disabled = true;

    const isCorrect = userChoice === currentItem.answer;
    recordProgress(currentItem.id, isCorrect, userChoice === 'T' ? 'Đúng (True)' : 'Sai (False)');

    const clickedBtn = userChoice === 'T' ? trueBtn : falseBtn;
    const otherBtn = userChoice === 'T' ? falseBtn : trueBtn;

    if (isCorrect) {
      clickedBtn.classList.add('selected-correct');
      playSound('correct');
      showFeedbackBanner(true, userChoice === 'T' ? 'ĐÚNG' : 'SAI', currentItem.answer === 'T' ? 'ĐÚNG (True)' : 'SAI (False)', currentItem);
    } else {
      clickedBtn.classList.add('selected-wrong');
      otherBtn.classList.add('selected-correct');
      playSound('wrong');
      showFeedbackBanner(false, userChoice === 'T' ? 'ĐÚNG' : 'SAI', currentItem.answer === 'T' ? 'ĐÚNG (True)' : 'SAI (False)', currentItem);
    }
  };

  trueBtn.onclick = () => handleTFClick('T');
  falseBtn.onclick = () => handleTFClick('F');
}

// ==========================================================================
// Mode 4: Flashcard 3D Flip
// ==========================================================================

function setupFlashcard(currentItem) {
  const box = document.getElementById('flashcardBox');
  const frontContent = document.getElementById('flashcardFrontContent');
  const answerTitle = document.getElementById('flashcardAnswerTitle');
  const backContent = document.getElementById('flashcardBackContent');

  STATE.cardFlipped = false;
  box.classList.remove('flipped');

  frontContent.replaceChildren();
  answerTitle.replaceChildren();
  backContent.replaceChildren();

  if (STATE.currentPart === 'part1') {
    frontContent.textContent = currentItem.definition;
    answerTitle.textContent = currentItem.term;
    if (currentItem.vietnamese) {
      const vnP = document.createElement('p');
      vnP.style.marginTop = '10px';
      vnP.style.color = 'var(--text-secondary)';
      vnP.style.fontSize = '1rem';
      vnP.textContent = `Dịch: ${currentItem.vietnamese}`;
      backContent.appendChild(vnP);
    }
  } else if (STATE.currentPart === 'part2') {
    frontContent.textContent = currentItem.question;
    answerTitle.textContent = currentItem.answer;
    const fullP = document.createElement('p');
    fullP.style.marginTop = '10px';
    fullP.style.color = 'var(--text-secondary)';
    fullP.textContent = currentItem.full_sentence;
    backContent.appendChild(fullP);
  } else if (STATE.currentPart === 'part3') {
    frontContent.textContent = currentItem.statement;
    answerTitle.textContent = currentItem.answer === 'T' ? 'ĐÚNG (True)' : 'SAI (False)';
    if (currentItem.explanation) {
      const expP = document.createElement('p');
      expP.style.marginTop = '10px';
      expP.style.color = 'var(--color-warning)';
      expP.textContent = `Giải thích: ${currentItem.explanation}`;
      backContent.appendChild(expP);
    }
  }

  box.onclick = flipFlashcard;
}

function flipFlashcard() {
  const box = document.getElementById('flashcardBox');
  if (!box) return;
  STATE.cardFlipped = !STATE.cardFlipped;
  if (STATE.cardFlipped) {
    box.classList.add('flipped');
  } else {
    box.classList.remove('flipped');
  }
  playSound('click');
}

// ==========================================================================
// Feedback Banner Engine
// ==========================================================================

function showFeedbackBanner(isCorrect, userVal, correctVal, currentItem) {
  STATE.showingFeedback = true;
  const banner = document.getElementById('feedbackBanner');
  const icon = document.getElementById('feedbackIcon');
  const title = document.getElementById('feedbackTitle');
  const userRow = document.getElementById('feedbackUserRow');
  const userValEl = document.getElementById('feedbackUserVal');
  const correctValEl = document.getElementById('feedbackCorrectVal');
  const fullSentRow = document.getElementById('feedbackFullSentRow');
  const fullSentEl = document.getElementById('feedbackFullSent');
  const expRow = document.getElementById('feedbackExplanationRow');
  const expEl = document.getElementById('feedbackExplanation');
  const vnRow = document.getElementById('feedbackVnRow');
  const vnEl = document.getElementById('feedbackVn');

  banner.style.display = 'flex';
  banner.className = `feedback-banner ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;

  icon.textContent = isCorrect ? '🎉' : '❌';
  title.textContent = isCorrect ? 'Chính xác! Xuất sắc lắm!' : 'Chưa chính xác!';

  if (!isCorrect && userVal) {
    userRow.style.display = 'flex';
    userValEl.textContent = userVal;
  } else {
    userRow.style.display = 'none';
  }

  correctValEl.textContent = correctVal;

  // Full sentence row (for Part 2)
  if (STATE.currentPart === 'part2' && currentItem.full_sentence) {
    fullSentRow.style.display = 'flex';
    fullSentEl.textContent = currentItem.full_sentence;
  } else {
    fullSentRow.style.display = 'none';
  }

  // Explanation row (for Part 3)
  if (STATE.currentPart === 'part3' && currentItem.explanation) {
    expRow.style.display = 'flex';
    expEl.textContent = currentItem.explanation;
  } else {
    expRow.style.display = 'none';
  }

  // Vietnamese translation (for Part 1)
  if (STATE.currentPart === 'part1' && currentItem.vietnamese) {
    vnRow.style.display = 'flex';
    vnEl.textContent = currentItem.vietnamese;
  } else {
    vnRow.style.display = 'none';
  }

  // Scroll smoothly to feedback if on mobile
  if (window.innerWidth <= 768) {
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Focus next button
  const nextBtn = document.getElementById('feedbackNextBtn');
  if (nextBtn) nextBtn.focus();
}

function hideFeedbackBanner() {
  STATE.showingFeedback = false;
  const banner = document.getElementById('feedbackBanner');
  if (banner) banner.style.display = 'none';
}

function recordProgress(itemId, isCorrect, userVal) {
  const progress = getProgress(STATE.currentPart);
  progress[itemId] = {
    status: isCorrect ? 'correct' : 'wrong',
    userVal: userVal,
    timestamp: Date.now()
  };
  saveProgress(STATE.currentPart, progress);

  updateStatsPills();
  renderGridDrawer();
}

// ==========================================================================
// Navigation & Stats
// ==========================================================================

function nextQuestion() {
  if (STATE.activeList.length === 0) return;
  playSound('click');
  if (STATE.currentIndex < STATE.activeList.length - 1) {
    STATE.currentIndex++;
    renderCurrentQuestion();
  } else {
    showToast('Bạn đã đi hết danh sách câu hỏi theo bộ lọc hiện tại! 🎯', 'success');
  }
}

function prevQuestion() {
  if (STATE.activeList.length === 0) return;
  playSound('click');
  if (STATE.currentIndex > 0) {
    STATE.currentIndex--;
    renderCurrentQuestion();
  } else {
    showToast('Đây là câu hỏi đầu tiên!', 'info');
  }
}

function updateStatsPills() {
  const rawItems = getRawPartItems(STATE.currentPart);
  const progress = getProgress(STATE.currentPart);

  let correctCount = 0;
  let wrongCount = 0;

  rawItems.forEach(item => {
    const p = progress[item.id];
    if (p) {
      if (p.status === 'correct') correctCount++;
      else if (p.status === 'wrong') wrongCount++;
    }
  });

  const remaining = rawItems.length - (correctCount + wrongCount);

  const elC = document.getElementById('statsCorrect');
  const elW = document.getElementById('statsWrong');
  const elR = document.getElementById('statsRemaining');

  if (elC) elC.textContent = correctCount.toString();
  if (elW) elW.textContent = wrongCount.toString();
  if (elR) elR.textContent = remaining.toString();
}

// ==========================================================================
// Question Grid Drawer (Map 1 to N)
// ==========================================================================

function renderGridDrawer() {
  const container = document.getElementById('gridButtonsContainer');
  if (!container) return;
  container.replaceChildren();

  const rawItems = getRawPartItems(STATE.currentPart);
  const progress = getProgress(STATE.currentPart);
  const bookmarks = getBookmarks();
  const currentItem = STATE.activeList[STATE.currentIndex];

  rawItems.forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'q-grid-btn';
    btn.textContent = item.id.toString();
    btn.setAttribute('data-id', item.id.toString());

    if (currentItem && currentItem.id === item.id) {
      btn.classList.add('current');
    }

    const itemProg = progress[item.id];
    if (itemProg) {
      if (itemProg.status === 'correct') btn.classList.add('correct');
      else if (itemProg.status === 'wrong') btn.classList.add('wrong');
    }

    if (bookmarks.includes(`${STATE.currentPart}_${item.id}`)) {
      btn.classList.add('bookmarked');
    }

    btn.addEventListener('click', () => {
      // Find index in activeList
      const targetIdx = STATE.activeList.findIndex(it => it.id === item.id);
      if (targetIdx !== -1) {
        STATE.currentIndex = targetIdx;
        renderCurrentQuestion();
      } else {
        // If question is filtered out, reset filter to 'all' and jump
        STATE.filter = 'all';
        const filterSelect = document.getElementById('filterSelect');
        if (filterSelect) filterSelect.value = 'all';
        rebuildActiveList();
        STATE.currentIndex = STATE.activeList.findIndex(it => it.id === item.id);
        renderCurrentQuestion();
        showToast(`Đã chuyển bộ lọc về "Tất cả" để xem câu ${item.id}`, 'info');
      }
      closeGridDrawer();
    });

    container.appendChild(btn);
  });
}

function toggleGridDrawer() {
  const drawer = document.getElementById('gridDrawer');
  if (!drawer) return;
  drawer.classList.toggle('open');
}

function closeGridDrawer() {
  const drawer = document.getElementById('gridDrawer');
  if (drawer) drawer.classList.remove('open');
}

// ==========================================================================
// Cheatsheet View (Full Reference / Quick Read 148 Items)
// ==========================================================================

let csFilter = 'all';
let csSearchQuery = '';

function initCheatsheet() {
  const input = document.getElementById('cheatsheetSearchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const printBtn = document.getElementById('printCheatSheetBtn');

  if (input) {
    input.addEventListener('input', (e) => {
      csSearchQuery = e.target.value.trim().toLowerCase();
      if (clearBtn) clearBtn.style.display = csSearchQuery ? 'block' : 'none';
      renderCheatsheetList();
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (input) input.value = '';
      csSearchQuery = '';
      clearBtn.style.display = 'none';
      renderCheatsheetList();
      if (input) input.focus();
    });
  }

  const filterBtns = document.querySelectorAll('.cs-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      csFilter = btn.getAttribute('data-cs-filter');
      renderCheatsheetList();
    });
  });

  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

function renderCheatsheetList() {
  const listEl = document.getElementById('cheatsheetList');
  const countEl = document.getElementById('cheatsheetCount');
  if (!listEl) return;
  listEl.replaceChildren();

  if (!window.STUDY_DATA) return;

  const results = [];

  // Gather Part 1 items
  if (csFilter === 'all' || csFilter === 'part1') {
    window.STUDY_DATA.part1.items.forEach(it => {
      results.push({ type: 'part1', item: it });
    });
  }

  // Gather Part 2 items
  if (csFilter === 'all' || csFilter === 'part2') {
    window.STUDY_DATA.part2.items.forEach(it => {
      results.push({ type: 'part2', item: it });
    });
  }

  // Gather Part 3 items
  if (csFilter === 'all' || csFilter === 'part3') {
    window.STUDY_DATA.part3.items.forEach(it => {
      results.push({ type: 'part3', item: it });
    });
  }

  // Apply search query
  const filtered = results.filter(entry => {
    if (!csSearchQuery) return true;
    const it = entry.item;
    if (entry.type === 'part1') {
      return it.term.toLowerCase().includes(csSearchQuery) ||
             it.definition.toLowerCase().includes(csSearchQuery) ||
             it.vietnamese.toLowerCase().includes(csSearchQuery);
    } else if (entry.type === 'part2') {
      return it.answer.toLowerCase().includes(csSearchQuery) ||
             it.full_sentence.toLowerCase().includes(csSearchQuery) ||
             it.question.toLowerCase().includes(csSearchQuery);
    } else if (entry.type === 'part3') {
      return it.statement.toLowerCase().includes(csSearchQuery) ||
             (it.explanation && it.explanation.toLowerCase().includes(csSearchQuery));
    }
    return false;
  });

  if (countEl) countEl.textContent = filtered.length.toString();

  if (filtered.length === 0) {
    const emptyP = document.createElement('p');
    emptyP.style.textAlign = 'center';
    emptyP.style.padding = '40px';
    emptyP.style.color = 'var(--text-secondary)';
    emptyP.textContent = 'Không tìm thấy câu nào phù hợp với từ khóa tìm kiếm!';
    listEl.appendChild(emptyP);
    return;
  }

  filtered.forEach(entry => {
    const card = document.createElement('div');
    card.className = 'cs-card';

    const header = document.createElement('div');
    header.className = 'cs-card-header';

    const tag = document.createElement('span');
    tag.className = 'cs-card-tag';

    const it = entry.item;
    if (entry.type === 'part1') {
      tag.textContent = `Phần I • Câu ${it.id}`;
      header.appendChild(tag);
      card.appendChild(header);

      const title = document.createElement('div');
      title.className = 'cs-term-title';
      title.textContent = `${it.id}. ${it.term}`;
      card.appendChild(title);

      const defP = document.createElement('p');
      defP.className = 'cs-text-content';
      defP.textContent = it.definition;
      card.appendChild(defP);

      if (it.vietnamese) {
        const vnP = document.createElement('p');
        vnP.className = 'cs-vn-content';
        vnP.textContent = `Dịch: ${it.vietnamese}`;
        card.appendChild(vnP);
      }
    } else if (entry.type === 'part2') {
      tag.textContent = `Phần II • Câu ${it.id}`;
      header.appendChild(tag);
      card.appendChild(header);

      // Render sentence with answer highlighted
      const sentP = document.createElement('p');
      sentP.className = 'cs-text-content';

      const parts = it.question.split(/(?:[.]{3,}|…+)/);
      if (parts.length >= 2) {
        sentP.appendChild(document.createTextNode(parts[0]));
        const ansSpan = document.createElement('span');
        ansSpan.className = 'cs-highlight-ans';
        ansSpan.textContent = it.answer;
        sentP.appendChild(ansSpan);
        sentP.appendChild(document.createTextNode(parts[1]));
      } else {
        sentP.textContent = it.full_sentence;
      }
      card.appendChild(sentP);
    } else if (entry.type === 'part3') {
      tag.textContent = `Phần III • Câu ${it.id}`;
      header.appendChild(tag);

      const badge = document.createElement('span');
      badge.className = `cs-tf-badge ${it.answer === 'T' ? 'badge-t' : 'badge-f'}`;
      badge.textContent = it.answer === 'T' ? 'ĐÚNG (True)' : 'SAI (False)';
      header.appendChild(badge);
      card.appendChild(header);

      const stmtP = document.createElement('p');
      stmtP.className = 'cs-text-content';
      stmtP.textContent = it.statement;
      card.appendChild(stmtP);

      if (it.explanation) {
        const expP = document.createElement('p');
        expP.className = 'cs-explanation';
        expP.textContent = `Giải thích: ${it.explanation}`;
        card.appendChild(expP);
      }
    }

    listEl.appendChild(card);
  });
}

// ==========================================================================
// Event Listeners & Keyboard Controller
// ==========================================================================

function initEventListeners() {
  // Navigation Tabs (Part Switcher)
  const navTabs = document.querySelectorAll('.nav-tab');
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const partKey = tab.getAttribute('data-part');
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      if (partKey === 'cheatsheet') {
        document.getElementById('quizToolbar').style.display = 'none';
        document.getElementById('quizView').style.display = 'none';
        document.getElementById('cheatsheetView').style.display = 'flex';
        renderCheatsheetList();
      } else {
        document.getElementById('quizToolbar').style.display = 'flex';
        document.getElementById('quizView').style.display = 'flex';
        document.getElementById('cheatsheetView').style.display = 'none';
        STATE.currentPart = partKey;
        STATE.currentIndex = 0;
        rebuildActiveList();
        renderCurrentQuestion();
      }
      playSound('click');
    });
  });

  // Mode Selector Buttons
  const modeBtns = document.querySelectorAll('.mode-btn');
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      STATE.currentMode = btn.getAttribute('data-mode');
      playSound('click');
      renderCurrentQuestion();
    });
  });

  // Filter Selector
  const filterSelect = document.getElementById('filterSelect');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      STATE.filter = e.target.value;
      STATE.currentIndex = 0;
      rebuildActiveList();
      renderCurrentQuestion();
      playSound('click');
    });
  }

  // Shuffle Toggle Button
  const shuffleBtn = document.getElementById('shuffleBtn');
  const shuffleText = document.getElementById('shuffleText');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      STATE.isShuffled = !STATE.isShuffled;
      if (STATE.isShuffled) {
        shuffleBtn.classList.add('active');
        shuffleText.textContent = 'Ngẫu Nhiên';
        showToast('Đã bật xáo trộn thứ tự câu hỏi! 🔀', 'info');
      } else {
        shuffleBtn.classList.remove('active');
        shuffleText.textContent = 'Theo Đề Cương';
        showToast('Đã quay về thứ tự đề cương 📑', 'info');
      }
      STATE.currentIndex = 0;
      rebuildActiveList();
      renderCurrentQuestion();
      playSound('click');
    });
  }

  // Reset Part Progress Button
  const resetBtn = document.getElementById('resetPartBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // Safe non-blocking custom action
      saveProgress(STATE.currentPart, {});
      rebuildActiveList();
      renderCurrentQuestion();
      showToast('Đã làm mới dữ liệu ôn tập phần này! Hãy bắt đầu lại từ đầu.', 'info');
    });
  }

  // Bookmark Star Button
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkBtn) {
    bookmarkBtn.addEventListener('click', () => {
      if (STATE.activeList.length === 0) return;
      const currentItem = STATE.activeList[STATE.currentIndex];
      toggleBookmark(currentItem.id);
    });
  }

  // Answer Form Submit
  const form = document.getElementById('answerForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      checkTypedAnswer();
    });
  }

  // Quick Helper Buttons (Hint & Reveal)
  const hintBtn = document.getElementById('hintBtn');
  if (hintBtn) hintBtn.addEventListener('click', showHint);

  const revealBtn = document.getElementById('revealBtn');
  if (revealBtn) revealBtn.addEventListener('click', revealAnswer);

  // Navigation Buttons
  const nextBtn = document.getElementById('nextQuestionBtn');
  if (nextBtn) nextBtn.addEventListener('click', nextQuestion);

  const prevBtn = document.getElementById('prevQuestionBtn');
  if (prevBtn) prevBtn.addEventListener('click', prevQuestion);

  const skipBtn = document.getElementById('skipQuestionBtn');
  if (skipBtn) skipBtn.addEventListener('click', nextQuestion);

  const feedbackNextBtn = document.getElementById('feedbackNextBtn');
  if (feedbackNextBtn) {
    feedbackNextBtn.addEventListener('click', () => {
      hideFeedbackBanner();
      nextQuestion();
    });
  }

  // Flashcard Controls
  const flashFlipBtn = document.getElementById('flashcardFlipBtn');
  if (flashFlipBtn) flashFlipBtn.addEventListener('click', flipFlashcard);

  const flashNextBtn = document.getElementById('flashcardNextBtn');
  if (flashNextBtn) flashNextBtn.addEventListener('click', nextQuestion);

  const flashPrevBtn = document.getElementById('flashcardPrevBtn');
  if (flashPrevBtn) flashPrevBtn.addEventListener('click', prevQuestion);

  // Grid Drawer Toggle & Close
  const toggleGridBtn = document.getElementById('toggleGridBtn');
  if (toggleGridBtn) toggleGridBtn.addEventListener('click', toggleGridDrawer);

  const closeGridDrawerBtn = document.getElementById('closeGridDrawerBtn');
  if (closeGridDrawerBtn) closeGridDrawerBtn.addEventListener('click', closeGridDrawer);

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', handleGlobalKeydown);
}

function handleGlobalKeydown(e) {
  // If user is focused on the search box in cheatsheet, let them type
  if (document.activeElement && document.activeElement.id === 'cheatsheetSearchInput') {
    return;
  }

  const isInputFocused = document.activeElement && document.activeElement.id === 'answerInput';

  // Enter Key: Check answer if input focused, or proceed to next if feedback showing
  if (e.key === 'Enter') {
    if (STATE.showingFeedback) {
      e.preventDefault();
      hideFeedbackBanner();
      nextQuestion();
      return;
    }
  }

  // Arrow Right: Next question (if not typing in input)
  if (e.key === 'ArrowRight' && !isInputFocused) {
    e.preventDefault();
    hideFeedbackBanner();
    nextQuestion();
    return;
  }

  // Arrow Left: Prev question (if not typing in input)
  if (e.key === 'ArrowLeft' && !isInputFocused) {
    e.preventDefault();
    hideFeedbackBanner();
    prevQuestion();
    return;
  }

  // If typing inside the answer input, allow standard text entry
  if (isInputFocused) {
    return;
  }

  // Flashcard Spacebar Flip
  if (e.code === 'Space' && STATE.currentMode === 'flashcard') {
    e.preventDefault();
    flipFlashcard();
    return;
  }

  // Key 'H' or 'h': Hint
  if (e.key === 'h' || e.key === 'H') {
    e.preventDefault();
    showHint();
    return;
  }

  // Key 'R' or 'r': Reveal Answer
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault();
    revealAnswer();
    return;
  }

  // Key 'S' or 's': Toggle Bookmark
  if (e.key === 's' || e.key === 'S') {
    e.preventDefault();
    if (STATE.activeList.length > 0) {
      const currentItem = STATE.activeList[STATE.currentIndex];
      toggleBookmark(currentItem.id);
    }
    return;
  }

  // Keys 1, 2, 3, 4: Select multiple choice option
  if (['1', '2', '3', '4'].includes(e.key) && STATE.currentMode === 'choice') {
    e.preventDefault();
    const btn = document.querySelector(`.choice-btn[data-index="${e.key}"]`);
    if (btn && !btn.disabled) {
      btn.click();
    }
    return;
  }

  // Keys T & F: True / False in Part 3
  if (STATE.currentPart === 'part3') {
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      const trueBtn = document.getElementById('tfTrueBtn');
      if (trueBtn && !trueBtn.disabled) trueBtn.click();
      return;
    }
    if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      const falseBtn = document.getElementById('tfFalseBtn');
      if (falseBtn && !falseBtn.disabled) falseBtn.click();
      return;
    }
  }
}

// ==========================================================================
// Application Bootstrap
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  initTimer();
  initCheatsheet();
  initEventListeners();

  rebuildActiveList();
  renderCurrentQuestion();

  showToast('Sẵn sàng ôn thi! Chúc bạn đạt kết quả cao nhất! 🚀', 'success');
});
