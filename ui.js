import { getState, subscribe, toggleExplorer, activateTab, closeTab, setPanelTab } from './state.js';
import { markdownToHTML } from './renderers.js';

const refs = {};
let config = null;
let handlers = {};

export function initUI(loadedConfig, uiHandlers) {
  config = loadedConfig;
  handlers = uiHandlers;
  cacheRefs();
  renderTitleBar();
  renderMenubar();
  renderActivityBar();
  renderExplorer();
  renderStatusbar();
  renderPanel();
  renderWelcome();
  bindGlobalShortcuts();
  
  // Initialize Quick Open after a short delay to ensure DOM is ready
  setTimeout(initializeQuickOpen, 100);
  
  subscribe('state:explorer', renderExplorerVisibility);
  subscribe('state:logs', updateOutput);
  subscribe('state:commits', updateCommits);
  subscribe('state:tabs', renderTabs);
  subscribe('state:panel', renderPanelTabs);
  subscribe('state:statusbar', renderStatusbar);
  subscribe('state:dashboard', renderDashboardUpdate);
}

async function renderWelcomeDashboard() {
  // Clear any existing tabs
  const { tabs } = getState();
  tabs.forEach(tab => closeTab(tab.id));
  
  // Load dashboard data
  const owner = config.data?.github?.owner || 'divengine';
  const repos = (config.explorer?.sections || [])
    .flatMap(section => section.items)
    .map(item => item.repo);
  
  refs.editor.innerHTML = `
    <div class="welcome-dashboard">
      <div class="dashboard-header">
        <h1>🚀 Divengine Dashboard</h1>
        <p>Open Source Ecosystem Overview</p>
      </div>
      <div class="dashboard-loading">
        <div class="loading-indicator"></div>
        <p>Loading latest updates from GitHub...</p>
      </div>
    </div>
  `;
  
  try {
    const reposData = await handlers.fetchAllReposData(owner, repos);
    renderDashboard(reposData);
  } catch (error) {
    console.error('Dashboard load failed:', error);
    refs.editor.innerHTML = `
      <div class="welcome-dashboard">
        <div class="dashboard-error">
          <h3>Failed to load dashboard</h3>
          <p>${error.message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      </div>
    `;
  }
}

function renderDashboard(reposData) {
  const recentCommits = [];
  const recentIssues = [];
  const recentReleases = [];
  
  // Aggregate data from all repos
  Object.entries(reposData).forEach(([repo, data]) => {
    if (data.commits?.data) {
      recentCommits.push(...data.commits.data.map(commit => ({ ...commit, repo })));
    }
    if (data.issues?.data) {
      recentIssues.push(...data.issues.data.map(issue => ({ ...issue, repo })));
    }
    if (data.releases?.data) {
      recentReleases.push(...data.releases.data.map(release => ({ ...release, repo })));
    }
  });
  
  // Sort by date
  recentCommits.sort((a, b) => new Date(b.commit.author.date) - new Date(a.commit.author.date));
  recentIssues.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  recentReleases.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  
  refs.editor.innerHTML = `
    <div class="welcome-dashboard">
      <div class="dashboard-header">
        <h1>🚀 Divengine Dashboard</h1>
        <p>Open Source Ecosystem Overview</p>
      </div>
      
      <div class="dashboard-grid">
        <div class="dashboard-section">
          <h3>📈 Recent Activity</h3>
          <div class="activity-list">
            ${recentCommits.slice(0, 5).map(commit => `
              <div class="activity-item">
                <div class="activity-icon">💻</div>
                <div class="activity-content">
                  <div class="activity-title">${commit.commit.message.split('\n')[0]}</div>
                  <div class="activity-meta">${commit.repo} • ${formatDate(commit.commit.author.date)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="dashboard-section">
          <h3>🐛 Recent Issues</h3>
          <div class="activity-list">
            ${recentIssues.slice(0, 5).map(issue => `
              <div class="activity-item">
                <div class="activity-icon">🔍</div>
                <div class="activity-content">
                  <div class="activity-title">${issue.title}</div>
                  <div class="activity-meta">${issue.repo} • ${formatDate(issue.updated_at)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="dashboard-section">
          <h3>🎉 Latest Releases</h3>
          <div class="activity-list">
            ${recentReleases.slice(0, 3).map(release => `
              <div class="activity-item">
                <div class="activity-icon">🚀</div>
                <div class="activity-content">
                  <div class="activity-title">${release.name || release.tag_name}</div>
                  <div class="activity-meta">${release.repo} • ${formatDate(release.published_at)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="dashboard-section">
          <h3>📊 Repository Stats</h3>
          <div class="stats-grid">
            ${Object.entries(reposData).map(([repo, data]) => {
              const meta = data.meta?.data;
              if (!meta) return '';
              return `
                <div class="stat-card">
                  <h4>${repo}</h4>
                  <div class="stat-row">
                    <span>⭐ ${meta.stargazers_count}</span>
                    <span>🍴 ${meta.forks_count}</span>
                  </div>
                  <div class="stat-row">
                    <span>📝 ${meta.open_issues_count} issues</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderSearchView() {
  refs.editor.innerHTML = `
    <div class="search-view">
      <div class="search-header">
        <h2>🔍 Search Projects</h2>
        <input type="search" class="search-input" placeholder="Search in repositories..." />
      </div>
      <div class="search-results">
        <p class="search-placeholder">Type to search across all Divengine projects...</p>
      </div>
    </div>
  `;
}

function renderSourceControlView() {
  refs.editor.innerHTML = `
    <div class="scm-view">
      <div class="scm-header">
        <h2>📋 Source Control</h2>
        <p>Repository information and recent commits</p>
      </div>
      <div class="scm-content">
        <div class="scm-section">
          <h3>Recent Commits Across All Projects</h3>
          <div id="all-commits-list">Loading commits...</div>
        </div>
      </div>
    </div>
  `;
  
  // Load commits from all repos
  loadAllCommits();
}

function renderRunView() {
  refs.editor.innerHTML = `
    <div class="run-view">
      <div class="run-header">
        <h2>▶️ Run & Debug</h2>
        <p>Project releases and deployment information</p>
      </div>
      <div class="run-content">
        <div class="run-section">
          <h3>Latest Releases</h3>
          <div id="all-releases-list">Loading releases...</div>
        </div>
      </div>
    </div>
  `;
  
  // Load releases from all repos
  loadAllReleases();
}

function renderSettingsView() {
  refs.editor.innerHTML = `
    <div class="settings-view">
      <div class="settings-header">
        <h2>⚙️ Settings</h2>
        <p>Configuration and preferences</p>
      </div>
      <div class="settings-content">
        <div class="settings-section">
          <h3>Theme</h3>
          <div class="setting-item">
            <label>Dark Theme</label>
            <input type="checkbox" checked disabled />
          </div>
        </div>
        <div class="settings-section">
          <h3>Cache</h3>
          <div class="setting-item">
            <label>Cache TTL: 30 minutes</label>
            <button onclick="localStorage.clear(); location.reload()">Clear Cache</button>
          </div>
        </div>
        <div class="settings-section">
          <h3>About</h3>
          <div class="setting-item">
            <p>Divengine IDE v1.0.0</p>
            <p>Built with vanilla HTML, CSS, and JavaScript</p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString();
}

async function loadAllCommits() {
  // Implementation for loading commits from all repos
}

async function loadAllReleases() {
  // Implementation for loading releases from all repos
}

function renderDashboardUpdate(event) {
  // Handle dashboard data updates
}

function cacheRefs() {
  refs.activityBar = document.querySelector('[data-activity-bar]');
  refs.explorer = document.querySelector('[data-explorer]');
  refs.titlebar = document.querySelector('[data-titlebar]');
  refs.menubar = document.querySelector('[data-menubar]');
  refs.tabstrip = document.querySelector('[data-tabstrip]');
  refs.editor = document.querySelector('[data-editor]');
  refs.panel = document.querySelector('[data-panel]');
  refs.statusbar = document.querySelector('[data-statusbar]');
  refs.quickopen = document.querySelector('[data-quickopen]');
  refs.quickopenInput = document.querySelector('[data-quickopen-input]');
  refs.quickopenResults = document.querySelector('[data-quickopen-results]');
}

function initializeQuickOpen() {
  // Ensure Quick Open is hidden on init
  if (refs.quickopen) {
    refs.quickopen.hidden = true;
    console.log('Quick Open initialized as hidden');
  } else {
    console.warn('Quick Open element not found during initialization');
  }
}

function renderTitleBar() {
  if (!refs.titlebar) return;
  refs.titlebar.innerHTML = `
    <div class="titlebar turbo-title">
      <span class="turbo-logo">🔵</span>
      <span class="turbo-title-text">DIVENGINE TURBO IDE v2.0</span>
      <span class="turbo-copyright">© 2025 Divengine Solutions</span>
    </div>
  `;
}

function renderMenubar() {
  if (!refs.menubar) return;
  
  // 🔵 Turbo Pascal style menu
  const turboMenu = [
    { label: 'File', items: ['New', 'Open', 'Save', 'Save As', '─', 'Exit'] },
    { label: 'Edit', items: ['Undo', 'Cut', 'Copy', 'Paste', '─', 'Find', 'Replace'] },
    { label: 'Search', items: ['Find', 'Find Next', 'Replace', 'Go to Line'] },
    { label: 'Run', items: ['Compile', 'Make', 'Build', 'Run', '─', 'Parameters'] },
    { label: 'Compile', items: ['Compile', 'Make', 'Build All', 'Information'] },
    { label: 'Debug', items: ['Evaluate', 'Call Stack', 'Watch', 'Breakpoint'] },
    { label: 'Tools', items: ['Messages', 'Goto Error', 'Track Error', 'Options'] },
    { label: 'Options', items: ['Compiler', 'Memory sizes', 'Linker', 'Debugger'] },
    { label: 'Window', items: ['Zoom', 'Next', 'Previous', 'Close', '─', 'List'] },
    { label: 'Help', items: ['Contents', 'Index', 'Topic Search', '─', 'About'] }
  ];
  
  const menuContainer = document.createElement('div');
  menuContainer.className = 'turbo-menubar';
  
  turboMenu.forEach((menu) => {
    const menuItem = document.createElement('div');
    menuItem.className = 'turbo-menu-item';
    menuItem.innerHTML = `
      <span class="turbo-menu-label">${menu.label}</span>
      <div class="turbo-dropdown">
        ${menu.items.map(item => 
          item === '─' 
            ? '<div class="turbo-menu-separator">─────────────</div>'
            : `<div class="turbo-dropdown-item">${item}</div>`
        ).join('')}
      </div>
    `;
    menuContainer.appendChild(menuItem);
  });
  
  refs.menubar.innerHTML = '';
  refs.menubar.appendChild(menuContainer);
}

function renderActivityBar() {
  if (!refs.activityBar) return;
  const items = config.navigation?.activityBar || [];
  refs.activityBar.className = 'activity-bar';
  refs.activityBar.innerHTML = '';
  
  items.forEach((item) => {
    const button = document.createElement('button');
    button.className = 'activity-button';
    if (item.active) button.classList.add('active');
    button.type = 'button';
    button.title = item.tooltip;
    
    const img = document.createElement('img');
    img.src = `assets/${item.icon}`;
    img.alt = item.tooltip;
    button.append(img);
    
    button.addEventListener('click', () => {
      // Remove active state from all buttons
      refs.activityBar.querySelectorAll('.activity-button').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // Add active state to clicked button
      button.classList.add('active');
      
      // Handle the action
      handleActivityBarClick(item.id);
    });
    
    refs.activityBar.append(button);
  });
}

function renderExplorer() {
  if (!refs.explorer) return;
  const sections = config.explorer?.sections || [];
  refs.explorer.innerHTML = '';
  
  sections.forEach((section) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'explorer-section';
    
    const title = document.createElement('h3');
    title.className = 'explorer-section-header';
    title.textContent = section.label;
    wrapper.append(title);
    
    const list = document.createElement('ul');
    list.className = 'explorer-tree';
    
    section.items.forEach((item) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.className = 'tree-item';
      button.type = 'button';
      button.dataset.slug = item.slug;
      
      const icon = document.createElement('span');
      icon.className = 'tree-item-icon';
      icon.textContent = '📦';
      
      const label = document.createElement('span');
      label.textContent = item.label;
      
      button.append(icon, label);
      button.addEventListener('click', () => handlers.openRepo(item));
      
      li.append(button);
      list.append(li);
    });
    
    wrapper.append(list);
    refs.explorer.append(wrapper);
  });
  
  refs.explorer.hidden = false;
}

function renderExplorerVisibility(event) {
  const open = event?.detail?.open ?? getState().explorerOpen;
  if (window.innerWidth <= 768) {
    refs.explorer?.classList.toggle('is-visible', open);
  } else {
    if (refs.explorer) refs.explorer.hidden = !open;
  }
}

function renderStatusbar(event) {
  if (!refs.statusbar) return;
  const items = event?.detail?.items || getState().statusItems || {};
  
  // 🔵 Turbo Pascal style status bar
  refs.statusbar.className = 'turbo-statusbar';
  refs.statusbar.innerHTML = `
    <div class="turbo-status-left">
      <span class="turbo-status-item">F1 Help</span>
      <span class="turbo-status-item">F2 Save</span>
      <span class="turbo-status-item">F3 Open</span>
      <span class="turbo-status-item">F9 Make</span>
      <span class="turbo-status-item">F10 Menu</span>
    </div>
    <div class="turbo-status-right">
      <span class="turbo-status-item">Line: 1 Col: 1</span>
      <span class="turbo-status-item">${new Date().toLocaleTimeString()}</span>
    </div>
  `;
  
  const leftItems = document.createElement('div');
  leftItems.className = 'statusbar-left';
  
  const rightItems = document.createElement('div');
  rightItems.className = 'statusbar-right';
  
  Object.values(items).forEach((item) => {
    const span = document.createElement('span');
    span.className = 'status-item';
    span.dataset.statusId = item.id;
    
    if (item.icon) {
      const img = document.createElement('img');
      img.src = `assets/${item.icon}`;
      img.alt = '';
      img.className = 'status-icon';
      span.append(img);
    }
    
    const text = document.createElement('span');
    text.textContent = item.text;
    span.append(text);
    
    leftItems.append(span);
  });
  
  refs.statusbar.append(leftItems, rightItems);
}

function renderTabs() {
  const { tabs, activeTabId } = getState();
  refs.tabstrip.className = 'tabstrip';
  refs.tabstrip.innerHTML = '';
  
  tabs.forEach((tab) => {
    const button = document.createElement('button');
    button.className = 'tab';
    if (tab.id === activeTabId) button.classList.add('active');
    button.type = 'button';
    
    const title = document.createElement('span');
    title.textContent = tab.title;
    button.append(title);
    
    const close = document.createElement('button');
    close.className = 'tab-close';
    close.textContent = '×';
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      closeTab(tab.id);
    });
    
    button.append(close);
    button.addEventListener('click', () => activateTab(tab.id));
    refs.tabstrip.append(button);
  });
  
  renderEditor();
}

function renderEditor() {
  const { tabs, activeTabId } = getState();
  if (!tabs.length) {
    renderWelcome();
    return;
  }
  
  const active = tabs.find((tab) => tab.id === activeTabId);
  if (active) {
    // Check if this is a README file to show with editor controls
    if (active.title && active.title.includes('README.md') && active.rawContent) {
      renderReadmeEditor(active);
    } else {
      refs.editor.innerHTML = `<div class="editor-content markdown-content">${active.html || ''}</div>`;
      if (window.hljs) {
        window.hljs.highlightAll();
      }
    }
  }
}

function renderReadmeEditor(tab) {
  const viewMode = tab.viewMode || 'code'; // 'code' or 'preview'
  
  const actionsHtml = `
    <div class="editor-actions">
      <button class="editor-toggle ${viewMode === 'code' ? 'active' : ''}" data-view="code">Code</button>
      <button class="editor-toggle ${viewMode === 'preview' ? 'active' : ''}" data-view="preview">Preview</button>
    </div>
  `;
  
  if (viewMode === 'code') {
    renderCodeEditor(tab.rawContent, actionsHtml);
  } else {
    refs.editor.innerHTML = `
      ${actionsHtml}
      <div class="markdown-content">${tab.html || ''}</div>
    `;
    
    // Apply syntax highlighting to code blocks in the preview
    if (window.hljs) {
      refs.editor.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });
    }
  }
  
  // Add event listeners for toggle buttons
  refs.editor.querySelectorAll('.editor-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const newViewMode = btn.dataset.view;
      tab.viewMode = newViewMode;
      renderReadmeEditor(tab);
    });
  });
}

function renderCodeEditor(content, actionsHtml = '') {
  const lines = content.split('\n');
  const lineNumbers = lines.map((_, index) => (index + 1).toString().padStart(3, ' ')).join('\n');
  
  refs.editor.innerHTML = `
    ${actionsHtml}
    <div class="code-editor" style="height: calc(100% - ${actionsHtml ? '40px' : '0px'});">
      <div class="line-numbers">${lineNumbers}</div>
      <pre class="editor-code"><code class="language-markdown">${escapeHtml(content)}</code></pre>
    </div>
  `;
  
  // Apply syntax highlighting to the code area
  if (window.hljs) {
    const codeElement = refs.editor.querySelector('code');
    if (codeElement) {
      console.log('Applying syntax highlighting to markdown');
      hljs.highlightElement(codeElement);
    }
  } else {
    console.warn('highlight.js not available');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderWelcome() {
  const welcome = config.layout?.editor?.welcome;
  if (!welcome) {
    refs.editor.innerHTML = '';
    return;
  }
  
  const container = document.createElement('div');
  container.className = 'welcome-view';
  
  const title = document.createElement('h1');
  title.className = 'welcome-title';
  title.textContent = welcome.title;
  container.append(title);
  
  welcome.paragraphs.forEach((text) => {
    const p = document.createElement('p');
    p.className = 'welcome-paragraph';
    p.textContent = text;
    container.append(p);
  });
  
  const actions = document.createElement('div');
  actions.className = 'welcome-actions';
  
  welcome.actions.forEach((action) => {
    const btn = document.createElement(action.href ? 'a' : 'button');
    btn.className = action.href ? 'welcome-button' : 'welcome-button';
    btn.textContent = action.label;
    
    if (action.href) {
      btn.href = action.href;
      btn.target = action.target || '_blank';
      btn.rel = 'noopener';
    } else {
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (action.action === 'focusExplorer') {
          toggleExplorer(true);
        }
      });
    }
    
    actions.append(btn);
  });
  
  container.append(actions);
  refs.editor.innerHTML = '';
  refs.editor.append(container);
}

function renderPanel() {
  const tabs = config.layout?.panels?.panel?.tabs || [];
  const wrapper = document.createElement('div');
  wrapper.className = 'panel-header';
  
  const tabsContainer = document.createElement('div');
  tabsContainer.className = 'panel-tabs';
  
  tabs.forEach((id) => {
    const btn = document.createElement('button');
    btn.className = 'panel-tab';
    btn.dataset.panelTab = id;
    btn.textContent = id.charAt(0).toUpperCase() + id.slice(1);
    btn.addEventListener('click', () => setPanelTab(id));
    tabsContainer.append(btn);
  });
  
  wrapper.append(tabsContainer);
  
  const content = document.createElement('div');
  content.className = 'panel-content';
  
  refs.panel.innerHTML = '';
  refs.panel.append(wrapper, content);
  refs.panel.hidden = false;
  renderPanelTabs();
}

function renderPanelTabs() {
  const active = getState().panelTab;
  refs.panel?.querySelectorAll('.panel-tab')?.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.panelTab === active);
  });
  
  if (active === 'output') {
    updateOutput();
  } else if (active === 'commits') {
    updateCommits();
  }
}

function updateOutput() {
  if (getState().panelTab !== 'output') return;
  const container = refs.panel?.querySelector('.panel-content');
  if (!container) return;
  
  const logs = getState().logs;
  container.innerHTML = logs.map((line) => `<div class="output-line">${line}</div>`).join('');
  container.scrollTop = container.scrollHeight;
}

function updateCommits() {
  if (getState().panelTab !== 'commits') return;
  const container = refs.panel?.querySelector('.panel-content');
  if (!container) return;
  
  const commits = getState().commits;
  if (!commits.length) {
    container.innerHTML = '<div class="output-line muted">Open a project to load its commits.</div>';
    return;
  }
  
  container.innerHTML = commits.map((commit) => {
    const message = commit.commit?.message?.split('\n')[0] || '';
    const author = commit.commit?.author?.name || 'Unknown';
    const date = new Date(commit.commit?.author?.date).toLocaleDateString();
    
    return `
      <div class="commit-item">
        <div class="commit-message">${message}</div>
        <div class="commit-meta">${author} · ${date}</div>
      </div>
    `;
  }).join('');
}

function bindGlobalShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Quick Open with Ctrl+P
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      event.stopPropagation();
      openQuickOpen();
      return;
    }
    
    // Close with Escape
    if (event.key === 'Escape') {
      if (refs.quickopen && !refs.quickopen.hidden) {
        event.preventDefault();
        event.stopPropagation();
        closeQuickOpen();
        return;
      }
    }
  });
  
  // Click outside to close
  refs.quickopen?.addEventListener('click', (event) => {
    if (event.target === refs.quickopen) {
      closeQuickOpen();
    }
  });
  
  // Search as you type
  refs.quickopenInput?.addEventListener('input', (event) => {
    populateQuickResults(event.target.value || '');
  });
  
  // Enter to select
  refs.quickopenInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = refs.quickopenResults?.querySelector('.selected') || 
                      refs.quickopenResults?.querySelector('.quickopen-item');
      if (selected) {
        selected.click();
      }
    }
    
    // Arrow keys for navigation
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      navigateQuickResults(event.key === 'ArrowDown' ? 1 : -1);
    }
  });
}

function navigateQuickResults(direction) {
  const items = refs.quickopenResults?.querySelectorAll('.quickopen-item');
  if (!items || items.length === 0) return;
  
  const current = refs.quickopenResults.querySelector('.selected');
  let index = current ? Array.from(items).indexOf(current) : -1;
  
  // Remove current selection
  if (current) current.classList.remove('selected');
  
  // Calculate new index
  index += direction;
  if (index < 0) index = items.length - 1;
  if (index >= items.length) index = 0;
  
  // Add new selection
  items[index].classList.add('selected');
}

function openQuickOpen() {
  console.log('openQuickOpen called');
  if (!refs.quickopen) {
    console.warn('Quick Open element not found');
    return;
  }
  refs.quickopen.hidden = false;
  refs.quickopenInput.value = '';
  populateQuickResults('');
  refs.quickopenInput.focus();
  console.log('Quick Open opened');
}

function closeQuickOpen() {
  console.log('closeQuickOpen called');
  if (!refs.quickopen) {
    console.warn('Quick Open element not found for closing');
    return;
  }
  refs.quickopen.hidden = true;
  console.log('Quick Open closed');
}

function populateQuickResults(query) {
  if (!refs.quickopenResults) return;
  const items = (config.explorer?.sections || [])
    .flatMap(section => section.items.map(item => ({ section: section.label, item })));
  
  const filtered = query ? 
    items.filter(({ item }) => item.label.toLowerCase().includes(query.toLowerCase())) : 
    items;
  
  refs.quickopenResults.innerHTML = '';
  
  filtered.slice(0, 20).forEach(({ item }, index) => {
    const li = document.createElement('li');
    li.className = 'quickopen-item';
    if (index === 0) li.classList.add('selected');
    
    const main = document.createElement('div');
    main.className = 'quickopen-item-main';
    main.textContent = item.label;
    
    const meta = document.createElement('div');
    meta.className = 'quickopen-item-meta';
    meta.textContent = item.description || '';
    
    li.append(main, meta);
    li.addEventListener('click', () => {
      closeQuickOpen();
      handlers.openRepo(item);
    });
    
    refs.quickopenResults.append(li);
  });
}

export function displayReadme(repo, markdown) {
  const html = markdownToHTML(markdown);
  handlers.openTab({ 
    id: repo.slug, 
    title: `${repo.repo}/README.md`, 
    html,
    rawContent: markdown // Store raw markdown for code editor view
  });
}

export function highlightExplorerItem(slug) {
  refs.explorer?.querySelectorAll('.tree-item').forEach(item => {
    item.classList.toggle('active', item.dataset.slug === slug);
  });
}

function handleActivityBarClick(viewId) {
  console.log('Activity bar clicked:', viewId);
  
  switch (viewId) {
    case 'explorer':
      toggleExplorer(true);
      renderWelcomeDashboard();
      break;
    case 'search':
      toggleExplorer(false);
      renderSearchView();
      break;
    case 'scm':
      toggleExplorer(false);
      renderSourceControlView();
      break;
    case 'run':
      toggleExplorer(false);
      renderRunView();
      break;
    case 'settings':
      toggleExplorer(false);
      renderSettingsView();
      break;
    default:
      toggleExplorer(true);
      renderWelcomeDashboard();
  }
}
