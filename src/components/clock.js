/**
 * clock.js — Digital clock component with glowing 24h display and pulsing seconds.
 */

function injectStyles() {
  if (document.getElementById('jarvis-clock-styles')) return;

  const style = document.createElement('style');
  style.id = 'jarvis-clock-styles';
  style.textContent = `
    .jarvis-clock {
      text-align: center;
      padding: 1rem 0;
    }

    .jarvis-section-header {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.7rem;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--color-accent);
      margin-bottom: 1rem;
      opacity: 0.8;
    }

    .jarvis-clock-time {
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: clamp(4rem, 8vw, 6rem);
      font-weight: 200;
      color: var(--color-text);
      letter-spacing: -0.05em;
      line-height: 1;
      margin: 10px 0;
    }

    .jarvis-clock-seconds {
      font-size: 0.5em;
      font-weight: 300;
      color: var(--color-accent);
      opacity: 0.8;
    }

    .jarvis-clock-separator {
      display: inline-block;
      animation: jarvis-clock-pulse 1s step-end infinite;
      color: var(--color-accent);
    }

    @keyframes jarvis-clock-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }

    .jarvis-clock-date {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.85rem;
      color: var(--color-text-dim);
      margin-top: 0.6rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .jarvis-clock-ampm {
      font-size: 0.3em;
      font-weight: 400;
      color: var(--color-accent-dim);
      letter-spacing: 0.1em;
      vertical-align: top;
      margin-left: 4px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Pad a number with leading zero.
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Initialize the clock component.
 * @param {HTMLElement} container - DOM element to render into.
 */
export function init(container) {
  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-clock';
  wrapper.innerHTML = `
    <div class="jarvis-section-header">System Time</div>
    <div class="jarvis-clock-time">
      <span data-ref="hour"></span><span class="jarvis-clock-separator">:</span><span data-ref="minute"></span><span class="jarvis-clock-separator">:</span><span class="jarvis-clock-seconds" data-ref="second"></span> <span class="jarvis-clock-ampm" data-ref="ampm"></span>
    </div>
    <div class="jarvis-clock-date" data-ref="date"></div>
  `;
  container.appendChild(wrapper);

  const hourEl = wrapper.querySelector('[data-ref="hour"]');
  const minuteEl = wrapper.querySelector('[data-ref="minute"]');
  const secondEl = wrapper.querySelector('[data-ref="second"]');
  const ampmEl = wrapper.querySelector('[data-ref="ampm"]');
  const dateEl = wrapper.querySelector('[data-ref="date"]');

  let lastH, lastM, lastS, lastAmPm, lastDate;

  function update() {
    const now = new Date();
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const h = pad(hours);
    const m = pad(now.getMinutes());
    const s = pad(now.getSeconds());

    if (h !== lastH) { hourEl.textContent = h; lastH = h; }
    if (m !== lastM) { minuteEl.textContent = m; lastM = m; }
    if (s !== lastS) { secondEl.textContent = s; lastS = s; }
    if (ampm !== lastAmPm) { ampmEl.textContent = ampm; lastAmPm = ampm; }

    const dateStr = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (dateStr !== lastDate) {
      dateEl.textContent = dateStr;
      lastDate = dateStr;
    }
  }

  update();
  const intervalId = setInterval(update, 1000);
  container._jarvisCleanup = () => clearInterval(intervalId);
}
