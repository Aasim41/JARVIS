/**
 * latency-tracker.js — Pings endpoints to track API health and response times.
 */

export function init(container) {
  // Inject component specific styles if not present
  if (!document.getElementById('jarvis-latency-styles')) {
    const style = document.createElement('style');
    style.id = 'jarvis-latency-styles';
    style.textContent = `
      .jarvis-latency {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .jarvis-latency-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 176, 0, 0.05);
        border-radius: var(--radius-sm);
      }
      .jarvis-latency-name {
        font-weight: 500;
        font-size: 0.85rem;
      }
      .jarvis-latency-url {
        font-size: 0.65rem;
        color: var(--color-text-dim);
        font-family: var(--font-mono);
      }
      .jarvis-latency-stats {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: var(--font-mono);
      }
      .jarvis-latency-ms {
        font-size: 0.9rem;
      }
      .jarvis-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-text-dim);
        box-shadow: 0 0 5px var(--color-text-dim);
      }
      .jarvis-dot.green {
        background: var(--color-success, #2ecc71);
        box-shadow: 0 0 8px var(--color-success, #2ecc71);
        animation: pulse-green 2s infinite;
      }
      .jarvis-dot.yellow {
        background: var(--color-warning, #f1c40f);
        box-shadow: 0 0 8px var(--color-warning, #f1c40f);
      }
      .jarvis-dot.red {
        background: var(--color-danger, #e74c3c);
        box-shadow: 0 0 8px var(--color-danger, #e74c3c);
        animation: pulse-red 1s infinite;
      }

      @keyframes pulse-green {
        0% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0.4); }
        70% { box-shadow: 0 0 0 6px rgba(46, 204, 113, 0); }
        100% { box-shadow: 0 0 0 0 rgba(46, 204, 113, 0); }
      }
      @keyframes pulse-red {
        0% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0.4); }
        70% { box-shadow: 0 0 0 8px rgba(231, 76, 60, 0); }
        100% { box-shadow: 0 0 0 0 rgba(231, 76, 60, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  // Define targets to ping (Streamlit App & GitHub API as placeholders for backend)
  const targets = [
    { id: 't1', name: 'IPL War Room', url: 'https://api.github.com/repos/Aasim41/ipl-auction-war-room/ping' }, // Safe ping
    { id: 't2', name: 'Synapse City API', url: 'https://api.github.com/repos/Aasim41/synapse-city/ping' } // Safe ping
  ];

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-latency';
  wrapper.innerHTML = `
    <div class="jarvis-section-header">Live API Latency</div>
    ${targets.map(t => `
      <div class="jarvis-latency-item" id="lat-${t.id}">
        <div>
          <div class="jarvis-latency-name">${t.name}</div>
          <div class="jarvis-latency-url">${t.url.replace('https://', '')}</div>
        </div>
        <div class="jarvis-latency-stats">
          <span class="jarvis-latency-ms" id="lat-ms-${t.id}">-- ms</span>
          <div class="jarvis-dot" id="lat-dot-${t.id}"></div>
        </div>
      </div>
    `).join('')}
  `;
  container.appendChild(wrapper);

  async function pingTarget(target) {
    const msEl = document.getElementById(`lat-ms-${target.id}`);
    const dotEl = document.getElementById(`lat-dot-${target.id}`);
    if (!msEl || !dotEl) return;

    const start = performance.now();
    try {
      // Using no-cors to avoid CORS blocks just for timing, though it means opaque responses
      await fetch(target.url, { mode: 'no-cors', cache: 'no-store' });
      const duration = Math.round(performance.now() - start);
      
      msEl.textContent = `${duration}ms`;
      
      dotEl.className = 'jarvis-dot'; // reset
      if (duration < 300) {
        dotEl.classList.add('green');
      } else if (duration < 1000) {
        dotEl.classList.add('yellow');
        msEl.style.color = 'var(--color-warning)';
      } else {
        dotEl.classList.add('red');
        msEl.style.color = 'var(--color-danger)';
      }
    } catch (e) {
      msEl.textContent = 'ERR';
      msEl.style.color = 'var(--color-danger)';
      dotEl.className = 'jarvis-dot red';
    }
  }

  function runPings() {
    targets.forEach(t => pingTarget(t));
  }

  // Initial ping
  runPings();
  // Ping every 5 seconds
  const interval = setInterval(runPings, 5000);

  container._jarvisCleanup = () => clearInterval(interval);
}
