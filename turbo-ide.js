// Turbo Vision IDE - Main Application
// Created by Divengine Software Solutions  
// Copyright © 2025

import { windowManager } from './turbo-windows.js';
import { fetchConfig, fetchReadme, fetchReadmeSimple, fetchRepoMeta } from './data.js';
import { markdownToHTML } from './renderers.js';

let config = null;

// Helper function to create window with correct API
function createTurboWindow(title, width, height, content = '') {
  const windowId = windowManager.createWindow({
    title,
    width,
    height,
    content
  });
  return document.getElementById(windowId);
}

// Application initialization
async function initTurboIDE() {
  try {
    config = await fetchConfig();
    initMenuBar();
    initStatusBar();
    initKeyboardShortcuts();
    
    // Make handleMenuAction globally available
    window.handleMenuAction = handleMenuAction;
    
    showWelcomeWindow();
    
    console.log('🔵 Turbo Vision IDE initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Turbo IDE:', error);
    showErrorDialog('Initialization Error', `Failed to load IDE: ${error.message}`);
  }
}

// Initialize keyboard shortcuts
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Handle Alt+letter combinations for menu access
    if (e.altKey) {
      switch(e.key.toLowerCase()) {
        case 'p': toggleMenu('Projects'); e.preventDefault(); break;
        case 'v': toggleMenu('View'); e.preventDefault(); break;
        case 'c': toggleMenu('Code'); e.preventDefault(); break;
        case 'g': toggleMenu('GitHub'); e.preventDefault(); break;
        case 't': toggleMenu('Tools'); e.preventDefault(); break;
        case 'h': toggleMenu('Help'); e.preventDefault(); break;
      }
    }
    
    // Handle function keys and Ctrl combinations
    if (e.key === 'F1') { handleMenuAction('projects-welcome'); e.preventDefault(); }
    if (e.key === 'F5') { handleMenuAction('projects-refresh'); e.preventDefault(); }
    if (e.ctrlKey) {
      switch(e.key.toLowerCase()) {
        case 'd': handleMenuAction('view-dashboard'); e.preventDefault(); break;
        case 'l': handleMenuAction('view-repo-list'); e.preventDefault(); break;
        case 'b': handleMenuAction('code-browse'); e.preventDefault(); break;
        case 'h': handleMenuAction('code-docs'); e.preventDefault(); break;
        case 'f': handleMenuAction('code-search'); e.preventDefault(); break;
        case 'g': handleMenuAction('github-open-repo'); e.preventDefault(); break;
      }
    }
  });
}

// Toggle menu visibility
function toggleMenu(menuLabel) {
  const menuItem = document.querySelector(`.turbo-menu-item[data-menu="${menuLabel}"]`);
  if (menuItem) {
    // Close other menus
    document.querySelectorAll('.turbo-menu-item.active').forEach(item => {
      if (item !== menuItem) item.classList.remove('active');
    });
    // Toggle current menu
    menuItem.classList.toggle('active');
  }
}

// Initialize menu bar with Turbo Pascal style menus
function initMenuBar() {
  const menuBar = document.querySelector('[data-menubar]');
  if (!menuBar) return;

  const turboMenus = [
    {
      label: 'Projects',
      hotkey: 'P',
      items: [
        { label: 'Welcome', hotkey: 'W', shortcut: 'F1', action: 'projects-welcome' },
        { separator: true },
        { label: 'Div Engine', hotkey: 'D', shortcut: '', action: 'project-div' },
        { label: 'Ajax Map', hotkey: 'A', shortcut: '', action: 'project-ajaxmap' },
        { label: 'Nodes DB', hotkey: 'N', shortcut: '', action: 'project-nodes' },
        { label: 'Ways Router', hotkey: 'y', shortcut: '', action: 'project-ways' },
        { label: 'ORM', hotkey: 'O', shortcut: '', action: 'project-orm' },
        { label: 'Functions', hotkey: 'F', shortcut: '', action: 'project-functions' },
        { label: 'Matrix', hotkey: 'M', shortcut: '', action: 'project-matrix' },
        { separator: true },
        { label: 'Refresh All', hotkey: 'R', shortcut: 'F5', action: 'projects-refresh' }
      ]
    },
    {
      label: 'View',
      hotkey: 'V',
      items: [
        { label: 'Dashboard', hotkey: 'D', shortcut: 'Ctrl+D', action: 'view-dashboard' },
        { label: 'Repository List', hotkey: 'R', shortcut: 'Ctrl+L', action: 'view-repo-list' },
        { separator: true },
        { label: 'GitHub Stats', hotkey: 'G', shortcut: '', action: 'view-github-stats' },
        { label: 'Issues Tracker', hotkey: 'I', shortcut: '', action: 'view-issues' },
        { label: 'Releases', hotkey: 'e', shortcut: '', action: 'view-releases' },
        { separator: true },
        { label: 'Refresh View', hotkey: 'f', shortcut: 'F5', action: 'view-refresh' }
      ]
    },
    {
      label: 'Code',
      hotkey: 'C',
      items: [
        { label: 'Browse Source', hotkey: 'B', shortcut: 'Ctrl+B', action: 'code-browse' },
        { label: 'Documentation', hotkey: 'D', shortcut: 'Ctrl+H', action: 'code-docs' },
        { separator: true },
        { label: 'Search in Files', hotkey: 'S', shortcut: 'Ctrl+F', action: 'code-search' },
        { label: 'Find Usage', hotkey: 'U', shortcut: 'Alt+F12', action: 'code-find-usage' },
        { separator: true },
        { label: 'Go to Definition', hotkey: 'G', shortcut: 'F12', action: 'code-goto-definition' }
      ]
    },
    {
      label: 'GitHub',
      hotkey: 'G',
      items: [
        { label: 'Open Repository', hotkey: 'O', shortcut: 'Ctrl+G', action: 'github-open-repo' },
        { label: 'View Commits', hotkey: 'C', shortcut: '', action: 'github-commits' },
        { label: 'Pull Requests', hotkey: 'P', shortcut: '', action: 'github-pullrequests' },
        { label: 'Issues', hotkey: 'I', shortcut: '', action: 'github-issues' },
        { separator: true },
        { label: 'Contributors', hotkey: 'n', shortcut: '', action: 'github-contributors' },
        { label: 'Fork Statistics', hotkey: 'F', shortcut: '', action: 'github-forks' },
        { label: 'Star History', hotkey: 'S', shortcut: '', action: 'github-stars' }
      ]
    },
    {
      label: 'Tools',
      hotkey: 'T',
      items: [
        { label: 'Package Manager', hotkey: 'P', shortcut: '', action: 'tools-packages' },
        { label: 'Dependencies', hotkey: 'D', shortcut: '', action: 'tools-dependencies' },
        { separator: true },
        { label: 'API Explorer', hotkey: 'A', shortcut: '', action: 'tools-api-explorer' },
        { label: 'Code Generator', hotkey: 'C', shortcut: '', action: 'tools-code-generator' },
        { separator: true },
        { label: 'Calculator', hotkey: 'l', shortcut: '', action: 'tools-calculator' },
        { label: 'ASCII Table', hotkey: 'S', shortcut: '', action: 'tools-ascii-table' }
      ]
    },
    {
      label: 'Help',
      hotkey: 'H',
      items: [
        { label: 'About Divengine', hotkey: 'A', shortcut: '', action: 'help-about' },
        { label: 'Documentation', hotkey: 'D', shortcut: 'F1', action: 'help-docs' },
        { separator: true },
        { label: 'GitHub Repository', hotkey: 'G', shortcut: '', action: 'help-github' },
        { label: 'Issue Tracker', hotkey: 'I', shortcut: '', action: 'help-issues' },
        { label: 'Discussions', hotkey: 's', shortcut: '', action: 'help-discussions' },
        { separator: true },
        { label: 'Keyboard Shortcuts', hotkey: 'K', shortcut: '', action: 'help-shortcuts' }
      ]
    },

    {
      label: 'Settings',
      hotkey: 'S',
      items: [
        { label: 'Preferences...', hotkey: 'P', shortcut: '', action: 'settings-preferences' },
        { label: 'GitHub Token...', hotkey: 'G', shortcut: '', action: 'settings-token' },
        { separator: true },
        { label: 'Display Options...', hotkey: 'D', shortcut: '', action: 'settings-display' },
        { label: 'Editor Settings...', hotkey: 'E', shortcut: '', action: 'settings-editor' },
        { separator: true },
        { label: 'Cache Settings...', hotkey: 'C', shortcut: '', action: 'settings-cache' },
        { label: 'Reset to Defaults', hotkey: 'R', shortcut: '', action: 'settings-reset' }
      ]
    },
    {
      label: 'Window',
      hotkey: 'W',
      items: [
        { label: 'Tile', hotkey: 'T', shortcut: '', action: 'window-tile' },
        { label: 'Cascade', hotkey: 'C', shortcut: '', action: 'window-cascade' },
        { label: 'Arrange Icons', hotkey: 'A', shortcut: '', action: 'window-arrange' },
        { label: 'Close All', shortcut: '', action: 'window-close-all' },
        { separator: true },
        { label: 'Size/Move', shortcut: 'Ctrl+F5', action: 'window-size-move' },
        { label: 'Zoom', shortcut: 'F5', action: 'window-zoom' },
        { label: 'Next', shortcut: 'F6', action: 'window-next' },
        { label: 'Previous', shortcut: 'Shift+F6', action: 'window-previous' },
        { label: 'Close', shortcut: 'Alt+F3', action: 'window-close' }
      ]
    },
    {
      label: 'Help',
      items: [
        { label: 'Contents', shortcut: 'F1', action: 'help-contents' },
        { label: 'Index', shortcut: 'Shift+F1', action: 'help-index' },
        { label: 'Topic Search', shortcut: 'Ctrl+F1', action: 'help-topic-search' },
        { label: 'Previous Topic', shortcut: 'Alt+F1', action: 'help-previous' },
        { separator: true },
        { label: 'Keyboard', shortcut: '', action: 'help-keyboard' },
        { label: 'Using Help', shortcut: '', action: 'help-using-help' },
        { separator: true },
        { label: 'About...', shortcut: '', action: 'help-about' }
      ]
    }
  ];

  menuBar.innerHTML = '';
  
  turboMenus.forEach(menu => {
    const menuItem = document.createElement('div');
    menuItem.className = 'turbo-menu-item';
    menuItem.setAttribute('data-menu', menu.label);
    
    const menuLabel = document.createElement('span');
    menuLabel.className = 'turbo-menu-label';
    
    // Add hotkey highlighting to menu label
    if (menu.hotkey) {
      const hotkeyIndex = menu.label.toLowerCase().indexOf(menu.hotkey.toLowerCase());
      if (hotkeyIndex !== -1) {
        const beforeHotkey = menu.label.substring(0, hotkeyIndex);
        const hotkey = menu.label.substring(hotkeyIndex, hotkeyIndex + 1);
        const afterHotkey = menu.label.substring(hotkeyIndex + 1);
        menuLabel.innerHTML = `${beforeHotkey}<span class="turbo-menu-hotkey">${hotkey}</span>${afterHotkey}`;
      } else {
        menuLabel.textContent = menu.label;
      }
    } else {
      menuLabel.textContent = menu.label;
    }
    
    const dropdown = document.createElement('div');
    dropdown.className = 'turbo-dropdown';
    
    menu.items.forEach(item => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.className = 'turbo-menu-separator';
        dropdown.appendChild(separator);
      } else {
        const dropdownItem = document.createElement('div');
        dropdownItem.className = 'turbo-dropdown-item';
        
        // Add hotkey highlighting to dropdown items
        let labelHTML = item.label;
        if (item.hotkey) {
          const hotkeyIndex = item.label.toLowerCase().indexOf(item.hotkey.toLowerCase());
          if (hotkeyIndex !== -1) {
            const beforeHotkey = item.label.substring(0, hotkeyIndex);
            const hotkey = item.label.substring(hotkeyIndex, hotkeyIndex + 1);
            const afterHotkey = item.label.substring(hotkeyIndex + 1);
            labelHTML = `${beforeHotkey}<span class="turbo-dropdown-hotkey">${hotkey}</span>${afterHotkey}`;
          }
        }
        
        dropdownItem.innerHTML = `
          <span>${labelHTML}</span>
          ${item.shortcut ? `<span class="turbo-dropdown-shortcut">${item.shortcut}</span>` : ''}
        `;
        
        dropdownItem.addEventListener('click', () => {
          handleMenuAction(item.action, item);
          // Close menu after click
          menuItem.classList.remove('active');
        });
        
        dropdown.appendChild(dropdownItem);
      }
    });
    
    // Close menu when clicking outside
    menuLabel.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu(menu.label);
    });
    
    menuItem.appendChild(menuLabel);
    menuItem.appendChild(dropdown);
    menuBar.appendChild(menuItem);
  });
  
  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.turbo-menu-item')) {
      document.querySelectorAll('.turbo-menu-item.active').forEach(item => {
        item.classList.remove('active');
      });
    }
  });
}

// Handle menu actions
function handleMenuAction(action, item) {
  console.log(`Menu action: ${action}`, item);
  
  switch (action) {
    case 'file-new':
      createNewFile();
      break;
    case 'file-open':
      showProjectDialog();
      break;
    case 'file-exit':
      if (confirm('Exit Turbo Vision IDE?')) {
        window.close();
      }
      break;
    case 'window-cascade':
      windowManager.cascadeWindows();
      break;
    case 'window-tile':
      windowManager.tileHorizontally();
      break;
    case 'window-close-all':
      if (confirm('Close all windows?')) {
        windowManager.closeAllWindows();
      }
      break;
    case 'help-about':
      showAboutDialog();
      break;
    case 'tools-calculator':
      showCalculator();
      break;
    case 'tools-ascii-table':
      showAsciiTable();
      break;
    
    // Projects menu actions
    case 'projects-welcome':
      showWelcomeWindow();
      break;
    case 'project-div':
      openProjectWithReadme('divengine', 'div');
      break;
    case 'project-ajaxmap':
      openProjectWithReadme('divengine', 'ajaxmap');
      break;
    case 'project-nodes':
      openProjectWithReadme('divengine', 'nodes');
      break;
    case 'project-ways':
      openProjectWithReadme('divengine', 'ways');
      break;
    case 'project-orm':
      openProjectWithReadme('divengine', 'orm');
      break;
    case 'project-functions':
      openProjectWithReadme('divengine', 'functions');
      break;
    case 'project-matrix':
      openProjectWithReadme('divengine', 'matrix');
      break;
    case 'projects-refresh':
      window.location.reload();
      break;
    
    // View menu actions
    case 'view-dashboard':
      showDashboard();
      break;
    case 'view-repo-list':
      showRepositoryList();
      break;
    case 'view-github-stats':
      showGitHubStats();
      break;
    case 'view-issues':
      showIssuesTracker();
      break;
    case 'view-releases':
      showReleases();
      break;
    
    // Code menu actions
    case 'code-browse':
      showCodeBrowser();
      break;
    case 'code-docs':
      showDocumentation();
      break;
    case 'code-search':
      showSearchInFiles();
      break;
    
    // GitHub menu actions
    case 'github-open-repo':
      showRepositoryDialog();
      break;
    case 'github-commits':
      showCommitsViewer();
      break;
    case 'github-pullrequests':
      showPullRequestsViewer();
      break;
    case 'github-issues':
      showIssuesViewer();
      break;
    case 'github-contributors':
      showContributors();
      break;
    
    // Tools menu actions
    case 'tools-packages':
      showPackageManager();
      break;
    case 'tools-dependencies':
      showDependencies();
      break;
    case 'tools-api-explorer':
      showAPIExplorer();
      break;
    case 'tools-code-generator':
      showCodeGenerator();
      break;
    
    // Settings menu actions
    case 'settings-preferences':
      showPreferences();
      break;
    case 'settings-token':
      showGitHubTokenDialog();
      break;
    case 'settings-display':
      showDisplayOptions();
      break;
    
    // Help menu actions  
    case 'help-docs':
      window.open('https://github.com/divengine/divengine.github.io/wiki', '_blank');
      break;
    case 'help-github':
      window.open('https://github.com/divengine', '_blank');
      break;
    case 'help-issues':
      window.open('https://github.com/divengine/divengine.github.io/issues', '_blank');
      break;
    case 'help-discussions':
      window.open('https://github.com/divengine/divengine.github.io/discussions', '_blank');
      break;
    case 'help-shortcuts':
      showKeyboardShortcuts();
      break;
    
    default:
      showNotImplementedDialog(item.label);
      break;
  }
}

// Show welcome window on startup
function showWelcomeWindow() {
  const welcomeContent = `
    <div style="padding: 20px; text-align: center; font-family: var(--tv-font-system);">
      <h2 style="color: var(--tv-blue-dark); margin-bottom: 20px;">🔵 Welcome to Turbo Vision IDE</h2>
      <p style="margin-bottom: 16px;">Modern development environment inspired by Turbo Pascal</p>
      <p style="margin-bottom: 20px; font-size: 12px; color: #666;">
        Created by <strong>Divengine Software Solutions</strong><br>
        Copyright © 2025 - All Rights Reserved
      </p>
      
      <div style="display: flex; flex-direction: column; gap: 8px; max-width: 300px; margin: 0 auto;">
        <button class="turbo-button" onclick="turboIDE.createNewFile()">📝 New File</button>
        <button class="turbo-button" onclick="turboIDE.showProjectDialog()">📂 Open Project</button>
        <button class="turbo-button" onclick="turboIDE.showAboutDialog()">ℹ️ About</button>
      </div>
      
      <div style="margin-top: 20px; padding: 10px; background: var(--tv-blue-dark); color: white; border-radius: 4px;">
        <strong>Quick Start:</strong><br>
        Use <kbd>F10</kbd> to access menus<br>
        Use <kbd>F3</kbd> to open files<br>
        Use <kbd>F9</kbd> to build projects
      </div>
    </div>
  `;
  
  windowManager.createWindow({
    title: 'Welcome - Turbo Vision IDE',
    content: welcomeContent,
    width: 480,
    height: 400,
    x: 100,
    y: 100,
    type: 'document'
  });
}

// Create a new file window
function createNewFile() {
  const editorContent = `
    <div style="height: 100%; display: flex; flex-direction: column;">
      <div style="background: #f0f0f0; padding: 4px 8px; border-bottom: 1px solid #ccc; font-size: 12px;">
        <strong>NONAME.PAS</strong> - New Pascal Unit
      </div>
      <textarea style="flex: 1; border: none; padding: 8px; font-family: var(--tv-font-system); font-size: 14px; background: var(--tv-blue-dark); color: var(--tv-white);" placeholder="{ New Pascal Unit }
unit NoName;

interface

implementation

end."></textarea>
    </div>
  `;
  
  windowManager.createWindow({
    title: 'NONAME.PAS',
    content: editorContent,
    width: 600,
    height: 400,
    type: 'editor'
  });
}

// Show project selection dialog
function showProjectDialog() {
  if (!config || !config.projects) {
    showErrorDialog('Error', 'No projects configuration found');
    return;
  }
  
  const projects = config.projects || [];
  const projectList = projects.map(project => 
    `<div class="turbo-button" style="margin: 4px 0; text-align: left; width: 100%;" onclick="turboIDE.openProject('${project.slug}')">
      📁 ${project.name || project.slug}
    </div>`
  ).join('');
  
  const dialogContent = `
    <div style="padding: 16px;">
      <h3 style="margin-bottom: 16px;">Open Project</h3>
      <div style="max-height: 300px; overflow-y: auto;">
        ${projectList}
      </div>
    </div>
  `;
  
  showDialog('Open Project', dialogContent);
}

// Open a specific project
// Open project with README from GitHub
async function openProjectWithReadme(owner, repo) {
  try {
    // Close any existing dialogs
    document.querySelectorAll('.turbo-dialog').forEach(d => d.remove());
    
    // Create project window using the correct API
    const windowId = windowManager.createWindow({
      title: `📁 ${repo}`,
      width: 700,
      height: 500,
      content: `
        <div style="padding: 20px;">
          <h3 style="color: var(--tv-blue-dark); margin: 0 0 15px 0;">Loading ${repo}...</h3>
          <div class="tv-loading">
            <div style="background: var(--tv-gray-light); padding: 10px; text-align: center; border: 1px inset var(--tv-white);">
              <span style="color: var(--tv-blue-dark);">📡 Fetching repository data and README...</span>
            </div>
          </div>
        </div>
      `
    });
    
    // Get the actual DOM element
    const projectWindow = document.getElementById(windowId);
    const content = projectWindow.querySelector('.turbo-window-content');
    
    // Fetch repository metadata and README in parallel
    const [repoMeta, readmeData] = await Promise.all([
      fetchRepoMeta(owner, repo),
      fetchReadmeSimple(owner, repo)
    ]);
    
    // Extract repo data from the meta response
    const repoData = repoMeta?.data || {};
    
    // Display project data with README
    displayProjectWithReadme(content, repoData, readmeData, owner, repo);
    
  } catch (error) {
    console.error('Failed to open project:', error);
    showErrorDialog('Project Error', `Failed to open project: ${error.message}`);
  }
}

// Display project data with README
function displayProjectWithReadme(content, repoData, readmeData, owner, repo) {
  const readmeHTML = readmeData ? markdownToHTML(readmeData) : '<p><em>No README found</em></p>';
  
  content.innerHTML = `
    <div style="height: 100%; display: flex; flex-direction: column;">
      <!-- Project Header -->
      <div style="background: var(--tv-cyan); color: var(--tv-blue-dark); padding: 8px; margin-bottom: 10px; border: 1px solid var(--tv-blue-dark);">
        <h3 style="margin: 0; font-size: 14px;">
          📦 ${repoData?.name || repo}
          ${repoData?.private ? ' 🔒' : ' 🌐'}
        </h3>
        <div style="font-size: 11px; margin-top: 4px;">
          <span>⭐ ${repoData?.stargazers_count || 0}</span>
          <span style="margin-left: 12px;">🍴 ${repoData?.forks_count || 0}</span>
          <span style="margin-left: 12px;">📅 ${repoData?.updated_at ? new Date(repoData.updated_at).toLocaleDateString() : 'Unknown'}</span>
          ${repoData?.language ? `<span style="margin-left: 12px;">🏷️ ${repoData.language}</span>` : ''}
        </div>
      </div>
      
      <!-- Project Description -->
      ${repoData?.description ? `
        <div style="background: var(--tv-white); padding: 8px; margin-bottom: 10px; border: 1px inset var(--tv-white); font-style: italic;">
          ${repoData.description}
        </div>
      ` : ''}
      
      <!-- README Content -->
      <div style="flex: 1; overflow: auto; background: var(--tv-white); border: 2px inset var(--tv-white); padding: 12px;">
        <div style="font-family: 'Courier New', monospace; font-size: 12px; line-height: 1.4;">
          ${readmeHTML}
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div style="margin-top: 10px; text-align: center;">
        <button class="turbo-button" onclick="window.open('https://github.com/${owner}/${repo}', '_blank')" style="margin-right: 8px;">
          🌐 View on GitHub
        </button>
        <button class="turbo-button" onclick="handleMenuAction('code-browse', {repo: '${repo}', owner: '${owner}'})" style="margin-right: 8px;">
          📁 Browse Code
        </button>
        <button class="turbo-button" onclick="handleMenuAction('github-issues', {repo: '${repo}', owner: '${owner}'})">
          🐛 Issues
        </button>
      </div>
    </div>
  `;
}

async function openProject(repoFullName) {
  try {
    // Handle both old format (slug) and new format (owner/repo)
    let owner, repo;
    if (repoFullName.includes('/')) {
      [owner, repo] = repoFullName.split('/');
    } else {
      // Legacy support for slug format
      const project = config.projects?.find(p => p.slug === repoFullName);
      if (project) {
        owner = config.data?.github?.owner || 'divengine';
        repo = project.repo || repoFullName;
      } else {
        owner = 'divengine';
        repo = repoFullName;
      }
    }
    
    // Use the new function with README
    await openProjectWithReadme(owner, repo);
    
  } catch (error) {
    console.error('Failed to open project:', error);
    showErrorDialog('Project Error', `Failed to open project: ${error.message}`);
  }
}

// Show about dialog
function showAboutDialog() {
  const aboutContent = `
    <div style="text-align: center; padding: 20px;">
      <h2 style="color: var(--tv-blue-dark); margin-bottom: 16px;">🔵 Turbo Vision IDE</h2>
      <p style="margin-bottom: 8px;"><strong>Version 2.0</strong></p>
      <p style="margin-bottom: 16px;">Modern Web Development Environment</p>
      <p style="margin-bottom: 8px;">Created by</p>
      <p style="margin-bottom: 16px;"><strong>Divengine Software Solutions</strong></p>
      <p style="margin-bottom: 16px; font-size: 12px;">Copyright © 2025 - All Rights Reserved</p>
      <div style="border-top: 1px solid #ccc; padding-top: 16px; margin-top: 16px;">
        <p style="font-size: 12px; color: #666;">
          Inspired by Borland Turbo Pascal IDE<br>
          Built with modern web technologies
        </p>
      </div>
    </div>
  `;
  
  showDialog('About Turbo Vision IDE', aboutContent, [
    { label: 'OK', action: 'close', default: true }
  ]);
}

// Show calculator
function showCalculator() {
  const calcContent = `
    <div style="padding: 16px;">
      <div style="margin-bottom: 16px;">
        <input type="text" class="turbo-input" style="width: 100%; text-align: right; font-family: monospace;" id="calc-display" value="0" readonly>
      </div>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;">
        <button class="turbo-button" onclick="turboIDE.calcClear()">C</button>
        <button class="turbo-button" onclick="turboIDE.calcBackspace()">←</button>
        <button class="turbo-button" onclick="turboIDE.calcOperation('/')">/</button>
        <button class="turbo-button" onclick="turboIDE.calcOperation('*')">*</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('7')">7</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('8')">8</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('9')">9</button>
        <button class="turbo-button" onclick="turboIDE.calcOperation('-')">-</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('4')">4</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('5')">5</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('6')">6</button>
        <button class="turbo-button" onclick="turboIDE.calcOperation('+')">+</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('1')">1</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('2')">2</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('3')">3</button>
        <button class="turbo-button" onclick="turboIDE.calcEquals()" style="grid-row: span 2;">=</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('0')" style="grid-column: span 2;">0</button>
        <button class="turbo-button" onclick="turboIDE.calcNumber('.')">.</button>
      </div>
    </div>
  `;
  
  windowManager.createWindow({
    title: 'Calculator',
    content: calcContent,
    width: 240,
    height: 300,
    resizable: false
  });
}

// Show ASCII table
function showAsciiTable() {
  let tableContent = '<table style="border-collapse: collapse; font-family: monospace; font-size: 12px;">';
  tableContent += '<tr><th>Dec</th><th>Hex</th><th>Char</th><th>Dec</th><th>Hex</th><th>Char</th></tr>';
  
  for (let i = 0; i < 128; i += 2) {
    const char1 = i < 32 ? '·' : String.fromCharCode(i);
    const char2 = i + 1 < 32 ? '·' : String.fromCharCode(i + 1);
    
    tableContent += `
      <tr>
        <td style="padding: 2px 8px; border: 1px solid #ccc;">${i}</td>
        <td style="padding: 2px 8px; border: 1px solid #ccc;">${i.toString(16).toUpperCase()}</td>
        <td style="padding: 2px 8px; border: 1px solid #ccc;">${char1}</td>
        <td style="padding: 2px 8px; border: 1px solid #ccc;">${i + 1}</td>
        <td style="padding: 2px 8px; border: 1px solid #ccc;">${(i + 1).toString(16).toUpperCase()}</td>
        <td style="padding: 2px 8px; border: 1px solid #ccc;">${char2}</td>
      </tr>
    `;
  }
  
  tableContent += '</table>';
  
  windowManager.createWindow({
    title: 'ASCII Table',
    content: `<div style="padding: 16px; overflow: auto;">${tableContent}</div>`,
    width: 400,
    height: 500
  });
}

// Generic dialog function
function showDialog(title, content, buttons = [{ label: 'OK', action: 'close', default: true }]) {
  const dialog = document.createElement('div');
  dialog.className = 'turbo-dialog tv-glow';
  
  const buttonsHtml = buttons.map(btn => 
    `<button class="turbo-button ${btn.default ? 'default' : ''}" onclick="turboIDE.closeDialog()">${btn.label}</button>`
  ).join('');
  
  dialog.innerHTML = `
    <div class="turbo-dialog-title">${title}</div>
    <div class="turbo-dialog-content">${content}</div>
    <div class="turbo-dialog-buttons">${buttonsHtml}</div>
  `;
  
  document.body.appendChild(dialog);
  
  // Auto focus first button
  setTimeout(() => {
    const firstButton = dialog.querySelector('.turbo-button');
    if (firstButton) firstButton.focus();
  }, 100);
}

function showErrorDialog(title, message) {
  showDialog(title, `<p style="color: var(--tv-red);">❌ ${message}</p>`);
}

function showNotImplementedDialog(feature) {
  showDialog('Not Implemented', `<p>The feature "<strong>${feature}</strong>" is not yet implemented.</p>`);
}

function closeDialog() {
  document.querySelectorAll('.turbo-dialog').forEach(d => d.remove());
}

// Initialize status bar
function initStatusBar() {
  // Clock is already handled by window manager
  // Add any additional status bar initialization here
}

// Calculator functions
let calcState = { display: '0', operation: null, operand: null, waitingForNewNumber: false };

function calcNumber(num) {
  const display = document.getElementById('calc-display');
  if (calcState.waitingForNewNumber) {
    calcState.display = num;
    calcState.waitingForNewNumber = false;
  } else {
    calcState.display = calcState.display === '0' ? num : calcState.display + num;
  }
  display.value = calcState.display;
}

function calcOperation(op) {
  if (calcState.operation && !calcState.waitingForNewNumber) {
    calcEquals();
  }
  calcState.operation = op;
  calcState.operand = parseFloat(calcState.display);
  calcState.waitingForNewNumber = true;
}

function calcEquals() {
  if (calcState.operation && calcState.operand !== null) {
    const current = parseFloat(calcState.display);
    let result;
    
    switch (calcState.operation) {
      case '+': result = calcState.operand + current; break;
      case '-': result = calcState.operand - current; break;
      case '*': result = calcState.operand * current; break;
      case '/': result = calcState.operand / current; break;
      default: return;
    }
    
    calcState.display = result.toString();
    calcState.operation = null;
    calcState.operand = null;
    calcState.waitingForNewNumber = true;
    
    const display = document.getElementById('calc-display');
    display.value = calcState.display;
  }
}

function calcClear() {
  calcState = { display: '0', operation: null, operand: null, waitingForNewNumber: false };
  const display = document.getElementById('calc-display');
  display.value = '0';
}

function calcBackspace() {
  if (calcState.display.length > 1) {
    calcState.display = calcState.display.slice(0, -1);
  } else {
    calcState.display = '0';
  }
  const display = document.getElementById('calc-display');
  display.value = calcState.display;
}

// Project management functions
function showAllProjects() {
  const allProjectsWindow = createTurboWindow('📂 All Divengine Projects', 700, 500);
  const content = allProjectsWindow.querySelector('.turbo-window-content');
  
  const projects = [
    { name: 'div', description: 'Core PHP framework and engine', stars: '⭐', language: 'PHP' },
    { name: 'ajaxmap', description: 'Interactive mapping components', stars: '⭐', language: 'JavaScript' },
    { name: 'nodes', description: 'Node management system', stars: '⭐', language: 'PHP' },
    { name: 'ways', description: 'Routing and path management', stars: '⭐', language: 'PHP' },
    { name: 'orm', description: 'Object-Relational Mapping', stars: '⭐', language: 'PHP' },
    { name: 'functions', description: 'Utility function library', stars: '⭐', language: 'PHP' },
    { name: 'matrix', description: 'Matrix operations and calculations', stars: '⭐', language: 'PHP' }
  ];
  
  let projectsHtml = `
    <div style="padding: 20px;">
      <h3 style="color: var(--tv-blue-dark); margin: 0 0 20px 0;">🌟 Divengine Project Portfolio</h3>
      <div style="display: grid; gap: 10px;">
  `;
  
  projects.forEach(project => {
    projectsHtml += `
      <div class="tv-button-group" style="display: flex; align-items: center; padding: 8px; border: 1px solid var(--tv-gray-light); background: var(--tv-gray-lightest);">
        <div style="flex: 1;">
          <strong style="color: var(--tv-blue-dark);">${project.name}</strong>
          <small style="margin-left: 10px; color: var(--tv-gray-dark);">[${project.language}]</small>
          <br>
          <span style="font-size: 12px; color: #666;">${project.description}</span>
        </div>
        <button onclick="openProject('divengine/${project.name}')" class="tv-button">Open</button>
      </div>
    `;
  });
  
  projectsHtml += `
      </div>
      <div style="margin-top: 20px; padding: 10px; background: var(--tv-pattern-dots); text-align: center;">
        <small style="color: var(--tv-blue-dark);">Visit <a href="https://github.com/divengine" target="_blank">github.com/divengine</a> for complete source code</small>
      </div>
    </div>
  `;
  
  content.innerHTML = projectsHtml;
}

async function fetchRepositoryData(repoFullName) {
  const response = await fetch(`https://api.github.com/repos/${repoFullName}`);
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }
  return response.json();
}

function displayProjectData(content, data) {
  content.innerHTML = `
    <div style="padding: 20px;">
      <h3 style="color: var(--tv-blue-dark); margin: 0 0 15px 0;">📁 ${data.name}</h3>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div class="tv-panel" style="padding: 15px; border: 1px solid var(--tv-gray-light); background: var(--tv-gray-lightest);">
          <h4 style="margin: 0 0 10px 0; color: var(--tv-blue-dark);">📊 Statistics</h4>
          <div style="font-size: 12px; line-height: 1.4;">
            <div>⭐ Stars: <strong>${data.stargazers_count}</strong></div>
            <div>🍴 Forks: <strong>${data.forks_count}</strong></div>
            <div>👀 Watchers: <strong>${data.watchers_count}</strong></div>
            <div>📝 Language: <strong>${data.language || 'Mixed'}</strong></div>
            <div>📦 Size: <strong>${(data.size / 1024).toFixed(1)} MB</strong></div>
          </div>
        </div>
        
        <div class="tv-panel" style="padding: 15px; border: 1px solid var(--tv-gray-light); background: var(--tv-gray-lightest);">
          <h4 style="margin: 0 0 10px 0; color: var(--tv-blue-dark);">🔗 Quick Actions</h4>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <button onclick="window.open('${data.html_url}', '_blank')" class="tv-button" style="text-align: left;">🌐 View on GitHub</button>
            <button onclick="window.open('${data.clone_url}', '_blank')" class="tv-button" style="text-align: left;">📥 Clone Repository</button>
            ${data.homepage ? `<button onclick="window.open('${data.homepage}', '_blank')" class="tv-button" style="text-align: left;">🏠 Project Homepage</button>` : ''}
          </div>
        </div>
      </div>
      
      <div class="tv-panel" style="padding: 15px; border: 1px solid var(--tv-gray-light); background: var(--tv-gray-lightest);">
        <h4 style="margin: 0 0 10px 0; color: var(--tv-blue-dark);">📋 Description</h4>
        <p style="margin: 0; font-size: 12px; line-height: 1.4;">${data.description || 'No description available.'}</p>
        
        ${data.topics && data.topics.length > 0 ? `
          <div style="margin-top: 10px;">
            <strong style="font-size: 11px; color: var(--tv-gray-dark);">Topics:</strong>
            <div style="margin-top: 5px;">
              ${data.topics.map(topic => `<span style="background: var(--tv-blue-light); color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px; margin-right: 5px;">${topic}</span>`).join('')}
            </div>
          </div>
        ` : ''}
        
        <div style="margin-top: 15px; font-size: 11px; color: var(--tv-gray-dark);">
          <div>Created: ${new Date(data.created_at).toLocaleDateString()}</div>
          <div>Last Updated: ${new Date(data.updated_at).toLocaleDateString()}</div>
          ${data.license ? `<div>License: ${data.license.name}</div>` : ''}
        </div>
      </div>
    </div>
  `;
}

// Dashboard function
function showDashboard() {
  const dashboardWindow = createTurboWindow('📊 Divengine Dashboard', 800, 600);
  const content = dashboardWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🌟 Divengine Software Solutions</h1>
    <p>*Welcome to the Divengine Project Hub*</p>
    
    <h2>📈 Project Statistics</h2>
    <ul>
      <li>Total Projects: *7 active repositories*</li>
      <li>Primary Language: *PHP* (85%)</li>
      <li>Secondary Language: *JavaScript* (15%)</li>
      <li>Total Stars: *Loading...*</li>
      <li>Total Commits: *Loading...*</li>
    </ul>
    
    <h2>🚀 Recent Activity</h2>
    <ul>
      <li>Updated /div/ framework core</li>
      <li>Enhanced /orm/ query builder</li>
      <li>Fixed /nodes/ routing system</li>
      <li>Optimized /matrix/ calculations</li>
    </ul>
    
    <h2>🔗 Quick Links</h2>
    <p>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine', '_blank')">GitHub Organization</button>
      <button class="turbo-button" onclick="showAllProjects()">Browse Projects</button>
      <button class="turbo-button" onclick="showDocumentation()">Documentation</button>
    </p>
  `;
}

// Repository List function  
function showRepositoryList() {
  const repoWindow = createTurboWindow('📋 Repository List', 700, 500);
  const content = repoWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>📂 Divengine Repositories</h1>
    
    <h2>Core Framework</h2>
    <ul>
      <li><button class="turbo-button" onclick="openProject('divengine/div')">div</button> - Main framework engine</li>
      <li><button class="turbo-button" onclick="openProject('divengine/orm')">orm</button> - Database abstraction layer</li>
      <li><button class="turbo-button" onclick="openProject('divengine/functions')">functions</button> - Utility library</li>
    </ul>
    
    <h2>Components</h2>
    <ul>
      <li><button class="turbo-button" onclick="openProject('divengine/nodes')">nodes</button> - Node management system</li>
      <li><button class="turbo-button" onclick="openProject('divengine/ways')">ways</button> - Routing framework</li>
      <li><button class="turbo-button" onclick="openProject('divengine/ajaxmap')">ajaxmap</button> - Interactive mapping</li>
      <li><button class="turbo-button" onclick="openProject('divengine/matrix')">matrix</button> - Mathematical operations</li>
    </ul>
    
    <p><i>Click any repository name to view details</i></p>
  `;
}

// GitHub Stats function
function showGitHubStats() {
  const statsWindowId = windowManager.createWindow({
    title: '📊 GitHub Statistics',
    width: 600,
    height: 450
  });
  const statsWindow = document.getElementById(statsWindowId);
  const content = statsWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>📊 GitHub Statistics</h1>
    
    <h2>Organization Overview</h2>
    <ul>
      <li>Organization: *divengine*</li>
      <li>Public Repositories: *7*</li>
      <li>Primary Language: *PHP*</li>
      <li>Founded: *2018*</li>
    </ul>
    
    <h2>Top Repositories by Stars</h2>
    <ol>
      <li>div - Core Framework</li>
      <li>orm - Database Layer</li>
      <li>ajaxmap - Interactive Maps</li>
      <li>nodes - Node System</li>
      <li>ways - Routing</li>
    </ol>
    
    <h2>Development Activity</h2>
    <ul>
      <li>Most Active: *div* repository</li>
      <li>Recent Updates: *All projects*</li>
      <li>Issues Status: *Actively maintained*</li>
    </ul>
    
    <p>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine', '_blank')">View on GitHub</button>
    </p>
  `;
}

// Code Browser function
function showCodeBrowser() {
  const codeWindow = createTurboWindow('🔍 Code Browser', 700, 500);
  const content = codeWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🔍 Code Browser</h1>
    
    <h2>Browse by Project</h2>
    <ul>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/div/tree/main/src', '_blank')">div/src/</button> - Framework source</li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/orm/tree/main/src', '_blank')">orm/src/</button> - ORM classes</li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/functions/tree/main/src', '_blank')">functions/src/</button> - Utility functions</li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/nodes/tree/main/src', '_blank')">nodes/src/</button> - Node management</li>
    </ul>
    
    <h2>Quick Search</h2>
    <input type="text" placeholder="Search across all repositories..." style="width: 100%; margin: 10px 0;">
    <button class="turbo-button">Search Code</button>
    
    <h2>Recent Files</h2>
    <ul>
      <li>div/src/Div.php - *Main engine class*</li>
      <li>orm/src/Query.php - *Query builder*</li>
      <li>nodes/src/Node.php - *Node base class*</li>
    </ul>
  `;
}

// Documentation function
function showDocumentation() {
  const docWindow = createTurboWindow('📚 Documentation', 700, 500);
  const content = docWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>📚 Divengine Documentation</h1>
    
    <h2>Getting Started</h2>
    <ul>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/div#readme', '_blank')">Installation Guide</button></li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/div/wiki/Quick-Start', '_blank')">Quick Start Tutorial</button></li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/div/wiki/Configuration', '_blank')">Configuration</button></li>
    </ul>
    
    <h2>Framework Components</h2>
    <ul>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/div/wiki/Core', '_blank')">Core Framework (div)</button></li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/orm/wiki', '_blank')">ORM Documentation</button></li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/nodes/wiki', '_blank')">Node System</button></li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/ways/wiki', '_blank')">Routing System</button></li>
    </ul>
    
    <h2>API Reference</h2>
    <ul>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/functions/wiki/API', '_blank')">Functions API</button></li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/matrix/wiki/API', '_blank')">Matrix API</button></li>
      <li><button class="turbo-button" onclick="window.open('https://github.com/divengine/ajaxmap/wiki/API', '_blank')">AjaxMap API</button></li>
    </ul>
    
    <p><i>All documentation is maintained in GitHub Wiki pages</i></p>
  `;
}

// Package Manager function
function showPackageManager() {
  const packageWindow = createTurboWindow('📦 Package Manager', 600, 450);
  const content = packageWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>📦 Divengine Package Manager</h1>
    
    <h2>Installed Packages</h2>
    <ul>
      <li>✅ divengine/div *v2.1.0* - Core framework</li>
      <li>✅ divengine/orm *v1.5.2* - Database layer</li>
      <li>✅ divengine/functions *v1.3.1* - Utilities</li>
      <li>✅ divengine/nodes *v1.2.0* - Node system</li>
    </ul>
    
    <h2>Available Updates</h2>
    <ul>
      <li>🔄 divengine/ways *v1.1.0 → v1.2.0*</li>
      <li>🔄 divengine/matrix *v1.0.5 → v1.1.0*</li>
    </ul>
    
    <h2>Package Actions</h2>
    <p>
      <button class="turbo-button">Update All</button>
      <button class="turbo-button">Install New</button>
      <button class="turbo-button">Remove Package</button>
    </p>
    
    <h2>Installation Commands</h2>
    <p>Use Composer to install Divengine packages:</p>
    <code>composer require divengine/div</code><br>
    <code>composer require divengine/orm</code>
  `;
}

// Keyboard Shortcuts function
function showKeyboardShortcuts() {
  const shortcutsWindow = createTurboWindow('⌨️ Keyboard Shortcuts', 500, 400);
  const content = shortcutsWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>⌨️ Keyboard Shortcuts</h1>
    
    <h2>File Operations</h2>
    <ul>
      <li>*Ctrl+N* - New File</li>
      <li>*Ctrl+O* - Open Project</li>
      <li>*Ctrl+S* - Save File</li>
      <li>*Alt+F4* - Exit Application</li>
    </ul>
    
    <h2>View Operations</h2>
    <ul>
      <li>*Ctrl+D* - Dashboard</li>
      <li>*Ctrl+L* - Repository List</li>
      <li>*F5* - Refresh View</li>
    </ul>
    
    <h2>Code Operations</h2>
    <ul>
      <li>*Ctrl+B* - Browse Source</li>
      <li>*Ctrl+F* - Search in Files</li>
      <li>*Ctrl+H* - Documentation</li>
      <li>*F12* - Go to Definition</li>
    </ul>
    
    <h2>Window Operations</h2>
    <ul>
      <li>*F6* - Next Window</li>
      <li>*Shift+F6* - Previous Window</li>
      <li>*Alt+F3* - Close Window</li>
      <li>*F5* - Zoom Window</li>
    </ul>
    
    <h2>Tools</h2>
    <ul>
      <li>*F1* - Help Documentation</li>
      <li>*F11* - Messages Window</li>
    </ul>
  `;
}

// Preferences function
function showPreferences() {
  const prefWindow = createTurboWindow('⚙️ Preferences', 550, 450);
  const content = prefWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>⚙️ Preferences</h1>
    
    <h2>Display Settings</h2>
    <fieldset>
      <legend>Theme</legend>
      <ul>
        <li><input type="radio" id="theme1" name="theme" checked><label for="theme1">Classic Turbo Vision</label></li>
        <li><input type="radio" id="theme2" name="theme"><label for="theme2">Dark Mode</label></li>
        <li><input type="radio" id="theme3" name="theme"><label for="theme3">Light Mode</label></li>
      </ul>
    </fieldset>
    
    <h2>Font Settings</h2>
    <ul>
      <li>Font Family: <select><option>System</option><option>Courier New</option><option>Monaco</option></select></li>
      <li>Font Size: <select><option>9pt</option><option selected>10pt</option><option>11pt</option><option>12pt</option></select></li>
    </ul>
    
    <h2>GitHub Integration</h2>
    <ul>
      <li>Auto-refresh: <input type="checkbox" checked> <label>Enable automatic data refresh</label></li>
      <li>Cache TTL: <input type="number" value="30" style="width: 60px;"> minutes</li>
    </ul>
    
    <h2>Window Behavior</h2>
    <ul>
      <li><input type="checkbox" checked> <label>Remember window positions</label></li>
      <li><input type="checkbox"> <label>Auto-cascade new windows</label></li>
      <li><input type="checkbox" checked> <label>Show window shadows</label></li>
    </ul>
    
    <p>
      <button class="turbo-button">Save Settings</button>
      <button class="turbo-button">Reset to Defaults</button>
    </p>
  `;
}

// Additional menu functions
function showIssuesTracker() {
  const issuesWindowId = windowManager.createWindow({
    title: '🐛 Issues Tracker',
    width: 650,
    height: 450
  });
  const issuesWindow = document.getElementById(issuesWindowId);
  const content = issuesWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🐛 Issues Tracker</h1>
    
    <h2>Open Issues Summary</h2>
    <ul>
      <li>divengine/div: *3 open issues*</li>
      <li>divengine/orm: *1 open issue*</li>
      <li>divengine/nodes: *2 open issues*</li>
      <li>divengine/ways: *0 open issues*</li>
    </ul>
    
    <h2>Recent Issues</h2>
    <ul>
      <li>#15 - Enhancement: Add caching layer to ORM</li>
      <li>#14 - Bug: Routing not working with special characters</li>
      <li>#13 - Feature: Add matrix multiplication optimization</li>
    </ul>
    
    <p>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine/div/issues', '_blank')">View All Issues</button>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine/div/issues/new', '_blank')">Report Issue</button>
    </p>
  `;
}

function showReleases() {
  const releasesWindow = createTurboWindow('🚀 Releases', 650, 450);
  const content = releasesWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🚀 Latest Releases</h1>
    
    <h2>divengine/div</h2>
    <ul>
      <li>*v2.1.0* - Enhanced routing system</li>
      <li>*v2.0.5* - Bug fixes and optimizations</li>
      <li>*v2.0.0* - Major version with breaking changes</li>
    </ul>
    
    <h2>divengine/orm</h2>
    <ul>
      <li>*v1.5.2* - Query optimization improvements</li>
      <li>*v1.5.0* - Added connection pooling</li>
    </ul>
    
    <h2>divengine/functions</h2>
    <ul>
      <li>*v1.3.1* - New utility functions added</li>
      <li>*v1.3.0* - Performance improvements</li>
    </ul>
    
    <p>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine/div/releases', '_blank')">View All Releases</button>
    </p>
  `;
}

function showSearchInFiles() {
  const searchWindow = createTurboWindow('🔍 Search in Files', 600, 400);
  const content = searchWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🔍 Search in Files</h1>
    
    <h2>Search Parameters</h2>
    <ul>
      <li>Search Text: <input type="text" placeholder="Enter search term..." style="width: 200px;"></li>
      <li>File Pattern: <input type="text" value="*.php" style="width: 100px;"></li>
      <li>Repository: <select>
        <option value="all">All Repositories</option>
        <option value="div">divengine/div</option>
        <option value="orm">divengine/orm</option>
        <option value="nodes">divengine/nodes</option>
      </select></li>
    </ul>
    
    <p>
      <button class="turbo-button">Search</button>
      <button class="turbo-button">Clear</button>
    </p>
    
    <h2>Recent Searches</h2>
    <ul>
      <li>"class Div" in *.php files</li>
      <li>"function query" in orm/*.php</li>
      <li>"route" in ways/*.php</li>
    </ul>
    
    <p><i>Use GitHub's advanced search for detailed results</i></p>
  `;
}

function showRepositoryDialog() {
  const repoDialog = createTurboWindow('📂 Open Repository', 500, 300);
  const content = repoDialog.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>📂 Open Repository</h1>
    
    <h2>Quick Access</h2>
    <ul>
      <li><button class="turbo-button" onclick="openProject('divengine/div')">divengine/div</button></li>
      <li><button class="turbo-button" onclick="openProject('divengine/orm')">divengine/orm</button></li>
      <li><button class="turbo-button" onclick="openProject('divengine/functions')">divengine/functions</button></li>
      <li><button class="turbo-button" onclick="openProject('divengine/nodes')">divengine/nodes</button></li>
    </ul>
    
    <h2>Custom Repository</h2>
    <p>
      Owner/Repo: <input type="text" placeholder="owner/repository" style="width: 200px;">
      <button class="turbo-button">Open</button>
    </p>
    
    <p><i>Enter any GitHub repository in owner/repo format</i></p>
  `;
}

function showCommitsViewer() {
  const commitsWindow = createTurboWindow('📝 Recent Commits', 700, 450);
  const content = commitsWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>📝 Recent Commits</h1>
    
    <h2>divengine/div</h2>
    <ul>
      <li>*feat: add new routing features* - 2 days ago</li>
      <li>*fix: resolve caching issues* - 1 week ago</li>
      <li>*docs: update README* - 2 weeks ago</li>
    </ul>
    
    <h2>divengine/orm</h2>
    <ul>
      <li>*perf: optimize query builder* - 3 days ago</li>
      <li>*feat: add connection pooling* - 1 week ago</li>
    </ul>
    
    <h2>divengine/nodes</h2>
    <ul>
      <li>*fix: node traversal bug* - 5 days ago</li>
      <li>*feat: add node validation* - 2 weeks ago</li>
    </ul>
    
    <p>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine/div/commits', '_blank')">View All Commits</button>
    </p>
  `;
}

function showPullRequestsViewer() {
  const prWindow = createTurboWindow('🔀 Pull Requests', 650, 400);
  const content = prWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🔀 Pull Requests</h1>
    
    <h2>Open Pull Requests</h2>
    <ul>
      <li>*#42* - Add new caching mechanism (divengine/div)</li>
      <li>*#15* - Improve error handling (divengine/orm)</li>
      <li>*#8* - Add unit tests (divengine/nodes)</li>
    </ul>
    
    <h2>Recently Merged</h2>
    <ul>
      <li>*#41* - Fix routing issues - *merged 2 days ago*</li>
      <li>*#14* - Add documentation - *merged 1 week ago*</li>
      <li>*#7* - Performance improvements - *merged 2 weeks ago*</li>
    </ul>
    
    <p>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine/div/pulls', '_blank')">View All PRs</button>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine/div/compare', '_blank')">Create PR</button>
    </p>
  `;
}

function showIssuesViewer() {
  const issuesWindow = createTurboWindow('🐛 Issues Viewer', 650, 450);
  const content = issuesWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🐛 All Issues</h1>
    
    <h2>High Priority</h2>
    <ul>
      <li>*#45* - Critical bug in routing system</li>
      <li>*#44* - Memory leak in ORM connections</li>
    </ul>
    
    <h2>Medium Priority</h2>
    <ul>
      <li>*#43* - Add support for custom validators</li>
      <li>*#42* - Improve documentation coverage</li>
      <li>*#41* - Add more unit tests</li>
    </ul>
    
    <h2>Low Priority</h2>
    <ul>
      <li>*#40* - Code style improvements</li>
      <li>*#39* - Add more examples</li>
    </ul>
    
    <p>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine/div/issues', '_blank')">View All Issues</button>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine/div/labels', '_blank')">Manage Labels</button>
    </p>
  `;
}

function showContributors() {
  const contributorsWindow = createTurboWindow('👥 Contributors', 550, 400);
  const content = contributorsWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>👥 Contributors</h1>
    
    <h2>Core Team</h2>
    <ul>
      <li>*@rafageist* - Project Lead & Main Developer</li>
      <li>*@divengine-team* - Core Contributors</li>
    </ul>
    
    <h2>Top Contributors by Commits</h2>
    <ol>
      <li>rafageist - *500+ commits*</li>
      <li>contributor2 - *50+ commits*</li>
      <li>contributor3 - *25+ commits*</li>
    </ol>
    
    <h2>Recent Contributors</h2>
    <ul>
      <li>Documentation improvements</li>
      <li>Bug fixes and patches</li>
      <li>Feature implementations</li>
    </ul>
    
    <h2>How to Contribute</h2>
    <ol>
      <li>Fork the repository</li>
      <li>Create a feature branch</li>
      <li>Make your changes</li>
      <li>Submit a pull request</li>
    </ol>
    
    <p>
      <button class="turbo-button" onclick="window.open('https://github.com/divengine/div/contributors', '_blank')">View All Contributors</button>
    </p>
  `;
}

function showDependencies() {
  const depsWindow = createTurboWindow('📊 Dependencies', 600, 450);
  const content = depsWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>📊 Project Dependencies</h1>
    
    <h2>divengine/div</h2>
    <ul>
      <li>php: *>=7.4*</li>
      <li>ext-json: *required*</li>
      <li>ext-mbstring: *required*</li>
    </ul>
    
    <h2>divengine/orm</h2>
    <ul>
      <li>php: *>=7.4*</li>
      <li>ext-pdo: *required*</li>
      <li>divengine/div: *^2.0*</li>
    </ul>
    
    <h2>Development Dependencies</h2>
    <ul>
      <li>phpunit/phpunit: *^9.0*</li>
      <li>squizlabs/php_codesniffer: *^3.5*</li>
      <li>phpstan/phpstan: *^0.12*</li>
    </ul>
    
    <h2>Dependency Analysis</h2>
    <ul>
      <li>Total Dependencies: *12*</li>
      <li>Security Issues: *0*</li>
      <li>Outdated Packages: *2*</li>
    </ul>
    
    <p>
      <button class="turbo-button">Update Dependencies</button>
      <button class="turbo-button">Security Scan</button>
    </p>
  `;
}

function showAPIExplorer() {
  const apiWindow = createTurboWindow('🔌 API Explorer', 700, 500);
  const content = apiWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🔌 API Explorer</h1>
    
    <h2>GitHub API Endpoints</h2>
    <ul>
      <li><button class="turbo-button" onclick="testAPI('repos')">GET /repos/divengine/div</button></li>
      <li><button class="turbo-button" onclick="testAPI('commits')">GET /repos/divengine/div/commits</button></li>
      <li><button class="turbo-button" onclick="testAPI('issues')">GET /repos/divengine/div/issues</button></li>
      <li><button class="turbo-button" onclick="testAPI('releases')">GET /repos/divengine/div/releases</button></li>
    </ul>
    
    <h2>Custom API Test</h2>
    <p>
      Endpoint: <input type="text" placeholder="/repos/owner/repo" style="width: 300px;">
      <button class="turbo-button">Test</button>
    </p>
    
    <h2>Response</h2>
    <textarea style="width: 100%; height: 200px; font-family: monospace;" placeholder="API response will appear here..."></textarea>
    
    <h2>Rate Limit Status</h2>
    <ul>
      <li>Remaining: *4500/5000*</li>
      <li>Reset: *in 45 minutes*</li>
    </ul>
  `;
}

function showCodeGenerator() {
  const codeWindow = createTurboWindow('⚡ Code Generator', 650, 500);
  const content = codeWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>⚡ Code Generator</h1>
    
    <h2>PHP Class Generator</h2>
    <ul>
      <li>Class Name: <input type="text" placeholder="MyClass" style="width: 150px;"></li>
      <li>Namespace: <input type="text" placeholder="App\\Models" style="width: 200px;"></li>
      <li>Extends: <input type="text" placeholder="BaseClass" style="width: 150px;"></li>
    </ul>
    <button class="turbo-button">Generate PHP Class</button>
    
    <h2>ORM Model Generator</h2>
    <ul>
      <li>Table Name: <input type="text" placeholder="users" style="width: 150px;"></li>
      <li>Model Name: <input type="text" placeholder="User" style="width: 150px;"></li>
    </ul>
    <button class="turbo-button">Generate ORM Model</button>
    
    <h2>API Controller Generator</h2>
    <ul>
      <li>Controller Name: <input type="text" placeholder="UserController" style="width: 200px;"></li>
      <li>Resource: <input type="text" placeholder="User" style="width: 150px;"></li>
    </ul>
    <button class="turbo-button">Generate Controller</button>
    
    <h2>Generated Code Preview</h2>
    <textarea style="width: 100%; height: 150px; font-family: monospace;" placeholder="Generated code will appear here..."></textarea>
    
    <p>
      <button class="turbo-button">Copy to Clipboard</button>
      <button class="turbo-button">Save to File</button>
    </p>
  `;
}

function showGitHubTokenDialog() {
  const tokenWindow = createTurboWindow('🔑 GitHub Token', 500, 300);
  const content = tokenWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🔑 GitHub Token Configuration</h1>
    
    <p>Enter your GitHub Personal Access Token to increase API rate limits and access private repositories.</p>
    
    <h2>Token Settings</h2>
    <ul>
      <li>Personal Access Token: <input type="password" placeholder="ghp_..." style="width: 200px;"></li>
      <li><input type="checkbox"> Remember token (stored locally)</li>
    </ul>
    
    <h2>Current Status</h2>
    <ul>
      <li>Authentication: *Not configured*</li>
      <li>Rate Limit: *60 requests/hour*</li>
      <li>Private Repos: *Not accessible*</li>
    </ul>
    
    <p>
      <button class="turbo-button">Save Token</button>
      <button class="turbo-button">Test Connection</button>
      <button class="turbo-button">Clear Token</button>
    </p>
    
    <p><i>Generate tokens at: https://github.com/settings/tokens</i></p>
  `;
}

function showDisplayOptions() {
  const displayWindow = createTurboWindow('🎨 Display Options', 550, 400);
  const content = displayWindow.querySelector('.turbo-window-content');
  
  content.innerHTML = `
    <h1>🎨 Display Options</h1>
    
    <h2>Color Scheme</h2>
    <fieldset>
      <legend>Theme</legend>
      <ul>
        <li><input type="radio" id="classic" name="theme" checked><label for="classic">Classic Turbo Vision</label></li>
        <li><input type="radio" id="modern" name="theme"><label for="modern">Modern Blue</label></li>
        <li><input type="radio" id="dark" name="theme"><label for="dark">Dark Theme</label></li>
      </ul>
    </fieldset>
    
    <h2>Window Effects</h2>
    <ul>
      <li><input type="checkbox" checked> <label>Show window shadows</label></li>
      <li><input type="checkbox" checked> <label>Enable window animations</label></li>
      <li><input type="checkbox"> <label>Transparent window titles</label></li>
    </ul>
    
    <h2>Layout Options</h2>
    <ul>
      <li>Default Window Size: <select><option>Small</option><option selected>Medium</option><option>Large</option></select></li>
      <li>Window Cascade Offset: <input type="range" min="10" max="50" value="30"> 30px</li>
    </ul>
    
    <h2>Background</h2>
    <ul>
      <li><input type="radio" name="bg" checked> <label>Classic Pattern</label></li>
      <li><input type="radio" name="bg"> <label>Solid Color</label></li>
      <li><input type="radio" name="bg"> <label>Custom Image</label></li>
    </ul>
    
    <p>
      <button class="turbo-button">Apply Changes</button>
      <button class="turbo-button">Preview</button>
      <button class="turbo-button">Reset</button>
    </p>
  `;
}

// Global API
window.turboIDE = {
  createNewFile,
  showProjectDialog,
  openProject,
  showAboutDialog,
  showCalculator,
  showAsciiTable,
  closeDialog,
  calcNumber,
  calcOperation,
  calcEquals,
  calcClear,
  calcBackspace,
  showAllProjects,
  fetchRepositoryData,
  displayProjectData
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTurboIDE);
} else {
  initTurboIDE();
}
