/**
 * command-bar.js — Command Interface / Chat component for Jarvis dashboard.
 * The central interaction hub that processes commands and dispatches custom events.
 */
import { marked } from 'marked';
import { sendMessageToJarvis, clearJarvisMemory } from '../utils/gemini-api.js';
import { initVoice, speak, forceStartListening } from './voice.js';

function injectStyles() {
  if (document.getElementById('jarvis-command-styles')) return;

  const style = document.createElement('style');
  style.id = 'jarvis-command-styles';
  style.textContent = `
    .jarvis-command {
      padding: 0.5rem 0;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .jarvis-command-history {
      flex: 1;
      overflow-y: auto;
      max-height: 380px;
      min-height: 200px;
      padding: 0.5rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      scroll-behavior: smooth;
    }

    .jarvis-command-history::-webkit-scrollbar {
      width: 4px;
    }

    .jarvis-command-history::-webkit-scrollbar-track {
      background: transparent;
    }

    .jarvis-command-history::-webkit-scrollbar-thumb {
      background: rgba(0, 212, 255, 0.15);
      border-radius: 2px;
    }

    .jarvis-command-msg {
      display: flex;
      gap: 0.6rem;
      align-items: flex-start;
      animation: jarvis-command-fadein 0.3s ease;
    }

    @keyframes jarvis-command-fadein {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .jarvis-command-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .jarvis-command-avatar-jarvis {
      background: rgba(0, 212, 255, 0.15);
      color: var(--color-accent, #00d4ff);
      border: 1px solid rgba(0, 212, 255, 0.3);
    }

    .jarvis-command-avatar-user {
      background: rgba(123, 97, 255, 0.15);
      color: var(--color-accent-secondary, #7b61ff);
      border: 1px solid rgba(123, 97, 255, 0.3);
    }

    .jarvis-command-bubble {
      flex: 1;
      min-width: 0;
    }

    .jarvis-command-meta {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.6rem;
      color: var(--color-text-dim, #6b7a8d);
      margin-bottom: 0.2rem;
    }

    .jarvis-command-text {
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 0.85rem;
      line-height: 1.5;
      word-break: break-word;
    }

    .jarvis-msg-jarvis .jarvis-command-text {
      color: var(--color-text, #e0e6ed);
    }

    .jarvis-msg-user .jarvis-command-text {
      color: var(--color-text-dim, #6b7a8d);
    }

    .jarvis-command-typing .jarvis-command-text {
      display: flex;
      gap: 3px;
      align-items: center;
    }

    .jarvis-command-typing-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--color-accent, #00d4ff);
      animation: jarvis-command-dot-bounce 1.2s ease-in-out infinite;
    }

    .jarvis-command-typing-dot:nth-child(2) { animation-delay: 0.15s; }
    .jarvis-command-typing-dot:nth-child(3) { animation-delay: 0.4s; }

    .jarvis-markdown p { margin-bottom: 0.5rem; }
    .jarvis-markdown p:last-child { margin-bottom: 0; }
    .jarvis-markdown ul, .jarvis-markdown ol { margin-left: 1.2rem; margin-bottom: 0.5rem; }
    .jarvis-markdown code {
      background: rgba(0, 212, 255, 0.1);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      font-family: var(--font-mono, monospace);
    }
    .jarvis-markdown pre {
      background: rgba(0,0,0,0.3);
      padding: 0.5rem;
      border-radius: 4px;
      overflow-x: auto;
      margin-bottom: 0.5rem;
    }

    @keyframes jarvis-command-dot-bounce {
      0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
      30% { opacity: 1; transform: translateY(-4px); }
    }

    .jarvis-command-input-row {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(0, 212, 255, 0.08);
    }

    .jarvis-command-input {
      flex: 1;
      background: rgba(0, 212, 255, 0.04);
      border: 1px solid rgba(0, 212, 255, 0.15);
      border-radius: 6px;
      padding: 0.6rem 0.8rem;
      color: var(--color-text, #e0e6ed);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .jarvis-command-input:focus {
      border-color: var(--color-accent, #00d4ff);
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
    }

    .jarvis-command-input::placeholder {
      color: var(--color-text-dim, #6b7a8d);
    }

    .jarvis-command-help-list {
      margin: 0.3rem 0 0 0;
      padding-left: 0;
      list-style: none;
    }

    .jarvis-command-help-list li {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.78rem;
      padding: 0.15rem 0;
      color: var(--color-text-dim, #6b7a8d);
    }

    .jarvis-command-help-cmd {
      color: var(--color-accent, #00d4ff);
      font-weight: 600;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Get current time in HH:MM format.
 * @returns {string}
 */
function getTimeStamp() {
  const now = new Date();
  let h = now.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${ampm}`;
}

/**
 * Pad a number to two digits.
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Escape HTML special characters.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Initialize the command bar component.
 * @param {HTMLElement} container - DOM element to render into.
 */
export function init(container) {
  injectStyles();

  const sessionStart = Date.now();

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-command';
  wrapper.innerHTML = `
    <div class="jarvis-section-header">Command Interface</div>
    <div class="jarvis-command-history" data-ref="history"></div>
    <div class="jarvis-command-input-row">
      <input type="text" class="jarvis-command-input" data-ref="input" placeholder="Enter command, Sir..." autocomplete="off" />
    </div>
  `;
  container.appendChild(wrapper);

  const historyEl = wrapper.querySelector('[data-ref="history"]');
  const inputEl = wrapper.querySelector('[data-ref="input"]');

  /**
   * Add a message to the chat history.
   * @param {'jarvis' | 'user'} sender
   * @param {string} html - Message content (can contain HTML).
   */
  function addMessage(sender, html) {
    const isJarvis = sender === 'jarvis';
    const msgDiv = document.createElement('div');
    msgDiv.className = `jarvis-command-msg ${isJarvis ? 'jarvis-msg-jarvis' : 'jarvis-msg-user'}`;
    msgDiv.innerHTML = `
      <div class="jarvis-command-avatar ${isJarvis ? 'jarvis-command-avatar-jarvis' : 'jarvis-command-avatar-user'}">
        ${isJarvis ? 'J' : '&gt;'}
      </div>
      <div class="jarvis-command-bubble">
        <div class="jarvis-command-meta">${isJarvis ? 'JARVIS' : 'YOU'} · ${getTimeStamp()}</div>
        <div class="jarvis-command-text">${html}</div>
      </div>
    `;
    historyEl.appendChild(msgDiv);
    historyEl.scrollTop = historyEl.scrollHeight;
  }

  /**
   * Show a typing indicator, then replace it with the response.
   * @param {string} html - Response HTML.
   * @param {number} delay - Delay in ms before showing response.
   */
  function addJarvisResponse(html, delay = 600) {
    // Add typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'jarvis-command-msg jarvis-msg-jarvis jarvis-command-typing';
    typingDiv.innerHTML = `
      <div class="jarvis-command-avatar jarvis-command-avatar-jarvis">J</div>
      <div class="jarvis-command-bubble">
        <div class="jarvis-command-meta">JARVIS · ${getTimeStamp()}</div>
        <div class="jarvis-command-text">
          <span class="jarvis-command-typing-dot"></span>
          <span class="jarvis-command-typing-dot"></span>
          <span class="jarvis-command-typing-dot"></span>
        </div>
      </div>
    `;
    historyEl.appendChild(typingDiv);
    historyEl.scrollTop = historyEl.scrollHeight;

    setTimeout(() => {
      if (typingDiv.parentNode) {
        typingDiv.remove();
      }
      addMessage('jarvis', `<div class="jarvis-markdown">${marked.parse(html)}</div>`);
    }, delay);
  }

  /**
   * Replace typing indicator with the actual response dynamically.
   * @param {string} html 
   */
  function replaceTypingWithResponse(html, rawText) {
    const typingDivs = historyEl.querySelectorAll('.jarvis-command-typing');
    typingDivs.forEach(d => d.remove());
    addMessage('jarvis', `<div class="jarvis-markdown">${marked.parse(html)}</div>`);
    if (rawText) speak(rawText);
  }

  /**
   * Pick a random item from an array.
   * @param {string[]} arr
   * @returns {string}
   */
  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getUptime() {
    const start = window.__jarvisStartTime || sessionStart;
    const sec = Math.floor((Date.now() - start) / 1000);
    const h = pad(Math.floor(sec / 3600));
    const m = pad(Math.floor((sec % 3600) / 60));
    const s = pad(sec % 60);
    return `${h}:${m}:${s}`;
  }

  // Handle user input
  inputEl.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = inputEl.value.trim();
      if (!text) return;
      inputEl.value = '';
      processCommand(text);
    }
  });

  async function processCommand(text) {
    addMessage('user', escapeHtml(text));

      // Local command: clear chat history
      if (text.toLowerCase() === 'clear' || text.toLowerCase() === 'cls') {
        historyEl.innerHTML = '';
        addMessage('jarvis', 'Sir, chat history cleared. Ready for new directives.');
        return;
      }

      // Local command: system controls
      if (text.toLowerCase().includes('lock pc') || text.toLowerCase().includes('lock computer')) {
        addMessage('jarvis', 'Locking workstation...');
        fetch('http://localhost:5174/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'rundll32.exe user32.dll,LockWorkStation' })
        }).catch(e => console.error(e));
        return;
      }

      if (text.toLowerCase().includes('open vscode') || text.toLowerCase().includes('code')) {
        addMessage('jarvis', 'Launching Visual Studio Code...');
        fetch('http://localhost:5174/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'code' })
        }).catch(e => console.error(e));
        return;
      }

      if (text.toLowerCase().includes('open discord')) {
        addMessage('jarvis', 'Launching Discord...');
        speak('Launching Discord now, Sir.');
        fetch('http://localhost:5174/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `"${process.env.LOCALAPPDATA}\\Discord\\Update.exe" --processStart Discord.exe` })
        }).catch(e => console.error(e));
        return;
      }

      // Show typing indicator
      const typingDiv = document.createElement('div');
      typingDiv.className = 'jarvis-command-msg jarvis-msg-jarvis jarvis-command-typing';
      typingDiv.innerHTML = `
        <div class="jarvis-command-avatar jarvis-command-avatar-jarvis">J</div>
        <div class="jarvis-command-bubble">
          <div class="jarvis-command-meta">JARVIS · ${getTimeStamp()}</div>
          <div class="jarvis-command-text">
            <span class="jarvis-command-typing-dot"></span>
            <span class="jarvis-command-typing-dot"></span>
            <span class="jarvis-command-typing-dot"></span>
          </div>
        </div>
      `;
      historyEl.appendChild(typingDiv);
      historyEl.scrollTop = historyEl.scrollHeight;

      // Call Gemini API
      try {
        const responseText = await sendMessageToJarvis(text);
        replaceTypingWithResponse(responseText, responseText);
      } catch (err) {
        const errText = "Sir, I am experiencing a critical neural network failure.";
        replaceTypingWithResponse(errText, errText);
        console.error(err);
      }
  }

  // Listen for focus event
  document.addEventListener('jarvis:focus-command', () => {
    inputEl.focus();
  });

  // Voice Initialization
  initVoice(
    (commandText) => {
      // Restore input placeholder and process
      inputEl.placeholder = "Enter command, Sir...";
      processCommand(commandText);
    },
    () => {
      // Wake word detected
      inputEl.placeholder = "Listening...";
      inputEl.focus();
    }
  );

  // Initial greeting
  const initMsg = 'Sir, J.A.R.V.I.S is online. All systems operational. How may I assist you?';
  addMessage('jarvis', initMsg);
  speak(initMsg);
}
