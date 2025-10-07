const CACHE_PREFIX = 'divengine.cache';
const DEFAULT_TTL = 30 * 60 * 1000;

function buildKey(slug, type) {
  return `${CACHE_PREFIX}.${slug}.${type}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
      return parsed.value;
    }
    localStorage.removeItem(key);
  } catch (error) {
    console.warn('Cache read failed', error);
  }
  return null;
}

function writeCache(key, value, ttl = DEFAULT_TTL) {
  try {
    localStorage.setItem(key, JSON.stringify({ value, expiresAt: Date.now() + ttl }));
  } catch (error) {
    console.warn('Cache write failed', error);
  }
}

export async function fetchConfig() {
  const response = await fetch('config.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Unable to load config.json');
  }
  return response.json();
}

async function fetchJSON(url) {
  const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return { data: await response.json(), headers: response.headers };
}

export async function fetchRepoMeta(owner, repo, cacheMinutes = 30) {
  const key = buildKey(repo, 'meta');
  const cached = readCache(key);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  const { data, headers } = await fetchJSON(`https://api.github.com/repos/${owner}/${repo}`);
  const payload = { data, rateLimit: parseRate(headers) };
  writeCache(key, payload, cacheMinutes * 60 * 1000);
  return { ...payload, fromCache: false };
}

export async function fetchCommits(owner, repo, cacheMinutes = 15) {
  const key = buildKey(repo, 'commits');
  const cached = readCache(key);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  const { data, headers } = await fetchJSON(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`);
  const payload = { data, rateLimit: parseRate(headers) };
  writeCache(key, payload, cacheMinutes * 60 * 1000);
  return { ...payload, fromCache: false };
}

export async function fetchIssues(owner, repo, cacheMinutes = 30) {
  const key = buildKey(repo, 'issues');
  const cached = readCache(key);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  const { data, headers } = await fetchJSON(`https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=10&sort=updated`);
  const payload = { data, rateLimit: parseRate(headers) };
  writeCache(key, payload, cacheMinutes * 60 * 1000);
  return { ...payload, fromCache: false };
}

export async function fetchReleases(owner, repo, cacheMinutes = 60) {
  const key = buildKey(repo, 'releases');
  const cached = readCache(key);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  const { data, headers } = await fetchJSON(`https://api.github.com/repos/${owner}/${repo}/releases?per_page=5`);
  const payload = { data, rateLimit: parseRate(headers) };
  writeCache(key, payload, cacheMinutes * 60 * 1000);
  return { ...payload, fromCache: false };
}

export async function fetchWikiPages(owner, repo, cacheMinutes = 60) {
  const key = buildKey(repo, 'wiki');
  const cached = readCache(key);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  try {
    const { data, headers } = await fetchJSON(`https://api.github.com/repos/${owner}/${repo}/contents/wiki`);
    const payload = { data, rateLimit: parseRate(headers) };
    writeCache(key, payload, cacheMinutes * 60 * 1000);
    return { ...payload, fromCache: false };
  } catch (error) {
    // Wiki might not exist or be private
    return { data: [], fromCache: false, error: error.message };
  }
}

export async function fetchAllReposData(owner, repos, cacheMinutes = 30) {
  const results = {};
  
  for (const repo of repos) {
    try {
      const [meta, commits, issues, releases] = await Promise.allSettled([
        fetchRepoMeta(owner, repo, cacheMinutes),
        fetchCommits(owner, repo, cacheMinutes),
        fetchIssues(owner, repo, cacheMinutes),
        fetchReleases(owner, repo, cacheMinutes)
      ]);
      
      results[repo] = {
        meta: meta.status === 'fulfilled' ? meta.value : null,
        commits: commits.status === 'fulfilled' ? commits.value : null,
        issues: issues.status === 'fulfilled' ? issues.value : null,
        releases: releases.status === 'fulfilled' ? releases.value : null
      };
    } catch (error) {
      console.warn(`Failed to fetch data for ${repo}:`, error);
      results[repo] = { error: error.message };
    }
  }
  
  return results;
}

export async function fetchReadme({ owner, repo, branchOrder, readmePath }, cacheMinutes = 30) {
  const key = buildKey(repo, 'readme');
  const cached = readCache(key);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  const branches = branchOrder.length ? branchOrder : ['main', 'master'];
  let lastError = null;
  for (const branch of branches) {
    try {
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${readmePath}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        lastError = new Error(`README fetch failed (${response.status})`);
        continue;
      }
      const text = await response.text();
      const payload = { markdown: text, branch };
      writeCache(key, payload, cacheMinutes * 60 * 1000);
      return { ...payload, fromCache: false };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Unable to fetch README');
}

// Simple wrapper for README fetching
export async function fetchReadmeSimple(owner, repo, cacheMinutes = 30) {
  try {
    const result = await fetchReadme({
      owner,
      repo,
      branchOrder: ['main', 'master', 'development', 'dev'],
      readmePath: 'README.md'
    }, cacheMinutes);
    return result.markdown;
  } catch (error) {
    console.warn(`README not found for ${owner}/${repo}, trying alternative files...`);
    
    // Try alternative README files
    const alternatives = ['readme.md', 'Readme.md', 'README.txt', 'readme.txt'];
    for (const altPath of alternatives) {
      try {
        const result = await fetchReadme({
          owner,
          repo,
          branchOrder: ['main', 'master', 'development', 'dev'],
          readmePath: altPath
        }, cacheMinutes);
        return result.markdown;
      } catch (altError) {
        // Continue to next alternative
      }
    }
    
    return null; // No README found
  }
}

function parseRate(headers) {
  return {
    limit: headers.get('x-ratelimit-limit'),
    remaining: headers.get('x-ratelimit-remaining'),
    reset: headers.get('x-ratelimit-reset')
  };
}
