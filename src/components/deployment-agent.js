/**
 * deployment-agent.js — Monitors CI/CD pipeline status (GitHub Actions).
 */

export function init(container) {
  if (!document.getElementById('jarvis-deploy-styles')) {
    const style = document.createElement('style');
    style.id = 'jarvis-deploy-styles';
    style.textContent = `
      .jarvis-deploy {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .jarvis-deploy-card {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 176, 0, 0.05);
        border-radius: var(--radius-sm);
        padding: 12px;
        position: relative;
        overflow: hidden;
      }
      .jarvis-deploy-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .jarvis-deploy-repo {
        font-weight: 600;
        font-size: 0.9rem;
      }
      .jarvis-deploy-badge {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.1);
      }
      .jarvis-deploy-badge.success { background: rgba(46, 204, 113, 0.2); color: #2ecc71; border: 1px solid #2ecc71; }
      .jarvis-deploy-badge.failure { background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; }
      .jarvis-deploy-badge.in_progress { background: rgba(241, 196, 15, 0.2); color: #f1c40f; border: 1px solid #f1c40f; animation: pulse 2s infinite; }
      
      .jarvis-deploy-meta {
        font-size: 0.75rem;
        color: var(--color-text-dim);
      }
      .jarvis-deploy-commit {
        font-family: var(--font-mono);
        color: var(--color-accent);
      }
      
      .jarvis-deploy-progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        background: var(--color-accent);
        width: 0%;
        transition: width 1s linear;
      }
      .jarvis-deploy-card.building .jarvis-deploy-progress {
        width: 100%;
        animation: loading-bar 2s ease-in-out infinite;
      }

      @keyframes loading-bar {
        0% { width: 0%; left: 0; right: auto; }
        50% { width: 100%; left: 0; right: auto; }
        50.1% { width: 100%; left: auto; right: 0; }
        100% { width: 0%; left: auto; right: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'jarvis-deploy';
  wrapper.innerHTML = `
    <div class="jarvis-section-header">CI/CD Agent</div>
    <div class="jarvis-deploy-card" id="deploy-card">
      <div class="jarvis-deploy-header">
        <div class="jarvis-deploy-repo">synapse-city</div>
        <div class="jarvis-deploy-badge" id="deploy-badge">FETCHING</div>
      </div>
      <div class="jarvis-deploy-meta" id="deploy-meta">Polling GitHub Actions...</div>
      <div class="jarvis-deploy-progress"></div>
    </div>
  `;
  container.appendChild(wrapper);

  async function checkDeployment() {
    const badge = document.getElementById('deploy-badge');
    const meta = document.getElementById('deploy-meta');
    const card = document.getElementById('deploy-card');
    
    if (!badge || !meta || !card) return;

    try {
      const res = await fetch('https://api.github.com/repos/Aasim41/synapse-city/actions/runs?per_page=1');
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      if (data.workflow_runs && data.workflow_runs.length > 0) {
        const run = data.workflow_runs[0];
        const status = run.status;
        const conclusion = run.conclusion;
        const commitMsg = run.head_commit?.message || 'Update';
        const sha = (run.head_sha || '000000').substring(0, 7);
        const branch = run.head_branch;

        meta.innerHTML = `Branch: <b>${branch}</b> <br> Commit: <span class="jarvis-deploy-commit">#${sha}</span> - ${commitMsg}`;
        
        badge.className = 'jarvis-deploy-badge';
        card.classList.remove('building');

        if (status === 'in_progress' || status === 'queued') {
          badge.textContent = 'BUILDING';
          badge.classList.add('in_progress');
          card.classList.add('building');
        } else if (conclusion === 'success') {
          badge.textContent = 'HEALTHY';
          badge.classList.add('success');
        } else if (conclusion === 'failure') {
          badge.textContent = 'FAILED';
          badge.classList.add('failure');
        } else {
          badge.textContent = conclusion ? conclusion.toUpperCase() : 'UNKNOWN';
        }
      } else {
        meta.textContent = 'No deployment history found.';
        badge.textContent = 'IDLE';
      }
    } catch (e) {
      console.error(e);
      badge.textContent = 'OFFLINE';
      badge.className = 'jarvis-deploy-badge failure';
      meta.textContent = 'Could not connect to GitHub API.';
      card.classList.remove('building');
    }
  }

  // Initial check
  checkDeployment();
  // Poll every 30 seconds
  const interval = setInterval(checkDeployment, 30000);

  container._jarvisCleanup = () => clearInterval(interval);
}
