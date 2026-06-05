/* ============================================================
   J.A.R.V.I.S — Main Entry Point
   ============================================================ */
import './style.css';

import { init as initGreeting } from './components/greeting.js';
import { init as initClock } from './components/clock.js';
import { init as initWeather } from './components/weather.js';
import { init as initTasks } from './components/tasks.js';
import { init as initNotes } from './components/notes.js';
import { init as initCommandBar } from './components/command-bar.js';
import { init as initMusicPlayer } from './components/music-player.js';
import { init as initSystemStats } from './components/system-stats.js';
import { init as initLatencyTracker } from './components/latency-tracker.js';
import { init as initDeploymentAgent } from './components/deployment-agent.js';

document.addEventListener('DOMContentLoaded', () => {
  /* ── Resolve widget containers ─────────────────────────── */
  const containers = {
    greeting: document.getElementById('greeting-widget'),
    clock: document.getElementById('clock-widget'),
    weather: document.getElementById('weather-widget'),
    tasks: document.getElementById('tasks-widget'),
    notes: document.getElementById('notes-widget'),
    latency: document.getElementById('latency-widget'),
    deployment: document.getElementById('deployment-widget'),
    commandBar: document.getElementById('command-widget'),
    music: document.getElementById('music-widget'),
    stats: document.getElementById('stats-widget'),
  };

  /* ── Initialize all components ─────────────────────────── */
  initGreeting(containers.greeting);
  initClock(containers.clock);
  initWeather(containers.weather);
  initTasks(containers.tasks);
  initNotes(containers.notes);
  if (containers.latency) initLatencyTracker(containers.latency);
  if (containers.deployment) initDeploymentAgent(containers.deployment);
  initCommandBar(containers.commandBar);
  initMusicPlayer(containers.music);
  initSystemStats(containers.stats);
  
  /* ── Random Scanner Line Effect ────────────────────────── */
  setInterval(() => {
    const cards = document.querySelectorAll('.jarvis-card');
    if (cards.length > 0) {
      // Pick a random card
      const randomCard = cards[Math.floor(Math.random() * cards.length)];
      randomCard.classList.add('scanning');
      
      // Remove class after animation finishes (4s)
      setTimeout(() => {
        randomCard.classList.remove('scanning');
      }, 4000);
    }
  }, 12000); // Trigger every 12 seconds

  /* ── Alt+Space → focus command input ───────────────────── */
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'Space') {
      e.preventDefault();
      document.dispatchEvent(new CustomEvent('jarvis:focus-command'));
    }
  });

  /* ── Page-load animation ───────────────────────────────── */
  const dashboard = document.querySelector('.jarvis-dashboard');
  if (dashboard) {
    dashboard.style.opacity = '0';
    dashboard.style.transform = 'translateY(12px)';
    requestAnimationFrame(() => {
      dashboard.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      dashboard.style.opacity = '1';
      dashboard.style.transform = 'translateY(0)';
    });
  }

  /* ── Background Particle System ────────────────────────── */
  const canvas = document.createElement('canvas');
  canvas.id = 'jarvis-particles';
  Object.assign(canvas.style, {
    position: 'fixed',
    top: '0', left: '0', width: '100%', height: '100%',
    zIndex: '-1',
    pointerEvents: 'none',
    opacity: '0.6',
    willChange: 'transform'
  });
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let width, height;
  const particles = [];
  const particleCount = 100;
  const PI2 = Math.PI * 2;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 0.5,
      speedY: Math.random() * 1 - 0.5,
      speedX: Math.random() * 1 - 0.5,
      opacity: Math.random() * 0.5 + 0.1
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, width, height);
    
    const weatherMain = window.__jarvisWeather?.main || 'Clear';
    const isRain = weatherMain === 'Rain' || weatherMain === 'Drizzle' || weatherMain === 'Thunderstorm';
    const isSnow = weatherMain === 'Snow';

    // Set static fill color, rely on globalAlpha for individual particle opacity
    if (isRain) {
      ctx.fillStyle = '#ffb000';
    } else if (isSnow) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#ffb000';
    }

    particles.forEach(p => {
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      
      if (isRain) {
        ctx.rect(p.x, p.y, 1, p.size * 5); // Rain drops
        p.y += (p.speedY + 4);
        p.x += (p.speedX + 0.5);
      } else if (isSnow) {
        ctx.arc(p.x, p.y, p.size * 1.5, 0, PI2);
        p.y += (p.speedY + 1);
        p.x += Math.sin(p.y * 0.01) * 0.5; // Snow drift
      } else {
        // Holographic data fragments
        ctx.arc(p.x, p.y, p.size, 0, PI2);
        p.y += p.speedY * 0.5;
        p.x += p.speedX * 0.5;
      }
      
      ctx.fill();

      // Wrap around screen
      if (p.y > height) p.y = 0;
      if (p.y < 0) p.y = height;
      if (p.x > width) p.x = 0;
      if (p.x < 0) p.x = width;
    });

    ctx.globalAlpha = 1.0; // reset
    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  /* ── Styled startup log ────────────────────────────────── */
  console.log(
    '%c J.A.R.V.I.S initialized ',
    'background: #00e5ff; color: #030814; font-weight: bold; font-size: 14px; padding: 4px 12px; border-radius: 4px;'
  );
});
