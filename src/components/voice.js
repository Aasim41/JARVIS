/**
 * voice.js — Dual-Voice TTS Engine for J.A.R.V.I.S
 * 
 * Uses browser SpeechSynthesis with smart voice selection:
 * English → Deep male voice (David/Daniel/Google UK Male)
 * Hinglish → Indian English voice (Ravi/Neerja)
 */

let recognition = null;
let isListening = false;
let isWakeWordMode = true;
let activeAudio = null;
let voicesLoaded = false;
let englishVoice = null;
let hindiVoice = null;

// ─────────────────────────────────────────────
// Hinglish Detection
// ─────────────────────────────────────────────
const HINGLISH_WORDS = new Set([
  'aapka', 'aapki', 'aapko', 'aap', 'abhi', 'accha', 'acha',
  'bahut', 'baat', 'batao', 'bhai', 'bilkul', 'bohot',
  'chalo', 'chahiye', 'chalega', 'cheez',
  'dekho', 'dekh', 'diya', 'dijiye', 'dena',
  'gaya', 'gayi',
  'haan', 'hai', 'hain', 'hamara', 'humne', 'hogaya', 'hoga',
  'ismein', 'isko',
  'jaroor',
  'kaam', 'kaise', 'karo', 'karna', 'kar', 'karein', 'karega',
  'koi', 'kuch', 'kya', 'kyun', 'kyunki',
  'laga', 'lagta', 'lekin', 'liya',
  'maine', 'mein', 'mera', 'meri', 'mere', 'milega', 'mujhe',
  'nahi', 'nhi', 'nahin',
  'pehle', 'phir', 'pura',
  'rakh', 'ruk', 'ruko',
  'sab', 'samajh', 'sahi', 'sirf', 'suno',
  'toh', 'tera', 'teri', 'tere', 'theek', 'thik', 'thoda', 'tumhara',
  'uska', 'uski', 'usse',
  'waala', 'waise', 'woh',
  'yahan', 'yeh', 'ye',
  'zyada',
]);

function isHinglish(text) {
  const words = text.toLowerCase().split(/\s+/);
  let count = 0;
  for (const w of words) {
    if (HINGLISH_WORDS.has(w.replace(/[^a-z]/g, ''))) count++;
  }
  return count >= 2;
}

// ─────────────────────────────────────────────
// Voice Selection
// ─────────────────────────────────────────────
function loadVoices() {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return;
  
  voicesLoaded = true;
  console.log('[Voice] Available voices:', voices.map(v => `${v.name} (${v.lang})`).join('\n'));

  // English voice — prefer deep male voices that sound like JARVIS
  const enPriority = [
    v => v.name.includes('David') && v.lang.startsWith('en'),
    v => v.name.includes('Daniel') && v.lang.startsWith('en'),
    v => v.name.includes('James') && v.lang.startsWith('en'),
    v => v.name.includes('Google UK English Male'),
    v => v.name.includes('Mark') && v.lang.startsWith('en'),
    v => v.lang === 'en-GB' && v.name.includes('Male'),
    v => v.lang === 'en-US',
    v => v.lang.startsWith('en'),
  ];
  for (const test of enPriority) {
    const match = voices.find(test);
    if (match) { englishVoice = match; break; }
  }
  
  // Hindi/Indian voice — for Hinglish content  
  const hiPriority = [
    v => v.lang === 'en-IN',                                    // Indian English
    v => v.name.includes('Neerja'),                             // Windows 11 Indian
    v => v.name.includes('Ravi'),                               // Windows Indian male
    v => v.lang.startsWith('hi'),                               // Any Hindi voice
    v => v.name.includes('Google') && v.lang === 'en-IN',       // Chrome Indian
  ];
  for (const test of hiPriority) {
    const match = voices.find(test);
    if (match) { hindiVoice = match; break; }
  }
  
  // Fallback: if no Indian voice, use the English one for both
  if (!hindiVoice) hindiVoice = englishVoice;
  if (!englishVoice) englishVoice = voices[0];

  console.log(`[Voice] English voice: ${englishVoice?.name || 'default'}`);
  console.log(`[Voice] Hinglish voice: ${hindiVoice?.name || 'default'}`);
}

// ─────────────────────────────────────────────
// TTS Engine
// ─────────────────────────────────────────────

/**
 * Speak text with auto voice selection.
 * @param {string} text 
 */
export async function speak(text) {
  console.log('[Voice] Speaking:', text);
  const cleanText = text
    .replace(/<[^>]*>?/gm, '')
    .replace(/[*_#`~]/g, '')
    .replace(/J\.A\.R\.V\.I\.S\.?/gi, 'Jarvis');

  // Stop anything playing
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  window.speechSynthesis.cancel();

  // Stop listening while speaking
  try { recognition.stop(); } catch(e) {}

  // Make sure voices are loaded
  if (!voicesLoaded) loadVoices();

  const hinglish = isHinglish(cleanText);
  const voice = hinglish ? hindiVoice : englishVoice;
  console.log(`[Voice] Mode: ${hinglish ? 'Hinglish → Indian' : 'English → JARVIS'} | Voice: ${voice?.name || 'default'}`);

  // Set speaking animation
  const arcReactor = document.querySelector('.arc-reactor');
  if (arcReactor) arcReactor.classList.add('speaking');

  // Chrome bug: long text gets cut off. Split into chunks.
  if (cleanText.length > 200) {
    speakChunks(cleanText, voice, hinglish);
  } else {
    speakOne(cleanText, voice, hinglish, true);
  }

  activeAudio = { pause: () => { window.speechSynthesis.cancel(); if (arcReactor) arcReactor.classList.remove('speaking'); } };
}

function speakOne(text, voice, hinglish, restartAfter) {
  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;
  utterance.lang = hinglish ? 'en-IN' : 'en-GB';
  utterance.rate = hinglish ? 1.0 : 0.95;   // Slightly slower for English = more JARVIS-like
  utterance.pitch = hinglish ? 1.0 : 0.9;   // Slightly deeper for English = more commanding
  utterance.volume = 1.0;

  if (restartAfter) {
    utterance.onend = () => {
      console.log('[Voice] TTS finished. Restarting listener...');
      const arcReactor = document.querySelector('.arc-reactor');
      if (arcReactor) arcReactor.classList.remove('speaking');
      try { recognition.start(); } catch(e) {}
    };
    utterance.onerror = () => {
      const arcReactor = document.querySelector('.arc-reactor');
      if (arcReactor) arcReactor.classList.remove('speaking');
      try { recognition.start(); } catch(e) {}
    };
  }

  window.speechSynthesis.speak(utterance);
}

function speakChunks(text, voice, hinglish) {
  const chunks = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
  let i = 0;

  function next() {
    if (i >= chunks.length) {
      console.log('[Voice] All chunks spoken.');
      const arcReactor = document.querySelector('.arc-reactor');
      if (arcReactor) arcReactor.classList.remove('speaking');
      try { recognition.start(); } catch(e) {}
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[i].trim());
    if (voice) utterance.voice = voice;
    utterance.lang = hinglish ? 'en-IN' : 'en-GB';
    utterance.rate = hinglish ? 1.0 : 0.95;
    utterance.pitch = hinglish ? 1.0 : 0.9;
    utterance.onend = () => { i++; next(); };
    utterance.onerror = () => { i++; next(); };
    window.speechSynthesis.speak(utterance);
  }
  next();
}

// ─────────────────────────────────────────────
// Mic / Speech Recognition
// ─────────────────────────────────────────────

export function forceStartListening() {
  if (recognition) {
    try { recognition.start(); } catch(e) {}
  }
}

export function initVoice(onCommand, onWake) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    console.warn("[Voice] Speech recognition not supported.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.lang = 'en-IN';

  recognition.onstart = () => {
    console.log('[Voice] Listening (en-IN bilingual)...');
    const arcReactor = document.querySelector('.arc-reactor');
    if (arcReactor) arcReactor.classList.add('listening');
  };
  
  recognition.onend = () => {
    const arcReactor = document.querySelector('.arc-reactor');
    if (arcReactor) arcReactor.classList.remove('listening');
    if (!activeAudio) {
      try { recognition.start(); } catch(e) {}
    }
  };

  recognition.onerror = (event) => {
    console.error("[Voice] Recognition error:", event.error);
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    transcript = transcript.trim().toLowerCase();
    console.log('[Voice] Heard:', transcript);
    
    if (isWakeWordMode) {
      const idx = transcript.indexOf('jarvis');
      if (idx !== -1) {
        const command = transcript.substring(idx + 6).trim();
        if (command.length > 0) {
          onCommand(command);
        } else {
          isWakeWordMode = false;
          if (onWake) onWake();
          recognition.stop();
        }
      }
    } else {
      if (transcript.length > 0) {
        isWakeWordMode = true;
        onCommand(transcript);
      }
    }
  };

  // Preload voices
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;

  try { recognition.start(); } catch(e) {}
}
