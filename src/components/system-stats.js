/**
 * system-stats.js — System Diagnostics panel with live uptime and animated metrics.
 */

function injectStyles() {
  if (document.getElementById('jarvis-stat-styles')) return;

  const style = document.createElement('style');
  style.id = 'jarvis-stat-styles';
  style.textContent = `
    .jarvis-stats {
      padding: 0.5rem 0;
    }

    .jarvis-stat-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.55rem 0;
      border-bottom: 1px solid rgba(0, 212, 255, 0.05);
    }

    .jarvis-stat-row:last-child {
      border-bottom: none;
    }

    .jarvis-stat-label {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.75rem;
      color: var(--color-text-dim, #6b7a8d);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .jarvis-stat-value {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.85rem;
      color: var(--color-text, #e0e6ed);
      font-weight: 600;
    }

    .jarvis-stat-value-accent {
      color: var(--color-accent, #00d4ff);
    }

    .jarvis-stat-value-success {
      color: var(--color-success, #2ed573);
    }

    .jarvis-stat-pulse {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-success, #2ed573);
      display: inline-block;
      animation: jarvis-stat-pulse-anim 1.5s ease-in-out infinite;
      box-shadow: 0 0 6px var(--color-success, #2ed573);
    }

    @keyframes jarvis-stat-pulse-anim {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.85); }
    }

    .jarvis-stat-bar-wrapper {
      width: 100%;
      padding: 0 0 0.2rem 0;
    }

    .jarvis-stat-bar-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.15rem;
    }

    .jarvis-stat-bar-track {
      width: 100%;
      height: 3px;
      background: rgba(0, 212, 255, 0.08);
      border-radius: 2px;
      overflow: hidden;
    }

    .jarvis-stat-bar-fill {
      height: 100%;
      border-radius: 2px;
      background: linear-gradient(90deg, var(--color-accent, #00d4ff), var(--color-accent-secondary, #7b61ff));
      transition: width 0.6s ease;
      box-shadow: 0 0 4px var(--color-accent-glow, rgba(0, 212, 255, 0.3));
    .jarvis-stat-graph {
      width: 100%;
      height: 30px;
      margin-top: 4px;
      margin-bottom: 4px;
      display: block;
      opacity: 0.8;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Pad a number to two digits.
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  return String(Math.floor(n)).padStart(2, '0');
}

/**
 * Format elapsed seconds as HH:MM:SS.
 * @param {number} totalSec
 * @returns {string}
 */
function formatUptime(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Read count of items from localStorage (handles jarvis_ prefix).
 * @param {string} key - Key (without prefix).
 * @returns {number}
 */
function readCount(key) {
  try {
    const raw = localStorage.getItem('jarvis_' + key);
    if (!raw) return 0;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.length : 0;
  } catch {
    return 0;
  }
}

/**
 * Read count of active (not done) tasks.
 * @returns {number}
 */
function readActiveTaskCount() {
  try {
    const raw = localStorage.getItem('jarvis_tasks');
    if (!raw) return 0;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((t) => !t.done).length : 0;
  } catch {
    return 0;
  }
}

/**
 * Initialize the system stats component.
 * @param {HTMLElement} container - DOM element to render into.
 */
export function init(container) {
  injectStyles();

  const startTime = Date.now();
  window.__jarvisStartTime = startTime;

  let coreIntegrity = 98.7;
  let memoryUsage = 67.0;
  
  const historyLimit = 60;
  const coreHistory = Array(historyLimit).fill(98.7);
  const memoryHistory = Array(historyLimit).fill(67.0);

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-stats';
  wrapper.innerHTML = `
    <div class="jarvis-section-header">System Diagnostics</div>
    <div class="jarvis-stat-row">
      <span class="jarvis-stat-label"><span class="jarvis-stat-pulse"></span> Status</span>
      <span class="jarvis-stat-value jarvis-stat-value-success">ONLINE</span>
    </div>
    <div class="jarvis-stat-row">
      <span class="jarvis-stat-label">Session Uptime</span>
      <span class="jarvis-stat-value jarvis-stat-value-accent" data-ref="uptime">00:00:00</span>
    </div>
    <div>
      <div class="jarvis-stat-row">
        <span class="jarvis-stat-label">Core Integrity</span>
        <span class="jarvis-stat-value" data-ref="core">98.7%</span>
      </div>
      <canvas class="jarvis-stat-graph" data-ref="coreCanvas" width="280" height="30"></canvas>
      <div class="jarvis-stat-bar-track"><div class="jarvis-stat-bar-fill" data-ref="coreBar" style="width:98.7%"></div></div>
    </div>
    <div style="margin-top: 10px;">
      <div class="jarvis-stat-row">
        <span class="jarvis-stat-label">Memory Usage</span>
        <span class="jarvis-stat-value" data-ref="memory">67.0%</span>
      </div>
      <canvas class="jarvis-stat-graph" data-ref="memoryCanvas" width="280" height="30"></canvas>
      <div class="jarvis-stat-bar-track"><div class="jarvis-stat-bar-fill" data-ref="memoryBar" style="width:67%"></div></div>
    </div>
    <div class="jarvis-stat-row" style="margin-top: 10px;">
      <span class="jarvis-stat-label">Tasks Active</span>
      <span class="jarvis-stat-value jarvis-stat-value-accent" data-ref="tasks">0</span>
    </div>
    <div class="jarvis-stat-row">
      <span class="jarvis-stat-label">Notes Stored</span>
      <span class="jarvis-stat-value jarvis-stat-value-accent" data-ref="notes">0</span>
    </div>
  `;
  container.appendChild(wrapper);

  const uptimeEl = wrapper.querySelector('[data-ref="uptime"]');
  const coreEl = wrapper.querySelector('[data-ref="core"]');
  const coreBarEl = wrapper.querySelector('[data-ref="coreBar"]');
  const coreCanvas = wrapper.querySelector('[data-ref="coreCanvas"]');
  
  const memoryEl = wrapper.querySelector('[data-ref="memory"]');
  const memoryBarEl = wrapper.querySelector('[data-ref="memoryBar"]');
  const memoryCanvas = wrapper.querySelector('[data-ref="memoryCanvas"]');
  
  const tasksEl = wrapper.querySelector('[data-ref="tasks"]');
  const notesEl = wrapper.querySelector('[data-ref="notes"]');

  const coreCtx = coreCanvas.getContext('2d');
  const memCtx = memoryCanvas.getContext('2d');

  function fluctuate(base, min, max, lowerBound, upperBound) {
    const delta = (Math.random() * (max - min) + min) * (Math.random() < 0.5 ? -1 : 1);
    const val = base + delta;
    return Math.min(upperBound, Math.max(lowerBound, parseFloat(val.toFixed(1))));
  }

  function drawGraph(ctx, canvas, data, minVal, maxVal, color) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid lines
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    const step = canvas.width / (historyLimit - 1);
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    
    for (let i = 0; i < historyLimit; i++) {
      const val = data[i];
      const percent = (val - minVal) / (maxVal - minVal);
      const y = canvas.height - (percent * canvas.height);
      const x = i * step;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    
    // Glow effect
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset
  }

  let lastUptimeStr = '';

  function update() {
    const elapsedSec = (Date.now() - startTime) / 1000;
    const newUptime = formatUptime(elapsedSec);
    if (newUptime !== lastUptimeStr) {
      uptimeEl.textContent = newUptime;
      lastUptimeStr = newUptime;
    }

    coreIntegrity = fluctuate(coreIntegrity, 0.1, 0.5, 90.0, 100.0);
    memoryUsage = fluctuate(memoryUsage, 0.2, 1.0, 40.0, 90.0);

    coreHistory.shift();
    coreHistory.push(coreIntegrity);
    
    memoryHistory.shift();
    memoryHistory.push(memoryUsage);

    coreEl.textContent = `${coreIntegrity.toFixed(1)}%`;
    coreBarEl.style.width = `${coreIntegrity}%`;
    drawGraph(coreCtx, coreCanvas, coreHistory, 80, 100, '#ffb000');

    memoryEl.textContent = `${memoryUsage.toFixed(1)}%`;
    memoryBarEl.style.width = `${memoryUsage}%`;
    drawGraph(memCtx, memoryCanvas, memoryHistory, 0, 100, '#e67e22');

  }

  function updateCounts() {
    const newTasks = readActiveTaskCount();
    const newNotes = readCount('notes');
    if (tasksEl.textContent != newTasks) tasksEl.textContent = newTasks;
    if (notesEl.textContent != newNotes) notesEl.textContent = newNotes;
  }

  update();
  updateCounts();
  window.addEventListener('jarvis:storage-changed', updateCounts);

  const intervalId = setInterval(update, 1000);
  container._jarvisCleanup = () => {
    clearInterval(intervalId);
    window.removeEventListener('jarvis:storage-changed', updateCounts);
  };
}
