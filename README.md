# J.A.R.V.I.S Local Web Interface 🤖

Welcome to the **J.A.R.V.I.S Local AI Dashboard**, a fully functional, advanced local assistant powered by the Gemini 1.5 Flash model and Vite/React architecture.

This project is an interactive HUD and Bridge Server that connects a highly intelligent cloud LLM to your local Windows OS, allowing it to perform terminal executions, web searches, file scraping, and app integrations seamlessly.

## 🚀 Key Features

*   **⚡ Blazing Fast AI Core**: Powered by Google's Gemini models with an automated smart fallback/cascade system for maximum uptime.
*   **💻 OS-Level Integration**: J.A.R.V.I.S has unrestricted local access. It can open apps (WhatsApp, Discord, Chrome), run shell scripts, check system specs, and even lock/shutdown your PC.
*   **🌐 Autonomous Web Research**: Connected directly to the internet using Exa AI and Tavily APIs. It scrapes sites and performs deep web searches to answer any query with live data.
*   **✈️ Live Flight & Train Tracking**: Real-time APIs to fetch live telemetry for airborne flights and dynamically scrape running status for trains.
*   **✉️ Seamless Communication**: Can draft and open pre-filled WhatsApp messages and Emails on the fly using native Windows URI schemes.
*   **🧠 Local Memory**: Built-in vector embedding database that memorizes user facts, preferences, and project context securely on your disk.
*   **🎵 Custom Modules**: Includes UI widgets for real-time Weather, System Stats, Clock, Spotify/Music integration, and GitHub Task tracking.

## 🛠️ Tech Stack
*   **Frontend**: HTML, Vanilla JS, CSS (Vite Server)
*   **Backend Bridge**: Node.js `http` Server (Port 5174)
*   **Core AI Logic**: `gemini-api.js` (System Prompt & Tool Calling logic)
*   **External APIs**: 
    *   Google Gemini API (Language & Embeddings)
    *   Exa AI / Tavily (Live Web Search & Scraping)
    *   FlightRadar24 (Python Proxy)
    *   GitHub API (Project management)

## ⚙️ Local Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Aasim41/JARVIS.git
   cd JARVIS
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   pip install FlightRadar24API
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory and add your API keys:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key
   EXA_API_KEY=your_exa_api_key
   TAVILY_API_KEY=your_tavily_api_key
   ```

4. **Start the Engine**:
   ```bash
   npm run dev
   ```
   *This single command spins up both the Vite Frontend UI (Port 5173) and the Node Bridge Server (Port 5174).*

5. **Access J.A.R.V.I.S**:
   Open your browser and navigate to `http://localhost:5173`.

## 🔒 Privacy & Security

**DO NOT COMMIT API KEYS**. The `.env` file is intentionally added to the `.gitignore`. Since J.A.R.V.I.S is capable of executing raw terminal commands (`start`, `del`, `taskkill`), **do not expose the bridge server port (5174) to the public internet without an authentication layer**.

---
*Created by Aasim41 & Antigravity.*