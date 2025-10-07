import { initializeState, addLog, openTab as addTabToState, setCommits, setBranch, setCacheState, setNetworkState, toggleExplorer } from './state.js';
import { initUI, displayReadme, highlightExplorerItem } from './ui.js';
import { configureMarkdown } from './renderers.js';
import { fetchConfig, fetchReadme, fetchRepoMeta, fetchCommits, fetchAllReposData } from './data.js';

let config;

async function bootstrap() {
  try {
    configureMarkdown();
    config = await fetchConfig();
    initializeState(config);
    initUI(config, {
      openRepo: handleOpenRepo,
      openTab: addTabToState,
      fetchAllReposData: fetchAllReposData
    });
    toggleExplorer(true);
    setNetworkState('Online');
    setCacheState('Cache: warm');
    addLog('IDE shell ready');
    window.addEventListener('hashchange', () => handleRoute(location.hash));
    handleRoute(location.hash || '#/');
  } catch (error) {
    console.error('Bootstrap error:', error);
    addLog(`Error: ${error.message}`);
    // Show a user-friendly error message
    const editor = document.querySelector('[data-editor]');
    if (editor) {
      editor.innerHTML = `
        <div class="editor-error">
          <h3>Failed to load Divengine IDE</h3>
          <p>There was an error initializing the application. Please refresh the page or check your internet connection.</p>
          <button class="editor-retry" onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }
}

function handleRoute(hash) {
  if (!hash || hash === '#/' || hash === '#') {
    history.replaceState({}, '', '#/');
    addLog('Welcome view ready');
    return;
  }
  const match = hash.match(/^#\/repo\/([^\/]+)/);
  if (match) {
    const slug = decodeURIComponent(match[1]);
    const item = findRepoBySlug(slug);
    if (item) {
      handleOpenRepo(item);
    }
  }
}

function findRepoBySlug(slug) {
  return (config.explorer?.sections || [])
    .flatMap(section => section.items)
    .find(item => item.slug === slug);
}

async function handleOpenRepo(item) {
  const owner = config.data?.github?.owner || 'divengine';
  const branchOrder = config.data?.github?.branchFallbackOrder || ['main', 'master'];
  const context = {
    owner,
    repo: item.repo,
    slug: item.slug,
    readmePath: item.readmePath || 'README.md',
    branchOrder
  };
  addLog(`Loading ${item.repo}…`);
  try {
    setNetworkState('Loading…');
    const [readme, meta] = await Promise.all([
      fetchReadme(context, config.data?.cacheTTLMinutes),
      fetchRepoMeta(owner, item.repo, config.data?.cacheTTLMinutes)
    ]);
    if (meta.rateLimit) {
      const remaining = meta.rateLimit.remaining ?? '—';
      setNetworkState(`API ${remaining} remaining`);
    }
    setCacheState(readme.fromCache ? 'Cache: hit' : 'Cache: miss');
    if (meta.data?.default_branch) {
      setBranch(meta.data.default_branch);
    }
    displayReadme(item, readme.markdown);
    if (readme.branch) {
      addLog(`README loaded from branch ${readme.branch}${readme.fromCache ? ' (cache)' : ''}`);
    }
    loadCommits(owner, item.repo);
    history.replaceState({}, '', `#/repo/${encodeURIComponent(item.slug)}`);
  } catch (error) {
    console.error(error);
    addLog(`Error loading ${item.repo}: ${error.message}`);
    alert(`Unable to load ${item.repo}: ${error.message}`);
  }
}

async function loadCommits(owner, repo) {
  try {
    const commits = await fetchCommits(owner, repo, config.data?.cacheTTLMinutes ?? 30);
    setCommits(commits.data || []);
    if (commits.rateLimit) {
      const remaining = commits.rateLimit.remaining ?? '—';
      setNetworkState(`API ${remaining} remaining`);
    }
    addLog(`Loaded commits for ${repo}${commits.fromCache ? ' (cache)' : ''}`);
  } catch (error) {
    addLog(`Unable to load commits: ${error.message}`);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}



