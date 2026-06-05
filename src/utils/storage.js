/**
 * storage.js — LocalStorage wrapper for the Jarvis dashboard.
 * All keys are automatically prefixed with 'jarvis_' to avoid collisions.
 */

const PREFIX = 'jarvis_';

/**
 * Retrieve a value from localStorage, parsed from JSON.
 * @param {string} key - Storage key (without prefix).
 * @param {*} defaultValue - Value to return if key is not found or parsing fails.
 * @returns {*} The parsed value, or defaultValue.
 */
export function get(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[Jarvis Storage] Failed to read key "${key}":`, err);
    return defaultValue;
  }
}

/**
 * Store a value in localStorage as JSON.
 * @param {string} key - Storage key (without prefix).
 * @param {*} value - Value to serialize and store.
 */
export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.error(`[Jarvis Storage] Failed to write key "${key}":`, err);
  }
}

/**
 * Remove a value from localStorage.
 * @param {string} key - Storage key (without prefix).
 */
export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (err) {
    console.warn(`[Jarvis Storage] Failed to remove key "${key}":`, err);
  }
}
