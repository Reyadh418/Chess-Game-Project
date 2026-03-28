const MATCH_SETTINGS_KEY = 'aurumMatchSettings';
const UNLOCKS_KEY = 'aurumUnlocks';

const themes = [
    { id: 0, name: 'Tournament Green', light: '#d5d5d8', dark: '#6ea043' },
    { id: 1, name: 'Amberwood', light: '#f8f0df', dark: '#d8b889' },
    { id: 2, name: 'Mint Crest', light: '#e7fff3', dark: '#9de5c2' },
    { id: 3, name: 'Blush Silk', light: '#ffeef5', dark: '#f3a6cd' },
    { id: 4, name: 'Polar Sky', light: '#f2f7ff', dark: '#9fbdfc' },
    { id: 5, name: 'Violet Crown', light: '#f9f2ff', dark: '#c9a6f7' },
    { id: 6, name: 'Glacier Fade', light: '#eef6f7', dark: '#89b6c4' },
    { id: 7, name: 'Champagne', light: '#f7f3ef', dark: '#c7b09d' },
    { id: 8, name: 'Garden Glass', light: '#f6fff7', dark: '#b5f0c2' },
    { id: 9, name: 'Frosted Slate', light: '#f6f7fb', dark: '#bfc2d7' },
];

const storage = {
    get(key) {
        try {
            return localStorage.getItem(key);
        } catch (_) {
            return null;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (_) {
            // blocked storage mode; ignore
        }
    },
};

let mode = 'ai';
let difficulty = 'easy';
let timeControl = 'untimed';
let playerColor = 'random';
let activeTheme = 0;
let unlockCount = 1;

let modeAIButton;
let modePvpButton;
let aiControls;
let playerColorControls;
let unlockText;
let themeGrid;
let themeTemplate;
let timeButtons;

function init() {
    modeAIButton = document.getElementById('modeAI');
    modePvpButton = document.getElementById('modePvp');
    aiControls = document.getElementById('aiControls');
    playerColorControls = document.getElementById('playerColorControls');
    unlockText = document.getElementById('unlockText');
    themeGrid = document.getElementById('themeGrid');
    themeTemplate = document.getElementById('themeCardTemplate');
    timeButtons = document.querySelectorAll('#timeControls .chip');

    unlockCount = loadUnlocks();
    loadSavedSettings();

    bindControls();
    renderThemes();
    refreshUnlockDisplay();
    applyUiState();
}

function bindControls() {
    if (modeAIButton) modeAIButton.addEventListener('click', () => setMode('ai'));
    if (modePvpButton) modePvpButton.addEventListener('click', () => setMode('pvp'));

    document.querySelectorAll('#aiControls .seg').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#aiControls .seg').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            difficulty = btn.dataset.difficulty || 'easy';
            saveSettings();
        });
    });

    if (playerColorControls) {
        playerColorControls.querySelectorAll('.chip').forEach(btn => {
            btn.addEventListener('click', () => {
                playerColorControls.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                playerColor = btn.dataset.color || 'random';
                saveSettings();
            });
        });
    }

    timeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            timeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            timeControl = String(btn.dataset.time || 'untimed');
            saveSettings();
        });
    });

    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            saveSettings();
            window.location.href = 'focus.html';
        });
    }

    const resetBtn = document.getElementById('resetProgressBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            unlockCount = 1;
            if (activeTheme + 1 > unlockCount) activeTheme = 0;
            storage.set(UNLOCKS_KEY, '1');
            renderThemes();
            refreshUnlockDisplay();
            saveSettings();
        });
    }
}

function setMode(nextMode) {
    mode = nextMode === 'pvp' ? 'pvp' : 'ai';
    applyUiState();
    saveSettings();
}

function applyColorControlVisibility() {
    if (playerColorControls) {
        playerColorControls.style.display = mode === 'ai' ? 'block' : 'none';
    }
}

function applyUiState() {
    if (modeAIButton) modeAIButton.classList.toggle('active', mode === 'ai');
    if (modePvpButton) modePvpButton.classList.toggle('active', mode === 'pvp');
    if (aiControls) aiControls.style.display = mode === 'ai' ? 'block' : 'none';
    applyColorControlVisibility();

    document.querySelectorAll('#aiControls .seg').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
    });

    if (playerColorControls) {
        playerColorControls.querySelectorAll('.chip').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.color === playerColor);
        });
    }

    timeButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.time === timeControl);
    });
}

function renderThemes() {
    if (!themeTemplate || !themeGrid) return;
    themeGrid.innerHTML = '';

    themes.forEach(theme => {
        const card = themeTemplate.content.firstElementChild.cloneNode(true);
        card.classList.add(`theme-${theme.id}`);
        card.querySelector('.swatch').style.background = `linear-gradient(135deg, ${theme.light}, ${theme.dark})`;
        card.querySelector('.title').textContent = theme.name;
        card.dataset.theme = String(theme.id);

        const locked = theme.id + 1 > unlockCount;
        card.classList.toggle('locked', locked);
        card.querySelector('.lock').textContent = locked ? 'Locked' : 'Unlocked';
        if (!locked) {
            card.addEventListener('click', () => {
                activeTheme = theme.id;
                saveSettings();
                highlightTheme();
            });
        }

        if (activeTheme === theme.id) {
            card.classList.add('active');
        }

        themeGrid.appendChild(card);
    });
}

function highlightTheme() {
    document.querySelectorAll('.theme-card').forEach(card => {
        const id = Number(card.dataset.theme);
        card.classList.toggle('active', id === activeTheme);
    });
}

function refreshUnlockDisplay() {
    if (unlockText) unlockText.textContent = `${unlockCount} / 10`;
}

function loadUnlocks() {
    const raw = storage.get(UNLOCKS_KEY);
    const parsed = raw ? parseInt(raw, 10) : 1;
    return Math.min(Math.max(Number.isFinite(parsed) ? parsed : 1, 1), 10);
}

function loadSavedSettings() {
    const raw = storage.get(MATCH_SETTINGS_KEY);
    if (!raw) return;
    try {
        const saved = JSON.parse(raw);
        mode = saved && saved.mode === 'pvp' ? 'pvp' : 'ai';
        difficulty = saved && ['easy', 'medium', 'hard', 'grandmaster'].includes(saved.difficulty) ? saved.difficulty : 'easy';
        playerColor = saved && ['white', 'black', 'random'].includes(saved.playerColor) ? saved.playerColor : 'random';
        timeControl = saved && ['untimed', '180', '600'].includes(String(saved.timeControl)) ? String(saved.timeControl) : 'untimed';
        const requestedTheme = Number(saved && saved.theme);
        if (Number.isFinite(requestedTheme) && requestedTheme >= 0 && requestedTheme < themes.length && requestedTheme + 1 <= unlockCount) {
            activeTheme = requestedTheme;
        } else {
            activeTheme = 0;
        }
    } catch (_) {
        // ignore malformed saved settings
    }
}

function saveSettings() {
    storage.set(MATCH_SETTINGS_KEY, JSON.stringify({
        mode,
        difficulty,
        playerColor,
        timeControl,
        theme: activeTheme,
    }));
}

window.addEventListener('DOMContentLoaded', init);
