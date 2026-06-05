/**
 * tasks.js — Mission Log task manager with persistence and custom event support.
 */

import { get, set } from '../utils/storage.js';

const STORAGE_KEY = 'tasks';

function injectStyles() {
  if (document.getElementById('jarvis-tasks-styles')) return;

  const style = document.createElement('style');
  style.id = 'jarvis-tasks-styles';
  style.textContent = `
    .jarvis-tasks {
      padding: 0.5rem 0;
    }

    .jarvis-tasks-input-row {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .jarvis-tasks-input {
      flex: 1;
      background: rgba(0, 212, 255, 0.04);
      border: 1px solid rgba(0, 212, 255, 0.15);
      border-radius: 6px;
      padding: 0.6rem 0.8rem;
      color: var(--color-text, #e0e6ed);
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 0.85rem;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .jarvis-tasks-input:focus {
      border-color: var(--color-accent, #00d4ff);
      box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
    }

    .jarvis-tasks-input::placeholder {
      color: var(--color-text-dim, #6b7a8d);
    }

    .jarvis-tasks-count {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 0.7rem;
      color: var(--color-text-dim, #6b7a8d);
      margin-bottom: 0.75rem;
      letter-spacing: 0.05em;
    }

    .jarvis-tasks-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .jarvis-tasks-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.55rem 0.7rem;
      background: rgba(0, 212, 255, 0.03);
      border: 1px solid rgba(0, 212, 255, 0.06);
      border-radius: 6px;
      transition: all 0.25s ease;
      animation: jarvis-tasks-slidein 0.3s ease;
    }

    @keyframes jarvis-tasks-slidein {
      from { opacity: 0; transform: translateX(-12px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .jarvis-tasks-item:hover {
      background: rgba(0, 212, 255, 0.06);
      border-color: rgba(0, 212, 255, 0.12);
    }

    .jarvis-tasks-item.jarvis-tasks-removing {
      animation: jarvis-tasks-fadeout 0.3s ease forwards;
    }

    @keyframes jarvis-tasks-fadeout {
      from { opacity: 1; transform: translateX(0); max-height: 60px; }
      to { opacity: 0; transform: translateX(12px); max-height: 0; padding: 0 0.7rem; margin: 0; }
    }

    .jarvis-tasks-checkbox {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid var(--color-accent, #00d4ff);
      background: transparent;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .jarvis-tasks-checkbox:hover {
      background: rgba(0, 212, 255, 0.15);
    }

    .jarvis-tasks-checkbox.jarvis-task-done {
      background: var(--color-accent, #00d4ff);
    }

    .jarvis-tasks-checkbox.jarvis-task-done::after {
      content: '✓';
      color: var(--color-bg, #0a0e17);
      font-size: 0.65rem;
      font-weight: 700;
    }

    .jarvis-tasks-text {
      flex: 1;
      font-family: var(--font-sans, 'Inter', sans-serif);
      font-size: 0.85rem;
      color: var(--color-text, #e0e6ed);
      transition: all 0.2s ease;
      word-break: break-word;
    }

    .jarvis-tasks-text.jarvis-task-done {
      text-decoration: line-through;
      opacity: 0.4;
      color: var(--color-text-dim, #6b7a8d);
    }

    .jarvis-tasks-delete {
      background: none;
      border: none;
      color: var(--color-text-dim, #6b7a8d);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0 0.2rem;
      line-height: 1;
      opacity: 0;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .jarvis-tasks-item:hover .jarvis-tasks-delete {
      opacity: 1;
    }

    .jarvis-tasks-delete:hover {
      color: var(--color-danger, #ff4757);
    }

    .jarvis-tasks-empty {
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
 * Initialize the tasks component.
 * @param {HTMLElement} container - DOM element to render into.
 */
export function init(container) {
  injectStyles();

  let tasks = get(STORAGE_KEY, []);

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-tasks';
  wrapper.innerHTML = `
    <div class="jarvis-section-header">Mission Log</div>
    <div class="jarvis-tasks-input-row">
      <input type="text" class="jarvis-tasks-input" data-ref="input" placeholder="Add new directive..." maxlength="200" />
    </div>
    <div class="jarvis-tasks-count" data-ref="count"></div>
    <ul class="jarvis-tasks-list" data-ref="list"></ul>
  `;
  container.appendChild(wrapper);

  const inputEl = wrapper.querySelector('[data-ref="input"]');
  const countEl = wrapper.querySelector('[data-ref="count"]');
  const listEl = wrapper.querySelector('[data-ref="list"]');

  function save() {
    set(STORAGE_KEY, tasks);
    window.dispatchEvent(new Event('jarvis:storage-changed'));
  }

  function updateCount() {
    const active = tasks.filter((t) => !t.done).length;
    const completed = tasks.filter((t) => t.done).length;
    countEl.textContent = `${active} active · ${completed} completed`;
  }

  function renderList() {
    listEl.innerHTML = '';

    if (tasks.length === 0) {
      listEl.innerHTML = '<div class="jarvis-tasks-empty">No directives logged.</div>';
      updateCount();
      return;
    }

    tasks.forEach((task) => {
      const li = document.createElement('li');
      li.className = 'jarvis-tasks-item';
      li.dataset.id = task.id;
      li.innerHTML = `
        <button class="jarvis-tasks-checkbox ${task.done ? 'jarvis-task-done' : ''}" data-action="toggle" aria-label="Toggle task"></button>
        <span class="jarvis-tasks-text ${task.done ? 'jarvis-task-done' : ''}">${escapeHtml(task.text)}</span>
        <button class="jarvis-tasks-delete" data-action="delete" aria-label="Delete task">×</button>
      `;
      listEl.appendChild(li);
    });

    updateCount();
  }

  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    const task = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: trimmed,
      done: false,
      createdAt: new Date().toISOString(),
    };

    tasks.unshift(task);
    save();
    renderList();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Input handler
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTask(inputEl.value);
      inputEl.value = '';
    }
  });

  // Delegated click handler for toggle and delete
  listEl.addEventListener('click', (e) => {
    const action = e.target.dataset.action;
    if (!action) return;

    const item = e.target.closest('.jarvis-tasks-item');
    if (!item) return;

    const id = item.dataset.id;
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return;

    if (action === 'toggle') {
      tasks[idx].done = !tasks[idx].done;
      save();
      // Toggle classes directly for snappy feedback
      const checkbox = item.querySelector('.jarvis-tasks-checkbox');
      const text = item.querySelector('.jarvis-tasks-text');
      checkbox.classList.toggle('jarvis-task-done');
      text.classList.toggle('jarvis-task-done');
      updateCount();
    } else if (action === 'delete') {
      item.classList.add('jarvis-tasks-removing');
      item.addEventListener('animationend', () => {
        tasks.splice(idx, 1);
        save();
        renderList();
      }, { once: true });
    }
  });

  // Listen for custom event from command bar
  document.addEventListener('jarvis:add-task', (e) => {
    if (e.detail) {
      addTask(typeof e.detail === 'string' ? e.detail : e.detail.text || '');
    }
  });

  renderList();
}
