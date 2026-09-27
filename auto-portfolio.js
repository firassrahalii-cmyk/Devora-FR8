// Devora VIP - Auto Portfolio Generator
// Generates a professional developer portfolio from GitHub profile

const https = require('https');

function fetchGitHubProfile(username) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/users/${username}`;
    https.get(url, { headers: { 'User-Agent': 'Devora-Portfolio-Generator' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON response')); }
      });
    }).on('error', reject);
  });
}

function fetchRepos(username) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/users/${username}/repos?sort=stars&per_page=10`;
    https.get(url, { headers: { 'User-Agent': 'Devora-Portfolio-Generator' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON response')); }
      });
    }).on('error', reject);
  });
}

function generateHTML(profile, repos) {
  const repoCards = repos.map(r => `
    <div class="repo-card">
      <h3><a href="${r.html_url}" target="_blank">${r.name}</a></h3>
      <p>${r.description || 'No description'}</p>
      <div class="repo-stats">
        <span>⭐ ${r.stargazers_count}</span>
        <span>🍴 ${r.forks_count}</span>
        <span>${r.language || 'N/A'}</span>
      </div>
    </div>`).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${profile.login} - Portfolio</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .profile { text-align: center; margin-bottom: 40px; }
    .avatar { width: 120px; height: 120px; border-radius: 50%; border: 3px solid #818cf8; margin-bottom: 16px; }
    h1 { font-size: 28px; margin-bottom: 8px; }
    .bio { color: #94a3b8; margin-bottom: 8px; }
    .stats { display: flex; justify-content: center; gap: 24px; margin: 16px 0; }
    .stat { text-align: center; }
    .stat-num { font-size: 20px; font-weight: 700; color: #818cf8; }
    .stat-label { font-size: 12px; color: #64748b; }
    .repos { display: grid; gap: 16px; }
    .repo-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; }
    .repo-card h3 { margin-bottom: 8px; }
    .repo-card a { color: #818cf8; text-decoration: none; }
    .repo-card p { color: #94a3b8; font-size: 14px; margin-bottom: 12px; }
    .repo-stats { display: flex; gap: 16px; font-size: 13px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="profile">
      <img class="avatar" src="${profile.avatar_url}" alt="${profile.login}">
      <h1>${profile.name || profile.login}</h1>
      <p class="bio">${profile.bio || ''}</p>
      <div class="stats">
        <div class="stat"><div class="stat-num">${profile.public_repos}</div><div class="stat-label">Repos</div></div>
        <div class="stat"><div class="stat-num">${profile.followers}</div><div class="stat-label">Followers</div></div>
        <div class="stat"><div class="stat-num">${profile.following}</div><div class="stat-label">Following</div></div>
      </div>
    </div>
    <div class="repos">${repoCards}</div>
  </div>
</body>
</html>`;
}

// CLI Usage
const username = process.argv[2];
if (!username) {
  console.log('Usage: node auto-portfolio.js <github-username>');
  process.exit(1);
}

console.log(`Generating portfolio for ${username}...`);
Promise.all([fetchGitHubProfile(username), fetchRepos(username)])
  .then(([profile, repos]) => {
    const html = generateHTML(profile, repos);
    const fs = require('fs');
    const filename = `${username}-portfolio.html`;
    fs.writeFileSync(filename, html);
    console.log(`Portfolio generated: ${filename}`);
  })
  .catch(err => console.error('Error:', err.message));
