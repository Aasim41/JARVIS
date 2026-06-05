import http from 'http';
import https from 'https';
import { exec } from 'child_process';
import os from 'os';
import dotenv from 'dotenv';

dotenv.config();

// ─────────────────────────────────────────────
// Helper: Fetch a URL and return its text body
// ─────────────────────────────────────────────
function fetchUrl(url, options = {}) {
  return fetch(url, options).then(res => res.text());
}

// ─────────────────────────────────────────────
// Helper: Strip HTML tags and clean text
// ─────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────
// Helper: Parse DuckDuckGo HTML search results
// ─────────────────────────────────────────────
function parseDDGResults(html) {
  const results = [];
  // Match result links and snippets from DDG HTML
  const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

  const links = [...html.matchAll(linkRegex)];
  const snippets = [...html.matchAll(snippetRegex)];

  for (let i = 0; i < Math.min(links.length, 8); i++) {
    let url = links[i][1];
    // DDG wraps URLs in a redirect — extract the actual URL
    const uddgMatch = url.match(/uddg=([^&]+)/);
    if (uddgMatch) url = decodeURIComponent(uddgMatch[1]);

    results.push({
      title: stripHtml(links[i][2]),
      url: url,
      snippet: snippets[i] ? stripHtml(snippets[i][1]) : ''
    });
  }
  return results;
}

// ─────────────────────────────────────────────
// Route handler: parse body
// ─────────────────────────────────────────────
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

// ─────────────────────────────────────────────
// Main Server
// ─────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const json = (data) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  // ── 1. Execute terminal command ──
  if (req.method === 'POST' && req.url === '/execute') {
    const { command } = await parseBody(req);
    console.log(`[Bridge] Executing: ${command}`);
    exec(command, { cwd: os.homedir() }, (error, stdout, stderr) => {
      json({
        stdout: stdout ? stdout.toString() : '',
        stderr: stderr ? stderr.toString() : '',
        error: error ? error.message : null
      });
    });
    return;
  }

  // ── 2. Read clipboard ──
  if (req.method === 'GET' && req.url === '/clipboard') {
    console.log('[Bridge] Reading clipboard...');
    exec('powershell -command "Get-Clipboard"', (error, stdout) => {
      json({ content: stdout ? stdout.toString().trim() : '', error: error ? error.message : null });
    });
    return;
  }

  // ── 3. Get active window info ──
  if (req.method === 'GET' && req.url === '/active-window') {
    console.log('[Bridge] Getting active window...');
    const ps = `powershell -command "Add-Type @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public class Win {
    [DllImport(\\"user32.dll\\")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport(\\"user32.dll\\")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
}
'@; $h = [Win]::GetForegroundWindow(); $b = New-Object System.Text.StringBuilder 256; [Win]::GetWindowText($h, $b, 256); $b.ToString()"`;
    exec(ps, (error, stdout) => {
      json({ title: stdout ? stdout.toString().trim() : '', error: error ? error.message : null });
    });
    return;
  }

  // ── 4. Web search (Agentic Search via Tavily AI + DDG Fallback) ──
  if (req.method === 'POST' && req.url === '/search') {
    const { query } = await parseBody(req);
    console.log(`[Bridge] Searching: ${query}`);
    try {
      const tavilyKey = process.env.TAVILY_API_KEY;
      if (!tavilyKey) throw new Error('TAVILY_API_KEY not set');

      const response = await fetchUrl('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: query,
          search_depth: 'basic',
          include_raw_content: false,
          max_results: 5
        })
      });

      const data = JSON.parse(response);
      if (data.results && data.results.length > 0) {
        const results = data.results.map(r => ({
          title: r.title,
          url: r.url,
          snippet: r.content
        }));
        return json({ results, error: null });
      } else {
        throw new Error('Tavily returned no results or rate limited.');
      }
    } catch (tavilyError) {
      console.warn('[Bridge] Tavily search failed, trying Exa AI:', tavilyError.message);
      
      try {
        const exaKey = process.env.EXA_API_KEY;
        if (!exaKey) throw new Error('EXA_API_KEY not set');

        const exaResponse = await fetchUrl('https://api.exa.ai/search', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': exaKey
          },
          body: JSON.stringify({
            query: query,
            numResults: 5,
            useAutoprompt: true,
            contents: { text: { maxCharacters: 1000 } }
          })
        });

        const exaData = JSON.parse(exaResponse);
        if (exaData.results && exaData.results.length > 0) {
          const results = exaData.results.map(r => ({
            title: r.title || "No title",
            url: r.url,
            snippet: r.text || ""
          }));
          return json({ results, error: null });
        } else {
          throw new Error('Exa AI returned no results.');
        }
      } catch (exaError) {
        console.warn('[Bridge] Exa AI search failed, falling back to DDG Proxy:', exaError.message);
        
        // Final Fallback mechanism
        const safeQuery = query.replace(/"/g, '\\"');
        exec(`python search_proxy.py "${safeQuery}"`, { cwd: process.cwd() }, (error, stdout, stderr) => {
          if (error) {
            json({ results: [], error: 'Tavily, Exa, and Fallback all failed.' });
            return;
          }
          try {
            const results = JSON.parse(stdout.trim());
            json({ results, error: null });
          } catch (parseErr) {
            json({ results: [], error: 'Failed to parse fallback output' });
          }
        });
      }
    }
    return;
  }

  // ── 5. Flight Tracking (FlightRadar24 Proxy) ──
  if (req.method === 'POST' && req.url === '/flight') {
    const { flight_number } = await parseBody(req);
    console.log(`[Bridge] Tracking Flight: ${flight_number}`);
    try {
      const safeNum = flight_number.replace(/"/g, '\\"');
      exec(`python flight_proxy.py "${safeNum}"`, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          json({ error: error.message });
          return;
        }
        try {
          const result = JSON.parse(stdout.trim());
          json(result);
        } catch (e) {
          json({ error: 'Failed to parse flight data' });
        }
      });
    } catch (e) {
      json({ error: e.message });
    }
    return;
  }

  // ── 6. Train Tracking (Exa AI Deep Scrape) ──
  if (req.method === 'POST' && req.url === '/train') {
    const { train_number } = await parseBody(req);
    console.log(`[Bridge] Tracking Train: ${train_number}`);
    try {
      const exaKey = process.env.EXA_API_KEY;
      if (!exaKey) throw new Error('EXA_API_KEY not set');

      const scrapeQuery = `live running status of train ${train_number} today`;
      
      const exaResponse = await fetchUrl('https://api.exa.ai/search', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': exaKey
        },
        body: JSON.stringify({
          query: scrapeQuery,
          numResults: 2,
          useAutoprompt: true,
          contents: { text: { maxCharacters: 1500 } }
        })
      });

      const exaData = JSON.parse(exaResponse);
      if (exaData.results && exaData.results.length > 0) {
        const results = exaData.results.map(r => ({
          title: r.title || "Train Status",
          url: r.url,
          status: r.text || ""
        }));
        return json({ results, error: null });
      } else {
        throw new Error('Train status could not be fetched currently.');
      }
    } catch (e) {
      console.warn('[Bridge] Train API Error:', e.message);
      // Fallback
      json({ results: [], error: e.message });
    }
    return;
  }

  // ── 7. Read webpage ──
  if (req.method === 'POST' && req.url === '/read-page') {
    const { url } = await parseBody(req);
    console.log(`[Bridge] Reading page: ${url}`);
    try {
      const html = await fetchUrl(url);
      let text = stripHtml(html);
      // Truncate to ~4000 chars to keep token usage sane
      if (text.length > 4000) {
        text = text.substring(0, 4000) + '\n...[TRUNCATED]';
      }
      json({ content: text, error: null });
    } catch (e) {
      json({ content: '', error: e.message });
    }
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(5174, () => {
  console.log('==================================================');
  console.log('🚀 J.A.R.V.I.S Local Bridge Server v2.0 Online');
  console.log('📡 Port: 5174');
  console.log('🔌 Endpoints:');
  console.log('   POST /execute      — Run terminal commands');
  console.log('   GET  /clipboard    — Read clipboard');
  console.log('   GET  /active-window — Get active window title');
  console.log('   POST /search       — Web search (DuckDuckGo)');
  console.log('   POST /read-page    — Read & extract webpage text');
  console.log('==================================================');
});
