// Legacy UI - disabled - using ui.js instead
/*
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
  subscribe('state:explorer', renderExplorerVisibility);
  subscribe('state:logs', updateOutput);
  subscribe('state:commits', updateCommits);
  subscribe('state:tabs', renderTabs);
  subscribe('state:panel', renderPanelTabs);
  subscribe('state:statusbar', renderStatusbar);
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

function renderTitleBar() {
  if (!refs.titlebar) return;
  refs.titlebar.innerHTML = '<div class="titlebar">Divengine Software Solutions — VSCode Shell</div>';
}

function renderMenubar() {
  if (!refs.menubar) return;
  const navItems = config.navigation?.topbar || [];
  const fragment = document.createDocumentFragment();
  
  navItems.forEach((item) => {
    if (item.type === 'separator') {
      const span = document.createElement('span');
      span.className = 'menubar-separator';
      span.textContent = '|';
      fragment.append(span);
      return;
    }
    if (item.type === 'link') {
      const anchor = document.createElement('a');
      anchor.className = 'menubar-item';
      anchor.textContent = item.label;
      anchor.href = item.href;
      if (item.target) anchor.target = item.target;
      anchor.rel = 'noopener';
      fragment.append(anchor);
      return;
    }
    if (item.type === 'quickopen') {
      const button = document.createElement('button');
      button.className = 'menubar-item';
      button.type = 'button';
      button.dataset.role = 'quickopen';
      button.textContent = item.label;
      button.addEventListener('click', openQuickOpen);
      fragment.append(button);
    }
  });
  
  refs.menubar.className = 'menubar';
  refs.menubar.innerHTML = '';
  refs.menubar.append(fragment);
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
      if (item.id === 'explorer') {
        toggleExplorer();
      }
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
  
  refs.statusbar.className = 'statusbar';
  refs.statusbar.innerHTML = '';
  
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
    refs.editor.innerHTML = `<div class="editor-content markdown-content">${active.html || ''}</div>`;
    if (window.hljs) {
      window.hljs.highlightAll();
    }
  }
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
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
      event.preventDefault();
      openQuickOpen();
    }
    if (event.key === 'Escape' && !refs.quickopen?.hidden) {
      closeQuickOpen();
    }
  });
  
  refs.quickopen?.addEventListener('click', (event) => {
    if (event.target === refs.quickopen) closeQuickOpen();
  });
  
  refs.quickopenInput?.addEventListener('input', (event) => 
    populateQuickResults(event.target.value || '')
  );
  
  refs.quickopenInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      const selected = refs.quickopenResults?.querySelector('.selected') || 
                      refs.quickopenResults?.querySelector('.quickopen-item');
      if (selected) {
        selected.click();
      }
    }
  });
}

function openQuickOpen() {
  if (!refs.quickopen) return;
  refs.quickopen.hidden = false;
  refs.quickopenInput.value = '';
  populateQuickResults('');
  refs.quickopenInput.focus();
}

function closeQuickOpen() {
  if (!refs.quickopen) return;
  refs.quickopen.hidden = true;
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
      handlers.openRepo(item);
      closeQuickOpen();
    });
    
    refs.quickopenResults.append(li);
  });
}

export function displayReadme(repo, markdown) {
  const html = markdownToHTML(markdown);
  handlers.openTab({ 
    id: repo.slug, 
    title: `${repo.repo}/README.md`, 
    html 
  });
}

export function highlightExplorerItem(slug) {
  refs.explorer?.querySelectorAll('.tree-item').forEach(item => {
    item.classList.toggle('active', item.dataset.slug === slug);
  });
}
*/
