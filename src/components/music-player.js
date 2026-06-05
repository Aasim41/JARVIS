/**
 * music-player.js — Fully functional music player powered by YouTube IFrame API.
 */

// ── Inject CSS ──────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('jarvis-music-styles')) return;

  const style = document.createElement('style');
  style.id = 'jarvis-music-styles';
  style.textContent = `
    .jarvis-music {
      padding: 0.5rem 0;
      position: relative;
    }
    
    .jarvis-music-search {
      display: flex;
      gap: 10px;
      margin-bottom: 16px;
    }

    .jarvis-music-search input {
      flex: 1;
    }

    .jarvis-music-waveform {
      width: 100%;
      height: 80px;
      border-radius: 8px;
      background: rgba(255, 176, 0, 0.02);
      border: 1px solid rgba(255, 176, 0, 0.05);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
      padding: 0 10px;
      box-shadow: inset 0 0 20px rgba(255, 176, 0, 0.05);
      overflow: hidden;
    }

    .jarvis-music-bar {
      flex: 1;
      background: var(--color-accent, #ffb000);
      transition: height 0.1s ease;
      height: 2px;
      border-radius: 2px;
      opacity: 0.5;
    }

    .jarvis-music-bar.jarvis-music-playing {
      animation: jarvis-music-bounce var(--bar-speed, 0.5s) ease-in-out infinite alternate;
      opacity: 1;
    }

    @keyframes jarvis-music-bounce {
      0% { height: var(--bar-min, 2px); }
      100% { height: var(--bar-max, 60px); background: #fff; box-shadow: 0 0 10px #fff; }
    }
    
    .jarvis-music-track {
      text-align: center;
      margin-bottom: 1rem;
    }
    .jarvis-music-title {
      font-weight: 600;
      font-size: 1.1rem;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .jarvis-music-artist {
      font-size: 0.85rem;
      color: var(--color-text-dim);
    }

    .jarvis-music-progress-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 1rem;
    }
    .jarvis-music-progress {
      width: 100%;
      appearance: none;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    }
    .jarvis-music-progress::-webkit-slider-thumb {
      appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--color-accent);
      box-shadow: 0 0 10px var(--color-accent-glow);
    }
    .jarvis-music-time {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-dim);
    }

    .jarvis-music-controls {
      display: flex;
      justify-content: center;
      gap: 16px;
    }
    .jarvis-music-btn {
      background: none;
      border: 1px solid rgba(255,176,0,0.3);
      color: var(--color-text);
      font-size: 1.2rem;
      cursor: pointer;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .jarvis-music-btn:hover {
      background: rgba(255,176,0,0.1);
      border-color: var(--color-accent);
      box-shadow: 0 0 10px var(--color-accent-glow);
    }
    .jarvis-music-btn-play {
      background: var(--color-accent);
      color: #000;
      border: none;
    }
    .jarvis-music-btn-play:hover {
      background: #fff;
    }
    
    #jarvis-yt-player {
      position: absolute;
      width: 0;
      height: 0;
      opacity: 0;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

// ── YouTube API Setup ───────────────────────────────────────────
let ytApiReady = false;
let ytPlayer = null;
let ytReadyPromise = new Promise((resolve) => {
  window.onYouTubeIframeAPIReady = () => {
    ytApiReady = true;
    resolve();
  };
});

function loadYouTubeApi() {
  if (document.getElementById('yt-api-script')) return;
  const tag = document.createElement('script');
  tag.id = 'yt-api-script';
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// ── Format Helper ───────────────────────────────────────────────
function formatTime(s) {
  if (isNaN(s)) return "0:00";
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${min}:${String(sec).padStart(2, '0')}`;
}

// ── Main Component ──────────────────────────────────────────────
export async function init(container) {
  injectStyles();
  loadYouTubeApi();

  const barCount = 32;
  const barConfigs = Array.from({ length: barCount }, () => ({
    speed: (0.2 + Math.random() * 0.4).toFixed(2),
    min: Math.floor(2 + Math.random() * 5),
    max: Math.floor(20 + Math.random() * 60),
  }));

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-music';
  wrapper.innerHTML = `
    <div class="jarvis-section-header">Audio Stream</div>
    
    <div class="jarvis-music-search">
      <input type="text" class="jarvis-input" id="music-search" placeholder="Search song..." autocomplete="off" />
      <button class="jarvis-btn" id="music-search-btn">Play</button>
    </div>

    <div class="jarvis-music-waveform" data-ref="visualizer">
      ${barConfigs.map(cfg => `<div class="jarvis-music-bar" style="--bar-speed:${cfg.speed}s;--bar-min:${cfg.min}px;--bar-max:${cfg.max}px"></div>`).join('')}
    </div>
    
    <div class="jarvis-music-track">
      <div class="jarvis-music-title" id="music-title">Awaiting Request...</div>
      <div class="jarvis-music-artist" id="music-status">System Standby</div>
    </div>
    
    <div class="jarvis-music-progress-container">
      <input type="range" class="jarvis-music-progress" id="music-progress" min="0" max="100" value="0" disabled />
      <div class="jarvis-music-time">
        <span id="music-elapsed">0:00</span>
        <span id="music-total">0:00</span>
      </div>
    </div>
    
    <div class="jarvis-music-controls">
      <button class="jarvis-music-btn" id="music-prev" aria-label="Restart">⏮</button>
      <button class="jarvis-music-btn jarvis-music-btn-play" id="music-play" aria-label="Play/Pause">▶</button>
    </div>

    <!-- Invisible YT Player Container -->
    <div id="jarvis-yt-player"></div>
  `;
  container.appendChild(wrapper);

  // UI Elements
  const searchInput = document.getElementById('music-search');
  const searchBtn = document.getElementById('music-search-btn');
  const titleEl = document.getElementById('music-title');
  const statusEl = document.getElementById('music-status');
  const progressEl = document.getElementById('music-progress');
  const elapsedEl = document.getElementById('music-elapsed');
  const totalEl = document.getElementById('music-total');
  const playBtn = document.getElementById('music-play');
  const prevBtn = document.getElementById('music-prev');
  const bars = wrapper.querySelectorAll('.jarvis-music-bar');

  let syncInterval = null;
  let isPlaying = false;
  let duration = 0;

  // Initialize YT Player
  await ytReadyPromise;
  
  ytPlayer = new window.YT.Player('jarvis-yt-player', {
    height: '10',
    width: '10',
    playerVars: { 'autoplay': 0, 'controls': 0 },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });

  function onPlayerReady(event) {
    console.log('[Music] YouTube Player Ready');
    statusEl.textContent = 'System Ready';
  }

  function onPlayerStateChange(event) {
    // 1 = PLAYING, 2 = PAUSED, 0 = ENDED, 3 = BUFFERING
    if (event.data === window.YT.PlayerState.PLAYING) {
      isPlaying = true;
      playBtn.textContent = '⏸';
      bars.forEach(b => b.classList.add('jarvis-music-playing'));
      duration = ytPlayer.getDuration();
      progressEl.max = duration;
      progressEl.disabled = false;
      totalEl.textContent = formatTime(duration);
      
      // Attempt to get video title if possible, otherwise keep what we searched for
      const videoData = ytPlayer.getVideoData();
      if (videoData && videoData.title) {
        titleEl.textContent = videoData.title;
      }
      statusEl.textContent = 'Playing';
      
      startSync();
    } else {
      isPlaying = false;
      playBtn.textContent = '▶';
      bars.forEach(b => b.classList.remove('jarvis-music-playing'));
      stopSync();
      
      if (event.data === window.YT.PlayerState.BUFFERING) {
        statusEl.textContent = 'Buffering...';
      } else if (event.data === window.YT.PlayerState.PAUSED) {
        statusEl.textContent = 'Paused';
      } else if (event.data === window.YT.PlayerState.ENDED) {
        statusEl.textContent = 'Track Ended';
        progressEl.value = 0;
        elapsedEl.textContent = "0:00";
      }
    }
  }

  function onPlayerError(e) {
    console.error('[Music] YT Error:', e.data);
    titleEl.textContent = 'Playback Error';
    statusEl.textContent = 'Could not play this track';
    stopSync();
  }

  function startSync() {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      if (isPlaying && ytPlayer && ytPlayer.getCurrentTime) {
        const time = ytPlayer.getCurrentTime();
        progressEl.value = time;
        elapsedEl.textContent = formatTime(time);
      }
    }, 500);
  }

  function stopSync() {
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  }

  // Handle Search & Play
  async function searchAndPlay(query) {
    if (!query.trim()) return;
    
    titleEl.textContent = 'Searching...';
    statusEl.textContent = query;
    progressEl.value = 0;
    progressEl.disabled = true;

    try {
      const res = await fetch('http://localhost:5174/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `site:youtube.com ${query}` })
      });
      const data = await res.json();
      
      if (data.results && data.results.length > 0) {
        // Extract first youtube URL
        const topResult = data.results.find(r => r.url.includes('youtube.com/watch'));
        if (topResult) {
          const urlObj = new URL(topResult.url);
          const videoId = urlObj.searchParams.get('v');
          if (videoId) {
            titleEl.textContent = topResult.title.replace(' - YouTube', '');
            statusEl.textContent = 'Loading Stream...';
            ytPlayer.loadVideoById(videoId);
            searchInput.value = '';
            return;
          }
        }
      }
      
      titleEl.textContent = 'Not Found';
      statusEl.textContent = 'Could not find a stream for this query';
      
    } catch (err) {
      console.error(err);
      titleEl.textContent = 'Search Failed';
      statusEl.textContent = 'Bridge server unreachable';
    }
  }

  // Events
  searchBtn.addEventListener('click', () => searchAndPlay(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchAndPlay(searchInput.value);
  });

  playBtn.addEventListener('click', () => {
    if (!ytPlayer || !ytPlayer.getPlayerState) return;
    const state = ytPlayer.getPlayerState();
    if (state === window.YT.PlayerState.PLAYING) {
      ytPlayer.pauseVideo();
    } else {
      ytPlayer.playVideo();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (ytPlayer && ytPlayer.seekTo) {
      ytPlayer.seekTo(0);
    }
  });

  progressEl.addEventListener('input', () => {
    if (ytPlayer && ytPlayer.seekTo) {
      ytPlayer.seekTo(parseFloat(progressEl.value), true);
    }
  });

  container._jarvisCleanup = () => {
    stopSync();
    if (ytPlayer && ytPlayer.destroy) ytPlayer.destroy();
  };
}
