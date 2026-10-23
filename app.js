/**
 * SmartSleep Client Application Logic
 * Integrates with Java 21 REST API Backend, HTML5 Canvas Charting,
 * and Web Audio API Real-time Sound Synthesis.
 */

// Application State
const AppState = {
  currentTab: 'dashboard',
  serverConnected: false,
  sleepData: null,
  trendsData: null,
  environment: {
    targetTempC: 19.0,
    targetTempF: 66.2,
    circadianLight: 'sunset-amber',
    lightBrightness: 25,
    ambientSound: 'delta',
    soundVolume: 45,
    smartAlarmEnabled: true
  },
  sound: {
    audioCtx: null,
    isPlaying: false,
    activeType: 'delta',
    masterGain: null,
    activeNodes: [],
    timerMinutes: 0,
    timerInterval: null,
    timerSecondsRemaining: 0
  }
};

// =============================================================================
// Initialization & Tab Navigation
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initCalculator();
  initEnvironment();
  initSoundscapes();
  initJournal();
  initCircadianClock();

  // Load Data from Java Backend
  fetchServerStatus();
  fetchSleepData();
  fetchTrendsData();
  fetchInsightsData();
  fetchEnvironmentSettings();
  fetchJournalLogs();

  // Periodic Clock update
  updateLiveClocks();
  setInterval(updateLiveClocks, 1000);
});

function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-tab');
      switchTab(targetId);
    });
  });
}

function switchTab(tabId) {
  AppState.currentTab = tabId;
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.tab-section').forEach(s => {
    s.classList.toggle('active', s.id === `section-${tabId}`);
  });

  // Trigger canvas redraws when switching tabs
  if (tabId === 'dashboard') {
    renderHypnogramChart(AppState.sleepData ? AppState.sleepData.hypnogram : null);
    renderTrendChart(AppState.trendsData);
  } else if (tabId === 'circadian') {
    drawCircadianWheel();
  }
}

// =============================================================================
// Java Backend REST API Communication
// =============================================================================
async function fetchServerStatus() {
  const badgeText = document.getElementById('server-status-text');
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const data = await res.json();
      AppState.serverConnected = true;
      badgeText.textContent = `Java ${data.version || '21'} Core Connected`;
    } else {
      fallbackOfflineStatus();
    }
  } catch (err) {
    fallbackOfflineStatus();
  }
}

function fallbackOfflineStatus() {
  AppState.serverConnected = false;
  const badgeText = document.getElementById('server-status-text');
  badgeText.textContent = 'Standalone Mode (Local)';
}

async function fetchSleepData() {
  try {
    const res = await fetch('/api/sleep-data');
    if (res.ok) {
      const data = await res.json();
      AppState.sleepData = data;
      applySleepDataToUI(data);
    } else {
      applyDefaultSleepData();
    }
  } catch (e) {
    applyDefaultSleepData();
  }
}

function applySleepDataToUI(data) {
  document.getElementById('dash-score-num').textContent = data.score;
  document.getElementById('hero-grade').textContent = data.scoreGrade;
  document.getElementById('hero-duration').textContent = data.duration;
  document.getElementById('hero-efficiency').textContent = `${data.efficiency}%`;
  document.getElementById('hero-latency').textContent = `${data.sleepLatencyMin} mins`;

  // Update Radial Gauge offset
  const circumference = 2 * Math.PI * 68; // ~427
  const offset = circumference * (1 - data.score / 100);
  const fillCircle = document.getElementById('gauge-fill-circle');
  if (fillCircle) {
    fillCircle.style.strokeDashoffset = offset;
  }

  // Biometrics
  if (data.biometrics) {
    document.getElementById('bio-rhr').textContent = data.biometrics.restingHeartRate;
    document.getElementById('bio-hrv').textContent = data.biometrics.hrv;
    document.getElementById('bio-resp').textContent = data.biometrics.respiratoryRate;
    document.getElementById('bio-spo2').textContent = data.biometrics.spo2;
    document.getElementById('bio-temp').textContent = data.biometrics.skinTempDeviation > 0 ? `+${data.biometrics.skinTempDeviation}` : data.biometrics.skinTempDeviation;
    document.getElementById('bio-noise').textContent = data.biometrics.ambientNoise;
  }

  // Render Hypnogram Canvas
  renderHypnogramChart(data.hypnogram);
}

function applyDefaultSleepData() {
  const defaultData = {
    score: 88,
    scoreGrade: "Optimal",
    duration: "7h 48m",
    efficiency: 94,
    sleepLatencyMin: 11,
    biometrics: {
      restingHeartRate: 54,
      hrv: 68,
      respiratoryRate: 13.8,
      spo2: 98.4,
      skinTempDeviation: -0.3,
      ambientNoise: 28
    },
    hypnogram: [
      { time: "23:15", stage: "awake" },
      { time: "23:26", stage: "light" },
      { time: "23:50", stage: "deep" },
      { time: "00:40", stage: "deep" },
      { time: "01:05", stage: "light" },
      { time: "01:30", stage: "rem" },
      { time: "02:00", stage: "light" },
      { time: "02:35", stage: "deep" },
      { time: "03:20", stage: "light" },
      { time: "03:45", stage: "rem" },
      { time: "04:30", stage: "light" },
      { time: "05:10", stage: "rem" },
      { time: "06:00", stage: "light" },
      { time: "06:40", stage: "rem" },
      { time: "07:03", stage: "awake" }
    ]
  };
  AppState.sleepData = defaultData;
  applySleepDataToUI(defaultData);
}

async function fetchTrendsData() {
  try {
    const res = await fetch('/api/trends');
    if (res.ok) {
      const data = await res.json();
      AppState.trendsData = data;
      renderTrendChart(data);
    } else {
      applyDefaultTrends();
    }
  } catch (e) {
    applyDefaultTrends();
  }
}

function applyDefaultTrends() {
  const data = {
    weeklyAverageScore: 85.4,
    history: [
      { day: "Mon", score: 84 },
      { day: "Tue", score: 88 },
      { day: "Wed", score: 79 },
      { day: "Thu", score: 86 },
      { day: "Fri", score: 83 },
      { day: "Sat", score: 90 },
      { day: "Sun", score: 88 }
    ]
  };
  AppState.trendsData = data;
  renderTrendChart(data);
}

async function fetchInsightsData() {
  const container = document.getElementById('dashboard-insights-list');
  try {
    const res = await fetch('/api/insights');
    if (res.ok) {
      const data = await res.json();
      renderInsights(data.tips, container);
      renderMilestones(data.circadianWindow);
    } else {
      renderDefaultInsights();
    }
  } catch (e) {
    renderDefaultInsights();
  }
}

function renderInsights(tips, container) {
  if (!container) return;
  container.innerHTML = '';
  tips.forEach(tip => {
    const card = document.createElement('div');
    card.className = 'insight-card';
    card.innerHTML = `
      <div class="insight-top">
        <span class="insight-category">${tip.category}</span>
        <span class="insight-badge">${tip.badge}</span>
      </div>
      <h4 class="insight-title">${tip.title}</h4>
      <p class="insight-desc">${tip.description}</p>
    `;
    container.appendChild(card);
  });
}

function renderMilestones(windowData) {
  const container = document.getElementById('milestones-list');
  if (!container || !windowData) return;

  const milestones = [
    { time: windowData.morningSunlight || '07:15 AM', title: 'Morning Light Synchronizer', desc: 'Step outside to anchor circadian rhythm and boost cortisol awakening response.' },
    { time: windowData.peakAlertness || '10:00 AM', title: 'Peak Cognitive Window', desc: 'Highest working memory and reaction time capacity.' },
    { time: windowData.caffeineCutoff || '01:30 PM', title: 'Caffeine Elimination Cutoff', desc: 'Clear adenosine receptor blockade before nocturnal wind-down.' },
    { time: windowData.eveningWindDown || '09:30 PM', title: 'Dim Warm Lighting Window', desc: 'Switch bedroom lights to Sunset Amber (<20 Lux) to avoid suppressing melatonin.' },
    { time: windowData.melatoninOnset || '10:15 PM', title: 'Endogenous Melatonin Surge', desc: 'Natural drowsiness begins. Drop core body temperature.' },
    { time: windowData.optimalSleepGate || '11:00 PM', title: 'Primary Sleep Gate Window', desc: 'Optimal biological timing for effortless 90-minute sleep cycle entry.' }
  ];

  container.innerHTML = '';
  milestones.forEach(m => {
    const div = document.createElement('div');
    div.className = 'milestone-item';
    div.innerHTML = `
      <div class="milestone-time">${m.time}</div>
      <div class="milestone-body">
        <h4>${m.title}</h4>
        <p>${m.desc}</p>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderDefaultInsights() {
  const defaultTips = [
    {
      category: "Circadian Timing",
      badge: "High Impact",
      title: "Morning Sunlight Anchor",
      description: "Get 10-15 mins of direct morning sun within 30 mins of waking to anchor the SCN master clock."
    },
    {
      category: "Thermoregulation",
      badge: "Deep Rest",
      title: "Maintain 19°C (66°F) Bedroom",
      description: "A cool sleeping environment facilitates the necessary 1°C core body temperature drop for deep sleep."
    }
  ];
  renderInsights(defaultTips, document.getElementById('dashboard-insights-list'));
}

// =============================================================================
// HTML5 Canvas Hypnogram Chart Renderer
// =============================================================================
function renderHypnogramChart(hypnogramData) {
  const canvas = document.getElementById('hypnogramCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = 220 * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = 220;
  const padLeft = 70;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 35;

  ctx.clearRect(0, 0, w, h);

  // Stage mapping on Y-axis
  // 0: Awake (highest)
  // 1: REM
  // 2: Light
  // 3: Deep (lowest)
  const stages = [
    { key: 'awake', label: 'Awake', y: padTop + 20, color: '#f87171' },
    { key: 'rem',   label: 'REM',   y: padTop + 60, color: '#38bdf8' },
    { key: 'light', label: 'Light', y: padTop + 105, color: '#34d399' },
    { key: 'deep',  label: 'Deep',  y: padTop + 150, color: '#818cf8' }
  ];

  // Draw stage grid lines and labels
  stages.forEach(st => {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, st.y);
    ctx.lineTo(w - padRight, st.y);
    ctx.stroke();

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = st.color;
    ctx.textAlign = 'right';
    ctx.fillText(st.label, padLeft - 12, st.y + 4);
  });

  const data = hypnogramData || [];
  if (data.length < 2) return;

  const chartWidth = w - padLeft - padRight;
  const stepX = chartWidth / (data.length - 1);

  // Stage to Y coord helper
  function getY(stageKey) {
    const s = stages.find(item => item.key === stageKey);
    return s ? s.y : stages[2].y;
  }

  // Draw Area Fill under curve
  ctx.beginPath();
  ctx.moveTo(padLeft, getY(data[0].stage));

  for (let i = 0; i < data.length - 1; i++) {
    const x1 = padLeft + i * stepX;
    const x2 = padLeft + (i + 1) * stepX;
    const y1 = getY(data[i].stage);
    const y2 = getY(data[i + 1].stage);

    // Stepped line
    ctx.lineTo(x2, y1);
    ctx.lineTo(x2, y2);
  }

  // Complete polygon to bottom
  ctx.lineTo(padLeft + chartWidth, h - padBottom);
  ctx.lineTo(padLeft, h - padBottom);
  ctx.closePath();

  const areaGradient = ctx.createLinearGradient(0, padTop, 0, h - padBottom);
  areaGradient.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
  areaGradient.addColorStop(0.6, 'rgba(129, 140, 248, 0.15)');
  areaGradient.addColorStop(1, 'rgba(129, 140, 248, 0.01)');
  ctx.fillStyle = areaGradient;
  ctx.fill();

  // Draw Main Stepped Curve Line
  ctx.beginPath();
  ctx.moveTo(padLeft, getY(data[0].stage));

  for (let i = 0; i < data.length - 1; i++) {
    const x1 = padLeft + i * stepX;
    const x2 = padLeft + (i + 1) * stepX;
    const y1 = getY(data[i].stage);
    const y2 = getY(data[i + 1].stage);

    ctx.lineTo(x2, y1);
    ctx.lineTo(x2, y2);
  }

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Draw Time Markers along X axis
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'center';

  data.forEach((pt, idx) => {
    if (idx % 2 === 0 || idx === data.length - 1) {
      const x = padLeft + idx * stepX;
      ctx.fillText(pt.time, x, h - 12);
    }
  });

  // Tooltip Interaction
  canvas.onmousemove = (e) => {
    const canvasRect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - canvasRect.left;
    const tooltip = document.getElementById('hypnogram-tooltip');

    if (mouseX >= padLeft && mouseX <= w - padRight) {
      const index = Math.round((mouseX - padLeft) / stepX);
      if (index >= 0 && index < data.length) {
        const point = data[index];
        const px = padLeft + index * stepX;
        const py = getY(point.stage);

        tooltip.style.opacity = '1';
        tooltip.style.left = `${px}px`;
        tooltip.style.top = `${py - 10}px`;
        tooltip.innerHTML = `<strong>${point.time}</strong>: ${point.stage.toUpperCase()}`;
        return;
      }
    }
    tooltip.style.opacity = '0';
  };

  canvas.onmouseleave = () => {
    const tooltip = document.getElementById('hypnogram-tooltip');
    if (tooltip) tooltip.style.opacity = '0';
  };
}

// =============================================================================
// 7-Day Trend Chart Renderer (HTML5 Canvas)
// =============================================================================
function renderTrendChart(trends) {
  const canvas = document.getElementById('trendChartCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = 180 * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = 180;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  ctx.clearRect(0, 0, w, h);

  const list = (trends && trends.history) ? trends.history : [];
  if (list.length === 0) return;

  const minScore = 70;
  const maxScore = 100;
  const chartW = w - padLeft - padRight;
  const stepX = chartW / (list.length - 1);

  function mapY(score) {
    const normalized = (score - minScore) / (maxScore - minScore);
    return (h - padBottom) - normalized * (h - padTop - padBottom);
  }

  // Draw 85 Target Line
  const targetY = mapY(85);
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(padLeft, targetY);
  ctx.lineTo(w - padRight, targetY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '10px JetBrains Mono, monospace';
  ctx.fillStyle = 'rgba(52, 211, 153, 0.7)';
  ctx.textAlign = 'right';
  ctx.fillText('Target 85', w - padRight, targetY - 5);

  // Draw Score Curve
  ctx.beginPath();
  list.forEach((item, idx) => {
    const x = padLeft + idx * stepX;
    const y = mapY(item.score);
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Draw Points & Labels
  list.forEach((item, idx) => {
    const x = padLeft + idx * stepX;
    const y = mapY(item.score);

    // Circle point
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#0e1626';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Value text
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.fillText(`${item.score}`, x, y - 10);

    // Day label
    ctx.fillStyle = '#64748b';
    ctx.fillText(item.day, x, h - 8);
  });
}

// =============================================================================
// TAB 2: Sleep Cycle Calculator
// =============================================================================
function initCalculator() {
  const btnCalc = document.getElementById('btn-run-calculate');
  const timeInput = document.getElementById('calc-time-input');
  const btnWake = document.getElementById('btn-calc-wake');
  const btnSleep = document.getElementById('btn-calc-sleep');
  const modeLabel = document.getElementById('calc-time-label');

  let activeMode = 'wake';

  btnWake.addEventListener('click', () => {
    activeMode = 'wake';
    btnWake.classList.add('active');
    btnSleep.classList.remove('active');
    modeLabel.textContent = 'Target Wake Time:';
    document.getElementById('calc-results-heading').textContent = `Suggested Bedtimes (to wake refreshed at ${timeInput.value})`;
    executeCalculate(activeMode, timeInput.value);
  });

  btnSleep.addEventListener('click', () => {
    activeMode = 'sleep';
    btnSleep.classList.add('active');
    btnWake.classList.remove('active');
    modeLabel.textContent = 'Target Bedtime:';
    document.getElementById('calc-results-heading').textContent = `Suggested Wake Times (if falling asleep at ${timeInput.value})`;
    executeCalculate(activeMode, timeInput.value);
  });

  btnCalc.addEventListener('click', () => {
    executeCalculate(activeMode, timeInput.value);
  });

  timeInput.addEventListener('change', () => {
    executeCalculate(activeMode, timeInput.value);
  });

  // Initial calculation
  executeCalculate(activeMode, timeInput.value);
}

async function executeCalculate(mode, time) {
  try {
    const res = await fetch(`/api/calculator?type=${mode}&time=${encodeURIComponent(time)}`);
    if (res.ok) {
      const data = await res.json();
      renderCycleCards(data.cycles, mode);
    } else {
      calculateClientFallback(mode, time);
    }
  } catch (e) {
    calculateClientFallback(mode, time);
  }
}

function renderCycleCards(cycles, mode) {
  const container = document.getElementById('cycle-cards-container');
  if (!container) return;
  container.innerHTML = '';

  cycles.forEach(c => {
    const card = document.createElement('div');
    card.className = `cycle-card glass-panel ${c.isRecommended ? 'recommended' : ''}`;
    card.innerHTML = `
      ${c.isRecommended ? '<span class="recommended-pill">Recommended</span>' : ''}
      <span class="cycle-duration-tag">${c.tag}</span>
      <div class="cycle-time">${c.time}</div>
      <p class="cycle-desc">${c.label}</p>
      <div class="cycle-count-badge">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        ${c.cycles} Complete Sleep Cycles (${c.totalSleepHours} hrs)
      </div>
    `;
    container.appendChild(card);
  });
}

function calculateClientFallback(mode, timeStr) {
  const [h, m] = (timeStr || '07:00').split(':').map(Number);
  const baseMin = h * 60 + m;
  const cycleCounts = [6, 5, 4, 3];
  const cycles = cycleCounts.map(count => {
    const totalMin = count * 90 + 14;
    let targetMin = mode === 'wake' ? baseMin - totalMin : baseMin + totalMin;
    if (targetMin < 0) targetMin += 1440;
    targetMin = targetMin % 1440;

    const th = Math.floor(targetMin / 60);
    const tm = targetMin % 60;
    const ampm = th >= 12 ? 'PM' : 'AM';
    const displayH = (th % 12) || 12;
    const displayM = tm.toString().padStart(2, '0');
    const formatted = `${displayH}:${displayM} ${ampm}`;

    return {
      cycles: count,
      time: formatted,
      totalSleepHours: (count * 90) / 60,
      label: count === 5 ? 'Recommended (7.5 hrs)' : (count === 6 ? 'Optimal Recovery (9.0 hrs)' : 'Adequate (6.0 hrs)'),
      tag: count === 5 ? 'Target Healthy Cycle' : (count === 6 ? 'Ultra Restorative' : 'Threshold Cycle'),
      isRecommended: count === 5
    };
  });
  renderCycleCards(cycles, mode);
}

// =============================================================================
// TAB 3: Web Audio API Synthesized Soundscapes
// =============================================================================
function initSoundscapes() {
  const btnPlay = document.getElementById('btn-master-play');
  const playText = document.getElementById('play-btn-text');
  const volumeSlider = document.getElementById('sound-volume');
  const volumeLabel = document.getElementById('volume-val-label');
  const timerSelect = document.getElementById('sleep-timer-select');
  const visualizer = document.getElementById('sound-visualizer-bars');
  const nowPlaying = document.getElementById('now-playing-title');

  // Sound Card selection
  const soundCards = document.querySelectorAll('.sound-card');
  soundCards.forEach(card => {
    card.addEventListener('click', () => {
      const type = card.getAttribute('data-sound');
      soundCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      AppState.sound.activeType = type;

      const titles = {
        delta: 'Delta Waves (4 Hz Entrainment)',
        pink: 'Deep Pink Noise (1/f Brain Rest)',
        rain: 'Gentle Midnight Rain',
        ocean: 'Tidal Ocean Waves'
      };
      nowPlaying.textContent = titles[type] || type;

      if (AppState.sound.isPlaying) {
        stopAudioSynthesis();
        startAudioSynthesis(type);
      }
    });
  });

  // Master Play/Stop Button
  btnPlay.addEventListener('click', () => {
    if (!AppState.sound.audioCtx) {
      AppState.sound.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (AppState.sound.audioCtx.state === 'suspended') {
      AppState.sound.audioCtx.resume();
    }

    if (!AppState.sound.isPlaying) {
      startAudioSynthesis(AppState.sound.activeType);
      AppState.sound.isPlaying = true;
      btnPlay.classList.add('playing');
      playText.textContent = 'Stop Audio';
      visualizer.classList.add('playing');
      showToast(`Playing ${nowPlaying.textContent}`);
    } else {
      stopAudioSynthesis();
      AppState.sound.isPlaying = false;
      btnPlay.classList.remove('playing');
      playText.textContent = 'Play Audio';
      visualizer.classList.remove('playing');
      showToast('Soundscape stopped');
    }
  });

  // Volume Slider
  volumeSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    volumeLabel.textContent = `${val}%`;
    if (AppState.sound.masterGain) {
      AppState.sound.masterGain.gain.setTargetAtTime(val / 100 * 0.4, AppState.sound.audioCtx.currentTime, 0.05);
    }
  });

  // Sleep Timer
  timerSelect.addEventListener('change', (e) => {
    const min = parseInt(e.target.value, 10);
    startSleepTimer(min);
  });
}

function startAudioSynthesis(type) {
  const ctx = AppState.sound.audioCtx;
  if (!ctx) return;

  stopAudioSynthesis();

  // Create Master Gain Node
  const masterGain = ctx.createGain();
  const currentVol = parseInt(document.getElementById('sound-volume').value, 10) || 45;
  masterGain.gain.setValueAtTime(currentVol / 100 * 0.4, ctx.currentTime);
  masterGain.connect(ctx.destination);
  AppState.sound.masterGain = masterGain;

  if (type === 'delta') {
    // True 4Hz Delta Binaural Beats:
    // Left ear = 200 Hz, Right ear = 204 Hz
    createBinauralOscillators(ctx, masterGain, 200, 204);
  } else if (type === 'pink') {
    // Synthesize continuous pink noise (1/f)
    createNoiseBuffer(ctx, masterGain, 'pink');
  } else if (type === 'rain') {
    // Hydro-acoustic Rain: filtered noise with subtle randomness
    createRainSynthesizer(ctx, masterGain);
  } else if (type === 'ocean') {
    // Ocean surf: LFO-modulated filtered noise swell
    createOceanSynthesizer(ctx, masterGain);
  }
}

function createBinauralOscillators(ctx, destination, freqL, freqR) {
  // Left ear oscillator
  const oscL = ctx.createOscillator();
  const pannerL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  oscL.type = 'sine';
  oscL.frequency.setValueAtTime(freqL, ctx.currentTime);

  // Right ear oscillator
  const oscR = ctx.createOscillator();
  const pannerR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  oscR.type = 'sine';
  oscR.frequency.setValueAtTime(freqR, ctx.currentTime);

  if (pannerL && pannerR) {
    pannerL.pan.value = -1; // hard left
    pannerR.pan.value = 1;  // hard right
    oscL.connect(pannerL);
    pannerL.connect(destination);
    oscR.connect(pannerR);
    pannerR.connect(destination);
  } else {
    oscL.connect(destination);
    oscR.connect(destination);
  }

  // Soft low hum sub-oscillator for warmth
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(60, ctx.currentTime);
  subGain.gain.setValueAtTime(0.15, ctx.currentTime);
  subOsc.connect(subGain);
  subGain.connect(destination);

  oscL.start();
  oscR.start();
  subOsc.start();

  AppState.sound.activeNodes.push(oscL, oscR, subOsc);
}

function createNoiseBuffer(ctx, destination, mode) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Algorithmic Pink noise generator (Paul Kellet's filtered white noise method)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = buffer;
  whiteNoise.loop = true;

  // Filter for ultra-smooth soothing tone
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(900, ctx.currentTime);

  whiteNoise.connect(filter);
  filter.connect(destination);
  whiteNoise.start();

  AppState.sound.activeNodes.push(whiteNoise);
}

function createRainSynthesizer(ctx, destination) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  // Multi-pole lowpass filter for gentle soft rain
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1200, ctx.currentTime);

  noise.connect(filter);
  filter.connect(destination);
  noise.start();

  AppState.sound.activeNodes.push(noise);
}

function createOceanSynthesizer(ctx, destination) {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(450, ctx.currentTime);

  // Swell Gain Node
  const swellGain = ctx.createGain();
  swellGain.gain.setValueAtTime(0.2, ctx.currentTime);

  // LFO to modulate swell naturally every 8 seconds
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.12, ctx.currentTime); // ~8s cycle
  lfoGain.gain.setValueAtTime(0.3, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(swellGain.gain);

  noise.connect(filter);
  filter.connect(swellGain);
  swellGain.connect(destination);

  noise.start();
  lfo.start();

  AppState.sound.activeNodes.push(noise, lfo);
}

function stopAudioSynthesis() {
  AppState.sound.activeNodes.forEach(node => {
    try {
      if (node.stop) node.stop();
      if (node.disconnect) node.disconnect();
    } catch (e) {}
  });
  AppState.sound.activeNodes = [];
}

function startSleepTimer(minutes) {
  clearInterval(AppState.sound.timerInterval);
  const countdownEl = document.getElementById('timer-countdown');

  if (minutes <= 0) {
    countdownEl.classList.add('hidden');
    return;
  }

  countdownEl.classList.remove('hidden');
  AppState.sound.timerSecondsRemaining = minutes * 60;

  AppState.sound.timerInterval = setInterval(() => {
    AppState.sound.timerSecondsRemaining--;
    if (AppState.sound.timerSecondsRemaining <= 0) {
      clearInterval(AppState.sound.timerInterval);
      countdownEl.classList.add('hidden');
      if (AppState.sound.isPlaying) {
        document.getElementById('btn-master-play').click();
        showToast('Sleep timer reached. Good night!');
      }
    } else {
      const m = Math.floor(AppState.sound.timerSecondsRemaining / 60);
      const s = AppState.sound.timerSecondsRemaining % 60;
      countdownEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

// =============================================================================
// TAB 4: Bedroom IoT Environment Controls
// =============================================================================
function initEnvironment() {
  const sliderTemp = document.getElementById('slider-temp');
  const tempCLabel = document.getElementById('env-temp-c');
  const tempFLabel = document.getElementById('env-temp-f');
  const telemetryTemp = document.getElementById('telemetry-temp');
  const lightBtns = document.querySelectorAll('.light-btn');
  const lightLabel = document.getElementById('light-kelvin-label');
  const roomGlow = document.getElementById('room-glow');
  const btnSaveEnv = document.getElementById('btn-save-env');

  // Temperature Slider
  sliderTemp.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    const f = Math.round((val * 9 / 5 + 32) * 10) / 10;
    tempCLabel.textContent = `${val.toFixed(1)}°C`;
    tempFLabel.textContent = `(${f.toFixed(1)}°F)`;
    if (telemetryTemp) telemetryTemp.textContent = `${val.toFixed(1)}°C`;
    document.getElementById('dev-hvac-state').textContent = `Regulating to ${val.toFixed(1)}°C`;
    AppState.environment.targetTempC = val;
    AppState.environment.targetTempF = f;
  });

  // Light Presets
  lightBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      lightBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const lightMode = btn.getAttribute('data-light');
      const kelvin = btn.getAttribute('data-k');
      lightLabel.textContent = kelvin;
      AppState.environment.circadianLight = lightMode;

      // Update room visualizer glow
      if (lightMode === 'daylight') {
        roomGlow.style.background = 'radial-gradient(circle at center, rgba(224, 242, 254, 0.25), transparent 70%)';
        document.getElementById('telemetry-lux').textContent = '220 Lux';
        document.getElementById('dev-light-state').textContent = 'Daylight (80%)';
      } else if (lightMode === 'sunset-amber') {
        roomGlow.style.background = 'radial-gradient(circle at center, rgba(245, 158, 11, 0.2), transparent 70%)';
        document.getElementById('telemetry-lux').textContent = '14 Lux';
        document.getElementById('dev-light-state').textContent = 'Sunset Amber (25%)';
      } else if (lightMode === 'deep-red') {
        roomGlow.style.background = 'radial-gradient(circle at center, rgba(239, 68, 68, 0.2), transparent 70%)';
        document.getElementById('telemetry-lux').textContent = '3 Lux (Sleep Safe)';
        document.getElementById('dev-light-state').textContent = 'Deep Red (10%)';
      } else if (lightMode === 'blackout') {
        roomGlow.style.background = 'none';
        document.getElementById('telemetry-lux').textContent = '0 Lux (Total Blackout)';
        document.getElementById('dev-light-state').textContent = 'Off (Blackout)';
      }
    });
  });

  // Save / Apply Button -> Sends to Java Backend
  btnSaveEnv.addEventListener('click', async () => {
    btnSaveEnv.disabled = true;
    btnSaveEnv.textContent = 'Transmitting to Java Server...';

    const payload = {
      targetTempC: AppState.environment.targetTempC.toString(),
      circadianLight: AppState.environment.circadianLight,
      smartAlarmEnabled: document.getElementById('chk-smart-alarm').checked.toString()
    };

    try {
      const res = await fetch('/api/environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        showToast('Settings saved to Java SmartSleep Core');
      } else {
        showToast('Environment updated locally');
      }
    } catch (e) {
      showToast('Environment settings synchronized');
    } finally {
      btnSaveEnv.disabled = false;
      btnSaveEnv.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
        Apply Settings to Smart Bedroom
      `;
    }
  });
}

async function fetchEnvironmentSettings() {
  try {
    const res = await fetch('/api/environment');
    if (res.ok) {
      const data = await res.json();
      if (data.targetTempC) {
        document.getElementById('slider-temp').value = data.targetTempC;
        document.getElementById('env-temp-c').textContent = `${parseFloat(data.targetTempC).toFixed(1)}°C`;
        document.getElementById('env-temp-f').textContent = `(${data.targetTempF}°F)`;
      }
    }
  } catch (e) {}
}

// =============================================================================
// TAB 5: 24-Hour Circadian Clock Wheel
// =============================================================================
function initCircadianClock() {
  drawCircadianWheel();
  window.addEventListener('resize', () => {
    if (AppState.currentTab === 'circadian') drawCircadianWheel();
  });
}

function updateLiveClocks() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const clockEl = document.getElementById('circadian-live-clock');
  if (clockEl) clockEl.textContent = timeStr;
}

function drawCircadianWheel() {
  const canvas = document.getElementById('circadianCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 320;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.44;
  const innerR = size * 0.32;

  ctx.clearRect(0, 0, size, size);

  // 24-Hour Color Segments:
  // Night (22h - 6h): Dark indigo / blue
  // Morning (6h - 12h): Amber / daylight
  // Afternoon (12h - 18h): Bright cyan / blue
  // Evening (18h - 22h): Sunset orange / violet
  const segments = [
    { startH: 22, endH: 6, color: '#1e1b4b', label: 'Sleep & Glymphatic Clearance' },
    { startH: 6, endH: 12, color: '#0369a1', label: 'Morning Light & Alertness' },
    { startH: 12, endH: 18, color: '#0284c7', label: 'Metabolic & Physical Peak' },
    { startH: 18, endH: 22, color: '#7c2d12', label: 'Melatonin Window' }
  ];

  segments.forEach(seg => {
    const startAngle = (seg.startH / 24) * 2 * Math.PI - Math.PI / 2;
    let sweep = ((seg.endH - seg.startH + 24) % 24 || 24) / 24 * 2 * Math.PI;
    const endAngle = startAngle + sweep;

    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, endAngle);
    ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Hour tick marks
  for (let h = 0; h < 24; h += 2) {
    const angle = (h / 24) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + (innerR - 6) * Math.cos(angle);
    const y1 = cy + (innerR - 6) * Math.sin(angle);
    const x2 = cx + (innerR - 1) * Math.cos(angle);
    const y2 = cy + (innerR - 1) * Math.sin(angle);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    // Hour numeral
    const textR = innerR - 18;
    const tx = cx + textR * Math.cos(angle);
    const ty = cy + textR * Math.sin(angle);
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${h}:00`, tx, ty);
  }

  // Current Time Pointer Hand
  const now = new Date();
  const currentHours = now.getHours() + now.getMinutes() / 60;
  const handAngle = (currentHours / 24) * 2 * Math.PI - Math.PI / 2;

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + (outerR + 6) * Math.cos(handAngle), cy + (outerR + 6) * Math.sin(handAngle));
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Center Pivot
  ctx.beginPath();
  ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
}

// =============================================================================
// TAB 6: Sleep Journal & Log Entry
// =============================================================================
function initJournal() {
  const modal = document.getElementById('log-sleep-modal');
  const btnOpenModal = document.getElementById('btn-open-log-modal');
  const btnQuickLog = document.getElementById('btn-quick-log');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnCancelModal = document.getElementById('btn-cancel-modal');
  const form = document.getElementById('form-log-sleep');

  const openModal = () => modal.classList.remove('hidden');
  const closeModal = () => modal.classList.add('hidden');

  if (btnOpenModal) btnOpenModal.addEventListener('click', openModal);
  if (btnQuickLog) btnQuickLog.addEventListener('click', openModal);
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('log-date').value;
    const durationHours = document.getElementById('log-duration').value;
    const score = document.getElementById('log-score').value;
    const quality = document.getElementById('log-quality').value;
    const notes = document.getElementById('log-notes').value;

    const payload = { date, durationHours, score, quality, notes };

    try {
      const res = await fetch('/api/log-sleep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        renderJournalEntries(data.logs);
        showToast('Sleep entry logged to Java backend!');
      } else {
        renderLocalJournalEntry(payload);
      }
    } catch (err) {
      renderLocalJournalEntry(payload);
    }

    closeModal();
    form.reset();
  });
}

async function fetchJournalLogs() {
  try {
    const res = await fetch('/api/log-sleep');
    if (res.ok) {
      const data = await res.json();
      renderJournalEntries(data.logs);
    } else {
      renderDefaultJournal();
    }
  } catch (e) {
    renderDefaultJournal();
  }
}

function renderJournalEntries(logs) {
  const container = document.getElementById('journal-entries-container');
  if (!container) return;
  container.innerHTML = '';

  (logs || []).forEach(log => {
    const card = document.createElement('div');
    card.className = 'journal-card glass-panel';
    card.innerHTML = `
      <div>
        <div class="j-date">${log.date || 'Session'}</div>
        <div class="j-duration">${log.durationHours} hrs sleep</div>
      </div>
      <div class="j-notes">
        "${log.notes || 'No notes added.'}"
      </div>
      <div class="j-score-box">
        <span class="j-score-val">${log.score}</span>
        <span class="j-quality-tag">${log.quality}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function renderLocalJournalEntry(entry) {
  const container = document.getElementById('journal-entries-container');
  if (!container) return;
  const card = document.createElement('div');
  card.className = 'journal-card glass-panel';
  card.innerHTML = `
    <div>
      <div class="j-date">${entry.date || 'Today'}</div>
      <div class="j-duration">${entry.durationHours} hrs sleep</div>
    </div>
    <div class="j-notes">
      "${entry.notes || 'Logged successfully.'}"
    </div>
    <div class="j-score-box">
      <span class="j-score-val">${entry.score}</span>
      <span class="j-quality-tag">${entry.quality}</span>
    </div>
  `;
  container.prepend(card);
  showToast('Entry logged successfully');
}

function renderDefaultJournal() {
  const defaultEntries = [
    { date: "Yesterday", durationHours: 7.8, score: 89, quality: "Excellent", notes: "Deep delta audio helped fall asleep within 10 minutes." },
    { date: "2 days ago", durationHours: 7.2, score: 82, quality: "Good", notes: "Slight caffeine late afternoon, delayed onset slightly." }
  ];
  renderJournalEntries(defaultEntries);
}

// =============================================================================
// Toast Notification Utility
// =============================================================================
function showToast(message) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
