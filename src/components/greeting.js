/**
 * greeting.js — Time-aware greeting widget with typing animation.
 */

/**
 * Determine the greeting period based on the current hour.
 * @returns {string} 'morning' | 'afternoon' | 'evening' | 'night'
 */
function getTimePeriod() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 20) return 'evening';
  return 'night';
}

/**
 * Format today's date as a human-readable string.
 * @returns {string} e.g. "Thursday, June 5, 2026"
 */
function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Inject scoped styles for the greeting component.
 */
function injectStyles() {
  if (document.getElementById('jarvis-greeting-styles')) return;

  const style = document.createElement('style');
  style.id = 'jarvis-greeting-styles';
  style.textContent = `
    .jarvis-greeting {
      padding: 1.5rem 0;
      user-select: none;
    }

    .jarvis-greeting-text {
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 2.4rem;
      font-weight: 300;
      color: var(--color-accent);
      line-height: 1.3;
      min-height: 3.2rem;
    }

    .jarvis-greeting-subtitle {
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 1rem;
      color: var(--color-text-dim, #6b7a8d);
      margin-top: 0.5rem;
      min-height: 1.4rem;
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .jarvis-greeting-subtitle.jarvis-greeting-visible {
      opacity: 1;
    }

    .jarvis-greeting-date {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.85rem;
      color: var(--color-text-dim, #6b7a8d);
      margin-top: 0.75rem;
      letter-spacing: 0.05em;
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .jarvis-greeting-date.jarvis-greeting-visible {
      opacity: 1;
    }

    .jarvis-greeting-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: var(--color-accent, #00d4ff);
      margin-left: 2px;
      vertical-align: text-bottom;
      animation: jarvis-greeting-blink 0.7s step-end infinite;
    }

    @keyframes jarvis-greeting-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Type out a string one character at a time into a DOM element.
 * @param {HTMLElement} el - Target element.
 * @param {string} text - Text to type.
 * @param {number} speed - Milliseconds per character.
 * @returns {Promise<void>} Resolves when typing is complete.
 */
function typeText(el, text, speed = 50) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'jarvis-greeting-cursor';
    el.appendChild(cursor);

    const interval = setInterval(() => {
      if (i < text.length) {
        cursor.before(text[i]);
        i++;
      } else {
        clearInterval(interval);
        // Remove cursor after a short pause
        setTimeout(() => {
          if (cursor.parentNode) cursor.remove();
          resolve();
        }, 600);
      }
    }, speed);
  });
}

/**
 * Initialize the greeting component.
 * @param {HTMLElement} container - DOM element to render into.
 */
export function init(container) {
  injectStyles();

  let currentPeriod = getTimePeriod();

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-greeting';
  wrapper.innerHTML = `
    <div class="jarvis-greeting-text" data-ref="greeting"></div>
    <div class="jarvis-greeting-subtitle" data-ref="subtitle"></div>
    <div class="jarvis-greeting-date" data-ref="date"></div>
  `;
  container.appendChild(wrapper);

  const greetingEl = wrapper.querySelector('[data-ref="greeting"]');
  const subtitleEl = wrapper.querySelector('[data-ref="subtitle"]');
  const dateEl = wrapper.querySelector('[data-ref="date"]');

  async function runGreeting() {
    currentPeriod = getTimePeriod();
    const greetingText = `Good ${currentPeriod}, Sir.`;

    subtitleEl.classList.remove('jarvis-greeting-visible');
    dateEl.classList.remove('jarvis-greeting-visible');
    subtitleEl.textContent = '';
    dateEl.textContent = '';

    await typeText(greetingEl, greetingText, 55);

    subtitleEl.textContent = 'All systems operational. How may I assist you today?';
    subtitleEl.classList.add('jarvis-greeting-visible');

    setTimeout(() => {
      dateEl.textContent = formatDate();
      dateEl.classList.add('jarvis-greeting-visible');
    }, 300);
  }

  runGreeting();

  // Re-check period every 60 seconds; re-animate only if period changed
  const intervalId = setInterval(() => {
    const newPeriod = getTimePeriod();
    if (newPeriod !== currentPeriod) {
      runGreeting();
    }
    // Update date in case day rolls over
    dateEl.textContent = formatDate();
  }, 60000);

  // Cleanup on container removal (optional hook)
  container._jarvisCleanup = () => clearInterval(intervalId);
}
