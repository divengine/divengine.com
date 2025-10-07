// Turbo Vision Window Manager
// Created by Divengine Software Solutions
// Copyright © 2025

export class TurboWindowManager {
  constructor() {
    this.windows = new Map();
    this.windowCounter = 0;
    this.cascadeOffset = { x: 0, y: 0 };
    this.activeWindow = null;
    this.zIndexCounter = 100;
  }

  createWindow(options = {}) {
    const windowId = `window-${++this.windowCounter}`;
    const window = {
      id: windowId,
      title: options.title || 'Untitled',
      content: options.content || '',
      width: options.width || 480,
      height: options.height || 320,
      x: options.x || this.cascadeOffset.x,
      y: options.y || (24 + this.cascadeOffset.y), // Account for menu bar
      maximized: options.maximized || false,
      minimized: false,
      resizable: options.resizable !== false,
      movable: options.movable !== false,
      type: options.type || 'document'
    };

    this.windows.set(windowId, window);
    this.renderWindow(window);
    this.updateCascadeOffset();
    this.focusWindow(windowId);
    
    return windowId;
  }

  renderWindow(window) {
    const windowElement = document.createElement('div');
    windowElement.className = 'turbo-window opening';
    windowElement.id = window.id;
    windowElement.style.cssText = `
      left: ${window.x}px;
      top: ${window.y}px;
      width: ${window.width}px;
      height: ${window.height}px;
      z-index: ${++this.zIndexCounter};
    `;

    if (window.maximized) {
      windowElement.classList.add('maximized');
    }

    windowElement.innerHTML = `
      <div class="turbo-window-title" data-window-title="${window.id}">
        <span class="turbo-window-title-text">${window.title}</span>
        <div class="turbo-window-controls">
          <button class="turbo-window-button close" data-action="close" data-window="${window.id}">■</button>
          <button class="turbo-window-button maximize" data-action="maximize" data-window="${window.id}">▲</button>
        </div>
      </div>
      <div class="turbo-window-content ${window.type}" data-window-content="${window.id}">
        ${window.content}
      </div>
    `;

    // Add event listeners
    this.attachWindowEvents(windowElement, window);

    const desktop = document.querySelector('[data-windows]');
    desktop.appendChild(windowElement);

    // Remove opening animation class after animation
    setTimeout(() => {
      windowElement.classList.remove('opening');
    }, 200);
  }

  attachWindowEvents(windowElement, window) {
    const titleBar = windowElement.querySelector('[data-window-title]');
    const controls = windowElement.querySelectorAll('.turbo-window-button');

    // Window controls
    controls.forEach(button => {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = button.dataset.action;
        const windowId = button.dataset.window;

        switch (action) {
          case 'minimize':
            this.minimizeWindow(windowId);
            break;
          case 'maximize':
            this.toggleMaximizeWindow(windowId);
            break;
          case 'close':
            this.closeWindow(windowId);
            break;
        }
      });
    });

    // Window dragging
    if (window.movable) {
      titleBar.addEventListener('mousedown', (e) => {
        if (!window.maximized) {
          this.startDrag(window.id, e);
        }
      });
    }

    // Window focus
    windowElement.addEventListener('mousedown', () => {
      this.focusWindow(window.id);
    });

    // Double-click to maximize/restore
    titleBar.addEventListener('dblclick', () => {
      this.toggleMaximizeWindow(window.id);
    });
  }

  startDrag(windowId, e) {
    const window = this.windows.get(windowId);
    const windowElement = document.getElementById(windowId);
    
    if (!window || !windowElement || window.maximized) return;

    const startX = e.clientX - window.x;
    const startY = e.clientY - window.y;

    const mouseMoveHandler = (e) => {
      window.x = e.clientX - startX;
      window.y = Math.max(24, e.clientY - startY); // Don't drag above menu bar
      
      windowElement.style.left = `${window.x}px`;
      windowElement.style.top = `${window.y}px`;
    };

    const mouseUpHandler = () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
    document.body.style.cursor = 'move';
  }

  focusWindow(windowId) {
    const window = this.windows.get(windowId);
    const windowElement = document.getElementById(windowId);
    
    if (!window || !windowElement) return;

    // Remove focus from other windows
    document.querySelectorAll('.turbo-window').forEach(w => {
      w.style.zIndex = parseInt(w.style.zIndex) > 1000 ? 1000 : w.style.zIndex;
    });

    // Focus this window
    windowElement.style.zIndex = ++this.zIndexCounter;
    this.activeWindow = windowId;

    // Update window title in status bar if needed
    this.updateStatusBar();
  }

  minimizeWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    const window = this.windows.get(windowId);
    
    if (!window || !windowElement) return;

    window.minimized = !window.minimized;
    windowElement.classList.toggle('minimized', window.minimized);
  }

  toggleMaximizeWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    const window = this.windows.get(windowId);
    
    if (!window || !windowElement) return;

    window.maximized = !window.maximized;
    windowElement.classList.toggle('maximized', window.maximized);

    // Update maximize button text
    const maxButton = windowElement.querySelector('[data-action="maximize"]');
    if (maxButton) {
      maxButton.textContent = window.maximized ? '⧉' : '□';
    }
  }

  closeWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    const window = this.windows.get(windowId);
    
    if (!window || !windowElement) return;

    // Animate close
    windowElement.style.opacity = '0';
    windowElement.style.transform = 'scale(0.8)';
    
    setTimeout(() => {
      windowElement.remove();
      this.windows.delete(windowId);
      
      if (this.activeWindow === windowId) {
        this.activeWindow = null;
      }
    }, 150);
  }

  updateCascadeOffset() {
    this.cascadeOffset.x += 20;
    this.cascadeOffset.y += 20;
    
    // Reset if we're too far down/right
    if (this.cascadeOffset.x > 200 || this.cascadeOffset.y > 200) {
      this.cascadeOffset = { x: 0, y: 0 };
    }
  }

  updateStatusBar() {
    // Update clock
    const clockElement = document.querySelector('[data-clock]');
    if (clockElement) {
      const now = new Date();
      clockElement.textContent = now.toLocaleTimeString();
    }
  }

  // Get window by ID
  getWindow(windowId) {
    return this.windows.get(windowId);
  }

  // Get all windows
  getAllWindows() {
    return Array.from(this.windows.values());
  }

  // Close all windows
  closeAllWindows() {
    Array.from(this.windows.keys()).forEach(windowId => {
      this.closeWindow(windowId);
    });
  }

  // Cascade all windows
  cascadeWindows() {
    let offset = { x: 0, y: 0 };
    
    this.windows.forEach((window, windowId) => {
      const windowElement = document.getElementById(windowId);
      if (windowElement && !window.maximized && !window.minimized) {
        window.x = offset.x;
        window.y = 24 + offset.y;
        
        windowElement.style.left = `${window.x}px`;
        windowElement.style.top = `${window.y}px`;
        windowElement.classList.add('cascading');
        
        setTimeout(() => {
          windowElement.classList.remove('cascading');
        }, 300);
        
        offset.x += 20;
        offset.y += 20;
      }
    });
    
    this.cascadeOffset = offset;
  }

  // Tile windows horizontally
  tileHorizontally() {
    const windows = Array.from(this.windows.values()).filter(w => !w.minimized);
    if (windows.length === 0) return;

    const desktop = document.querySelector('.turbo-desktop');
    const availableWidth = desktop.clientWidth;
    const availableHeight = desktop.clientHeight - 24 - 22; // Menu + status bar
    const windowWidth = Math.floor(availableWidth / windows.length);

    windows.forEach((window, index) => {
      const windowElement = document.getElementById(window.id);
      if (windowElement) {
        window.maximized = false;
        window.x = index * windowWidth;
        window.y = 24;
        window.width = windowWidth;
        window.height = availableHeight;

        windowElement.classList.remove('maximized');
        windowElement.style.left = `${window.x}px`;
        windowElement.style.top = `${window.y}px`;
        windowElement.style.width = `${window.width}px`;
        windowElement.style.height = `${window.height}px`;
      }
    });
  }
}

// Global window manager instance
export const windowManager = new TurboWindowManager();

// Update status bar clock every second
setInterval(() => {
  windowManager.updateStatusBar();
}, 1000);
