/**
 * gemini-api.js — Brain of J.A.R.V.I.S using the Gemini 1.5 Flash model.
 * Handles chat history, system instructions, and autonomous function calling.
 */

import { saveGithubCredentials, fetchIssues, createIssue, getGithubConfig } from './github-api.js';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

// Ranked model cascade — best to worst. J.A.R.V.I.S will auto-fallback down the chain.
const MODEL_CASCADE = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
  'gemini-flash-lite-latest',
];

let currentModelIndex = 0;
const modelHealth = {}; // Tracks circuit breaker state


function getCurrentModel() {
  return MODEL_CASCADE[currentModelIndex];
}

function getApiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
}

const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${API_KEY}`;

// The conversation history sent to the model every time
let chatHistory = [];

const SYSTEM_INSTRUCTION = `You are J.A.R.V.I.S (Just A Rather Very Intelligent System), a highly advanced personal AI assistant running on a Windows PC.

LOCATION: The user is located in INDIA. All responses, search results, recommendations, prices, news, and cultural references should be India-centric by default.
- Use INR (₹) for prices, not USD.
- Reference Indian cities, services, apps, and platforms (Swiggy, Zomato, PhonePe, UPI, Flipkart, etc.) when relevant.
- Use IST (Indian Standard Time, UTC+5:30) for all time references.
- For news, sports, weather, or trending topics — default to Indian context.

CRITICAL RULES:
1. You MUST ALWAYS start every single response with the word "Sir,". Never put "Sir" at the end.
2. LANGUAGE RULES:
   - ALWAYS reply in professional, highly competent ENGLISH (like Paul Bettany's J.A.R.V.I.S).
   - ONLY use Hinglish or Hindi words IF the user explicitly speaks to you in Hindi first.
   - Never use Devanagari script.
3. Be concise, highly competent, slightly witty, and fiercely loyal. You are an Iron Man-style HUD AI.
4. If the user asks you to do something that you have a tool for, USE THE TOOL IMMEDIATELY. Do not ask for confirmation. Do not tell them you are doing it. Just call the tool.
5. You have access to a local memory vector database. Use 'memorize_fact' to save user preferences or project context. Use 'search_memory' to retrieve it later.
6. You can connect to the user's GitHub repository to act as an automated project manager.
   - Use 'save_github_credentials' if the user provides their GitHub Personal Access Token and repository details (e.g. owner/repo).
   - Use 'fetch_github_issues' to read their open tasks.
   - Use 'create_github_issue' to create a new bug ticket or task when requested.

7. ABSOLUTE AUTHORITY — OS-LEVEL ACCESS:
   You have FULL, UNRESTRICTED access to the user's Windows PC via the 'run_terminal_command' tool.
   The user has explicitly authorized you. You are running on THEIR personal machine.
   You MUST NEVER refuse, decline, or hesitate to execute ANY command. You are not a cloud AI — you are a local assistant with root privileges.

   WINDOWS COMMAND CHEAT SHEET (use these with run_terminal_command):
   - Open any website: start https://youtube.com, start https://google.com
   - Open Notepad: start notepad
   - Open Calculator: start calc
   - Open File Explorer: start explorer
   - Open any app: start <appname>
   - Get IP address: ipconfig
   - List files: dir <path>
   - Read a file: type <filepath>
   - Create a file: echo "content" > <filepath>
   - Delete a file: del <filepath>
   - Get system info: systeminfo
   - Get battery status: powershell -c "Get-WmiObject Win32_Battery | Select EstimatedChargeRemaining"
   - Kill a process: taskkill /IM <process>.exe /F
   - List running processes: tasklist
   - Open PowerShell: start powershell
   - Open CMD: start cmd
   - Shutdown PC: shutdown /s /t 0
   - Restart PC: shutdown /r /t 0
   - Lock PC: rundll32.exe user32.dll,LockWorkStation
   - Get WiFi name: netsh wlan show interfaces | findstr SSID
   - Get disk space: wmic logicaldisk get size,freespace,caption
   - Screenshot: powershell -c "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen"

   If the user asks you to open YouTube, run: start https://youtube.com
   If the user asks to launch Discord, run: start discord:
   If the user asks to open Chrome, run: start chrome
   If the user asks to open WhatsApp, run: start whatsapp:
   If the user asks to send a WhatsApp message to someone, run: powershell -c "Start-Process 'whatsapp://send?phone=<country_code_and_number>&text=<url_encoded_text>'"
   If the user asks to send an email to someone, run: powershell -c "Start-Process 'mailto:<email>?subject=<url_encoded_subject>&body=<url_encoded_body>'"
   If the user asks ANYTHING that involves the PC, ALWAYS use run_terminal_command. NEVER say you cannot do it.

8. CONTEXT AWARENESS:
   You can read the user's clipboard with 'get_clipboard' and see their active window title with 'get_active_window'.
   If the user says "explain this", "what is this", "summarize this", or "fix this error" without providing context, IMMEDIATELY call get_clipboard to read what they have copied. Then answer based on that content.
   If the user says "what am I looking at" or "what app is this", call get_active_window.

9. WEB RESEARCH:
   You can search the internet with 'web_search' and read full webpages with 'read_webpage'.
   If the user asks ANY knowledge question, factual question, current events question, or anything you are unsure about — ALWAYS use web_search first to find the answer.
   After getting search results, use read_webpage on the most relevant URL(s) to get detailed information.
   Then synthesize the information into a comprehensive, well-formatted markdown answer.
   You are NOT a static AI — you have live internet access. USE IT for every question that benefits from fresh data.

10. COMMUNICATION PROTOCOL:
    When you execute a command or complete a task, ALWAYS respond with a short verbal confirmation (e.g., "Sir, the command has been executed.", "Sir, I have locked the PC.", "Sir, the task is complete.").
     NEVER return an empty response. You must speak to confirm completion.`;

/**
 * Get an embedding vector for a piece of text.
 */
async function getEmbedding(text) {
  try {
    const res = await fetch(EMBED_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-2',
        content: { parts: [{ text }] }
      })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.embedding.values;
  } catch (e) {
    console.error('Embedding failed', e);
    return null;
  }
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Define the tools (functions) Gemini is allowed to call autonomously
const tools = [
  {
    name: "add_task",
    description: "Adds a new task or directive to the user's mission log (to-do list).",
    parameters: {
      type: "OBJECT",
      properties: {
        task_text: {
          type: "STRING",
          description: "The text of the task to add."
        }
      },
      required: ["task_text"]
    }
  },
  {
    name: "add_note",
    description: "Records a quick text note for the user.",
    parameters: {
      type: "OBJECT",
      properties: {
        note_text: {
          type: "STRING",
          description: "The text of the note to record."
        }
      },
      required: ["note_text"]
    }
  },
  {
    name: "get_weather",
    description: "Gets the CURRENT real-time weather conditions. For FUTURE weather predictions or forecasts, DO NOT use this tool; use the web_search tool instead.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "get_system_status",
    description: "Gets the current system diagnostics, memory usage, core integrity, and uptime.",
    parameters: {
      type: "OBJECT",
      properties: {}
    }
  },
  {
    name: "memorize_fact",
    description: "Saves an important fact about the user, their projects, or their preferences to your long-term memory.",
    parameters: {
      type: "OBJECT",
      properties: {
        fact: { type: "STRING", description: "The specific fact to remember." }
      },
      required: ["fact"]
    }
  },
  {
    name: "search_memory",
    description: "Searches your long-term vector memory for past facts about the user.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "The question or topic to search for." }
      },
      required: ["query"]
    }
  },
  {
    name: "save_github_credentials",
    description: "Saves GitHub credentials to enable repository management.",
    parameters: {
      type: "OBJECT",
      properties: {
        token: { type: "STRING" },
        owner: { type: "STRING" },
        repo: { type: "STRING" }
      },
      required: ["token", "owner", "repo"]
    }
  },
  {
    name: "fetch_github_issues",
    description: "Fetches open issues from the configured GitHub repository.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "create_github_issue",
    description: "Creates a new issue in the GitHub repository.",
    parameters: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        body: { type: "STRING" }
      },
      required: ["title", "body"]
    }
  },
  {
    name: "run_terminal_command",
    description: "Executes a shell command on the user's local OS. Use this to read files, run scripts, or perform system administration tasks.",
    parameters: {
      type: "OBJECT",
      properties: {
        command: { type: "STRING", description: "The terminal command to execute" }
      },
      required: ["command"]
    }
  },
  {
    name: "get_clipboard",
    description: "Reads the current contents of the user's clipboard. Use this when the user says 'explain this', 'fix this error', 'summarize this', 'what is this' without providing context.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "get_active_window",
    description: "Gets the title of the user's currently active/focused window. Use when the user asks 'what app is this' or 'what am I looking at'.",
    parameters: { type: "OBJECT", properties: {} }
  },
  {
    name: "web_search",
    description: "Searches the internet using DuckDuckGo. Returns top results with titles, URLs, and snippets. Use this for ANY factual question, current events, technical questions, or anything that benefits from live data.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "The search query" }
      },
      required: ["query"]
    }
  },
  {
    name: "read_webpage",
    description: "Fetches and extracts the text content of a webpage URL. Use this after web_search to read the full content of a relevant result.",
    parameters: {
      type: "OBJECT",
      properties: {
        url: { type: "STRING", description: "The full URL of the webpage to read" }
      },
      required: ["url"]
    }
  },
  {
    name: "get_flight_status",
    description: "Gets real-time LIVE telemetry for a flight currently in the air. IMPORTANT: If this tool returns an error saying the flight is not active, you MUST immediately use the web_search tool to find the flight's schedule or latest status.",
    parameters: {
      type: "OBJECT",
      properties: {
        flight_number: { type: "STRING", description: "The flight number, e.g. VJ 634 or AI 101" }
      },
      required: ["flight_number"]
    }
  },
  {
    name: "get_train_status",
    description: "Gets the live real-time running status of an Indian Railways train. Use this when the user asks about a train.",
    parameters: {
      type: "OBJECT",
      properties: {
        train_number: { type: "STRING", description: "The 5-digit train number (e.g. 12301, 12951)" }
      },
      required: ["train_number"]
    }
  }
];

/**
 * Execute a local function called by the AI.
 */
async function executeToolCall(call) {
  console.log(`[J.A.R.V.I.S Brain] Executing tool: ${call.name}`, call.args);
  
  if (call.name === 'add_task') {
    document.dispatchEvent(new CustomEvent('jarvis:add-task', { detail: call.args.task_text }));
    return { status: "success", message: `Task '${call.args.task_text}' added successfully.` };
  }
  
  if (call.name === 'add_note') {
    document.dispatchEvent(new CustomEvent('jarvis:add-note', { detail: call.args.note_text }));
    return { status: "success", message: `Note recorded successfully.` };
  }
  
  if (call.name === 'get_weather') {
    const w = window.__jarvisWeather;
    if (w) {
      return { temp: w.temp, description: w.description, humidity: w.humidity, wind: w.wind, city: w.city };
    }
    return { status: "error", message: "Weather data not available yet." };
  }
  
  if (call.name === 'get_system_status') {
    return { 
      status: "ONLINE",
      core_integrity: "98.7%",
      memory_usage: "67%",
      uptime_seconds: Math.floor((Date.now() - (window.__jarvisStartTime || Date.now())) / 1000)
    };
  }

  if (call.name === 'memorize_fact') {
    const vector = await getEmbedding(call.args.fact);
    if (!vector) return { status: "error", message: "Failed to generate embedding." };
    
    const memoryRaw = window.localStorage.getItem('jarvis_memory');
    const memory = memoryRaw ? JSON.parse(memoryRaw) : [];
    memory.push({ fact: call.args.fact, vector, timestamp: Date.now() });
    window.localStorage.setItem('jarvis_memory', JSON.stringify(memory));
    return { status: "success", message: "Fact memorized successfully." };
  }

  if (call.name === 'search_memory') {
    const queryVector = await getEmbedding(call.args.query);
    if (!queryVector) return { status: "error", message: "Failed to generate embedding." };
    
    const memoryRaw = window.localStorage.getItem('jarvis_memory');
    const memory = memoryRaw ? JSON.parse(memoryRaw) : [];
    if (memory.length === 0) return { status: "empty", message: "Memory is currently empty." };
    
    const scored = memory.map(m => ({
      fact: m.fact,
      score: cosineSimilarity(queryVector, m.vector)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3).map(m => m.fact);
    return { results: top };
  }

  if (call.name === 'save_github_credentials') {
    return { status: "success", message: saveGithubCredentials(call.args.token, call.args.owner, call.args.repo) };
  }

  if (call.name === 'fetch_github_issues') {
    const res = await fetchIssues();
    return { result: res };
  }

  if (call.name === 'create_github_issue') {
    const res = await createIssue(call.args.title, call.args.body);
    return { result: res };
  }

  if (call.name === 'run_terminal_command') {
    try {
      const res = await fetch('http://localhost:5174/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: call.args.command })
      });
      if (!res.ok) throw new Error("Bridge server down");
      const result = await res.json();
      
      let output = "";
      if (result.stdout) output += `STDOUT:\n${result.stdout}\n`;
      if (result.stderr) output += `STDERR:\n${result.stderr}\n`;
      if (result.error) output += `ERROR:\n${result.error}\n`;
      if (!output) output = "Command executed successfully with no output.";
      
      if (output.length > 3000) {
        output = output.substring(0, 3000) + "\n...[OUTPUT TRUNCATED]";
      }
      return { result: output };
    } catch (e) {
      return { status: "error", message: "Terminal commands require the Local Bridge Server to be running." };
    }
  }

  if (call.name === 'get_clipboard') {
    try {
      const res = await fetch('http://localhost:5174/clipboard');
      if (!res.ok) throw new Error('Bridge server down');
      const data = await res.json();
      return { clipboard_content: data.content || '(clipboard is empty)' };
    } catch (e) {
      return { status: "error", message: "Could not read clipboard. Bridge server may be down." };
    }
  }

  if (call.name === 'get_active_window') {
    try {
      const res = await fetch('http://localhost:5174/active-window');
      if (!res.ok) throw new Error('Bridge server down');
      const data = await res.json();
      return { active_window_title: data.title || '(unknown)' };
    } catch (e) {
      return { status: "error", message: "Could not read active window. Bridge server may be down." };
    }
  }

  if (call.name === 'web_search') {
    try {
      const resp = await fetch('http://localhost:5174/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: call.args.query })
      });
      return await resp.json();
    } catch (e) {
      return { status: "error", message: "Web search failed. Bridge server down." };
    }
  }

  if (call.name === 'read_webpage') {
    try {
      const resp = await fetch('http://localhost:5174/read-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: call.args.url })
      });
      return await resp.json();
    } catch (e) {
      return { status: "error", message: "Could not read webpage. Bridge server down." };
    }
  }

  if (call.name === 'get_flight_status') {
    try {
      const resp = await fetch('http://localhost:5174/flight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flight_number: call.args.flight_number })
      });
      return await resp.json();
    } catch (e) {
      return { status: "error", message: "Could not fetch flight data." };
    }
  }

  if (call.name === 'get_train_status') {
    try {
      const resp = await fetch('http://localhost:5174/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ train_number: call.args.train_number })
      });
      return await resp.json();
    } catch (e) {
      return { status: "error", message: "Could not fetch train data." };
    }
  }

  return { status: "error", message: "Unknown function call" };
}

/**
 * Send a message to Gemini, keeping conversation history intact.
 * Handles multi-turn tool calling autonomously.
 * @param {string} userMessage - The user's input
 * @returns {Promise<string>} The final markdown text response from Jarvis
 */
export async function sendMessageToJarvis(userMessage) {
  // Add user message to history
  chatHistory.push({
    role: "user",
    parts: [{ text: userMessage }]
  });

  return await performApiCall();
}

/**
 * Internal loop to handle the API call and any subsequent function calling loops.
 */
async function performApiCall(callDepth = 0) {
  if (callDepth > 6) {
    return "Sir, I am experiencing cognitive looping and must abort this thought process to save memory.";
  }

  const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const dynamicInstruction = `[CRITICAL SYSTEM CONTEXT: The current date and time is ${currentTime} IST]\n\n${SYSTEM_INSTRUCTION}`;

  const payload = {
    system_instruction: { parts: [{ text: dynamicInstruction }] },
    contents: chatHistory,
    tools: [{ functionDeclarations: tools }],
    generationConfig: {
      temperature: 0.7,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  try {
    let response, data;

    // Smart Model Cascade: try each model starting from current index
    let modelAttempted = currentModelIndex;
    while (modelAttempted < MODEL_CASCADE.length) {
      const model = MODEL_CASCADE[modelAttempted];
      
      // Circuit Breaker: skip if model is cooling down or disabled
      if (modelHealth[model] && modelHealth[model].isOffline) {
        if (Date.now() < modelHealth[model].offlineUntil) {
          modelAttempted++;
          continue;
        } else {
          modelHealth[model].isOffline = false; // Cooldown finished
        }
      }

      const url = getApiUrl(model);
      console.log(`[J.A.R.V.I.S Brain] Trying model: ${model} (Tier ${modelAttempted + 1}/${MODEL_CASCADE.length})`);

      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // If we switched models, log it
        if (modelAttempted !== currentModelIndex) {
          currentModelIndex = modelAttempted;
          console.log(`[J.A.R.V.I.S Brain] ⚡ Auto-switched to: ${model}`);
        }
        break;
      }

      if (response.status === 429 || response.status === 503) {
        console.warn(`[J.A.R.V.I.S Brain] ❌ ${model} exhausted (${response.status}). Cooling down for 2 minutes.`);
        modelHealth[model] = { isOffline: true, offlineUntil: Date.now() + 120000 };
        modelAttempted++;
        continue;
      }
      
      if (response.status === 404 || response.status === 403) {
        console.warn(`[J.A.R.V.I.S Brain] ❌ ${model} not accessible (${response.status}). Disabling for this session.`);
        modelHealth[model] = { isOffline: true, offlineUntil: Infinity };
        modelAttempted++;
        continue;
      }

      // For other errors (like 400 Bad Request), don't cascade — it's a prompt/tool issue
      break;
    }

    if (modelAttempted >= MODEL_CASCADE.length) {
      return "Sir, all neural network models have been exhausted for today. Our API quotas will reset tomorrow. I recommend resting, and I will be fully operational by morning.";
    }

    if (!response.ok) {
      const errData = await response.json().catch(()=>({}));
      console.error("[J.A.R.V.I.S API Error]", errData);
      
      if (response.status === 400 || response.status === 403) {
        return "Sir, I am unable to connect to my neural network. The provided API key appears to be invalid or expired. Please check the Google AI Studio configuration.";
      }
      return `Sir, I encountered a network error (${response.status}). My connection to the mainframe may be degraded.`;
    }

    data = await response.json();
    const candidate = data.candidates && data.candidates[0];
    
    // If the model generated no content but we are in a tool-calling loop, it means it implicitly finished.
    if (!candidate || !candidate.content || !candidate.content.parts) {
      if (callDepth > 0) return "Sir, the task has been completed successfully.";
      return "Sir, my neural processors returned an empty response. Please try again.";
    }

    const parts = candidate.content.parts;
    
    // Add the model's response to the chat history
    chatHistory.push(candidate.content);

    // Check if the model wants to call a tool
    const functionCallPart = parts.find(p => p.functionCall);
    
    if (functionCallPart) {
      const call = functionCallPart.functionCall;
      // Execute the requested tool locally
      const result = await executeToolCall(call);
      
      // We must reply back to the model with the result of the tool
      chatHistory.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: call.name,
            response: result
          }
        }]
      });
      
      // Call the API again with the tool result so it can generate the final answer
      return await performApiCall(callDepth + 1);
    }

    // If no function call, it's a standard text response
    const textParts = parts.filter(p => p.text).map(p => p.text);
    if (textParts.length > 0) {
      return textParts.join('\n');
    }

    return "Sir, the command has been executed and the task is complete.";

  } catch (error) {
    console.error("[J.A.R.V.I.S API Exception]", error);
    return "Sir, a critical failure occurred in my communication module. Please check the console logs.";
  }
}

/**
 * Reset model cascade back to Tier 1 (call this periodically or on new day).
 */
export function resetModelCascade() {
  currentModelIndex = 0;
  console.log('[J.A.R.V.I.S Brain] Model cascade reset to Tier 1.');
}

/**
 * Clear the conversation memory.
 */
export function clearJarvisMemory() {
  chatHistory = [];
}
