/**
 * github-api.js — Handles secure interactions with the GitHub REST API.
 */

function getAuthHeaders() {
  const token = window.localStorage.getItem('jarvis_github_token');
  if (!token) return null;
  return {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
}

export function saveGithubCredentials(token, owner, repo) {
  window.localStorage.setItem('jarvis_github_token', token);
  window.localStorage.setItem('jarvis_github_owner', owner);
  window.localStorage.setItem('jarvis_github_repo', repo);
  return "Credentials successfully secured in local storage.";
}

export function getGithubConfig() {
  return {
    owner: window.localStorage.getItem('jarvis_github_owner'),
    repo: window.localStorage.getItem('jarvis_github_repo')
  };
}

export async function fetchIssues() {
  const config = getGithubConfig();
  if (!config.owner || !config.repo) return "Error: GitHub owner/repo not configured.";
  
  const headers = getAuthHeaders();
  if (!headers) return "Error: GitHub token not configured. Please provide a Personal Access Token.";

  try {
    const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/issues?state=open&per_page=10`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return "Error: Unauthorized. The GitHub token may be invalid or expired.";
      if (response.status === 404) return "Error: Repository not found. Check the owner and repo name.";
      return `Error: GitHub API returned status ${response.status}`;
    }

    const issues = await response.json();
    if (issues.length === 0) return "No open issues found in this repository.";
    
    return issues.map(i => `[#${i.number}] ${i.title} (State: ${i.state}) - ${i.html_url}`).join('\n');
  } catch (err) {
    return `Error connecting to GitHub: ${err.message}`;
  }
}

export async function createIssue(title, body) {
  const config = getGithubConfig();
  if (!config.owner || !config.repo) return "Error: GitHub owner/repo not configured.";
  
  const headers = getAuthHeaders();
  if (!headers) return "Error: GitHub token not configured.";

  try {
    const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/issues`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title, body })
    });

    if (!response.ok) {
      return `Error: Failed to create issue. Status: ${response.status}`;
    }

    const data = await response.json();
    return `Successfully created issue #${data.number}: ${data.title}\nLink: ${data.html_url}`;
  } catch (err) {
    return `Error creating issue: ${err.message}`;
  }
}
