/**
 * weather.js — Weather display widget with geolocation and demo fallback.
 */

import { fetchWeather, getLocation, getDemoWeather } from '../utils/weather-api.js';

function injectStyles() {
  if (document.getElementById('jarvis-weather-styles')) return;

  const style = document.createElement('style');
  style.id = 'jarvis-weather-styles';
  style.textContent = `
    .jarvis-weather {
      padding: 0.5rem 0;
    }

    .jarvis-weather-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .jarvis-weather-loading {
      text-align: center;
      padding: 2rem 0;
      color: var(--color-text-dim, #6b7a8d);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.85rem;
    }

    .jarvis-weather-loading-dots::after {
      content: '';
      animation: jarvis-weather-dots 1.5s steps(4, end) infinite;
    }

    @keyframes jarvis-weather-dots {
      0% { content: ''; }
      25% { content: '.'; }
      50% { content: '..'; }
      75% { content: '...'; }
      100% { content: ''; }
    }

    .jarvis-weather-main {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      animation: jarvis-weather-fadein 0.5s ease;
    }

    @keyframes jarvis-weather-fadein {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .jarvis-weather-emoji {
      font-size: 2.8rem;
      line-height: 1;
    }

    .jarvis-weather-temp {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 2.4rem;
      font-weight: 700;
      color: var(--color-accent, #00d4ff);
      line-height: 1;
    }

    .jarvis-weather-unit {
      font-size: 1rem;
      font-weight: 400;
      opacity: 0.6;
    }

    .jarvis-weather-info {
      flex: 1;
    }

    .jarvis-weather-city {
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 1rem;
      color: var(--color-text, #e0e6ed);
      font-weight: 600;
    }

    .jarvis-weather-desc {
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 0.85rem;
      color: var(--color-text-dim, #6b7a8d);
      text-transform: capitalize;
      margin-top: 0.15rem;
    }

    .jarvis-weather-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.75rem;
      animation: jarvis-weather-fadein 0.5s ease 0.15s both;
    }

    .jarvis-weather-detail {
      background: rgba(0, 212, 255, 0.04);
      border: 1px solid rgba(0, 212, 255, 0.08);
      border-radius: 8px;
      padding: 0.6rem 0.5rem;
      text-align: center;
    }

    .jarvis-weather-detail-label {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-text-dim, #6b7a8d);
      margin-bottom: 0.25rem;
    }

    .jarvis-weather-detail-value {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text, #e0e6ed);
    }

    .jarvis-weather-refresh {
      background: none;
      border: 1px solid rgba(0, 212, 255, 0.2);
      color: var(--color-accent, #00d4ff);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.7rem;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.05em;
    }

    .jarvis-weather-refresh:hover {
      background: rgba(0, 212, 255, 0.1);
      border-color: var(--color-accent, #00d4ff);
    }

    .jarvis-weather-refresh:active {
      transform: scale(0.95);
    }

    .jarvis-weather-refresh.jarvis-weather-spinning {
      pointer-events: none;
      opacity: 0.5;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Map weather description keywords to emoji.
 * @param {string} desc - Weather description string.
 * @returns {string} Emoji character.
 */
function getWeatherEmoji(desc) {
  const d = desc.toLowerCase();
  if (d.includes('thunder')) return '🌩️';
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('mist') || d.includes('haze') || d.includes('fog') || d.includes('smoke')) return '🌫️';
  if (d.includes('partly') || d.includes('few clouds') || d.includes('scattered')) return '🌤️';
  if (d.includes('cloud') || d.includes('overcast')) return '☁️';
  if (d.includes('clear') || d.includes('sunny')) return '☀️';
  return '🌤️';
}

/**
 * Initialize the weather component.
 * @param {HTMLElement} container - DOM element to render into.
 */
export function init(container) {
  injectStyles();

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-weather';
  wrapper.innerHTML = `
    <div class="jarvis-weather-header">
      <div class="jarvis-section-header" style="margin-bottom:0">Weather</div>
      <button class="jarvis-weather-refresh" data-ref="refresh">↻ Refresh</button>
    </div>
    <div data-ref="content">
      <div class="jarvis-weather-loading">
        Acquiring weather data<span class="jarvis-weather-loading-dots"></span>
      </div>
    </div>
  `;
  container.appendChild(wrapper);

  const contentEl = wrapper.querySelector('[data-ref="content"]');
  const refreshBtn = wrapper.querySelector('[data-ref="refresh"]');

  /** Cached weather data for command-bar access */
  let cachedWeather = null;

  /**
   * Render weather data into the content area.
   * @param {Object} data - Weather data object.
   */
  function renderWeather(data) {
    cachedWeather = data;
    // Expose weather data globally for the command bar
    window.__jarvisWeather = data;

    const emoji = getWeatherEmoji(data.description);
    contentEl.innerHTML = `
      <div class="jarvis-weather-main">
        <div class="jarvis-weather-emoji">${emoji}</div>
        <div>
          <div class="jarvis-weather-temp">${data.temp}<span class="jarvis-weather-unit">°C</span></div>
        </div>
        <div class="jarvis-weather-info">
          <div class="jarvis-weather-city">${data.city}</div>
          <div class="jarvis-weather-desc">${data.description}</div>
        </div>
      </div>
      <div class="jarvis-weather-grid">
        <div class="jarvis-weather-detail">
          <div class="jarvis-weather-detail-label">Humidity</div>
          <div class="jarvis-weather-detail-value">${data.humidity}%</div>
        </div>
        <div class="jarvis-weather-detail">
          <div class="jarvis-weather-detail-label">Wind</div>
          <div class="jarvis-weather-detail-value">${data.wind} m/s</div>
        </div>
        <div class="jarvis-weather-detail">
          <div class="jarvis-weather-detail-label">Feels Like</div>
          <div class="jarvis-weather-detail-value">${data.feelsLike}°C</div>
        </div>
      </div>
    `;
  }

  /**
   * Load weather data — attempt geolocation + API, fallback to demo.
   */
  async function loadWeather() {
    contentEl.innerHTML = `
      <div class="jarvis-weather-loading">
        Acquiring weather data<span class="jarvis-weather-loading-dots"></span>
      </div>
    `;
    refreshBtn.classList.add('jarvis-weather-spinning');

    try {
      const loc = await getLocation();
      const data = await fetchWeather(loc.lat, loc.lon);
      renderWeather(data);
    } catch (err) {
      console.warn('[Jarvis Weather] Load failed, using demo:', err);
      renderWeather(getDemoWeather());
    } finally {
      refreshBtn.classList.remove('jarvis-weather-spinning');
    }
  }

  refreshBtn.addEventListener('click', loadWeather);
  loadWeather();
}
