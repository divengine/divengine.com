const emitter = new EventTarget();

const state = {
  config: null,
  explorerOpen: false,
  tabs: [],
  activeTabId: null,
  panelTab: 'output',
  logs: [],
  commits: [],
  statusItems: {},
  activeView: 'welcome', // welcome, search, scm, run, settings
  reposData: {},
  dashboardData: null
};

export function initializeState(config) {
  state.config = config;
  state.logs = [...(config.panels?.output?.logs || [])];
  state.panelTab = config.layout?.panels?.panel?.tabs?.[0] || 'output';
  state.explorerOpen = !(config.layout?.panels?.explorer?.collapsed);
  state.statusItems = Object.fromEntries((config.statusbar?.items || []).map(item => [item.id, { ...item }]));
  emit('state:init');
}

export function getState() {
  return state;
}

export function subscribe(type, listener) {
  emitter.addEventListener(type, listener);
  return () => emitter.removeEventListener(type, listener);
}

function emit(type, detail) {
  emitter.dispatchEvent(new CustomEvent(type, { detail }));
}

export function toggleExplorer(force) {
  state.explorerOpen = typeof force === 'boolean' ? force : !state.explorerOpen;
  emit('state:explorer', { open: state.explorerOpen });
}

export function addLog(message) {
  state.logs.push(`${new Date().toLocaleTimeString()} · ${message}`);
  emit('state:logs', { logs: state.logs.slice() });
}

export function setNetworkState(text) {
  updateStatusItem('net', text);
}

export function setCacheState(text) {
  updateStatusItem('cache', text);
}

export function setBranch(text) {
  updateStatusItem('branch', text);
}

function updateStatusItem(id, text) {
  if (!state.statusItems[id]) return;
  state.statusItems[id] = { ...state.statusItems[id], text };
  emit('state:statusbar', { items: state.statusItems });
}

export function setCommits(commits) {
  state.commits = commits;
  emit('state:commits', { commits });
}

export function openTab(tab) {
  const existing = state.tabs.find(t => t.id === tab.id);
  if (existing) {
    Object.assign(existing, tab);
  } else {
    state.tabs.push(tab);
  }
  state.activeTabId = tab.id;
  emit('state:tabs', { tabs: state.tabs.slice(), activeTabId: state.activeTabId });
}

export function closeTab(id) {
  const index = state.tabs.findIndex(t => t.id === id);
  if (index === -1) return;
  state.tabs.splice(index, 1);
  if (state.activeTabId === id) {
    state.activeTabId = state.tabs.length ? state.tabs[Math.max(0, index - 1)].id : null;
  }
  emit('state:tabs', { tabs: state.tabs.slice(), activeTabId: state.activeTabId });
}

export function activateTab(id) {
  if (state.activeTabId === id) return;
  if (state.tabs.some(t => t.id === id)) {
    state.activeTabId = id;
    emit('state:tabs', { tabs: state.tabs.slice(), activeTabId: state.activeTabId });
  }
}

export function setPanelTab(id) {
  if (state.panelTab === id) return;
  state.panelTab = id;
  emit('state:panel', { active: state.panelTab });
}

export function setActiveView(viewId) {
  if (state.activeView === viewId) return;
  state.activeView = viewId;
  emit('state:view', { active: state.activeView });
}

export function setReposData(data) {
  state.reposData = data;
  emit('state:repos-data', { data });
}

export function setDashboardData(data) {
  state.dashboardData = data;
  emit('state:dashboard', { data });
}
