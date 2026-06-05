/**
 * notes.js — Quick Notes component with persistence and expand/collapse.
 */

import { get, set } from '../utils/storage.js';

const STORAGE_KEY = 'notes';

function injectStyles() {
  if (document.getElementById('jarvis-notes-styles')) return;

  const style = document.createElement('style');
  style.id = 'jarvis-notes-styles';
  style.textContent = `
    .jarvis-notes {
      padding: 0.5rem 0;
    }

    .jarvis-notes-input-area {
      margin-bottom: 1rem;
    }

    .jarvis-notes-textarea {
      width: 100%;
      min-height: 70px;
      background: rgba(0, 212, 255, 0.04);
      border: 1px solid rgba(0, 212, 255, 0.15);
      border-radius: 6px;
      padding: 0.6rem 0.8rem;
      color: var(--color-text, #e0e6ed);
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 0.85rem;
      outline: none;
      resize: vertical;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      box-sizing: border-box;
    }

    .jarvis-notes-textarea:focus {
      border-color: var(--color-accent, #00d4ff);
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
    }

    .jarvis-notes-textarea::placeholder {
      color: var(--color-text-dim, #6b7a8d);
    }

    .jarvis-notes-submit-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.4rem;
    }

    .jarvis-notes-hint {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.65rem;
      color: var(--color-text-dim, #6b7a8d);
      opacity: 0.6;
    }

    .jarvis-notes-submit {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.25);
      color: var(--color-accent, #00d4ff);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.75rem;
      padding: 0.35rem 0.8rem;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s ease;
      letter-spacing: 0.05em;
    }

    .jarvis-notes-submit:hover {
      background: rgba(0, 212, 255, 0.2);
      border-color: var(--color-accent, #00d4ff);
    }

    .jarvis-notes-submit:active {
      transform: scale(0.95);
    }

    .jarvis-notes-list {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .jarvis-notes-item {
      background: rgba(0, 212, 255, 0.03);
      border: 1px solid rgba(0, 212, 255, 0.06);
      border-radius: 6px;
      padding: 0.6rem 0.7rem;
      cursor: pointer;
      transition: all 0.25s ease;
      animation: jarvis-notes-slidein 0.3s ease;
    }

    @keyframes jarvis-notes-slidein {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .jarvis-notes-item:hover {
      background: rgba(0, 212, 255, 0.06);
      border-color: rgba(0, 212, 255, 0.12);
    }

    .jarvis-notes-item.jarvis-notes-removing {
      animation: jarvis-notes-fadeout 0.3s ease forwards;
    }

    @keyframes jarvis-notes-fadeout {
      from { opacity: 1; max-height: 200px; }
      to { opacity: 0; max-height: 0; padding: 0 0.7rem; margin: 0; }
    }

    .jarvis-notes-item-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .jarvis-notes-preview {
      flex: 1;
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 0.85rem;
      color: var(--color-text, #e0e6ed);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .jarvis-notes-time {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.65rem;
      color: var(--color-text-dim, #6b7a8d);
      flex-shrink: 0;
    }

    .jarvis-notes-delete {
      background: none;
      border: none;
      color: var(--color-text-dim, #6b7a8d);
      font-size: 1rem;
      cursor: pointer;
      padding: 0 0.15rem;
      line-height: 1;
      opacity: 0;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .jarvis-notes-item:hover .jarvis-notes-delete {
      opacity: 1;
    }

    .jarvis-notes-delete:hover {
      color: var(--color-danger, #ff4757);
    }

    .jarvis-notes-full {
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 0.85rem;
      color: var(--color-text, #e0e6ed);
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(0, 212, 255, 0.06);
      white-space: pre-wrap;
      word-break: break-word;
      display: none;
    }

    .jarvis-notes-item.jarvis-notes-expanded .jarvis-notes-full {
      display: block;
    }

    .jarvis-notes-item.jarvis-notes-expanded .jarvis-notes-preview {
      white-space: normal;
      display: none;
    }

    .jarvis-notes-empty {
      text-align: center;
      color: var(--color-text-dim, #6b7a8d);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.8rem;
      padding: 1.5rem 0;
      opacity: 0.6;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Format a timestamp as relative time (e.g., "2 min ago").
 * @param {string} isoString - ISO timestamp.
 * @returns {string} Relative time string.
 */
function relativeTime(isoString) {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(isoString).toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Initialize the notes component.
 * @param {HTMLElement} container - DOM element to render into.
 */
export function init(container) {
  injectStyles();

  let notes = get(STORAGE_KEY, []);

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-notes';
  wrapper.innerHTML = `
    <div class="jarvis-section-header">Quick Notes</div>
    <div class="jarvis-notes-input-area">
      <textarea class="jarvis-notes-textarea" data-ref="textarea" placeholder="Record a note..." maxlength="2000"></textarea>
      <div class="jarvis-notes-submit-row">
        <span class="jarvis-notes-hint">Ctrl + Enter to save</span>
        <button class="jarvis-notes-submit" data-ref="submit">Save Note</button>
      </div>
    </div>
    <div class="jarvis-notes-list" data-ref="list"></div>
  `;
  container.appendChild(wrapper);

  const textareaEl = wrapper.querySelector('[data-ref="textarea"]');
  const submitBtn = wrapper.querySelector('[data-ref="submit"]');
  const listEl = wrapper.querySelector('[data-ref="list"]');

  function save() {
    set(STORAGE_KEY, notes);
    window.dispatchEvent(new Event('jarvis:storage-changed'));
  }

  function addNote(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const note = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: trimmed,
      createdAt: new Date().toISOString(),
    };

    notes.unshift(note);
    save();
    renderList();
  }

  function truncate(text, maxLen = 80) {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '…';
  }

  function renderList() {
    listEl.innerHTML = '';

    if (notes.length === 0) {
      listEl.innerHTML = '<div class="jarvis-notes-empty">No notes recorded.</div>';
      return;
    }

    notes.forEach((note) => {
      const div = document.createElement('div');
      div.className = 'jarvis-notes-item';
      div.dataset.id = note.id;
      div.innerHTML = `
        <div class="jarvis-notes-item-header">
          <span class="jarvis-notes-preview">${escapeHtml(truncate(note.text))}</span>
          <span class="jarvis-notes-time">${relativeTime(note.createdAt)}</span>
          <button class="jarvis-notes-delete" data-action="delete" aria-label="Delete note">×</button>
        </div>
        <div class="jarvis-notes-full">${escapeHtml(note.text)}</div>
      `;
      listEl.appendChild(div);
    });
  }

  // Submit via button
  submitBtn.addEventListener('click', () => {
    addNote(textareaEl.value);
    textareaEl.value = '';
  });

  // Submit via Ctrl+Enter
  textareaEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      addNote(textareaEl.value);
      textareaEl.value = '';
    }
  });

  // Delegated click handler for expand/collapse and delete
  listEl.addEventListener('click', (e) => {
    // Delete
    if (e.target.dataset.action === 'delete') {
      e.stopPropagation();
      const item = e.target.closest('.jarvis-notes-item');
      if (!item) return;
      const id = item.dataset.id;
      item.classList.add('jarvis-notes-removing');
      item.addEventListener('animationend', () => {
        notes = notes.filter((n) => n.id !== id);
        save();
        renderList();
      }, { once: true });
      return;
    }

    // Expand/collapse
    const item = e.target.closest('.jarvis-notes-item');
    if (item) {
      item.classList.toggle('jarvis-notes-expanded');
    }
  });

  // Listen for custom event from command bar
  document.addEventListener('jarvis:add-note', (e) => {
    if (e.detail) {
      addNote(typeof e.detail === 'string' ? e.detail : e.detail.text || '');
    }
  });

  // Update relative timestamps every 30 seconds
  const timestampInterval = setInterval(() => {
    const timeEls = listEl.querySelectorAll('.jarvis-notes-time');
    timeEls.forEach((el, i) => {
      if (notes[i]) {
        el.textContent = relativeTime(notes[i].createdAt);
      }
    });
  }, 30000);

  container._jarvisCleanup = () => clearInterval(timestampInterval);

  renderList();
}
